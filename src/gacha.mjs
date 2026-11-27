import { EQUIP_SLOTS, RARITY_LIST, RARITY_ORDER, SHARD_CONVERT } from './constants.mjs';
import {
  EQUIP_SETS,
  TREASURE_TEMPLATES,
  createEquipInstance,
  createTreasureInstance,
  enrichEquip,
  enrichTreasure
} from './gear.mjs';
import { HEROES } from './heroes.mjs';
import { normalizeHeroInstance } from './stats.mjs';

function pickWeighted(weights, rng) {
  const total = weights.reduce((s, w) => s + w[1], 0);
  let r = rng() * total;
  for (const [key, w] of weights) {
    r -= w;
    if (r <= 0) return key;
  }
  return weights[weights.length - 1][0];
}

const HERO_WEIGHTS = [
  ['violet_gold', 0.5],
  ['platinum', 1.1],
  ['gold', 2.4],
  ['red', 4.5],
  ['orange', 8.5],
  ['purple', 15],
  ['blue', 22],
  ['green', 24],
  ['gray', 22]
];

const HERO_PITY50_WEIGHTS = [
  ['violet_gold', 10],
  ['platinum', 20],
  ['gold', 35],
  ['red', 35]
];

const EQUIP_WEIGHTS = [
  ['violet_gold', 0.8],
  ['platinum', 1.6],
  ['gold', 3.6],
  ['red', 6],
  ['orange', 10],
  ['purple', 16],
  ['blue', 22],
  ['green', 22],
  ['gray', 18]
];

const TREASURE_WEIGHTS = [
  ['violet_gold', 3],
  ['platinum', 7],
  ['gold', 14],
  ['red', 20],
  ['orange', 22],
  ['purple', 18],
  ['blue', 16]
];

function pickHeroRarity(pitySr, pitySsr, rng = Math.random) {
  if (pitySsr >= 49) {
    return pickWeighted(HERO_PITY50_WEIGHTS, rng);
  }
  const picked = pickWeighted(HERO_WEIGHTS, rng);
  if (pitySr >= 9 && RARITY_ORDER[picked] < RARITY_ORDER.purple) {
    return rng() < 0.35 ? 'orange' : 'purple';
  }
  return picked;
}

export function rollGacha(state, count, rng = Math.random, heroPool = HEROES) {
  const byRarity = Object.fromEntries(
    RARITY_LIST.map((r) => [r, heroPool.filter((h) => h.rarity === r)])
  );

  const results = [];
  for (let i = 0; i < count; i++) {
    let rarity = pickHeroRarity(state.pitySr, state.pitySsr, rng);
    if (!byRarity[rarity]?.length) {
      rarity = RARITY_LIST.find((r) => byRarity[r]?.length) || 'purple';
    }
    const candidates = byRarity[rarity];
    const picked = candidates[Math.floor(rng() * candidates.length)];

    state.totalPulls += 1;
    const ord = RARITY_ORDER[rarity];
    if (ord >= RARITY_ORDER.red) {
      state.pitySsr = 0;
      state.pitySr = 0;
    } else if (ord >= RARITY_ORDER.purple) {
      state.pitySr = 0;
      state.pitySsr += 1;
    } else {
      state.pitySr += 1;
      state.pitySsr += 1;
    }

    const existing = state.heroes[picked.id];
    let isNew = false;
    let shardsGained = 0;
    if (!existing) {
      isNew = true;
      state.heroes[picked.id] = normalizeHeroInstance({ id: picked.id, level: 1, star: 1, shards: 0 });
    } else {
      shardsGained = SHARD_CONVERT[rarity] || 10;
      existing.shards += shardsGained;
    }

    results.push({
      heroId: picked.id,
      name: picked.name,
      title: picked.title,
      rarity: picked.rarity,
      element: picked.element,
      emblem: picked.emblem,
      isNew,
      shardsGained
    });
  }
  return results;
}

export function nextInstanceUid(state, prefix) {
  state.nextUid = (state.nextUid || 1) + 1;
  return `${prefix}_${state.nextUid}`;
}

export function rollEquipForge(state, count, rng = Math.random) {
  const setKeys = Object.keys(EQUIP_SETS);
  const results = [];
  for (let i = 0; i < count; i++) {
    let rarity;
    if ((state.pityEquip || 0) >= 9) {
      rarity = pickWeighted(HERO_PITY50_WEIGHTS, rng);
    } else {
      rarity = pickWeighted(EQUIP_WEIGHTS, rng);
    }

    if (RARITY_ORDER[rarity] >= RARITY_ORDER.red) {
      state.pityEquip = 0;
    } else {
      state.pityEquip = (state.pityEquip || 0) + 1;
    }

    const setId = setKeys[Math.floor(rng() * setKeys.length)];
    const slot = EQUIP_SLOTS[Math.floor(rng() * EQUIP_SLOTS.length)];
    const uid = nextInstanceUid(state, 'eq');
    const eq = createEquipInstance(uid, setId, slot, rarity, 0);
    state.equips[uid] = eq;
    results.push(enrichEquip(eq));
  }
  return results;
}

export function rollTreasureExplore(state, count, rng = Math.random) {
  const byRarity = Object.fromEntries(
    RARITY_LIST.map((r) => [r, TREASURE_TEMPLATES.filter((t) => t.rarity === r)])
  );
  const results = [];
  for (let i = 0; i < count; i++) {
    let rarity;
    if ((state.pityTreasure || 0) >= 9) {
      rarity = pickWeighted(HERO_PITY50_WEIGHTS, rng);
    } else {
      rarity = pickWeighted(TREASURE_WEIGHTS, rng);
    }
    if (!byRarity[rarity]?.length) {
      rarity = TREASURE_TEMPLATES[0].rarity;
    }

    if (RARITY_ORDER[rarity] >= RARITY_ORDER.red) {
      state.pityTreasure = 0;
    } else {
      state.pityTreasure = (state.pityTreasure || 0) + 1;
    }

    const pool = byRarity[rarity];
    const tpl = pool[Math.floor(rng() * pool.length)];
    const uid = nextInstanceUid(state, 'tr');
    const tr = createTreasureInstance(uid, tpl.id, 0);
    state.treasures[uid] = tr;
    results.push(enrichTreasure(tr));
  }
  return results;
}

export function rollStageDrop(state, stageId, rng = Math.random) {
  const drops = [];
  if (rng() < 0.55) {
    const setKeys = Object.keys(EQUIP_SETS);
    const setId = setKeys[Math.floor(rng() * setKeys.length)];
    const slot = EQUIP_SLOTS[Math.floor(rng() * EQUIP_SLOTS.length)];
    const r = rng();
    let rarity = 'green';
    if (stageId >= 11) rarity = r < 0.06 ? 'violet_gold' : r < 0.16 ? 'platinum' : r < 0.35 ? 'gold' : r < 0.65 ? 'red' : 'orange';
    else if (stageId >= 7) rarity = r < 0.10 ? 'gold' : r < 0.30 ? 'red' : r < 0.60 ? 'orange' : 'purple';
    else if (stageId >= 4) rarity = r < 0.15 ? 'orange' : r < 0.45 ? 'purple' : 'blue';
    else rarity = r < 0.35 ? 'blue' : r < 0.75 ? 'green' : 'gray';

    const uid = nextInstanceUid(state, 'eq');
    const eq = createEquipInstance(uid, setId, slot, rarity, 0);
    state.equips[uid] = eq;
    drops.push({ kind: 'equip', item: enrichEquip(eq) });
  }
  if (stageId >= 3 && rng() < 0.22) {
    const r = rng();
    let pool;
    if (stageId >= 10 && r < 0.15) pool = TREASURE_TEMPLATES.filter((t) => t.rarity === 'violet_gold' || t.rarity === 'platinum');
    else if (stageId >= 6 && r < 0.45) pool = TREASURE_TEMPLATES.filter((t) => t.rarity === 'gold' || t.rarity === 'red');
    else pool = TREASURE_TEMPLATES.filter((t) => t.rarity === 'orange' || t.rarity === 'purple' || t.rarity === 'blue');

    const tpl = pool[Math.floor(rng() * pool.length)];
    const uid = nextInstanceUid(state, 'tr');
    const tr = createTreasureInstance(uid, tpl.id, 0);
    state.treasures[uid] = tr;
    drops.push({ kind: 'treasure', item: enrichTreasure(tr) });
  }
  return drops;
}
