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
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function fmtX(x, granularity) {
  const s = String(x);
  if (granularity === 'year') return s.slice(0, 4);
  if (granularity === 'month') return s.slice(0, 7);
  return s.slice(0, 10);
}

// 由 annotation 构建列元数据：{ [fullKey]: { kind: measure|dimension|time, shortTitle, format, ... } }
function buildColumnMeta(annotation) {
  const meta = {};
  if (!annotation) return meta;
  const add = (obj, kind) => {
    for (const [k, v] of Object.entries(obj || {})) {
      meta[k] = { kind, ...v };
    }
  };
  add(annotation.measures, 'measure');
  add(annotation.dimensions, 'dimension');
  add(annotation.timeDimensions, 'time');
  return meta;
}

// 去掉冗余的原始时间列：当存在 "Cube.dim.year" 时，隐藏 "Cube.dim"
function visibleColumns(rowKeys, meta) {
  const drop = new Set();
  for (const k of rowKeys) {
    if (meta[k]?.kind === 'time' && k.split('.').length <= 2) {
      const hasGranularity = rowKeys.some((rk) => rk.startsWith(`${k}.`) && meta[rk]?.kind === 'time');
      if (hasGranularity) drop.add(k);
    }
  }
  return rowKeys.filter((k) => !drop.has(k));
}

function columnLabel(key, meta) {
  const m = meta[key];
  if (m?.shortTitle) return m.shortTitle;
  if (m?.title) return m.title;
  return key.split('.').pop();
}

function formatCell(value, key, meta) {
  if (value == null || value === '') return '—';
  const m = meta[key];
  if (!m) return String(value);
  if (m.kind === 'time') return fmtX(value, key.split('.').pop());
  const n = Number(value);
  if (Number.isFinite(n)) {
    if (m.kind === 'measure' && m.format === 'currency') return `$${fmtNum(n)}`;
    return fmtNum(n);
  }
  return String(value);
}

export function DataTable({ data, annotation }) {
  if (!data || data.length === 0) return <p className="muted">（无数据）</p>;
  const meta = buildColumnMeta(annotation);
  const columns = visibleColumns(Object.keys(data[0]), meta);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{columnLabel(c, meta)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c}>{formatCell(row[c], c, meta)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 判断能否画折线图，并构建折线数据：
// 1) 有时间维度 + 数值 measure + ≥2 点；
// 2) 若有类别维度（如 bank）且取值 ≥2，则每个类别一条线（跨银行对比）。
function buildChart(data, annotation) {
  if (!Array.isArray(data) || data.length < 2) return null;

  const rowKeys = Object.keys(data[0]);

  const timeDims = annotation?.timeDimensions ?? {};
  const timeKeys = Object.keys(timeDims).filter((k) => rowKeys.includes(k));
  timeKeys.sort((a, b) => b.split('.').length - a.split('.').length);
  const xKey = timeKeys[0];

  const measures = annotation?.measures ?? {};
  const measureKeys = Object.keys(measures).filter(
    (k) => rowKeys.includes(k) && data.every((r) => Number.isFinite(Number(r[k]))),
  );

  if (!xKey || measureKeys.length === 0) return null;

  const dims = annotation?.dimensions ?? {};
  const groupKeys = Object.keys(dims).filter(
    (k) => rowKeys.includes(k) && !timeKeys.includes(k) && !measureKeys.includes(k),
  );

  const granularity = xKey.split('.').pop();

  // 跨银行/跨类别：每个类别一条线
  if (groupKeys.length > 0) {
    const gKey = groupKeys[0];
    const groups = [...new Set(data.map((r) => String(r[gKey])))];
    if (groups.length >= 2) {
      const yKey = measureKeys[0];
      const indexByGroup = {};
      groups.forEach((g, i) => {
        indexByGroup[g] = `g${i}`;
      });
      const series = groups.map((g, i) => ({ key: `g${i}`, name: g }));

      const byX = {};
      for (const r of data) {
        const x = String(r[xKey]);
        byX[x] = byX[x] || { x };
        byX[x][indexByGroup[String(r[gKey])]] = Number(r[yKey]);
      }
      const points = Object.values(byX).sort((a, b) => (a.x < b.x ? -1 : 1));

      return { xKey, granularity, series, points, grouped: true };
    }
  }

  // 单银行：每个 measure 一条线
  const series = measureKeys.map((k) => ({
    key: k,
    name: measures[k]?.shortTitle || measures[k]?.title || k.split('.').pop(),
  }));
  const points = data.map((r) => {
    const p = { x: String(r[xKey]) };
    for (const s of series) p[s.key] = Number(r[s.key]);
    return p;
  });

  return { xKey, granularity, series, points, grouped: false };
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
        <DataTable data={data} annotation={annotation} />
      </div>
    );
  }

  return <p className="muted">（无数据）</p>;
}
