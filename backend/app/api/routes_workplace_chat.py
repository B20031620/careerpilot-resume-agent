from __future__ import annotations

import json
import logging
import re
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agents.base.runtime import RuntimeContext, PromptLoader
from app.api.deps import get_current_user_id, get_db
from app.models.workplace_chat import WorkplaceChatMessage, WorkplaceChatSession

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/workplace-chat", tags=["workplace-chat"])

SCENE_LABELS = {
    "reply_hr": "回复 HR",
    "salary_negotiation": "薪资谈判",
    "delay_explanation": "延期说明",
    "promotion_discussion": "晋升沟通",
    "resignation": "离职沟通",
    "feedback_response": "回应反馈",
    "other": "其他",
}

TONE_LABELS = {
    "professional": "专业",
    "polite": "礼貌",
    "firm": "坚定",
    "concise": "简洁",
}


class CreateSessionRequest(BaseModel):
    scene: str = "reply_hr"
    tone: str = "professional"
    context: Optional[str] = None


class SendMessageRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    meta_json: Optional[dict[str, Any]] = None
    created_at: str

    model_config = {"from_attributes": True}


class SessionResponse(BaseModel):
    id: str
    scene: str
    tone: str
    title: str
    status: str
    messages: list[ChatMessageResponse] = []
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


class SessionListItem(BaseModel):
    id: str
    scene: str
    tone: str
    title: str
    status: str
    created_at: str

    model_config = {"from_attributes": True}


def _session_to_response(session: WorkplaceChatSession, db: Session) -> SessionResponse:
    messages = (
        db.query(WorkplaceChatMessage)
        .filter(WorkplaceChatMessage.session_id == session.id)
        .order_by(WorkplaceChatMessage.created_at)
        .all()
    )
    return SessionResponse(
        id=session.id,
        scene=session.scene,
        tone=session.tone,
        title=session.title,
        status=session.status,
        messages=[
            ChatMessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                meta_json=m.meta_json,
                created_at=m.created_at.isoformat() if m.created_at else "",
            )
            for m in messages
        ],
        created_at=session.created_at.isoformat() if session.created_at else "",
        updated_at=session.updated_at.isoformat() if session.updated_at else "",
    )


def _build_conversation_section(session_id: str, db: Session) -> str:
    messages_q = (
        db.query(WorkplaceChatMessage)
        .filter(WorkplaceChatMessage.session_id == session_id)
        .order_by(WorkplaceChatMessage.created_at)
        .all()
    )
    lines = []
    for m in messages_q:
        if m.role == "user":
            lines.append(f"用户: {m.content}")
        elif m.role == "assistant":
            lines.append(f"顾问: {m.content}")
    if not lines:
        return ""
    return "## 对话历史\n" + "\n".join(lines[:-1])


def _build_prompt_messages(session: WorkplaceChatSession, user_message: str, db: Session) -> list[dict[str, str]]:
    conversation_section = _build_conversation_section(session.id, db)
    scene_label = SCENE_LABELS.get(session.scene, session.scene)
    tone_label = TONE_LABELS.get(session.tone, session.tone)

    # RAG: retrieve user's resume profile for identity-aware draft generation
    rag_context = ""
    if session.user_id:
        try:
            from app.services.rag_service import rag_service
            docs = rag_service.retrieve_for_workplace(session.user_id, scene=scene_label)
            if docs:
                rag_context = "\n## 用户背景信息（RAG检索）\n" + "\n\n".join(d.text for d in docs[:3])
        except Exception:
            pass

    loader = PromptLoader()
    messages = loader.render_messages(
        "workplace_chat", "v1",
        scene_label=scene_label,
        tone_label=tone_label,
        conversation_section=conversation_section,
        user_message=user_message,
    )

    # Inject RAG context into the last user message
    if rag_context:
        messages[-1]["content"] += rag_context

    return messages


def _parse_meta_from_content(content: str) -> tuple[str, Optional[dict]]:
    """Extract draft_text and pitfalls from streamed content markers."""
    meta: dict[str, Any] = {}

    # Extract draft
    draft_match = re.search(r'<<<DRAFT>>>(.*?)<<<END_DRAFT>>>', content, re.DOTALL)
    if draft_match:
        meta["draft_text"] = draft_match.group(1).strip()

    # Extract pitfalls
    pitfall_matches = re.findall(r'<<<PITFALL>>>(.*?)<<<END_PITFALL>>>', content, re.DOTALL)
    if pitfall_matches:
        meta["pitfalls"] = [p.strip() for p in pitfall_matches]

    return content, (meta if meta else None)


@router.get("", response_model=list[SessionListItem])
def list_sessions(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    rows = (
        db.query(WorkplaceChatSession)
        .filter(WorkplaceChatSession.user_id == user_id)
        .order_by(WorkplaceChatSession.created_at.desc())
        .all()
    )
    return [
        SessionListItem(
            id=s.id,
            scene=s.scene,
            tone=s.tone,
            title=s.title,
            status=s.status,
            created_at=s.created_at.isoformat() if s.created_at else "",
        )
        for s in rows
    ]


@router.post("", response_model=SessionResponse, status_code=201)
def create_session(
    body: CreateSessionRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Create session + save user message immediately. AI response comes via streaming."""
    scene_label = SCENE_LABELS.get(body.scene, body.scene)
    context_text = body.context.strip() if body.context else ""

    session = WorkplaceChatSession(
        user_id=user_id,
        scene=body.scene,
        tone=body.tone,
        title=context_text[:50] if context_text else scene_label,
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Build and save initial user message
    initial_prompt = f"我想咨询关于「{scene_label}」的沟通建议。"
    if context_text:
        initial_prompt += f"\n具体情况：{context_text}"

    user_msg = WorkplaceChatMessage(
        session_id=session.id,
        role="user",
        content=initial_prompt,
    )
    db.add(user_msg)
    db.commit()

    return _session_to_response(session, db)


@router.post("/{session_id}/stream")
def stream_message(
    session_id: str,
    body: SendMessageRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Stream AI response via SSE. Saves user msg + AI msg after streaming completes."""
    session = db.query(WorkplaceChatSession).filter(
        WorkplaceChatSession.id == session_id, WorkplaceChatSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not body.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")

    # Save user message
    user_msg = WorkplaceChatMessage(
        session_id=session.id,
        role="user",
        content=body.message.strip(),
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    from app.core.config import settings
    if not settings.DEEPSEEK_API_KEY:
        fallback = "你好！我是你的职场沟通顾问。请告诉我你具体遇到了什么沟通场景，我会帮你分析策略并生成可以直接使用的回复文本。"
        ai_msg = WorkplaceChatMessage(
            session_id=session.id,
            role="assistant",
            content=fallback,
        )
        db.add(ai_msg)
        db.commit()

        def fallback_stream():
            import uuid
            msg_id = str(uuid.uuid4())
            yield f"event: meta\ndata: {json.dumps({'msg_id': msg_id})}\n\n"
            for char in fallback:
                yield f"event: token\ndata: {json.dumps({'content': char})}\n\n"
            yield "event: done\ndata: {}\n\n"
        return StreamingResponse(fallback_stream(), media_type="text/event-stream")

    # Build prompt
    prompt_messages = _build_prompt_messages(session, body.message.strip(), db)

    runtime = RuntimeContext()
    provider = runtime.llm_provider
    if not provider:
        raise HTTPException(status_code=503, detail="LLM 服务不可用")

    import uuid
    msg_id = str(uuid.uuid4())

    def generate():
        full_content = []
        try:
            for token in provider.chat_stream_sync(
                prompt_messages,
                temperature=0.4,
                max_tokens=2048,
            ):
                full_content.append(token)
                yield f"event: token\ndata: {json.dumps({'content': token})}\n\n"
        except Exception as e:
            logger.error("stream_message LLM error: %s", e)
            yield f"event: error\ndata: {json.dumps({'error': str(e)[:200]})}\n\n"
            return

        # Save complete AI message
        content = "".join(full_content)
        _, meta = _parse_meta_from_content(content)
        ai_msg = WorkplaceChatMessage(
            session_id=session.id,
            role="assistant",
            content=content,
            meta_json=meta,
        )
        db.add(ai_msg)
        db.commit()
        db.refresh(ai_msg)

        yield f"event: done\ndata: {json.dumps({'msg_id': ai_msg.id, 'meta_json': meta})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/{session_id}/init-stream")
def stream_initial(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Stream the initial AI greeting for a newly created session."""
    session = db.query(WorkplaceChatSession).filter(
        WorkplaceChatSession.id == session_id, WorkplaceChatSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    from app.core.config import settings
    if not settings.DEEPSEEK_API_KEY:
        fallback = "你好！我是你的职场沟通顾问。请告诉我你具体遇到了什么沟通场景，我会帮你分析策略并生成可以直接使用的回复文本。"
        ai_msg = WorkplaceChatMessage(
            session_id=session.id,
            role="assistant",
            content=fallback,
        )
        db.add(ai_msg)
        db.commit()

        def fallback_stream():
            import uuid
            msg_id = str(uuid.uuid4())
            yield f"event: meta\ndata: {json.dumps({'msg_id': msg_id})}\n\n"
            for char in fallback:
                yield f"event: token\ndata: {json.dumps({'content': char})}\n\n"
            yield "event: done\ndata: {}\n\n"
        return StreamingResponse(fallback_stream(), media_type="text/event-stream")

    # Get the first user message
    first_user_msg = (
        db.query(WorkplaceChatMessage)
        .filter(WorkplaceChatMessage.session_id == session.id, WorkplaceChatMessage.role == "user")
        .order_by(WorkplaceChatMessage.created_at)
        .first()
    )
    user_content = first_user_msg.content if first_user_msg else ""

    prompt_messages = _build_prompt_messages(session, user_content, db)

    runtime = RuntimeContext()
    provider = runtime.llm_provider
    if not provider:
        raise HTTPException(status_code=503, detail="LLM 服务不可用")

    import uuid
    msg_id = str(uuid.uuid4())

    def generate():
        full_content = []
        try:
            for token in provider.chat_stream_sync(
                prompt_messages,
                temperature=0.4,
                max_tokens=2048,
            ):
                full_content.append(token)
                yield f"event: token\ndata: {json.dumps({'content': token})}\n\n"
        except Exception as e:
            logger.error("stream_initial LLM error: %s", e)
            yield f"event: error\ndata: {json.dumps({'error': str(e)[:200]})}\n\n"
            return

        content = "".join(full_content)
        _, meta = _parse_meta_from_content(content)
        ai_msg = WorkplaceChatMessage(
            session_id=session.id,
            role="assistant",
            content=content,
            meta_json=meta,
        )
        db.add(ai_msg)
        db.commit()
        db.refresh(ai_msg)

        yield f"event: done\ndata: {json.dumps({'msg_id': ai_msg.id, 'meta_json': meta})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/{session_id}", response_model=SessionResponse)
def get_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    session = db.query(WorkplaceChatSession).filter(
        WorkplaceChatSession.id == session_id, WorkplaceChatSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return _session_to_response(session, db)


@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    session = db.query(WorkplaceChatSession).filter(
        WorkplaceChatSession.id == session_id, WorkplaceChatSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.query(WorkplaceChatMessage).filter(WorkplaceChatMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()
