from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.agents.resume_match.graph import run_match
from app.agents.resume_match.schemas import MatchRequest, MatchReportDetail
from app.models.report import Report

router = APIRouter(prefix="/api/matches", tags=["matches"])


def _get_db_factory(db: Session):
    """Create a session factory that returns the same db session for graph nodes."""
    class _Factory:
        def __call__(self):
            return db
    return _Factory()


@router.post("", response_model=MatchReportDetail, status_code=201)
def create_match(body: MatchRequest, db: Session = Depends(get_db)):
    result = run_match(
        body.resume_id, body.job_id,
        db_session_factory=_get_db_factory(db),
    )

    if result.get("error"):
        error_msg = result["error"]
        if "未配置" in error_msg:
            raise HTTPException(status_code=422, detail=error_msg)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

    report_id = result.get("report_id")
    if not report_id:
        raise HTTPException(status_code=500, detail="匹配分析完成但未生成报告")

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=500, detail="报告未找到")

    return _report_to_detail(report)


@router.get("/{report_id}", response_model=MatchReportDetail)
def get_match(report_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Match report not found")
    return _report_to_detail(report)


def _report_to_detail(report: Report) -> MatchReportDetail:
    return MatchReportDetail(
        report_id=report.id,
        resume_id=report.resume_id or "",
        job_id=report.jd_id or "",
        overall_score=report.overall_score or 0,
        skill_score=report.skill_score or 0,
        project_score=report.project_score or 0,
        experience_score=report.experience_score or 0,
        expression_score=report.expression_score or 0,
        strengths=report.strengths_json or [],
        weaknesses=report.weaknesses_json or [],
        missing_keywords=report.missing_keywords_json or [],
        suggestions=report.suggestions_json or [],
        report_markdown=report.report_markdown or "",
    )
