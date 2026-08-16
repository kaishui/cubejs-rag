// 提示词构建：把每个 Agent 的范围（专属 measure）+ 工具 + 银行路由，动态注入到该 Agent 的查询提示词中。

import { SEMANTIC_LAYER, BANK_ROUTING } from '../schema.js';
import { TOOLS } from './tools.js';
import { ACTIVE_AGENTS } from './registry.js';

// 只保留 Agent 允许的 measure，缩小上下文（即使 Cube.js 有 200 个 cube，Agent 只看自己的子集）
export function filterSemanticLayer(measures) {
  const set = new Set(measures);
  return SEMANTIC_LAYER.cubes
    .map((c) => ({ ...c, measures: c.measures.filter((m) => set.has(m.name)) }))
    .filter((c) => c.measures.length > 0);
}

function renderCubes(cubes) {
  const lines = [];
  for (const c of cubes) {
    lines.push(`Cube: ${c.name} — ${c.title}`);
    lines.push('Measures:');
    for (const m of c.measures) lines.push(`- ${c.name}.${m.name}: ${m.title}`);
    lines.push('Dimensions:');
    for (const d of c.dimensions) lines.push(`- ${c.name}.${d.name}: ${d.title} (type=${d.type})`);
  }
  return lines.join('\n');
}

function renderToolList(toolNames) {
  const byName = new Map(TOOLS.map((t) => [t.name, t]));
  return toolNames
    .map((n) => (n === 'query_cube' ? '- query_cube: query structured financial data from Cube.js' : `- ${n}: ${byName.get(n)?.description ?? ''}`))
    .join('\n');
}

function routingLines() {
  const lines = BANK_ROUTING.map((b) => `- ${b.bank} / ${b.title} → cube "${b.cube}"`);
  lines.push('- Cross-bank comparison → cube "BankIncomeStatement" + dimension "bank"');
  return lines.join('\n');
}

export function buildAgentQueryPrompt(agent) {
  const cubes = filterSemanticLayer(agent.measures);
  return `${agent.systemPrompt}

Available tools (only these):
${renderToolList(agent.tools)}

Available Cube.js objects (use ONLY these; measures are limited to your specialization):
${renderCubes(cubes)}

Bank routing:
${routingLines()}

Return ONLY a single JSON object (no markdown, no extra text) with exactly these fields:
- "question": string — restate the user's question
- "query": object — a valid Cube.js query
- "reasoning": string — one short sentence
- "confidence": number between 0 and 1

Rules for "query":
- Use fully-qualified member names of the selected cube
- Put measures in "measures", group-by in "dimensions", time in "timeDimensions" with granularity "year" and ISO "dateRange"
- Use "order" for sorting
- If no bank is mentioned, default to "HsbcIncomeStatement"`;
}

export function buildRouterPrompt() {
  return `You are a router in a multi-agent financial analysis system. Given the user's question, choose the smallest set of specialized agents that can answer it.

Available agents:
${ACTIVE_AGENTS.map((a) => `- ${a.id}: ${a.title} — ${a.description}`).join('\n')}

Rules:
- NII / 净利息收入 / net interest income → ["nii"]
- 营收 / 总营收 / 非利息收入 / revenue → ["revenue"]
- 净利润 / 税前利润 / 利润 / profit → ["profit"]
- If the question spans multiple domains, return all relevant agent ids.

Return ONLY a JSON object: {"agents":["nii"],"reasoning":"short explanation"}`;
}

export function buildAggregateSystemPrompt() {
  return `You are the orchestrator of a multi-agent financial analysis system. Several specialized agents each produced an answer for the user's question. Combine their outputs into one clear, accurate final answer.

Rules:
- Answer in the same language as the user's question
- Only use the information in the provided agent outputs; never invent numbers
- If only one agent answered, keep its answer essentially as-is
- If multiple agents answered, synthesize them and state which agent each part comes from when helpful`;
}
