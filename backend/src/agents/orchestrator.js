// 协调器（Orchestrator）：分类 → 路由到专业 Agent → 并行执行 → 汇总生成最终答案。
// 这是一个轻量状态机（Node 原生实现，等价于 LangGraph 的 classify/agents/aggregate 三节点）。

import { getAgent } from './registry.js';
import { buildAgentQueryPrompt, buildRouterPrompt, buildAggregateSystemPrompt } from './prompts.js';
import { chatCompletion, extractJSON } from '../llm.js';
import { runCubeQuery } from '../cube.js';

function clamp01(v) {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null;
}

function isValidQuery(query) {
  return (
    !!query &&
    (Array.isArray(query.measures) ||
      Array.isArray(query.dimensions) ||
      Array.isArray(query.timeDimensions))
  );
}

// 分类节点：用 LLM 判断问题该交给哪些专业 Agent
async function classify(question) {
  const content = await chatCompletion(
    [
      { role: 'system', content: buildRouterPrompt() },
      { role: 'user', content: question },
    ],
    { temperature: 0, json: true },
  );
  const parsed = extractJSON(content);
  const requested = Array.isArray(parsed.agents) ? parsed.agents : [];
  const agents = requested.map(getAgent).filter(Boolean).filter((a) => !a.placeholder);
  return {
    agents: agents.length ? agents : [getAgent('nii')],
    reasoning: parsed.reasoning ?? null,
  };
}

// 执行单个专业 Agent：专属提示词 → 范围化查询 JSON → Cube.js 取数 → 专属回答
async function runAgent(agent, question) {
  const base = {
    id: agent.id,
    title: agent.title,
    emoji: agent.emoji,
  };

  let content = await chatCompletion(
    [
      { role: 'system', content: buildAgentQueryPrompt(agent) },
      { role: 'user', content: question },
    ],
    { temperature: 0, json: true },
  );
  let plan = extractJSON(content);

  if (!isValidQuery(plan?.query)) {
    content = await chatCompletion(
      [
        { role: 'system', content: buildAgentQueryPrompt(agent) },
        { role: 'user', content: question },
        {
          role: 'user',
          content:
            'Your previous response was not a valid query plan. ' +
            `It was: ${JSON.stringify(plan)}. ` +
            'Return ONLY a valid JSON object with a "query" field containing measures/dimensions/timeDimensions arrays.',
        },
      ],
      { temperature: 0, json: true },
    );
    plan = extractJSON(content);
  }

  if (!isValidQuery(plan?.query)) {
    return {
      ...base,
      degraded: true,
      query: null,
      reasoning: null,
      data: [],
      annotation: null,
      answer: `（${agent.title} Agent 未能生成有效查询）`,
      confidence: 0,
    };
  }

  const cubeResult = await runCubeQuery(plan.query);
  const data = Array.isArray(cubeResult.data) ? cubeResult.data : [];

  const answer = await chatCompletion(
    [
      { role: 'system', content: agent.answerPrompt },
      { role: 'user', content: JSON.stringify({ question, query: plan.query, data }) },
    ],
    { temperature: 0 },
  );

  const llmConf = clamp01(Number(plan.confidence));
  const baseConf = llmConf ?? 0.6;
  let conf = baseConf + (data.length > 0 ? 0.1 : -0.3);
  if (typeof plan.reasoning === 'string' && plan.reasoning.trim()) conf += 0.05;
  conf = Math.min(1, Math.max(0, conf));

  return {
    ...base,
    query: plan.query,
    reasoning: plan.reasoning ?? null,
    data,
    annotation: cubeResult.annotation ?? null,
    answer,
    confidence: Math.round(conf * 100),
  };
}

// 汇总节点：单个 Agent 直接用其答案；多个 Agent 交给 LLM 综合
async function aggregate(question, results) {
  if (results.length === 1) return results[0].answer;
  const content = await chatCompletion(
    [
      { role: 'system', content: buildAggregateSystemPrompt() },
      {
        role: 'user',
        content: JSON.stringify({
          question,
          agentOutputs: results.map((r) => ({ agent: `${r.title} (${r.id})`, answer: r.answer })),
        }),
      },
    ],
    { temperature: 0 },
  );
  return content;
}

export async function runOrchestrator(question) {
  const t0 = Date.now();
  const steps = [];

  const { agents, reasoning: classification } = await classify(question);
  steps.push({ id: 'classify', label: `路由到 ${agents.map((a) => a.title).join('、')}`, ms: Date.now() - t0, ok: true });

  const results = await Promise.all(agents.map((a) => runAgent(a, question)));
  steps.push({ id: 'agents', label: '执行专业 Agent', ms: Date.now() - t0, ok: results.every((r) => !r.degraded) });

  const answer = await aggregate(question, results);
  steps.push({ id: 'aggregate', label: '汇总生成最终答案', ms: Date.now() - t0, ok: true });

  // 供前端折线图/表格使用：取第一个有数据的 Agent 结果
  const primary = results.find((r) => Array.isArray(r.data) && r.data.length > 0) || results[0];

  const confidence = Math.round(
    results.reduce((s, r) => s + (r.confidence ?? 0), 0) / Math.max(1, results.length),
  );

  return {
    question,
    agents: agents.map((a) => ({ id: a.id, title: a.title, emoji: a.emoji })),
    classification,
    answer,
    query: primary?.query ?? null,
    reasoning: primary?.reasoning ?? null,
    data: primary?.data ?? [],
    annotation: primary?.annotation ?? null,
    confidence,
    agentResults: results,
    audit: {
      steps,
      totalMs: Date.now() - t0,
      confidence: {
        final: confidence,
        agents: results.map((r) => ({ id: r.id, confidence: r.confidence })),
      },
      agentResults: results.map((r) => ({
        id: r.id,
        title: r.title,
        emoji: r.emoji,
        query: r.query,
        data: r.data,
        answer: r.answer,
        confidence: r.confidence,
      })),
    },
  };
}
