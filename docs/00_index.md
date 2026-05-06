# 文档索引

## 推荐阅读顺序

1. [项目需求书](./01_requirements.md)
   先明确项目目标、MVP 范围、非功能需求和验收标准。

2. [用户场景文档](./02_user_scenarios.md)
   理解目标用户、核心旅程、关键页面和面试演示剧本。

3. [Agent 流程图](./03_agent_flows.md)
   查看每个 LangGraph 工作流的节点、状态、条件分支和循环逻辑。

4. [数据结构设计](./04_data_model.md)
   对照数据库表、实体关系、结构化输出 schema 进行后端开发。

5. [技术架构说明](./05_architecture.md)
   对照前后端分离、API、Agent Service、部署和观测方案搭建工程。

6. [维护与迭代说明](./06_maintenance_plan.md)
   在正式开发前确认 Prompt 版本、评测集、测试、日志和模型切换策略。

7. [大模型接入说明](./07_llm_provider.md)
   明确默认使用 DeepSeek OpenAI 兼容接口、环境变量、Provider 抽象和 LangGraph 调用方式。

8. [开发实施计划](./08_implementation_plan.md)
   给 Claude Code 或其他开发 Agent 使用，说明如何从当前文档和 Stitch 页面落地 MVP。

9. [Git 与 GitHub 说明](./09_git_github.md)
   说明本地 Git 管理、提交规范、GitHub 上传方式和敏感信息保护。

10. [功能测试与产品化缺口审计](./10_functional_audit.md)
   记录真实简历流程测试结果、产品缺口和修复优先级。

11. [Claude Phase 7 指令](./11_claude_phase7_prompt.md)
   给 Claude Code 使用，聚焦用户系统、历史记录、任务状态和真实解析。

12. [界面设计说明](./design.md)
   给 Google Stitch、Figma 或前端开发使用，说明页面设计、组件规范和页面流转。

## 当前文档状态

| 文档 | 用途 | 状态 |
| --- | --- | --- |
| 01_requirements.md | 项目需求书 | 已完成第一版 |
| 02_user_scenarios.md | 用户场景和 Demo 剧本 | 已完成第一版 |
| 03_agent_flows.md | Agent 流程图和节点设计 | 已完成第一版 |
| 04_data_model.md | 数据库与 Schema 设计 | 已完成第一版 |
| 05_architecture.md | 技术架构与 API 设计 | 已完成第一版 |
| 06_maintenance_plan.md | 可持续维护方案 | 已完成第一版 |
| 07_llm_provider.md | DeepSeek 大模型接入说明 | 已完成第一版 |
| 08_implementation_plan.md | Claude Code 开发实施计划 | 已完成第一版 |
| 09_git_github.md | Git 与 GitHub 上传说明 | 已完成第一版 |
| 10_functional_audit.md | 真实流程功能测试与产品化缺口审计 | 已完成第一版 |
| 11_claude_phase7_prompt.md | Claude Code Phase 7 开发指令 | 已完成第一版 |
| design.md | 中文页面设计与流转说明 | 已完成第一版 |

## 开发前检查清单

- 是否确定第一版只做 MVP，不同时扩展太多模块。
- 是否确定前端技术栈，例如 React + Vite 或 Next.js。
- 是否确定后端技术栈，例如 FastAPI + SQLite/PostgreSQL。
- 是否准备好样例简历和样例 JD。
- 是否确认第一版默认使用 DeepSeek Provider。
- 是否准备 `.env.example`，并确保真实密钥不提交。
- 是否准备至少 5 到 10 组测试样例。

## 技术参考

- LangChain Agents 官方文档：https://docs.langchain.com/oss/python/langchain/agents
- LangGraph Persistence 官方文档：https://docs.langchain.com/oss/python/langgraph/persistence
- LangGraph Durable Execution 官方文档：https://docs.langchain.com/oss/python/langgraph/durable-execution
- LangGraph Human-in-the-loop 官方文档：https://docs.langchain.com/oss/python/langgraph/human-in-the-loop
- LangSmith Observability 官方文档：https://docs.langchain.com/langsmith/observability-concepts
