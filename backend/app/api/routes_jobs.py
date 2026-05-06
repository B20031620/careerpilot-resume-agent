from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.job_description import JobDescription
from app.schemas.job_description import JobDescriptionCreate, JobDescriptionListItem, JobDescriptionRead

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("", response_model=JobDescriptionRead, status_code=201)
def create_job(body: JobDescriptionCreate, db: Session = Depends(get_db)):
    job = JobDescription(**body.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("", response_model=list[JobDescriptionListItem])
def list_jobs(db: Session = Depends(get_db)):
    rows = db.query(JobDescription).filter(JobDescription.deleted_at.is_(None)).order_by(JobDescription.created_at.desc()).all()
    return rows


@router.get("/{job_id}", response_model=JobDescriptionRead)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(JobDescription).filter(JobDescription.id == job_id, JobDescription.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")
    return job


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(JobDescription).filter(JobDescription.id == job_id, JobDescription.deleted_at.is_(None)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")
    job.deleted_at = datetime.now(timezone.utc)
    db.commit()
