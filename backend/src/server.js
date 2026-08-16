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

app.post('/api/rag', async (req, res) => {
  try {
    const { question } = req.body ?? {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'question 必填，且必须是字符串' });
    }

    // ① 自然语言 → Cube.js Query JSON（LLM）
    const plan = await planQuery(question.trim());
    const query = plan?.query;
    if (
      !query ||
      (!Array.isArray(query.measures) &&
        !Array.isArray(query.dimensions) &&
        !Array.isArray(query.timeDimensions))
    ) {
      return res.status(422).json({ error: 'LLM 返回的查询 JSON 无效', raw: plan });
    }

    // ② 调用 Cube.js REST API 取数
    const cubeResult = await runCubeQuery(query);

    // ③ 查询结果 + 原问题 → 自然语言回答（LLM）
    const answer = await generateAnswer({ question, query, data: cubeResult.data });

    res.json({
      question,
      query,
      reasoning: plan?.reasoning ?? null,
      data: cubeResult.data ?? [],
      annotation: cubeResult.annotation ?? null,
      answer,
    });
  } catch (err) {
    console.error('[rag]', err);
    res.status(500).json({ error: err.message });
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
