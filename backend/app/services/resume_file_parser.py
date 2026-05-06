from __future__ import annotations

import subprocess
import tempfile
import zipfile
from io import BytesIO
from pathlib import Path
from shutil import which
from typing import Iterable
from xml.etree import ElementTree


TEXT_EXTENSIONS = {".txt", ".md", ".markdown", ".csv", ".json", ".log"}
DOCX_EXTENSIONS = {".docx"}
DOC_EXTENSIONS = {".doc"}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


class ResumeFileParseError(ValueError):
    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code


def extract_resume_text(filename: str, content: bytes) -> str:
    ext = Path(filename).suffix.lower()
    if not content:
        raise ResumeFileParseError("文件为空，请重新选择简历文件。")
    if len(content) > MAX_UPLOAD_BYTES:
        raise ResumeFileParseError("文件过大，请上传 5MB 以内的简历文件。", status_code=413)

    if ext in TEXT_EXTENSIONS:
        return _normalize_text(_decode_text(content))
    if ext in DOCX_EXTENSIONS:
        return _normalize_text(_extract_docx_text(content))
    if ext in DOC_EXTENSIONS:
        return _normalize_text(_extract_doc_text(filename, content))

    raise ResumeFileParseError("当前支持 .docx、.doc、.txt、.md、.csv、.json 等格式。", status_code=415)


def _decode_text(content: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-16", "gb18030", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ResumeFileParseError("无法识别文本编码，请转为 UTF-8 后重试。")


def _extract_docx_text(content: bytes) -> str:
    try:
        with zipfile.ZipFile(BytesIO(content)) as archive:
            document_xml = archive.read("word/document.xml")
    except Exception as exc:
        raise ResumeFileParseError("DOCX 文件解析失败，请确认文件未损坏。") from exc

    try:
        root = ElementTree.fromstring(document_xml)
    except ElementTree.ParseError as exc:
        raise ResumeFileParseError("DOCX 内容解析失败，请尝试另存为新的 DOCX 文件。") from exc

    namespace = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    paragraphs: list[str] = []
    for paragraph in root.iter(f"{namespace}p"):
        parts: list[str] = []
        for node in paragraph.iter():
            if node.tag == f"{namespace}t" and node.text:
                parts.append(node.text)
            elif node.tag == f"{namespace}tab":
                parts.append("\t")
            elif node.tag == f"{namespace}br":
                parts.append("\n")
        text = "".join(parts).strip()
        if text:
            paragraphs.append(text)

    if not paragraphs:
        raise ResumeFileParseError("DOCX 中没有读取到正文文本。")
    return "\n".join(paragraphs)


def _extract_doc_text(filename: str, content: bytes) -> str:
    converters = (_convert_with_textutil, _convert_with_antiword)
    errors: list[str] = []
    for converter in converters:
        try:
            text = converter(filename, content)
            if text.strip():
                return text
        except ResumeFileParseError as exc:
            errors.append(str(exc))

    detail = "；".join(errors) if errors else "当前环境没有可用的 DOC 转换器。"
    raise ResumeFileParseError(f"DOC 文件转换失败：{detail} 建议另存为 DOCX 后上传。", status_code=415)


def _convert_with_textutil(filename: str, content: bytes) -> str:
    textutil_path = which("textutil")
    if not textutil_path:
        raise ResumeFileParseError("未找到 macOS textutil")

    suffix = Path(filename).suffix.lower() or ".doc"
    with tempfile.NamedTemporaryFile(suffix=suffix) as tmp:
        tmp.write(content)
        tmp.flush()
        result = subprocess.run(
            [textutil_path, "-convert", "txt", "-stdout", tmp.name],
            check=False,
            capture_output=True,
            timeout=15,
        )
    if result.returncode != 0:
        message = _decode_text(result.stderr).strip() if result.stderr else "textutil 转换失败"
        raise ResumeFileParseError(message)
    return _decode_text(result.stdout)


def _convert_with_antiword(filename: str, content: bytes) -> str:
    antiword_path = which("antiword")
    if not antiword_path:
        raise ResumeFileParseError("未找到 antiword")

    suffix = Path(filename).suffix.lower() or ".doc"
    with tempfile.NamedTemporaryFile(suffix=suffix) as tmp:
        tmp.write(content)
        tmp.flush()
        result = subprocess.run(
            [antiword_path, tmp.name],
            check=False,
            capture_output=True,
            timeout=15,
        )
    if result.returncode != 0:
        message = _decode_text(result.stderr).strip() if result.stderr else "antiword 转换失败"
        raise ResumeFileParseError(message)
    return _decode_text(result.stdout)


def _normalize_text(text: str) -> str:
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    normalized = "\n".join(_collapse_blank_lines(lines)).strip()
    if not normalized:
        raise ResumeFileParseError("文件中没有读取到有效文本。")
    return normalized


def _collapse_blank_lines(lines: Iterable[str]) -> Iterable[str]:
    blank_count = 0
    for line in lines:
        if line.strip():
            blank_count = 0
            yield line
        else:
            blank_count += 1
            if blank_count <= 1:
                yield ""

