export const ELEMENTS = {
  kernel: { id: 'kernel', name: '内核', color: '#D94F3D', bg: '#FDF1EF', beats: 'algo' },
  algo: { id: 'algo', name: '算法', color: '#2F8F7B', bg: '#EEF8F5', beats: 'arch' },
  arch: { id: 'arch', name: '架构', color: '#2F6FB0', bg: '#EFF5FC', beats: 'kernel' },
  ai: { id: 'ai', name: '算力', color: '#C98A2C', bg: '#FCF6EA', beats: 'all' }
};

export const CS_DOMAINS = [
  { key: 'algo', name: '算法', hint: '提升攻击、暴击率与暴伤' },
  { key: 'sys', name: '底层', hint: '提升防御、格挡率与格挡减伤' },
  { key: 'eng', name: '工程', hint: '提升生命值与护盾/治疗基数' },
  { key: 'ai', name: '炼丹', hint: '提升终结技倍率与初始怒气' },
  { key: 'agility', name: '速通', hint: '提升行动速度与闪避率' }
];

export const PASSIVE_DEFS = {
  code_review: {
    id: 'code_review',
    name: '毒舌 Review & Git Reset',
    desc: '攻击前粉碎目标 50% 护盾并挂 2 回合破甲；首次血量低于 35% 触发 git reset --hard 回复 35% 生命并清负面'
  },
  multithread: {
    id: 'multithread',
    name: 'MapReduce 并发',
    desc: '普攻 55% 概率触发多核连击（追加 65% 伤害）；释放大招时额外为全队回复 +15 怒气'
  },
  prune_execute: {
    id: 'prune_execute',
    name: 'α-β 剪枝斩杀',
    desc: '攻击半血以下目标时伤害 +30% 并无视 20% 防御'
  },
  memory_leak: {
    id: 'memory_leak',
    name: '内存泄漏',
    desc: '每次攻击为目标叠加持续掉血（最多 3 层，每回合扣除攻击 25%）'
  },
  ha_shield: {
    id: 'ha_shield',
    name: '高可用灾备',
    desc: '开局自带最大生命 20% 护盾'
  },
  git_rollback: {
    id: 'git_rollback',
    name: 'Git 回滚',
    desc: '每场首次生命低于 30% 时回滚回复 30% 生命并获得 15% 护盾'
  },
  ddl_berserk: {
    id: 'ddl_berserk',
    name: 'DDL 狂暴',
    desc: '生命越低战力越强，最多提升 45% 攻击与 25% 速度'
  },
  async_dodge: {
    id: 'async_dodge',
    name: '异步甩锅',
    desc: '闪避成功时回复 +25 怒气并立即反击目标 55% 伤害'
  }
};

export const SKILL_TEMPLATES = {
  aoe_stun_burn: { name: 'Kernel Panic', desc: '对全体造成 175% 伤害与 2 回合灼烧，40% 概率令主目标阻塞 1 回合', target: 'all_enemies', multiplier: 1.75 },
  team_shield_aoe_exec: { name: 'Tensor 降维打击', desc: '全队获得攻击 100% 护盾，对全体造成 170% 伤害（目标越残血伤害越高）', target: 'all_enemies', multiplier: 1.70 },
  crit_execute: { name: 'TAOCP 终极剪枝', desc: '锁定生命最低敌人造成 250% 伤害，半血以下额外提升 35% 伤害', target: 'lowest_hp_enemy', multiplier: 2.50 },
  aoe_stun: { name: '停机问题裁决', desc: '对敌方全体造成 155% 伤害，35% 概率使目标阻塞 1 回合', target: 'all_enemies', multiplier: 1.55 },
  team_heal_shield: { name: '首个 Debug 奇迹', desc: '为全队恢复攻击 145% 生命，并施加 40% 攻击的护盾', target: 'all_allies', multiplier: 1.45 },
  fortress_slam: { name: 'Unix 基石重铸', desc: '为自身施加 30% 最大生命护盾并对全体造成 130% 伤害', target: 'all_enemies', multiplier: 1.30 },
  armor_break: { name: '架构重构斩', desc: '对单体造成 210% 伤害并降低目标 30% 防御 2 回合', target: 'single_enemy', multiplier: 2.10 },
  heal_lowest: { name: 'P0 紧急回血', desc: '为生命最低 2 名友方恢复攻击 160% 生命值', target: 'lowest_allies', multiplier: 1.60 },
  aoe_dmg: { name: '并发洪流', desc: '对敌方全体造成 135% 伤害', target: 'all_enemies', multiplier: 1.35 },
  team_atk_buff: { name: '梯度同步鼓舞', desc: '提升全队 22% 攻击 2 回合，并对单体造成 165% 伤害', target: 'single_enemy', multiplier: 1.65 },
  lifesteal: { name: '指针吸取', desc: '对单体造成 200% 伤害并将 45% 伤害转化为自身生命', target: 'single_enemy', multiplier: 2.00 },
  self_shield: { name: '防御性编程', desc: '自身获得 24% 最大生命护盾并造成 150% 单体伤害', target: 'single_enemy', multiplier: 1.50 },
  single_dmg: { name: '暴力递归', desc: '对敌方单体造成 185% 伤害', target: 'single_enemy', multiplier: 1.85 }
};

export const RARITY_LIST = [
  'gray', 'green', 'blue', 'purple', 'orange', 'red', 'gold', 'platinum', 'violet_gold'
];

export const RARITY_ORDER = {
  violet_gold: 9,
  platinum: 8,
  gold: 7,
  red: 6,
  orange: 5,
  purple: 4,
  blue: 3,
  green: 2,
  gray: 1
};

export const RARITY_META = {
  violet_gold: { label: '紫金', color: '#7e22ce', bg: '#f6effd' },
  platinum: { label: '白金', color: '#475569', bg: '#f1f5f9' },
  gold: { label: '金', color: '#ca8a04', bg: '#fef9e7' },
  red: { label: '红', color: '#dc2626', bg: '#fef2f2' },
  orange: { label: '橙', color: '#ea580c', bg: '#fff7ed' },
  purple: { label: '紫', color: '#7c3aed', bg: '#f5f3ff' },
  blue: { label: '蓝', color: '#2563eb', bg: '#eff6ff' },
  green: { label: '绿', color: '#2e8b57', bg: '#eefaf3' },
  gray: { label: '灰', color: '#6b7280', bg: '#f3f4f6' }
};

export const LEGACY_RARITY_MAP = {
  R: 'green',
  SR: 'purple',
  SSR: 'gold',
  UR: 'violet_gold'
};

export const SHARD_CONVERT = {
  gray: 5,
  green: 8,
  blue: 12,
  purple: 18,
  orange: 25,
  red: 35,
  gold: 50,
  platinum: 70,
  violet_gold: 100
};

export const GACHA_COSTS = { 1: 160, 10: 1500, 50: 7000 };
export const FORGE_COSTS = { 1: 1500, 10: 13500 };
export const EXPLORE_COSTS = { 1: 200, 10: 1800 };

export const STAR_SHARD_COST = { 1: 20, 2: 40, 3: 80, 4: 120, 5: 200 };

export const MAX_LEVEL = 100;
export const MAX_STAR = 6;
export const MAX_EQUIP_LEVEL = 30;
export const MAX_TREASURE_LEVEL = 10;

export const EQUIP_SLOTS = ['weapon', 'armor', 'helm', 'boots'];
export const EQUIP_SLOT_NAMES = {
  weapon: '机械键盘',
  armor: '格子卫衣',
  helm: '降噪耳机',
  boots: '工学椅'
};

export const TREASURE_SLOTS = ['relic', 'emblem'];
export const TREASURE_SLOT_NAMES = {
  relic: '传奇圣物',
  emblem: '系统印记'
};

export const MAX_DOMAIN_BONUS = 5;
export const MAX_CS_MODULE_LEVEL = 5;

export const COMPILE_TIERS = [
  {
    tier: 0,
    flag: '-O0',
    name: 'Debug 基线',
    tech: '保留完整符号表与未内联栈帧，无额外编译优化',
    hpPct: 0, atkPct: 0, defPct: 0, spdPct: 0, critDmg: 0, skillScale: 0, initRage: 0
  },
  {
    tier: 1,
    flag: '-O1',
    name: 'DCE 死代码消除',
    tech: 'Dead Code Elimination & 常量折叠，剔除冗余指令',
    hpPct: 0.05, atkPct: 0.05, defPct: 0.05, spdPct: 0.03, critDmg: 0, skillScale: 0.02, initRage: 0
  },
  {
    tier: 2,
    flag: '-O2',
    name: '内联与循环展开',
    tech: 'Function Inlining & Loop Unrolling，减少分支跳转开销',
    hpPct: 0.10, atkPct: 0.11, defPct: 0.10, spdPct: 0.06, critDmg: 0.05, skillScale: 0.06, initRage: 4
  },
  {
    tier: 3,
    flag: '-O3',
    name: 'SIMD 自动向量化',
    tech: 'AVX-512 向量寄存器并行调度，大幅提高吞吐与爆发',
    hpPct: 0.16, atkPct: 0.18, defPct: 0.15, spdPct: 0.10, critDmg: 0.12, skillScale: 0.12, initRage: 8
  },
  {
    tier: 4,
    flag: '-Ofast',
    name: 'LTO + PGO 终极编译',
    tech: '跨模块链接时优化 & 剖析引导分支预测',
    hpPct: 0.24, atkPct: 0.26, defPct: 0.22, spdPct: 0.15, critDmg: 0.20, skillScale: 0.20, initRage: 15
  }
];

export const COMPILE_PROFILES = {
  standard: {
    id: 'standard',
    flag: '-pipe',
    name: '标准稳态',
    desc: '均衡调度指令流水线，无额外副作用',
    minTier: 0,
    bonuses: {}
  },
  fast_math: {
    id: 'fast_math',
    flag: '-ffast-math',
    name: '激进算力',
    desc: '攻击 +12%、暴伤 +18%、防御 -8%（放宽精度校验换峰值算力）',
    minTier: 1,
    bonuses: { atkPct: 0.12, critDmg: 0.18, defPct: -0.08 }
  },
  low_latency: {
    id: 'low_latency',
    flag: '-march=native',
    name: '实时低延迟',
    desc: '速度 +14%、闪避 +6%、开局怒气 +15（CPU 亲和与实时调度）',
    minTier: 1,
    bonuses: { spdPct: 0.14, dodgeRate: 0.06, initRage: 15 }
  },
  hardened: {
    id: 'hardened',
    flag: '-fstack-protector',
    name: '内存加固',
    desc: '生命 +14%、防御 +14%、格挡 +8%（栈金丝雀与边界检查）',
    minTier: 1,
    bonuses: { hpPct: 0.14, defPct: 0.14, blockRate: 0.08 }
  }
};

export const CS_MODULES = [
  {
    id: 'complexity',
    name: '算法复杂度',
    subtitle: 'O(N²) → O(1) 哈希与剪枝',
    desc: '每级：攻击 +3.5%、暴击 +1.2%、无视防御 +4%（满级 20% 穿甲）',
    perLevel: { atkPct: 0.035, critRate: 0.012, armorPen: 0.04 },
    maxEffect: '20% 防御穿透'
  },
  {
    id: 'concurrency',
    name: '并发与调度',
    subtitle: '无锁队列 / CAS / epoll',
    desc: '每级：速度 +3、回怒效率 +5%；Lv.5 解锁「CAS 无锁连击」(普攻 25% 追加 40% 伤害)',
    perLevel: { spd: 3, rageGainPct: 0.05 },
    maxEffect: 'CAS 无锁连击'
  },
  {
    id: 'cache',
    name: '存储与缓存',
    subtitle: 'L1/L2 Cache 局部性 / CoW',
    desc: '每级：生命 +4%、护盾效能 +6%；Lv.5 解锁「L1 预取护盾」(开局 12% 生命护盾)',
    perLevel: { hpPct: 0.04, shieldMult: 0.06 },
    maxEffect: 'L1 预取护盾'
  },
  {
    id: 'consensus',
    name: '共识与容错',
    subtitle: 'Raft 共识 / 熔断降级',
    desc: '每级：防御 +4%、格挡 +1.5%、阻塞抗性 +10%；Lv.5 解锁「熔断降级」(首次致命伤锁血 1 HP 并获 18% 护盾)',
    perLevel: { defPct: 0.04, blockRate: 0.015, ccResist: 0.10 },
    maxEffect: '熔断降级'
  }
];

export const COVERAGE_TIERS = [
  { tier: 0, pct: 0, name: '裸奔上线', desc: '无测试保护 · 伤害浮动 95%~105%', hpPct: 0, atkPct: 0, defPct: 0, spd: 0, varianceFloor: 0.95, dotResist: 0 },
  { tier: 1, pct: 20, name: 'Smoke Test', desc: '生命/防御 +4% · 浮动下限 96% · DoT 减伤 5%', hpPct: 0.04, atkPct: 0, defPct: 0.04, spd: 0, varianceFloor: 0.96, dotResist: 0.05 },
  { tier: 2, pct: 40, name: '单元测试', desc: '攻击 +5%、生命/防御 +6% · 浮动下限 97% · DoT 减伤 10%', hpPct: 0.06, atkPct: 0.05, defPct: 0.06, spd: 0, varianceFloor: 0.97, dotResist: 0.10 },
  { tier: 3, pct: 60, name: '集成测试', desc: '全三围 +9%、速度 +4 · 浮动下限 98% · DoT 减伤 16%', hpPct: 0.09, atkPct: 0.09, defPct: 0.09, spd: 4, varianceFloor: 0.98, dotResist: 0.16 },
  { tier: 4, pct: 80, name: 'E2E 回归', desc: '攻击 +13%、生命/防御 +12%、速度 +8 · 浮动 100%~110% · DoT 减伤 22%', hpPct: 0.12, atkPct: 0.13, defPct: 0.12, spd: 8, varianceFloor: 1.00, dotResist: 0.22 },
  { tier: 5, pct: 100, name: '形式化验证', desc: '攻击 +18%、生命/防御 +16%、速度 +12 · 浮动 102%~112% · DoT 减伤 30%', hpPct: 0.16, atkPct: 0.18, defPct: 0.16, spd: 12, varianceFloor: 1.02, dotResist: 0.30 }
];
