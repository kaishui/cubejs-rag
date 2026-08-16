import React, { useState } from 'react';
import { askRag } from './api.js';

const EXAMPLES = [
  '2023年汇丰净利息收入是多少？',
  '汇丰近五年总营收趋势',
  '汇丰 2022 年净利润',
];

function DataTable({ data }) {
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

export default function App() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await askRag(q);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Cube.js RAG · 财务语义层</h1>
        <p className="muted">LLM 只输出 Cube.js Query JSON，后端调用 Cube.js REST API 取数后生成答案。</p>
      </header>

      <form onSubmit={submit} className="chat-box">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：2023年汇丰净利息收入是多少？"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !question.trim()}>
          {loading ? '查询中…' : '提问'}
        </button>
      </form>

      <div className="examples">
        {EXAMPLES.map((ex) => (
          <button key={ex} className="chip" onClick={() => setQuestion(ex)} disabled={loading}>
            {ex}
          </button>
        ))}
      </div>

      {error && <div className="error">错误：{error}</div>}

      {result && (
        <section className="result">
          <div className="answer">
            <h2>回答</h2>
            <p>{result.answer}</p>
          </div>

          <div className="query">
            <h2>Cube.js 查询 JSON</h2>
            <pre>{JSON.stringify(result.query, null, 2)}</pre>
          </div>

          <div className="data">
            <h2>数据</h2>
            <DataTable data={result.data} />
          </div>
        </section>
      )}
    </div>
  );
}
