import pytest
import os
from io import BytesIO
from zipfile import ZipFile


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


def _make_docx_bytes(paragraphs: list[str]) -> bytes:
    body = "".join(
        f"<w:p><w:r><w:t>{paragraph}</w:t></w:r></w:p>"
        for paragraph in paragraphs
    )
    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body}</w:body>"
        "</w:document>"
    )
    output = BytesIO()
    with ZipFile(output, "w") as archive:
        archive.writestr("word/document.xml", document)
    return output.getvalue()


@pytest.mark.asyncio
async def test_upload_resume_txt(client):
    response = await client.post(
        "/api/resumes/upload",
        files={"file": ("resume.txt", "张三，AI 应用开发工程师".encode("utf-8"), "text/plain")},
        data={"title": "文本简历"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "文本简历"
    assert data["source_type"] == "txt"
    assert "AI 应用开发工程师" in data["raw_text"]


@pytest.mark.asyncio
async def test_upload_resume_is_idempotent_for_same_user_and_content(client):
    files = {"file": ("resume.txt", "同一份简历内容".encode("utf-8"), "text/plain")}
    first = await client.post("/api/resumes/upload", files=files, data={"title": "重复简历"})
    assert first.status_code == 201

    second = await client.post(
        "/api/resumes/upload",
        files={"file": ("resume.txt", "同一份简历内容".encode("utf-8"), "text/plain")},
        data={"title": "重复简历"},
    )
    assert second.status_code == 201
    assert second.json()["id"] == first.json()["id"]

    list_resp = await client.get("/api/resumes")
    rows = [r for r in list_resp.json() if r["title"] == "重复简历"]
    assert len(rows) == 1


@pytest.mark.asyncio
async def test_upload_resume_docx(client):
    response = await client.post(
        "/api/resumes/upload",
        files={
            "file": (
                "resume.docx",
                _make_docx_bytes(["张三", "LangGraph Agent 项目经验"]),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "resume"
    assert data["source_type"] == "docx"
    assert "张三" in data["raw_text"]
    assert "LangGraph Agent 项目经验" in data["raw_text"]


@pytest.mark.asyncio
async def test_parse_resume_mock_updates_structured_result(client):
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        create = await client.post("/api/resumes", json={
            "title": "待解析简历",
            "raw_text": "Python LangGraph FastAPI 项目经验",
        })
        resume_id = create.json()["id"]

        response = await client.post(f"/api/resumes/{resume_id}/parse")
        assert response.status_code == 200
        data = response.json()
        assert data["parse_status"] == "succeeded"
        assert data["structured_json"] is not None
        assert len(data["structured_json"]["skills"]) > 0
    finally:
        os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_upload_resume_unsupported_file(client):
    response = await client.post(
        "/api/resumes/upload",
        files={"file": ("resume.pdf", b"%PDF-not-really", "application/pdf")},
    )
    assert response.status_code == 415
    assert "支持" in response.json()["detail"]


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
