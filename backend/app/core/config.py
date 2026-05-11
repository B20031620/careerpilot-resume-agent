from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    LLM_PROVIDER: str = "deepseek"
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-v4-pro"
    JWT_SECRET: str = "careerpilot-dev-secret-change-in-production"
    LLM_TIMEOUT_SECONDS: int = 90
    LLM_MAX_RETRIES: int = 0
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_TRACING_V2: str = "false"
    LANGCHAIN_PROJECT: str = "careerpilot"
    DOUBAO_EMBEDDING_API_KEY: str = ""
    DOUBAO_EMBEDDING_MODEL: str = "Doubao-embedding"

    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()


def mask_api_key(key: str) -> str:
    if not key or len(key) < 8:
        return "sk-****"
    return f"sk-****{key[-4:]}"
