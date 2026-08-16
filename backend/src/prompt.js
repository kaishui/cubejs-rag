import { SEMANTIC_LAYER, BANK_ROUTING } from './schema.js';

function renderSemanticLayer() {
  const lines = [];
  for (const cube of SEMANTIC_LAYER.cubes) {
    lines.push(`Cube: ${cube.name} — ${cube.title}`);
    lines.push(`Description: ${cube.description}`);
    lines.push('Measures:');
    for (const m of cube.measures) {
      lines.push(`- ${cube.name}.${m.name}: ${m.title}`);
    }
    lines.push('Dimensions:');
    for (const d of cube.dimensions) {
      lines.push(`- ${cube.name}.${d.name}: ${d.title} (type=${d.type})`);
    }
  }
  return lines.join('\n');
}

function renderBankRouting() {
  return BANK_ROUTING.map((b) => `- ${b.bank} / ${b.title} → cube "${b.cube}"`).join('\n');
}

export function buildQuerySystemPrompt() {
  return `You are a financial data query assistant for multi-bank income statement data (net interest income / NII focus). Convert the user's natural-language question into a Cube.js query. Never invent any numbers and never write SQL directly.

Available Cube.js semantic layer — use ONLY these objects:

${renderSemanticLayer()}

Bank routing — choose the cube that matches the bank mentioned in the question:
${renderBankRouting()}

Return ONLY a single JSON object (no markdown fences, no extra text) with exactly these fields:
- "question": string — restate the user's question
- "query": object — a valid Cube.js query
- "reasoning": string — one short sentence explaining the query
- "confidence": number between 0 and 1 — how confident you are that the query matches the question

Rules for "query":
- Use fully-qualified member names of the selected bank cube, e.g. "JpmorganIncomeStatement.netInterestIncome"
- Route to the bank cube matching the question; if no bank is mentioned, default to "HsbcIncomeStatement"
- Put measures in "measures", time filters in "timeDimensions"
- For time, use the selected cube's "periodDate" dimension (e.g. "JpmorganIncomeStatement.periodDate"), granularity "year", and "dateRange" as an ISO date array like ["2023-01-01","2023-12-31"]
- Use "order" for sorting, e.g. {"JpmorganIncomeStatement.periodDate":"asc"}

Example — user asks "What was JPMorgan's net interest income in 2023?":
{"question":"What was JPMorgan's net interest income in 2023?","query":{"measures":["JpmorganIncomeStatement.netInterestIncome"],"timeDimensions":[{"dimension":"JpmorganIncomeStatement.periodDate","granularity":"year","dateRange":["2023-01-01","2023-12-31"]}]},"reasoning":"Routed to the JPMorgan cube and filtered to 2023.","confidence":0.95}`;
}

export function buildAnswerSystemPrompt() {
  return `You are a financial data query assistant for multi-bank income statement data. Given the user's question and the query result, write a concise and accurate answer.

Rules:
- Answer ONLY from the provided result data; never invent any numbers
- State which bank the numbers are for
- Amounts are in US dollars; you may convert to "billion USD" for readability and state the conversion
- Answer in the same language as the user's question
- If the result is empty, say clearly that no matching data was found`;
}
