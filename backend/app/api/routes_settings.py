from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import mask_api_key, settings
from app.services.llm.factory import create_llm_provider

router = APIRouter(prefix="/api/settings")


@router.get("/model-status")
async def model_status():
    api_key_configured = bool(settings.DEEPSEEK_API_KEY)
    return {
        "provider": settings.LLM_PROVIDER,
        "model": settings.DEEPSEEK_MODEL,
        "base_url": settings.DEEPSEEK_BASE_URL,
        "api_key_configured": api_key_configured,
        "api_key_masked": mask_api_key(settings.DEEPSEEK_API_KEY) if api_key_configured else None,
        "connected": None,
        "last_checked": None,
        "error": None if api_key_configured else "未配置 DEEPSEEK_API_KEY",
    }


@router.post("/test-model-connection")
async def test_model_connection():
    provider = create_llm_provider()
    result = await provider.test_connection()
    return {
        "success": result["success"],
        "message": result["message"],
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
