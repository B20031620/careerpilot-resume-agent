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

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("", response_model=ResumeRead, status_code=201)
def create_resume(body: ResumeCreate, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    resume = Resume(user_id=user_id, **body.model_dump())
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
        raw_text = extract_resume_text(filename, content)
    except ResumeFileParseError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    resume_title = title.strip() if title and title.strip() else Path(filename).stem
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

    if use_mock:
        from app.agents.resume_match.nodes import MOCK_STRUCTURED_RESUME
        resume.structured_json = MOCK_STRUCTURED_RESUME
        resume.parse_status = "succeeded"
        resume.parse_warnings = None
        db.commit()
        db.refresh(resume)
        return resume

    from app.core.config import settings
    if not settings.DEEPSEEK_API_KEY:
        raise HTTPException(status_code=422, detail="未配置 DEEPSEEK_API_KEY，请配置后重试")

    resume.parse_status = "processing"
    db.commit()

    try:
        loader = PromptLoader()
        messages = loader.render_messages("resume_parse", "v1", resume_text=resume.raw_text)
        runtime = RuntimeContext()
        provider = runtime.llm_provider
        if not provider:
            raise ValueError("LLM provider not available")
        resp = provider.chat_sync(messages, temperature=0.2, response_format={"type": "json_object"})
        content = resp["choices"][0]["message"]["content"]
        structured = json.loads(content)
        resume.structured_json = structured
        resume.parse_status = "succeeded"
    except Exception as e:
        logger.error("parse_resume failed: %s", e)
        resume.parse_status = "failed"
        resume.parse_warnings = {"error": str(e)[:500]}

    db.commit()
    db.refresh(resume)
    return resume
