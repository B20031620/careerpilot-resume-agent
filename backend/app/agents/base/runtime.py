from __future__ import annotations

import os
from typing import Any, Callable, Optional

from app.db.session import SessionLocal
from app.services.llm.factory import create_llm_provider


class RuntimeContext:
    """Shared runtime context passed to agent graph nodes."""

    def __init__(self, use_mock: bool = False, db_session_factory: Optional[Callable] = None):
        self.use_mock = use_mock
        self._llm_provider = None
        self._db_session_factory = db_session_factory or SessionLocal

    @property
    def llm_provider(self):
        from app.core.config import settings
        if not settings.DEEPSEEK_API_KEY:
            return None
        if self._llm_provider is None and not self.use_mock:
            self._llm_provider = create_llm_provider()
        return self._llm_provider

    def get_db(self):
        return self._db_session_factory()


class PromptLoader:
    """Load prompt YAML files from backend/app/prompts/."""

    def __init__(self):
        self._prompts_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "prompts")

    def load(self, name: str, version: str = "v1") -> dict[str, Any]:
        import yaml

        path = os.path.join(self._prompts_dir, name, f"{version}.yaml")
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data

    def render_messages(self, name: str, version: str = "v1", **kwargs) -> list[dict[str, str]]:
        prompt = self.load(name, version)
        system_text = prompt.get("system", "")
        user_template = prompt.get("user_template", "")
        for key, value in kwargs.items():
            user_template = user_template.replace(f"{{{{ {key} }}}}", str(value))
        messages = []
        if system_text:
            messages.append({"role": "system", "content": system_text})
        messages.append({"role": "user", "content": user_template})
        return messages
