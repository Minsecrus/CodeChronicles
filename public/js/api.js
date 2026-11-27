export const store = {
  state: null,
  selectedStageId: 1,
  selectedHeroId: null,
  armoryHeroId: null,
  bagMode: 'equip',
  detailTab: 'stats',
  rosterFilter: 'all',
  battleSpeed: 1,
  isReplaying: false,
  skipRequested: false
};

export const $ = (sel) => document.querySelector(sel);

export function formatNum(n) {
  return Number(n || 0).toLocaleString('zh-CN');
}

export function formatPct(n) {
  return `${(Number(n || 0) * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

export function showToast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 2600);
}

export async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}
