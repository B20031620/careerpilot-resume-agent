from __future__ import annotations

import json
import logging
from typing import Any, Dict

from app.agents.base.runtime import RuntimeContext, PromptLoader
from app.agents.mock_interview.state import InterviewState
from app.models.interview import InterviewSession, InterviewTurn
from app.models.job_description import JobDescription
from app.models.resume import Resume

logger = logging.getLogger(__name__)

MOCK_QUESTIONS = [
    {
        "question": "请做个简单的自我介绍，重点说说你最近一段工作经历中的角色。",
        "question_type": "behavioral",
    },
    {
        "question": "在你主导的项目中，最大的技术挑战是什么？你是如何解决的？",
        "question_type": "project_deep_dive",
    },
    {
        "question": "请解释一下你在项目中最核心的技术方案，以及为什么选择它。",
        "question_type": "technical",
    },
    {
        "question": "如果让你从零设计一个高可用的系统，你会考虑哪些架构要素？",
        "question_type": "system_design",
    },
    {
        "question": "你如何处理工作中跨团队的协作和冲突？请举个具体例子。",
        "question_type": "behavioral",
    },
]

MOCK_EVALUATION = {
    "score": 78,
    "strengths": ["回答逻辑清晰", "有具体技术细节", "表达流畅"],
    "improvements": ["缺少量化数据支撑", "可以在系统设计层面展开更多"],
    "risks": [],
    "follow_up_needed": False,
    "follow_up_question": "",
    "brief_feedback": "回答结构清晰，建议补充更多量化成果。",
}


def _build_conversation_section(state: InterviewState) -> str:
    """Format conversation history for LLM context."""
    turns = state.get("turns", [])
    if not turns:
        return ""
    lines = ["## 之前的对话记录"]
    for t in turns:
        idx = t.get("turn_index", 0) + 1
        lines.append(f"\n**第{idx}轮**")
        lines.append(f"面试官: {t.get('question', '')}")
        if t.get("user_answer"):
            lines.append(f"候选人: {t['user_answer']}")
        if t.get("score") is not None:
            lines.append(f"(评分: {t['score']}分)")
    return "\n".join(lines)


def _build_context_section(state: InterviewState) -> str:
    """Format resume + JD + RAG context for LLM."""
    parts = []
    if state.get("rag_context"):
        parts.append(f"## 相关简历经历（RAG检索）\n{state['rag_context']}")
    if state.get("resume_text"):
        parts.append(f"候选人简历摘要:\n{state['resume_text'][:800]}")
    if state.get("jd_text"):
        parts.append(f"目标岗位JD摘要:\n{state['jd_text'][:800]}")
    if not parts:
        return ""
    return "## 背景信息\n" + "\n\n".join(parts)


def init_interview(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    db = runtime.get_db()
    try:
        resume_text = ""
        if state.get("resume_id"):
            resume = db.query(Resume).filter(Resume.id == state["resume_id"], Resume.deleted_at.is_(None)).first()
            if resume:
                resume_text = resume.raw_text or ""

        jd_text = state.get("jd_text", "")
        if not jd_text and state.get("jd_id"):
            jd = db.query(JobDescription).filter(JobDescription.id == state["jd_id"], JobDescription.deleted_at.is_(None)).first()
            if jd:
                jd_text = jd.raw_text or ""

        return {
            "resume_text": resume_text,
            "jd_text": jd_text,
            "difficulty_level": "medium",
            "consecutive_weak": 0,
            "topic_coverage": [],
        }
    finally:
        db.close()


def generate_question(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    idx = state.get("current_question_index", 0)

    if runtime.use_mock:
        q = MOCK_QUESTIONS[min(idx, len(MOCK_QUESTIONS) - 1)]
        return {
            "current_question": q["question"],
            "current_question_type": q["question_type"],
        }

    if not runtime.llm_provider:
        return {
            "error": "未配置 DEEPSEEK_API_KEY，无法生成面试题目。请在 .env 中配置 DEEPSEEK_API_KEY 或设置 USE_MOCK_LLM=true",
        }

    # RAG: retrieve relevant resume segments for targeted question generation
    rag_context = ""
    user_id = state.get("user_id", "")
    if user_id:
        try:
            from app.services.rag_service import rag_service
            current_topic = state.get("current_question_type", "technical")
            docs = rag_service.retrieve_for_interview(user_id, topic=current_topic)
            if docs:
                rag_context = "\n\n".join(d.text for d in docs[:3])
        except Exception as e:
            logger.warning("RAG retrieval for interview failed: %s", e)

    loader = PromptLoader()
    conversation_section = _build_conversation_section(state)
    context_section = _build_context_section({**state, "rag_context": rag_context})

    difficulty = state.get("difficulty_level", "medium")
    topic_coverage = state.get("topic_coverage", [])

    messages = loader.render_messages(
        "mock_interview", "v1_generate_question",
        interview_type=state.get("interview_type", "technical_1"),
        current_index=str(idx + 1),
        total_count=str(state.get("question_count_target", 5)),
        context_section=context_section,
        conversation_section=conversation_section,
    )

    # Inject difficulty and topic guidance into the last user message
    last_msg = messages[-1]["content"]
    strategy_hint = f"\n\n当前难度: {difficulty}"
    if topic_coverage:
        strategy_hint += f"\n已覆盖话题: {', '.join(topic_coverage)}"
        strategy_hint += "\n请尽量提问未覆盖的新话题方向。"
    if difficulty == "easy":
        strategy_hint += "\n请出基础概念题，帮助候选人建立信心。"
    elif difficulty == "hard":
        strategy_hint += "\n请出有挑战性的深入题或系统设计题。"
    messages[-1]["content"] = last_msg + strategy_hint

    try:
        resp = runtime.llm_provider.chat_sync(
            messages, temperature=0.7,
        )
        question = resp["choices"][0]["message"]["content"].strip()
        qtype = _infer_question_type(question)
        return {
            "current_question": question,
            "current_question_type": qtype,
            "rag_context": rag_context,
        }
    except Exception as e:
        logger.error("generate_question failed: %s", e)
        return {"error": f"生成题目失败: {str(e)[:200]}"}


def evaluate_answer(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    if runtime.use_mock:
        result = {
            "eval_score": MOCK_EVALUATION["score"],
            "eval_strengths": MOCK_EVALUATION["strengths"],
            "eval_improvements": MOCK_EVALUATION["improvements"],
            "eval_risks": MOCK_EVALUATION["risks"],
            "follow_up_needed": MOCK_EVALUATION["follow_up_needed"],
            "follow_up_question": MOCK_EVALUATION["follow_up_question"],
            "brief_feedback": MOCK_EVALUATION["brief_feedback"],
        }
        # Accumulate the current turn
        turns = list(state.get("turns", []))
        turns.append({
            "turn_index": state.get("current_question_index", 0),
            "question": state.get("current_question", ""),
            "question_type": state.get("current_question_type", ""),
            "user_answer": state.get("user_answer", ""),
            "score": result["eval_score"],
            "strengths": result["eval_strengths"],
            "improvements": result["eval_improvements"],
            "risks": result["eval_risks"],
        })
        result["turns"] = turns
        return result

    if not runtime.llm_provider:
        return {"error": "未配置 DEEPSEEK_API_KEY，无法评估回答。"}

    loader = PromptLoader()
    conversation_section = _build_conversation_section(state)

    messages = loader.render_messages(
        "mock_interview", "v1_evaluate_answer",
        current_question=state.get("current_question", ""),
        user_answer=state.get("user_answer", ""),
        conversation_section=conversation_section,
    )

    try:
        resp = runtime.llm_provider.chat_sync(
            messages, temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=2048,
        )
        content = resp["choices"][0]["message"]["content"]
        result = json.loads(content)
        eval_result = {
            "eval_score": result.get("score", 60),
            "eval_strengths": result.get("strengths", []),
            "eval_improvements": result.get("improvements", []),
            "eval_risks": result.get("risks", []),
            "follow_up_needed": result.get("follow_up_needed", False),
            "follow_up_question": result.get("follow_up_question", ""),
            "brief_feedback": result.get("brief_feedback", ""),
        }
        # Accumulate the current turn
        turns = list(state.get("turns", []))
        turns.append({
            "turn_index": state.get("current_question_index", 0),
            "question": state.get("current_question", ""),
            "question_type": state.get("current_question_type", ""),
            "user_answer": state.get("user_answer", ""),
            "score": eval_result["eval_score"],
            "strengths": eval_result["eval_strengths"],
            "improvements": eval_result["eval_improvements"],
            "risks": eval_result["eval_risks"],
        })
        eval_result["turns"] = turns
        return eval_result
    except Exception as e:
        logger.error("evaluate_answer failed: %s", e)
        return {"error": f"评估回答失败: {str(e)[:200]}"}


def classify_answer(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    """Classify answer quality into weak/medium/strong for adaptive strategy."""
    score = state.get("eval_score", 60)
    if score < 50:
        classification = "weak"
    elif score < 75:
        classification = "medium"
    else:
        classification = "strong"

    consecutive_weak = state.get("consecutive_weak", 0)
    if classification == "weak":
        consecutive_weak += 1
    else:
        consecutive_weak = 0

    return {
        "answer_classification": classification,
        "consecutive_weak": consecutive_weak,
    }


def decide_strategy(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    """Determine next question strategy based on answer classification.

    This is a routing node — it sets state but the graph's conditional edges
    use the classification to route to the appropriate branch.
    """
    classification = state.get("answer_classification", "medium")

    # Update topic coverage
    topic_coverage = list(state.get("topic_coverage", []))
    current_topic = state.get("current_question_type", "technical")
    if current_topic and current_topic not in topic_coverage:
        topic_coverage.append(current_topic)

    # Adjust difficulty based on classification
    difficulty = state.get("difficulty_level", "medium")
    if classification == "weak":
        difficulty = "easy"
    elif classification == "strong":
        difficulty = "hard"
    else:
        difficulty = "medium"

    return {
        "topic_coverage": topic_coverage,
        "difficulty_level": difficulty,
    }


def probe_easier(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    """Weak answer: lower difficulty, probe same topic with simpler questions."""
    return generate_question(state, runtime)


def follow_up_detail(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    """Medium answer: same difficulty, follow up with details on the same topic."""
    if runtime.use_mock:
        return {
            "current_question": "能具体说说你是如何实现的吗？请分享一些细节。",
            "current_question_type": state.get("current_question_type", "technical"),
        }

    if not runtime.llm_provider:
        return {"error": "未配置 DEEPSEEK_API_KEY"}

    loader = PromptLoader()
    conversation_section = _build_conversation_section(state)
    context_section = _build_context_section(state)

    messages = loader.render_messages(
        "mock_interview", "v1_generate_question",
        interview_type=state.get("interview_type", "technical_1"),
        current_index=str(state.get("current_question_index", 0) + 1),
        total_count=str(state.get("question_count_target", 5)),
        context_section=context_section,
        conversation_section=conversation_section,
    )
    # Override: ask for specific details on same topic
    last_msg = messages[-1]["content"]
    messages[-1]["content"] = last_msg + "\n\n请针对候选人刚才回答的内容，追问具体细节或实现方法，挖掘深度。不要换话题。"

    try:
        resp = runtime.llm_provider.chat_sync(messages, temperature=0.6)
        question = resp["choices"][0]["message"]["content"].strip()
        return {
            "current_question": question,
            "current_question_type": state.get("current_question_type", "technical"),
        }
    except Exception as e:
        logger.error("follow_up_detail failed: %s", e)
        return {"error": f"追问失败: {str(e)[:200]}"}


def switch_topic_harder(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    """Strong answer: switch topic with harder questions to probe capability boundary."""
    if runtime.use_mock:
        return {
            "current_question": "请设计一个支持千万级日活的消息推送系统，重点考虑可靠性和幂等性。",
            "current_question_type": "system_design",
        }

    # Override difficulty to hard for this generation
    state = {**state, "difficulty_level": "hard"}
    return generate_question(state, runtime)


def next_question(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    idx = state.get("current_question_index", 0) + 1
    return {"current_question_index": idx}


def final_report(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    turns = state.get("turns", [])

    if runtime.use_mock or not runtime.llm_provider:
        report_json = _build_fallback_report(turns)
        md = _build_final_markdown(report_json, turns)
        return {"final_report_json": report_json, "final_report_markdown": md, "status": "finished"}

    loader = PromptLoader()
    context_section = _build_context_section(state)
    turns_summary = _format_turns_for_report(turns)

    messages = loader.render_messages(
        "mock_interview", "v1_final_report",
        interview_type=state.get("interview_type", "technical_1"),
        total_turns=str(len(turns)),
        context_section=context_section,
        turns_summary=turns_summary,
    )

    try:
        resp = runtime.llm_provider.chat_sync(
            messages, temperature=0.3,
            response_format={"type": "json_object"},
            max_tokens=4096,
        )
        content = resp["choices"][0]["message"]["content"]
        result = json.loads(content)
        report_json = {
            "average_score": result.get("average_score", 0),
            "total_turns": result.get("total_turns", len(turns)),
            "overall_comment": result.get("overall_comment", ""),
            "strengths_summary": result.get("strengths_summary", []),
            "areas_to_improve": result.get("areas_to_improve", []),
            "risk_flags": result.get("risk_flags", []),
            "preparation_advice": result.get("preparation_advice", []),
        }
        md = _build_final_markdown(report_json, turns)
        return {"final_report_json": report_json, "final_report_markdown": md, "status": "finished"}
    except Exception as e:
        logger.error("final_report LLM failed, using fallback: %s", e)
        report_json = _build_fallback_report(turns)
        md = _build_final_markdown(report_json, turns)
        return {"final_report_json": report_json, "final_report_markdown": md, "status": "finished"}


def _build_fallback_report(turns: list[dict]) -> dict:
    total = sum(t.get("score", 0) for t in turns) if turns else 0
    avg_score = total // len(turns) if turns else 0
    strengths_all: list[str] = []
    improvements_all: list[str] = []
    risks_all: list[str] = []
    for t in turns:
        strengths_all.extend(t.get("strengths", []))
        improvements_all.extend(t.get("improvements", []))
        risks_all.extend(t.get("risks", []))
    return {
        "average_score": avg_score,
        "total_turns": len(turns),
        "overall_comment": "面试表现良好，继续保持。" if avg_score >= 70 else "建议加强准备，重点改进薄弱环节。",
        "strengths_summary": list(set(strengths_all))[:5],
        "areas_to_improve": list(set(improvements_all))[:5],
        "risk_flags": list(set(risks_all))[:5],
        "preparation_advice": [],
    }


def _infer_question_type(question: str) -> str:
    q = question.lower()
    if any(kw in q for kw in ["介绍", "经历", "团队", "冲突", "协作"]):
        return "behavioral"
    if any(kw in q for kw in ["系统设计", "架构", "设计"]):
        return "system_design"
    if any(kw in q for kw in ["项目", "挑战", "推动", "落地"]):
        return "project_deep_dive"
    return "technical"


def _format_turns_for_report(turns: list[dict]) -> str:
    lines = []
    for t in turns:
        idx = t.get("turn_index", 0) + 1
        score = t.get("score", "--")
        q = t.get("question", "")[:100]
        a = t.get("user_answer", "")[:200] if t.get("user_answer") else "(未回答)"
        lines.append(f"第{idx}轮 [{score}分]\n  问: {q}\n  答: {a}")
    return "\n\n".join(lines)


def _build_final_markdown(report_json: dict, turns: list[dict]) -> str:
    avg = report_json.get("average_score", 0)
    comment = report_json.get("overall_comment", "")
    strengths = report_json.get("strengths_summary", [])
    improvements = report_json.get("areas_to_improve", [])
    risks = report_json.get("risk_flags", [])
    advice = report_json.get("preparation_advice", [])

    lines = [
        "# 模拟面试报告",
        "",
        f"**综合评分**: {avg}/100",
        "",
        f"**整体评价**: {comment}",
    ]

    if strengths:
        lines.append("")
        lines.append("## 核心优势")
        for s in strengths:
            lines.append(f"- {s}")

    if improvements:
        lines.append("")
        lines.append("## 需要改进")
        for imp in improvements:
            lines.append(f"- {imp}")

    if risks:
        lines.append("")
        lines.append("## 高风险提醒")
        for r in risks:
            lines.append(f"- {r}")

    if advice:
        lines.append("")
        lines.append("## 准备建议")
        for a in advice:
            lines.append(f"- {a}")

    lines.append("")
    lines.append("## 各轮详情")
    for t in turns:
        q = t.get("question", "")[:60]
        s = t.get("score", "--")
        lines.append(f"- 第{t.get('turn_index', 0) + 1}轮 [{s}分] {q}...")

    return "\n".join(lines)
