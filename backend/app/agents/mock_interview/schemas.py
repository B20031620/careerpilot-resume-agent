from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class InterviewAnswerRequest(BaseModel):
    answer: str


class InterviewTurnResponse(BaseModel):
    id: str
    turn_index: int
    question: str
    question_type: str
    user_answer: Optional[str] = None
    evaluation_json: Optional[dict[str, Any]] = None
    score: Optional[int] = None
    follow_up_needed: bool = False
    parent_turn_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InterviewSessionResponse(BaseModel):
    id: str
    resume_id: Optional[str] = None
    jd_id: Optional[str] = None
    interview_type: str
    status: str
    question_count_target: int
    current_question_index: int
    turns: list[InterviewTurnResponse] = []
    final_report_json: Optional[dict[str, Any]] = None
    final_report_markdown: Optional[str] = None
    current_question: Optional[str] = None
    current_question_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
