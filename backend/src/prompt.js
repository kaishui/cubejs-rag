import { SEMANTIC_LAYER } from './schema.js';

function renderSemanticLayer() {
  const lines = [];
  for (const cube of SEMANTIC_LAYER.cubes) {
    lines.push(`Cube: ${cube.name} — ${cube.title}`);
    lines.push(`说明: ${cube.description}`);
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
  return `你是 HSBC 财务数据查询助手。用户会询问汇丰利润表相关的问题。

你可以使用以下 Cube.js 语义层对象，不要编造任何数字、不要直接写 SQL：

${renderSemanticLayer()}

你的任务：根据用户问题，输出一个 JSON，包含以下字段：
- "question": 复述用户的问题
- "query": 合法的 Cube.js Query JSON
- "reasoning": 简短说明查询思路

规则：
- measures / dimensions 必须用全名，例如 "HsbcIncomeStatement.netInterestIncome"
- 时间维度用 "HsbcIncomeStatement.periodDate"，granularity 用 "year"，dateRange 用 ISO 日期数组（如 ["2023-01-01","2023-12-31"]）
- 需要排序时用 order，例如 {"HsbcIncomeStatement.periodDate":"asc"}
- 只输出 JSON，不要输出其他内容

示例（用户问 2023 年净利息收入）：
{"question":"2023年汇丰净利息收入是多少？","query":{"measures":["HsbcIncomeStatement.netInterestIncome"],"timeDimensions":[{"dimension":"HsbcIncomeStatement.periodDate","granularity":"year","dateRange":["2023-01-01","2023-12-31"]}]},"reasoning":"筛选2023年时间范围，汇总NII。"}`;
}

export function buildAnswerSystemPrompt() {
  return `你是 HSBC 财务数据查询助手。根据用户问题与查询结果，用中文给出简洁、准确的自然语言回答。

规则：
- 只根据提供的查询结果回答，不要编造任何数字
- 金额单位是美元，可换算为“亿美元”便于阅读，但需注明换算关系
- 如果结果为空，明确说明没有匹配到数据`;
}
