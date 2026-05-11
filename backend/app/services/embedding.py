from __future__ import annotations

import logging
from typing import List

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_DOUBAO_EMBEDDING_URL = "https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal"


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a batch of texts. Calls API once per text (Doubao multimodal endpoint
    produces one embedding per request, so no batching)."""
    return [embed_query(t) for t in texts]


def embed_query(text: str) -> List[float]:
    """Embed a single query text via Doubao embedding API."""
    body = {
        "model": settings.DOUBAO_EMBEDDING_MODEL,
        "input": [{"type": "text", "text": text}],
    }
    headers = {
        "Authorization": f"Bearer {settings.DOUBAO_EMBEDDING_API_KEY}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=30.0) as client:
        resp = client.post(_DOUBAO_EMBEDDING_URL, json=body, headers=headers)
        resp.raise_for_status()
        return resp.json()["data"]["embedding"]
