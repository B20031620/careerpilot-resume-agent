from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.resume import Resume
from app.schemas.resume import ResumeCreate, ResumeListItem, ResumeRead

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("", response_model=ResumeRead, status_code=201)
def create_resume(body: ResumeCreate, db: Session = Depends(get_db)):
    resume = Resume(**body.model_dump())
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
