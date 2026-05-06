from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents.base.runtime import PromptLoader, RuntimeContext
from app.api.deps import get_current_user_id, get_db
from app.models.job_description import JobDescription
from app.schemas.job_description import JobDescriptionCreate, JobDescriptionListItem, JobDescriptionRead

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.post("", response_model=JobDescriptionRead, status_code=201)
def create_job(body: JobDescriptionCreate, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    job = JobDescription(user_id=user_id, **body.model_dump())
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("", response_model=list[JobDescriptionListItem])
def list_jobs(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    rows = (
        db.query(JobDescription)
        .filter(JobDescription.user_id == user_id, JobDescription.deleted_at.is_(None))
        .order_by(JobDescription.created_at.desc())
        .all()
    )
    return rows


@router.get("/{job_id}", response_model=JobDescriptionRead)
def get_job(job_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    job = db.query(JobDescription).filter(
        JobDescription.id == job_id, JobDescription.user_id == user_id, JobDescription.deleted_at.is_(None)
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")
    return job


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    job = db.query(JobDescription).filter(
        JobDescription.id == job_id, JobDescription.user_id == user_id, JobDescription.deleted_at.is_(None)
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")
    job.deleted_at = datetime.now(timezone.utc)
    db.commit()


@router.post("/{job_id}/analyze", response_model=JobDescriptionRead)
def analyze_job(job_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    job = db.query(JobDescription).filter(
        JobDescription.id == job_id, JobDescription.user_id == user_id, JobDescription.deleted_at.is_(None)
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")

    use_mock = os.getenv("USE_MOCK_LLM", "").lower() in ("true", "1", "yes")

    if use_mock:
        from app.agents.resume_match.nodes import MOCK_JOB_PROFILE
        job.job_profile_json = MOCK_JOB_PROFILE
        job.analysis_status = "succeeded"
        db.commit()
        db.refresh(job)
        return job

    from app.core.config import settings
    if not settings.DEEPSEEK_API_KEY:
        raise HTTPException(status_code=422, detail="未配置 DEEPSEEK_API_KEY，请配置后重试")

    job.analysis_status = "processing"
    db.commit()

    try:
        loader = PromptLoader()
        messages = loader.render_messages("jd_analysis", "v1", jd_text=job.raw_text)
        runtime = RuntimeContext()
        provider = runtime.llm_provider
        if not provider:
            raise ValueError("LLM provider not available")
        resp = provider.chat_sync(messages, temperature=0.2, response_format={"type": "json_object"})
        content = resp["choices"][0]["message"]["content"]
        job.job_profile_json = json.loads(content)
        job.analysis_status = "succeeded"
    except Exception as e:
        logger.error("analyze_job failed: %s", e)
        job.analysis_status = "failed"

    db.commit()
    db.refresh(job)
    return job
