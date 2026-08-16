import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#38bdf8', '#4ade80', '#facc15', '#f87171', '#a78bfa', '#fb923c'];

export function fmtNum(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function fmtX(x, granularity) {
  const s = String(x);
  if (granularity === 'year') return s.slice(0, 4);
  if (granularity === 'month') return s.slice(0, 7);
  return s.slice(0, 10);
}

export function DataTable({ data }) {
  if (!data || data.length === 0) return <p className="muted">（无数据）</p>;
  const columns = Object.keys(data[0]);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c}>{String(row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 判断能否画折线图：有 1 个时间维度 + 至少 1 个数值 measure + 至少 2 个点
function buildChart(data, annotation) {
  if (!Array.isArray(data) || data.length < 2) return null;

  const rowKeys = Object.keys(data[0]);
  const timeDims = annotation?.timeDimensions ?? {};
  const timeKeys = Object.keys(timeDims).filter((k) => rowKeys.includes(k));
  if (timeKeys.length === 0) return null;
  // 优先取带 granularity 后缀的键（如 ...periodDate.year），标签更友好
  timeKeys.sort((a, b) => b.split('.').length - a.split('.').length);
  const xKey = timeKeys[0];

  const measures = annotation?.measures ?? {};
  const series = Object.keys(measures)
    .filter((k) => rowKeys.includes(k))
    .filter((k) => data.every((r) => Number.isFinite(Number(r[k]))))
    .map((k) => ({
      key: k,
      name: measures[k]?.shortTitle || measures[k]?.title || k.split('.').pop(),
    }));
  if (series.length === 0) return null;

  const points = data.map((r) => {
    const p = { x: r[xKey] };
    for (const s of series) p[s.key] = Number(r[s.key]);
    return p;
  });

  return { xKey, granularity: xKey.split('.').pop(), series, points };
}

function ChartView({ chart }) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chart.points} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="x"
            tickFormatter={(v) => fmtX(v, chart.granularity)}
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis tickFormatter={fmtNum} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} width={70} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            labelFormatter={(v) => fmtX(v, chart.granularity)}
            formatter={(value, name) => [fmtNum(value), name]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {chart.series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORS[i % COLORS.length] }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// 展示优先级：折线图 > 表格 > 文字兜底（无数据）
export default function DataView({ data, annotation }) {
  const chart = useMemo(() => buildChart(data, annotation), [data, annotation]);

  if (chart) {
    return (
      <div>
        <span className="view-tag">折线图</span>
        <ChartView chart={chart} />
      </div>
    );
  }

  if (Array.isArray(data) && data.length > 0) {
    return (
      <div>
        <span className="view-tag">表格</span>
        <DataTable data={data} />
      </div>
    );
  }

  return <p className="muted">（无数据）</p>;
}
