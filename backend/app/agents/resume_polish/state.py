from __future__ import annotations

from typing import Any, Dict, List, Optional

from typing_extensions import TypedDict


class PolishState(TypedDict, total=False):
    resume_id: str
    user_id: str
    jd_text: str

    # Loaded from DB
    resume_text: str
    structured_json: Optional[Dict[str, Any]]

    # RAG context
    rag_context: str

    # Analysis results
    issues: List[Dict[str, Any]]

    # Generated suggestions
    suggestions: List[Dict[str, Any]]
    has_high_risk: bool

    # After risk validation
    validated_suggestions: List[Dict[str, Any]]
    risk_validation_notes: List[str]

    # Final output
    polish_json: Optional[Dict[str, Any]]
    polish_markdown: str
    overall_assessment: str

    error: str
