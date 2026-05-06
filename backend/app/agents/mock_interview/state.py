from __future__ import annotations

from typing import Any, Dict, List, Optional

from typing_extensions import TypedDict


class InterviewState(TypedDict, total=False):
    session_id: str
    resume_id: str
    jd_id: str
    interview_type: str
    question_count_target: int
    current_question_index: int
    status: str  # active, finished

    # Context loaded from DB
    resume_text: str
    jd_text: str

    # Current question / answer cycle
    current_question: str
    current_question_type: str
    user_answer: str
    eval_score: int
    eval_strengths: List[str]
    eval_improvements: List[str]
    eval_risks: List[str]
    follow_up_needed: bool
    follow_up_question: str
    parent_turn_id: str
    turn_id: str

    # Accumulated turns
    turns: List[Dict[str, Any]]

    # Final report
    final_report_json: Optional[Dict[str, Any]]
    final_report_markdown: str

    error: str
