"""Clean noise from DOCX-extracted resume text.

Common DOCX artifacts:
- Duplicate heading lines ("教育背景教育背景\n教育背景\n教育背景")
- Duplicate inline labels ("实习内容：实习内容：")
- Excessive blank lines from XML extraction
- Trailing/leading whitespace per line
"""
from __future__ import annotations

import re
from typing import List


# Headings commonly found in Chinese resumes
_HEADING_PATTERNS = [
    "教育背景",
    "科研与实习经历",
    "工作经历",
    "项目经历",
    "成果技能与荣誉",
    "技能与荣誉",
    "个人评价",
    "自我评价",
    "专业技能",
    "获奖情况",
    "论文成果",
    "语言能力",
]


def clean_resume_text(raw: str) -> str:
    """Clean DOCX noise from resume text and return normalized text."""
    lines = raw.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    cleaned: List[str] = []

    for line in lines:
        line = line.rstrip()
        if not line.strip():
            cleaned.append("")
            continue

        # Deduplicate inline headings like "教育背景教育背景"
        line = _deduplicate_heading(line)

        # Deduplicate inline labels like "实习内容：实习内容："
        line = _deduplicate_label(line)

        # Strip leading/trailing whitespace but preserve internal tabs (used as delimiters)
        line = line.strip()

        cleaned.append(line)

    # Remove consecutive duplicate heading lines (e.g., "教育背景\n教育背景\n教育背景")
    deduped: List[str] = []
    for line in cleaned:
        if deduped and deduped[-1].strip() == line.strip():
            # Check if both are heading lines
            if _is_heading_line(line.strip()):
                continue
        deduped.append(line)

    # Collapse consecutive blank lines to at most one
    result_lines: List[str] = []
    blank_count = 0
    for line in deduped:
        if not line.strip():
            blank_count += 1
            if blank_count <= 1:
                result_lines.append("")
        else:
            blank_count = 0
            result_lines.append(line)

    # Strip leading/trailing blank lines
    while result_lines and not result_lines[0].strip():
        result_lines.pop(0)
    while result_lines and not result_lines[-1].strip():
        result_lines.pop()

    return "\n".join(result_lines)


def _is_heading_line(text: str) -> bool:
    """Check if a line is a section heading."""
    for heading in _HEADING_PATTERNS:
        if text == heading or text.startswith(heading):
            return True
    return False


def _deduplicate_heading(line: str) -> str:
    """Replace repeated heading text like '教育背景教育背景' with a single instance."""
    stripped = line.strip()
    for heading in _HEADING_PATTERNS:
        pattern = re.escape(heading)
        # Match inline repetitions like "教育背景教育背景"
        match = re.fullmatch(rf"({pattern})\s*(\1\s*)*", stripped)
        if match:
            return heading
    return line


def _deduplicate_label(line: str) -> str:
    """Replace repeated inline labels like '实习内容：实习内容：' with a single instance."""
    match = re.match(r"^(.+?[：:])\1+(.*)$", line)
    if match:
        label = match.group(1)
        rest = match.group(2)
        return label + rest
    return line
