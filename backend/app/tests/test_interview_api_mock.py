import os

import pytest


@pytest.mark.asyncio
async def test_create_interview_session(client):
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        resp = await client.post("/api/interviews", json={
            "interview_type": "technical_1",
            "question_count_target": 3,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "id" in data
        assert data["status"] == "active"
        assert data["interview_type"] == "technical_1"
        assert data["question_count_target"] == 3
        assert data["current_question_index"] == 0
        assert len(data["turns"]) > 0
        assert data["current_question"]
        assert data["current_question"] == "请做个简单的自我介绍，重点说说你最近一段工作经历中的角色。"
        assert data["current_question_type"]
    finally:
        os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_create_interview_with_resume_and_jd(client):
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        resume_resp = await client.post("/api/resumes", json={
            "title": "测试简历",
            "raw_text": "测试内容",
        })
        job_resp = await client.post("/api/jobs", json={
            "title": "测试岗位",
            "raw_text": "JD内容",
        })

        resp = await client.post("/api/interviews", json={
            "resume_id": resume_resp.json()["id"],
            "jd_id": job_resp.json()["id"],
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["resume_id"] == resume_resp.json()["id"]
        assert data["jd_id"] == job_resp.json()["id"]
        assert len(data["turns"]) == 1
        assert data["turns"][0]["question_type"] in ("behavioral", "technical", "project_deep_dive", "system_design")
    finally:
        os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_get_interview_session(client):
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        create_resp = await client.post("/api/interviews", json={})
        session_id = create_resp.json()["id"]

        resp = await client.get(f"/api/interviews/{session_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == session_id
        assert data["status"] == "active"
    finally:
        os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_get_interview_not_found(client):
    resp = await client.get("/api/interviews/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_submit_answer(client):
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        create_resp = await client.post("/api/interviews", json={
            "question_count_target": 3,
        })
        session_id = create_resp.json()["id"]
        initial_data = create_resp.json()
        assert initial_data["current_question_index"] == 0

        answer_resp = await client.post(f"/api/interviews/{session_id}/answer", json={
            "answer": "我在AI项目中负责对话引擎架构，使用LangGraph编排了多Agent工作流",
        })
        assert answer_resp.status_code == 200
        data = answer_resp.json()

        # Should have at least 1 evaluated turn
        evaluated = [t for t in data["turns"] if t["evaluation_json"] is not None]
        assert len(evaluated) >= 1
        first_eval = evaluated[0]
        assert first_eval["score"] is not None
        assert first_eval["score"] > 0
        assert len(first_eval["evaluation_json"]["strengths"]) > 0
        assert len(first_eval["evaluation_json"]["improvements"]) > 0
        assert data["current_question_index"] == 1
        assert data["current_question"] == "在你主导的AI项目中，最大的技术挑战是什么？你是如何解决的？"
        assert data["turns"][-1]["question"] == data["current_question"]
    finally:
        os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_finish_interview(client):
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        create_resp = await client.post("/api/interviews", json={
            "question_count_target": 2,
        })
        session_id = create_resp.json()["id"]

        # Answer first question
        await client.post(f"/api/interviews/{session_id}/answer", json={
            "answer": "第一题回答",
        })
        # Answer second question (first answer advances to next)
        get2 = await client.get(f"/api/interviews/{session_id}")
        if get2.json()["current_question"] and get2.json()["status"] == "active":
            await client.post(f"/api/interviews/{session_id}/answer", json={
                "answer": "第二题回答",
            })

        finish_resp = await client.post(f"/api/interviews/{session_id}/finish")
        assert finish_resp.status_code == 200
        data = finish_resp.json()
        assert data["status"] == "finished"
        assert data["final_report_json"] is not None
        assert data["final_report_markdown"] is not None
        assert data["final_report_json"]["average_score"] > 0
        assert data["final_report_json"]["total_turns"] > 0
        assert "综合评分" in data["final_report_markdown"]
    finally:
        os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_interview_without_key_returns_controlled_error(client):
    os.environ.pop("USE_MOCK_LLM", None)
    try:
        resume_resp = await client.post("/api/resumes", json={
            "title": "测试简历", "raw_text": "内容",
        })
        resp = await client.post("/api/interviews", json={
            "resume_id": resume_resp.json()["id"],
        })
        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert "未配置" in detail or "DEEPSEEK_API_KEY" in detail
    finally:
        pass


@pytest.mark.asyncio
async def test_submit_answer_session_not_found(client):
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        resp = await client.post("/api/interviews/not-an-id/answer", json={
            "answer": "test",
        })
        assert resp.status_code == 404
    finally:
        os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_finish_already_finished(client):
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        create_resp = await client.post("/api/interviews", json={
            "question_count_target": 1,
        })
        session_id = create_resp.json()["id"]

        # Answer then finish
        await client.post(f"/api/interviews/{session_id}/answer", json={"answer": "回答"})
        await client.post(f"/api/interviews/{session_id}/finish")

        # Try finishing again
        resp2 = await client.post(f"/api/interviews/{session_id}/finish")
        assert resp2.status_code == 400
    finally:
        os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_interview_stops_after_target_questions(client):
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        create_resp = await client.post("/api/interviews", json={
            "question_count_target": 2,
        })
        session_id = create_resp.json()["id"]

        first_answer = await client.post(f"/api/interviews/{session_id}/answer", json={"answer": "第一题回答"})
        assert first_answer.status_code == 200
        assert first_answer.json()["current_question_index"] == 1
        assert first_answer.json()["current_question"] == "在你主导的AI项目中，最大的技术挑战是什么？你是如何解决的？"

        second_answer = await client.post(f"/api/interviews/{session_id}/answer", json={"answer": "第二题回答"})
        assert second_answer.status_code == 200
        data = second_answer.json()
        assert data["current_question_index"] == 2
        assert data["current_question"] is None
        assert len([t for t in data["turns"] if t["evaluation_json"] is not None]) == 2
        assert len(data["turns"]) == 2
    finally:
        os.environ.pop("USE_MOCK_LLM", None)
