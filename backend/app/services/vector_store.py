from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import chromadb

from app.services.embedding import embed_query, embed_texts

logger = logging.getLogger(__name__)

_CHROMA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data", "chroma",
)

_client: Optional[chromadb.ClientAPI] = None


def _get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        os.makedirs(_CHROMA_DIR, exist_ok=True)
        _client = chromadb.PersistentClient(path=_CHROMA_DIR)
    return _client


def _collection_name(user_id: str) -> str:
    return f"user_{user_id}"


class Document:
    __slots__ = ("id", "text", "metadata")

    def __init__(self, id: str, text: str, metadata: Optional[Dict[str, Any]] = None):
        self.id = id
        self.text = text
        self.metadata = metadata or {}


class VectorStore:
    def add_documents(self, user_id: str, docs: List[Document]) -> List[str]:
        """Add documents to user's collection. Returns list of doc IDs."""
        client = _get_client()
        collection = client.get_or_create_collection(
            name=_collection_name(user_id),
            metadata={"hnsw:space": "cosine"},
        )
        if not docs:
            return []

        texts = [d.text for d in docs]
        ids = [d.id for d in docs]
        metadatas = [d.metadata for d in docs]
        embeddings = embed_texts(texts)

        collection.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
        logger.info("Added %d docs to collection %s", len(docs), _collection_name(user_id))
        return ids

    def query(
        self,
        user_id: str,
        query_text: str,
        top_k: int = 3,
        filter: Optional[Dict[str, Any]] = None,
    ) -> List[Document]:
        """Query user's collection. Returns top-k matching documents."""
        client = _get_client()
        try:
            collection = client.get_collection(name=_collection_name(user_id))
        except Exception:
            return []

        query_embedding = embed_query(query_text)
        kwargs: Dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": top_k,
        }
        if filter:
            kwargs["where"] = filter

        results = collection.query(**kwargs)
        if not results["ids"] or not results["ids"][0]:
            return []

        docs = []
        for i, doc_id in enumerate(results["ids"][0]):
            text = results["documents"][0][i] if results["documents"] else ""
            metadata = results["metadatas"][0][i] if results["metadatas"] else {}
            docs.append(Document(id=doc_id, text=text, metadata=metadata))
        return docs

    def delete(self, user_id: str, doc_ids: List[str]) -> None:
        """Delete documents from user's collection."""
        client = _get_client()
        try:
            collection = client.get_collection(name=_collection_name(user_id))
            collection.delete(ids=doc_ids)
        except Exception:
            pass

    def delete_collection(self, user_id: str) -> None:
        """Delete entire user collection."""
        client = _get_client()
        try:
            client.delete_collection(name=_collection_name(user_id))
        except Exception:
            pass
