import pytest


@pytest.mark.asyncio
async def test_create_resume(client):
    response = await client.post("/api/resumes", json={
        "title": "前端工程师_张三",
        "source_type": "text",
        "raw_text": "张三，前端工程师，3年经验",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "前端工程师_张三"
    assert data["source_type"] == "text"
    assert data["parse_status"] == "pending"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_resumes(client):
    await client.post("/api/resumes", json={"title": "简历A", "raw_text": "内容A"})
    await client.post("/api/resumes", json={"title": "简历B", "raw_text": "内容B"})
    response = await client.get("/api/resumes")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] in ["简历A", "简历B"]


@pytest.mark.asyncio
async def test_get_resume(client):
    create = await client.post("/api/resumes", json={"title": "测试简历", "raw_text": "测试内容"})
    resume_id = create.json()["id"]
    response = await client.get(f"/api/resumes/{resume_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "测试简历"
    assert response.json()["raw_text"] == "测试内容"


@pytest.mark.asyncio
async def test_get_resume_not_found(client):
    response = await client.get("/api/resumes/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_resume(client):
    create = await client.post("/api/resumes", json={"title": "待删除", "raw_text": "内容"})
    resume_id = create.json()["id"]

    response = await client.delete(f"/api/resumes/{resume_id}")
    assert response.status_code == 204

    # Deleted resumes should not appear in list
    list_resp = await client.get("/api/resumes")
    assert all(r["id"] != resume_id for r in list_resp.json())

    # Direct get should 404
    get_resp = await client.get(f"/api/resumes/{resume_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_resume_not_found(client):
    response = await client.delete("/api/resumes/nonexistent-id")
    assert response.status_code == 404
