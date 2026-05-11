from __future__ import annotations

import logging
import os
import sqlite3
from typing import Any, Dict, Optional

from langgraph.graph import END, StateGraph
from langgraph.checkpoint.sqlite import SqliteSaver

from app.agents.base.runtime import RuntimeContext
from app.agents.mock_interview.nodes import (
    classify_answer,
    decide_strategy,
    evaluate_answer,
    final_report,
    follow_up_detail,
    generate_question,
    init_interview,
    next_question,
    probe_easier,
    switch_topic_harder,
)
from app.agents.mock_interview.state import InterviewState

logger = logging.getLogger(__name__)

_CHECKPOINT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "data", "checkpoints",
)


def _should_stop(state: InterviewState) -> str:
    if state.get("error"):
        return "stop"
    return "continue"


def _route_by_classification(state: InterviewState) -> str:
    """Route to different strategy branches based on answer classification."""
    classification = state.get("answer_classification", "medium")

    # Early termination: if consecutive_weak >= 2 and still weak, skip to report
    if state.get("consecutive_weak", 0) >= 2 and classification == "weak":
        return "finish"

    if classification == "weak":
        return "probe_easier"
    elif classification == "strong":
        return "switch_topic_harder"
    else:
        return "follow_up_detail"


def _should_continue_or_finish(state: InterviewState) -> str:
    """After generating next question, check if we've reached the target or should continue."""
    idx = state.get("current_question_index", 0)
    target = state.get("question_count_target", 5)
    if idx >= target:
        return "finish"
    if state.get("error"):
        return "stop"
    return "continue"


def _get_checkpointer() -> SqliteSaver:
    os.makedirs(_CHECKPOINT_DIR, exist_ok=True)
    db_path = os.path.join(_CHECKPOINT_DIR, "interview_checkpoints.db")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    saver = SqliteSaver(conn)
    saver.setup()
    return saver


def build_interview_graph(runtime: RuntimeContext) -> StateGraph:
    graph = StateGraph(InterviewState)

    def _wrap(node_func):
        def wrapper(state: InterviewState) -> Dict[str, Any]:
            return node_func(state, runtime)
        return wrapper

    # Core nodes
    graph.add_node("init_interview", _wrap(init_interview))
    graph.add_node("generate_question", _wrap(generate_question))
    graph.add_node("evaluate_answer", _wrap(evaluate_answer))
    graph.add_node("classify_answer", _wrap(classify_answer))
    graph.add_node("decide_strategy", _wrap(decide_strategy))
    graph.add_node("probe_easier", _wrap(probe_easier))
    graph.add_node("follow_up_detail", _wrap(follow_up_detail))
    graph.add_node("switch_topic_harder", _wrap(switch_topic_harder))
    graph.add_node("next_question", _wrap(next_question))
    graph.add_node("final_report", _wrap(final_report))

    graph.set_entry_point("init_interview")

    # init → generate first question
    graph.add_conditional_edges("init_interview", _should_stop, {
        "stop": END,
        "continue": "generate_question",
    })

    # generate_question → evaluate_answer (will be interrupted before evaluate_answer
    # to wait for user answer)
    graph.add_conditional_edges("generate_question", _should_stop, {
        "stop": END,
        "continue": "evaluate_answer",
    })

    # evaluate → classify → decide strategy
    graph.add_conditional_edges("evaluate_answer", _should_stop, {
        "stop": END,
        "continue": "classify_answer",
    })
    graph.add_edge("classify_answer", "decide_strategy")

    # decide_strategy → route by classification to one of three strategy branches
    graph.add_conditional_edges("decide_strategy", _route_by_classification, {
        "probe_easier": "probe_easier",
        "follow_up_detail": "follow_up_detail",
        "switch_topic_harder": "switch_topic_harder",
        "finish": "final_report",
    })

    # Each strategy branch generates a question, then check if we should continue or finish
    for branch in ("probe_easier", "follow_up_detail", "switch_topic_harder"):
        graph.add_conditional_edges(branch, _should_stop, {
            "stop": END,
            "continue": "next_question",
        })

    # next_question: increment index, then check termination
    graph.add_conditional_edges("next_question", _should_continue_or_finish, {
        "continue": "generate_question",
        "finish": "final_report",
        "stop": END,
    })

    graph.add_edge("final_report", END)

    return graph


# ---------------------------------------------------------------------------
# Compiled graph singleton with checkpointer
# ---------------------------------------------------------------------------

_compiled_graph = None
_runtime = None


def get_compiled_graph(runtime: RuntimeContext = None) -> Any:
    """Get or create a compiled interview graph with checkpoint support.

    The graph uses interrupt_before=['evaluate_answer'] to pause execution
    and wait for user answers. This enables the "time travel" checkpoint
    capability — the interview can be paused, resumed, or replayed from
    any checkpoint.
    """
    global _compiled_graph, _runtime
    if runtime is None:
        runtime = RuntimeContext()
    if _compiled_graph is None or _runtime is not runtime:
        _runtime = runtime
        graph = build_interview_graph(runtime)
        checkpointer = _get_checkpointer()
        _compiled_graph = graph.compile(
            checkpointer=checkpointer,
            interrupt_before=["evaluate_answer"],
        )
    return _compiled_graph


# ---------------------------------------------------------------------------
# High-level API
# ---------------------------------------------------------------------------

def run_interview_init(
    session_id: str,
    resume_id: str,
    jd_id: str = "",
    jd_text: str = "",
    interview_type: str = "technical_1",
    question_count_target: int = 5,
    user_id: str = "",
    *,
    use_mock: Optional[bool] = None,
    db_session_factory=None,
) -> Dict[str, Any]:
    """Start a new interview session via compiled graph with checkpoint.

    Runs init_interview → generate_question, then pauses before evaluate_answer
    (waiting for user answer). Returns state with first question.
    """
    if use_mock is None:
        use_mock = os.getenv("USE_MOCK_LLM", "").lower() in ("true", "1", "yes")
    runtime = RuntimeContext(use_mock=use_mock, db_session_factory=db_session_factory)
    compiled = get_compiled_graph(runtime)

    initial_state: Dict[str, Any] = {
        "session_id": session_id,
        "resume_id": resume_id,
        "user_id": user_id,
        "jd_id": jd_id,
        "jd_text": jd_text,
        "interview_type": interview_type,
        "question_count_target": question_count_target,
        "current_question_index": 0,
        "turns": [],
        "difficulty_level": "medium",
        "consecutive_weak": 0,
        "topic_coverage": [],
    }

    config = {"configurable": {"thread_id": session_id}}
    result = compiled.invoke(initial_state, config=config)
    return result


def run_interview_answer(
    session_id: str,
    user_answer: str,
    *,
    use_mock: Optional[bool] = None,
    db_session_factory=None,
) -> Dict[str, Any]:
    """Process user's answer via compiled graph with checkpoint.

    Resumes from checkpoint (paused before evaluate_answer), injects
    user_answer into state, then continues execution through
    evaluate → classify → strategy → next question (pauses again
    before the next evaluate_answer).
    """
    if use_mock is None:
        use_mock = os.getenv("USE_MOCK_LLM", "").lower() in ("true", "1", "yes")
    runtime = RuntimeContext(use_mock=use_mock, db_session_factory=db_session_factory)
    compiled = get_compiled_graph(runtime)

    config = {"configurable": {"thread_id": session_id}}

    # Inject user_answer into checkpoint state and resume
    compiled.update_state(config, {"user_answer": user_answer}, as_node="generate_question")
    result = compiled.invoke(None, config=config)
    return result


def run_interview_finish(
    session_id: str,
    current_state: Dict[str, Any] = None,
    *,
    use_mock: Optional[bool] = None,
    db_session_factory=None,
) -> Dict[str, Any]:
    """Force finish the interview and generate final report.

    Takes the current state (including conversation turns) and directly
    invokes the final_report node, bypassing the graph flow.
    """
    if use_mock is None:
        use_mock = os.getenv("USE_MOCK_LLM", "").lower() in ("true", "1", "yes")
    runtime = RuntimeContext(use_mock=use_mock, db_session_factory=db_session_factory)

    # For finish, we directly call the final_report node since we may
    # not be in a clean graph state (e.g., user ended mid-interview)
    if current_state:
        result = final_report(current_state, runtime)
        return result

    # Try to get state from checkpoint and generate report
    compiled = get_compiled_graph(runtime)
    config = {"configurable": {"thread_id": session_id}}
    state = compiled.get_state(config)
    if state and state.values:
        result = final_report(state.values, runtime)
        return result

    return {"error": "无法获取面试状态"}
