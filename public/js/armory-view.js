import { $, api, formatNum, formatPct, showToast, store } from './api.js';
import { refreshIcons, renderGearSvg } from './emblems.js';

let onRefreshCb = () => {};

function formatGearStats(stats) {
  const parts = [];
  if (stats.hp) parts.push(`血+${formatNum(stats.hp)}`);
  if (stats.hpPct) parts.push(`血+${formatPct(stats.hpPct)}`);
  if (stats.atk) parts.push(`攻+${formatNum(stats.atk)}`);
  if (stats.atkPct) parts.push(`攻+${formatPct(stats.atkPct)}`);
  if (stats.def) parts.push(`防+${formatNum(stats.def)}`);
  if (stats.defPct) parts.push(`防+${formatPct(stats.defPct)}`);
  if (stats.spd) parts.push(`速+${stats.spd}`);
  if (stats.spdPct) parts.push(`速+${formatPct(stats.spdPct)}`);
  if (stats.critRate) parts.push(`暴+${formatPct(stats.critRate)}`);
  if (stats.critDmg) parts.push(`暴伤+${formatPct(stats.critDmg)}`);
  if (stats.dodgeRate) parts.push(`闪+${formatPct(stats.dodgeRate)}`);
  if (stats.blockRate) parts.push(`挡+${formatPct(stats.blockRate)}`);
  if (stats.blockMitigation) parts.push(`挡减+${formatPct(stats.blockMitigation)}`);
  return parts.join(' · ');
}

export function renderArmory() {
  const gs = store.state;
  const pe = gs.pityEquip || 0;
  const pt = gs.pityTreasure || 0;
  $('#pity-equip-text').textContent = `保底 ${pe}/10`;
  $('#pity-treasure-text').textContent = `保底 ${pt}/10`;
  const eqBar = $('#pity-equip-bar');
  const trBar = $('#pity-treasure-bar');
  if (eqBar) eqBar.style.width = `${Math.min(100, (pe / 10) * 100)}%`;
  if (trBar) trBar.style.width = `${Math.min(100, (pt / 10) * 100)}%`;

  $('#bag-equip-count').textContent = gs.equips.length;
  $('#bag-treasure-count').textContent = gs.treasures.length;

  $('#bag-tab-equip').className = `btn btn-sm ${store.bagMode === 'equip' ? 'btn-primary' : 'btn-outline'}`;
  $('#bag-tab-treasure').className = `btn btn-sm ${store.bagMode === 'treasure' ? 'btn-primary' : 'btn-outline'}`;

  const grid = $('#armory-grid');

  if (store.bagMode === 'equip') {
    if (gs.equips.length === 0) {
      grid.innerHTML = `<div class="empty-detail">暂无外设</div>`;
      refreshIcons();
      return;
    }
    grid.innerHTML = gs.equips.map((eq) => `
      <div class="gear-item-card ${eq.rarity}">
        <div>
          <div class="gear-item-head">
            ${renderGearSvg(eq.slot, eq.rarity)}
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                <strong class="rarity-text-${eq.rarity}" style="font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${eq.name} +${eq.level}</strong>
              </div>
              <div class="muted" style="margin-top:2px">${eq.setName}</div>
            </div>
          </div>
          <div class="gear-item-stats" style="margin-top:9px">${formatGearStats(eq.stats)}</div>
        </div>
      </div>
    `).join('');
  } else {
    if (gs.treasures.length === 0) {
      grid.innerHTML = `<div class="empty-detail">暂无圣物</div>`;
      refreshIcons();
      return;
    }
    grid.innerHTML = gs.treasures.map((tr) => `
      <div class="gear-item-card ${tr.rarity}">
        <div>
          <div class="gear-item-head">
            ${renderGearSvg(tr.slot, tr.rarity)}
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                <strong class="rarity-text-${tr.rarity}" style="font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${tr.name} +${tr.level}</strong>
              </div>
              <div class="muted" style="margin-top:2px">${tr.slotName}${tr.scaleDomainName ? ` · 随${tr.scaleDomainName}变化` : ''}</div>
            </div>
          </div>
          <div class="gear-item-stats" style="margin-top:9px">
            <div>${formatGearStats(tr.stats)}</div>
            <div style="color:var(--text);margin-top:4px"><strong>${tr.passiveName}</strong> · ${tr.passiveDesc}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  refreshIcons();
}

export function initArmoryView(onRefresh) {
  onRefreshCb = onRefresh;

  $('#bag-tab-equip').addEventListener('click', () => {
    store.bagMode = 'equip';
    renderArmory();
  });

  $('#bag-tab-treasure').addEventListener('click', () => {
    store.bagMode = 'treasure';
    renderArmory();
  });

  document.querySelectorAll('[data-forge]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await api('POST', '/api/equip/forge', { count: Number(btn.dataset.forge) });
        store.state = res.state;
        store.bagMode = 'equip';
        onRefreshCb();
        const best = res.forged.map((x) => `[${x.rarity}]${x.name}`).slice(0, 2).join(' ');
        showToast(`获得 ${best}${res.forged.length > 2 ? ' 等' : ''}`);
      } catch (err) { showToast(err.message); }
    });
  });

  document.querySelectorAll('[data-explore]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await api('POST', '/api/treasure/explore', { count: Number(btn.dataset.explore) });
        store.state = res.state;
        store.bagMode = 'treasure';
        onRefreshCb();
        const best = res.explored.map((x) => `[${x.rarity}]${x.name}`).slice(0, 2).join(' ');
        showToast(`获得 ${best}${res.explored.length > 2 ? ' 等' : ''}`);
      } catch (err) { showToast(err.message); }
    });
  });
}
