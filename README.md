# CareerPilot Resume Agent

基于 LangChain + LangGraph 的 AI 简历润色、JD 匹配分析、模拟面试与职场求助 Agent 项目。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React + Vite + TypeScript + Tailwind CSS |
| 后端 | FastAPI + Python + SQLAlchemy |
| Agent 编排 | LangGraph |
| LLM 集成 | LangChain + DeepSeek (OpenAI-compatible) |
| 数据库 | SQLite (MVP) |

## 本地启动

### 1. 配置 DeepSeek

复制环境变量模板并填入真实 API Key：

```bash
cp .env.example .env
# 编辑 .env，将 DEEPSEEK_API_KEY 替换为你的真实 Key
```

**注意：不要将真实 API Key 提交到 Git 仓库。**

### 2. 启动后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
pip install -e ".[dev]"
pytest                     # 运行测试
uvicorn app.main:app --reload  # 启动开发服务器
```

后端默认运行在 http://localhost:8000，数据库自动创建在 `backend/data/careerpilot.db`。

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 http://localhost:5173，已配置代理将 `/api` 请求转发到后端。

### 4. 前后端联调流程

前后端已完整联调，前端页面通过 API 客户端调用后端接口：

1. **简历分析页** → `POST /api/resumes` 创建简历，展示解析结果
2. **岗位匹配页** → `GET /api/resumes` 选择简历 + 输入 JD → `POST /api/jobs` 创建岗位 → `POST /api/matches` 生成匹配报告
3. **简历润色页** → `GET /api/resumes` + `GET /api/jobs` 选择简历和岗位 → `POST /api/matches` 生成润色建议
4. **历史报告页** → `GET /api/reports` 列表 → `GET /api/matches/{id}` 查看详情 → `DELETE /api/reports/{id}` 删除
5. **设置页** → `GET /api/settings/model-status` 查看配置 + `POST /api/settings/test-model-connection` 测试连接

### 5. 使用 Mock 模式本地演示

无需 DeepSeek API Key 即可体验完整匹配分析流程：

```bash
# 启动后端（使用 Mock LLM）
cd backend
source .venv/bin/activate
USE_MOCK_LLM=true uvicorn app.main:app --reload

# 另一个终端启动前端
cd frontend
npm run dev
```

### 6. 完整 Demo 路线

项目提供了示例数据文件，可快速体验完整流程：

**Step 1 — 启动服务**

```bash
# 终端 1：后端（Mock 模式）
cd backend && source .venv/bin/activate
USE_MOCK_LLM=true uvicorn app.main:app --reload

# 终端 2：前端
cd frontend && npm run dev
```

**Step 2 — 创建简历**

1. 打开 http://localhost:5173
2. 点击左侧「简历分析」
3. 标题输入：`AI工程师_张明`
4. 将 `sample_data/resume_ai_engineer.md` 的内容粘贴到文本框
5. 点击「开始深度解析」

**Step 3 — 创建岗位 & 生成匹配报告**

1. 点击左侧「岗位匹配」
2. 选择刚才创建的简历
3. 岗位名称输入：`高级AI Agent工程师`
4. 公司名输入：`某头部AI公司`
5. 将 `sample_data/jd_ai_agent_engineer.md` 的内容粘贴到 JD 文本框
6. 点击「开始深度匹配」
7. 查看匹配报告：综合评分、技能/项目/经验/表达四维评分、核心优势、关键差距、缺失关键词

**Step 4 — 查看润色建议**

1. 点击左侧「简历润色」
2. 选择同一份简历和岗位
3. 点击「生成润色建议」
4. 左右对比查看原文与 AI 优化建议，注意风险等级标注

**Step 5 — 查看历史报告**

1. 点击左侧「历史报告」
2. 查看所有已生成报告的列表
3. 点击「查看」展开报告详情摘要

**Step 6 — 工作台概览**

1. 点击左侧「工作台」
2. 查看简历数量、岗位数量、报告数量等实时统计

### 7. 验证

- 打开 http://localhost:5173 可以看到中文页面
- 左侧导航可切换工作台、简历分析、岗位匹配等 8 个核心页面
- 工作台展示真实数据统计（简历数、岗位数、报告数）
- 设置页可查看模型配置状态和测试连接
- 运行 `cd frontend && npm run build` 验证前端编译
- 运行 `cd backend && USE_MOCK_LLM=true python -m pytest app/tests/ -v` 验证后端测试（29 个）

## 后端 API

### 系统

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查 |
| GET | `/api/settings/model-status` | 查看模型配置状态 |
| POST | `/api/settings/test-model-connection` | 测试模型连接 |

### 简历

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/resumes` | 创建简历 |
| GET | `/api/resumes` | 获取简历列表 |
| GET | `/api/resumes/{resume_id}` | 获取简历详情 |
| DELETE | `/api/resumes/{resume_id}` | 删除简历（软删除） |

创建简历请求体：

```json
{
  "title": "前端工程师_张三",
  "source_type": "text",
  "raw_text": "简历原文..."
}
```

### 岗位 JD

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/jobs` | 创建 JD |
| GET | `/api/jobs` | 获取 JD 列表 |
| GET | `/api/jobs/{job_id}` | 获取 JD 详情 |
| DELETE | `/api/jobs/{job_id}` | 删除 JD（软删除） |

创建 JD 请求体：

```json
{
  "title": "高级AI工程师",
  "company_name": "字节跳动",
  "raw_text": "岗位描述原文..."
}
```

### 报告

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/reports` | 获取报告列表 |
| GET | `/api/reports/{report_id}` | 获取报告详情 |
| DELETE | `/api/reports/{report_id}` | 删除报告 |

### 匹配分析

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/matches` | 运行简历/JD匹配分析 |
| GET | `/api/matches/{report_id}` | 获取匹配报告详情 |

创建匹配请求体：

```json
{
  "resume_id": "uuid",
  "job_id": "uuid"
}
```

匹配报告包含：overall_score、skill_score、project_score、experience_score、expression_score、strengths、weaknesses、missing_keywords、suggestions、report_markdown。

**Mock 模式**：设置 `USE_MOCK_LLM=true` 环境变量后，匹配分析使用稳定的假数据而不调用 DeepSeek API，适合开发和测试。

**未配置 API Key**：当 `DEEPSEEK_API_KEY` 未配置且 `USE_MOCK_LLM` 未启用时，匹配接口返回 422 错误和友好的配置提示，不会导致 500。

## 项目结构

```
careerpilot-resume-agent/
  frontend/           # React + Vite + TypeScript 前端
    src/
      components/     # 共享组件 (Sidebar, AppLayout, Topbar)
      pages/          # 页面组件
      api/            # API 客户端
      styles/         # 全局样式
  backend/            # FastAPI 后端
    app/
      main.py         # FastAPI 应用入口 (lifespan create_all)
      core/config.py  # 环境变量配置
      db/             # 数据库 (SQLAlchemy session + base)
      models/         # ORM 模型 (Resume, JobDescription, Report, Interview, AgentRun)
      schemas/        # Pydantic 请求/响应 schema
      api/            # API 路由 (health, settings, resumes, jobs, reports, matches)
      agents/         # LangGraph Agent (resume_match graph + nodes + state)
      prompts/        # Prompt YAML 模板 (resume_parse, jd_analysis, resume_match)
      services/llm/   # LLM Provider 抽象层 (含同步 chat_sync 方法)
      tests/          # 测试 (29 个，含真实 LLM 路径 mock 测试)
    data/             # SQLite 数据库文件 (gitignored)
  sample_data/        # 示例数据 (简历 + JD)
  docs/               # 项目文档
  .env.example        # 环境变量模板
```

## 文档目录

- [文档索引](./docs/00_index.md)
- [项目需求书](./docs/01_requirements.md)
- [用户场景文档](./docs/02_user_scenarios.md)
- [Agent 流程图](./docs/03_agent_flows.md)
- [数据结构设计](./docs/04_data_model.md)
- [技术架构说明](./docs/05_architecture.md)
- [维护与迭代说明](./docs/06_maintenance_plan.md)
- [大模型接入说明](./docs/07_llm_provider.md)
- [开发实施计划](./docs/08_implementation_plan.md)
- [Git 与 GitHub 说明](./docs/09_git_github.md)
- [界面设计说明](./docs/design.md)

## 默认大模型方案

项目默认接入 DeepSeek，使用 OpenAI 兼容接口。

- Provider：DeepSeek
- Base URL：https://api.deepseek.com
- 默认模型：deepseek-v4-pro
- 密钥来源：本地 `.env` 文件中的 `DEEPSEEK_API_KEY`

**注意：真实 API Key 不应写入 README、设计文档、代码或提交到 Git 仓库。**
