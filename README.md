# CareerPilot - AI 求职助手

CareerPilot 是一个基于 LangGraph、RAG 和大语言模型的 AI Agent 求职助手。它不是简单的聊天壳子，而是围绕真实简历做解析、润色、模拟面试和职场沟通生成。

项目重点展示：Agent 流程编排、简历结构化解析、RAG 检索、LLM JSON 输出约束、面试中断恢复、风险审查和前后端工程落地。

## 核心功能

| 功能 | 说明 |
| --- | --- |
| 简历解析 | 上传 DOCX/TXT/MD 简历，提取教育、经历、项目和技能，并结构化展示 |
| AI 简历润色 | 基于简历内容生成逐条修改建议，标记风险等级，避免编造经历 |
| 模拟面试 | AI 根据用户真实简历出题、追问、评分，并生成面试报告 |
| 职场沟通 | 根据场景和语气生成 HR 回复、谈薪、离职沟通等草稿 |
| RAG 记忆 | 将简历片段和润色建议写入向量库，让后续问答更贴近用户经历 |

## AI 设计重点

### 1. 简历解析：规则兜底 + LLM 精修

简历解析分两层：

1. 本地快速解析：用规则提取姓名、电话、邮箱、教育背景和技能关键词，保证上传后能立刻得到可用结果。
2. DeepSeek 精修：调用大模型把散乱简历文本整理成统一 JSON 结构。

为了避免 AI 输出不可控，后端做了三层保护：

- 使用 JSON 模式约束模型输出。
- 使用 schema normalizer 统一字段、类型和嵌套结构。
- 当 LLM 超时或返回异常时，保留本地快速解析结果，不让用户看到空白页面。

### 2. 面试 Agent：LangGraph 编排多轮策略

模拟面试不是固定问答，而是一张 LangGraph 状态图。

主要节点包括：

- `init_interview`：加载简历、初始化难度和话题覆盖。
- `generate_question`：结合 RAG 检索结果生成面试题。
- `evaluate_answer`：评估用户回答，给出评分、优点、问题和追问建议。
- `classify_answer`：根据分数把回答分为 weak、medium、strong。
- `decide_strategy`：动态决定下一题策略。
- `final_report`：汇总所有轮次并生成最终报告。

路由策略示例：

- 回答较弱：降低难度，围绕同一话题继续追问。
- 回答一般：继续深挖细节。
- 回答较强：切换话题并提高难度。
- 连续多次较弱：提前结束并生成复盘建议。

LangGraph 的 checkpoint 能让面试在每道题后暂停，等待用户回答后再恢复执行，适合真实多轮交互。

### 3. RAG：让问题真正围绕用户经历

简历解析完成后，系统会把工作经历、项目经历、技能等片段写入 ChromaDB。面试出题或简历润色时，先检索相关片段，再拼入 Prompt。

这样 AI 不会只问泛泛的问题，而是能围绕用户真实经历发问，例如：

- “你在某个项目里如何处理性能问题？”
- “你负责的模块为什么能体现工程能力？”
- “这段经历是否可以量化成果？”

### 4. 风险审查：避免虚构经历

简历润色不是简单把话写得更夸张。系统会给每条建议标记风险等级：

- low：措辞优化，可以直接使用。
- medium：需要用户确认事实。
- high：可能涉及夸大、编造或无法证明的数据。

高风险建议会进入二次审查，降低求职材料中的不诚信风险。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端 | React + Vite + TypeScript + Tailwind CSS |
| 后端 | FastAPI + SQLAlchemy + SQLite |
| Agent | LangGraph |
| LLM | DeepSeek OpenAI-compatible API |
| RAG | ChromaDB + Doubao Embedding |
| 测试 | pytest + pytest-asyncio |

## 项目结构

```text
careerpilot-resume-agent/
  frontend/                 # React 前端
  backend/                  # FastAPI 后端
    app/
      agents/               # LangGraph Agent
      api/                  # API 路由
      models/               # SQLAlchemy 模型
      prompts/              # Prompt 模板
      services/             # LLM、RAG、Embedding、文件解析等服务
      tests/                # 后端测试
  sample_data/              # 示例数据
```

`docs/` 是本地开发说明资料，不上传到 GitHub。

## 本地启动

### 1. 配置环境变量

```bash
cp .env.example backend/.env
```

在 `backend/.env` 中按需配置：

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
DOUBAO_EMBEDDING_API_KEY=
```

真实 API Key 只放在本地 `.env`，不要提交到 GitHub。

### 2. 启动后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

后端默认地址：`http://127.0.0.1:8000`

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认地址：`http://127.0.0.1:5173`

默认 Demo 账号：

```text
demo@careerpilot.local
demo123456
```

## 测试

后端测试：

```bash
cd backend
DEEPSEEK_API_KEY= USE_MOCK_LLM=true python -m pytest app/tests -q
```

前端构建：

```bash
cd frontend
npm run build
```

## 面试介绍亮点

这个项目适合从以下角度介绍：

- 为什么用 LangGraph，而不是普通 for 循环调用 LLM。
- 如何用 checkpoint 支持多轮面试中断和恢复。
- 如何用 RAG 让 AI 基于真实简历出题。
- 如何约束 LLM 输出稳定 JSON。
- 如何做 AI 失败兜底，保证产品可用。
- 如何做用户数据隔离、历史记录和本地向量检索。
- 如何处理简历润色中的真实性和合规风险。
