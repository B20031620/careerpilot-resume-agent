from __future__ import annotations

import json
import logging
from typing import Any, Dict

from app.agents.base.runtime import RuntimeContext
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
        "question": "在你主导的AI项目中，最大的技术挑战是什么？你是如何解决的？",
        "question_type": "project_deep_dive",
    },
    {
        "question": "请解释一下RAG系统的核心工作原理，以及你在项目中是如何应用它的。",
        "question_type": "technical",
    },
    {
        "question": "如果让你从零设计一个高并发的AI对话系统，你会考虑哪些架构要素？",
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
}

MOCK_FOLLOW_UP = {
    "score": 72,
    "strengths": ["补充了更多细节"],
    "improvements": ["仍缺少业务指标"],
    "risks": ["部分回答较为模糊"],
    "follow_up_needed": False,
    "follow_up_question": "",
}


def init_interview(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    db = runtime.get_db()
    try:
        # Load resume text if resume_id provided
        resume_text = ""
        if state.get("resume_id"):
            resume = db.query(Resume).filter(Resume.id == state["resume_id"], Resume.deleted_at.is_(None)).first()
            if resume:
                resume_text = resume.raw_text or ""

        # Load JD text if jd_id provided
        jd_text = ""
        if state.get("jd_id"):
            jd = db.query(JobDescription).filter(JobDescription.id == state["jd_id"], JobDescription.deleted_at.is_(None)).first()
            if jd:
                jd_text = jd.raw_text or ""

        return {"resume_text": resume_text, "jd_text": jd_text}
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

    # Build context for LLM
    context_lines = []
    ctx = _build_interview_context(state)
    context_lines.append(f"面试类型: {state.get('interview_type', 'technical_1')}")
    context_lines.append(f"第 {idx + 1}/{state.get('question_count_target', 5)} 题")
    if ctx:
        context_lines.append(f"简历与岗位背景:\n{ctx}")

    prompt = (
        "你是一位资深技术面试官。根据以下背景信息，生成一个有针对性的面试问题。"
        "问题应该是具体、开放式、能深入考察候选人能力的。"
        "只输出问题文本，不要输出任何前缀或解释。\n\n" + "\n".join(context_lines)
    )

    try:
        resp = runtime.llm_provider.chat_sync(
            [{"role": "user", "content": prompt}], temperature=0.7
        )
        question = resp["choices"][0]["message"]["content"].strip()
        # Infer question type
        qtype = _infer_question_type(question)
        return {"current_question": question, "current_question_type": qtype}
    except Exception as e:
        logger.error("generate_question failed: %s", e)
        return {"error": f"生成题目失败: {str(e)[:200]}"}


def evaluate_answer(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    if runtime.use_mock:
        return {
            "eval_score": MOCK_EVALUATION["score"],
            "eval_strengths": MOCK_EVALUATION["strengths"],
            "eval_improvements": MOCK_EVALUATION["improvements"],
            "eval_risks": MOCK_EVALUATION["risks"],
            "follow_up_needed": MOCK_EVALUATION["follow_up_needed"],
            "follow_up_question": MOCK_EVALUATION["follow_up_question"],
        }

    if not runtime.llm_provider:
        return {"error": "未配置 DEEPSEEK_API_KEY，无法评估回答。"}

    prompt = (
        "你是一位资深技术面试官。请评估以下面试回答，用JSON格式返回（不要包含markdown代码块）：\n\n"
        f"问题: {state.get('current_question', '')}\n"
        f"回答: {state.get('user_answer', '')}\n\n"
        '返回格式: {"score": 0-100, "strengths": ["优点1", "优点2"], '
        '"improvements": ["改进点1"], "risks": ["高风险提醒"], '
        '"follow_up_needed": false, "follow_up_question": ""}'
    )

    try:
        resp = runtime.llm_provider.chat_sync(
            [{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        content = resp["choices"][0]["message"]["content"]
        result = json.loads(content)
        return {
            "eval_score": result.get("score", 60),
            "eval_strengths": result.get("strengths", []),
            "eval_improvements": result.get("improvements", []),
            "eval_risks": result.get("risks", []),
            "follow_up_needed": result.get("follow_up_needed", False),
            "follow_up_question": result.get("follow_up_question", ""),
        }
    except Exception as e:
        logger.error("evaluate_answer failed: %s", e)
        return {"error": f"评估回答失败: {str(e)[:200]}"}


def decide_follow_up(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    if state.get("follow_up_needed") and state.get("follow_up_question"):
        return {"current_question": state["follow_up_question"], "follow_up_needed": True}
    return {"follow_up_needed": False}


def generate_follow_up(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    # In mock mode, use the pre-set follow-up question
    if state.get("follow_up_question"):
        return {"current_question": state["follow_up_question"]}
    return {"current_question": "能请你再详细展开一下吗？"}


def next_question(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    idx = state.get("current_question_index", 0) + 1
    return {"current_question_index": idx}


def final_report(state: InterviewState, runtime: RuntimeContext) -> Dict[str, Any]:
    turns = state.get("turns", [])
    total = sum(t.get("score", 0) for t in turns) if turns else 0
    avg_score = total // len(turns) if turns else 0

    strengths_all: list[str] = []
    improvements_all: list[str] = []
    risks_all: list[str] = []
    for t in turns:
        strengths_all.extend(t.get("strengths", []))
        improvements_all.extend(t.get("improvements", []))
        risks_all.extend(t.get("risks", []))

    report_json = {
        "total_turns": len(turns),
        "average_score": avg_score,
        "strengths_summary": list(set(strengths_all))[:5],
        "areas_to_improve": list(set(improvements_all))[:5],
        "risk_flags": list(set(risks_all))[:5],
        "turns": turns,
    }

    md = _build_final_markdown(avg_score, strengths_all, improvements_all, risks_all, turns)

    return {
        "final_report_json": report_json,
        "final_report_markdown": md,
        "status": "finished",
    }


def _build_interview_context(state: InterviewState) -> str:
    parts = []
    if state.get("resume_text"):
        parts.append(f"候选人简历摘要: {state['resume_text'][:500]}")
    if state.get("jd_text"):
        parts.append(f"目标岗位JD摘要: {state['jd_text'][:500]}")
    return "\n".join(parts)


def _infer_question_type(question: str) -> str:
    q = question.lower()
    if any(kw in q for kw in ["介绍", "经历", "团队", "冲突", "协作"]):
        return "behavioral"
    if any(kw in q for kw in ["系统设计", "架构", "设计"]):
        return "system_design"
    if any(kw in q for kw in ["项目", "挑战", "推动", "落地"]):
        return "project_deep_dive"
    return "technical"


def _build_final_markdown(
    avg_score: int,
    strengths: list[str],
    improvements: list[str],
    risks: list[str],
    turns: list[dict],
) -> str:
    lines = [
        "# 模拟面试报告",
        "",
        f"**综合评分**: {avg_score}/100",
        "",
        "## 总体表现",
    ]
    if avg_score >= 80:
        lines.append("表现优秀，具备较强竞争力。")
    elif avg_score >= 60:
        lines.append("表现良好，有进一步提升空间。")
    else:
        lines.append("建议加强准备，重点关注改进方向。")

    if strengths:
        lines.append("")
        lines.append("## 主要优点")
        for s in set(strengths):
            lines.append(f"- {s}")

    if improvements:
        lines.append("")
        lines.append("## 需要改进")
        for imp in set(improvements):
            lines.append(f"- {imp}")

    if risks:
        lines.append("")
        lines.append("## 高风险提醒")
        for r in set(risks):
            lines.append(f"- {r}")

    lines.append("")
    lines.append("## 各轮详情")
    for t in turns:
        q = t.get("question", "")[:60]
        s = t.get("score", "--")
        lines.append(f"- 第{t.get('turn_index', 0) + 1}轮 [{s}分] {q}...")

    return "\n".join(lines)
