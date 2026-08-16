import { config } from './config.js';

async function chatCompletion(messages, { temperature = 0, json = false } = {}) {
  if (!config.deepseek.apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置。请在 backend/.env（或环境变量）中设置后重试。');
  }

  const body = {
    model: config.deepseek.model,
    messages,
    temperature,
  };
  if (json) body.response_format = { type: 'json_object' };

  const res = await fetch(`${config.deepseek.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.deepseek.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error('LLM 返回了空内容');
  }
  return content;
}

// 稳健地解析 LLM 输出的 JSON（容忍 markdown 代码块、前后缀噪音）
export function extractJSON(text) {
  if (!text) return {};
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    return {};
  }
}

// 第一步：自然语言 → Cube.js Query JSON
export async function planQuery(question) {
  const { buildQuerySystemPrompt } = await import('./prompt.js');
  const content = await chatCompletion(
    [
      { role: 'system', content: buildQuerySystemPrompt() },
      { role: 'user', content: question },
    ],
    { temperature: 0, json: true },
  );
  return extractJSON(content);
}

// 第二步：查询结果 + 原问题 → 自然语言回答
export async function generateAnswer({ question, query, data }) {
  const { buildAnswerSystemPrompt } = await import('./prompt.js');
  return chatCompletion(
    [
      { role: 'system', content: buildAnswerSystemPrompt() },
      {
        role: 'user',
        content: JSON.stringify({ question, query, data }),
      },
    ],
    { temperature: 0 },
  );
}
