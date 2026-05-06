from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, func, Integer, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resume_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    jd_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    report_type: Mapped[str] = mapped_column(String(30), default="match")
    overall_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    skill_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    project_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    experience_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    expression_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    strengths_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    weaknesses_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    missing_keywords_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    suggestions_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    report_markdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    agent_run_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
