from app.core.config import settings
from app.services.llm.deepseek_provider import DeepSeekProvider


def create_llm_provider():
    provider = settings.LLM_PROVIDER.lower()
    if provider == "deepseek":
        return DeepSeekProvider(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL,
            default_model=settings.DEEPSEEK_MODEL,
        )
    raise ValueError(f"Unsupported LLM provider: {provider}")
