from __future__ import annotations

import os
from typing import Any, Callable, Dict, Optional

from langgraph.graph import END, StateGraph

from app.agents.base.runtime import RuntimeContext
from app.agents.resume_match.nodes import (
    align_capabilities,
    analyze_jd,
    generate_suggestions,
    load_resume,
    parse_resume,
    persist_report,
    score_match,
    validate_risks,
)
from app.agents.resume_match.state import ResumeMatchState


def _should_stop(state: ResumeMatchState) -> str:
    if state.get("error"):
        return "stop"
    return "continue"


def build_resume_match_graph(runtime: RuntimeContext) -> StateGraph:
    graph = StateGraph(ResumeMatchState)

    def _wrap(node_func):
        def wrapper(state: ResumeMatchState) -> Dict[str, Any]:
            return node_func(state, runtime)
        return wrapper

    graph.add_node("load_resume", _wrap(load_resume))
    graph.add_node("parse_resume", _wrap(parse_resume))
    graph.add_node("analyze_jd", _wrap(analyze_jd))
    graph.add_node("align_capabilities", _wrap(align_capabilities))
    graph.add_node("score_match", _wrap(score_match))
    graph.add_node("generate_suggestions", _wrap(generate_suggestions))
    graph.add_node("validate_risks", _wrap(validate_risks))
    graph.add_node("persist_report", _wrap(persist_report))

    graph.set_entry_point("load_resume")

    graph.add_conditional_edges("load_resume", _should_stop, {"stop": END, "continue": "parse_resume"})
    graph.add_conditional_edges("parse_resume", _should_stop, {"stop": END, "continue": "analyze_jd"})
    graph.add_conditional_edges("analyze_jd", _should_stop, {"stop": END, "continue": "align_capabilities"})

    graph.add_edge("align_capabilities", "score_match")
    graph.add_conditional_edges("score_match", _should_stop, {"stop": END, "continue": "generate_suggestions"})
    graph.add_edge("generate_suggestions", "validate_risks")
    graph.add_edge("validate_risks", "persist_report")
    graph.add_edge("persist_report", END)

    return graph


def run_match(
    resume_id: str,
    job_id: str,
    *,
    use_mock: Optional[bool] = None,
    db_session_factory: Optional[Callable] = None,
) -> Dict[str, Any]:
    if use_mock is None:
        use_mock = os.getenv("USE_MOCK_LLM", "").lower() in ("true", "1", "yes")

    runtime = RuntimeContext(use_mock=use_mock, db_session_factory=db_session_factory)
    graph = build_resume_match_graph(runtime)
    compiled = graph.compile()
    result = compiled.invoke({"resume_id": resume_id, "job_id": job_id})
    return result
