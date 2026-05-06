# Git 与 GitHub 说明

## 1. 当前 Git 状态

本项目已经初始化为 Git 仓库。

当前分支：

```bash
main
```

初始提交：

```bash
chore: initialize CareerPilot project docs
```

## 2. 敏感信息保护

项目已经包含 `.gitignore`，会忽略：

- `.env`
- `.env.*`
- `.DS_Store`
- Python 缓存
- Node 构建产物
- `node_modules`

真实 DeepSeek API Key 只能写入本地 `.env`，不能提交到 GitHub。

`.env.example` 可以提交，因为它只包含占位符：

```bash
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

提交前建议检查：

```bash
git status
rg -n "sk-|DEEPSEEK_API_KEY=.*[A-Za-z0-9]{20,}" .
```

如果看到真实 key，必须先删除或替换再提交。

## 3. 日常 Git 命令

查看状态：

```bash
git status
```

查看修改：

```bash
git diff
```

添加修改：

```bash
git add .
```

提交：

```bash
git commit -m "feat: add resume match API"
```

查看提交历史：

```bash
git log --oneline --decorate -10
```

## 4. 推荐提交规范

建议使用简洁的 Conventional Commit 风格：

```text
feat: add resume parsing page
fix: handle DeepSeek connection error
docs: update implementation plan
chore: initialize frontend project
refactor: split match graph nodes
test: add resume match schema tests
```

常用类型：

- `feat`：新增功能。
- `fix`：修复问题。
- `docs`：文档修改。
- `chore`：工程配置、依赖、脚手架。
- `refactor`：重构。
- `test`：测试。

## 5. 上传到 GitHub：网页方式

如果没有安装 GitHub CLI，可以使用网页创建仓库。

步骤：

1. 打开 GitHub。
2. 点击 New repository。
3. 仓库名建议：

```text
careerpilot-resume-agent
```

4. 选择 Public 或 Private。
5. 不要勾选初始化 README、`.gitignore`、License，因为本地已经有文件。
6. 创建仓库后，GitHub 会给出远程地址。

然后在本地运行：

```bash
git remote add origin https://github.com/<你的用户名>/careerpilot-resume-agent.git
git push -u origin main
```

如果你使用 SSH：

```bash
git remote add origin git@github.com:<你的用户名>/careerpilot-resume-agent.git
git push -u origin main
```

## 6. 上传到 GitHub：GitHub CLI 方式

当前本机未检测到 `gh` 命令。如果后续安装 GitHub CLI，可以用下面方式一键创建并推送。

安装：

```bash
brew install gh
```

登录：

```bash
gh auth login
```

创建并推送公开仓库：

```bash
gh repo create careerpilot-resume-agent --public --source=. --remote=origin --push
```

创建并推送私有仓库：

```bash
gh repo create careerpilot-resume-agent --private --source=. --remote=origin --push
```

## 7. GitHub 仓库建议

仓库名：

```text
careerpilot-resume-agent
```

描述：

```text
AI career assistant built with LangGraph, LangChain, FastAPI, React, and DeepSeek.
```

Topics：

```text
langgraph
langchain
fastapi
react
deepseek
ai-agent
resume
interview
career
```

## 8. 分支策略

MVP 阶段可以简单使用：

- `main`：稳定可演示版本。
- `dev`：开发分支，可选。

如果只有一个人开发，也可以先只用 `main`，每完成一个阶段提交一次。

建议阶段提交：

```text
chore: initialize frontend and backend
feat: add DeepSeek provider
feat: add resume and job CRUD APIs
feat: add resume match graph
feat: connect frontend match workflow
feat: add mock interview workflow
docs: add demo guide
```

