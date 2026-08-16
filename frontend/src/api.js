const API_BASE = import.meta.env.VITE_API_BASE || '';

// 永远返回一个可渲染的对象，绝不把原始错误抛给 UI
export async function askRag(question) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/rag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
  } catch {
    return {
      degraded: true,
      answer: '网络连接失败，请稍后重试。',
      confidence: null,
      data: [],
      audit: null,
    };
  }

  const body = await res.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return {
      degraded: true,
      answer: '响应解析失败，请稍后重试。',
      confidence: null,
      data: [],
      audit: null,
    };
  }
  return body;
}
