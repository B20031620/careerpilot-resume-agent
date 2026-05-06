# 开发实施计划

## 1. 文档目标

本文档用于指导 Claude Code 或其他开发 Agent 将当前文档与 Stitch 页面转化为一个可运行的 MVP 项目。

开发目标不是一次性做完所有功能，而是先完成一个可以演示、可以继续扩展的核心闭环。

## 2. 当前输入材料

项目文档：

- `docs/01_requirements.md`
- `docs/02_user_scenarios.md`
- `docs/03_agent_flows.md`
- `docs/04_data_model.md`
- `docs/05_architecture.md`
- `docs/06_maintenance_plan.md`
- `docs/07_llm_provider.md`
- `docs/design.md`

Stitch 页面：

- `页面/stitch_markdown_design_system/careerpilot_1/code.html`
- `页面/stitch_markdown_design_system/careerpilot_2/code.html`
- `页面/stitch_markdown_design_system/careerpilot_3/code.html`
- `页面/stitch_markdown_design_system/careerpilot_4/code.html`
- `页面/stitch_markdown_design_system/careerpilot_5/code.html`
- `页面/stitch_markdown_design_system/careerpilot_6/code.html`
- `页面/stitch_markdown_design_system/careerpilot_7/code.html`
- `页面/stitch_markdown_design_system/careerpilot_8/code.html`
- `页面/stitch_markdown_design_system/careerpilot/DESIGN.md`

## 3. 总体落地路线

```text
Phase 1：工程骨架和静态页面
Phase 2：后端数据模型和基础 API
Phase 3：DeepSeek Provider 和 LangGraph 主流程
Phase 4：前后端联调
Phase 5：模拟面试与历史报告
Phase 6：测试、README、演示脚本
```

## 4. Phase 1：工程骨架和静态页面

### 4.1 目标

先让项目跑起来，形成可见的前端页面和可启动的后端服务。

### 4.2 前端任务

创建：

```text
frontend/
  package.json
  vite.config.ts
  index.html
  src/
    main.tsx
    App.tsx
    styles/index.css
    components/
      AppLayout.tsx
      Sidebar.tsx
      Topbar.tsx
      Card.tsx
      Badge.tsx
      AgentTimeline.tsx
      ScoreRing.tsx
    pages/
      DashboardPage.tsx
      ResumeAnalysisPage.tsx
      JobMatchPage.tsx
      ResumePolishPage.tsx
      ProjectStoryPage.tsx
      MockInterviewPage.tsx
      WorkplaceHelpPage.tsx
      ReportsPage.tsx
      SettingsPage.tsx
    api/
      client.ts
      settings.ts
```

前端应从 Stitch HTML 中提取：

- 左侧导航。
- 页面布局。
- 中文文案。
- 卡片结构。
- Agent 动态。
- 报告结构。
- 简历润色对照布局。
- 模拟面试三栏布局。

不要把 8 个 `code.html` 直接塞进 React。需要组件化整理。

### 4.3 后端任务

创建：

```text
backend/
  pyproject.toml
  app/
    __init__.py
    main.py
    core/
      config.py
    api/
      __init__.py
      routes_health.py
      routes_settings.py
    services/
      llm/
        __init__.py
        provider.py
        deepseek_provider.py
        factory.py
    tests/
      test_health.py
```

必须实现：

- `GET /health`
- `GET /api/settings/model-status`
- `POST /api/settings/test-model-connection`

### 4.4 Phase 1 验收

前端：

```bash
cd frontend
npm install
npm run dev
npm run build
```

后端：

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
uvicorn app.main:app --reload
```

验收结果：

- 前端可以打开。
- 8 个页面可通过导航切换。
- 后端 `/health` 返回 ok。
- 设置页可以显示模型配置状态。

## 5. Phase 2：数据库和基础 API

### 5.1 目标

实现简历、JD、报告和面试会话的基础数据结构。

### 5.2 后端目录扩展

```text
backend/app/
  db/
    session.py
    base.py
  models/
    resume.py
    job_description.py
    report.py
    interview.py
    agent_run.py
  schemas/
    resume.py
    job_description.py
    match.py
    report.py
    interview.py
  api/
    routes_resumes.py
    routes_jobs.py
    routes_reports.py
```

### 5.3 API

实现：

```text
POST   /api/resumes
GET    /api/resumes
GET    /api/resumes/{resume_id}
DELETE /api/resumes/{resume_id}

POST   /api/jobs
GET    /api/jobs
GET    /api/jobs/{job_id}
DELETE /api/jobs/{job_id}

GET    /api/reports
GET    /api/reports/{report_id}
DELETE /api/reports/{report_id}
```

### 5.4 数据库

MVP 使用 SQLite。

默认数据库文件：

```text
backend/data/careerpilot.db
```

## 6. Phase 3：DeepSeek Provider 和 LangGraph 主流程

### 6.1 目标

实现第一个真正可用的 Agent 工作流：简历/JD 匹配分析。

### 6.2 目录

```text
backend/app/
  agents/
    base/
      runtime.py
    resume_match/
      graph.py
      nodes.py
      state.py
      schemas.py
  prompts/
    resume_parse/v1.yaml
    jd_analysis/v1.yaml
    resume_match/v1.yaml
```

### 6.3 Resume Match Graph

流程：

```text
load_resume
  -> parse_resume
  -> analyze_jd
  -> align_capabilities
  -> score_match
  -> generate_suggestions
  -> validate_risks
  -> persist_report
```

### 6.4 API

实现：

```text
POST /api/matches
GET  /api/matches/{report_id}
```

请求：

```json
{
  "resume_id": "string",
  "job_id": "string"
}
```

返回：

```json
{
  "report_id": "string",
  "overall_score": 82,
  "strengths": [],
  "weaknesses": [],
  "missing_keywords": [],
  "polish_suggestions": []
}
```

## 7. Phase 4：前后端联调

### 7.1 目标

让用户可以在页面中真实完成：

```text
输入简历
输入 JD
点击开始匹配
查看报告
进入简历润色
保存历史报告
```

### 7.2 前端 API

实现：

```text
frontend/src/api/resumes.ts
frontend/src/api/jobs.ts
frontend/src/api/matches.ts
frontend/src/api/reports.ts
```

### 7.3 页面联调

页面：

- `ResumeAnalysisPage`
- `JobMatchPage`
- `ResumePolishPage`
- `ReportsPage`

需要接真实 API。

## 8. Phase 5：模拟面试

### 8.1 目标

实现基于简历和 JD 的多轮模拟面试。

### 8.2 Graph

```text
init_interview
  -> generate_question
  -> wait_user_answer
  -> evaluate_answer
  -> decide_follow_up
  -> generate_follow_up 或 next_question
  -> final_report
```

### 8.3 API

```text
POST /api/interviews
GET  /api/interviews/{session_id}
POST /api/interviews/{session_id}/answer
POST /api/interviews/{session_id}/finish
```

## 9. Phase 6：测试和演示

### 9.1 测试

至少包含：

- `test_health.py`
- `test_model_status.py`
- `test_resume_crud.py`
- `test_job_crud.py`
- `test_match_schema.py`

### 9.2 演示数据

创建：

```text
sample_data/
  resume_backend_ai.md
  jd_ai_agent_engineer.md
```

### 9.3 README 更新

README 必须包含：

- 项目介绍。
- 技术栈。
- 本地启动。
- DeepSeek 配置。
- 前端启动。
- 后端启动。
- 演示流程。

## 10. 开发注意事项

### 10.1 API Key

不要读取或打印真实 API Key。只从 `.env` 读取。

### 10.2 Stitch 页面

Stitch 页面是设计参考，不是最终代码结构。

要保留：

- 中文文案。
- 页面结构。
- 信息密度。
- 主要交互。
- 专业气质。

可以调整：

- 组件拆分。
- 代码结构。
- 路由。
- 局部样式实现。

### 10.3 LangGraph

Graph 代码要可测试，不要把所有逻辑堆到一个节点。

### 10.4 输出结构

所有关键 LLM 输出必须尽量结构化。

包括：

- ResumeProfile。
- JobProfile。
- MatchReport。
- PolishSuggestion。
- InterviewEvaluation。

## 11. 给 Claude Code 的建议执行提示

可以直接向 Claude Code 输入：

```text
请阅读 CLAUDE.md、docs/00_index.md、docs/08_implementation_plan.md，以及 docs/07_llm_provider.md。然后按 Phase 1 开始开发：初始化 frontend 和 backend，把 页面/stitch_markdown_design_system/ 中的 Stitch 页面整理成 React + Vite + TypeScript 前端，搭建 FastAPI 后端，完成 /health、/api/settings/model-status、/api/settings/test-model-connection，并更新 README 的本地启动说明。不要把真实 DeepSeek API Key 写入任何文件。
```

