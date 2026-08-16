import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { runCubeQuery } from './cube.js';
import { planQuery, generateAnswer } from './llm.js';
import { SEMANTIC_LAYER } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, model: config.deepseek.model });
});

// 暴露给前端 / 调试用的语义层元数据（LLM 只看到这一层）
app.get('/api/semantic-layer', (_req, res) => {
  res.json(SEMANTIC_LAYER);
});

function clamp01(v) {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null;
}

// 置信度 = LLM 自评（plan.confidence）+ 简单启发式（是否取到数据 / 有无 reasoning）
function computeConfidence(plan, data) {
  const llm = clamp01(Number(plan?.confidence));
  const base = llm ?? 0.6;
  let final = base;

  const dataFound = Array.isArray(data) && data.length > 0;
  if (dataFound) final = Math.min(1, final + 0.1);
  else final = Math.max(0, final - 0.3);

  if (typeof plan?.reasoning === 'string' && plan.reasoning.trim()) {
    final = Math.min(1, final + 0.05);
  }

  return {
    llm: llm === null ? null : Math.round(llm * 100),
    base: Math.round(base * 100),
    dataFound,
    final: Math.round(final * 100),
  };
}

function isValidQuery(query) {
  return (
    !!query &&
    (Array.isArray(query.measures) ||
      Array.isArray(query.dimensions) ||
      Array.isArray(query.timeDimensions))
  );
}

const FRIENDLY_FALLBACK = '抱歉，这个问题我暂时没能回答好。请换一种问法，或稍后再试。';

app.post('/api/rag', async (req, res) => {
  const t0 = Date.now();
  const steps = [];
  const q = String(req.body?.question ?? '').trim();

  // 兜底：永远返回 200 + 友好信息，绝不把原始错误抛给用户
  const graceful = (extra = {}) =>
    res.status(200).json({
      question: q,
      answer: extra.answer ?? FRIENDLY_FALLBACK,
      degraded: true,
      message: extra.message ?? '处理过程中遇到问题',
      detail: extra.detail ?? null,
      confidence: null,
      data: [],
      audit: { steps, totalMs: Date.now() - t0, ...(extra.auditExtra ?? {}) },
    });

  if (!q) {
    return graceful({ answer: '请先输入一个问题。', message: 'question 不能为空' });
  }

  try {
    // ① 自然语言 → Cube.js Query JSON（LLM）；无效时带纠正提示重试一次
    let t = Date.now();
    let plan = await planQuery(q);
    steps.push({ id: 'plan', label: 'LLM 生成查询 JSON', ms: Date.now() - t, ok: true });

    if (!isValidQuery(plan?.query)) {
      t = Date.now();
      plan = await planQuery(q, JSON.stringify(plan));
      steps.push({ id: 'plan_retry', label: 'LLM 重试生成查询 JSON', ms: Date.now() - t, ok: true });
    }

    const query = plan?.query;
    if (!isValidQuery(query)) {
      steps.push({ id: 'validate', label: '查询校验', ms: 0, ok: false, detail: 'LLM 返回的查询 JSON 无效' });
      return graceful({
        message: '查询理解失败',
        detail: 'LLM 返回的查询 JSON 无效',
        auditExtra: { error: 'LLM 返回的查询 JSON 无效' },
      });
    }

    // ② 调用 Cube.js REST API 取数
    t = Date.now();
    const cubeResult = await runCubeQuery(query);
    const data = Array.isArray(cubeResult.data) ? cubeResult.data : [];
    steps.push({ id: 'cube', label: 'Cube.js 取数', ms: Date.now() - t, ok: true, rows: data.length });

    // ③ 查询结果 + 原问题 → 自然语言回答（LLM）
    t = Date.now();
    const answer = await generateAnswer({ question: q, query, data });
    steps.push({ id: 'answer', label: 'LLM 生成答案', ms: Date.now() - t, ok: true });

    const confidence = computeConfidence(plan, data);

    res.json({
      question: q,
      query,
      reasoning: plan?.reasoning ?? null,
      data,
      annotation: cubeResult.annotation ?? null,
      answer,
      confidence: confidence.final,
      audit: { steps, totalMs: Date.now() - t0, confidence },
    });
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
