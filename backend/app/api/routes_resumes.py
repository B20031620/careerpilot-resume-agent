from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.agents.base.runtime import RuntimeContext, PromptLoader
from app.api.deps import get_current_user_id, get_db
from app.models.resume import Resume
from app.schemas.resume import ResumeCreate, ResumeListItem, ResumeRead
from app.services.resume_file_parser import ResumeFileParseError, extract_resume_text
from app.services.resume_quick_parser import quick_parse_resume
from app.services.resume_schema_normalizer import normalize_resume_schema
from app.services.resume_text_cleaner import clean_resume_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("", response_model=ResumeRead, status_code=201)
def create_resume(body: ResumeCreate, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    raw_text = clean_resume_text(body.raw_text or "")
    existing = db.query(Resume).filter(
        Resume.user_id == user_id,
        Resume.title == body.title,
        Resume.raw_text == raw_text,
        Resume.deleted_at.is_(None),
    ).first()
    if existing:
        return existing

    payload = body.model_dump()
    payload["raw_text"] = raw_text
    resume = Resume(user_id=user_id, **payload)
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.post("/upload", response_model=ResumeRead, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    filename = file.filename or "resume"
    content = await file.read()
    try:
        raw_text = clean_resume_text(extract_resume_text(filename, content))
    except ResumeFileParseError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    resume_title = title.strip() if title and title.strip() else Path(filename).stem
    existing = db.query(Resume).filter(
        Resume.user_id == user_id,
        Resume.raw_text == raw_text,
        Resume.deleted_at.is_(None),
    ).first()
    if existing:
        return existing

    resume = Resume(
        user_id=user_id,
        title=resume_title or "未命名简历",
        source_type=Path(filename).suffix.lower().lstrip(".") or "file",
        raw_text=raw_text,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("", response_model=list[ResumeListItem])
def list_resumes(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    rows = (
        db.query(Resume)
        .filter(Resume.user_id == user_id, Resume.deleted_at.is_(None))
        .order_by(Resume.created_at.desc())
        .all()
    )
    return rows


@router.get("/{resume_id}", response_model=ResumeRead)
def get_resume(resume_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(
        Resume.id == resume_id, Resume.user_id == user_id, Resume.deleted_at.is_(None)
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.delete("/{resume_id}", status_code=204)
def delete_resume(resume_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(
        Resume.id == resume_id, Resume.user_id == user_id, Resume.deleted_at.is_(None)
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume.deleted_at = datetime.now(timezone.utc)
    db.commit()


@router.post("/{resume_id}/parse", response_model=ResumeRead)
def parse_resume(resume_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(
        Resume.id == resume_id, Resume.user_id == user_id, Resume.deleted_at.is_(None)
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    import os
    use_mock = os.getenv("USE_MOCK_LLM", "").lower() in ("true", "1", "yes")

    # Step 1: Quick parse (no LLM, always succeeds)
    cleaned_text = clean_resume_text(resume.raw_text or "")
    quick_structured = normalize_resume_schema(quick_parse_resume(cleaned_text))
    resume.structured_json = quick_structured
    resume.parse_status = "quick_succeeded"
    resume.parse_warnings = None
    db.commit()

    # Step 2: AI refinement (skipped in mock mode — quick parse is sufficient for demo)
    if use_mock:
        resume.parse_status = "succeeded"
        resume.parse_warnings = None
        db.commit()
        db.refresh(resume)
        return resume

    from app.core.config import settings
    if not settings.DEEPSEEK_API_KEY:
        resume.parse_warnings = {"warning": "未配置 DEEPSEEK_API_KEY，当前为快速解析结果，配置后可进行 AI 精修"}
        db.commit()
        db.refresh(resume)
        return resume
    try:
        loader = PromptLoader()
        messages = loader.render_messages("resume_parse", "v1", resume_text=cleaned_text)
        runtime = RuntimeContext()
        provider = runtime.llm_provider
        if not provider:
            raise ValueError("LLM provider not available")
        resp = provider.chat_sync(
            messages, temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=8192,
        )
        content = resp["choices"][0]["message"]["content"] or ""
        finish_reason = resp["choices"][0].get("finish_reason", "")
        if not content.strip():
            if finish_reason == "length":
                raise ValueError("LLM 输出被截断(max_tokens 不够)，请增加 max_tokens 或精简简历")
            raise ValueError("LLM returned empty content")
        ai_structured = normalize_resume_schema(json.loads(content))
        resume.structured_json = ai_structured
        resume.parse_status = "succeeded"
        resume.parse_warnings = None
    except Exception as e:
        logger.error("parse_resume AI refine failed: %s", e)
        # Keep quick_succeeded with AI failure warning
        resume.parse_warnings = {
            "warning": f"AI 精修失败，当前为快速解析结果: {str(e)[:200]}",
            "quick_succeeded": True,
        }

    db.commit()
    db.refresh(resume)

    # Index structured resume into vector store for RAG retrieval
    if resume.structured_json:
        try:
            from app.services.rag_service import rag_service
            rag_service.index_resume(user_id, resume.id, resume.structured_json)
        except Exception as e:
            logger.warning("Failed to index resume into vector store: %s", e)

    return resume
