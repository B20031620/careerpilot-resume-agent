import uuid

import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    email = f"user-{uuid.uuid4()}@example.com"
    register_resp = await client.post("/api/auth/register", json={
        "email": email,
        "password": "secret123456",
        "display_name": "新用户",
    })
    assert register_resp.status_code == 201
    data = register_resp.json()
    assert data["email"] == email
    assert data["display_name"] == "新用户"
    assert data["token"]

    login_resp = await client.post("/api/auth/login", json={
        "email": email,
        "password": "secret123456",
    })
    assert login_resp.status_code == 200
    assert login_resp.json()["user_id"] == data["user_id"]
    assert login_resp.json()["token"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    email = f"user-{uuid.uuid4()}@example.com"
    first = await client.post("/api/auth/register", json={
        "email": email,
        "password": "secret123456",
    })
    assert first.status_code == 201

    duplicate = await client.post("/api/auth/register", json={
        "email": email,
        "password": "another123456",
    })
    assert duplicate.status_code == 409


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    email = f"user-{uuid.uuid4()}@example.com"
    await client.post("/api/auth/register", json={
        "email": email,
        "password": "secret123456",
    })

    login_resp = await client.post("/api/auth/login", json={
        "email": email,
        "password": "wrong-password",
    })
    assert login_resp.status_code == 401
