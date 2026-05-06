from __future__ import annotations

from typing import Any, Dict, List, Optional

from typing_extensions import TypedDict


class ResumeMatchState(TypedDict, total=False):
    resume_id: str
    job_id: str
    resume_text: str
    jd_text: str
    structured_resume: Optional[Dict[str, Any]]
    job_profile: Optional[Dict[str, Any]]
    skill_score: int
    project_score: int
    experience_score: int
    expression_score: int
    overall_score: int
    strengths: List[Dict[str, str]]
    weaknesses: List[Dict[str, str]]
    missing_keywords: List[str]
    suggestions: List[Dict[str, Any]]
    interview_risks: List[Dict[str, str]]
    risk_flags: List[Dict[str, str]]
    report_markdown: str
    report_id: str
    error: str
