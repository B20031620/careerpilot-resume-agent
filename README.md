# CareerPilot Resume Agent

基于 LangChain + LangGraph 的 AI 简历润色、JD 匹配分析、模拟面试与职场求助 Agent 项目。

## 项目定位

CareerPilot Resume Agent 不是一个简单的“简历润色聊天机器人”，而是一个面向求职准备场景的 Agent 工作流系统。它围绕简历、岗位 JD、项目经历、面试问答、职场沟通等真实场景，提供可解释、可追踪、可持续维护的智能辅助能力。

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

## 推荐 MVP 范围

第一阶段建议优先完成：

1. 简历上传与结构化解析
2. JD 粘贴与岗位能力分析
3. 简历/JD 匹配评分与优化建议
4. 项目经历面试包装
5. 模拟面试问答与反馈
6. 报告历史记录

## 默认大模型方案

项目默认计划接入 DeepSeek，使用 OpenAI 兼容接口。

- Provider：DeepSeek
- Base URL：https://api.deepseek.com
- 默认模型：deepseek-v4-pro
- 密钥来源：本地 `.env` 文件中的 `DEEPSEEK_API_KEY`

注意：真实 API Key 不应写入 README、设计文档、代码或提交到 Git 仓库。
