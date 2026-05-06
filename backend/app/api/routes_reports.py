from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.models.job_description import JobDescription
from app.models.report import Report
from app.models.resume import Resume
from app.schemas.report import ReportListItem, ReportRead

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _enrich_report(report: Report, resume: Resume | None, job: JobDescription | None) -> dict:
    return {
        "resume_title": resume.title if resume else None,
        "job_title": job.title if job else None,
        "company_name": job.company_name if job else None,
    }


@router.get("", response_model=list[ReportListItem])
def list_reports(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    rows = (
        db.query(Report)
        .filter(Report.user_id == user_id)
        .order_by(Report.created_at.desc())
        .all()
    )
    result = []
    for r in rows:
        resume = db.query(Resume).filter(Resume.id == r.resume_id).first() if r.resume_id else None
        job = db.query(JobDescription).filter(JobDescription.id == r.jd_id).first() if r.jd_id else None
        item = ReportListItem(
            id=r.id,
            resume_id=r.resume_id,
            jd_id=r.jd_id,
            report_type=r.report_type,
            overall_score=r.overall_score,
            created_at=r.created_at,
            resume_title=resume.title if resume else None,
            job_title=job.title if job else None,
            company_name=job.company_name if job else None,
            status="succeeded" if r.overall_score is not None else "failed",
        )
        result.append(item)
    return result


@router.get("/{report_id}", response_model=ReportRead)
def get_report(report_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == user_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    resume = db.query(Resume).filter(Resume.id == report.resume_id).first() if report.resume_id else None
    job = db.query(JobDescription).filter(JobDescription.id == report.jd_id).first() if report.jd_id else None

    return ReportRead(
        id=report.id,
        resume_id=report.resume_id,
        jd_id=report.jd_id,
        report_type=report.report_type,
        overall_score=report.overall_score,
        skill_score=report.skill_score,
        project_score=report.project_score,
        experience_score=report.experience_score,
        expression_score=report.expression_score,
        strengths_json=report.strengths_json,
        weaknesses_json=report.weaknesses_json,
        missing_keywords_json=report.missing_keywords_json,
        suggestions_json=report.suggestions_json,
        report_markdown=report.report_markdown,
        created_at=report.created_at,
        resume_title=resume.title if resume else None,
        job_title=job.title if job else None,
        company_name=job.company_name if job else None,
    )


@router.delete("/{report_id}", status_code=204)
def delete_report(report_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == user_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
