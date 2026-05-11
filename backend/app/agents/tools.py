from __future__ import annotations

import json
import logging
from typing import Optional

from langchain_core.tools import tool

from app.db.session import SessionLocal
from app.models.resume import Resume

logger = logging.getLogger(__name__)


@tool
def load_resume_tool(resume_id: str) -> str:
    """从数据库加载简历文本。返回简历的原始文本内容。"""
    db = SessionLocal()
    try:
        resume = db.query(Resume).filter(
            Resume.id == resume_id, Resume.deleted_at.is_(None)
        ).first()
        if not resume:
            return json.dumps({"error": "简历未找到"}, ensure_ascii=False)
        return json.dumps({
            "raw_text": resume.raw_text or "",
            "structured_json": resume.structured_json,
        }, ensure_ascii=False)
    finally:
        db.close()


@tool
def search_history_tool(
    user_id: str,
    query: str,
    doc_type: Optional[str] = None,
    top_k: int = 3,
) -> str:
    """RAG 检索用户历史数据（简历经历、润色建议、面试记录）。

    Args:
        user_id: 用户 ID
        query: 检索查询文本
        doc_type: 文档类型过滤（resume, polish_suggestion），可选
        top_k: 返回结果数量
    """
    try:
        from app.services.rag_service import rag_service
        from app.services.vector_store import VectorStore

        store = VectorStore()
        filter_dict = {"doc_type": doc_type} if doc_type else None
        docs = store.query(user_id, query, top_k=top_k, filter=filter_dict)
        if not docs:
            return json.dumps({"results": [], "message": "未找到相关历史数据"}, ensure_ascii=False)
        results = [
            {"text": d.text, "metadata": d.metadata}
            for d in docs
        ]
        return json.dumps({"results": results}, ensure_ascii=False)
    except Exception as e:
        logger.error("search_history_tool failed: %s", e)
        return json.dumps({"error": str(e)[:200]}, ensure_ascii=False)


@tool
def save_report_tool(
    session_id: str,
    report_type: str,
    report_data: str,
) -> str:
    """将结果持久化到数据库。

    Args:
        session_id: 会话 ID
        report_type: 报告类型（interview_report, polish_report）
        report_data: JSON 格式的报告数据
    """
    db = SessionLocal()
    try:
        if report_type == "interview_report":
            from app.models.interview import InterviewSession
            session = db.query(InterviewSession).filter(
                InterviewSession.id == session_id
            ).first()
            if not session:
                return json.dumps({"error": "面试会话未找到"}, ensure_ascii=False)
            data = json.loads(report_data) if isinstance(report_data, str) else report_data
            session.final_report_json = data
            session.status = "finished"
            db.commit()
            return json.dumps({"success": True, "session_id": session_id}, ensure_ascii=False)

        elif report_type == "polish_report":
            # Polish results are returned via API response, not persisted separately
            return json.dumps({"success": True, "note": "Polish results returned via API"}, ensure_ascii=False)

        return json.dumps({"error": f"未知报告类型: {report_type}"}, ensure_ascii=False)
    except Exception as e:
        logger.error("save_report_tool failed: %s", e)
        return json.dumps({"error": str(e)[:200]}, ensure_ascii=False)
    finally:
        db.close()
