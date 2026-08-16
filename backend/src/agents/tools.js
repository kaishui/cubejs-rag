// 工具层（Tool Layer）：每个专业 Agent 只暴露必要的工具，避免工具过多干扰 LLM 决策。
// 这里实现确定性的计算工具；query_cube 由后端直接调用 Cube.js REST API（见 orchestrator）。

export function calculateGrowthRate(current, previous) {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
  return (c - p) / p;
}

export function calculateShare(part, total) {
  const a = Number(part);
  const b = Number(total);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b;
}

// 工具注册表（含描述，供 Agent 提示词引用；execute 为真实实现）
export const TOOLS = [
  {
    name: 'calculate_growth_rate',
    description: '计算增长率 (current - previous) / previous，返回小数（如 0.12 表示 +12%）',
    parameters: { current: 'number', previous: 'number' },
    execute: ({ current, previous }) => calculateGrowthRate(current, previous),
  },
  {
    name: 'calculate_share',
    description: '计算占比 part / total，返回小数',
    parameters: { part: 'number', total: 'number' },
    execute: ({ part, total }) => calculateShare(part, total),
  },
];

// 对时序数据计算逐期增长率，返回 { period, value, growth }
export function enrichGrowth(rows, valueKey, timeKey) {
  const sorted = [...rows].sort((a, b) =>
    String(a[timeKey] ?? '').localeCompare(String(b[timeKey] ?? '')),
  );
  return sorted.map((row, i) => {
    const cur = Number(row[valueKey]);
    const prev = i > 0 ? Number(sorted[i - 1][valueKey]) : null;
    const growth = prev != null && Number.isFinite(prev) && prev !== 0 ? (cur - prev) / prev : null;
    return { period: String(row[timeKey] ?? ''), value: cur, growth };
  });
}
