import pytest


@pytest.mark.asyncio
async def test_create_job(client):
    response = await client.post("/api/jobs", json={
        "title": "高级AI工程师",
        "company_name": "字节跳动",
        "raw_text": "岗位要求：3年以上AI开发经验...",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "高级AI工程师"
    assert data["company_name"] == "字节跳动"
    assert data["analysis_status"] == "pending"


@pytest.mark.asyncio
async def test_list_jobs(client):
    await client.post("/api/jobs", json={"title": "JD_A", "raw_text": "内容A"})
    await client.post("/api/jobs", json={"title": "JD_B", "company_name": "腾讯", "raw_text": "内容B"})
    response = await client.get("/api/jobs")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_get_job(client):
    create = await client.post("/api/jobs", json={"title": "产品经理", "raw_text": "JD内容"})
    job_id = create.json()["id"]
    response = await client.get(f"/api/jobs/{job_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "产品经理"


@pytest.mark.asyncio
async def test_get_job_not_found(client):
    response = await client.get("/api/jobs/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_job(client):
    create = await client.post("/api/jobs", json={"title": "待删除JD", "raw_text": "内容"})
    job_id = create.json()["id"]

    response = await client.delete(f"/api/jobs/{job_id}")
    assert response.status_code == 204

    list_resp = await client.get("/api/jobs")
    assert all(r["id"] != job_id for r in list_resp.json())

    get_resp = await client.get(f"/api/jobs/{job_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_create_job_without_company(client):
    response = await client.post("/api/jobs", json={"title": "匿名岗位", "raw_text": "内容"})
    assert response.status_code == 201
    assert response.json()["company_name"] is None
