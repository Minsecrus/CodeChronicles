import { $, api, formatNum, showToast, store } from './api.js';
import { initArmoryView, renderArmory } from './armory-view.js';
import { initBattleView, renderBattlePreview, renderStages } from './battle-view.js';
import { ic, refreshIcons, renderEmblemSvg, resTag } from './emblems.js';
import { initGearModal, renderGearModal } from './gear-modal.js';
import { initRosterView, renderRoster } from './roster-view.js';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('cc_theme', theme);
  const btn = $('#btn-theme');
  if (btn) {
    btn.innerHTML = theme === 'dark' ? ic('sun', 'ic') : ic('moon', 'ic');
    btn.title = theme === 'dark' ? '切换日间模式' : '切换夜间模式';
    refreshIcons();
  }
}

const savedTheme = localStorage.getItem('cc_theme') || 'light';
applyTheme(savedTheme);
$('#btn-theme')?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});

function renderTopBar() {
  const gs = store.state;
  $('#res-diamonds').textContent = formatNum(gs.diamonds);
  $('#res-gold').textContent = formatNum(gs.gold);
  $('#res-exp').textContent = formatNum(gs.exp);
  $('#res-power').textContent = formatNum(gs.teamPower);
}

function renderGacha() {
  const gs = store.state;
  $('#pity-sr-text').textContent = `${gs.pitySr} / 10`;
  $('#pity-sr-bar').style.width = `${Math.min(100, (gs.pitySr / 10) * 100)}%`;
  $('#pity-ssr-text').textContent = `${gs.pitySsr} / 50`;
  $('#pity-ssr-bar').style.width = `${Math.min(100, (gs.pitySsr / 50) * 100)}%`;
}

function renderGachaPulls(pulls) {
  const order = ['violet_gold', 'platinum', 'gold', 'red', 'orange', 'purple', 'blue', 'green', 'gray'];
  const meta = store.state.rarityMeta || {};
  const counts = {};
  pulls.forEach((p) => { counts[p.rarity] = (counts[p.rarity] || 0) + 1; });
  $('#gacha-summary-text').textContent = order
    .filter((r) => counts[r])
    .map((r) => `${meta[r]?.label || r} ${counts[r]}`)
    .join(' · ') || '—';

  $('#gacha-grid').innerHTML = pulls.map((p) => `
    <div class="gacha-pull-card ${p.rarity}">
      <div class="card-top-row" style="justify-content:flex-end">
        <span class="badge ${p.isNew ? 'next' : ''}">${p.isNew ? 'NEW' : resTag('shard', `+${p.shardsGained}`)}</span>
      </div>
      <div style="display:flex;justify-content:center;margin:8px 0">
        ${renderEmblemSvg(p.emblem, p.element)}
      </div>
      <div class="hero-card-name rarity-text-${p.rarity}">${p.name}</div>
      <div class="hero-card-sub" style="justify-content:center">${p.title}</div>
    </div>
  `).join('');

  refreshIcons();
}

function renderAll() {
  if (!store.state) return;
  renderTopBar();
  renderStages();
  renderBattlePreview();
  renderRoster();
  renderArmory();
  renderGacha();
  renderGearModal();
  refreshIcons();
}

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    $(`#tab-${btn.dataset.tab}`).classList.add('active');
    refreshIcons();
  });
});

document.querySelectorAll('[data-pull]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      const res = await api('POST', '/api/gacha', { count: Number(btn.dataset.pull) });
      store.state = res.state;
      renderAll();
      renderGachaPulls(res.pulls);
    } catch (err) {
      showToast(err.message);
    }
  });
});

document.querySelectorAll('[data-gm]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.gm;
    try {
      const res = await api('POST', '/api/gm', { action });
      store.state = res.state;
      renderAll();
      const labels = {
        linus_jeff: 'Linus & Jeff Dean 已上阵',
        resources: '已发海量资源',
        unlock_all: '全图鉴已解锁',
        max_team: '小队已满级满星',
        god_gear: '神装与圣物已发放',
        reset: '存档已重置'
      };
      showToast(labels[action] || '完成');
    } catch (err) {
      showToast(err.message);
    }
  });
});

initBattleView(renderAll);
initRosterView(renderAll);
initArmoryView(renderAll);
initGearModal(renderAll);
refreshIcons();

api('GET', '/api/state')
  .then((res) => {
    store.state = res.state;
    renderAll();
  })
  .catch((err) => showToast(`加载失败: ${err.message}`));
