"""Normalize parsed resume data to a fixed output schema.

Ensures all sections exist, converts skills from strings to objects,
maps alternative field names, and fills missing fields.
"""
from __future__ import annotations

from typing import Any, Dict, List


# The canonical output schema
CANONICAL_SCHEMA = {
    "basic_info": {
        "name": None,
        "email": None,
        "phone": None,
        "age": None,
        "political_status": None,
    },
    "education": [],
    "skills": [],
    "work_experiences": [],
    "projects": [],
}


def normalize_resume_schema(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a raw parsed resume dict to the canonical schema."""
    result: Dict[str, Any] = {}

    # --- basic_info ---
    raw_basic = raw.get("basic_info") or {}
    result["basic_info"] = {
        "name": raw_basic.get("name") or None,
        "email": raw_basic.get("email") or None,
        "phone": raw_basic.get("phone") or None,
        "age": raw_basic.get("age") if isinstance(raw_basic.get("age"), int) else None,
        "political_status": raw_basic.get("political_status") or None,
    }

    # --- education ---
    raw_edu = raw.get("education") or []
    result["education"] = [_normalize_education_entry(e) for e in raw_edu if isinstance(e, dict)]

    # --- skills ---
    raw_skills = raw.get("skills") or []
    result["skills"] = _normalize_skills(raw_skills)

    # --- work_experiences ---
    # Accept both "work_experiences" and "experiences" as source keys
    raw_work = raw.get("work_experiences") or raw.get("experiences") or []
    result["work_experiences"] = [_normalize_work_entry(e) for e in raw_work if isinstance(e, dict)]

    # --- projects ---
    raw_projects = raw.get("projects") or []
    result["projects"] = [_normalize_project_entry(e) for e in raw_projects if isinstance(e, dict)]

    return result


def _normalize_education_entry(entry: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a single education entry."""
    return {
        "school": str(entry.get("school") or ""),
        "degree": str(entry.get("degree") or "") or None,
        "major": str(entry.get("major") or ""),
        "start_date": entry.get("start_date") or None,
        "end_date": entry.get("end_date") or None,
    }


def _normalize_skills(raw_skills: List[Any]) -> List[Dict[str, Any]]:
    """Normalize skills list: convert strings to objects with name/category/evidence."""
    result: List[Dict[str, Any]] = []
    for skill in raw_skills:
        if isinstance(skill, str):
            result.append({"name": skill, "category": "other", "evidence": []})
        elif isinstance(skill, dict):
            result.append({
                "name": str(skill.get("name") or ""),
                "category": str(skill.get("category") or "other"),
                "evidence": skill.get("evidence") if isinstance(skill.get("evidence"), list) else [],
            })
    return result


def _normalize_work_entry(entry: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a single work experience entry."""
    responsibilities = entry.get("responsibilities")
    if isinstance(responsibilities, str):
        responsibilities = [r.strip() for r in responsibilities.split("\n") if r.strip()]
    elif not isinstance(responsibilities, list):
        responsibilities = []

    achievements = entry.get("achievements")
    if isinstance(achievements, str):
        achievements = [a.strip() for a in achievements.split("\n") if a.strip()]
    elif not isinstance(achievements, list):
        achievements = []

    return {
        "company": str(entry.get("company") or ""),
        "role": str(entry.get("role") or "") or None,
        "start_date": entry.get("start_date") or None,
        "end_date": entry.get("end_date") or None,
        "description": str(entry.get("description") or ""),
        "responsibilities": responsibilities,
        "achievements": achievements,
    }


def _normalize_project_entry(entry: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a single project entry."""
    tech_stack = entry.get("tech_stack")
    if isinstance(tech_stack, str):
        tech_stack = [t.strip() for t in tech_stack.split(",") if t.strip()]
    elif not isinstance(tech_stack, list):
        tech_stack = []

    responsibilities = entry.get("responsibilities")
    if isinstance(responsibilities, str):
        responsibilities = [r.strip() for r in responsibilities.split("\n") if r.strip()]
    elif not isinstance(responsibilities, list):
        responsibilities = []

    achievements = entry.get("achievements")
    if isinstance(achievements, str):
        achievements = [a.strip() for a in achievements.split("\n") if a.strip()]
    elif not isinstance(achievements, list):
        achievements = []

    metrics = entry.get("metrics")
    if isinstance(metrics, str):
        metrics = [m.strip() for m in metrics.split("\n") if m.strip()]
    elif not isinstance(metrics, list):
        metrics = []

    return {
        "name": str(entry.get("name") or "未命名项目"),
        "description": str(entry.get("description") or ""),
        "tech_stack": tech_stack,
        "role": str(entry.get("role") or "") or None,
        "responsibilities": responsibilities,
        "achievements": achievements,
        "metrics": metrics,
    }
