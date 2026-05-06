from __future__ import annotations

import json
import logging
from typing import Any, Dict

from app.agents.base.runtime import PromptLoader, RuntimeContext
from app.agents.resume_match.state import ResumeMatchState
from app.models.job_description import JobDescription
from app.models.report import Report
from app.models.resume import Resume

logger = logging.getLogger(__name__)

MOCK_STRUCTURED_RESUME = {
    "basic_info": {"name": "张三", "email": "zhangsan@example.com", "phone": "138****1234", "location": "北京"},
    "education": [{"school": "北京理工大学", "degree": "本科", "major": "计算机科学与技术", "start_date": "2016-09", "end_date": "2020-06"}],
    "skills": [
        {"name": "Python", "category": "backend", "evidence": ["3年后端开发经验"]},
        {"name": "LangChain", "category": "ai", "evidence": ["AI客服项目"]},
        {"name": "FastAPI", "category": "backend", "evidence": ["多个API服务"]},
        {"name": "React", "category": "frontend", "evidence": ["内部管理系统"]},
    ],
    "work_experiences": [
        {"company": "某科技公司", "role": "后端工程师", "start_date": "2020-07", "end_date": "2023-12", "responsibilities": ["负责后端服务开发"], "achievements": ["完成多个核心模块"]},
    ],
    "projects": [
        {"name": "AI智能客服系统", "description": "基于LangChain的多轮对话客服系统", "tech_stack": ["Python", "LangChain", "FastAPI"], "role": "核心开发", "responsibilities": ["对话引擎设计"], "achievements": ["日均5000+会话"], "metrics": ["客户满意度提升25%"]},
    ],
}

MOCK_JOB_PROFILE = {
    "job_title": "高级AI工程师",
    "role_direction": "ai_engineer",
    "required_skills": [
        {"skill": "Python", "importance": "high", "evidence_from_jd": "熟练掌握Python"},
        {"skill": "LangChain", "importance": "high", "evidence_from_jd": "有LangChain/LangGraph开发经验"},
        {"skill": "FastAPI", "importance": "medium", "evidence_from_jd": "熟悉Web框架"},
        {"skill": "系统设计", "importance": "medium", "evidence_from_jd": "具备架构设计能力"},
        {"skill": "Kubernetes", "importance": "low", "evidence_from_jd": "了解容器化部署"},
    ],
    "preferred_skills": [
        {"skill": "RAG", "importance": "medium", "evidence_from_jd": "有RAG系统开发经验优先"},
        {"skill": "微服务架构", "importance": "low", "evidence_from_jd": "了解微服务架构优先"},
    ],
    "responsibilities": ["设计并实现AI Agent工作流", "优化LLM调用性能", "参与技术方案评审"],
    "hidden_requirements": [{"requirement": "跨团队协作能力", "reason": "JD提到参与技术方案评审"}],
}

MOCK_MATCH_RESULT = {
    "overall_score": 82,
    "score_breakdown": {"skill_score": 85, "project_score": 80, "experience_score": 78, "expression_score": 86},
    "strengths": [
        {"title": "技术栈高度匹配", "evidence": "掌握Python、LangChain、FastAPI等核心技能", "related_jd_requirement": "熟练掌握Python，有LangChain开发经验"},
        {"title": "AI项目实战经验", "evidence": "AI智能客服系统项目经验", "related_jd_requirement": "设计并实现AI Agent工作流"},
    ],
    "weaknesses": [
        {"title": "系统设计经验不足", "reason": "简历中未体现大规模系统设计经历", "impact": "可能影响高级岗位竞争力"},
        {"title": "缺少量化成果", "reason": "工作经历中缺少业务指标数据", "impact": "难以证明实际业务影响"},
    ],
    "missing_keywords": ["微服务架构", "Kubernetes", "技术方案评审", "跨团队协作", "OKR"],
    "polish_suggestions": [
        {"section": "工作经历", "original_text": "负责后端服务开发", "issue": "缺少量化成果", "revised_text": "主导3个核心后端服务开发，支撑日均10万+请求，系统可用性99.9%", "rationale": "补充业务数据和系统指标", "risk_level": "medium", "evidence_needed": True},
        {"section": "技能栈", "original_text": "熟悉LangChain", "issue": "缺少实践证据", "revised_text": "基于LangChain构建多轮对话Agent，实现简历自动结构化解析，准确率达92%", "rationale": "用具体项目印证技能", "risk_level": "low", "evidence_needed": False},
    ],
    "interview_risks": [
        {"risk": "系统设计能力可能被质疑", "possible_question": "请设计一个高并发的AI对话系统架构", "preparation_advice": "准备分布式系统设计思路，关注缓存、限流、降级策略"},
    ],
}


def load_resume(state: ResumeMatchState, runtime: RuntimeContext) -> Dict[str, Any]:
    db = runtime.get_db()
    try:
        resume = db.query(Resume).filter(Resume.id == state["resume_id"], Resume.deleted_at.is_(None)).first()
        if not resume:
            return {"error": f"Resume {state['resume_id']} not found"}
        return {"resume_text": resume.raw_text or ""}
    finally:
        db.close()


def parse_resume(state: ResumeMatchState, runtime: RuntimeContext) -> Dict[str, Any]:
    if runtime.use_mock:
        return {"structured_resume": MOCK_STRUCTURED_RESUME}

    if not runtime.llm_provider:
        return {"error": "未配置 DEEPSEEK_API_KEY，无法解析简历。请在 .env 中配置 DEEPSEEK_API_KEY 或设置 USE_MOCK_LLM=true"}

    loader = PromptLoader()
    messages = loader.render_messages("resume_parse", "v1", resume_text=state["resume_text"])
    try:
        result = _call_llm_json(runtime, messages)
        return {"structured_resume": result}
    except Exception as e:
        logger.error("parse_resume failed: %s", e)
        return {"error": f"简历解析失败: {str(e)[:200]}"}


def analyze_jd(state: ResumeMatchState, runtime: RuntimeContext) -> Dict[str, Any]:
    db = runtime.get_db()
    try:
        jd = db.query(JobDescription).filter(JobDescription.id == state["job_id"], JobDescription.deleted_at.is_(None)).first()
        if not jd:
            return {"error": f"Job description {state['job_id']} not found"}
        jd_text = jd.raw_text or ""
    finally:
        db.close()

    if runtime.use_mock:
        return {"job_profile": MOCK_JOB_PROFILE}

    if not runtime.llm_provider:
        return {"error": "未配置 DEEPSEEK_API_KEY，无法分析JD。请在 .env 中配置 DEEPSEEK_API_KEY 或设置 USE_MOCK_LLM=true"}

    loader = PromptLoader()
    messages = loader.render_messages("jd_analysis", "v1", jd_text=jd_text)
    try:
        result = _call_llm_json(runtime, messages)
        return {"job_profile": result}
    except Exception as e:
        logger.error("analyze_jd failed: %s", e)
        return {"error": f"JD分析失败: {str(e)[:200]}"}


def align_capabilities(state: ResumeMatchState, runtime: RuntimeContext) -> Dict[str, Any]:
    # Alignment is done within the match prompt itself; this node is a passthrough
    return {}


def score_match(state: ResumeMatchState, runtime: RuntimeContext) -> Dict[str, Any]:
    if runtime.use_mock:
        m = MOCK_MATCH_RESULT
        return {
            "overall_score": m["overall_score"],
            "skill_score": m["score_breakdown"]["skill_score"],
            "project_score": m["score_breakdown"]["project_score"],
            "experience_score": m["score_breakdown"]["experience_score"],
            "expression_score": m["score_breakdown"]["expression_score"],
            "strengths": m["strengths"],
            "weaknesses": m["weaknesses"],
            "missing_keywords": m["missing_keywords"],
            "suggestions": m["polish_suggestions"],
            "interview_risks": m.get("interview_risks", []),
        }

    if not runtime.llm_provider:
        return {"error": "未配置 DEEPSEEK_API_KEY，无法进行匹配分析。请在 .env 中配置 DEEPSEEK_API_KEY 或设置 USE_MOCK_LLM=true"}

    loader = PromptLoader()
    messages = loader.render_messages(
        "resume_match", "v1",
        structured_resume=json.dumps(state.get("structured_resume", {}), ensure_ascii=False, indent=2),
        job_profile=json.dumps(state.get("job_profile", {}), ensure_ascii=False, indent=2),
    )
    try:
        result = _call_llm_json(runtime, messages)
        sb = result.get("score_breakdown", {})
        return {
            "overall_score": result.get("overall_score", 0),
            "skill_score": sb.get("skill_score", 0),
            "project_score": sb.get("project_score", 0),
            "experience_score": sb.get("experience_score", 0),
            "expression_score": sb.get("expression_score", 0),
            "strengths": result.get("strengths", []),
            "weaknesses": result.get("weaknesses", []),
            "missing_keywords": result.get("missing_keywords", []),
            "suggestions": result.get("polish_suggestions", []),
            "interview_risks": result.get("interview_risks", []),
        }
    except Exception as e:
        logger.error("score_match failed: %s", e)
        return {"error": f"匹配分析失败: {str(e)[:200]}"}


def generate_suggestions(state: ResumeMatchState, runtime: RuntimeContext) -> Dict[str, Any]:
    # Suggestions are already generated in score_match for this MVP
    return {}


def validate_risks(state: ResumeMatchState, runtime: RuntimeContext) -> Dict[str, Any]:
    suggestions = state.get("suggestions", [])
    risk_flags = []
    for s in suggestions:
        if s.get("risk_level") == "high":
            risk_flags.append({"section": s.get("section", ""), "issue": s.get("issue", ""), "action": "需要人工确认事实依据"})
    return {"risk_flags": risk_flags}


def persist_report(state: ResumeMatchState, runtime: RuntimeContext) -> Dict[str, Any]:
    report_markdown = _build_markdown(state)
    db = runtime.get_db()
    try:
        report = Report(
            resume_id=state["resume_id"],
            jd_id=state["job_id"],
            report_type="match",
            overall_score=state.get("overall_score", 0),
            skill_score=state.get("skill_score", 0),
            project_score=state.get("project_score", 0),
            experience_score=state.get("experience_score", 0),
            expression_score=state.get("expression_score", 0),
            strengths_json=state.get("strengths", []),
            weaknesses_json=state.get("weaknesses", []),
            missing_keywords_json=state.get("missing_keywords", []),
            suggestions_json=state.get("suggestions", []),
            report_markdown=report_markdown,
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return {"report_id": report.id}
    finally:
        db.close()


def _call_llm_json(runtime: RuntimeContext, messages: list) -> dict:
    import asyncio
    loop = asyncio.get_event_loop()
    if loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            result = loop.run_in_executor(pool, _call_llm_json_sync, runtime, messages)
            import asyncio as _aio
            return _aio.get_event_loop().run_until_complete(result)
    return _call_llm_json_sync(runtime, messages)


def _call_llm_json_sync(runtime: RuntimeContext, messages: list) -> dict:
    import asyncio
    provider = runtime.llm_provider
    resp = asyncio.get_event_loop().run_until_complete(
        provider.chat(messages, temperature=0.2, response_format={"type": "json_object"})
    )
    content = resp["choices"][0]["message"]["content"]
    return json.loads(content)


def _build_markdown(state: ResumeMatchState) -> str:
    lines = [
        f"# 简历匹配报告",
        f"",
        f"**综合评分**: {state.get('overall_score', 0)}/100",
        f"",
        f"## 评分明细",
        f"- 技能匹配: {state.get('skill_score', 0)}",
        f"- 项目匹配: {state.get('project_score', 0)}",
        f"- 经验匹配: {state.get('experience_score', 0)}",
        f"- 表达质量: {state.get('expression_score', 0)}",
        f"",
        f"## 核心优势",
    ]
    for s in state.get("strengths", []):
        lines.append(f"- **{s.get('title', '')}**: {s.get('evidence', '')}")
    lines.append("")
    lines.append("## 关键差距")
    for w in state.get("weaknesses", []):
        lines.append(f"- **{w.get('title', '')}**: {w.get('reason', '')}")
    lines.append("")
    lines.append("## 缺失关键词")
    lines.append(", ".join(state.get("missing_keywords", [])))
    if state.get("risk_flags"):
        lines.append("")
        lines.append("## 高风险建议")
        for rf in state["risk_flags"]:
            lines.append(f"- [{rf.get('section', '')}] {rf.get('issue', '')} — {rf.get('action', '')}")
    return "\n".join(lines)
