# 维护与迭代说明

## 1. 为什么要提前设计维护方案

AI Agent 项目最容易出现的问题不是第一版做不出来，而是后续无法维护：

- Prompt 越改越乱。
- 输出格式不稳定。
- 业务逻辑散落在各处。
- 模型升级后效果回退。
- 用户反馈无法转化为迭代依据。
- Agent 出错时不知道错在哪个节点。

因此，本项目从第一天就要把可维护性作为核心目标之一。

## 2. 模块边界

### 2.1 推荐边界

按业务能力拆分：

- resume_parse：简历解析。
- jd_analysis：JD 分析。
- resume_match：匹配评分。
- resume_polish：简历润色。
- project_story：项目包装。
- mock_interview：模拟面试。
- workplace_help：职场沟通。

每个模块内部包含：

- graph.py：LangGraph 流程。
- nodes.py：节点函数。
- state.py：状态定义。
- schemas.py：输入输出结构。
- prompts/：Prompt 文件。
- tests/：模块测试。

### 2.2 禁止做法

不建议：

- 所有 Agent 共用一个 1000 行 prompt。
- 所有节点写在一个 app.py。
- 让前端拼 Prompt。
- 让模型自由输出最终页面需要的结构。
- 在日志里保存完整敏感数据。

## 3. Prompt 版本管理

### 3.1 目录规范

```text
backend/app/prompts/
  resume_match/
    v1.yaml
    v2.yaml
    changelog.md
  mock_interview/
    v1.yaml
    changelog.md
```

### 3.2 Prompt 文件应包含

- name
- version
- task
- system
- user_template
- output_schema
- constraints
- examples

### 3.3 Prompt 修改流程

1. 新增版本，不直接覆盖旧版本。
2. 使用固定测试样例运行。
3. 对比输出质量。
4. 确认无明显回退后再切换默认版本。
5. 在 changelog 记录修改原因。

## 4. 结构化输出维护

所有关键 Agent 输出都应使用结构化 schema。

需要结构化的结果：

- 简历解析结果。
- JD 岗位画像。
- 匹配报告。
- 简历润色建议。
- 面试评价。
- 职场沟通策略。

好处：

- 前端展示稳定。
- 数据库存储清晰。
- 测试容易断言。
- 后续可以做统计分析。

如果模型输出不符合 schema：

1. 先尝试自动修复。
2. 修复失败则重试一次。
3. 再失败则返回降级文本结果，并记录错误。

## 5. 评测集建设

### 5.1 为什么需要评测集

Agent 项目不能只靠主观感觉判断效果。每次修改 Prompt、模型、Graph 节点后，都需要用固定样例评测。

### 5.2 MVP 评测集

建议准备至少 10 组样例：

- 3 份后端开发简历。
- 2 份前端开发简历。
- 2 份 AI 应用开发简历。
- 1 份转行简历。
- 1 份应届生简历。
- 1 份表达很差的简历。

每组包含：

- 简历文本。
- JD 文本。
- 期望识别出的核心技能。
- 期望发现的短板。
- 不允许出现的虚构建议。

### 5.3 评测指标

可以从这些维度打分：

- JSON 格式正确率。
- JD 关键要求识别准确率。
- 简历技能抽取准确率。
- 匹配分合理性。
- 建议可执行性。
- 是否虚构经历。
- 是否泄露隐私。
- 响应耗时。

## 6. 日志和 Trace

### 6.1 必须记录

- agent_run_id
- graph_name
- node_name
- user_id
- prompt_version
- model_name
- latency_ms
- status
- error_message

### 6.2 不建议记录

- 完整简历。
- 完整手机号。
- 完整邮箱。
- API Key。
- 用户未确认导出的敏感报告。

### 6.3 面试展示建议

面试时可以展示一次 Agent 执行 trace：

1. 简历解析节点。
2. JD 分析节点。
3. 能力对齐节点。
4. 评分节点。
5. 润色建议节点。
6. 风险校验节点。
7. 报告生成节点。

这能体现你对 Agent 工程化和可观测性的理解。

## 7. 模型切换策略

### 7.1 为什么不能写死模型

模型能力、价格、延迟都会变化。项目需要支持切换模型。

建议抽象：

- cheap_model：用于简单分类、字段抽取。
- reasoning_model：用于匹配分析、面试评价。
- rewrite_model：用于润色改写。

### 7.2 配置示例

```yaml
llm:
  default_provider: openai
  tasks:
    resume_parse:
      model: cheap_model
    resume_match:
      model: reasoning_model
    resume_polish:
      model: rewrite_model
    mock_interview:
      model: reasoning_model
```

## 8. 数据迁移

从 MVP 开始就应使用迁移工具。

推荐：

- SQLAlchemy + Alembic。
- 数据库字段新增不直接手写 SQL。
- 每次 schema 修改生成 migration。

注意：

- JSON 字段结构变化需要兼容旧数据。
- Prompt 版本和报告 schema 版本要一起保存。
- 删除字段前先确认历史报告是否依赖。

## 9. 测试策略

### 9.1 单元测试

测试：

- schema 校验。
- 文本清洗。
- JD 技能抽取。
- 分数计算。
- 风险规则判断。

### 9.2 Graph 测试

测试：

- Graph 能从 START 跑到 END。
- 缺少信息时能进入补充问题节点。
- 高风险建议能进入人工确认节点。
- 模拟面试能完成多轮循环。

### 9.3 API 测试

测试：

- 简历创建。
- JD 创建。
- 匹配分析。
- 面试会话。
- 报告查询。
- 删除操作。

### 9.4 回归测试

每次改 Prompt 或模型后，运行固定样例，比较：

- 输出字段是否完整。
- 分数是否大幅波动。
- 是否出现虚构经历。
- 是否丢失关键建议。

## 10. 版本路线图

### v0.1 文档与 Demo

- 完成项目文档。
- 准备样例简历和 JD。
- 画出 Agent 流程图。

### v0.2 后端 MVP

- FastAPI 项目初始化。
- SQLite 数据库。
- 简历和 JD CRUD。
- Resume Match Graph 跑通。

### v0.3 前端 MVP

- React 页面。
- 简历输入。
- JD 输入。
- 匹配报告展示。

### v0.4 模拟面试

- Mock Interview Graph。
- 多轮问答。
- 面试报告。

### v0.5 可观测性

- Agent 执行记录。
- 节点日志。
- LangSmith trace。

### v1.0 面试展示版

- 完整 Demo 流程。
- README。
- 部署说明。
- 演示视频或截图。
- 面试讲解稿。

## 11. 长期可扩展方向

后续可以扩展：

- 多简历版本对比。
- 不同岗位一键定制简历。
- 简历 PDF 导出。
- 面试语音输入。
- 面试题知识库。
- 个人成长计划。
- Offer 对比助手。
- 求职进度 Kanban。

建议每次只扩展一个闭环功能，不要同时扩展过多模块。

