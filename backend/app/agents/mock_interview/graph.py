from __future__ import annotations

import os
from typing import Any, Callable, Dict, Optional

from langgraph.graph import END, StateGraph

from app.agents.base.runtime import RuntimeContext
from app.agents.mock_interview.nodes import (
    decide_follow_up,
    evaluate_answer,
    final_report,
    generate_follow_up,
    generate_question,
    init_interview,
    next_question,
)
from app.agents.mock_interview.state import InterviewState


def _should_stop(state: InterviewState) -> str:
    if state.get("error"):
        return "stop"
    return "continue"


def _should_follow_up(state: InterviewState) -> str:
    if state.get("follow_up_needed"):
        return "follow_up"
    return "next_or_finish"


def _next_or_finish(state: InterviewState) -> str:
    idx = state.get("current_question_index", 0)
    target = state.get("question_count_target", 5)
    if idx + 1 >= target:
        return "finish"
    return "next_question"


def build_interview_graph(runtime: RuntimeContext) -> StateGraph:
    graph = StateGraph(InterviewState)

    def _wrap(node_func):
        def wrapper(state: InterviewState) -> Dict[str, Any]:
            return node_func(state, runtime)
        return wrapper

    graph.add_node("init_interview", _wrap(init_interview))
    graph.add_node("generate_question", _wrap(generate_question))
    graph.add_node("evaluate_answer", _wrap(evaluate_answer))
    graph.add_node("decide_follow_up", _wrap(decide_follow_up))
    graph.add_node("generate_follow_up", _wrap(generate_follow_up))
    graph.add_node("next_question", _wrap(next_question))
    graph.add_node("final_report", _wrap(final_report))

    graph.set_entry_point("init_interview")

    graph.add_conditional_edges("init_interview", _should_stop, {"stop": END, "continue": "generate_question"})

    graph.add_conditional_edges("generate_question", _should_stop, {"stop": END, "continue": "evaluate_answer"})

    graph.add_conditional_edges("evaluate_answer", _should_stop, {"stop": END, "continue": "decide_follow_up"})

    graph.add_conditional_edges("decide_follow_up", _should_follow_up, {
        "follow_up": "generate_follow_up",
        "next_or_finish": "next_question",
    })

    graph.add_conditional_edges("generate_follow_up", _should_stop, {"stop": END, "continue": "evaluate_answer"})

    graph.add_conditional_edges("next_question", _next_or_finish, {
        "finish": "final_report",
        "next_question": "generate_question",
    })

    graph.add_edge("final_report", END)

    return graph


def _make_runtime(use_mock: Optional[bool], db_session_factory: Optional[Callable]) -> RuntimeContext:
    if use_mock is None:
        use_mock = os.getenv("USE_MOCK_LLM", "").lower() in ("true", "1", "yes")
    return RuntimeContext(use_mock=use_mock, db_session_factory=db_session_factory)


def run_init(
    session_id: str,
    resume_id: str,
    jd_id: str,
    interview_type: str = "technical_1",
    question_count_target: int = 5,
    *,
    use_mock: Optional[bool] = None,
    db_session_factory: Optional[Callable] = None,
) -> Dict[str, Any]:
    """Run the first two nodes: init_interview -> generate_question, return partial state."""
    runtime = _make_runtime(use_mock, db_session_factory)
    state: Dict[str, Any] = {
        "session_id": session_id,
        "resume_id": resume_id,
        "jd_id": jd_id,
        "interview_type": interview_type,
        "question_count_target": question_count_target,
        "current_question_index": 0,
        "turns": [],
    }

    state.update(init_interview(state, runtime))
    if state.get("error"):
        return state

    state.update(generate_question(state, runtime))
    return state


def run_answer(
    current_state: Dict[str, Any],
    *,
    use_mock: Optional[bool] = None,
    db_session_factory: Optional[Callable] = None,
) -> Dict[str, Any]:
    """Run evaluate_answer -> decide_follow_up -> [generate_follow_up if needed] -> next_question."""
    runtime = _make_runtime(use_mock, db_session_factory)
    graph = build_interview_graph(runtime)
    compiled = graph.compile()

    # The compiled graph will route from the entry point based on the state.
    # Since we already have resume_text/jd_text in state, init_interview will pass through.
    # We need the graph to skip past generate_question for the answer flow.
    # Instead, we directly call the node functions to avoid re-entry issues.
    init_result = init_interview(current_state, runtime)
    current_state.update(init_result)
    if current_state.get("error"):
        return current_state

    eval_result = evaluate_answer(current_state, runtime)
    current_state.update(eval_result)
    if current_state.get("error"):
        return current_state

    follow_up_result = decide_follow_up(current_state, runtime)
    current_state.update(follow_up_result)

    if current_state.get("follow_up_needed"):
        fu_result = generate_follow_up(current_state, runtime)
        current_state.update(fu_result)
    else:
        next_result = next_question(current_state, runtime)
        current_state.update(next_result)
        if current_state.get("current_question_index", 0) < current_state.get("question_count_target", 5):
            question_result = generate_question(current_state, runtime)
            current_state.update(question_result)
        else:
            current_state["current_question"] = ""
            current_state["current_question_type"] = ""

    return current_state


def run_finish(
    current_state: Dict[str, Any],
    *,
    use_mock: Optional[bool] = None,
    db_session_factory: Optional[Callable] = None,
) -> Dict[str, Any]:
    """Run final_report node."""
    runtime = _make_runtime(use_mock, db_session_factory)
    result = final_report(current_state, runtime)
    current_state.update(result)
    return current_state
