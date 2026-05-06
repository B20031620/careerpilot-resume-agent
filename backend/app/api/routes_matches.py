from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_db
from app.agents.resume_match.graph import run_match
from app.agents.resume_match.schemas import MatchRequest, MatchReportDetail
from app.models.agent_run import AgentRun
from app.models.job_description import JobDescription
from app.models.report import Report
from app.models.resume import Resume

router = APIRouter(prefix="/api/matches", tags=["matches"])


@router.post("", response_model=MatchReportDetail, status_code=201)
def create_match(body: MatchRequest, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    resume = db.query(Resume).filter(
        Resume.id == body.resume_id,
        Resume.user_id == user_id,
        Resume.deleted_at.is_(None),
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    job = db.query(JobDescription).filter(
        JobDescription.id == body.job_id,
        JobDescription.user_id == user_id,
        JobDescription.deleted_at.is_(None),
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job description not found")

    # Create AgentRun for tracking
    agent_run = AgentRun(
        user_id=user_id,
        graph_name="resume_match",
        status="running",
        input_summary=f"resume={body.resume_id}, job={body.job_id}",
        started_at=datetime.utcnow(),
    )
    db.add(agent_run)
    db.commit()
    db.refresh(agent_run)

    def _new_session():
        return type(db)(bind=db.bind)

    result = run_match(
        body.resume_id, body.job_id,
        db_session_factory=_new_session,
    )

    if result.get("error"):
        agent_run.status = "failed"
        agent_run.error_message = result["error"][:500]
        agent_run.finished_at = datetime.utcnow()
        db.commit()

        error_msg = result["error"]
        if "未配置" in error_msg:
            raise HTTPException(status_code=422, detail=error_msg)
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

    report_id = result.get("report_id")
    if not report_id:
        agent_run.status = "failed"
        agent_run.error_message = "匹配分析完成但未生成报告"
        agent_run.finished_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=500, detail="匹配分析完成但未生成报告")

    # Set user_id on report and link agent_run
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=500, detail="报告未找到")

    report.user_id = user_id
    report.agent_run_id = agent_run.id
    agent_run.status = "succeeded"
    agent_run.finished_at = datetime.utcnow()
    if agent_run.started_at:
        delta = agent_run.finished_at - agent_run.started_at
        agent_run.duration_ms = int(delta.total_seconds() * 1000)
    db.commit()
    db.refresh(report)

    return _report_to_detail(report)


@router.get("/{report_id}", response_model=MatchReportDetail)
def get_match(report_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == user_id).first()
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
