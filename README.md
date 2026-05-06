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

### 4. 验证

- 打开 http://localhost:5173 可以看到中文页面
- 左侧导航可切换工作台、简历分析、岗位匹配等 8 个核心页面
- 设置页可查看模型配置状态和测试连接

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
      api/            # API 路由 (health, settings, resumes, jobs, reports)
      services/llm/   # LLM Provider 抽象层
      tests/          # 测试
    data/             # SQLite 数据库文件 (gitignored)
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
