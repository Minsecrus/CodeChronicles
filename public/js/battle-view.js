import { $, api, formatNum, showToast, store } from './api.js';
import { ic, refreshIcons, renderEmblemSvg, resTag } from './emblems.js';

let onRefreshCb = () => {};

export function renderStages() {
  const gs = store.state;
  const list = $('#stage-list');
  const cleared = gs.maxClearedStage;
  $('#stage-progress-text').textContent = `${cleared} / ${gs.stages.length}`;

  if (!gs.stages.some((s) => s.id === store.selectedStageId)) {
    store.selectedStageId = Math.min(gs.stages.length, cleared + 1);
  }

  list.innerHTML = gs.stages.map((s) => {
    const isSelected = s.id === store.selectedStageId;
    const statusIcon = s.cleared
      ? `<span class="badge cleared">${ic('check', 'ic-sm')}</span>`
      : s.unlocked
        ? `<span class="badge next">${ic('play', 'ic-sm')}</span>`
        : `<span class="badge">${ic('lock', 'ic-sm')}</span>`;
    const sweepBtn = s.cleared
      ? `<button class="btn btn-outline btn-xs" data-sweep="${s.id}" title="扫荡 5 次">${ic('fast-forward', 'ic-sm')}×5</button>`
      : '';
    const canBeat = gs.teamPower >= s.recommendedPower;
    return `
      <div class="stage-item ${isSelected ? 'selected' : ''} ${s.unlocked ? '' : 'locked'}" data-stage="${s.id}">
        <div class="stage-top">
          <span><span class="stage-code">${s.code}</span>${s.name}</span>
          ${statusIcon}
        </div>
        <div class="stage-sub">
          <span class="power-cmp ${canBeat ? 'ready' : 'hard'}">${ic('swords', 'ic-sm')} ${formatNum(s.recommendedPower)}</span>
          ${sweepBtn}
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.stage-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-sweep]')) return;
      const id = Number(el.dataset.stage);
      const st = store.state.stages.find((x) => x.id === id);
      if (!st?.unlocked) return showToast('请先通关前置关卡');
      store.selectedStageId = id;
      renderBattlePreview();
      renderStages();
    });
  });

  list.querySelectorAll('[data-sweep]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.sweep);
      try {
        const res = await api('POST', '/api/battle/sweep', { stageId: id, times: 5 });
        store.state = res.state;
        onRefreshCb();
        const dropMsg = res.reward.drops?.length ? ` · 掉落×${res.reward.drops.length}` : '';
        showToast(`扫荡×5：+${res.reward.diamonds}钻 +${res.reward.gold}金${dropMsg}`);
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  refreshIcons();
}

function renderUnitCards(containerSel, units, side) {
  const el = $(containerSel);
  el.innerHTML = units.map((u) => {
    const hpPct = u.maxHp > 0 ? Math.max(0, Math.min(100, (u.hp / u.maxHp) * 100)) : 0;
    const shieldPct = u.maxHp > 0 ? Math.max(0, Math.min(100, ((u.shield || 0) / u.maxHp) * 100)) : 0;
    const ragePct = Math.max(0, Math.min(100, u.rage || 0));
    const hpText = u.shield > 0
      ? `${formatNum(u.hp)}+${formatNum(u.shield)}/${formatNum(u.maxHp)}`
      : `${formatNum(u.hp)}/${formatNum(u.maxHp)}`;
    return `
      <div class="unit-card ${u.hp <= 0 ? 'dead' : ''}" id="unit-${u.uid}">
        <div class="unit-head">
          ${renderEmblemSvg(u.emblem, u.element)}
          <div class="unit-title">
            <div class="unit-name rarity-text-${u.rarity}">${u.name}</div>
          </div>
        </div>
        <div class="bar-row">
          <div class="hp-track">
            <div class="bar-fill hp ${side}" style="width:${hpPct}%"></div>
            ${u.shield > 0 ? `<div class="bar-fill shield-bar" style="width:${shieldPct}%"></div>` : ''}
            <span class="hp-bar-text">${hpText}</span>
          </div>
        </div>
        <div class="bar-row">
          <div class="bar-track"><div class="bar-fill rage" style="width:${ragePct}%"></div></div>
        </div>
      </div>
    `;
  }).join('');
  refreshIcons();
}

export function renderBattlePreview() {
  if (store.isReplaying) return;
  const gs = store.state;
  const stage = gs.stages.find((s) => s.id === store.selectedStageId) || gs.stages[0];
  if (!stage) return;

  const bondNames = gs.synergy.activeBonds?.length
    ? ` · ${gs.synergy.activeBonds.map((b) => b.name).join(' / ')}`
    : '';
  $('#arena-stage-title').textContent = `${stage.code} ${stage.name}`;
  $('#arena-synergy-text').textContent = `${gs.synergy.label}${bondNames}`;
  $('#battle-result-banner').classList.add('hidden');

  const allyUnits = gs.team.map((id, i) => {
    const h = gs.heroes.find((x) => x.id === id);
    const maxHp = Math.round(h.stats.hp * (1 + (gs.synergy.hpBonus || 0)));
    return {
      uid: `ally_${i}`,
      name: h.name,
      rarity: h.rarity,
      element: h.element,
      emblem: h.emblem,
      level: h.level,
      star: h.star,
      maxHp,
      hp: maxHp,
      shield: h.stats.initShield ?? (h.stats.passives?.some((p) => p.id === 'ha_shield') ? Math.round(maxHp * 0.2) : 0),
      rage: Math.min(100, 40 + (h.stats.initRageBonus || 0) + (gs.synergy.initRageBonus || 0))
    };
  });

  const enemyUnits = stage.enemies.map((e, i) => ({
    uid: `enemy_${i}`,
    name: e.name || e.heroId,
    rarity: e.rarity || 'SR',
    element: e.element || 'kernel',
    emblem: e.emblem || 'orb',
    level: e.level,
    star: e.star,
    maxHp: e.maxHp || 1000,
    hp: e.maxHp || 1000,
    shield: e.shield || 0,
    rage: e.rage ?? 40
  }));

  renderUnitCards('#ally-units', allyUnits, 'ally');
  renderUnitCards('#enemy-units', enemyUnits, 'enemy');
}

function spawnFloatText(uid, text, cls) {
  const card = document.getElementById(`unit-${uid}`);
  if (!card) return;
  const pop = document.createElement('span');
  pop.className = `float-pop ${cls}`;
  pop.textContent = text;
  card.appendChild(pop);
  setTimeout(() => pop.remove(), 780);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function playBattleReplay(stage, battle, reward) {
  store.isReplaying = true;
  store.skipRequested = false;
  $('#btn-fight').disabled = true;
  $('#btn-skip').disabled = false;
  $('#battle-result-banner').classList.add('hidden');

  const stateMap = new Map();
  const allies = battle.initialAllies.map((u) => ({ ...u }));
  const enemies = battle.initialEnemies.map((u) => ({ ...u }));
  [...allies, ...enemies].forEach((u) => stateMap.set(u.uid, u));

  renderUnitCards('#ally-units', allies, 'ally');
  renderUnitCards('#enemy-units', enemies, 'enemy');

  for (const ev of battle.events) {
    const actor = stateMap.get(ev.actorUid);
    if (actor) actor.rage = ev.actorRageAfter;

    for (const t of ev.targets) {
      const target = stateMap.get(t.uid);
      if (target) {
        target.hp = t.hpAfter;
        target.shield = t.shieldAfter;
        if (typeof t.rageAfter === 'number') target.rage = t.rageAfter;
      }
    }

    if (!store.skipRequested) {
      renderUnitCards('#ally-units', allies, 'ally');
      renderUnitCards('#enemy-units', enemies, 'enemy');

      const actorEl = document.getElementById(`unit-${ev.actorUid}`);
      if (actorEl && ev.actionType !== 'passive' && ev.actionType !== 'stunned') {
        actorEl.classList.add(ev.actorSide === 'ally' ? 'acting-ally' : 'acting-enemy');
      }

      for (const t of ev.targets) {
        const targetEl = document.getElementById(`unit-${t.uid}`);
        if (t.stunned && ev.actionType === 'stunned') {
          spawnFloatText(t.uid, '阻塞', 'stun');
        } else if (t.dodged) {
          targetEl?.classList.add('dodge-anim');
          spawnFloatText(t.uid, '闪避', 'dodge');
        } else if (t.damage > 0) {
          targetEl?.classList.add('hit');
          if (t.blocked) spawnFloatText(t.uid, `格挡 -${t.damage}`, 'block');
          else if (t.crit) spawnFloatText(t.uid, `暴击 -${t.damage}!`, 'crit');
          else spawnFloatText(t.uid, `-${t.damage}`, 'dmg');
          if (t.stunned) spawnFloatText(t.uid, '阻塞!', 'stun');
        } else if (t.heal > 0) {
          spawnFloatText(t.uid, `+${t.heal}`, 'heal');
        } else if (t.shield > 0) {
          spawnFloatText(t.uid, `+盾${t.shield}`, 'shield');
        }
      }

      await wait(store.battleSpeed === 2 ? 200 : 420);
    }
  }

  renderUnitCards('#ally-units', allies, 'ally');
  renderUnitCards('#enemy-units', enemies, 'enemy');

  const banner = $('#battle-result-banner');
  banner.classList.remove('hidden', 'win', 'lose');
  if (battle.victory) {
    banner.classList.add('win');
    const dropNames = (reward.drops || [])
      .map((d) => `<strong class="rarity-text-${d.item.rarity}">${d.item.name}</strong>`)
      .join(' · ');
    banner.innerHTML = `
      <span>${ic('check', 'ic-sm')} ${reward.firstClear ? '首通达成' : '战斗胜利'} · ${stage.code}</span>
      <span class="res-inline-group">${resTag('diamond', `+${formatNum(reward.diamonds)}`)} ${resTag('gold', `+${formatNum(reward.gold)}`)} ${resTag('exp', `+${formatNum(reward.exp)}`)} ${dropNames}</span>
    `;
    if (reward.firstClear) {
      store.selectedStageId = Math.min(store.state.stages.length, stage.id + 1);
    }
  } else {
    banner.classList.add('lose');
    banner.innerHTML = `<span>${ic('x', 'ic-sm')} 败北 · ${stage.code}</span><span>建议升级或配装后再战</span>`;
  }

  store.isReplaying = false;
  $('#btn-fight').disabled = false;
  $('#btn-skip').disabled = true;
  onRefreshCb();
}

export function initBattleView(onRefresh) {
  onRefreshCb = onRefresh;
  $('#btn-speed').addEventListener('click', () => {
    store.battleSpeed = store.battleSpeed === 1 ? 2 : 1;
    $('#btn-speed').querySelector('span').textContent = `${store.battleSpeed}x`;
  });

  $('#btn-skip').addEventListener('click', () => {
    store.skipRequested = true;
  });

  $('#btn-fight').addEventListener('click', async () => {
    if (store.isReplaying) return;
    try {
      const res = await api('POST', '/api/battle/start', { stageId: store.selectedStageId });
      store.state = res.state;
      await playBattleReplay(res.stage, res.battle, res.reward);
    } catch (err) {
      showToast(err.message);
    }
  });
}
