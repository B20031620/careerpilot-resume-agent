import os
import uuid
from unittest.mock import patch

import pytest

from app.models.job_description import JobDescription
from app.models.resume import Resume
from app.tests.conftest import TestSessionLocal


@pytest.mark.asyncio
async def test_create_match_mock(client):
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        # Create a resume
        resume_resp = await client.post("/api/resumes", json={
            "title": "前端工程师_张三",
            "raw_text": "张三，3年前端开发经验，熟悉React和TypeScript",
        })
        assert resume_resp.status_code == 201
        resume_id = resume_resp.json()["id"]

        # Create a job
        job_resp = await client.post("/api/jobs", json={
            "title": "高级AI工程师",
            "company_name": "字节跳动",
            "raw_text": "岗位要求：3年以上AI开发经验，熟悉LangChain",
        })
        assert job_resp.status_code == 201
        job_id = job_resp.json()["id"]

        # Create match
        match_resp = await client.post("/api/matches", json={
            "resume_id": resume_id,
            "job_id": job_id,
        })
        assert match_resp.status_code == 201
        data = match_resp.json()
        assert "report_id" in data
        assert data["overall_score"] > 0
        assert data["skill_score"] > 0
        assert data["project_score"] > 0
        assert data["experience_score"] > 0
        assert data["expression_score"] > 0
        assert isinstance(data["strengths"], list)
        assert isinstance(data["weaknesses"], list)
        assert isinstance(data["missing_keywords"], list)
        assert isinstance(data["suggestions"], list)
        assert data["report_markdown"]
        assert data["resume_id"] == resume_id
        assert data["job_id"] == job_id
    finally:
        os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_get_match_report(client):
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        resume_resp = await client.post("/api/resumes", json={"title": "测试简历", "raw_text": "测试内容"})
        job_resp = await client.post("/api/jobs", json={"title": "测试岗位", "raw_text": "JD内容"})

        match_resp = await client.post("/api/matches", json={
            "resume_id": resume_resp.json()["id"],
            "job_id": job_resp.json()["id"],
        })
        report_id = match_resp.json()["report_id"]

        # Get the report
        get_resp = await client.get(f"/api/matches/{report_id}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["report_id"] == report_id
        assert data["overall_score"] > 0
        assert "核心优势" in data["report_markdown"]
    finally:
        os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_get_match_not_found(client):
    resp = await client.get("/api/matches/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_match_without_key_returns_controlled_error(client):
    os.environ["USE_MOCK_LLM"] = "false"
    with patch("app.core.config.settings.DEEPSEEK_API_KEY", ""):
        resume_resp = await client.post("/api/resumes", json={"title": "测试", "raw_text": "内容"})
        job_resp = await client.post("/api/jobs", json={"title": "岗位", "raw_text": "JD"})

        match_resp = await client.post("/api/matches", json={
            "resume_id": resume_resp.json()["id"],
            "job_id": job_resp.json()["id"],
        })
        assert match_resp.status_code == 422
        detail = match_resp.json()["detail"]
        assert "未配置" in detail or "DEEPSEEK_API_KEY" in detail
        reports_resp = await client.get("/api/reports")
        assert reports_resp.json() == []
    os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_match_resume_not_found(client):
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        match_resp = await client.post("/api/matches", json={
            "resume_id": "nonexistent-resume",
            "job_id": "nonexistent-job",
        })
        assert match_resp.status_code == 404
        reports_resp = await client.get("/api/reports")
        assert reports_resp.json() == []
    finally:
        os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_match_rejects_other_users_resume_and_job(client):
    other_user_id = str(uuid.uuid4())
    db = TestSessionLocal()
    try:
        other_resume = Resume(
            id=str(uuid.uuid4()),
            user_id=other_user_id,
            title="别人的简历",
            raw_text="敏感简历内容",
        )
        other_job = JobDescription(
            id=str(uuid.uuid4()),
            user_id=other_user_id,
            title="别人的岗位",
            raw_text="敏感JD内容",
        )
        db.add_all([other_resume, other_job])
        db.commit()

        resp = await client.post("/api/matches", json={
            "resume_id": other_resume.id,
            "job_id": other_job.id,
        })
        assert resp.status_code == 404
        reports_resp = await client.get("/api/reports")
        assert reports_resp.json() == []
    finally:
        db.close()
