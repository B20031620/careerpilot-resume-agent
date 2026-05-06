from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class JobDescriptionCreate(BaseModel):
    title: str
    company_name: Optional[str] = None
    raw_text: str = ""


class JobDescriptionRead(BaseModel):
    id: str
    title: str
    company_name: Optional[str]
    raw_text: str
    job_profile_json: Optional[dict[str, Any]] = None
    analysis_status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobDescriptionListItem(BaseModel):
    id: str
    title: str
    company_name: Optional[str]
    analysis_status: str
    created_at: datetime

    model_config = {"from_attributes": True}
