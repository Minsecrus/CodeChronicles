import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ELEMENTS, LEGACY_RARITY_MAP, PASSIVE_DEFS, RARITY_ORDER, SKILL_TEMPLATES } from './constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DEFAULT_CUSTOM_HEROES_PATH = path.resolve(__dirname, '..', 'data', 'custom-heroes.json');

const RARITY_TIER_SCALE = {
  gray: 0.85,
  green: 1.00,
  blue: 1.15,
  purple: 1.30,
  orange: 1.48,
  red: 1.66,
  gold: 1.86,
  platinum: 2.06,
  violet_gold: 2.28
};

export function normalizeRarity(r, fallback = 'gold') {
  if (RARITY_ORDER[r]) return r;
  if (LEGACY_RARITY_MAP[r]) return LEGACY_RARITY_MAP[r];
  return fallback;
}

export function deriveBaseStats(domains, rarity = 'purple') {
  const normRarity = normalizeRarity(rarity, 'purple');
  const clampDomain = (v) => Math.max(1, Math.min(15, Number(v ?? 5)));
  const d = {
    algo: clampDomain(domains?.algo),
    sys: clampDomain(domains?.sys),
    eng: clampDomain(domains?.eng),
    ai: clampDomain(domains?.ai),
    agility: clampDomain(domains?.agility),
    sec: clampDomain(domains?.sec),
    fe: clampDomain(domains?.fe),
    lang: clampDomain(domains?.lang)
  };
  const scale = RARITY_TIER_SCALE[normRarity] || 1.30;
  const highTier = (RARITY_ORDER[normRarity] || 4) >= RARITY_ORDER.gold;

  const baseHp = Math.round((660 + d.eng * 50 + d.sys * 18 + d.fe * 22) * scale);
  const baseAtk = Math.round((74 + d.algo * 6.0 + d.ai * 4.2 + d.lang * 2.2) * scale);
  const baseDef = Math.round((30 + d.sys * 3.8 + d.eng * 1.5 + d.sec * 1.6) * scale);
  const baseSpd = Math.round(83 + d.agility * 3.1 + d.fe * 1.0 + (scale - 1) * 14);
  const critRate = Number((0.05 + d.algo * 0.015 + d.lang * 0.005 + (highTier ? 0.03 : 0)).toFixed(3));
  const critDmg = Number((1.44 + d.algo * 0.032 + (highTier ? 0.04 : 0)).toFixed(2));
  const dodgeRate = Number((0.015 + d.agility * 0.011 + d.fe * 0.004).toFixed(3));
  const blockRate = Number((0.02 + d.sys * 0.015).toFixed(3));
  const blockMitigation = Number((0.28 + d.sys * 0.013 + d.sec * 0.006).toFixed(2));
  const domainArmorPen = Number((Math.max(0, d.sec - 5) * 0.012).toFixed(3));
  const domainRageBonus = Math.max(0, Math.round((d.ai - 4) * 3));
  const domainSkillScale = Number((0.90 + d.ai * 0.019 + d.lang * 0.008).toFixed(2));

  return {
    domains: d,
    baseHp,
    baseAtk,
    baseDef,
    baseSpd,
    critRate,
    critDmg,
    dodgeRate,
    blockRate,
    blockMitigation,
    domainArmorPen,
    domainRageBonus,
    domainSkillScale
  };
}

function defineHero(cfg) {
  const rarity = normalizeRarity(cfg.rarity, 'purple');
  const derived = deriveBaseStats(cfg.domains, rarity);
  const passive = PASSIVE_DEFS[cfg.passiveId] || null;
  return {
    ...cfg,
    rarity,
    ...derived,
    passive
  };
}

export const BUILTIN_HEROES = [
  // 紫金 (4)
  defineHero({
    id: 'ur_linus',
    name: 'Linus Torvalds',
    title: '内核之父 · Git 缔造者',
    rarity: 'violet_gold',
    element: 'kernel',
    role: '破盾控场 / 绝境回滚',
    domains: { algo: 8, sys: 10, eng: 9, ai: 5, agility: 7, sec: 5, fe: 4, lang: 6 },
    passiveId: 'code_review',
    emblem: 'sunburst',
    skill: {
      name: 'Kernel Panic',
      desc: '对敌方全体造成 175% 伤害与 2 回合灼烧，40% 概率令主目标陷入「阻塞」1 回合',
      type: 'aoe_stun_burn',
      multiplier: 1.75,
      target: 'all_enemies'
    }
  }),
  defineHero({
    id: 'ur_jeff',
    name: 'Jeff Dean',
    title: '单机集群 · Tensor 架构神',
    rarity: 'violet_gold',
    element: 'ai',
    role: '并发连击 / 全队增幅',
    domains: { algo: 10, sys: 9, eng: 10, ai: 10, agility: 8, sec: 6, fe: 5, lang: 8 },
    passiveId: 'multithread',
    emblem: 'star',
    skill: {
      name: 'Tensor 降维打击',
      desc: '为全队施加攻击 100% 护盾，并对敌方全体造成 170% 伤害（目标越残血伤害越高）',
      type: 'team_shield_aoe_exec',
      multiplier: 1.70,
      target: 'all_enemies'
    }
  }),
  defineHero({
    id: 'ur_carmack',
    name: 'John Carmack',
    title: '3D 引擎先知 · 帧率魔术师',
    rarity: 'violet_gold',
    element: 'fe',
    role: '极速剪枝 / 残血收割',
    domains: { algo: 9, sys: 8, eng: 9, ai: 7, agility: 10, sec: 5, fe: 10, lang: 7 },
    passiveId: 'prune_execute',
    emblem: 'blade',
    skill: {
      name: '光线追踪终结',
      desc: '锁定生命最低敌人造成 255% 伤害，目标生命低于 50% 时额外提升 35% 伤害',
      type: 'crit_execute',
      multiplier: 2.55,
      target: 'lowest_hp_enemy'
    }
  }),
  defineHero({
    id: 'ur_diffie',
    name: 'Whitfield Diffie',
    title: '公钥密码学奠基人',
    rarity: 'violet_gold',
    element: 'sec',
    role: '零信任壁垒 / 群体破盾',
    domains: { algo: 9, sys: 7, eng: 8, ai: 6, agility: 7, sec: 10, fe: 5, lang: 7 },
    passiveId: 'ha_shield',
    emblem: 'shield',
    skill: {
      name: '非对称密钥壁垒',
      desc: '为全队施加攻击 100% 护盾，并对敌方全体造成 170% 伤害（目标越残血伤害越高）',
      type: 'team_shield_aoe_exec',
      multiplier: 1.70,
      target: 'all_enemies'
    }
  }),

  // 白金 (4)
  defineHero({
    id: 'ssr_turing',
    name: 'Alan Turing',
    title: '可计算性先驱',
    rarity: 'platinum',
    element: 'algo',
    role: '群体阻塞 / 泄漏',
    domains: { algo: 10, sys: 6, eng: 7, ai: 9, agility: 7, sec: 8, fe: 4, lang: 8 },
    passiveId: 'memory_leak',
    emblem: 'diamond',
    skill: {
      name: '停机问题裁决',
      desc: '对敌方全体造成 155% 伤害，35% 概率使敌方目标陷入 1 回合「阻塞」',
      type: 'aoe_stun',
      multiplier: 1.55,
      target: 'all_enemies'
    }
  }),
  defineHero({
    id: 'ssr_knuth',
    name: 'Donald Knuth',
    title: 'TAOCP 宗师',
    rarity: 'platinum',
    element: 'algo',
    role: '剪枝收割',
    domains: { algo: 10, sys: 7, eng: 8, ai: 6, agility: 7, sec: 6, fe: 5, lang: 9 },
    passiveId: 'prune_execute',
    emblem: 'blade',
    skill: {
      name: 'TAOCP 终极剪枝',
      desc: '锁定生命最低敌人造成 250% 伤害，目标生命低于 50% 时额外提升 35% 伤害',
      type: 'crit_execute',
      multiplier: 2.50,
      target: 'lowest_hp_enemy'
    }
  }),
  defineHero({
    id: 'pt_graydon',
    name: 'Graydon Hoare',
    title: 'Rust 之父 · 借用检查器',
    rarity: 'platinum',
    element: 'lang',
    role: '内存铁壁 / 语义裁决',
    domains: { algo: 8, sys: 9, eng: 9, ai: 5, agility: 6, sec: 9, fe: 5, lang: 10 },
    passiveId: 'ha_shield',
    emblem: 'monolith',
    skill: {
      name: '所有权零开销重铸',
      desc: '为自身施加 30% 最大生命护盾并对敌方全体造成 140% 伤害',
      type: 'fortress_slam',
      multiplier: 1.40,
      target: 'all_enemies'
    }
  }),
  defineHero({
    id: 'pt_berners_lee',
    name: 'Tim Berners-Lee',
    title: '万维网之父 · HTTP 缔造者',
    rarity: 'platinum',
    element: 'fe',
    role: '全队愈护 / 并发回怒',
    domains: { algo: 7, sys: 6, eng: 9, ai: 6, agility: 8, sec: 7, fe: 10, lang: 8 },
    passiveId: 'multithread',
    emblem: 'wave',
    skill: {
      name: '超文本互联矩阵',
      desc: '为全体友方恢复攻击 145% 生命，并施加 40% 攻击的护盾',
      type: 'team_heal_shield',
      multiplier: 1.45,
      target: 'all_allies'
    }
  }),

  // 金 (4)
  defineHero({
    id: 'ssr_thompson',
    name: 'Ken Thompson',
    title: 'Unix 联合创始人',
    rarity: 'gold',
    element: 'kernel',
    role: '重装格挡 / 回滚',
    domains: { algo: 7, sys: 10, eng: 9, ai: 4, agility: 5, sec: 7, fe: 4, lang: 8 },
    passiveId: 'git_rollback',
    emblem: 'monolith',
    skill: {
      name: 'Unix 基石重铸',
      desc: '为自身施加 30% 最大生命护盾并对敌方全体造成 130% 伤害',
      type: 'fortress_slam',
      multiplier: 1.30,
      target: 'all_enemies'
    }
  }),
  defineHero({
    id: 'ssr_hopper',
    name: 'Grace Hopper',
    title: '编译器之母 · COBOL 先驱',
    rarity: 'gold',
    element: 'lang',
    role: '群疗净护',
    domains: { algo: 7, sys: 8, eng: 9, ai: 6, agility: 7, sec: 6, fe: 5, lang: 10 },
    passiveId: 'ha_shield',
    emblem: 'wave',
    skill: {
      name: '首个 Debug 奇迹',
      desc: '为全体友方恢复攻击 145% 生命，并施加 40% 攻击的护盾',
      type: 'team_heal_shield',
      multiplier: 1.45,
      target: 'all_allies'
    }
  }),
  defineHero({
    id: 'gd_schneier',
    name: 'Bruce Schneier',
    title: '应用密码学宗师',
    rarity: 'gold',
    element: 'sec',
    role: '破盾穿甲 / 渗透审计',
    domains: { algo: 8, sys: 7, eng: 7, ai: 5, agility: 6, sec: 10, fe: 5, lang: 6 },
    passiveId: 'code_review',
    emblem: 'shield',
    skill: {
      name: '零信任渗透审计',
      desc: '对单体造成 220% 伤害并降低目标 30% 防御 2 回合',
      type: 'armor_break',
      multiplier: 2.20,
      target: 'single_enemy'
    }
  }),
  defineHero({
    id: 'gd_martin',
    name: 'Martin Fowler',
    title: '重构与企业架构大师',
    rarity: 'gold',
    element: 'arch',
    role: '全队增攻 / 架构回滚',
    domains: { algo: 6, sys: 6, eng: 10, ai: 5, agility: 7, sec: 6, fe: 7, lang: 8 },
    passiveId: 'git_rollback',
    emblem: 'rings',
    skill: {
      name: '领域驱动重构',
      desc: '提升全队 22% 攻击 2 回合，并对敌方单体造成 175% 伤害',
      type: 'team_atk_buff',
      multiplier: 1.75,
      target: 'single_enemy'
    }
  }),

  // 红 (3)
  defineHero({
    id: 'red_dennis',
    name: 'Dennis Ritchie',
    title: 'C 语言之父',
    rarity: 'red',
    element: 'lang',
    role: '破甲直击',
    domains: { algo: 8, sys: 10, eng: 8, ai: 4, agility: 6, sec: 6, fe: 4, lang: 10 },
    passiveId: 'code_review',
    emblem: 'monolith',
    skill: {
      name: '指针与地址',
      desc: '对单体造成 220% 伤害并降低目标 30% 防御 2 回合',
      type: 'armor_break',
      multiplier: 2.20,
      target: 'single_enemy'
    }
  }),
  defineHero({
    id: 'red_dijkstra',
    name: 'Edsger Dijkstra',
    title: '最短路先驱',
    rarity: 'red',
    element: 'algo',
    role: '剪枝控场',
    domains: { algo: 10, sys: 7, eng: 8, ai: 5, agility: 7, sec: 6, fe: 4, lang: 8 },
    passiveId: 'prune_execute',
    emblem: 'diamond',
    skill: {
      name: 'Goto 有害论',
      desc: '对敌方全体造成 155% 伤害，35% 概率使敌方陷入 1 回合「阻塞」',
      type: 'aoe_stun',
      multiplier: 1.55,
      target: 'all_enemies'
    }
  }),
  defineHero({
    id: 'rd_mccarthy',
    name: 'John McCarthy',
    title: 'Lisp 之父 · 函数式鼻祖',
    rarity: 'red',
    element: 'lang',
    role: '群体灼烧 / 阻塞',
    domains: { algo: 9, sys: 6, eng: 7, ai: 8, agility: 6, sec: 5, fe: 5, lang: 10 },
    passiveId: 'memory_leak',
    emblem: 'sunburst',
    skill: {
      name: 'S-表达式递归',
      desc: '对敌方全体造成 170% 伤害与 2 回合灼烧，40% 概率令主目标陷入「阻塞」1 回合',
      type: 'aoe_stun_burn',
      multiplier: 1.70,
      target: 'all_enemies'
    }
  }),

  // 橙 (3)
  defineHero({
    id: 'sr_arch',
    name: '全栈架构师',
    title: '微服务守门人',
    rarity: 'orange',
    element: 'arch',
    role: '破甲输出',
    domains: { algo: 6, sys: 6, eng: 8, ai: 5, agility: 6, sec: 7, fe: 6, lang: 6 },
    passiveId: 'ha_shield',
    emblem: 'flame',
    skill: {
      name: '架构重构斩',
      desc: '对敌方单体造成 210% 伤害并附带 2 回合破甲（防御 -30%）',
      type: 'armor_break',
      multiplier: 2.10,
      target: 'single_enemy'
    }
  }),
  defineHero({
    id: 'sr_trainer',
    name: '深夜炼丹师',
    title: 'Loss 祈祷者',
    rarity: 'orange',
    element: 'ai',
    role: '算力鼓舞',
    domains: { algo: 6, sys: 4, eng: 6, ai: 9, agility: 6, sec: 4, fe: 4, lang: 5 },
    passiveId: 'memory_leak',
    emblem: 'rings',
    skill: {
      name: '梯度同步鼓舞',
      desc: '提升全队 22% 攻击 2 回合，并对敌方单体造成 165% 伤害',
      type: 'team_atk_buff',
      multiplier: 1.65,
      target: 'single_enemy'
    }
  }),
  defineHero({
    id: 'or_css',
    name: 'CSS 调参魔导师',
    title: '像素级对齐狂魔',
    rarity: 'orange',
    element: 'fe',
    role: '高闪避群攻',
    domains: { algo: 5, sys: 3, eng: 6, ai: 4, agility: 8, sec: 4, fe: 9, lang: 6 },
    passiveId: 'async_dodge',
    emblem: 'feather',
    skill: {
      name: 'Flexbox 绝对居中',
      desc: '对敌方全体造成 140% 伤害',
      type: 'aoe_dmg',
      multiplier: 1.40,
      target: 'all_enemies'
    }
  }),

  // 紫 (4)
  defineHero({
    id: 'sr_algor',
    name: '竞赛金牌手',
    title: '手速 AC 机器',
    rarity: 'purple',
    element: 'algo',
    role: '并发收割',
    domains: { algo: 9, sys: 4, eng: 5, ai: 5, agility: 8, sec: 4, fe: 4, lang: 6 },
    passiveId: 'multithread',
    emblem: 'crescent',
    skill: {
      name: '动态规划斩',
      desc: '对单体造成 200% 伤害，并将 45% 伤害转化为自身生命',
      type: 'lifesteal',
      multiplier: 2.00,
      target: 'single_enemy'
    }
  }),
  defineHero({
    id: 'sr_hacker',
    name: '内核极客',
    title: '裸机调优大师',
    rarity: 'purple',
    element: 'kernel',
    role: '横扫破盾',
    domains: { algo: 6, sys: 9, eng: 7, ai: 4, agility: 5, sec: 7, fe: 3, lang: 6 },
    passiveId: 'code_review',
    emblem: 'scythe',
    skill: {
      name: '中断风暴',
      desc: '对敌方全体造成 135% 伤害',
      type: 'aoe_dmg',
      multiplier: 1.35,
      target: 'all_enemies'
    }
  }),
  defineHero({
    id: 'pr_pentest',
    name: '红队白帽黑客',
    title: '0day 挖掘机',
    rarity: 'purple',
    element: 'sec',
    role: '残血穿甲',
    domains: { algo: 6, sys: 7, eng: 5, ai: 4, agility: 7, sec: 9, fe: 5, lang: 5 },
    passiveId: 'prune_execute',
    emblem: 'scythe',
    skill: {
      name: 'SQL 注入穿甲斩',
      desc: '对单体造成 205% 伤害并附带 2 回合破甲（防御 -30%）',
      type: 'armor_break',
      multiplier: 2.05,
      target: 'single_enemy'
    }
  }),
  defineHero({
    id: 'pr_ts',
    name: '类型体操宗师',
    title: '泛型套娃终结者',
    rarity: 'purple',
    element: 'lang',
    role: '狂暴吸血',
    domains: { algo: 7, sys: 4, eng: 6, ai: 4, agility: 6, sec: 5, fe: 7, lang: 9 },
    passiveId: 'ddl_berserk',
    emblem: 'crescent',
    skill: {
      name: '协变逆变裁决',
      desc: '对单体造成 195% 伤害，并将 45% 伤害转化为自身生命',
      type: 'lifesteal',
      multiplier: 1.95,
      target: 'single_enemy'
    }
  }),

  // 蓝 (2)
  defineHero({
    id: 'sr_ops',
    name: 'SRE 救火队长',
    title: '99.999% 可用性',
    rarity: 'blue',
    element: 'arch',
    role: '紧急治疗',
    domains: { algo: 4, sys: 7, eng: 8, ai: 4, agility: 6, sec: 7, fe: 4, lang: 4 },
    passiveId: 'git_rollback',
    emblem: 'droplet',
    skill: {
      name: 'P0 紧急回血',
      desc: '为生命最低的 2 名友方恢复攻击 160% 生命值',
      type: 'heal_lowest',
      multiplier: 1.60,
      target: 'lowest_allies'
    }
  }),
  defineHero({
    id: 'r_ddl',
    name: 'DDL 战神',
    title: '截止前两小时',
    rarity: 'blue',
    element: 'kernel',
    role: '残血狂暴',
    domains: { algo: 6, sys: 5, eng: 5, ai: 5, agility: 6, sec: 4, fe: 5, lang: 5 },
    passiveId: 'ddl_berserk',
    emblem: 'shield',
    skill: {
      name: '通宵冲刺盾',
      desc: '为自身施加 24% 最大生命护盾并造成 150% 单体伤害',
      type: 'self_shield',
      multiplier: 1.50,
      target: 'single_enemy'
    }
  }),

  // 绿 (2)
  defineHero({
    id: 'r_moyu',
    name: '摸鱼小能手',
    title: '异步摸鱼 · 防抖节流',
    rarity: 'green',
    element: 'fe',
    role: '高闪避敏捷',
    domains: { algo: 5, sys: 3, eng: 4, ai: 4, agility: 9, sec: 4, fe: 8, lang: 5 },
    passiveId: 'async_dodge',
    emblem: 'feather',
    skill: {
      name: '异步风刃',
      desc: '对敌方全体造成 120% 伤害',
      type: 'aoe_dmg',
      multiplier: 1.20,
      target: 'all_enemies'
    }
  }),
  defineHero({
    id: 'r_qa',
    name: '测试小哥',
    title: '漏洞捕手 · 边界审计',
    rarity: 'green',
    element: 'sec',
    role: '单体治疗',
    domains: { algo: 4, sys: 5, eng: 6, ai: 3, agility: 5, sec: 8, fe: 5, lang: 4 },
    passiveId: 'ha_shield',
    emblem: 'orb',
    skill: {
      name: '回归测试愈合',
      desc: '为生命最低 1 名友方恢复攻击 170% 生命值',
      type: 'heal_lowest_one',
      multiplier: 1.70,
      target: 'lowest_ally'
    }
  }),

  // 灰 (2)
  defineHero({
    id: 'r_intern',
    name: '大厂实习生',
    title: 'CRUD 新星',
    rarity: 'gray',
    element: 'arch',
    role: '基础输出',
    domains: { algo: 5, sys: 4, eng: 6, ai: 4, agility: 5, sec: 4, fe: 5, lang: 5 },
    passiveId: 'ddl_berserk',
    emblem: 'spark',
    skill: {
      name: '暴力递归',
      desc: '对敌方单体造成 185% 伤害',
      type: 'single_dmg',
      multiplier: 1.85,
      target: 'single_enemy'
    }
  }),
  defineHero({
    id: 'r_pm',
    name: '需求复读机',
    title: '这个很简单吧',
    rarity: 'gray',
    element: 'ai',
    role: '算力突刺',
    domains: { algo: 4, sys: 3, eng: 5, ai: 7, agility: 6, sec: 3, fe: 6, lang: 4 },
    passiveId: 'memory_leak',
    emblem: 'spear',
    skill: {
      name: '临时加需求',
      desc: '对敌方单体造成 185% 伤害',
      type: 'single_dmg',
      multiplier: 1.85,
      target: 'single_enemy'
    }
  })
];

export const HEROES = BUILTIN_HEROES;
export const HERO_MAP = Object.fromEntries(BUILTIN_HEROES.map((h) => [h.id, h]));

export function buildCustomHeroDef(input, idOverride) {
  const rarity = normalizeRarity(input.rarity, 'gold');
  const element = ELEMENTS[input.element] ? input.element : 'algo';
  const skillType = SKILL_TEMPLATES[input.skillType] ? input.skillType : 'crit_execute';
  const tplSkill = SKILL_TEMPLATES[skillType];
  const passiveId = PASSIVE_DEFS[input.passiveId] ? input.passiveId : 'multithread';
  const emblems = ['sunburst', 'star', 'blade', 'diamond', 'wave', 'flame', 'feather', 'rings'];
  const emblem = emblems.includes(input.emblem) ? input.emblem : 'star';

  return defineHero({
    id: idOverride || String(input.id),
    name: String(input.name || '神秘极客').slice(0, 24),
    title: String(input.title || '代码旅人').slice(0, 28),
    rarity,
    element,
    role: String(input.role || '好友定制').slice(0, 20),
    domains: input.domains || { algo: 7, sys: 7, eng: 7, ai: 7, agility: 7, sec: 7, fe: 7, lang: 7 },
    passiveId,
    emblem,
    isCustom: true,
    skill: {
      name: String(input.skillName || tplSkill.name).slice(0, 24),
      desc: String(input.skillDesc || tplSkill.desc),
      type: skillType,
      multiplier: tplSkill.multiplier,
      target: tplSkill.target
    }
  });
}

export function loadCustomHeroes(customPath = DEFAULT_CUSTOM_HEROES_PATH) {
  try {
    if (fs.existsSync(customPath)) {
      const raw = JSON.parse(fs.readFileSync(customPath, 'utf-8'));
      if (Array.isArray(raw)) {
        return raw.map((item) => buildCustomHeroDef(item, item.id));
      }
    }
  } catch (err) {
    console.error('Failed to read custom heroes:', err.message);
  }
  return [];
}

export function saveCustomHero(customPath = DEFAULT_CUSTOM_HEROES_PATH, input) {
  const list = loadCustomHeroes(customPath);
  const id = `custom_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`;
  const hero = buildCustomHeroDef(input, id);
  const toRaw = (h) => ({
    id: h.id,
    name: h.name,
    title: h.title,
    rarity: h.rarity,
    element: h.element,
    role: h.role,
    domains: h.domains,
    passiveId: h.passiveId,
    emblem: h.emblem,
    skillType: h.skill.type,
    skillName: h.skill.name,
    skillDesc: h.skill.desc
  });
  const nextRaw = [...list.map(toRaw), toRaw(hero)];

  fs.mkdirSync(path.dirname(customPath), { recursive: true });
  const tmp = `${customPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(nextRaw, null, 2), 'utf-8');
  fs.renameSync(tmp, customPath);
  return hero;
}

export function getAllHeroes(customPath = DEFAULT_CUSTOM_HEROES_PATH) {
  return [...BUILTIN_HEROES, ...loadCustomHeroes(customPath)];
}

export function getHeroMap(customPath = DEFAULT_CUSTOM_HEROES_PATH) {
  return Object.fromEntries(getAllHeroes(customPath).map((h) => [h.id, h]));
}
