# Claude Code Project Instructions

你正在开发 `CareerPilot Resume Agent`，一个基于 LangChain + LangGraph + DeepSeek 的 AI 简历润色、岗位匹配、模拟面试和职场沟通 Web App。

请先阅读本文件，再阅读 `docs/00_index.md` 和 `docs/08_implementation_plan.md`，然后开始开发。

## 1. 当前项目状态

当前仓库已有：

- 项目需求文档：`docs/01_requirements.md`
- 用户场景文档：`docs/02_user_scenarios.md`
- Agent 流程图：`docs/03_agent_flows.md`
- 数据结构设计：`docs/04_data_model.md`
- 技术架构说明：`docs/05_architecture.md`
- 维护与迭代说明：`docs/06_maintenance_plan.md`
- 大模型接入说明：`docs/07_llm_provider.md`
- 开发实施计划：`docs/08_implementation_plan.md`
- Stitch 页面设计稿：`页面/stitch_markdown_design_system/`

当前还没有正式前后端代码。需要从文档和 Stitch 导出的 HTML 页面开始搭建 MVP。

## 2. 技术栈约定

MVP 使用：

- Frontend：React + Vite + TypeScript + Tailwind CSS
- Backend：FastAPI + Python
- Agent：LangGraph + LangChain
- LLM：DeepSeek，OpenAI-compatible API
- Database：SQLite
- ORM：SQLAlchemy
- Migration：Alembic 可后置，MVP 可以先用 SQLAlchemy create_all
- Vector DB：第一版可暂不接，预留接口

## 3. DeepSeek 接入约定

默认模型配置见 `docs/07_llm_provider.md`。

必须遵守：

- 使用 `LLM_PROVIDER=deepseek`
- 使用 `DEEPSEEK_BASE_URL=https://api.deepseek.com`
- 使用 `DEEPSEEK_MODEL=deepseek-v4-pro`
- 从 `.env` 读取 `DEEPSEEK_API_KEY`
- 不要把真实 API Key 写入任何文件
- 不要在日志中打印 API Key
- 前端绝不能直接调用 DeepSeek API

调用链路必须是：

```text
Frontend
  -> FastAPI Backend
  -> Agent Service
  -> LLM Provider
  -> DeepSeek API
```

## 4. Stitch 页面资源

Stitch 导出的页面位于：

```text
页面/stitch_markdown_design_system/
```

页面映射：

- `careerpilot_1/code.html`：简历分析
- `careerpilot_2/code.html`：工作台
- `careerpilot_3/code.html`：岗位匹配
- `careerpilot_4/code.html`：简历润色
- `careerpilot_5/code.html`：模拟面试
- `careerpilot_6/code.html`：项目包装
- `careerpilot_7/code.html`：历史报告
- `careerpilot_8/code.html`：职场沟通
- `careerpilot/DESIGN.md`：Stitch 设计系统

开发前端时应复用这些页面的布局、信息结构、中文文案和视觉气质，但不要直接保留重复 HTML 文件。应整理为 React 组件。

## 5. MVP 优先级

第一阶段只做核心闭环：

1. 工作台
2. 简历分析
3. 岗位匹配
4. 简历润色
5. 模拟面试
6. 历史报告
7. 设置页中的模型连接状态

项目包装和职场沟通可以先做静态页面或轻量接口，第二阶段再完善。

核心闭环：

```text
输入简历
  -> 解析简历
  -> 输入 JD
  -> DeepSeek + LangGraph 生成匹配报告
  -> 生成简历润色建议
  -> 进入模拟面试
  -> 保存历史报告
```

## 6. 开发规则

- 保持前后端分离。
- 不要在前端写 Prompt。
- 不要在前端保存 API Key。
- Prompt 放在 `backend/app/prompts/`。
- Agent Graph 放在 `backend/app/agents/`。
- LLM Provider 放在 `backend/app/services/llm/`。
- 数据库模型放在 `backend/app/models/`。
- Pydantic Schema 放在 `backend/app/schemas/`。
- API 路由放在 `backend/app/api/`。
- 前端页面放在 `frontend/src/pages/`。
- 前端复用组件放在 `frontend/src/components/`。
- 前端业务模块放在 `frontend/src/features/`。

## 7. 不要做的事

MVP 阶段不要做：

- 独立 Admin 后台。
- 登录注册复杂权限。
- 支付系统。
- 自动投递简历。
- 招聘网站爬虫。
- PDF/DOCX 完整解析。
- 复杂向量库。
- 多租户系统。

可以预留：

- 设置页。
- 模型配置状态。
- Prompt 版本展示。
- Agent 运行记录。

## 8. 第一轮任务

请按 `docs/08_implementation_plan.md` 的 Phase 1 开始。

第一轮目标：

1. 初始化 `frontend/` 和 `backend/`。
2. 把 Stitch 页面整理成可运行的 React 路由页面。
3. 搭建 FastAPI 项目骨架。
4. 实现健康检查接口。
5. 实现 DeepSeek Provider 的配置读取和连接测试接口。
6. 写清楚本地启动命令。

完成后请运行：

```bash
cd frontend && npm run build
cd ../backend && python -m pytest
```

如果测试还没建立，至少运行后端 import 检查和 FastAPI 启动检查。

## 9. 验收标准

第一轮完成后应满足：

- `frontend` 能启动并看到中文页面。
- 左侧导航可以切换核心页面。
- `backend` 能启动。
- `GET /health` 正常返回。
- `GET /api/settings/model-status` 能返回 DeepSeek 配置状态。
- `.env.example` 可指导用户配置 DeepSeek。
- README 有本地启动说明。

