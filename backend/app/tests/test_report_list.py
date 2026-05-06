import pytest

from app.models.report import Report
from app.tests.conftest import TEST_USER_ID, TestSessionLocal


@pytest.mark.asyncio
async def test_list_reports_empty(client):
    response = await client.get("/api/reports")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_reports(client):
    db = TestSessionLocal()
    db.add(Report(id="r1", user_id=TEST_USER_ID, report_type="match", overall_score=82, resume_id="res1", jd_id="jd1"))
    db.add(Report(id="r2", user_id=TEST_USER_ID, report_type="interview", overall_score=76, resume_id="res2"))
    db.commit()
    db.close()

    response = await client.get("/api/reports")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_get_report(client):
    db = TestSessionLocal()
    db.add(Report(id="r1", user_id=TEST_USER_ID, report_type="match", overall_score=85, resume_id="res1", jd_id="jd1",
                  skill_score=88, project_score=80, experience_score=82, expression_score=90))
    db.commit()
    db.close()

    response = await client.get("/api/reports/r1")
    assert response.status_code == 200
    data = response.json()
    assert data["overall_score"] == 85
    assert data["skill_score"] == 88


@pytest.mark.asyncio
async def test_get_report_not_found(client):
    response = await client.get("/api/reports/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_report(client):
    db = TestSessionLocal()
    db.add(Report(id="r1", user_id=TEST_USER_ID, report_type="match", overall_score=80))
    db.commit()
    db.close()

    response = await client.delete("/api/reports/r1")
    assert response.status_code == 204

    get_resp = await client.get("/api/reports/r1")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_report_not_found(client):
    response = await client.delete("/api/reports/nonexistent-id")
    assert response.status_code == 404
