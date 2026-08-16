import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askRag } from './api.js';
import DataView, { DataTable } from './DataView.jsx';

const EXAMPLES = [
  '5家银行 NII 近五年对比',
  'What was JPMorgan\'s net interest income in 2023?',
  '汇丰近五年总营收趋势',
  '花旗集团 2022 年净利润',
];

let seq = 0;
function uid() {
  seq += 1;
  return `m-${Date.now()}-${seq}`;
}

function ConfidenceBadge({ value }) {
  const v = Number(value);
  const level = v >= 80 ? 'high' : v >= 60 ? 'mid' : 'low';
  const label = v >= 80 ? '高' : v >= 60 ? '中' : '低';
  return (
    <span className={`conf conf-${level}`} title="基于 LLM 自评 + 是否取到数据的启发式置信度">
      置信度 {v}% · {label}
    </span>
  );
}

function AuditLog({ result }) {
  const [open, setOpen] = useState(false);
  const audit = result.audit;
  const steps = audit?.steps ?? [];

  return (
    <div className="audit">
      <button type="button" className="audit-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="audit-caret">{open ? '▾' : '▸'}</span>
        审计日志 Audit log
        {audit?.totalMs != null && <span className="audit-meta">{audit.totalMs} ms</span>}
      </button>

      {open && (
        <div className="audit-body">
          {result.reasoning && (
            <div className="audit-row">
              <div className="audit-label">推理</div>
              <div>{result.reasoning}</div>
            </div>
          )}

          {Array.isArray(audit?.agentResults) && audit.agentResults.length > 0 && (
            <div className="audit-row">
              <div className="audit-label">专业 Agent</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>置信度</th>
                      <th>数据行</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.agentResults.map((a) => (
                      <tr key={a.id}>
                        <td>{a.emoji} {a.title}</td>
                        <td>{a.confidence}%</td>
                        <td>{(a.data || []).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.query && (
            <div className="audit-row">
              <div className="audit-label">查询 JSON</div>
              <pre>{JSON.stringify(result.query, null, 2)}</pre>
            </div>
          )}

          {Array.isArray(result.data) && result.data.length > 0 && (
            <div className="audit-row">
              <div className="audit-label">原始数据</div>
              <DataTable data={result.data} />
            </div>
          )}

          {result.detail && (
            <div className="audit-row">
              <div className="audit-label">备注</div>
              <div className="audit-detail">{result.detail}</div>
            </div>
          )}

          {steps.length > 0 && (
            <div className="audit-row">
              <div className="audit-label">执行步骤</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>步骤</th>
                      <th>状态</th>
                      <th>耗时</th>
                      <th>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((s) => (
                      <tr key={s.id}>
                        <td>{s.label}</td>
                        <td>{s.ok ? '✅' : '❌'}</td>
                        <td>{s.ms} ms</td>
                        <td>{s.rows != null ? `${s.rows} 行` : s.detail ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {audit?.confidence && (
            <div className="audit-row">
              <div className="audit-label">置信度构成</div>
              <div className="conf-detail">
                <span>LLM 自评：{audit.confidence.llm ?? '未提供'}%</span>
                <span>数据命中：{audit.confidence.dataFound ? '是 (+10%)' : '否 (-30%)'}</span>
                <span>最终：{audit.confidence.final}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AssistantMessage({ result }) {
  const degraded = result.degraded === true;
  const hasData = Array.isArray(result.data) && result.data.length > 0;

  return (
    <div className="bubble assistant">
      <div className="bubble-label">助手</div>
      {Array.isArray(result.agents) && result.agents.length > 0 && (
        <div className="agent-badges">
          {result.agents.map((a) => (
            <span key={a.id} className="agent-badge">
              {a.emoji} {a.title}
            </span>
          ))}
        </div>
      )}
      <div className="answer-text markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.answer}</ReactMarkdown>
      </div>

      {typeof result.confidence === 'number' && !degraded && (
        <div className="result-meta">
          <ConfidenceBadge value={result.confidence} />
        </div>
      )}

      {hasData && (
        <div className="data-section">
          <div className="section-title">数据</div>
          <DataView data={result.data} annotation={result.annotation} />
        </div>
      )}

      <AuditLog result={result} />
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function submit(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { id: uid(), role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await askRag(q);
      setMessages((m) => [...m, { id: uid(), role: 'assistant', result: res }]);
    } catch {
      // 防御性兜底：即使 askRag 异常也不展示原始错误
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: 'assistant',
          result: { degraded: true, answer: '抱歉，请求失败，请稍后重试。', confidence: null, data: [], audit: null },
        },
      ]);
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

      <div className="chat" ref={listRef}>
        {messages.length === 0 && (
          <div className="empty">
            <p>向财务语义层提问，例如：</p>
            <div className="examples">
              {EXAMPLES.map((ex) => (
                <button key={ex} className="chip" onClick={() => setInput(ex)} disabled={loading}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="bubble user">
              <div className="bubble-label">你</div>
              {m.text}
            </div>
          ) : (
            <AssistantMessage key={m.id} result={m.result} />
          ),
        )}

        {loading && (
          <div className="bubble assistant typing">
            <div className="bubble-label">助手</div>
            <span className="dots">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="chat-box">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入问题，回车发送…"
          disabled={loading}
          autoFocus
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? '查询中…' : '发送'}
        </button>
      </form>
    </div>
  );
}
