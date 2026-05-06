# Claude Code Phase 7 指令

请阅读以下文件：

- `CLAUDE.md`
- `README.md`
- `docs/00_index.md`
- `docs/04_data_model.md`
- `docs/08_implementation_plan.md`
- `docs/10_functional_audit.md`
- `backend/app/models/`
- `backend/app/api/`
- `frontend/src/pages/`

现在开始 Phase 7：产品化闭环与真实用户流程修复。

不要继续堆新静态页面。目标是把当前项目变成一个真实用户能用、能找回历史、能隔离数据、能处理失败的求职助手。

## 背景

真实测试发现：

1. 没有用户系统，所有数据混在一起。
2. 简历上传只提取文本，没有真正结构化解析。
3. JD 创建只保存原文，没有真正岗位画像。
4. 真实 DeepSeek 匹配可能超时，前端没有进度、任务状态、重试。
5. 面试会话没有列表，刷新后找不回。
6. 简历润色不是编辑器，不能采纳建议、保存版本或导出。
7. 项目包装和职场沟通仍是静态页面。

## Phase 7 范围

优先完成 P0，不要一次性做完所有幻想功能。

### 1. 用户系统

实现最小可用用户系统：

- 后端新增 `User` 模型。
- 支持注册、登录、获取当前用户。
- 可以使用邮箱 + 密码，密码需哈希。
- 使用 Bearer JWT 或安全的本地 session。
- 前端新增登录/注册页面。
- 未登录时跳转登录页。
- 登录后顶部显示当前用户。

数据隔离：

- `resumes` 增加 `user_id`
- `job_descriptions` 增加 `user_id`
- `reports` 增加 `user_id`
- `interview_sessions` 增加 `user_id`
- 所有 list/get/delete/create API 必须按当前用户过滤。

注意：当前项目没有 Alembic，使用 SQLite + create_all。需要兼容已有本地数据库，不能让应用启动直接崩溃。可以在启动时做轻量 schema migration，或者在 README 里明确开发期重建数据库方式，但不能静默丢用户数据。

### 2. 历史资产管理

新增或完善页面：

- 我的简历：列表、详情、删除、重新解析入口。
- 我的岗位 JD：列表、详情、删除、重新分析入口。
- 历史报告：显示简历标题、岗位标题、公司、分数、状态、创建时间。
- 面试历史：列表、继续面试、查看最终报告。

后端补接口：

- `GET /api/interviews`
- `DELETE /api/interviews/{id}` 或归档接口
- 报告列表返回关联简历/JD标题

### 3. Agent 任务状态

当前匹配分析是同步阻塞，真实模型超时后用户体验很差。

实现最小任务化：

- 新增或完善 `AgentRun`
- 匹配分析创建任务，记录 status: queued/running/succeeded/failed
- 记录 started_at、finished_at、duration_ms、error_message
- 页面可以看到任务状态
- 失败可以重试

可以先不做真正后台队列，但至少要把运行记录、失败记录和前端状态闭环做出来。

### 4. 简历/JD 解析落库

简历上传后不能一直是 `parse_status=pending`。

实现：

- `/api/resumes/{id}/parse`
- 保存 `structured_json`
- parse_status 更新为 processing/succeeded/failed
- 失败保存 parse_warnings 或 error_message

JD：

- `/api/jobs/{id}/analyze`
- 保存 `job_profile_json`
- analysis_status 更新为 processing/succeeded/failed

前端：

- 上传后展示解析状态
- 可以手动点击“重新解析”
- 结构化结果有可读展示

### 5. 简历润色最小闭环

不要做复杂富文本编辑器，先做可用闭环：

- 展示建议列表
- 每条建议有“采纳 / 忽略 / 编辑后采纳”
- 采纳后生成一份新的 resume version
- 新版本可以在“我的简历”中看到

### 6. 质量要求

必须补测试：

- auth tests
- user data isolation tests
- resume upload + parse tests
- job analyze tests
- interview list tests
- report list association tests

必须运行：

- backend pytest
- frontend build

不要把真实 DeepSeek API Key 写入任何文件。
不要提交 `backend/.env`、`backend/data/`、`frontend/dist/`、`node_modules/`。

完成后更新：

- `README.md`
- `docs/10_functional_audit.md` 的状态
- 必要时新增 Phase 7 说明文档

建议提交信息：

`feat: add user-scoped product workflow`

