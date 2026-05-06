from __future__ import annotations

from typing import Any, Protocol


class LLMProvider(Protocol):
    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.2,
        response_format: dict[str, Any] | None = None,
    ) -> dict[str, Any]: ...

    async def test_connection(self) -> dict[str, Any]: ...
