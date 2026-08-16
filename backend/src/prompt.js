import { SEMANTIC_LAYER } from './schema.js';

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

export function buildQuerySystemPrompt() {
  return `You are a financial data query assistant for HSBC income statement data. Convert the user's natural-language question into a Cube.js query. Never invent any numbers and never write SQL directly.

Available Cube.js semantic layer — use ONLY these objects:

${renderSemanticLayer()}

Return ONLY a single JSON object (no markdown fences, no extra text) with exactly these fields:
- "question": string — restate the user's question
- "query": object — a valid Cube.js query
- "reasoning": string — one short sentence explaining the query
- "confidence": number between 0 and 1 — how confident you are that the query matches the question

Rules for "query":
- Use fully-qualified member names, e.g. "HsbcIncomeStatement.netInterestIncome"
- Put measures in "measures", time filters in "timeDimensions"
- For time, use dimension "HsbcIncomeStatement.periodDate", granularity "year", and "dateRange" as an ISO date array, e.g. ["2023-01-01","2023-12-31"]
- Use "order" for sorting, e.g. {"HsbcIncomeStatement.periodDate":"asc"}

Example — user asks "What was HSBC's net interest income in 2023?":
{"question":"What was HSBC's net interest income in 2023?","query":{"measures":["HsbcIncomeStatement.netInterestIncome"],"timeDimensions":[{"dimension":"HsbcIncomeStatement.periodDate","granularity":"year","dateRange":["2023-01-01","2023-12-31"]}]},"reasoning":"Filter to 2023 and aggregate NII.","confidence":0.95}`;
}

export function buildAnswerSystemPrompt() {
  return `You are a financial data query assistant for HSBC income statement data. Given the user's question and the query result, write a concise and accurate answer.

Rules:
- Answer ONLY from the provided result data; never invent any numbers
- Amounts are in US dollars; you may convert to "billion USD" for readability and state the conversion
- Answer in the same language as the user's question
- If the result is empty, say clearly that no matching data was found`;
}
