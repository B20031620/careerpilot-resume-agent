from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, func, Integer, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    resume_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    jd_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    interview_type: Mapped[str] = mapped_column(String(30), default="technical_1")
    status: Mapped[str] = mapped_column(String(20), default="active")
    question_count_target: Mapped[int] = mapped_column(Integer, default=5)
    current_question_index: Mapped[int] = mapped_column(Integer, default=0)
    final_report_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    final_report_markdown: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    agent_thread_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class InterviewTurn(Base):
    __tablename__ = "interview_turns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("interview_sessions.id"), nullable=False, index=True)
    turn_index: Mapped[int] = mapped_column(Integer, nullable=False)
    question: Mapped[str] = mapped_column(Text, default="")
    question_type: Mapped[str] = mapped_column(String(20), default="skill")
    user_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evaluation_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    follow_up_needed: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_turn_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
