from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_auth import router as auth_router
from app.api.routes_health import router as health_router
from app.api.routes_interviews import router as interviews_router
from app.api.routes_jobs import router as jobs_router
from app.api.routes_matches import router as matches_router
from app.api.routes_reports import router as reports_router
from app.api.routes_resumes import router as resumes_router
from app.api.routes_settings import router as settings_router
from app.db.base import Base
from app.db.migration import run_migrations
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    import app.models.resume  # noqa: F401
    import app.models.job_description  # noqa: F401
    import app.models.report  # noqa: F401
    import app.models.interview  # noqa: F401
    import app.models.agent_run  # noqa: F401
    import app.models.user  # noqa: F401
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
    yield


app = FastAPI(title="CareerPilot Resume Agent", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(settings_router)
app.include_router(auth_router)
app.include_router(resumes_router)
app.include_router(jobs_router)
app.include_router(reports_router)
app.include_router(matches_router)
app.include_router(interviews_router)
