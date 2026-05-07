"""Tests for resume text cleaner, quick parser, schema normalizer, and AI timeout fallback."""
from __future__ import annotations

import os
from unittest.mock import patch

import pytest

from app.services.resume_text_cleaner import clean_resume_text
from app.services.resume_quick_parser import quick_parse_resume
from app.services.resume_schema_normalizer import normalize_resume_schema


# --- Text Cleaner Tests ---

def test_clean_duplicate_headings():
    raw = "教育背景教育背景\n教育背景\n教育背景\n2024年9月-至今\t南京邮电大学"
    cleaned = clean_resume_text(raw)
    assert cleaned.count("教育背景") == 1
    assert "南京邮电大学" in cleaned


def test_clean_duplicate_labels():
    raw = "实习内容：实习内容：协助部门起草材料"
    cleaned = clean_resume_text(raw)
    assert cleaned == "实习内容：协助部门起草材料"


def test_clean_collapse_blank_lines():
    raw = "第一行\n\n\n\n第二行\n\n\n第三行"
    cleaned = clean_resume_text(raw)
    assert cleaned == "第一行\n\n第二行\n\n第三行"


def test_clean_preserves_tabs():
    raw = "2024年9月-至今\t南京邮电大学\t信息网络"
    cleaned = clean_resume_text(raw)
    assert "\t" in cleaned


def test_clean_multiple_heading_types():
    raw = "教育背景教育背景\n科研与实习经历科研与实习经历\n个人评价个人评价"
    cleaned = clean_resume_text(raw)
    assert cleaned.count("教育背景") == 1
    assert cleaned.count("科研与实习经历") == 1
    assert cleaned.count("个人评价") == 1


# --- Quick Parser Tests ---

ZHANG_JIALIANG_RESUME = """张家亮
年龄：24岁\t政治面貌：共青团员
民族：汉族\t身高体重：182cm/65kg
联系电话：17805212215\t电子邮箱：1024072020@njupt.edu.cn
教育背景
2024年9月-至今\t南京邮电大学\t信息网络-研究生(推免)
2020年9月-2024年6月\t南京邮电大学\t软件工程-本科
科研与实习经历
2024年9月-至今\t南京邮电大学\t计算机视觉与人工智能研究
科研成果：以第一作者身份发表图像增强领域SCI论文2篇，系统研究图像增强关键技术，为相关领域应用提供理论支撑；同期发表综述论文1篇，梳理该领域研究现状与发展趋势；另有1篇遥感领域TGRS（TOP期刊）论文处于在投阶段，聚焦遥感影像处理核心问题。
合作项目：与中大医院影像科博士团队深度协作，主导2项核心科研项目研发：1. 基于自监督深度学习与无监督图聚类算法，构建胰腺癌患者生存期预测模型，实现患者预后风险的精准评估；2. 基于核磁影像特征构建双分支多模态模型，研发乳腺癌患者PD-L1表达预测模型。
2025年10月-2026年1月\t江苏省教育考试院\t网络信息中心实习生
实习内容：协助部门起草省级人工智能领域课题项目申请材料，完成江苏省标准化考点智能化改造论文（期刊：中国考试）撰写。全程参与2025年10月自学考试、12月研究生考试标准化考点网上巡查与信息化保障工作。
2023年11月-2024年4月\t校级STITP项目\t项目负责人
项目内容：与南京26度有限公司精准对接项目需求，负责碳积分商城方案设计、功能开发、测试验证。主要负责Android、Java、PHP、OCR等相关技术的开发，主动配合团队完成功能迭代、性能优化及全流程测试调试，及时排查技术难点、完善功能细节。
成果技能与荣誉
技术能力：熟悉 Python、Java、PHP、C++、PyTorch、OpenCV、深度学习框架，具备从数据处理、算法开发到后端接口联调、基础系统部署与测试的端到端工程落地能力。
证书荣誉：本科阶段荣获校级一等奖学金、二等奖学金，蓝桥杯江苏省二等奖，两次获评校级三好学生；2024年荣获校级研究生一等奖学金。
个人评价
具备扎实的计算机基础和较强的科研实践能力，做事认真负责，学习与执行力强，能够快速推进算法研究、实验分析与工程落地。"""


def test_quick_parse_zhang_jialiang_basic_info():
    result = quick_parse_resume(ZHANG_JIALIANG_RESUME)
    bi = result["basic_info"]
    assert bi["name"] == "张家亮"
    assert bi["phone"] == "17805212215"
    assert bi["email"] == "1024072020@njupt.edu.cn"
    assert bi["age"] == 24
    assert bi["political_status"] == "共青团员"


def test_quick_parse_zhang_jialiang_education():
    result = quick_parse_resume(ZHANG_JIALIANG_RESUME)
    edu = result["education"]
    assert len(edu) == 2
    assert edu[0]["school"] == "南京邮电大学"
    assert edu[0]["major"] == "信息网络"
    assert edu[0]["degree"] == "研究生(推免)"
    assert edu[0]["start_date"] == "2024-09"
    assert edu[0]["end_date"] is None
    assert edu[1]["school"] == "南京邮电大学"
    assert edu[1]["major"] == "软件工程"
    assert edu[1]["degree"] == "本科"
    assert edu[1]["start_date"] == "2020-09"
    assert edu[1]["end_date"] == "2024-06"


def test_quick_parse_zhang_jialiang_work_experiences():
    result = quick_parse_resume(ZHANG_JIALIANG_RESUME)
    work = result["work_experiences"]
    assert len(work) >= 2
    # Research experience at NJUPT
    research = work[0]
    assert research["company"] == "南京邮电大学"
    assert "计算机视觉" in (research["role"] or "")
    # Internship at Jiangsu Education Examinations Authority
    internship = work[1]
    assert internship["company"] == "江苏省教育考试院"
    assert "网络信息中心实习生" in (internship["role"] or "")


def test_quick_parse_zhang_jialiang_project():
    result = quick_parse_resume(ZHANG_JIALIANG_RESUME)
    projects = result["projects"]
    assert len(projects) >= 1
    project = projects[0]
    # Should extract STITP or 碳积分商城 as project name
    assert "STITP" in project["name"] or "碳积分商城" in project["name"]
    # Tech stack should include Java and PHP
    assert "Java" in project["tech_stack"]
    assert "PHP" in project["tech_stack"]


def test_quick_parse_zhang_jialiang_skills():
    result = quick_parse_resume(ZHANG_JIALIANG_RESUME)
    skills = result["skills"]
    skill_names = [s["name"] for s in skills]
    assert "Python" in skill_names
    assert "Java" in skill_names
    assert "PHP" in skill_names
    assert "C++" in skill_names
    assert "PyTorch" in skill_names
    assert "OpenCV" in skill_names


# --- Schema Normalizer Tests ---

def test_normalize_complete_data():
    raw = {
        "basic_info": {"name": "张三", "email": "z@test.com", "phone": "13800001111", "age": 25, "political_status": "党员"},
        "education": [{"school": "北大", "degree": "本科", "major": "CS", "start_date": "2018-09", "end_date": "2022-06"}],
        "skills": [{"name": "Python", "category": "language", "evidence": ["3年经验"]}],
        "work_experiences": [{"company": "公司A", "role": "工程师", "start_date": "2022-07", "end_date": None, "description": "做开发", "responsibilities": [], "achievements": []}],
        "projects": [{"name": "项目X", "description": "描述", "tech_stack": ["Python"], "role": "负责人", "responsibilities": [], "achievements": [], "metrics": []}],
    }
    result = normalize_resume_schema(raw)
    assert result["basic_info"]["name"] == "张三"
    assert result["basic_info"]["age"] == 25
    assert len(result["education"]) == 1
    assert len(result["skills"]) == 1
    assert len(result["work_experiences"]) == 1
    assert len(result["projects"]) == 1


def test_normalize_string_skills():
    raw = {"basic_info": {}, "skills": ["Python", "Java"], "education": [], "work_experiences": [], "projects": []}
    result = normalize_resume_schema(raw)
    assert len(result["skills"]) == 2
    assert result["skills"][0]["name"] == "Python"
    assert result["skills"][0]["category"] == "other"


def test_normalize_missing_fields():
    raw = {"basic_info": {}, "education": [], "skills": [], "work_experiences": [], "projects": []}
    result = normalize_resume_schema(raw)
    assert result["basic_info"]["name"] is None
    assert result["basic_info"]["email"] is None
    assert result["basic_info"]["age"] is None
    assert result["basic_info"]["political_status"] is None


def test_normalize_experiences_alias():
    """Accept 'experiences' as an alias for 'work_experiences'."""
    raw = {"basic_info": {}, "experiences": [{"company": "X", "role": "Y"}], "education": [], "skills": [], "projects": []}
    result = normalize_resume_schema(raw)
    assert len(result["work_experiences"]) == 1


def test_normalize_string_tech_stack():
    raw = {"basic_info": {}, "education": [], "skills": [], "work_experiences": [], "projects": [{"name": "P", "tech_stack": "Python, Java"}]}
    result = normalize_resume_schema(raw)
    assert result["projects"][0]["tech_stack"] == ["Python", "Java"]


# --- AI Timeout Fallback Test (API) ---

@pytest.mark.asyncio
async def test_parse_quick_succeeded_without_api_key(client):
    """When no API key is configured, parse should return quick_succeeded."""
    os.environ["USE_MOCK_LLM"] = "false"
    with patch("app.core.config.settings.DEEPSEEK_API_KEY", ""):
        resume_resp = await client.post("/api/resumes", json={
            "title": "测试简历",
            "raw_text": ZHANG_JIALIANG_RESUME,
        })
        assert resume_resp.status_code == 201
        resume_id = resume_resp.json()["id"]

        parse_resp = await client.post(f"/api/resumes/{resume_id}/parse")
        assert parse_resp.status_code == 200
        data = parse_resp.json()
        assert data["parse_status"] == "quick_succeeded"
        assert data["structured_json"] is not None
        assert data["structured_json"]["basic_info"]["name"] == "张家亮"
        assert data["structured_json"]["basic_info"]["phone"] == "17805212215"
        assert len(data["structured_json"]["education"]) == 2
        assert data["parse_warnings"] is not None
        assert "warning" in data["parse_warnings"]
    os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_parse_quick_succeeded_on_ai_timeout(client):
    """When AI call times out, parse should keep quick_succeeded with warning."""
    os.environ["USE_MOCK_LLM"] = "false"
    with patch("app.core.config.settings.DEEPSEEK_API_KEY", "sk-fake-key"):
        with patch("app.services.llm.deepseek_provider.OpenAI") as mock_openai:
            # Simulate timeout
            mock_client = mock_openai.return_value
            mock_client.chat.completions.create.side_effect = TimeoutError("Connection timed out")

            resume_resp = await client.post("/api/resumes", json={
                "title": "超时简历",
                "raw_text": "张三\n年龄：25岁\n联系电话：13800001111",
            })
            assert resume_resp.status_code == 201
            resume_id = resume_resp.json()["id"]

            parse_resp = await client.post(f"/api/resumes/{resume_id}/parse")
            assert parse_resp.status_code == 200
            data = parse_resp.json()
            assert data["parse_status"] == "quick_succeeded"
            assert data["structured_json"] is not None
            assert data["parse_warnings"] is not None
            assert "warning" in data["parse_warnings"]
            assert "AI 精修失败" in data["parse_warnings"]["warning"]
    os.environ.pop("USE_MOCK_LLM", None)


@pytest.mark.asyncio
async def test_parse_mock_mode_returns_succeeded(client):
    """Mock mode should still return succeeded status."""
    os.environ["USE_MOCK_LLM"] = "true"
    try:
        resume_resp = await client.post("/api/resumes", json={
            "title": "Mock简历",
            "raw_text": "测试内容",
        })
        assert resume_resp.status_code == 201
        resume_id = resume_resp.json()["id"]

        parse_resp = await client.post(f"/api/resumes/{resume_id}/parse")
        assert parse_resp.status_code == 200
        data = parse_resp.json()
        assert data["parse_status"] == "succeeded"
        assert data["structured_json"] is not None
    finally:
        os.environ.pop("USE_MOCK_LLM", None)
