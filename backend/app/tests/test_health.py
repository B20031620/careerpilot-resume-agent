import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_model_status(client):
    response = await client.get("/api/settings/model-status")
    assert response.status_code == 200
    data = response.json()
    assert "provider" in data
    assert "model" in data
    assert "api_key_configured" in data
    assert isinstance(data["api_key_configured"], bool)


@pytest.mark.asyncio
async def test_model_status_configuration_shape(client):
    response = await client.get("/api/settings/model-status")
    data = response.json()
    if data["api_key_configured"]:
        assert data["api_key_masked"].startswith("sk-****")
        assert data["error"] is None
    else:
        assert data["api_key_masked"] is None
        assert data["error"] is not None


@pytest.mark.asyncio
async def test_model_connection_without_key_returns_controlled_error(client):
    response = await client.post("/api/settings/test-model-connection")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "DEEPSEEK_API_KEY" in data["message"]
