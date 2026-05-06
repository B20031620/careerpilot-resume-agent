# Agent 流程图

## 1. 总体 Agent 设计

项目采用多个业务 Graph，而不是一个巨大 Agent。

推荐拆分：

- Resume Parse Graph：简历解析。
- JD Analysis Graph：岗位 JD 分析。
- Resume Match Graph：简历与 JD 匹配。
- Resume Polish Graph：简历润色建议。
- Project Story Graph：项目经历包装。
- Mock Interview Graph：模拟面试。
- Workplace Help Graph：职场沟通助手。

这样做的好处：

- 每个 Graph 的状态更清晰。
- Prompt 更容易版本化。
- 测试更容易写。
- 某个模块失败不会影响全部功能。
- 后期可以独立优化某个 Agent。

## 2. 总体业务流程

```mermaid
flowchart TD
    A["用户进入系统"] --> B{"选择任务"}
    B --> C["简历/JD 匹配分析"]
    B --> D["项目经历包装"]
    B --> E["模拟面试"]
    B --> F["职场沟通求助"]

    C --> C1["选择或上传简历"]
    C1 --> C2["输入目标 JD"]
    C2 --> C3["运行 Resume Match Graph"]
    C3 --> C4["生成匹配报告"]
    C4 --> C5["保存历史记录"]

    D --> D1["选择项目经历"]
    D1 --> D2["补充项目背景"]
    D2 --> D3["运行 Project Story Graph"]
    D3 --> D4["生成面试表达稿"]

    E --> E1["选择简历和 JD"]
    E1 --> E2["选择面试类型"]
    E2 --> E3["运行 Mock Interview Graph"]
    E3 --> E4["生成面试复盘报告"]

    F --> F1["输入沟通问题"]
    F1 --> F2["运行 Workplace Help Graph"]
    F2 --> F3["输出沟通策略和话术"]
```

## 3. Resume Parse Graph

### 3.1 目标

将用户上传或粘贴的简历转换为结构化简历对象。

### 3.2 输入

- resume_text
- file_type
- user_id

### 3.3 输出

- structured_resume
- parse_warnings
- missing_fields

### 3.4 流程图

```mermaid
flowchart TD
    START(["START"]) --> A["读取简历文本"]
    A --> B["清洗文本"]
    B --> C["LLM 结构化抽取"]
    C --> D["字段完整性校验"]
    D --> E{"是否缺少关键信息"}
    E -- "是" --> F["生成补充问题"]
    E -- "否" --> G["保存结构化简历"]
    F --> H["等待用户补充"]
    H --> C
    G --> END(["END"])
```

### 3.5 关键节点

| 节点 | 职责 | 是否调用 LLM |
| --- | --- | --- |
| clean_resume_text | 清洗乱码、空行、重复符号 | 否 |
| extract_resume_schema | 抽取结构化字段 | 是 |
| validate_resume_schema | 检查字段完整性 | 否 |
| ask_missing_info | 生成补充问题 | 是 |
| persist_resume | 保存数据库 | 否 |

## 4. JD Analysis Graph

### 4.1 目标

将岗位 JD 转换为岗位画像，用于后续匹配、模拟面试和简历润色。

### 4.2 输入

- jd_text
- target_role
- user_id

### 4.3 输出

- job_profile
- required_skills
- preferred_skills
- responsibilities
- hidden_requirements

### 4.4 流程图

```mermaid
flowchart TD
    START(["START"]) --> A["读取 JD 文本"]
    A --> B["识别岗位名称与方向"]
    B --> C["抽取硬性要求"]
    C --> D["抽取软性要求"]
    D --> E["识别隐含能力"]
    E --> F["生成岗位能力画像"]
    F --> G["保存 JD 分析结果"]
    G --> END(["END"])
```

### 4.5 隐含能力示例

JD 中如果出现：

- “跨部门协作”：需要沟通能力、推进能力。
- “高并发”：需要性能优化、缓存、数据库优化、压测经验。
- “从 0 到 1”：需要需求拆解、架构设计、快速迭代能力。
- “AI 应用落地”：需要 LLM API、RAG、Agent、评测、工程部署经验。

## 5. Resume Match Graph

### 5.1 目标

分析简历与 JD 的匹配度，生成可解释报告。

### 5.2 输入

- structured_resume
- job_profile
- user_preferences

### 5.3 输出

- match_score
- skill_score
- project_score
- experience_score
- expression_score
- strengths
- weaknesses
- missing_keywords
- improvement_suggestions

### 5.4 流程图

```mermaid
flowchart TD
    START(["START"]) --> A["加载结构化简历"]
    START --> B["加载岗位画像"]
    A --> C["能力项对齐"]
    B --> C
    C --> D["技能匹配评分"]
    C --> E["项目匹配评分"]
    C --> F["经验匹配评分"]
    C --> G["表达质量评分"]
    D --> H["综合评分"]
    E --> H
    F --> H
    G --> H
    H --> I["生成优势与短板"]
    I --> J["生成关键词缺失列表"]
    J --> K["生成修改建议"]
    K --> L{"是否存在高风险建议"}
    L -- "是" --> M["进入人工确认"]
    L -- "否" --> N["生成最终报告"]
    M --> N
    N --> O["保存报告"]
    O --> END(["END"])
```

### 5.5 条件分支

高风险建议包括：

- 建议用户添加没有证据支持的经历。
- 建议过度夸大项目结果。
- 建议修改学历、年限、职位等事实信息。
- 建议隐瞒重大经历空白。

遇到高风险建议时，系统不应直接输出成“可复制简历”，而应标记为“需要用户确认事实依据”。

## 6. Resume Polish Graph

### 6.1 目标

针对简历句子生成可解释、可选择、不过度虚构的润色建议。

### 6.2 流程图

```mermaid
flowchart TD
    START(["START"]) --> A["选择需要润色的简历模块"]
    A --> B["识别原句问题"]
    B --> C["判断是否缺少事实信息"]
    C --> D{"信息是否足够"}
    D -- "不足" --> E["向用户提问补充事实"]
    E --> F["用户补充事实"]
    F --> B
    D -- "足够" --> G["生成多个润色版本"]
    G --> H["风险校验"]
    H --> I{"是否可能夸大"}
    I -- "是" --> J["添加风险提示"]
    I -- "否" --> K["输出建议"]
    J --> K
    K --> L["用户接受或拒绝"]
    L --> END(["END"])
```

### 6.3 润色输出格式

每条建议应包含：

- section：简历模块。
- original_text：原文。
- issue：存在的问题。
- revised_text：建议改写。
- rationale：修改原因。
- evidence_needed：是否需要用户补充证据。
- risk_level：low、medium、high。

## 7. Project Story Graph

### 7.1 目标

将项目经历改造成面试可讲的结构化故事。

### 7.2 流程图

```mermaid
flowchart TD
    START(["START"]) --> A["选择项目经历"]
    A --> B["拆解业务背景"]
    B --> C["拆解个人职责"]
    C --> D["拆解技术方案"]
    D --> E["识别项目难点"]
    E --> F["识别结果指标"]
    F --> G{"关键事实是否充足"}
    G -- "否" --> H["追问项目细节"]
    H --> I["用户补充"]
    I --> B
    G -- "是" --> J["生成 STAR 版本"]
    J --> K["生成 30 秒版本"]
    K --> L["生成 2 分钟版本"]
    L --> M["生成面试追问题库"]
    M --> N["保存项目讲解稿"]
    N --> END(["END"])
```

## 8. Mock Interview Graph

### 8.1 目标

模拟真实面试的多轮问答、追问和反馈。

### 8.2 状态字段

- session_id
- resume_id
- jd_id
- interview_type
- current_question
- question_index
- user_answer
- evaluation
- follow_up_needed
- conversation_history
- final_report

### 8.3 流程图

```mermaid
flowchart TD
    START(["START"]) --> A["初始化面试会话"]
    A --> B["生成面试计划"]
    B --> C["生成当前问题"]
    C --> D["等待用户回答"]
    D --> E["评价用户回答"]
    E --> F{"是否需要追问"}
    F -- "是" --> G["生成追问问题"]
    G --> D
    F -- "否" --> H{"是否达到题目数量"}
    H -- "否" --> I["进入下一题"]
    I --> C
    H -- "是" --> J["生成面试总结报告"]
    J --> K["保存会话与报告"]
    K --> END(["END"])
```

### 8.4 追问逻辑

需要追问的情况：

- 用户回答过短。
- 用户只讲结果，没有讲过程。
- 用户只讲技术名词，没有讲为什么这么选。
- 用户回答和 JD 关键能力无关。
- 用户表达中有明显逻辑断层。
- 用户提到高风险内容，例如“我不太清楚，只是参与了一点”。

## 9. Workplace Help Graph

### 9.1 目标

帮助用户处理职场沟通问题，输出策略和话术。

### 9.2 流程图

```mermaid
flowchart TD
    START(["START"]) --> A["读取用户问题"]
    A --> B["识别沟通场景"]
    B --> C["判断风险等级"]
    C --> D{"信息是否足够"}
    D -- "不足" --> E["询问关键背景"]
    E --> F["用户补充背景"]
    F --> B
    D -- "足够" --> G["生成沟通策略"]
    G --> H["生成不同语气话术"]
    H --> I["检查是否合规和得体"]
    I --> J["输出最终建议"]
    J --> END(["END"])
```

## 10. Agent 工程注意事项

### 10.1 状态设计

每个 Graph 应有独立 State，不要所有流程共用一个大 State。

建议：

- 共用字段放到 BaseAgentState。
- 业务字段放到各自 State。
- 用户输入和模型输出分开保存。
- 中间结果和最终报告分开保存。

### 10.2 持久化

LangGraph 支持通过 checkpointer 保存图状态。对于本项目：

- 开发阶段可以使用 SQLite checkpointer。
- 生产阶段可以使用 Postgres checkpointer。
- 每个用户会话使用独立 thread_id。
- 长流程，例如模拟面试，必须支持中断后恢复。

### 10.3 人工确认

适合加入 Human-in-the-loop 的节点：

- 简历事实修改。
- 高风险润色建议。
- 生成可复制的谈薪话术。
- 模拟面试最终报告确认。

### 10.4 可观测性

每次 Agent 执行需要记录：

- graph_name
- node_name
- input_summary
- output_summary
- model_name
- prompt_version
- latency_ms
- token_usage
- error_message

这部分数据后续既能排查问题，也能作为面试展示亮点。

