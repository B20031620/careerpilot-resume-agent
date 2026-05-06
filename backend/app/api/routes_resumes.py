from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.resume import Resume
from app.schemas.resume import ResumeCreate, ResumeListItem, ResumeRead
from app.services.resume_file_parser import ResumeFileParseError, extract_resume_text

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("", response_model=ResumeRead, status_code=201)
def create_resume(body: ResumeCreate, db: Session = Depends(get_db)):
    resume = Resume(**body.model_dump())
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.post("/upload", response_model=ResumeRead, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
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
        title=resume_title or "未命名简历",
        source_type=Path(filename).suffix.lower().lstrip(".") or "file",
        raw_text=raw_text,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


@router.get("", response_model=list[ResumeListItem])
def list_resumes(db: Session = Depends(get_db)):
    rows = db.query(Resume).filter(Resume.deleted_at.is_(None)).order_by(Resume.created_at.desc()).all()
    return rows


@router.get("/{resume_id}", response_model=ResumeRead)
def get_resume(resume_id: str, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.deleted_at.is_(None)).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.delete("/{resume_id}", status_code=204)
def delete_resume(resume_id: str, db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.deleted_at.is_(None)).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume.deleted_at = datetime.now(timezone.utc)
    db.commit()
