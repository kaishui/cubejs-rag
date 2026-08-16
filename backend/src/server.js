import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { runOrchestrator } from './agents/orchestrator.js';
import { AGENTS } from './agents/registry.js';
import { SEMANTIC_LAYER } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, model: config.deepseek.model });
});

// 语义层元数据
app.get('/api/semantic-layer', (_req, res) => {
  res.json(SEMANTIC_LAYER);
});

// 已注册的专业 Agent（供前端/调试）
app.get('/api/agents', (_req, res) => {
  res.json(AGENTS.map(({ id, title, emoji, description, measures, placeholder }) => ({
    id, title, emoji, description, measures, placeholder: !!placeholder,
  })));
});

const FRIENDLY_FALLBACK = '抱歉，这个问题我暂时没能回答好。请换一种问法，或稍后再试。';

app.post('/api/rag', async (req, res) => {
  const t0 = Date.now();
  const q = String(req.body?.question ?? '').trim();

  const graceful = (extra = {}) =>
    res.status(200).json({
      question: q,
      answer: extra.answer ?? FRIENDLY_FALLBACK,
      degraded: true,
      message: extra.message ?? '处理过程中遇到问题',
      detail: extra.detail ?? null,
      confidence: null,
      data: [],
      audit: { steps: [], totalMs: Date.now() - t0, ...(extra.auditExtra ?? {}) },
    });

  if (!q) {
    return graceful({ answer: '请先输入一个问题。', message: 'question 不能为空' });
  }

  try {
    const result = await runOrchestrator(q);
    res.json(result);
  } catch (err) {
    console.error('[rag]', err);
    return graceful({ detail: err.message, auditExtra: { error: err.message } });
  }
});

// 生产部署便利：若 frontend/dist 存在则直接托管前端
const distDir = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(distDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(config.port, () => {
  console.log(`[cubejs-rag] backend listening on http://localhost:${config.port}`);
});
