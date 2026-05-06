"""Test the real LLM path (non-USE_MOCK_LLM) by mocking the provider's chat_sync."""
from __future__ import annotations

import json
import os
from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.agents.resume_match.nodes import (
    MOCK_JOB_PROFILE,
    MOCK_MATCH_RESULT,
    MOCK_STRUCTURED_RESUME,
)


def _make_chat_sync_response(data: dict) -> dict:
    """Build a fake OpenAI chat completion response wrapping JSON data."""
    return {
        "choices": [
            {
                "message": {
                    "content": json.dumps(data, ensure_ascii=False),
                }
            }
        ]
    }


@pytest.fixture
def _mock_llm():
    """Patch create_llm_provider to return a mock with chat_sync."""
    mock_provider = MagicMock()

    call_count = 0

    def _chat_sync(messages, **kwargs):
        nonlocal call_count
        call_count += 1
        # First call = parse_resume, second = analyze_jd, third = score_match
        if call_count == 1:
            return _make_chat_sync_response(MOCK_STRUCTURED_RESUME)
        elif call_count == 2:
            return _make_chat_sync_response(MOCK_JOB_PROFILE)
        else:
            return _make_chat_sync_response(MOCK_MATCH_RESULT)

    mock_provider.chat_sync = _chat_sync
    with patch("app.agents.base.runtime.create_llm_provider", return_value=mock_provider):
        yield mock_provider


@pytest.mark.asyncio
async def test_real_llm_path_parses_json_and_generates_report(client, _mock_llm):
    """Verify the non-mock path can parse structured JSON and produce a report."""
    os.environ.pop("USE_MOCK_LLM", None)
    with patch("app.core.config.settings.DEEPSEEK_API_KEY", "sk-test-fake-key"):
        # Create resume
        resume_resp = await client.post("/api/resumes", json={
            "title": "AI工程师_李四",
            "raw_text": "李四，5年AI开发经验，精通Python、LangChain、FastAPI",
        })
        assert resume_resp.status_code == 201
        resume_id = resume_resp.json()["id"]

        # Create job
        job_resp = await client.post("/api/jobs", json={
            "title": "高级AI工程师",
            "company_name": "某AI公司",
            "raw_text": "要求：5年以上AI开发经验，熟悉LangChain/LangGraph",
        })
        assert job_resp.status_code == 201
        job_id = job_resp.json()["id"]

        # Run match (real LLM path, provider is mocked)
        match_resp = await client.post("/api/matches", json={
            "resume_id": resume_id,
            "job_id": job_id,
        })
        assert match_resp.status_code == 201
        data = match_resp.json()

        # Verify report structure
        assert "report_id" in data
        assert data["overall_score"] == 82
        assert data["skill_score"] == 85
        assert data["project_score"] == 80
        assert data["experience_score"] == 78
        assert data["expression_score"] == 86
        assert isinstance(data["strengths"], list)
        assert len(data["strengths"]) > 0
        assert isinstance(data["weaknesses"], list)
        assert len(data["weaknesses"]) > 0
        assert isinstance(data["missing_keywords"], list)
        assert isinstance(data["suggestions"], list)
        assert data["report_markdown"]
        assert data["resume_id"] == resume_id
        assert data["job_id"] == job_id


@pytest.mark.asyncio
async def test_real_llm_path_malformed_json_returns_error(client, _mock_llm):
    """Verify that malformed LLM JSON output is caught gracefully."""
    os.environ.pop("USE_MOCK_LLM", None)

    # Override chat_sync to return invalid JSON
    def _bad_chat_sync(messages, **kwargs):
        return {
            "choices": [{"message": {"content": "not valid json!!!"}}]
        }

    _mock_llm.chat_sync = _bad_chat_sync

    with patch("app.core.config.settings.DEEPSEEK_API_KEY", "sk-test-fake-key"):
        resume_resp = await client.post("/api/resumes", json={
            "title": "测试简历",
            "raw_text": "内容",
        })
        job_resp = await client.post("/api/jobs", json={
            "title": "测试岗位",
            "raw_text": "JD内容",
        })

        match_resp = await client.post("/api/matches", json={
            "resume_id": resume_resp.json()["id"],
            "job_id": job_resp.json()["id"],
        })
        # Should get 500 with error message about parse failure
        assert match_resp.status_code == 500
        assert "解析失败" in match_resp.json()["detail"] or "失败" in match_resp.json()["detail"]
