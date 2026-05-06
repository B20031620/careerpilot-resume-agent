from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ResumeCreate(BaseModel):
    title: str
    source_type: str = "text"
    raw_text: str = ""


class ResumeRead(BaseModel):
    id: str
    title: str
    source_type: str
    raw_text: str
    structured_json: Optional[dict[str, Any]] = None
    parse_status: str
    parse_warnings: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResumeListItem(BaseModel):
    id: str
    title: str
    source_type: str
    parse_status: str
    created_at: datetime

    model_config = {"from_attributes": True}
