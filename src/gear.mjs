import {
  CS_DOMAINS,
  EQUIP_SLOTS,
  EQUIP_SLOT_NAMES,
  LEGACY_RARITY_MAP,
  MAX_EQUIP_LEVEL,
  MAX_TREASURE_LEVEL,
  RARITY_ORDER,
  TREASURE_SLOT_NAMES
} from './constants.mjs';

const DOMAIN_NAME_MAP = Object.fromEntries(CS_DOMAINS.map((d) => [d.key, d.name]));

export const EQUIP_SETS = {
  kernel_set: {
    id: 'kernel_set',
    name: '内核黑客套',
    prefix: '黑客',
    twoDesc: '攻击 +12%',
    fourDesc: '暴伤 +30%、暴击 +8%',
    twoBonus: { atkPct: 0.12 },
    fourBonus: { critDmg: 0.30, critRate: 0.08 }
  },
  acm_set: {
    id: 'acm_set',
    name: 'ACM 金牌套',
    prefix: '极速',
    twoDesc: '速度 +12',
    fourDesc: '闪避 +14%、暴击 +6%',
    twoBonus: { spd: 12 },
    fourBonus: { dodgeRate: 0.14, critRate: 0.06 }
  },
  ha_set: {
    id: 'ha_set',
    name: '高可用集群套',
    prefix: '集群',
    twoDesc: '生命 +14%',
    fourDesc: '格挡 +18%、格挡减伤 +12%',
    twoBonus: { hpPct: 0.14 },
    fourBonus: { blockRate: 0.18, blockMitigation: 0.12 }
  },
  tensor_set: {
    id: 'tensor_set',
    name: '满血炼丹套',
    prefix: '张量',
    twoDesc: '攻击 +10%、防御 +10%',
    fourDesc: '暴伤 +22%、闪避 +6%、格挡 +8%',
    twoBonus: { atkPct: 0.10, defPct: 0.10 },
    fourBonus: { critDmg: 0.22, dodgeRate: 0.06, blockRate: 0.08 }
  },
  compiler_set: {
    id: 'compiler_set',
    name: '零开销抽象套',
    prefix: '零开销',
    twoDesc: '攻击 +14%',
    fourDesc: '暴击 +12%、速度 +10',
    twoBonus: { atkPct: 0.14 },
    fourBonus: { critRate: 0.12, spd: 10 }
  },
  zero_trust_set: {
    id: 'zero_trust_set',
    name: '零信任防线套',
    prefix: '零信任',
    twoDesc: '防御 +16%',
    fourDesc: '格挡 +15%、格挡减伤 +16%',
    twoBonus: { defPct: 0.16 },
    fourBonus: { blockRate: 0.15, blockMitigation: 0.16 }
  },
  coroutine_set: {
    id: 'coroutine_set',
    name: '无锁协程套',
    prefix: '协程',
    twoDesc: '速度 +14',
    fourDesc: '闪避 +16%、暴伤 +20%',
    twoBonus: { spd: 14 },
    fourBonus: { dodgeRate: 0.16, critDmg: 0.20 }
  },
  rust_safe_set: {
    id: 'rust_safe_set',
    name: '内存安全圣套',
    prefix: '安全',
    twoDesc: '生命 +12%、防御 +10%',
    fourDesc: '生命 +10%、格挡 +12%、闪避 +8%',
    twoBonus: { hpPct: 0.12, defPct: 0.10 },
    fourBonus: { hpPct: 0.10, blockRate: 0.12, dodgeRate: 0.08 }
  }
};

const RARITY_MULT = {
  gray: 0.80,
  green: 1.00,
  blue: 1.25,
  purple: 1.52,
  orange: 1.84,
  red: 2.20,
  gold: 2.65,
  platinum: 3.15,
  violet_gold: 3.75
};

function normRarity(r, fallback = 'blue') {
  if (RARITY_ORDER[r]) return r;
  return LEGACY_RARITY_MAP[r] || fallback;
}

const SLOT_BASE = {
  weapon: { atk: 42, critRate: 0.045 },
  armor: { def: 32, hp: 220, blockRate: 0.05 },
  helm: { hp: 360, critDmg: 0.10 },
  boots: { spd: 10, hp: 160, dodgeRate: 0.045 }
};

export const TREASURE_TEMPLATES = [
  {
    id: 'tr_ur_01',
    name: 'H100 算力核心',
    slot: 'relic',
    rarity: 'violet_gold',
    scaleDomain: 'ai',
    baseStats: { atkPct: 0.16, critRate: 0.08, critDmg: 0.24 },
    passive: 'crit_rage',
    passiveName: 'CUDA 满载',
    passiveDesc: '暴击时额外回复 15 怒气'
  },
  {
    id: 'tr_ur_04',
    name: 'B200 量子矩阵',
    slot: 'relic',
    rarity: 'violet_gold',
    scaleDomain: 'algo',
    baseStats: { atkPct: 0.15, spdPct: 0.10, critDmg: 0.26 },
    passive: 'execute_bonus',
    passiveName: '降维破限',
    passiveDesc: '攻击生命低于 40% 的敌人时伤害 +25%'
  },
  {
    id: 'tr_ur_05',
    name: 'Linux 0.01 原初软盘',
    slot: 'relic',
    rarity: 'violet_gold',
    scaleDomain: 'eng',
    baseStats: { hpPct: 0.18, defPct: 0.16, blockRate: 0.12, blockMitigation: 0.10 },
    passive: 'round_shield',
    passiveName: '内核态守护',
    passiveDesc: '每回合行动前获得最大生命 8% 护盾'
  },
  {
    id: 'tr_ur_06',
    name: '图灵完备印记',
    slot: 'emblem',
    rarity: 'violet_gold',
    scaleDomain: 'algo',
    baseStats: { atkPct: 0.15, spdPct: 0.10, critRate: 0.09, critDmg: 0.20 },
    passive: 'start_rage',
    passiveName: '奇点预热',
    passiveDesc: '开局额外获得 +40 初始怒气'
  },
  {
    id: 'tr_ur_07',
    name: '形式化验证神谕',
    slot: 'emblem',
    rarity: 'violet_gold',
    scaleDomain: 'agility',
    baseStats: { hpPct: 0.14, spdPct: 0.12, dodgeRate: 0.14, blockRate: 0.09 },
    passive: 'dodge_heal',
    passiveName: '零缺陷回溯',
    passiveDesc: '成功闪避攻击时回复最大生命 8%'
  },
  {
    id: 'tr_ur_08',
    name: 'eBPF 内核天眼',
    slot: 'emblem',
    rarity: 'violet_gold',
    scaleDomain: 'sys',
    baseStats: { hpPct: 0.16, defPct: 0.16, blockRate: 0.14, blockMitigation: 0.11 },
    passive: 'block_counter',
    passiveName: '零拷贝反击',
    passiveDesc: '格挡成功时立即反击目标，造成 65% 攻击伤害'
  },
  {
    id: 'tr_ur_02',
    name: '异步摸鱼脚本',
    slot: 'emblem',
    rarity: 'platinum',
    scaleDomain: 'agility',
    baseStats: { hpPct: 0.12, spdPct: 0.09, dodgeRate: 0.10 },
    passive: 'dodge_heal',
    passiveName: '协程闪避',
    passiveDesc: '成功闪避攻击时回复最大生命 8%'
  },
  {
    id: 'tr_ur_03',
    name: '不死机械轴',
    slot: 'emblem',
    rarity: 'platinum',
    scaleDomain: 'sys',
    baseStats: { hpPct: 0.13, defPct: 0.13, blockRate: 0.11, blockMitigation: 0.08 },
    passive: 'block_counter',
    passiveName: '硬核反击',
    passiveDesc: '格挡成功时立即反击目标，造成 65% 攻击伤害'
  },
  {
    id: 'tr_pt_03',
    name: 'Rust 借用检查器',
    slot: 'relic',
    rarity: 'platinum',
    scaleDomain: 'sys',
    baseStats: { hpPct: 0.12, defPct: 0.13, blockRate: 0.10, blockMitigation: 0.08 },
    passive: 'block_counter',
    passiveName: '所有权反击',
    passiveDesc: '格挡成功时立即反击目标，造成 65% 攻击伤害'
  },
  {
    id: 'tr_pt_04',
    name: '分布式时钟晶振',
    slot: 'relic',
    rarity: 'platinum',
    scaleDomain: 'agility',
    baseStats: { atkPct: 0.12, spdPct: 0.11, dodgeRate: 0.09 },
    passive: 'start_rage',
    passiveName: 'Lamport 同步',
    passiveDesc: '开局额外获得 +40 初始怒气'
  },
  {
    id: 'tr_ssr_01',
    name: '祖传 SSH 密钥',
    slot: 'relic',
    rarity: 'gold',
    scaleDomain: 'ai',
    baseStats: { atkPct: 0.10, spdPct: 0.07, critRate: 0.05 },
    passive: 'start_rage',
    passiveName: 'Root 直连',
    passiveDesc: '开局额外获得 +40 初始怒气'
  },
  {
    id: 'tr_ssr_02',
    name: '《DDIA》圣典',
    slot: 'relic',
    rarity: 'gold',
    scaleDomain: 'eng',
    baseStats: { hpPct: 0.11, defPct: 0.10, blockRate: 0.06 },
    passive: 'round_shield',
    passiveName: '分布式共识',
    passiveDesc: '每回合行动前获得最大生命 8% 护盾'
  },
  {
    id: 'tr_gd_03',
    name: 'SIMD 向量指令集',
    slot: 'emblem',
    rarity: 'gold',
    scaleDomain: 'algo',
    baseStats: { atkPct: 0.10, critRate: 0.07, critDmg: 0.18 },
    passive: 'crit_rage',
    passiveName: '并行加速',
    passiveDesc: '暴击时额外回复 15 怒气'
  },
  {
    id: 'tr_ssr_03',
    name: 'O(1) 哈希魔方',
    slot: 'emblem',
    rarity: 'red',
    scaleDomain: 'algo',
    baseStats: { atkPct: 0.09, critRate: 0.04, critDmg: 0.16 },
    passive: 'execute_bonus',
    passiveName: '常数时间秒杀',
    passiveDesc: '攻击生命低于 40% 的敌人时伤害 +25%'
  },
  {
    id: 'tr_ssr_04',
    name: 'rm -rf 豁免令',
    slot: 'emblem',
    rarity: 'red',
    scaleDomain: 'agility',
    baseStats: { hpPct: 0.08, spdPct: 0.08, dodgeRate: 0.08 },
    passive: 'dodge_heal',
    passiveName: '快照逃生',
    passiveDesc: '成功闪避攻击时回复最大生命 8%'
  },
  {
    id: 'tr_rd_03',
    name: '红黑树平衡仪',
    slot: 'relic',
    rarity: 'red',
    scaleDomain: 'eng',
    baseStats: { hpPct: 0.10, atkPct: 0.06, defPct: 0.08 },
    passive: 'round_shield',
    passiveName: '自平衡护盾',
    passiveDesc: '每回合行动前获得最大生命 8% 护盾'
  },
  {
    id: 'tr_sr_01',
    name: '冰美式续命杯',
    slot: 'relic',
    rarity: 'orange',
    scaleDomain: 'ai',
    baseStats: { atkPct: 0.07, critRate: 0.04, critDmg: 0.11 },
    passive: 'start_rage',
    passiveName: '咖啡因注入',
    passiveDesc: '开局额外获得 +25 初始怒气'
  },
  {
    id: 'tr_sr_02',
    name: '防脱发护符',
    slot: 'emblem',
    rarity: 'purple',
    scaleDomain: 'sys',
    baseStats: { hpPct: 0.07, defPct: 0.07, blockRate: 0.06 },
    passive: 'round_shield',
    passiveName: '发际线守护',
    passiveDesc: '每回合行动前获得最大生命 6% 护盾'
  },
  {
    id: 'tr_sr_03',
    name: '零 Bug 印章',
    slot: 'emblem',
    rarity: 'blue',
    scaleDomain: 'agility',
    baseStats: { atkPct: 0.05, spdPct: 0.06, dodgeRate: 0.05 },
    passive: 'crit_rage',
    passiveName: '一次通过',
    passiveDesc: '暴击时额外回复 10 怒气'
  }
];

export const TREASURE_MAP = Object.fromEntries(TREASURE_TEMPLATES.map((t) => [t.id, t]));

export function equipEnhanceCost(level) {
  return { gold: 200 + level * 160 };
}

export function treasureRefineCost(level) {
  return { gold: 500 + level * 420, exp: 40 + level * 35 };
}

export function createEquipInstance(uid, setId, slot, rarity, level = 0) {
  const setDef = EQUIP_SETS[setId] || EQUIP_SETS.kernel_set;
  const norm = normRarity(rarity, 'blue');
  return {
    uid,
    setId: setDef.id,
    slot,
    rarity: norm,
    level,
    name: `${setDef.prefix}${EQUIP_SLOT_NAMES[slot]}`,
    equippedBy: null
  };
}

export function createTreasureInstance(uid, templateId, level = 0) {
  const tpl = TREASURE_MAP[templateId] || TREASURE_TEMPLATES[0];
  return {
    uid,
    templateId: tpl.id,
    slot: tpl.slot,
    rarity: tpl.rarity,
    name: tpl.name,
    level,
    equippedBy: null
  };
}

export function computeEquipStats(equip) {
  const rm = RARITY_MULT[normRarity(equip.rarity, 'blue')] || 1;
  const lvScale = 1 + (equip.level || 0) * 0.12;
  const base = SLOT_BASE[equip.slot] || {};
  const stats = {
    hp: base.hp ? Math.round(base.hp * rm * lvScale) : 0,
    atk: base.atk ? Math.round(base.atk * rm * lvScale) : 0,
    def: base.def ? Math.round(base.def * rm * lvScale) : 0,
    spd: base.spd ? Math.round(base.spd * rm * (1 + (equip.level || 0) * 0.04)) : 0,
    critRate: base.critRate ? Number((base.critRate * (0.7 + rm * 0.30) * (1 + (equip.level || 0) * 0.025)).toFixed(3)) : 0,
    critDmg: base.critDmg ? Number((base.critDmg * (0.75 + rm * 0.30) * (1 + (equip.level || 0) * 0.03)).toFixed(3)) : 0,
    dodgeRate: base.dodgeRate ? Number((base.dodgeRate * (0.7 + rm * 0.30) * (1 + (equip.level || 0) * 0.025)).toFixed(3)) : 0,
    blockRate: base.blockRate ? Number((base.blockRate * (0.7 + rm * 0.30) * (1 + (equip.level || 0) * 0.025)).toFixed(3)) : 0
  };
  const score = Math.round(
    stats.hp * 0.28 + stats.atk * 2.0 + stats.def * 1.5 + stats.spd * 2.5 +
    (stats.critRate + stats.dodgeRate + stats.blockRate) * 1400 + stats.critDmg * 700
  );
  return { ...stats, score };
}

const FIB_RESONANCE = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 102, 116, 131, 147, 164];

export function getDomainResonanceMult(domainValue) {
  const idx = Math.max(0, Math.min(FIB_RESONANCE.length - 1, Math.round(Number(domainValue ?? 5)) - 1));
  return 1 + FIB_RESONANCE[idx] * 0.006;
}

export function computeTreasureStats(treasure, heroDef = null) {
  const tpl = TREASURE_MAP[treasure.templateId];
  if (!tpl) {
    return {
      hp: 0, atk: 0, def: 0, spd: 0,
      hpPct: 0, atkPct: 0, defPct: 0, spdPct: 0,
      critRate: 0, critDmg: 0, dodgeRate: 0, blockRate: 0, blockMitigation: 0, score: 0
    };
  }
  const lv = treasure.level || 0;
  const flatScale = 1 + lv * 0.16;
  const pctScale = 1 + lv * 0.06;
  const domMult = (heroDef?.domains && tpl.scaleDomain)
    ? getDomainResonanceMult(heroDef.domains[tpl.scaleDomain])
    : 1;
  const b = tpl.baseStats;
  const stats = {
    hp: b.hp ? Math.round(b.hp * flatScale * domMult) : 0,
    atk: b.atk ? Math.round(b.atk * flatScale * domMult) : 0,
    def: b.def ? Math.round(b.def * flatScale * domMult) : 0,
    spd: b.spd ? Math.round(b.spd * (1 + lv * 0.08) * domMult) : 0,
    hpPct: b.hpPct ? Number((b.hpPct * pctScale * domMult).toFixed(3)) : 0,
    atkPct: b.atkPct ? Number((b.atkPct * pctScale * domMult).toFixed(3)) : 0,
    defPct: b.defPct ? Number((b.defPct * pctScale * domMult).toFixed(3)) : 0,
    spdPct: b.spdPct ? Number((b.spdPct * pctScale * domMult).toFixed(3)) : 0,
    critRate: b.critRate ? Number((b.critRate * pctScale * domMult).toFixed(3)) : 0,
    critDmg: b.critDmg ? Number((b.critDmg * pctScale * domMult).toFixed(3)) : 0,
    dodgeRate: b.dodgeRate ? Number((b.dodgeRate * pctScale * domMult).toFixed(3)) : 0,
    blockRate: b.blockRate ? Number((b.blockRate * pctScale * domMult).toFixed(3)) : 0,
    blockMitigation: b.blockMitigation ? Number((b.blockMitigation * pctScale * domMult).toFixed(3)) : 0
  };
  const score = Math.round(
    stats.hp * 0.28 + stats.atk * 2.0 + stats.def * 1.5 + stats.spd * 2.5 +
    stats.hpPct * 2600 + stats.atkPct * 3200 + stats.defPct * 2400 + stats.spdPct * 2600 +
    (stats.critRate + stats.dodgeRate + stats.blockRate + stats.blockMitigation) * 1500 +
    stats.critDmg * 800 + (RARITY_MULT[tpl.rarity] || 1) * 450
  );
  return { ...stats, score };
}

export function enrichEquip(equip) {
  const setDef = EQUIP_SETS[equip.setId];
  const stats = computeEquipStats(equip);
  return {
    ...equip,
    rarity: normRarity(equip.rarity, 'blue'),
    slotName: EQUIP_SLOT_NAMES[equip.slot],
    setName: setDef?.name || '',
    stats,
    nextCost: equip.level < MAX_EQUIP_LEVEL ? equipEnhanceCost(equip.level) : null
  };
}

export function enrichTreasure(treasure, heroDef = null) {
  const tpl = TREASURE_MAP[treasure.templateId];
  const stats = computeTreasureStats(treasure, heroDef);
  return {
    ...treasure,
    rarity: tpl?.rarity || normRarity(treasure.rarity, 'blue'),
    slotName: TREASURE_SLOT_NAMES[treasure.slot],
    scaleDomain: tpl?.scaleDomain || '',
    scaleDomainName: DOMAIN_NAME_MAP[tpl?.scaleDomain] || '',
    passive: tpl?.passive || '',
    passiveName: tpl?.passiveName || '',
    passiveDesc: tpl?.passiveDesc || '',
    stats,
    nextCost: treasure.level < MAX_TREASURE_LEVEL ? treasureRefineCost(treasure.level) : null
  };
}

export { EQUIP_SLOTS };
