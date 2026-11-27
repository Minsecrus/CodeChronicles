import { $, api, formatNum, formatPct, showToast, store } from './api.js';
import { ic, refreshIcons, renderEmblemSvg, renderRadarSvg, resTag } from './emblems.js';
import { openGearModal } from './gear-modal.js';

let onRefreshCb = () => {};
let builderOptionsReady = false;

const SLOT_ICON = {
  weapon: 'keyboard',
  armor: 'shirt',
  helm: 'headphones',
  boots: 'armchair',
  relic: 'gem',
  emblem: 'cpu'
};

function ensureBuilderOptions() {
  if (builderOptionsReady || !store.state?.csDomains) return;
  builderOptionsReady = true;

  const sliderWrap = $('#ch-domains-sliders');
  sliderWrap.innerHTML = store.state.csDomains.map((d) => `
    <label class="domain-slider-item" title="${d.hint}">
      <strong><span>${d.name}</span><span id="ch-val-${d.key}">7</span></strong>
      <input type="range" min="1" max="10" value="7" data-domain="${d.key}" />
    </label>
  `).join('');

  sliderWrap.querySelectorAll('input[type="range"]').forEach((inp) => {
    inp.addEventListener('input', () => {
      $(`#ch-val-${inp.dataset.domain}`).textContent = inp.value;
    });
  });

  $('#ch-passive').innerHTML = Object.values(store.state.passiveDefs)
    .map((p) => `<option value="${p.id}">${p.name}</option>`)
    .join('');

  $('#ch-skill').innerHTML = Object.entries(store.state.skillTemplates)
    .map(([k, s]) => `<option value="${k}">${s.name}</option>`)
    .join('');
}

function renderSlotBox(slot, label, item, kind) {
  const icon = ic(SLOT_ICON[slot] || 'gem', 'ic-sm');
  if (!item) {
    return `
      <div class="slot-box" data-slot-kind="${kind}" data-slot-key="${slot}">
        <div class="slot-box-top">
          <span class="slot-box-title">${icon}<span>${label}</span></span>
          <span class="muted">空槽</span>
        </div>
        <div class="slot-box-sub">点击选择穿戴</div>
      </div>
    `;
  }
  const lvTag = `+${item.level}`;
  return `
    <div class="slot-box" data-slot-kind="${kind}" data-slot-key="${slot}">
      <div class="slot-box-top">
        <span class="slot-box-title" title="${item.passiveDesc || item.setName || ''}">${icon}<span class="rarity-text-${item.rarity}">${item.name} ${lvTag}</span></span>
      </div>
      <div class="slot-box-sub">${kind === 'equip' ? item.setName : item.passiveName}</div>
    </div>
  `;
}

function renderHeroDetail() {
  const gs = store.state;
  const panel = $('#hero-detail-panel');
  const h = gs.heroes.find((x) => x.id === store.selectedHeroId);
  if (!h) {
    panel.innerHTML = `<div class="empty-detail">点击左侧角色查看详情</div>`;
    return;
  }

  const elMeta = gs.elements[h.element];
  const lvCost = h.nextLvCost ? `${resTag('exp', formatNum(h.nextLvCost.exp))} ${resTag('gold', formatNum(h.nextLvCost.gold))}` : 'MAX';
  const starCost = h.starCost ? `${resTag('shard', formatNum(h.starCost.shards))} ${resTag('gold', formatNum(h.starCost.gold))}` : 'MAX';

  const setHtml = h.stats.activeSets?.length
    ? h.stats.activeSets.map((s) => `<span class="badge cleared">${s.name}×${s.pieces} ${s.desc}</span>`).join('')
    : '';

  const equipSlotsHtml = Object.entries(gs.equipSlotNames)
    .map(([slot, label]) => renderSlotBox(slot, label, h.equipSlots?.[slot], 'equip'))
    .join('');

  const treasureSlotsHtml = Object.entries(gs.treasureSlotNames)
    .map(([slot, label]) => renderSlotBox(slot, label, h.treasureSlots?.[slot], 'treasure'))
    .join('');

  const domainRows = (gs.csDomains || []).map((d) => {
    const eff = h.domains?.[d.key] ?? 5;
    const bonus = h.domainsBonus?.[d.key] || 0;
    const cost = h.domainCosts?.[d.key];
    const costTitle = cost ? `研习 +1（需 ${cost.exp} 晶体 / ${cost.gold} 金币）` : '已满阶';
    return `
      <div class="domain-row" title="${d.hint}">
        <span>${d.name}</span>
        <span class="domain-row-right">
          <strong>${eff}${bonus > 0 ? `<small class="domain-bonus">+${bonus}</small>` : ''}</strong>
          <button class="domain-train-btn" data-train-domain="${d.key}" title="${costTitle}" ${!cost ? 'disabled' : ''}>+</button>
        </span>
      </div>
    `;
  }).join('');

  const extraCombatPills = [];
  if (h.stats.armorPen > 0) extraCombatPills.push(`穿甲 ${formatPct(h.stats.armorPen)}`);
  if (h.stats.shieldMult > 1) extraCombatPills.push(`护盾效能 ${formatPct(h.stats.shieldMult)}`);
  if (h.stats.rageGainMult > 1) extraCombatPills.push(`回怒效率 ${formatPct(h.stats.rageGainMult)}`);
  if (h.stats.ccResist > 0) extraCombatPills.push(`阻塞抗性 ${formatPct(h.stats.ccResist)}`);
  if (h.stats.dotResist > 0) extraCombatPills.push(`DoT减伤 ${formatPct(h.stats.dotResist)}`);
  if (h.stats.varianceFloor > 0.95) extraCombatPills.push(`输出下限 ${formatPct(h.stats.varianceFloor)}`);
  const extraPillsHtml = extraCombatPills.length
    ? `<div class="cult-stat-pills">${extraCombatPills.map((t) => `<span class="badge">${t}</span>`).join('')}</div>`
    : '';

  const passiveBox = h.passive
    ? `<div class="skill-box passive-box">
        <h4>${ic('zap', 'ic-sm')} ${h.passive.name}</h4>
        <p class="muted">${h.passive.desc}</p>
      </div>`
    : '';

  const compileTiers = gs.compileTiers || [];
  const curCompile = compileTiers[h.compileLevel || 0] || { flag: '-O0', name: 'Debug 基线', tech: '' };
  const compileCost = h.nextCompileCost
    ? `${resTag('exp', formatNum(h.nextCompileCost.exp))} ${resTag('gold', formatNum(h.nextCompileCost.gold))}`
    : 'MAX';
  const profilePillsHtml = Object.values(gs.compileProfiles || {}).map((p) => {
    const locked = (h.compileLevel || 0) < p.minTier;
    const active = (h.compileProfile || 'standard') === p.id;
    return `
      <button class="profile-pill ${active ? 'active' : ''}" data-compile-profile="${p.id}" ${locked ? 'disabled' : ''} title="${locked ? `需先升级至 -O${p.minTier} 解锁：` : ''}${p.desc}">
        <span class="profile-flag">${p.flag}</span>
        <span>${p.name}</span>
      </button>
    `;
  }).join('');

  const modulesHtml = (gs.csModules || []).map((m) => {
    const lv = h.modules?.[m.id] || 0;
    const maxLv = gs.maxCsModuleLevel || 5;
    const mCost = h.moduleCosts?.[m.id];
    const btnText = mCost
      ? `+1 ${resTag('exp', formatNum(mCost.exp))} ${resTag('gold', formatNum(mCost.gold))}`
      : 'MAX';
    return `
      <div class="module-card ${lv >= maxLv ? 'maxed' : ''}">
        <div class="module-card-head">
          <strong>${m.name}</strong>
          <span class="badge ${lv >= maxLv ? 'cleared' : ''}">Lv.${lv}/${maxLv}</span>
        </div>
        <div class="module-sub">${m.subtitle}</div>
        <div class="module-desc" title="${m.desc}">${m.desc}</div>
        <div class="module-foot">
          <span class="badge ${lv >= maxLv ? 'next' : ''}">${m.maxEffect}</span>
          <button class="btn btn-outline btn-xs" data-module-up="${m.id}" ${!mCost ? 'disabled' : ''}>${btnText}</button>
        </div>
      </div>
    `;
  }).join('');

  const covTiers = gs.coverageTiers || [];
  const curCov = covTiers[h.coverageTier || 0] || { pct: 0, name: '裸奔上线', desc: '' };
  const covCost = h.nextCoverageCost
    ? `提升覆盖 ${resTag('exp', formatNum(h.nextCoverageCost.exp))} ${resTag('gold', formatNum(h.nextCoverageCost.gold))}`
    : '100% 形式化达成';

  const equipCount = Object.values(h.equipSlots || {}).filter(Boolean).length;
  const treasureCount = Object.values(h.treasureSlots || {}).filter(Boolean).length;
  const totalGearCount = equipCount + treasureCount;
  const subTab = store.detailTab || 'stats';

  let bodyHtml = '';
  if (subTab === 'stats') {
    bodyHtml = `
      <div class="detail-stats">
        <div class="stat-cell" title="生命"><span>${ic('heart', 'ic-sm')} 生命</span><strong>${formatNum(h.stats.hp)}</strong></div>
        <div class="stat-cell" title="攻击"><span>${ic('sword', 'ic-sm')} 攻击</span><strong>${formatNum(h.stats.atk)}</strong></div>
        <div class="stat-cell" title="防御"><span>${ic('shield', 'ic-sm')} 防御</span><strong>${h.stats.def}</strong></div>
        <div class="stat-cell" title="速度"><span>${ic('wind', 'ic-sm')} 速度</span><strong>${h.stats.spd}</strong></div>
        <div class="stat-cell" title="暴击率 / 暴伤"><span>${ic('crosshair', 'ic-sm')} 暴击</span><strong>${formatPct(h.stats.critRate)} / ${formatPct(h.stats.critDmg)}</strong></div>
        <div class="stat-cell" title="闪避率 / 格挡率"><span>${ic('feather', 'ic-sm')} 闪 / 挡</span><strong>${formatPct(h.stats.dodgeRate)} / ${formatPct(h.stats.blockRate)}</strong></div>
      </div>
      ${extraPillsHtml}

      <div class="radar-wrap">
        ${renderRadarSvg(h.domains, h.element, h.baseDomains)}
        <div class="domain-list">${domainRows}</div>
      </div>

      ${passiveBox}

      <div class="skill-box">
        <h4>${ic('flame', 'ic-sm')} ${h.skill.name} · ${Math.round(h.stats.skillMultiplier * 100)}%</h4>
        <p>${h.skill.desc}</p>
      </div>
    `;
  } else if (subTab === 'cultivation') {
    bodyHtml = `
      <div class="cult-section">
        <div class="cult-card">
          <div class="cult-head">
            <div>
              <strong>${ic('terminal', 'ic-sm')} 编译链优化</strong>
              <span class="badge next" style="margin-left:6px">${curCompile.flag} · ${curCompile.name}</span>
            </div>
            <button class="btn btn-primary btn-xs" id="btn-compile-up" ${!h.nextCompileCost ? 'disabled' : ''}>${compileCost}</button>
          </div>
          <p class="muted" style="margin:6px 0 8px">${curCompile.tech}</p>
          <div class="profile-grid">${profilePillsHtml}</div>
        </div>

        <div class="module-grid">${modulesHtml}</div>

        <div class="cult-card">
          <div class="cult-head">
            <div>
              <strong>${ic('shield-check', 'ic-sm')} 工程测试覆盖</strong>
              <span class="badge ${curCov.pct >= 100 ? 'cleared' : ''}" style="margin-left:6px">${curCov.pct}% · ${curCov.name}</span>
            </div>
            <button class="btn btn-outline btn-xs" id="btn-coverage-up" ${!h.nextCoverageCost ? 'disabled' : ''}>${covCost}</button>
          </div>
          <div class="progress-track" style="margin:8px 0 6px"><div class="progress-fill sr" style="width:${curCov.pct}%"></div></div>
          <p class="muted">${curCov.desc}</p>
        </div>
      </div>
    `;
  } else {
    bodyHtml = `
      <div class="gear-section">
        <div class="gear-section-head">
          <h4>外设 (4) 与圣物 (2)</h4>
          <button class="btn btn-outline btn-xs" id="btn-auto-gear">${ic('wand-sparkles', 'ic-sm')}一键最优配装</button>
        </div>
        <div class="slot-grid">${equipSlotsHtml}</div>
        <div class="slot-grid" style="margin-top:8px">${treasureSlotsHtml}</div>
        ${setHtml ? `<div class="set-pills">${setHtml}</div>` : ''}
      </div>
    `;
  }

  panel.innerHTML = `
    <div class="detail-header">
      ${renderEmblemSvg(h.emblem, h.element, 'emblem-lg')}
      <div style="min-width:0;flex:1">
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
          <h3 class="rarity-text-${h.rarity}" style="font-size:17px">${h.name}</h3>
          ${h.isCustom ? `<span class="badge next">定制</span>` : ''}
        </div>
        <p class="muted res-inline-group" style="margin-top:3px">${h.title} · ${elMeta?.name || ''} · Lv.${h.level} ★${h.star} · ${resTag('shard', h.shards)}</p>
      </div>
    </div>

    <div class="detail-subtabs">
      <button class="detail-subtab ${subTab === 'stats' ? 'active' : ''}" data-detail-tab="stats">能力与技能</button>
      <button class="detail-subtab ${subTab === 'cultivation' ? 'active' : ''}" data-detail-tab="cultivation">CS 修炼</button>
      <button class="detail-subtab ${subTab === 'gear' ? 'active' : ''}" data-detail-tab="gear">外设圣物 (${totalGearCount}/6)</button>
    </div>

    ${bodyHtml}

    <div class="detail-actions">
      <div class="detail-row-btns">
        <button class="btn btn-primary" id="btn-lv1" ${!h.nextLvCost ? 'disabled' : ''}>${ic('arrow-up', 'ic-sm')}升级 +1 ${lvCost}</button>
        <button class="btn btn-outline" id="btn-lv10" ${!h.nextLvCost ? 'disabled' : ''}>${ic('chevrons-up', 'ic-sm')}连升 +10</button>
      </div>
      <div class="detail-row-btns">
        <button class="btn btn-special" id="btn-starup" ${!h.starCost ? 'disabled' : ''}>${ic('star', 'ic-sm')}升星 ${starCost}</button>
        <button class="btn btn-outline" id="btn-toggle-team">${h.inTeam ? `${ic('x', 'ic-sm')}移出小队` : `${ic('plus', 'ic-sm')}加入小队`}</button>
      </div>
    </div>
  `;

  panel.querySelectorAll('[data-detail-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.detailTab = btn.dataset.detailTab;
      renderHeroDetail();
    });
  });

  panel.querySelectorAll('[data-train-domain]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await api('POST', '/api/hero/domain-train', { heroId: h.id, domain: btn.dataset.trainDomain });
        store.state = res.state;
        onRefreshCb();
        showToast('领域专精提升 +1');
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  $('#btn-compile-up')?.addEventListener('click', async () => {
    try {
      const res = await api('POST', '/api/hero/compile-up', { heroId: h.id });
      store.state = res.state;
      onRefreshCb();
      showToast('编译链优化升级成功');
    } catch (err) {
      showToast(err.message);
    }
  });

  panel.querySelectorAll('[data-compile-profile]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await api('POST', '/api/hero/compile-profile', { heroId: h.id, profile: btn.dataset.compileProfile });
        store.state = res.state;
        onRefreshCb();
        showToast('已切换编译策略');
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  panel.querySelectorAll('[data-module-up]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await api('POST', '/api/hero/module-up', { heroId: h.id, moduleId: btn.dataset.moduleUp });
        store.state = res.state;
        onRefreshCb();
        showToast('CS 核心模块升级成功');
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  $('#btn-coverage-up')?.addEventListener('click', async () => {
    try {
      const res = await api('POST', '/api/hero/coverage-up', { heroId: h.id });
      store.state = res.state;
      onRefreshCb();
      showToast('工程测试覆盖率提升');
    } catch (err) {
      showToast(err.message);
    }
  });

  $('#btn-lv1')?.addEventListener('click', () => doLevelUp(h.id, 1));
  $('#btn-lv10')?.addEventListener('click', () => doLevelUp(h.id, 10));
  $('#btn-starup')?.addEventListener('click', () => doStarUp(h.id));
  $('#btn-toggle-team')?.addEventListener('click', () => doToggleTeam(h));
  $('#btn-auto-gear')?.addEventListener('click', async () => {
    try {
      const res = await api('POST', '/api/equip/auto', { heroId: h.id });
      store.state = res.state;
      onRefreshCb();
      showToast(`已为 ${h.name} 最优配装`);
    } catch (err) {
      showToast(err.message);
    }
  });

  panel.querySelectorAll('.slot-box[data-slot-key]').forEach((box) => {
    box.addEventListener('click', () => {
      openGearModal(h.id, box.dataset.slotKind, box.dataset.slotKey);
    });
  });

  refreshIcons();
}

async function doLevelUp(heroId, times) {
  try {
    const res = await api('POST', '/api/hero/levelup', { heroId, times });
    store.state = res.state;
    onRefreshCb();
    showToast(`+${res.upgraded} 级`);
  } catch (err) {
    showToast(err.message);
  }
}

async function doStarUp(heroId) {
  try {
    const res = await api('POST', '/api/hero/starup', { heroId });
    store.state = res.state;
    onRefreshCb();
    showToast('升星成功');
  } catch (err) {
    showToast(err.message);
  }
}

async function doToggleTeam(hero) {
  const gs = store.state;
  let next;
  if (hero.inTeam) {
    if (gs.team.length <= 1) return showToast('至少保留 1 名');
    next = gs.team.filter((id) => id !== hero.id);
  } else {
    if (gs.team.length >= 3) return showToast('小队已满 3 人');
    next = [...gs.team, hero.id];
  }
  try {
    const res = await api('POST', '/api/team', { team: next });
    store.state = res.state;
    onRefreshCb();
  } catch (err) {
    showToast(err.message);
  }
}

export function renderRoster() {
  ensureBuilderOptions();
  const gs = store.state;
  const teamEl = $('#team-slots');

  const badgesWrap = $('#roster-synergy-badges');
  const bondPills = (gs.synergy.activeBonds || [])
    .map((b) => `<div class="synergy-badge bond" title="${b.desc}">${ic('crown', 'ic-sm')} ${b.name}</div>`)
    .join('');
  badgesWrap.innerHTML = `<div class="synergy-badge" title="${gs.synergy.desc}">${gs.synergy.label}</div>${bondPills}`;

  $('#roster-count-text').textContent = `${gs.heroes.length}/${gs.catalogCount}`;

  teamEl.innerHTML = [0, 1, 2].map((idx) => {
    const id = gs.team[idx];
    const h = gs.heroes.find((x) => x.id === id);
    if (!h) {
      return `<div class="team-slot-empty">空位 #${idx + 1} · 可从下方图鉴选择上阵</div>`;
    }
    return `
      <div class="team-slot-card">
        ${renderEmblemSvg(h.emblem, h.element)}
        <div style="flex:1;min-width:0">
          <strong class="rarity-text-${h.rarity}" style="display:inline-block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px">${h.name}</strong>
          <div class="muted" style="margin-top:3px">Lv.${h.level} ★${h.star} · 战力 ${formatNum(h.stats.power)}</div>
        </div>
        <button class="btn btn-ghost btn-xs" data-unequip="${h.id}" title="下阵">${ic('x', 'ic-sm')}</button>
      </div>
    `;
  }).join('');

  teamEl.querySelectorAll('[data-unequip]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (gs.team.length <= 1) return showToast('至少保留 1 名');
      const next = gs.team.filter((x) => x !== btn.dataset.unequip);
      try {
        const res = await api('POST', '/api/team', { team: next });
        store.state = res.state;
        onRefreshCb();
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  if (!store.selectedHeroId || !gs.heroes.some((h) => h.id === store.selectedHeroId)) {
    store.selectedHeroId = gs.heroes[0]?.id || null;
  }

  document.querySelectorAll('#roster-filters .filter-pill').forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.filter === store.rosterFilter);
  });

  const filteredHeroes = gs.heroes.filter((h) => {
    if (store.rosterFilter === 'all') return true;
    if (store.rosterFilter === 'team') return h.inTeam;
    return h.element === store.rosterFilter;
  });

  const grid = $('#hero-grid');
  grid.innerHTML = filteredHeroes.length === 0
    ? `<div class="empty-detail" style="grid-column:1/-1">该筛选条件下暂无角色</div>`
    : filteredHeroes.map((h) => {
        const elMeta = gs.elements?.[h.element];
        return `
          <div class="hero-card rarity-${h.rarity} ${h.id === store.selectedHeroId ? 'selected' : ''}" data-hero="${h.id}">
            <div class="card-top-row">
              <span class="muted">${elMeta?.name || ''}</span>
              ${h.inTeam ? `<span class="badge next">${ic('swords', 'ic-sm')}出战</span>` : ''}
            </div>
            <div class="hero-card-body">
              ${renderEmblemSvg(h.emblem, h.element)}
              <div style="min-width:0;flex:1">
                <div class="hero-card-name rarity-text-${h.rarity}">${h.name}</div>
                <div class="hero-card-sub">Lv.${h.level} · ★${h.star}</div>
              </div>
            </div>
            <div class="hero-card-foot">
              <span>${ic('swords', 'ic-sm')} ${formatNum(h.stats.power)}</span>
              <span>${resTag('shard', h.shards)}</span>
            </div>
          </div>
        `;
      }).join('');

  grid.querySelectorAll('.hero-card').forEach((card) => {
    card.addEventListener('click', () => {
      store.selectedHeroId = card.dataset.hero;
      renderRoster();
    });
  });

  renderHeroDetail();
}

export function initRosterView(onRefresh) {
  onRefreshCb = onRefresh;

  document.querySelectorAll('#roster-filters .filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      store.rosterFilter = pill.dataset.filter;
      renderRoster();
    });
  });

  $('#btn-open-builder').addEventListener('click', () => {
    $('#custom-builder-panel').classList.toggle('hidden');
  });
  $('#btn-close-builder').addEventListener('click', () => {
    $('#custom-builder-panel').classList.add('hidden');
  });

  $('#custom-hero-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const domains = {};
    document.querySelectorAll('#ch-domains-sliders input[data-domain]').forEach((inp) => {
      domains[inp.dataset.domain] = Number(inp.value);
    });
    const payload = {
      name: $('#ch-name').value.trim(),
      title: $('#ch-title').value.trim() || '代码旅人',
      rarity: $('#ch-rarity').value,
      element: $('#ch-element').value,
      domains,
      passiveId: $('#ch-passive').value,
      skillType: $('#ch-skill').value,
      skillName: $('#ch-skill-name').value.trim()
    };
    try {
      const res = await api('POST', '/api/custom-hero', payload);
      store.state = res.state;
      store.selectedHeroId = res.hero.id;
      $('#custom-hero-form').reset();
      document.querySelectorAll('#ch-domains-sliders input[data-domain]').forEach((inp) => {
        inp.value = '7';
        $(`#ch-val-${inp.dataset.domain}`).textContent = '7';
      });
      $('#custom-builder-panel').classList.add('hidden');
      onRefreshCb();
      showToast(`已生成「${res.hero.name}」`);
    } catch (err) {
      showToast(err.message);
    }
  });
}
