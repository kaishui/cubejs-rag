const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function askRag(question) {
  const res = await fetch(`${API_BASE}/api/rag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return body;
}
