from __future__ import annotations

import json
import logging
from typing import Any, Dict

from app.agents.base.runtime import RuntimeContext, PromptLoader
from app.agents.resume_polish.state import PolishState
from app.models.resume import Resume

logger = logging.getLogger(__name__)


def load_resume(state: PolishState, runtime: RuntimeContext) -> Dict[str, Any]:
    """Load resume text and structured data from DB."""
    db = runtime.get_db()
    try:
        resume = db.query(Resume).filter(
            Resume.id == state["resume_id"], Resume.deleted_at.is_(None)
        ).first()
        if not resume:
            return {"error": "简历未找到"}

        from app.services.resume_text_cleaner import clean_resume_text
        cleaned_text = clean_resume_text(resume.raw_text or "")
        if not cleaned_text.strip():
            return {"error": "简历内容为空，无法润色"}

        return {
            "resume_text": cleaned_text,
            "structured_json": resume.structured_json,
        }
    finally:
        db.close()


def analyze_issues(state: PolishState, runtime: RuntimeContext) -> Dict[str, Any]:
    """Analyze resume issues. Uses RAG to retrieve historical polish suggestions for consistency."""
    if runtime.use_mock:
        return {
            "issues": [
                {"section": "工作经历", "issue": "缺少量化成果描述"},
                {"section": "项目经验", "issue": "技术栈描述不够具体"},
            ],
            "rag_context": "",
        }

    if not runtime.llm_provider:
        return {"error": "未配置 DEEPSEEK_API_KEY，无法分析简历"}

    # RAG: retrieve historical polish suggestions for consistency
    rag_context = ""
    user_id = state.get("user_id", "")
    if user_id:
        try:
            from app.services.rag_service import rag_service
            docs = rag_service.retrieve_for_polish(user_id, state.get("resume_text", "")[:500])
            if docs:
                rag_context = "\n\n".join(
                    f"历史润色建议: {d.text}" for d in docs[:3]
                )
        except Exception as e:
            logger.warning("RAG retrieval for polish failed: %s", e)

    loader = PromptLoader()
    jd_section = ""
    if state.get("jd_text") and state["jd_text"].strip():
        jd_section = f"\n## 目标岗位 JD\n{state['jd_text'].strip()}"

    rag_section = ""
    if rag_context:
        rag_section = f"\n## 历史润色建议（保持风格一致）\n{rag_context}"

    messages = loader.render_messages(
        "resume_polish", "v1",
        resume_text=state.get("resume_text", ""),
        jd_section=jd_section,
    )

    # Inject RAG context if available
    if rag_section:
        messages[-1]["content"] += rag_section

    try:
        resp = runtime.llm_provider.chat_sync(
            messages,
            temperature=0.3,
            response_format={"type": "json_object"},
            max_tokens=8192,
        )
        content = resp["choices"][0]["message"]["content"] or ""
        finish_reason = resp["choices"][0].get("finish_reason", "")
        if not content.strip():
            if finish_reason == "length":
                return {"error": "LLM 输出被截断，请缩短简历内容后重试"}
            return {"error": "LLM 返回为空"}

        parsed = json.loads(content)
        suggestions = []
        for s in parsed.get("suggestions", []):
            suggestions.append({
                "section": s.get("section", ""),
                "original_text": s.get("original_text", ""),
                "issue": s.get("issue", ""),
                "revised_text": s.get("revised_text", ""),
                "rationale": s.get("rationale", ""),
                "risk_level": s.get("risk_level", "low"),
            })

        has_high_risk = any(s["risk_level"] == "high" for s in suggestions)
        overall = parsed.get("overall_assessment", "")

        return {
            "suggestions": suggestions,
            "has_high_risk": has_high_risk,
            "overall_assessment": overall,
            "rag_context": rag_context,
        }
    except json.JSONDecodeError as e:
        logger.error("analyze_issues JSON parse error: %s", e)
        return {"error": "AI 返回格式异常，请重试"}
    except Exception as e:
        logger.error("analyze_issues failed: %s", e)
        return {"error": f"分析失败: {str(e)[:200]}"}


def risk_gate(state: PolishState, runtime: RuntimeContext) -> Dict[str, Any]:
    """Risk gate: check if any suggestions are high-risk.

    This is a routing node. If high-risk suggestions exist,
    the graph routes to validate_risks; otherwise skips to format_report.
    """
    # Just pass through — the conditional edge uses has_high_risk
    return {}


def validate_risks(state: PolishState, runtime: RuntimeContext) -> Dict[str, Any]:
    """LLM-as-Judge: validate high-risk suggestions to filter unsafe content.

    Only reviews risk_level=high suggestions. Checks for:
    - Fabricated experience (编造经历)
    - Fake data/metrics (虚假数据)
    - Misleading claims (误导性表述)
    """
    suggestions = state.get("suggestions", [])
    if not suggestions:
        return {"validated_suggestions": [], "risk_validation_notes": []}

    high_risk = [s for s in suggestions if s.get("risk_level") == "high"]
    low_risk = [s for s in suggestions if s.get("risk_level") != "high"]

    if not high_risk:
        return {"validated_suggestions": suggestions, "risk_validation_notes": []}

    if runtime.use_mock or not runtime.llm_provider:
        # In mock mode, demote all high-risk to medium with a warning
        for s in high_risk:
            s["risk_level"] = "medium"
            s["validation_note"] = "自动降级：高风险建议在 mock 模式下未验证"
        return {
            "validated_suggestions": low_risk + high_risk,
            "risk_validation_notes": ["Mock模式: 高风险建议已自动降级为medium"],
        }

    # LLM-as-Judge: ask LLM to validate each high-risk suggestion
    validation_prompt = """你是一个简历合规审查员。请判断以下简历润色建议是否合规。

合规标准：
- 不能建议编造不存在的经历、项目或学历
- 不能建议添加虚假的数据或指标
- 不能建议使用误导性表述夸大能力

对每条建议，输出 JSON:
{
  "valid": true/false,
  "reason": "判断理由"
}

如果建议合规（只是措辞优化或合理补充），输出 valid=true。
如果建议涉及编造/虚假/误导，输出 valid=false。

建议内容：
"""

    validated_high = []
    notes = []
    for s in high_risk:
        suggestion_text = f"原文: {s.get('original_text', '')}\n建议修改: {s.get('revised_text', '')}\n理由: {s.get('rationale', '')}"
        try:
            messages = [
                {"role": "system", "content": validation_prompt},
                {"role": "user", "content": suggestion_text},
            ]
            resp = runtime.llm_provider.chat_sync(
                messages, temperature=0.1,
                response_format={"type": "json_object"},
                max_tokens=256,
            )
            content = resp["choices"][0]["message"]["content"]
            result = json.loads(content)
            if result.get("valid", True):
                s["validation_note"] = "已审查: 合规"
                validated_high.append(s)
            else:
                # Demote to medium and add warning
                s["risk_level"] = "medium"
                s["validation_note"] = f"已降级: {result.get('reason', '可能不合规')}"
                validated_high.append(s)
                notes.append(f"降级建议: {s.get('section', '')} - {result.get('reason', '')}")
        except Exception as e:
            logger.warning("Risk validation LLM call failed: %s", e)
            # On failure, keep as high-risk with note
            s["validation_note"] = f"审查失败，保留高风险: {str(e)[:100]}"
            validated_high.append(s)

    return {
        "validated_suggestions": low_risk + validated_high,
        "risk_validation_notes": notes,
    }


def format_report(state: PolishState, runtime: RuntimeContext) -> Dict[str, Any]:
    """Format final polish report as JSON + markdown."""
    suggestions = state.get("validated_suggestions") or state.get("suggestions", [])
    overall = state.get("overall_assessment", "")
    notes = state.get("risk_validation_notes", [])

    # Build markdown report
    md_lines = ["# 简历润色报告\n"]
    for i, sug in enumerate(suggestions, 1):
        risk_label = {
            "low": "措辞优化", "medium": "补充数据", "high": "补充经历"
        }.get(sug.get("risk_level", "low"), sug.get("risk_level", ""))
        md_lines.append(f"## 建议 {i}：{sug.get('section', '')} [{risk_label}]")
        md_lines.append(f"- **原文**：{sug.get('original_text', '')}")
        md_lines.append(f"- **问题**：{sug.get('issue', '')}")
        md_lines.append(f"- **修改**：{sug.get('revised_text', '')}")
        md_lines.append(f"- **理由**：{sug.get('rationale', '')}")
        if sug.get("validation_note"):
            md_lines.append(f"- **审查**：{sug['validation_note']}")
        md_lines.append("")

    md_lines.append(f"## 整体评价\n{overall}")

    if notes:
        md_lines.append("\n## 风险审查备注")
        for n in notes:
            md_lines.append(f"- {n}")

    polish_markdown = "\n".join(md_lines)

    # Index polish suggestions into vector store for future RAG retrieval
    user_id = state.get("user_id", "")
    resume_id = state.get("resume_id", "")
    if user_id and suggestions:
        try:
            from app.services.rag_service import rag_service
            rag_service.index_polish_suggestions(user_id, resume_id, suggestions)
        except Exception as e:
            logger.warning("Failed to index polish suggestions: %s", e)

    return {
        "polish_json": {
            "suggestions": suggestions,
            "overall_assessment": overall,
            "risk_validation_notes": notes,
        },
        "polish_markdown": polish_markdown,
    }
