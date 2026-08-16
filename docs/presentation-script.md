# Cube.js 语义层 RAG · 10 分钟演示稿（中英双语）

> 时长：约 10 分钟。每节给出时间轴、英文讲稿与中文讲稿，可按听众切换语言。
> 现场演示环节建议提前本地跑通：`docker compose up -d --build`，打开 http://localhost:5173。

---

## 0:00–1:00 · 开场 / 问题（Opening & Problem）

**EN**
Good morning. Today I'll show how we make an LLM answer financial questions — like "what was JPMorgan's net interest income in 2023" — reliably and safely, using Cube.js as the semantic layer for RAG.

The core problem: if we let an LLM write SQL directly, three things go wrong — the metric definitions become inconsistent, the LLM can hallucinate numbers, and we expose raw database schema. Our answer is simple: the LLM never writes SQL. It only produces a Cube.js query JSON, and our backend executes it against a governed semantic layer.

**中文**
大家好。今天演示的是：如何让 LLM 可靠、安全地回答财务问题——比如「摩根大通 2023 年净利息收入是多少」——方法是把 Cube.js 作为 RAG 的语义层。

核心问题在于：如果让 LLM 直接写 SQL，会出现三个麻烦——指标口径不一致、LLM 会编数字、以及暴露原始表结构。我们的答案是：LLM 不写 SQL，只输出 Cube.js 查询 JSON，由后端在受治理的语义层上执行。

---

## 1:00–2:30 · 架构（Architecture）

**EN**
Here is the flow. A React frontend posts the question to our Node backend. The backend does three steps: first, an LLM turns natural language into a Cube.js query JSON; second, the backend calls the Cube.js REST API to fetch data; third, a second LLM call turns the result plus the original question into a natural-language answer. Cube.js sits in front of PostgreSQL and owns every metric definition.

**中文**
整体流程是：React 前端把问题 POST 给 Node 后端。后端做三步：第一步，LLM 把自然语言转成 Cube.js 查询 JSON；第二步，后端调用 Cube.js REST API 取数；第三步，再把结果和原问题交给 LLM 生成自然语言答案。Cube.js 位于 PostgreSQL 之上，负责所有指标定义。

---

## 2:30–4:00 · 数据与语义层（Data & Semantic Layer）

**EN**
Our demo data is a multi-bank income statement with a focus on NII — net interest income. We have five banks: HSBC, JPMorgan, Bank of America, Citigroup and Wells Fargo, with annual (FY) and half-year (H1) rows.

In Cube.js, each bank is its own cube — `HsbcIncomeStatement`, `JpmorganIncomeStatement`, and so on — all built over one table, filtered by bank. Measures like `netInterestIncome`, `totalRevenue`, `netProfit`, and a `periodDate` time dimension are defined once and reused. This is the key: the metric definition lives in the semantic layer, not in the prompt and not in SQL.

**中文**
演示数据是多银行利润表，聚焦 NII（净利息收入）。我们有五家银行：汇丰、摩根大通、美国银行、花旗和富国银行，含全年（FY）和半年（H1）数据。

在 Cube.js 里，每家银行是一个 cube——`HsbcIncomeStatement`、`JpmorganIncomeStatement` 等等——它们共用同一张表，按 bank 过滤。`netInterestIncome`、`totalRevenue`、`netProfit` 这些指标和时间维度 `periodDate` 定义一次、到处复用。关键点在于：指标定义放在语义层里，而不是放在 prompt 里，也不是放在 SQL 里。

---

## 4:00–6:30 · 现场演示（Live Demo）

**EN**
Let me ask: "What was JPMorgan's net interest income in 2023?" Watch what happens: the model routes to the JPMorgan cube, returns a query JSON, Cube.js returns 89.3 billion, and the answer is generated. You also see a confidence score, a line chart for the trend, and an expandable audit log with the exact query and step timings.

Ask a trend question — "show HSBC's total revenue over the last five years" — and you get a line chart. Ask a single number and you get a table. The chart-table-text priority keeps every answer grounded in the returned data.

**中文**
我来问：「摩根大通 2023 年净利息收入是多少？」注意观察：模型会路由到摩根大通的 cube，返回查询 JSON，Cube.js 返回 893 亿，再生成答案。同时你会看到置信度分数、趋势折线图，以及可展开的审计日志（包含具体查询和每步耗时）。

再问趋势类问题——「汇丰近五年总营收」——会得到折线图；问单值问题则得到表格。折线图 > 表格 > 文字 的优先级，保证每个答案都落在真实返回的数据上。

---

## 6:30–8:00 · 多银行路由（Multi-Bank Routing）

**EN**
The interesting part is routing. Because we expose only the semantic layer, the LLM chooses the right cube from the bank mentioned in the question — JPMorgan maps to `JpmorganIncomeStatement`, HSBC to `HsbcIncomeStatement`. If no bank is named, it defaults to HSBC. The LLM still never writes SQL; it only selects governed members. Invalid output is automatically retried once with a corrective hint.

**中文**
有意思的是路由。因为我们只暴露语义层，LLM 会根据问题中提到的银行选择正确的 cube——摩根大通映射到 `JpmorganIncomeStatement`，汇丰映射到 `HsbcIncomeStatement`；没提到银行时默认汇丰。LLM 依然不写 SQL，只是选择受治理的指标。若输出无效，会自动带纠正提示重试一次。

---

## 8:00–9:00 · NII Finance 扩展（NII Finance Extensions）

**EN**
This is a starting point for NII finance. You can add cubes like `NiiByRegion`, `NiiSensitivity`, `LoanBook` and `DepositBook`, each with its own governed measures. Because the LLM only sees the semantic layer, adding cubes is safe — it expands vocabulary without exposing SQL.

**中文**
这是 NII finance 的起点。可以继续加 `NiiByRegion`（按地区拆分 NII）、`NiiSensitivity`（利率敏感性）、`LoanBook`、`DepositBook` 等 cube，各自带受治理的指标。因为 LLM 只看到语义层，加 cube 是安全的——扩展的是「词汇表」，而不是暴露 SQL。

---

## 9:00–10:00 · 部署与总结（Deployment & Takeaways）

**EN**
Deployment: frontend to Vercel, backend and Cube.js to Render via a blueprint, Postgres on Supabase, all secrets in environment variables, and GitHub Actions drives the deploys.

Three takeaways. First, the LLM produces a query, not SQL — so metrics stay consistent. Second, the semantic layer is a security boundary — the LLM never sees the raw schema. Third, confidence plus the audit log makes every answer verifiable. Thank you — happy to take questions.

**中文**
部署：前端到 Vercel，后端和 Cube.js 用 blueprint 部署到 Render，Postgres 用 Supabase，所有敏感信息放环境变量，GitHub Actions 驱动部署。

三点总结：第一，LLM 产出的是查询而不是 SQL，指标口径统一；第二，语义层就是安全边界，LLM 看不到原始表结构；第三，置信度加审计日志让每个答案都可验证。谢谢，欢迎提问。

---

## 附录：演示命令速查（Quick Reference）

```bash
# 初始化数据（Supabase PostgreSQL）
cd backend && npm run seed && npm run check

# 本地一键启动
docker compose up -d --build

# 原生启动前后端（不用 Docker）
docker compose up -d cubejs          # 仅 Cube.js 用 Docker
cd backend && npm run dev            # :3001
cd frontend && npm run dev           # :5173
```

演示问题示例（Demo questions）：

- `What was JPMorgan's net interest income in 2023?`
- `2023年汇丰净利息收入是多少？`
- `Bank of America 近五年总营收趋势`
- `Citigroup 2022 年净利润`
