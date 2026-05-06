from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class ReportRead(BaseModel):
    id: str
    resume_id: Optional[str]
    jd_id: Optional[str]
    report_type: str
    overall_score: Optional[int]
    skill_score: Optional[int]
    project_score: Optional[int]
    experience_score: Optional[int]
    expression_score: Optional[int]
    strengths_json: Optional[dict[str, Any]] = None
    weaknesses_json: Optional[dict[str, Any]] = None
    missing_keywords_json: Optional[dict[str, Any]] = None
    suggestions_json: Optional[dict[str, Any]] = None
    report_markdown: Optional[str] = None
    created_at: datetime

    # Enriched fields
    resume_title: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None

    model_config = {"from_attributes": True}


class ReportListItem(BaseModel):
    id: str
    resume_id: Optional[str]
    jd_id: Optional[str]
    report_type: str
    overall_score: Optional[int]
    created_at: datetime
    resume_title: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    status: str = "succeeded"  # Inferred from score presence

    model_config = {"from_attributes": True}
