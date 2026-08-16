# cubejs-rag

把 **Cube.js 作为 RAG 的语义层**：LLM 不直接写 SQL，而是根据定义的指标/维度输出 **Cube.js Query JSON**，由 Node 后端调用 Cube.js REST API 取数，再生成自然语言答案。

- 指标口径统一、安全（LLM 只见语义层，不见原始表结构/SQL）
- 便于后续扩展 NII finance 场景（NiiByRegion / NiiSensitivity / LoanBook / DepositBook …）

## 架构

```
React + Vite 前端
      │  POST /api/rag { question }
      ▼
Node.js 后端（backend/）
      │  ① DeepSeek：自然语言 → Cube.js Query JSON
      │  ② 调用 Cube.js REST API /cubejs-api/v1/load
      │  ③ DeepSeek：查询结果 + 原问题 → 自然语言答案
      ▼
Cube.js（语义层，cubejs/model/）
      ▼
Supabase PostgreSQL（public.hsbc_income_statement，演示用近似数据）
```

## 目录结构

```
.
├── data/init.sql                 # 建表 + 示例数据（幂等，可重复执行）
├── cubejs/
│   ├── model/HsbcIncomeStatement.js   # 语义层（measures / dimensions）
│   └── Dockerfile                # Render 部署用：把 model 打进镜像
├── backend/                      # Node.js RAG 服务（Express）
│   ├── src/  (server / cube / llm / prompt / schema / config)
│   ├── scripts/ (seed / check)
│   └── Dockerfile
├── frontend/                     # React + Vite 聊天界面
├── docker-compose.yml            # 本地一键启动 cubejs + backend + frontend
├── render.yaml                   # Render Blueprint（部署 cubejs + backend）
└── .github/workflows/deploy.yml  # GitHub Actions：Vercel + Render
```

## 本地运行

前置：Docker（跑 Cube.js）、Node ≥ 18。

### 1. 准备环境变量（敏感信息只放 env）

```bash
cp .env.example .env          # 填 Supabase / Cube.js / DeepSeek 配置
cp backend/.env.example backend/.env
```

`.env` 与 `backend/.env` 均已被 `.gitignore` 忽略，**绝不提交**。

### 2. 初始化数据（Supabase PostgreSQL）

```bash
cd backend && npm install && npm run seed && npm run check
```

`seed` 会执行 `data/init.sql`（建表 + UPSERT 5 行演示数据），`check` 打印表内容。

### 3. 一键启动

```bash
docker compose up -d --build
```

- 前端 http://localhost:8080
- 后端 http://localhost:3001/health
- Cube.js http://localhost:4000

> Cube.js v1.6（`cubejs/cube:latest`）从 `/cube/conf/model/` 读取数据模型，且数据库密码环境变量是 **`CUBEJS_DB_PASS`**（不是 `CUBEJS_DB_PASSWORD`）。已在 `docker-compose.yml` 中正确配置。

### 4. 本地开发（不用 Docker 跑前后端）

```bash
# 终端 1：仅起 Cube.js
docker compose up -d cubejs

# 终端 2：后端
cd backend && npm run dev          # :3001

# 终端 3：前端（Vite 代理 /api → :3001）
cd frontend && npm install && npm run dev   # :5173
```

## 环境变量 / Secrets

| 变量 | 用途 | 位置 |
| --- | --- | --- |
| `DATABASE_URL` | 后端直连 Supabase PostgreSQL（事务池 6543） | backend `.env`、seed/check |
| `CUBEJS_DB_HOST/PORT/NAME/USER/PASS/SSL` | Cube.js 连接同一 PostgreSQL（建议会话池 5432） | 根 `.env` |
| `CUBEJS_API_SECRET` | Cube.js JWT 签名密钥 | 根/backend `.env`、Render、GitHub |
| `DEEPSEEK_API_KEY` | DeepSeek（OpenAI 兼容） | backend `.env`、Render、GitHub |
| `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL` | 默认 `https://api.deepseek.com/v1` / `deepseek-chat` | 可选 |
| `VITE_API_BASE` | 前后端分离部署时的后端地址 | Vercel 项目环境变量 |

## 部署（GitHub Actions）

目标：**前端 Vercel + 后端/Cube.js Render**，Postgres 用已有的 Supabase。

### 后端 + Cube.js（Render）

1. Render → New → **Blueprint** → 选择本仓库（自动读取 `render.yaml`）。
2. 在面板中填写 `sync: false` 的敏感项：`CUBEJS_DB_HOST / USER / PASS`、`DEEPSEEK_API_KEY`（`CUBEJS_API_SECRET` 会自动生成并在两服务间共享）。
3. 部署完成后记下 backend 服务的域名（`https://<backend>.onrender.com`）。

### 前端（Vercel）

1. Vercel 新建项目 → 导入本仓库，Root Directory 设为 `frontend`。
2. 在 Project → Settings → Environment Variables (Production) 添加：
   `VITE_API_BASE = https://<backend>.onrender.com`
3. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加：
   `VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`（在 Vercel 团队/项目设置里取）。
4. 若用 Deploy Hook 触发 Render（非自动部署），另加 `RENDER_CUBEJS_DEPLOY_HOOK`、`RENDER_BACKEND_DEPLOY_HOOK`。

推送 `main`（或手动 Run workflow）即触发 `.github/workflows/deploy.yml`。

> 提示：Render 免费层服务闲置会休眠、冷启动较慢（后端已内置对 Cube.js `Continue wait` 的轮询重试）；如遇内部互通问题，可把 backend 的 `CUBEJS_URL` 改为 Cube.js 的公网 `https://<cubejs>.onrender.com/cubejs-api/v1/load`。

## RAG 流程

1. `POST /api/rag { question }`
2. 后端用 `backend/src/prompt.js` 里由 `backend/src/schema.js` 渲染的语义层元数据，调 DeepSeek 生成 `{ question, query, reasoning }`（只输出 JSON，不编数字）。
3. 解析 `query`，调用 Cube.js `/cubejs-api/v1/load`（JWT 认证）。
4. 将 `result.data` + 原问题再交给 DeepSeek，生成自然语言答案。
5. 返回 `{ question, query, reasoning, data, annotation, answer }`。

调试接口：`GET /api/semantic-layer` 查看暴露给 LLM 的语义层。

## 注意事项

- `data/init.sql` 是**演示用近似数据**，非真实财报；单位是美元。
- 财务数据每个报告期通常一行，`sum` 聚合安全；引入多维度分类后需重新评估聚合方式。
- cube 数量多时，建议改用 Cube.js Meta API（`GET /cubejs-api/v1/meta`）动态生成 LLM prompt，而不是在 `schema.js` 手工维护。
- 只暴露语义层给 LLM，避免 LLM 生成错误 SQL / 越权访问。
