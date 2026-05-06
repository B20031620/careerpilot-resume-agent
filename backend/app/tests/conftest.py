from __future__ import annotations

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from httpx import ASGITransport, AsyncClient

from app.db.base import Base
from app.api.deps import get_current_user_id, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite:///file::memory:?cache=shared&uri=true"

test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

TEST_USER_ID = str(uuid.uuid4())


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


def override_get_current_user_id():
    return TEST_USER_ID


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user_id] = override_get_current_user_id


@pytest.fixture(autouse=True)
def setup_db():
    import app.models.resume  # noqa: F401
    import app.models.job_description  # noqa: F401
    import app.models.report  # noqa: F401
    import app.models.interview  # noqa: F401
    import app.models.agent_run  # noqa: F401
    import app.models.user  # noqa: F401
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    # Create test user
    from app.models.user import User
    from app.core.security import hash_password
    db = TestSessionLocal()
    try:
        if not db.query(User).filter(User.id == TEST_USER_ID).first():
            user = User(
                id=TEST_USER_ID,
                email="test@careerpilot.local",
                display_name="Test User",
                password_hash=hash_password("test123"),
            )
            db.add(user)
            db.commit()
    finally:
        db.close()

    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
