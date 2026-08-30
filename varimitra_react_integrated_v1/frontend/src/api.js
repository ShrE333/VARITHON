export const LOST_API = import.meta.env.VITE_LOST_API || 'http://127.0.0.1:8000';
export const CROWD_API = import.meta.env.VITE_CROWD_API || 'http://127.0.0.1:8200';

export async function getJson(url, fallback = null) {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  } catch (e) {
    console.warn('API request failed:', url, e);
    return fallback;
  }
}

export async function postJson(url) {
  const r = await fetch(url, { method: 'POST' });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
