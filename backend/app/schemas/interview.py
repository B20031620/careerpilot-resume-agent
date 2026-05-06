from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class InterviewSessionCreate(BaseModel):
    resume_id: Optional[str] = None
    jd_id: Optional[str] = None
    interview_type: str = "technical_1"
    question_count_target: int = 5


class InterviewSessionRead(BaseModel):
    id: str
    resume_id: Optional[str]
    jd_id: Optional[str]
    interview_type: str
    status: str
    question_count_target: int
    current_question_index: int
    final_report_json: Optional[dict[str, Any]] = None
    final_report_markdown: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InterviewTurnRead(BaseModel):
    id: str
    session_id: str
    turn_index: int
    question: str
    question_type: str
    user_answer: Optional[str]
    evaluation_json: Optional[dict[str, Any]] = None
    score: Optional[int]
    follow_up_needed: bool
    parent_turn_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
