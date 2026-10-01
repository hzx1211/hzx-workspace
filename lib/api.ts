/** 轻量 API 封装 */
async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `请求失败 (${r.status})`);
  }
  return r.json();
}

export const api = {
  get: <T,>(url: string) => req<T>(url),
  post: <T,>(url: string, data?: unknown) =>
    req<T>(url, { method: "POST", body: JSON.stringify(data ?? {}) }),
  patch: <T,>(url: string, data: unknown) =>
    req<T>(url, { method: "PATCH", body: JSON.stringify(data) }),
  del: <T,>(url: string) => req<T>(url, { method: "DELETE" }),
};
