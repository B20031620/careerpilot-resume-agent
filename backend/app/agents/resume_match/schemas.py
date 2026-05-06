from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class MatchRequest(BaseModel):
    resume_id: str
    job_id: str


class MatchReportDetail(BaseModel):
    report_id: str
    resume_id: str
    job_id: str
    overall_score: int
    skill_score: int
    project_score: int
    experience_score: int
    expression_score: int
    strengths: List[Dict[str, Any]]
    weaknesses: List[Dict[str, Any]]
    missing_keywords: List[str]
    suggestions: List[Dict[str, Any]]
    report_markdown: str
