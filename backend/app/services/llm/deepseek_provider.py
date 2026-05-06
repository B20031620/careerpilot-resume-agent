from __future__ import annotations

from typing import Any

from openai import AsyncOpenAI

from app.core.config import settings


class DeepSeekProvider:
    def __init__(self, api_key: str, base_url: str, default_model: str):
        self.api_key = api_key
        self.base_url = base_url
        self.default_model = default_model
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url, timeout=30.0)
        return self._client

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.2,
        response_format: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        kwargs: dict[str, Any] = {
            "model": model or self.default_model,
            "messages": messages,
            "temperature": temperature,
        }
        if response_format:
            kwargs["response_format"] = response_format

        response = await self.client.chat.completions.create(**kwargs)
        return response.model_dump()

    async def test_connection(self) -> dict[str, Any]:
        if not self.api_key:
            return {
                "success": False,
                "message": "未配置 DEEPSEEK_API_KEY，请在 .env 文件中设置",
            }
        try:
            response = await self.client.chat.completions.create(
                model=self.default_model,
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=5,
                temperature=0,
            )
            return {
                "success": True,
                "message": f"连接成功，模型 {self.default_model} 可用",
                "model": response.model,
            }
        except Exception as e:
            error_msg = str(e)
            if "401" in error_msg:
                return {"success": False, "message": "API Key 无效或已过期"}
            if "404" in error_msg:
                return {"success": False, "message": f"模型 {self.default_model} 不可用，请检查模型名称"}
            if "timeout" in error_msg.lower():
                return {"success": False, "message": "连接超时，请检查网络或 BASE_URL"}
            return {"success": False, "message": f"连接失败: {error_msg[:100]}"}
