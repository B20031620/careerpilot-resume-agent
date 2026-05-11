from __future__ import annotations

from typing import Any, Dict, Optional

from langgraph.graph import END, StateGraph

from app.agents.base.runtime import RuntimeContext
from app.agents.resume_polish.nodes import (
    analyze_issues,
    format_report,
    load_resume,
    risk_gate,
    validate_risks,
)
from app.agents.resume_polish.state import PolishState


def _should_stop(state: PolishState) -> str:
    if state.get("error"):
        return "stop"
    return "continue"


def _route_by_risk(state: PolishState) -> str:
    """Route based on risk gate: high-risk → validate, otherwise → format."""
    if state.get("has_high_risk"):
        return "validate"
    return "skip"


def build_polish_graph(runtime: RuntimeContext) -> StateGraph:
    graph = StateGraph(PolishState)

    def _wrap(node_func):
        def wrapper(state: PolishState) -> Dict[str, Any]:
            return node_func(state, runtime)
        return wrapper

    graph.add_node("load_resume", _wrap(load_resume))
    graph.add_node("analyze_issues", _wrap(analyze_issues))
    graph.add_node("risk_gate", _wrap(risk_gate))
    graph.add_node("validate_risks", _wrap(validate_risks))
    graph.add_node("format_report", _wrap(format_report))

    graph.set_entry_point("load_resume")

    # load_resume → analyze_issues
    graph.add_conditional_edges("load_resume", _should_stop, {
        "stop": END,
        "continue": "analyze_issues",
    })

    # analyze_issues → risk_gate
    graph.add_conditional_edges("analyze_issues", _should_stop, {
        "stop": END,
        "continue": "risk_gate",
    })

    # risk_gate → validate_risks (if high risk) or format_report (skip)
    graph.add_conditional_edges("risk_gate", _route_by_risk, {
        "validate": "validate_risks",
        "skip": "format_report",
    })

    # validate_risks → format_report
    graph.add_edge("validate_risks", "format_report")

    # format_report → END
    graph.add_edge("format_report", END)

    return graph


def run_polish(
    resume_id: str,
    user_id: str = "",
    jd_text: str = "",
    *,
    use_mock: Optional[bool] = None,
    db_session_factory=None,
) -> Dict[str, Any]:
    """Run the polish agent graph and return final state."""
    import os
    if use_mock is None:
        use_mock = os.getenv("USE_MOCK_LLM", "").lower() in ("true", "1", "yes")

    runtime = RuntimeContext(use_mock=use_mock, db_session_factory=db_session_factory)
    graph = build_polish_graph(runtime)
    compiled = graph.compile()

    initial_state: Dict[str, Any] = {
        "resume_id": resume_id,
        "user_id": user_id,
        "jd_text": jd_text,
    }

    result = compiled.invoke(initial_state)
    return result
