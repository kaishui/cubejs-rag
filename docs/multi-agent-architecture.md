# 多智能体架构（Multi-Agent Architecture）

基于 Cube.js 语义层的财务报告 RAG，采用**分层多智能体**架构。本实现为 Node.js 原生轻量状态机（等价于 LangGraph 的 classify / agents / aggregate 三节点），不引入额外编排框架。

## 架构

```
用户界面 (React)
      │  POST /api/rag { question }
      ▼
协调器 Orchestrator（backend/src/agents/orchestrator.js）
      │  ① classify：LLM 判断该由哪些专业 Agent 处理
      │  ② 并行执行命中的专业 Agent
      │  ③ aggregate：汇总各 Agent 结果 → 最终答案
      ▼
专业 Agent（backend/src/agents/registry.js）
  - NII 分析 / 营收分析 / 利润分析（已实现）
  - 风险分析 / 文本解读（占位，待接入数据）
      │  每个 Agent：专属提示词 + 专属 measure 范围 + 专属工具
      ▼
工具层（backend/src/agents/tools.js）
  - query_cube（调用 Cube.js REST API）
  - calculate_growth_rate / calculate_share（确定性计算）
      ▼
数据层
  - Cube.js（多银行语义层，6 个 cube）
  - Supabase PostgreSQL（public.bank_income_statement）
```

## 关键文件

| 文件 | 职责 |
| --- | --- |
| `backend/src/agents/registry.js` | 专业 Agent 定义（提示词 / measure 范围 / 工具） |
| `backend/src/agents/orchestrator.js` | 协调器：分类、路由、并行执行、汇总 |
| `backend/src/agents/prompts.js` | 范围化提示词与路由/汇总提示词 |
| `backend/src/agents/tools.js` | 工具层（确定性计算工具） |

## 专业 Agent

每个 Agent 只关注一个窄领域，通过 `measures` 声明自己的 Cube 范围——即使 Cube.js 里有 200 个 cube，Agent 的提示词上下文也只包含自己允许的 measure 子集。

| Agent | 职责 | 允许 measure | 工具 |
| --- | --- | --- | --- |
| 📈 NII 分析 | 净利息收入趋势/增长/跨银行对比 | `netInterestIncome` | query_cube, calculate_growth_rate, calculate_share |
| 💰 营收分析 | 总营收/非利息收入趋势与构成 | `totalRevenue`, `nonInterestIncome` | query_cube, calculate_growth_rate, calculate_share |
| 🧾 利润分析 | 净利润/税前利润 | `netProfit`, `profitBeforeTax` | query_cube, calculate_growth_rate |
| 🛡️ 风险分析 | 信用/市场风险（占位） | — | 待接入 |
| 📄 文本解读 | PDF/新闻观点提取（占位） | — | 待接入向量检索 |

## 协调器流程

1. **分类**：`buildRouterPrompt()` 让 LLM 从 Agent 列表中选择最小集合（如「净利润」→ `["profit"]`，混合问题 → 多个）。
2. **并行执行**：`Promise.all` 运行命中的 Agent；每个 Agent 独立完成「范围化查询 → Cube.js 取数 → 专属回答」。
3. **汇总**：单个 Agent 直接用其答案；多个 Agent 用 `buildAggregateSystemPrompt()` 综合。

返回结构含 `agents`（命中的 Agent）、`agentResults`（各 Agent 的 query/data/answer/confidence）、`answer`（最终答案）。

## 新增接口

- `GET /api/agents`：列出已注册的 Agent。
- `POST /api/rag`：现由协调器处理（向后兼容，单领域问题会路由到单个 Agent）。

## 演进路径

1. ✅ 单一语义层 + 银行路由（已实现）
2. ✅ 协调器 + 专业 Agent（本分支）
3. ⬜ 接入风险数据 cube（CreditRisk / MarketRisk）启用风险 Agent
4. ⬜ 接入向量检索（pgvector）启用文本解读 Agent
5. ⬜ 引入自反思循环（答案不完整时重路由）
