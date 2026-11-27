import { $, api, formatNum, formatPct, showToast, store } from './api.js';
import { ic, refreshIcons, renderGearSvg, resTag } from './emblems.js';

let onRefreshCb = () => {};
let modalState = null;

function formatGearStats(stats) {
  const parts = [];
  if (stats.hp) parts.push(`生命 +${formatNum(stats.hp)}`);
  if (stats.hpPct) parts.push(`生命 +${formatPct(stats.hpPct)}`);
  if (stats.atk) parts.push(`攻击 +${formatNum(stats.atk)}`);
  if (stats.atkPct) parts.push(`攻击 +${formatPct(stats.atkPct)}`);
  if (stats.def) parts.push(`防御 +${formatNum(stats.def)}`);
  if (stats.defPct) parts.push(`防御 +${formatPct(stats.defPct)}`);
  if (stats.spd) parts.push(`速度 +${stats.spd}`);
  if (stats.spdPct) parts.push(`速度 +${formatPct(stats.spdPct)}`);
  if (stats.critRate) parts.push(`暴击 +${formatPct(stats.critRate)}`);
  if (stats.critDmg) parts.push(`暴伤 +${formatPct(stats.critDmg)}`);
  if (stats.dodgeRate) parts.push(`闪避 +${formatPct(stats.dodgeRate)}`);
  if (stats.blockRate) parts.push(`格挡 +${formatPct(stats.blockRate)}`);
  if (stats.blockMitigation) parts.push(`格挡减伤 +${formatPct(stats.blockMitigation)}`);
  return parts;
}

const FIB_RESONANCE = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 102, 116, 131, 147, 164];

function getDomainResonanceMult(domainValue) {
  const idx = Math.max(0, Math.min(FIB_RESONANCE.length - 1, Math.round(Number(domainValue ?? 5)) - 1));
  return 1 + FIB_RESONANCE[idx] * 0.006;
}

function getTreasureStatsForHero(item, hero) {
  const base = item.stats || {};
  if (!item.scaleDomain || !hero?.domains) return base;
  const mult = getDomainResonanceMult(hero.domains[item.scaleDomain]);
  return {
    hp: base.hp ? Math.round(base.hp * mult) : 0,
    atk: base.atk ? Math.round(base.atk * mult) : 0,
    def: base.def ? Math.round(base.def * mult) : 0,
    spd: base.spd ? Math.round(base.spd * mult) : 0,
    hpPct: base.hpPct ? Number((base.hpPct * mult).toFixed(3)) : 0,
    atkPct: base.atkPct ? Number((base.atkPct * mult).toFixed(3)) : 0,
    defPct: base.defPct ? Number((base.defPct * mult).toFixed(3)) : 0,
    spdPct: base.spdPct ? Number((base.spdPct * mult).toFixed(3)) : 0,
    critRate: base.critRate ? Number((base.critRate * mult).toFixed(3)) : 0,
    critDmg: base.critDmg ? Number((base.critDmg * mult).toFixed(3)) : 0,
    dodgeRate: base.dodgeRate ? Number((base.dodgeRate * mult).toFixed(3)) : 0,
    blockRate: base.blockRate ? Number((base.blockRate * mult).toFixed(3)) : 0,
    blockMitigation: base.blockMitigation ? Number((base.blockMitigation * mult).toFixed(3)) : 0
  };
}

export function openGearModal(heroId, kind, slot) {
  modalState = { heroId, kind, slot };
  renderGearModal();
}

export function closeGearModal() {
  modalState = null;
  $('#gear-modal-backdrop')?.classList.add('hidden');
}

export function renderGearModal() {
  const backdrop = $('#gear-modal-backdrop');
  const modal = $('#gear-modal');
  if (!modalState || !store.state) {
    backdrop?.classList.add('hidden');
    return;
  }

  const gs = store.state;
  const hero = gs.heroes.find((h) => h.id === modalState.heroId);
  if (!hero) {
    closeGearModal();
    return;
  }

  const isEquip = modalState.kind === 'equip';
  const slot = modalState.slot;
  const slotLabel = isEquip ? gs.equipSlotNames[slot] : gs.treasureSlotNames[slot];
  const current = isEquip ? hero.equipSlots?.[slot] : hero.treasureSlots?.[slot];
  const heroNameMap = Object.fromEntries(gs.heroes.map((h) => [h.id, h.name]));

  const pool = (isEquip ? gs.equips : gs.treasures)
    .filter((item) => item.slot === slot && (!current || item.uid !== current.uid));

  let currentHtml = '';
  if (current) {
    const statPills = formatGearStats(current.stats)
      .map((txt) => `<span class="badge">${txt}</span>`)
      .join('');

    let extraBox = '';
    if (isEquip) {
      const sDef = gs.equipSets?.[current.setId];
      const equippedPieces = Object.values(hero.equipSlots || {})
        .filter((e) => e && e.setId === current.setId).length;
      if (sDef) {
        extraBox = `
          <div class="modal-extra-box">
            <div class="modal-extra-head">
              <strong>${sDef.name}</strong>
              <span class="badge ${equippedPieces >= 2 ? 'cleared' : ''}">${equippedPieces}/4 件</span>
            </div>
            <div class="muted" style="margin-top:4px">2件：${sDef.twoDesc} · 4件：${sDef.fourDesc}</div>
          </div>
        `;
      }
    } else {
      const resBonus = current.scaleDomain && hero.domains
        ? ` (+${formatPct(getDomainResonanceMult(hero.domains[current.scaleDomain]) - 1)})`
        : '';
      extraBox = `
        <div class="modal-extra-box passive-box">
          <div class="modal-extra-head">
            <strong>${ic('zap', 'ic-sm')} ${current.passiveName}</strong>
            ${current.scaleDomainName ? `<span class="muted">随${current.scaleDomainName}变化${resBonus}</span>` : ''}
          </div>
          <div class="muted" style="margin-top:4px">${current.passiveDesc}</div>
        </div>
      `;
    }

    const upgLabel = isEquip
      ? (current.nextCost ? `强化 +1 ${resTag('gold', formatNum(current.nextCost.gold))}` : '已满级')
      : (current.nextCost ? `精炼 +1 ${resTag('gold', formatNum(current.nextCost.gold))} ${resTag('exp', formatNum(current.nextCost.exp))}` : '已满精炼');

    currentHtml = `
      <div class="modal-head">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          ${renderGearSvg(slot, current.rarity)}
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
              <strong class="rarity-text-${current.rarity}" style="font-size:16px">${current.name} +${current.level}</strong>
            </div>
            <div class="muted">${hero.name} · ${slotLabel}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" id="modal-close-btn">${ic('x', 'ic-sm')}</button>
      </div>

      <div class="modal-stat-pills">${statPills}</div>
      ${extraBox}

      <div class="modal-actions">
        <button class="btn btn-primary" id="modal-upg-1" ${!current.nextCost ? 'disabled' : ''}>${ic('arrow-up', 'ic-sm')}${upgLabel}</button>
        <button class="btn btn-outline" id="modal-upg-5" ${!current.nextCost ? 'disabled' : ''}>${ic('chevrons-up', 'ic-sm')}+5</button>
        <button class="btn btn-danger" id="modal-unwear">${ic('x', 'ic-sm')}卸下</button>
      </div>
    `;
  } else {
    currentHtml = `
      <div class="modal-head">
        <div style="display:flex;align-items:center;gap:10px">
          ${renderGearSvg(slot, 'gray')}
          <div>
            <strong style="font-size:15px">${slotLabel}（空槽位）</strong>
            <div class="muted">${hero.name}</div>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" id="modal-close-btn">${ic('x', 'ic-sm')}</button>
      </div>
    `;
  }

  const swapHtml = pool.length > 0
    ? pool.map((item) => {
        const wearer = item.equippedBy ? heroNameMap[item.equippedBy] : '';
        const effectiveStats = isEquip ? item.stats : getTreasureStatsForHero(item, hero);
        const summary = formatGearStats(effectiveStats).slice(0, 3).join(' · ');
        return `
          <div class="modal-swap-item">
            ${renderGearSvg(item.slot, item.rarity)}
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <strong class="rarity-text-${item.rarity}" style="font-size:13.5px">${item.name} +${item.level}</strong>
                ${wearer ? `<span class="muted">(${wearer})</span>` : ''}
              </div>
              <div class="muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${summary}</div>
            </div>
            <button class="btn btn-outline btn-xs" data-swap-uid="${item.uid}">${current ? '更换' : '穿戴'}</button>
          </div>
        `;
      }).join('')
    : `<div class="empty-detail" style="padding:18px 8px">
        背包暂无其它${slotLabel}
        <div style="margin-top:8px"><button class="btn btn-outline btn-sm" id="modal-go-armory">${ic('hammer', 'ic-sm')}前往工坊获取</button></div>
      </div>`;

  modal.innerHTML = `
    ${currentHtml}
    <div class="modal-swap-section">
      <div class="muted" style="margin-bottom:6px;font-weight:500">${current ? `更换同部位${slotLabel}` : `选择穿戴${slotLabel}`}</div>
      <div class="modal-swap-list">${swapHtml}</div>
    </div>
  `;

  backdrop.classList.remove('hidden');

  $('#modal-close-btn')?.addEventListener('click', closeGearModal);

  $('#modal-upg-1')?.addEventListener('click', () => doUpgrade(current.uid, 1));
  $('#modal-upg-5')?.addEventListener('click', () => doUpgrade(current.uid, 5));

  $('#modal-unwear')?.addEventListener('click', async () => {
    try {
      const url = isEquip ? '/api/equip/unequip' : '/api/treasure/unequip';
      const body = isEquip ? { equipUid: current.uid } : { treasureUid: current.uid };
      const res = await api('POST', url, body);
      store.state = res.state;
      onRefreshCb();
      showToast('已卸下');
    } catch (err) {
      showToast(err.message);
    }
  });

  modal.querySelectorAll('[data-swap-uid]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const uid = btn.dataset.swapUid;
        const url = isEquip ? '/api/equip/wear' : '/api/treasure/wear';
        const body = isEquip
          ? { heroId: hero.id, equipUid: uid }
          : { heroId: hero.id, treasureUid: uid };
        const res = await api('POST', url, body);
        store.state = res.state;
        onRefreshCb();
        showToast(current ? '已更换' : '已穿戴');
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  $('#modal-go-armory')?.addEventListener('click', () => {
    closeGearModal();
    document.querySelector('.tab-btn[data-tab="armory"]')?.click();
  });

  refreshIcons();
}

async function doUpgrade(uid, times) {
  const isEquip = modalState?.kind === 'equip';
  try {
    const url = isEquip ? '/api/equip/enhance' : '/api/treasure/refine';
    const body = isEquip ? { equipUid: uid, times } : { treasureUid: uid, times };
    const res = await api('POST', url, body);
    store.state = res.state;
    onRefreshCb();
    showToast(`+${res.upgraded}`);
  } catch (err) {
    showToast(err.message);
  }
}

export function initGearModal(onRefresh) {
  onRefreshCb = onRefresh;
  const backdrop = $('#gear-modal-backdrop');
  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) closeGearModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalState) closeGearModal();
  });
}
