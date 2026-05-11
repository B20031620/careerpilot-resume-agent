from __future__ import annotations

import logging
from typing import List, Optional

from app.services.vector_store import Document, VectorStore

logger = logging.getLogger(__name__)

_store = VectorStore()


class RAGService:
    """分层检索策略：不同 agent 用不同的检索策略和过滤条件。"""

    def retrieve_for_interview(
        self, user_id: str, topic: str, top_k: int = 3
    ) -> List[Document]:
        """面试出题时检索：按技能/项目维度检索简历经历片段。

        传回与当前面试话题最相关的 2-3 段经历，而不是整份简历。
        例如：当前话题是"缓存"→ 检索简历中 Redis/Memcached 相关的段落。
        """
        # 优先检索 experience 和 project 类型
        results = _store.query(
            user_id,
            query_text=topic,
            top_k=top_k,
            filter={"doc_type": "resume"},
        )
        # 如果 experience/project 没结果，退回无过滤检索
        if not results:
            results = _store.query(user_id, query_text=topic, top_k=top_k)
        return results

    def retrieve_for_polish(
        self, user_id: str, original_text: str, top_k: int = 3
    ) -> List[Document]:
        """润色分析时检索：按表述相似度检索历史润色建议。

        保证建议风格一致——不会这次建议 STAR 法则下次建议 PAR 法则。
        """
        # 先检索之前的润色建议
        results = _store.query(
            user_id,
            query_text=original_text,
            top_k=top_k,
            filter={"doc_type": "polish_suggestion"},
        )
        return results

    def retrieve_for_workplace(
        self, user_id: str, scene: str, top_k: int = 3
    ) -> List[Document]:
        """职场沟通时检索：按职位身份检索用户简历中的职位信息。

        生成邮件草稿时贴合用户身份——不会给应届生出总监级的措辞。
        """
        # 检索用户 profile 和 experience
        results = _store.query(
            user_id,
            query_text=scene,
            top_k=top_k,
            filter={"doc_type": "resume"},
        )
        return results

    def index_resume(
        self,
        user_id: str,
        resume_id: str,
        structured_json: dict,
    ) -> List[str]:
        """将简历结构化数据分段 embedding 入向量库。

        按经历条目、项目、技能分段存储，每段带 metadata 方便精准检索。
        """
        docs: List[Document] = []
        idx = 0

        # 工作经历
        for exp in structured_json.get("work_experiences", []):
            parts = []
            if exp.get("company"):
                parts.append(f"公司: {exp['company']}")
            if exp.get("role"):
                parts.append(f"职位: {exp['role']}")
            if exp.get("start_date"):
                parts.append(f"开始: {exp['start_date']}")
            if exp.get("end_date"):
                parts.append(f"结束: {exp['end_date']}")
            if exp.get("description"):
                parts.append(f"描述: {exp['description']}")
            resp_list = exp.get("responsibilities") or []
            if resp_list:
                parts.append(f"职责: {'; '.join(resp_list)}")
            ach_list = exp.get("achievements") or []
            if ach_list:
                parts.append(f"成果: {'; '.join(ach_list)}")
            if parts:
                docs.append(Document(
                    id=f"resume_{resume_id}_exp_{idx}",
                    text="\n".join(parts),
                    metadata={
                        "doc_type": "resume",
                        "section_type": "experience",
                        "resume_id": resume_id,
                    },
                ))
                idx += 1

        # 项目经历
        for proj in structured_json.get("projects", []):
            parts = []
            if proj.get("name"):
                parts.append(f"项目: {proj['name']}")
            tech_list = proj.get("tech_stack") or []
            if tech_list:
                parts.append(f"技术栈: {', '.join(tech_list)}")
            if proj.get("description"):
                parts.append(f"描述: {proj['description']}")
            if proj.get("role"):
                parts.append(f"角色: {proj['role']}")
            resp_list = proj.get("responsibilities") or []
            if resp_list:
                parts.append(f"职责: {'; '.join(resp_list)}")
            ach_list = proj.get("achievements") or []
            if ach_list:
                parts.append(f"成果: {'; '.join(ach_list)}")
            if parts:
                docs.append(Document(
                    id=f"resume_{resume_id}_proj_{idx}",
                    text="\n".join(parts),
                    metadata={
                        "doc_type": "resume",
                        "section_type": "project",
                        "resume_id": resume_id,
                    },
                ))
                idx += 1

        # 技能总结 (list of {name, category, evidence})
        skills = structured_json.get("skills") or []
        if isinstance(skills, list) and skills:
            skill_parts = []
            for s in skills:
                name = s.get("name", "")
                category = s.get("category", "")
                evidence = s.get("evidence") or []
                line = f"{name}"
                if category:
                    line += f"({category})"
                if evidence:
                    line += f": {', '.join(evidence)}"
                skill_parts.append(line)
            if skill_parts:
                docs.append(Document(
                    id=f"resume_{resume_id}_skills",
                    text="技能: " + " | ".join(skill_parts),
                    metadata={
                        "doc_type": "resume",
                        "section_type": "skill",
                        "resume_id": resume_id,
                    },
                ))

        # 基本信息 + 教育
        basic = structured_json.get("basic_info") or {}
        edu_list = structured_json.get("education") or []
        profile_parts = []
        if basic.get("name"):
            profile_parts.append(f"姓名: {basic['name']}")
        if basic.get("email"):
            profile_parts.append(f"邮箱: {basic['email']}")
        for edu in edu_list:
            profile_parts.append(f"教育: {edu.get('school', '')} {edu.get('degree', '')} {edu.get('major', '')}")
        if profile_parts:
            docs.append(Document(
                id=f"resume_{resume_id}_profile",
                text="\n".join(profile_parts),
                metadata={
                    "doc_type": "resume",
                    "section_type": "profile",
                    "resume_id": resume_id,
                },
            ))

        if not docs:
            return []

        # 删除同 resume_id 的旧文档
        old_docs = _store.query(user_id, resume_id, top_k=50)
        old_ids = [
            d.id for d in old_docs
            if d.metadata.get("resume_id") == resume_id
        ]
        if old_ids:
            _store.delete(user_id, old_ids)

        return _store.add_documents(user_id, docs)

    def index_polish_suggestions(
        self,
        user_id: str,
        resume_id: str,
        suggestions: list[dict],
    ) -> List[str]:
        """将润色建议 embedding 入向量库，供后续润色时检索。"""
        docs: List[Document] = []
        for i, sug in enumerate(suggestions):
            text = f"原文: {sug.get('original_text', '')} → 修改: {sug.get('revised_text', '')}"
            docs.append(Document(
                id=f"polish_{resume_id}_{i}",
                text=text,
                metadata={
                    "doc_type": "polish_suggestion",
                    "resume_id": resume_id,
                    "risk_level": sug.get("risk_level", "low"),
                },
            ))
        if not docs:
            return []
        return _store.add_documents(user_id, docs)


rag_service = RAGService()
