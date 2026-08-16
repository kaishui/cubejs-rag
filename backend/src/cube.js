import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function getCubeToken() {
  return jwt.sign({}, config.cubeApiSecret, { expiresIn: '1d' });
}

export async function runCubeQuery(query) {
  const token = getCubeToken();
  const body = JSON.stringify({ query });

  // Cube.js 冷启动 / 查询排队时会返回 {"error":"Continue wait"}（HTTP 200），需要轮询重试。
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const res = await fetch(config.cubeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cube.js HTTP ${res.status}: ${text}`);
    }

    const json = await res.json();
    if (json?.error !== 'Continue wait') {
      return json;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  throw new Error('Cube.js 查询超时（多次返回 Continue wait）');
}
