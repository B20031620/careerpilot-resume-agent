"""Rule-based quick parser for Chinese resumes (no LLM needed).

Extracts structured data using regex and heuristics:
- basic_info: name, phone, email, age, political_status
- education: school, degree, major, start_date, end_date
- work_experiences: company, role, start_date, end_date, description
- projects: name, description, role, tech_stack
- skills: list of recognized skill keywords
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional


# Known skill keywords to extract
_SKILL_KEYWORDS = [
    # Languages
    "Python", "Java", "PHP", "C++", "C", "Go", "Rust", "JavaScript", "TypeScript",
    "Kotlin", "Swift", "Ruby", "Scala", "R", "MATLAB", "SQL",
    # AI/ML
    "PyTorch", "TensorFlow", "Keras", "OpenCV", "scikit-learn", "Hugging Face",
    "LangChain", "LangGraph", "DeepSpeed", "transformers", "深度学习",
    "机器学习", "计算机视觉", "自然语言处理", "NLP", "CV", "GAN",
    "自监督学习", "图像增强", "目标检测", "图像分割",
    # Web/Backend
    "FastAPI", "Flask", "Django", "Spring", "Node.js", "Express",
    "React", "Vue", "Angular",
    # Database
    "MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite",
    # DevOps
    "Docker", "Kubernetes", "Git", "Linux", "CI/CD",
    # Mobile
    "Android", "iOS",
    # Other
    "OCR", "REST API", "微服务",
]

# Section heading patterns (regex, case-insensitive where applicable)
_SECTION_PATTERNS = [
    ("education", re.compile(r"教育背景|教育经历|学历", re.IGNORECASE)),
    ("work", re.compile(r"科研与实习经历|工作经历|实习经历|工作与实习|科研经历", re.IGNORECASE)),
    ("project", re.compile(r"项目经历|项目经验|项目内容", re.IGNORECASE)),
    ("skills", re.compile(r"成果技能与荣誉|技能与荣誉|专业技能|技术能力|技能清单", re.IGNORECASE)),
    ("evaluation", re.compile(r"个人评价|自我评价|个人总结", re.IGNORECASE)),
]


def quick_parse_resume(text: str) -> Dict[str, Any]:
    """Parse Chinese resume text into structured dict using rules only."""
    result: Dict[str, Any] = {
        "basic_info": _parse_basic_info(text),
        "education": [],
        "work_experiences": [],
        "projects": [],
        "skills": [],
    }

    lines = text.split("\n")

    # Split text into sections based on headings
    sections = _split_sections(lines)

    # Parse each section
    if "education" in sections:
        result["education"] = _parse_education(sections["education"])
    if "work" in sections:
        work_entries = _parse_work_experiences(sections["work"])
        # Strip internal _is_project flag before storing
        for entry in work_entries:
            entry.pop("_is_project", None)
        result["work_experiences"] = work_entries
        # Check if any work entries are actually project entries
        project_entries = _extract_projects_from_work(work_entries)
        if project_entries:
            result["projects"] = project_entries
    if "project" in sections:
        result["projects"] = _parse_projects(sections["project"])
    if "skills" in sections:
        result["skills"] = _parse_skills(sections["skills"], text)

    # If no dedicated project section, try extracting from work entries
    if not result["projects"] and result["work_experiences"]:
        result["projects"] = _extract_projects_from_work(result["work_experiences"])

    # If skills section didn't yield results, try extracting from full text
    if not result["skills"]:
        result["skills"] = _extract_skills_from_text(text)

    return result


def _parse_basic_info(text: str) -> Dict[str, Any]:
    """Extract basic info: name, phone, email, age, political_status."""
    info: Dict[str, Any] = {
        "name": None,
        "phone": None,
        "email": None,
        "age": None,
        "political_status": None,
    }

    # Phone: Chinese mobile numbers
    phone_match = re.search(r"(?:联系电话|手机|电话)[：:\s]*(1[3-9]\d{9})", text)
    if phone_match:
        info["phone"] = phone_match.group(1)
    elif not phone_match:
        phone_match = re.search(r"(1[3-9]\d{9})", text)
        if phone_match:
            info["phone"] = phone_match.group(1)

    # Email
    email_match = re.search(r"(?:电子邮箱|邮箱|Email|E-mail)[：:\s]*([\w.+-]+@[\w.-]+\.\w+)", text, re.IGNORECASE)
    if email_match:
        info["email"] = email_match.group(1)
    elif not email_match:
        email_match = re.search(r"([\w.+-]+@[\w.-]+\.\w+)", text, re.IGNORECASE)
        if email_match:
            info["email"] = email_match.group(1)

    # Age
    age_match = re.search(r"年龄[：:\s]*(\d{1,3})\s*岁", text)
    if age_match:
        info["age"] = int(age_match.group(1))

    # Political status
    political_match = re.search(r"政治面貌[：:\s]*(\S+)", text)
    if political_match:
        info["political_status"] = political_match.group(1)

    # Name: typically the first non-empty line that looks like a Chinese name (2-4 chars, no labels)
    lines = text.split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # A Chinese name is typically 2-4 Chinese characters with no other content
        if re.fullmatch(r"[一-鿿]{2,4}", line):
            info["name"] = line
            break

    return info


def _split_sections(lines: List[str]) -> Dict[str, List[str]]:
    """Split text lines into named sections based on heading patterns."""
    sections: Dict[str, List[str]] = {}
    current_section: Optional[str] = None
    current_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_section is not None:
                current_lines.append("")
            continue

        matched = False
        for section_name, pattern in _SECTION_PATTERNS:
            if pattern.fullmatch(stripped) or pattern.search(stripped) and len(stripped) <= 20:
                # Save previous section
                if current_section is not None and current_lines:
                    sections[current_section] = current_lines
                current_section = section_name
                current_lines = []
                matched = True
                break

        if not matched:
            if current_section is not None:
                current_lines.append(line)

    # Save last section
    if current_section is not None and current_lines:
        sections[current_section] = current_lines

    return sections


# Date pattern: "2024年9月-至今" or "2020年9月-2024年6月"
_DATE_PATTERN = re.compile(
    r"(\d{4})\s*年\s*(\d{1,2})\s*月\s*[-–—]\s*(至今|\d{4}\s*年\s*\d{1,2}\s*月)"
)


def _normalize_date(year: str, month: str) -> str:
    """Normalize date components to 'YYYY-MM' format."""
    return f"{year}-{month.zfill(2)}"


def _parse_date_range(text: str) -> Optional[Dict[str, Optional[str]]]:
    """Parse a date range like '2024年9月-至今' into {start_date, end_date}."""
    match = _DATE_PATTERN.search(text)
    if not match:
        return None
    start_date = _normalize_date(match.group(1), match.group(2))
    end_raw = match.group(3)
    if end_raw == "至今":
        end_date = None
    else:
        end_match = re.match(r"(\d{4})\s*年\s*(\d{1,2})\s*月", end_raw)
        if end_match:
            end_date = _normalize_date(end_match.group(1), end_match.group(2))
        else:
            end_date = None
    return {"start_date": start_date, "end_date": end_date}


def _parse_education(lines: List[str]) -> List[Dict[str, Any]]:
    """Parse education section entries."""
    entries: List[Dict[str, Any]] = []
    current_entry: Optional[Dict[str, Any]] = None

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Check if line starts with a date range
        date_info = _parse_date_range(stripped)
        if date_info:
            # Save previous entry
            if current_entry:
                entries.append(current_entry)

            # Parse the rest of the line after the date
            remaining = _DATE_PATTERN.sub("", stripped).strip()
            parts = re.split(r"\s+", remaining, maxsplit=1)

            school = parts[0].strip() if parts else ""
            major_degree = parts[1].strip() if len(parts) > 1 else ""

            # Try to split major and degree (e.g., "软件工程-本科" or "信息网络-研究生(推免)")
            major = major_degree
            degree = None
            if "-" in major_degree:
                major_part, degree_part = major_degree.rsplit("-", 1)
                major = major_part.strip()
                degree = degree_part.strip()

            current_entry = {
                "school": school,
                "degree": degree,
                "major": major,
                "start_date": date_info["start_date"],
                "end_date": date_info["end_date"],
            }

    if current_entry:
        entries.append(current_entry)

    return entries


def _parse_work_experiences(lines: List[str]) -> List[Dict[str, Any]]:
    """Parse work/internship/research experience section entries."""
    entries: List[Dict[str, Any]] = []
    current_entry: Optional[Dict[str, Any]] = None
    current_description_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Check if line starts with a date range
        date_info = _parse_date_range(stripped)
        if date_info:
            # Save previous entry
            if current_entry:
                current_entry["description"] = "\n".join(current_description_lines).strip()
                entries.append(current_entry)

            # Parse the rest of the line after the date
            remaining = _DATE_PATTERN.sub("", stripped).strip()
            # Split by tab or multiple spaces
            parts = re.split(r"\t|\s{3,}", remaining, maxsplit=1)
            # Also try single-space split if tab/multi-space didn't work
            if len(parts) == 1 and "  " not in remaining and "\t" not in remaining:
                # Try splitting by "项目" keyword or similar to separate org from role
                project_split = re.split(r"\s+(项目)", remaining, maxsplit=1)
                if len(project_split) > 1:
                    parts = [project_split[0], "".join(project_split[1:])]

            org = parts[0].strip() if parts else ""
            role_or_label = parts[1].strip() if len(parts) > 1 else ""

            # Determine if this is a project entry
            is_project = bool(re.search(r"项目", org + role_or_label))

            current_entry = {
                "company": org,
                "role": role_or_label if role_or_label else None,
                "start_date": date_info["start_date"],
                "end_date": date_info["end_date"],
                "description": "",
                "_is_project": is_project,
            }
            current_description_lines = []
        else:
            # This line is description content for the current entry
            # Skip duplicate label prefixes like "实习内容：实习内容："
            cleaned = _clean_label_prefix(stripped)
            if cleaned:
                current_description_lines.append(cleaned)

    # Save last entry
    if current_entry:
        current_entry["description"] = "\n".join(current_description_lines).strip()
        entries.append(current_entry)

    return entries


def _clean_label_prefix(text: str) -> str:
    """Remove duplicate label prefixes like '实习内容：实习内容：' or '项目内容：'."""
    # Remove known label prefixes
    labels = ["实习内容", "项目内容", "工作内容", "科研成果", "成果"]
    for label in labels:
        # Match repeated label patterns
        pattern = rf"^({re.escape(label)}[：:]\s*)+"
        text = re.sub(pattern, "", text)
    return text.strip()


def _extract_projects_from_work(work_entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Try to extract project entries from work experience descriptions.

    Looks for entries that mention "项目" or "STITP" in role/description.
    """
    projects: List[Dict[str, Any]] = []

    for entry in work_entries:
        role = entry.get("role") or ""
        desc = entry.get("description") or ""
        combined = entry.get("company", "") + role + desc
        is_flagged = entry.get("_is_project", False)

        # Detect project-like entries
        is_project = is_flagged or bool(
            re.search(r"项目|STITP|商城|系统|平台|App|应用", combined)
            and not re.search(r"实习|研究|科研", entry.get("company", "") + role)
        ) or bool(re.search(r"项目负责人|项目开发", combined))

        if is_project:
            # Extract project name from company field or role
            company = entry.get("company", "")
            project_name = company
            # Clean up project name (remove "校级" prefix)
            project_name = re.sub(r"^校级\s*", "", project_name).strip()
            # Also try to extract project name from description
            if desc:
                # Look for "碳积分商城" or similar specific names in description
                name_match = re.search(r"([一-鿿]+(?:商城|系统|平台|App|应用|网站|小程序|工具))", desc)
                if name_match:
                    project_name = name_match.group(1)

            # Extract tech stack from description
            tech_stack = _extract_tech_stack_from_text(combined)

            projects.append({
                "name": project_name or "未命名项目",
                "description": desc,
                "role": "项目负责人" if "项目负责人" in combined else (role or None),
                "tech_stack": tech_stack,
            })

    return projects


def _parse_projects(lines: List[str]) -> List[Dict[str, Any]]:
    """Parse dedicated project section entries."""
    entries: List[Dict[str, Any]] = []
    current_entry: Optional[Dict[str, Any]] = None
    current_desc_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        date_info = _parse_date_range(stripped)
        if date_info:
            if current_entry:
                current_entry["description"] = "\n".join(current_desc_lines).strip()
                entries.append(current_entry)

            remaining = _DATE_PATTERN.sub("", stripped).strip()
            parts = re.split(r"\s{2,}|\t", remaining, maxsplit=1)

            current_entry = {
                "name": parts[0].strip() if parts else "未命名项目",
                "description": "",
                "role": parts[1].strip() if len(parts) > 1 else None,
                "tech_stack": [],
            }
            current_desc_lines = []
        else:
            cleaned = _clean_label_prefix(stripped)
            if cleaned:
                current_desc_lines.append(cleaned)

    if current_entry:
        current_entry["description"] = "\n".join(current_desc_lines).strip()
        if current_entry["description"]:
            current_entry["tech_stack"] = _extract_tech_stack_from_text(current_entry["description"])
        entries.append(current_entry)

    return entries


def _extract_tech_stack_from_text(text: str) -> List[str]:
    """Extract known tech keywords from text."""
    found = []
    for skill in _SKILL_KEYWORDS:
        # C++ needs special handling since \b doesn't work with +
        if skill == "C++":
            if re.search(r"C\+\+", text):
                found.append(skill)
        elif re.search(rf"\b{re.escape(skill)}\b", text, re.IGNORECASE):
            found.append(skill)
    return found


def _parse_skills(section_lines: List[str], full_text: str) -> List[Dict[str, Any]]:
    """Parse skills from a dedicated section, or fall back to full text extraction."""
    # Combine section lines
    section_text = "\n".join(section_lines)

    # Try to find a "技术能力" line and extract skills from it
    skills: List[Dict[str, Any]] = []
    found_keywords = _extract_tech_stack_from_text(section_text)

    if not found_keywords:
        found_keywords = _extract_tech_stack_from_text(full_text)

    for kw in found_keywords:
        category = _categorize_skill(kw)
        skills.append({"name": kw, "category": category, "evidence": []})

    return skills


def _extract_skills_from_text(text: str) -> List[Dict[str, Any]]:
    """Extract skills from full text when no dedicated section is found."""
    found_keywords = _extract_tech_stack_from_text(text)
    skills = []
    for kw in found_keywords:
        category = _categorize_skill(kw)
        skills.append({"name": kw, "category": category, "evidence": []})
    return skills


def _categorize_skill(skill: str) -> str:
    """Assign a category to a skill keyword."""
    language_skills = {"Python", "Java", "PHP", "C++", "C", "Go", "Rust", "JavaScript",
                       "TypeScript", "Kotlin", "Swift", "Ruby", "Scala", "R", "MATLAB", "SQL"}
    ai_skills = {"PyTorch", "TensorFlow", "Keras", "OpenCV", "scikit-learn",
                 "Hugging Face", "LangChain", "LangGraph", "DeepSpeed", "transformers",
                 "深度学习", "机器学习", "计算机视觉", "自然语言处理", "NLP", "CV",
                 "GAN", "自监督学习", "图像增强", "目标检测", "图像分割"}
    web_skills = {"FastAPI", "Flask", "Django", "Spring", "Node.js", "Express",
                  "React", "Vue", "Angular"}
    db_skills = {"MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite"}
    devops_skills = {"Docker", "Kubernetes", "Git", "Linux", "CI/CD"}
    mobile_skills = {"Android", "iOS"}

    if skill in language_skills:
        return "language"
    if skill in ai_skills:
        return "ai"
    if skill in web_skills:
        return "backend"
    if skill in db_skills:
        return "database"
    if skill in devops_skills:
        return "devops"
    if skill in mobile_skills:
        return "mobile"
    return "other"
