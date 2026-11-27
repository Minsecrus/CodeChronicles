import {
  COMPILE_PROFILES,
  COMPILE_TIERS,
  COVERAGE_TIERS,
  CS_MODULES,
  MAX_CS_MODULE_LEVEL,
  MAX_DOMAIN_BONUS,
  MAX_LEVEL,
  MAX_STAR,
  RARITY_ORDER
} from './constants.mjs';
import { EQUIP_SETS, TREASURE_MAP, computeEquipStats, computeTreasureStats } from './gear.mjs';
import { deriveBaseStats } from './heroes.mjs';

export const HERO_BONDS = [
  {
    id: 'bond_linus_jeff',
    name: '开源与算力的基石',
    desc: 'Linus Torvalds + Jeff Dean 同阵：全队攻击 +15%、速度 +12%、开局怒气 +20',
    requiredIds: ['ur_linus', 'ur_jeff'],
    bonuses: { atkBonus: 0.15, spdBonus: 0.12, initRageBonus: 20 }
  },
  {
    id: 'bond_unix_roots',
    name: 'Unix 创世回响',
    desc: 'Linus + Ken Thompson 同阵：全队生命 +14%、防御 +14%',
    requiredIds: ['ur_linus', 'ssr_thompson'],
    bonuses: { hpBonus: 0.14, defBonus: 0.14 }
  },
  {
    id: 'bond_cs_gods',
    name: '图灵奖殿堂',
    desc: 'Donald Knuth + Alan Turing 同阵：全队暴击 +8%、暴伤 +20%',
    requiredIds: ['ssr_knuth', 'ssr_turing'],
    bonuses: { critBonus: 0.08, critDmgBonus: 0.20 }
  },
  {
    id: 'bond_c_unix',
    name: 'C 与 Unix 双壁',
    desc: 'Ken Thompson + Dennis Ritchie 同阵：全队防御 +14%、暴伤 +18%',
    requiredIds: ['ssr_thompson', 'red_dennis'],
    bonuses: { defBonus: 0.14, critDmgBonus: 0.18 }
  },
  {
    id: 'bond_zero_trust',
    name: '密码学黄金盾',
    desc: 'Whitfield Diffie + Bruce Schneier 同阵：全队生命 +14%、攻击 +12%',
    requiredIds: ['ur_diffie', 'gd_schneier'],
    bonuses: { hpBonus: 0.14, atkBonus: 0.12 }
  },
  {
    id: 'bond_web_frontier',
    name: 'Web 与视界先驱',
    desc: 'Tim Berners-Lee + John Carmack 同阵：全队速度 +12%、暴击 +8%',
    requiredIds: ['pt_berners_lee', 'ur_carmack'],
    bonuses: { spdBonus: 0.12, critBonus: 0.08 }
  }
];

export function levelUpCost(currentLevel) {
  return {
    exp: Math.floor(20 + currentLevel * 14),
    gold: Math.floor(40 + currentLevel * 22)
  };
}

export function domainTrainCost(currentBonus) {
  return {
    exp: Math.floor(35 + currentBonus * 30),
    gold: Math.floor(400 + currentBonus * 350)
  };
}

export function compileUpgradeCost(currentTier) {
  return {
    exp: Math.floor(60 + currentTier * 70),
    gold: Math.floor(1200 + currentTier * 1400)
  };
}

export function moduleUpgradeCost(currentLv) {
  return {
    exp: Math.floor(30 + currentLv * 25),
    gold: Math.floor(600 + currentLv * 550)
  };
}

export function coverageUpgradeCost(currentTier) {
  return {
    exp: Math.floor(50 + currentTier * 55),
    gold: Math.floor(900 + currentTier * 1000)
  };
}

export function normalizeHeroInstance(inst = {}) {
  const clamp = (v, min, max) => Math.max(min, Math.min(max, Math.round(Number(v ?? 0))));
  const db = inst.domainsBonus || {};
  const mods = inst.modules || {};
  const compileLevel = clamp(inst.compileLevel ?? 0, 0, COMPILE_TIERS.length - 1);
  const rawProf = String(inst.compileProfile || 'standard');
  const profDef = COMPILE_PROFILES[rawProf];
  const compileProfile = profDef && compileLevel >= profDef.minTier ? profDef.id : 'standard';

  return {
    id: inst.id,
    level: Math.max(1, Math.min(MAX_LEVEL, Number(inst.level ?? 1))),
    star: Math.max(1, Math.min(MAX_STAR, Number(inst.star ?? 1))),
    shards: Math.max(0, Number(inst.shards ?? 0)),
    domainsBonus: {
      algo: clamp(db.algo, 0, MAX_DOMAIN_BONUS),
      sys: clamp(db.sys, 0, MAX_DOMAIN_BONUS),
      eng: clamp(db.eng, 0, MAX_DOMAIN_BONUS),
      ai: clamp(db.ai, 0, MAX_DOMAIN_BONUS),
      agility: clamp(db.agility, 0, MAX_DOMAIN_BONUS),
      sec: clamp(db.sec, 0, MAX_DOMAIN_BONUS),
      fe: clamp(db.fe, 0, MAX_DOMAIN_BONUS),
      lang: clamp(db.lang, 0, MAX_DOMAIN_BONUS)
    },
    compileLevel,
    compileProfile,
    coverageTier: clamp(inst.coverageTier ?? 0, 0, COVERAGE_TIERS.length - 1),
    modules: {
      complexity: clamp(mods.complexity, 0, MAX_CS_MODULE_LEVEL),
      concurrency: clamp(mods.concurrency, 0, MAX_CS_MODULE_LEVEL),
      cache: clamp(mods.cache, 0, MAX_CS_MODULE_LEVEL),
      consensus: clamp(mods.consensus, 0, MAX_CS_MODULE_LEVEL)
    }
  };
}

export function computeHeroStats(heroDef, instance, equippedEquips = [], equippedTreasures = []) {
  const norm = normalizeHeroInstance({ id: heroDef.id, ...instance });
  const lv = norm.level;
  const st = norm.star;
  const lvScale = 1 + (lv - 1) * 0.12 + Math.pow(lv - 1, 1.35) * 0.018;
  const starScale = 1 + (st - 1) * 0.18;

  const baseDomains = heroDef.domains || { algo: 5, sys: 5, eng: 5, ai: 5, agility: 5, sec: 5, fe: 5, lang: 5 };
  const effectiveDomains = {
    algo: Math.min(15, (baseDomains.algo ?? 5) + norm.domainsBonus.algo),
    sys: Math.min(15, (baseDomains.sys ?? 5) + norm.domainsBonus.sys),
    eng: Math.min(15, (baseDomains.eng ?? 5) + norm.domainsBonus.eng),
    ai: Math.min(15, (baseDomains.ai ?? 5) + norm.domainsBonus.ai),
    agility: Math.min(15, (baseDomains.agility ?? 5) + norm.domainsBonus.agility),
    sec: Math.min(15, (baseDomains.sec ?? 5) + norm.domainsBonus.sec),
    fe: Math.min(15, (baseDomains.fe ?? 5) + norm.domainsBonus.fe),
    lang: Math.min(15, (baseDomains.lang ?? 5) + norm.domainsBonus.lang)
  };
  const hasDomainTraining = Object.values(norm.domainsBonus).some((v) => v > 0);
  const derived = hasDomainTraining ? deriveBaseStats(effectiveDomains, heroDef.rarity) : heroDef;

  let hp = Math.round(derived.baseHp * lvScale * starScale);
  let atk = Math.round(derived.baseAtk * lvScale * starScale);
  let def = Math.round(derived.baseDef * lvScale * starScale);
  let spd = Math.round(derived.baseSpd + (lv - 1) * 0.45 + (st - 1) * 4);
  let critRate = derived.critRate + (st - 1) * 0.025;
  let critDmg = (derived.critDmg ?? 1.5) + (st - 1) * 0.04;
  let dodgeRate = (derived.dodgeRate ?? 0.05) + (st - 1) * 0.01;
  let blockRate = (derived.blockRate ?? 0.05) + (st - 1) * 0.012;
  let blockMitigation = derived.blockMitigation ?? 0.35;

  const setCounts = {};
  for (const eq of equippedEquips) {
    if (!eq) continue;
    const es = computeEquipStats(eq);
    hp += es.hp;
    atk += es.atk;
    def += es.def;
    spd += es.spd;
    critRate += es.critRate;
    critDmg += es.critDmg;
    dodgeRate += es.dodgeRate;
    blockRate += es.blockRate;
    setCounts[eq.setId] = (setCounts[eq.setId] || 0) + 1;
  }

  let hpPctBonus = 0;
  let atkPctBonus = 0;
  let defPctBonus = 0;
  let spdPctBonus = 0;
  const activeSets = [];

  for (const [setId, count] of Object.entries(setCounts)) {
    const sDef = EQUIP_SETS[setId];
    if (!sDef) continue;
    if (count >= 2) {
      const b = sDef.twoBonus;
      hpPctBonus += b.hpPct || 0;
      atkPctBonus += b.atkPct || 0;
      defPctBonus += b.defPct || 0;
      spd += b.spd || 0;
      activeSets.push({ setId, name: sDef.name, pieces: 2, desc: sDef.twoDesc });
    }
    if (count >= 4) {
      const b = sDef.fourBonus;
      hpPctBonus += b.hpPct || 0;
      atkPctBonus += b.atkPct || 0;
      defPctBonus += b.defPct || 0;
      spd += b.spd || 0;
      critRate += b.critRate || 0;
      critDmg += b.critDmg || 0;
      dodgeRate += b.dodgeRate || 0;
      blockRate += b.blockRate || 0;
      blockMitigation += b.blockMitigation || 0;
      activeSets.push({ setId, name: sDef.name, pieces: 4, desc: sDef.fourDesc });
    }
  }

  const passives = [];
  if (heroDef.passive) {
    passives.push({ ...heroDef.passive, source: 'hero' });
  }
  let initRageBonus = derived.domainRageBonus || 0;

  const resonanceHero = hasDomainTraining ? { ...heroDef, domains: effectiveDomains } : heroDef;
  for (const tr of equippedTreasures) {
    if (!tr) continue;
    const ts = computeTreasureStats(tr, resonanceHero);
    hp += ts.hp;
    atk += ts.atk;
    def += ts.def;
    spd += ts.spd;
    hpPctBonus += ts.hpPct || 0;
    atkPctBonus += ts.atkPct || 0;
    defPctBonus += ts.defPct || 0;
    spdPctBonus += ts.spdPct || 0;
    critRate += ts.critRate;
    critDmg += ts.critDmg;
    dodgeRate += ts.dodgeRate;
    blockRate += ts.blockRate;
    blockMitigation += ts.blockMitigation;
    const tpl = TREASURE_MAP[tr.templateId];
    if (tpl?.passive) {
      passives.push({
        id: tpl.passive,
        name: tpl.passiveName,
        desc: tpl.passiveDesc,
        rarity: tpl.rarity,
        level: tr.level || 0,
        source: 'treasure'
      });
      if (tpl.passive === 'start_rage') {
        const high = (RARITY_ORDER[tpl.rarity] || 0) >= RARITY_ORDER.red;
        initRageBonus += (high ? 40 : 25) + (tr.level || 0) * 3;
      }
    }
  }

  // 1. Compiler optimization & build profile
  const compileTier = COMPILE_TIERS[norm.compileLevel] || COMPILE_TIERS[0];
  hpPctBonus += compileTier.hpPct;
  atkPctBonus += compileTier.atkPct;
  defPctBonus += compileTier.defPct;
  spdPctBonus += compileTier.spdPct;
  critDmg += compileTier.critDmg;
  initRageBonus += compileTier.initRage;

  const profile = COMPILE_PROFILES[norm.compileProfile] || COMPILE_PROFILES.standard;
  const pb = profile.bonuses || {};
  hpPctBonus += pb.hpPct || 0;
  atkPctBonus += pb.atkPct || 0;
  defPctBonus += pb.defPct || 0;
  spdPctBonus += pb.spdPct || 0;
  critDmg += pb.critDmg || 0;
  dodgeRate += pb.dodgeRate || 0;
  blockRate += pb.blockRate || 0;
  initRageBonus += pb.initRage || 0;

  // 2. Core CS modules
  let armorPen = derived.domainArmorPen || 0;
  let rageGainPct = 0;
  let shieldMultPct = 0;
  let ccResist = 0;

  for (const mod of CS_MODULES) {
    const mLv = norm.modules[mod.id] || 0;
    if (mLv <= 0) continue;
    const pl = mod.perLevel;
    hpPctBonus += (pl.hpPct || 0) * mLv;
    atkPctBonus += (pl.atkPct || 0) * mLv;
    defPctBonus += (pl.defPct || 0) * mLv;
    spd += (pl.spd || 0) * mLv;
    critRate += (pl.critRate || 0) * mLv;
    blockRate += (pl.blockRate || 0) * mLv;
    armorPen += (pl.armorPen || 0) * mLv;
    rageGainPct += (pl.rageGainPct || 0) * mLv;
    shieldMultPct += (pl.shieldMult || 0) * mLv;
    ccResist += (pl.ccResist || 0) * mLv;
  }

  if (norm.modules.concurrency >= MAX_CS_MODULE_LEVEL) {
    passives.push({
      id: 'cas_combo',
      name: 'CAS 无锁连击',
      desc: '普攻 25% 概率触发无锁追加打击（40% 攻击伤害）',
      source: 'module'
    });
  }
  if (norm.modules.cache >= MAX_CS_MODULE_LEVEL) {
    passives.push({
      id: 'l1_prefetch',
      name: 'L1 预取护盾',
      desc: '开局自带最大生命 12% 护盾',
      source: 'module'
    });
  }
  if (norm.modules.consensus >= MAX_CS_MODULE_LEVEL) {
    passives.push({
      id: 'circuit_breaker',
      name: '熔断降级',
      desc: '每场首次受到致命伤害时锁血 1 HP 并获得最大生命 18% 护盾',
      source: 'module'
    });
  }

  // 3. Engineering test coverage
  const coverage = COVERAGE_TIERS[norm.coverageTier] || COVERAGE_TIERS[0];
  hpPctBonus += coverage.hpPct;
  atkPctBonus += coverage.atkPct;
  defPctBonus += coverage.defPct;
  spd += coverage.spd;

  hp = Math.max(1, Math.round(hp * (1 + hpPctBonus)));
  atk = Math.max(1, Math.round(atk * (1 + atkPctBonus)));
  def = Math.max(1, Math.round(def * (1 + defPctBonus)));
  spd = Math.max(1, Math.round(spd * (1 + spdPctBonus)));

  critRate = Math.min(0.95, Number(critRate.toFixed(3)));
  critDmg = Number(critDmg.toFixed(2));
  dodgeRate = Math.min(0.65, Number(dodgeRate.toFixed(3)));
  blockRate = Math.min(0.75, Number(blockRate.toFixed(3)));
  blockMitigation = Math.min(0.70, Number(blockMitigation.toFixed(2)));
  armorPen = Math.min(0.50, Number(armorPen.toFixed(3)));
  const rageGainMult = Number((1 + rageGainPct).toFixed(2));
  const shieldMult = Number((1 + shieldMultPct).toFixed(2));
  ccResist = Math.min(0.75, Number(ccResist.toFixed(2)));
  const varianceFloor = coverage.varianceFloor;
  const dotResist = coverage.dotResist;

  const domainSkillScale = derived.domainSkillScale ?? 1.0;
  const skillMultiplier = Number((heroDef.skill.multiplier * domainSkillScale * (1 + (st - 1) * 0.12 + compileTier.skillScale)).toFixed(2));

  const initShieldRatio =
    (passives.some((p) => p.id === 'ha_shield') ? 0.20 : 0) +
    (passives.some((p) => p.id === 'l1_prefetch') ? 0.12 : 0);
  const initShield = Math.round(hp * initShieldRatio * shieldMult);

  const power = Math.round(
    hp * 0.28 +
    atk * 1.9 +
    def * 1.4 +
    spd * 1.5 +
    st * 120 +
    (critRate * 600) +
    ((critDmg - 1.5) * 450) +
    ((dodgeRate + blockRate) * 650) +
    armorPen * 1200 +
    (shieldMult - 1) * 800 +
    (rageGainMult - 1) * 700 +
    ccResist * 500 +
    dotResist * 500
  );

  return {
    hp,
    atk,
    def,
    spd,
    critRate,
    critDmg,
    dodgeRate,
    blockRate,
    blockMitigation,
    armorPen,
    rageGainMult,
    shieldMult,
    ccResist,
    varianceFloor,
    dotResist,
    initShield,
    skillMultiplier,
    initRageBonus,
    effectiveDomains,
    activeSets,
    passives,
    power
  };
}

export function computeTeamSynergy(teamHeroDefs) {
  if (!teamHeroDefs || teamHeroDefs.length === 0) {
    return {
      label: '未编队', desc: '请至少上阵 1 名角色',
      hpBonus: 0, atkBonus: 0, defBonus: 0, spdBonus: 0, critBonus: 0, critDmgBonus: 0, initRageBonus: 0,
      activeBonds: []
    };
  }

  const counts = {};
  const idSet = new Set();
  for (const h of teamHeroDefs) {
    counts[h.element] = (counts[h.element] || 0) + 1;
    idSet.add(h.id);
  }
  const maxSame = Math.max(...Object.values(counts));
  const distinct = Object.keys(counts).length;

  let label = '基础小队';
  let desc = '上阵 2/3 名同阵营或 3 种不同阵营可激活共鸣';
  let hpBonus = 0;
  let atkBonus = 0;
  let defBonus = 0;
  let spdBonus = 0;
  let critBonus = 0;
  let critDmgBonus = 0;
  let initRageBonus = 0;

  if (maxSame >= 3) {
    label = '全栈同源共鸣';
    desc = '全队生命/攻击 +18%';
    hpBonus += 0.18;
    atkBonus += 0.18;
  } else if (maxSame === 2) {
    label = '双核同源共鸣';
    desc = '全队生命/攻击 +8%';
    hpBonus += 0.08;
    atkBonus += 0.08;
  } else if (distinct >= 3) {
    label = '跨栈协奏';
    desc = '全队速度 +10%、暴击 +6%';
    spdBonus += 0.10;
    critBonus += 0.06;
  }

  const activeBonds = [];
  for (const bond of HERO_BONDS) {
    if (bond.requiredIds.every((id) => idSet.has(id))) {
      activeBonds.push({ id: bond.id, name: bond.name, desc: bond.desc });
      hpBonus += bond.bonuses.hpBonus || 0;
      atkBonus += bond.bonuses.atkBonus || 0;
      defBonus += bond.bonuses.defBonus || 0;
      spdBonus += bond.bonuses.spdBonus || 0;
      critBonus += bond.bonuses.critBonus || 0;
      critDmgBonus += bond.bonuses.critDmgBonus || 0;
      initRageBonus += bond.bonuses.initRageBonus || 0;
    }
  }

  return {
    label,
    desc,
    hpBonus,
    atkBonus,
    defBonus,
    spdBonus,
    critBonus,
    critDmgBonus,
    initRageBonus,
    activeBonds
  };
}
