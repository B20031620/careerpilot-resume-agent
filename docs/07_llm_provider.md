# 大模型接入说明

## 1. 文档目标

本文档用于指导后续开发 CareerPilot 职途助手时如何接入大模型。

项目第一版默认接入 DeepSeek，并使用 OpenAI 兼容接口。后续代码生成、后端开发、Agent 节点实现时，应优先读取本文档中的约定。

## 2. 默认模型方案

MVP 默认配置：

| 配置项 | 值 |
| --- | --- |
| Provider | DeepSeek |
| API 格式 | OpenAI-compatible |
| Base URL | `https://api.deepseek.com` |
| 默认模型 | `deepseek-v4-pro` |
| 默认用途 | 简历解析、JD 分析、匹配评分、简历润色、模拟面试、职场沟通 |

真实 API Key 不写入任何项目文档或代码文件，只通过本地环境变量读取。

## 3. 环境变量约定

项目应使用 `.env` 管理本地密钥。

```bash
LLM_PROVIDER=deepseek

DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
```

注意：

- `.env` 必须加入 `.gitignore`。
- `.env.example` 可以提交，但只能放占位符。
- 不要在日志中打印完整 API Key。
- 不要把真实 API Key 写入 README、Markdown 文档、前端代码或测试样例。

## 4. Provider 抽象目标

虽然 MVP 默认使用 DeepSeek，但代码结构必须保留 Provider 抽象，避免后续模型切换困难。

推荐设计：

```text
backend/app/services/llm/
  provider.py
  deepseek_provider.py
  openai_provider.py
  qwen_provider.py
  factory.py
```

其中：

- `provider.py` 定义统一接口。
- `deepseek_provider.py` 实现 DeepSeek OpenAI 兼容调用。
- `factory.py` 根据 `LLM_PROVIDER` 创建具体 Provider。

## 5. 推荐接口设计

```python
from typing import Any, Protocol


class LLMProvider(Protocol):
    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.2,
        response_format: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        ...

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.2,
    ):
        ...
```

## 6. DeepSeek Provider 实现约定

DeepSeek 使用 OpenAI 兼容接口，因此可以使用 OpenAI SDK 的兼容写法。

伪代码：

```python
from openai import AsyncOpenAI


class DeepSeekProvider:
    def __init__(self, api_key: str, base_url: str, default_model: str):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.default_model = default_model

    async def chat(self, messages, *, model=None, temperature=0.2, response_format=None):
        response = await self.client.chat.completions.create(
            model=model or self.default_model,
            messages=messages,
            temperature=temperature,
            response_format=response_format,
        )
        return response.model_dump()
```

正式实现时需要增加：

- 超时设置。
- 重试策略。
- 错误分类。
- Token 使用量记录。
- 请求日志脱敏。
- 结构化输出解析和失败重试。

## 7. 任务级模型配置

不同 Agent 节点对模型能力要求不同。MVP 可以先统一使用 `deepseek-v4-pro`，但配置结构应预留任务级模型。

推荐配置：

```yaml
llm:
  default_provider: deepseek
  default_model: deepseek-v4-pro
  tasks:
    resume_parse:
      model: deepseek-v4-pro
      temperature: 0.1
    jd_analysis:
      model: deepseek-v4-pro
      temperature: 0.1
    resume_match:
      model: deepseek-v4-pro
      temperature: 0.2
    resume_polish:
      model: deepseek-v4-pro
      temperature: 0.4
    project_story:
      model: deepseek-v4-pro
      temperature: 0.4
    mock_interview:
      model: deepseek-v4-pro
      temperature: 0.5
    workplace_help:
      model: deepseek-v4-pro
      temperature: 0.4
```

## 8. LangGraph 中的调用方式

LangGraph 节点不应直接读取环境变量，也不应直接初始化模型客户端。

推荐依赖方向：

```text
Graph Node
  -> Agent Service
  -> LLM Provider Factory
  -> DeepSeek Provider
  -> DeepSeek API
```

节点示例：

```python
async def analyze_jd_node(state: JDAnalysisState, runtime: RuntimeContext):
    llm = runtime.llm_provider
    prompt = runtime.prompt_loader.load("jd_analysis", version="v1")

    messages = prompt.render_messages({
        "jd_text": state["jd_text"],
    })

    result = await llm.chat(
        messages,
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    return {
        "job_profile": parse_job_profile(result),
    }
```

## 9. 前端与模型的关系

前端不能直接调用 DeepSeek API。

正确关系：

```text
Frontend
  -> FastAPI Backend
  -> Agent Service
  -> LLM Provider
  -> DeepSeek API
```

原因：

- 避免 API Key 暴露到浏览器。
- 统一记录 Agent 执行日志。
- 统一处理重试、限流、错误提示。
- 统一保存报告和历史记录。

前端只需要展示：

- 当前模型名称，例如「DeepSeek」。
- Agent 执行状态。
- 错误提示。
- 结果报告。

## 10. 设置页设计约定

产品可以预留「设置」页面，但 MVP 不一定允许普通用户编辑 API Key。

设置页可展示：

- 当前模型服务：DeepSeek。
- 当前模型：deepseek-v4-pro。
- 连接状态：已连接、未配置、连接失败。
- 最近一次调用时间。
- Token 使用量概览。

管理员或本地开发模式下可以提供：

- Base URL 配置。
- 模型名称配置。
- API Key 配置状态。
- 测试连接按钮。

API Key 输入框必须是密码类型，不展示明文。

## 11. 错误处理

常见错误：

| 场景 | 用户提示 |
| --- | --- |
| 未配置 API Key | 当前未配置大模型密钥，请在后端 `.env` 中配置 `DEEPSEEK_API_KEY`。 |
| Base URL 错误 | 模型服务地址不可用，请检查 `DEEPSEEK_BASE_URL`。 |
| 模型名错误 | 当前模型不可用，请检查 `DEEPSEEK_MODEL`。 |
| 请求超时 | 模型响应超时，请稍后重试。 |
| 输出格式错误 | AI 输出格式异常，系统正在尝试重新生成。 |
| 额度不足 | 模型调用失败，可能是额度不足或服务限制。 |

## 12. 日志与安全

日志中可以记录：

- provider。
- model。
- graph_name。
- node_name。
- latency_ms。
- token_usage。
- status。
- error_type。

日志中不能记录：

- 完整 API Key。
- 完整简历原文。
- 完整面试回答。
- 用户手机号、邮箱等隐私信息。

API Key 脱敏展示格式：

```text
sk-****abcd
```

## 13. 后续扩展

后续可以扩展：

- OpenAI Provider。
- Qwen Provider。
- Ollama 本地模型。
- 不同任务使用不同模型。
- 模型调用成本统计。
- 模型输出评测。
- 多模型对比。

但 MVP 阶段不要过度复杂化，先保证 DeepSeek 跑通完整 Agent 主流程。
