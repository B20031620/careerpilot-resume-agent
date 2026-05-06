from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents.mock_interview.graph import run_answer, run_init, run_finish
from app.agents.mock_interview.schemas import InterviewAnswerRequest, InterviewSessionResponse, InterviewTurnResponse
from app.api.deps import get_current_user_id, get_db
from app.models.interview import InterviewSession, InterviewTurn
from app.models.job_description import JobDescription
from app.models.resume import Resume

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


def _session_to_response(session: InterviewSession, db: Session) -> InterviewSessionResponse:
    turns = (
        db.query(InterviewTurn)
        .filter(InterviewTurn.session_id == session.id)
        .order_by(InterviewTurn.turn_index, InterviewTurn.created_at)
        .all()
    )
    turn_responses = [
        InterviewTurnResponse(
            id=t.id,
            turn_index=t.turn_index,
            question=t.question,
            question_type=t.question_type,
            user_answer=t.user_answer,
            evaluation_json=t.evaluation_json,
            score=t.score,
            follow_up_needed=t.follow_up_needed,
            parent_turn_id=t.parent_turn_id,
            created_at=t.created_at,
        )
        for t in turns
    ]

    current_q = None
    current_q_type = None
    for t in turns:
        if t.evaluation_json is None and t.user_answer is None:
            current_q = t.question
            current_q_type = t.question_type
            break

    return InterviewSessionResponse(
        id=session.id,
        resume_id=session.resume_id,
        jd_id=session.jd_id,
        interview_type=session.interview_type,
        status=session.status,
        question_count_target=session.question_count_target,
        current_question_index=session.current_question_index,
        turns=turn_responses,
        final_report_json=session.final_report_json,
        final_report_markdown=session.final_report_markdown,
        current_question=current_q,
        current_question_type=current_q_type,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.get("", response_model=list[InterviewSessionResponse])
def list_interviews(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user_id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )
    return [_session_to_response(s, db) for s in sessions]


@router.post("", response_model=InterviewSessionResponse, status_code=201)
def create_interview(body: dict, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    resume_id = body.get("resume_id")
    if resume_id:
        resume = db.query(Resume).filter(
            Resume.id == resume_id,
            Resume.user_id == user_id,
            Resume.deleted_at.is_(None),
        ).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")

    jd_id = body.get("jd_id")
    if jd_id:
        job = db.query(JobDescription).filter(
            JobDescription.id == jd_id,
            JobDescription.user_id == user_id,
            JobDescription.deleted_at.is_(None),
        ).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job description not found")

    session = InterviewSession(
        user_id=user_id,
        resume_id=resume_id,
        jd_id=jd_id,
        interview_type=body.get("interview_type", "technical_1"),
        question_count_target=body.get("question_count_target", 5),
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    result = run_init(
        session.id,
        session.resume_id or "",
        session.jd_id or "",
        interview_type=session.interview_type,
        question_count_target=session.question_count_target,
        db_session_factory=lambda: type(db)(bind=db.bind),
    )

    if result.get("error"):
        db.delete(session)
        db.commit()
        error_msg = result["error"]
        if "未配置" in error_msg:
            raise HTTPException(status_code=422, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

    turn = InterviewTurn(
        session_id=session.id,
        turn_index=0,
        question=result.get("current_question", ""),
        question_type=result.get("current_question_type", "technical"),
    )
    db.add(turn)
    db.commit()

    return _session_to_response(session, db)


@router.get("/{session_id}", response_model=InterviewSessionResponse)
def get_interview(session_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id, InterviewSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    return _session_to_response(session, db)


@router.post("/{session_id}/answer", response_model=InterviewSessionResponse)
def submit_answer(session_id: str, body: InterviewAnswerRequest, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id, InterviewSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Interview session is not active")

    turns = (
        db.query(InterviewTurn)
        .filter(InterviewTurn.session_id == session_id)
        .order_by(InterviewTurn.turn_index, InterviewTurn.created_at)
        .all()
    )

    current_turn = None
    for t in reversed(turns):
        if t.evaluation_json is None and t.user_answer is None:
            current_turn = t
            break

    if not current_turn:
        raise HTTPException(status_code=400, detail="No pending question to answer")

    current_turn.user_answer = body.answer
    db.commit()

    current_state = {
        "session_id": session.id,
        "resume_id": session.resume_id or "",
        "jd_id": session.jd_id or "",
        "resume_text": "",
        "jd_text": "",
        "current_question": current_turn.question,
        "current_question_type": current_turn.question_type,
        "user_answer": body.answer,
        "current_question_index": session.current_question_index,
        "question_count_target": session.question_count_target,
        "turns": [
            {
                "turn_index": t.turn_index,
                "question": t.question,
                "question_type": t.question_type,
                "user_answer": t.user_answer,
                "score": t.score,
                "strengths": (t.evaluation_json or {}).get("strengths", []),
                "improvements": (t.evaluation_json or {}).get("improvements", []),
                "risks": (t.evaluation_json or {}).get("risks", []),
            }
            for t in turns
            if t.evaluation_json is not None
        ],
    }

    result = run_answer(current_state, db_session_factory=lambda: type(db)(bind=db.bind))

    if result.get("error"):
        error_msg = result["error"]
        if "未配置" in error_msg:
            raise HTTPException(status_code=422, detail=error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

    current_turn.evaluation_json = {
        "strengths": result.get("eval_strengths", []),
        "improvements": result.get("eval_improvements", []),
        "risks": result.get("eval_risks", []),
    }
    current_turn.score = result.get("eval_score")
    current_turn.follow_up_needed = result.get("follow_up_needed", False)

    if not result.get("follow_up_needed"):
        session.current_question_index = result.get("current_question_index", session.current_question_index + 1)

    db.flush()

    next_question_text = result.get("current_question", "")
    idx = session.current_question_index
    if next_question_text and idx < session.question_count_target:
        qtype = result.get("current_question_type", "technical")
        new_turn = InterviewTurn(
            session_id=session.id,
            turn_index=current_turn.turn_index if result.get("follow_up_needed") else idx,
            question=next_question_text,
            question_type=qtype,
            parent_turn_id=current_turn.id if result.get("follow_up_needed") else None,
        )
        db.add(new_turn)

    db.commit()

    return _session_to_response(session, db)


@router.post("/{session_id}/finish", response_model=InterviewSessionResponse)
def finish_interview(session_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id, InterviewSession.user_id == user_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Interview session is already finished")

    turns = (
        db.query(InterviewTurn)
        .filter(InterviewTurn.session_id == session_id)
        .order_by(InterviewTurn.turn_index, InterviewTurn.created_at)
        .all()
    )

    current_state = {
        "session_id": session.id,
        "turns": [
            {
                "turn_index": t.turn_index,
                "question": t.question,
                "score": t.score,
                "strengths": (t.evaluation_json or {}).get("strengths", []),
                "improvements": (t.evaluation_json or {}).get("improvements", []),
                "risks": (t.evaluation_json or {}).get("risks", []),
            }
            for t in turns
            if t.evaluation_json is not None
        ],
    }

    result = run_finish(current_state, db_session_factory=lambda: type(db)(bind=db.bind))

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    session.final_report_json = result.get("final_report_json")
    session.final_report_markdown = result.get("final_report_markdown")
    session.status = "finished"
    db.commit()

    return _session_to_response(session, db)
