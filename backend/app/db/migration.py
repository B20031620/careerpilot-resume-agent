"""Safe schema migration for SQLite + create_all without Alembic.

Adds user_id columns to existing tables if they don't exist,
and creates a default anonymous user for backward compatibility.
"""
from __future__ import annotations

import uuid
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def _column_exists(engine: Engine, table: str, column: str) -> bool:
    insp = inspect(engine)
    cols = {c["name"] for c in insp.get_columns(table)}
    return column in cols


def _table_exists(engine: Engine, table: str) -> bool:
    insp = inspect(engine)
    return table in insp.get_table_names()


def run_migrations(engine: Engine) -> None:
    """Run safe, idempotent migrations."""
    with engine.connect() as conn:
        # Add user_id columns if missing
        for table in ["resumes", "job_descriptions", "reports", "interview_sessions", "agent_runs"]:
            if _table_exists(engine, table) and not _column_exists(engine, table, "user_id"):
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN user_id VARCHAR(36)"))
                conn.commit()

        # Create default demo user and attach legacy rows to it so existing
        # local demo data remains visible after auth is introduced.
        if _table_exists(engine, "users"):
            demo = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": "demo@careerpilot.local"}).first()
            if demo:
                default_id = demo[0]
            else:
                default_id = str(uuid.uuid4())
                from app.core.security import hash_password
                pwd = hash_password("demo123456")
                conn.execute(
                    text("INSERT INTO users (id, email, display_name, password_hash) VALUES (:id, :email, :name, :pwd)"),
                    {"id": default_id, "email": "demo@careerpilot.local", "name": "Demo User", "pwd": pwd},
                )
                conn.commit()
                print(f"[migration] Created default user: demo@careerpilot.local / demo123456")

            for table in ["resumes", "job_descriptions", "reports", "interview_sessions", "agent_runs"]:
                if _table_exists(engine, table) and _column_exists(engine, table, "user_id"):
                    conn.execute(
                        text(f"UPDATE {table} SET user_id = :user_id WHERE user_id IS NULL OR user_id = ''"),
                        {"user_id": default_id},
                    )
            conn.commit()
