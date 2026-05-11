from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.agents.resume_polish.graph import run_polish
from app.api.deps import get_current_user_id, get_db
from app.models.resume import Resume
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/resumes", tags=["polish"])


class PolishRequest(BaseModel):
    jd_text: Optional[str] = None


class PolishSuggestion(BaseModel):
    section: str
    original_text: str
    issue: str
    revised_text: str
    rationale: str
    risk_level: str = Field(pattern=r"^(low|medium|high)$")


class PolishResult(BaseModel):
    resume_id: str
    suggestions: list[PolishSuggestion]
    overall_assessment: str
    polish_markdown: Optional[str] = None


@router.post("/{resume_id}/polish", response_model=PolishResult)
def polish_resume(
    resume_id: str,
    body: PolishRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    resume = db.query(Resume).filter(
        Resume.id == resume_id, Resume.user_id == user_id, Resume.deleted_at.is_(None)
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    from app.core.config import settings
    if not settings.DEEPSEEK_API_KEY:
        raise HTTPException(status_code=503, detail="未配置 DEEPSEEK_API_KEY，无法使用 AI 润色")

    result = run_polish(
        resume_id=resume_id,
        user_id=user_id,
        jd_text=body.jd_text or "",
        db_session_factory=lambda: type(db)(bind=db.bind),
    )

    if result.get("error"):
        error_msg = result["error"]
        if "格式异常" in error_msg:
            raise HTTPException(status_code=502, detail=error_msg)
        if "截断" in error_msg:
            raise HTTPException(status_code=502, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

    polish_json = result.get("polish_json", {})
    suggestions_data = polish_json.get("suggestions", [])
    overall = polish_json.get("overall_assessment", result.get("overall_assessment", ""))

    suggestions = []
    for s in suggestions_data:
        suggestions.append(PolishSuggestion(
            section=s.get("section", ""),
            original_text=s.get("original_text", ""),
            issue=s.get("issue", ""),
            revised_text=s.get("revised_text", ""),
            rationale=s.get("rationale", ""),
            risk_level=s.get("risk_level", "low"),
        ))

    return PolishResult(
        resume_id=resume_id,
        suggestions=suggestions,
        overall_assessment=overall,
        polish_markdown=result.get("polish_markdown"),
    )
