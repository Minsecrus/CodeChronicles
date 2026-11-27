import fs from 'node:fs';
import path from 'node:path';
import {
  EQUIP_SLOTS,
  LEGACY_RARITY_MAP,
  MAX_EQUIP_LEVEL,
  MAX_TREASURE_LEVEL,
  RARITY_ORDER
} from './constants.mjs';
import {
  EQUIP_SETS,
  TREASURE_MAP,
  TREASURE_TEMPLATES,
  createEquipInstance,
  createTreasureInstance
} from './gear.mjs';
import { nextInstanceUid } from './gacha.mjs';
import { normalizeHeroInstance } from './stats.mjs';

export function createInitialSave() {
  const save = {
    diamonds: 3200,
    gold: 15000,
    exp: 500,
    maxClearedStage: 0,
    pitySr: 0,
    pitySsr: 0,
    pityEquip: 0,
    pityTreasure: 0,
    totalPulls: 0,
    nextUid: 10,
    team: ['sr_arch', 'r_intern', 'r_moyu'],
    heroes: {
      sr_arch: normalizeHeroInstance({ id: 'sr_arch', level: 1, star: 1, shards: 0 }),
      r_intern: normalizeHeroInstance({ id: 'r_intern', level: 1, star: 1, shards: 0 }),
      r_moyu: normalizeHeroInstance({ id: 'r_moyu', level: 1, star: 1, shards: 0 })
    },
    equips: {},
    treasures: {}
  };

  const eq1 = createEquipInstance('eq_1', 'kernel_set', 'weapon', 'orange', 0);
  eq1.equippedBy = 'sr_arch';
  const eq2 = createEquipInstance('eq_2', 'acm_set', 'boots', 'purple', 0);
  eq2.equippedBy = 'r_moyu';
  const tr1 = createTreasureInstance('tr_1', 'tr_sr_01', 0);
  tr1.equippedBy = 'sr_arch';

  save.equips[eq1.uid] = eq1;
  save.equips[eq2.uid] = eq2;
  save.treasures[tr1.uid] = tr1;
  return save;
}

export function migrateSave(raw, validHeroIds = null) {
  if (!raw || typeof raw !== 'object' || !raw.heroes) {
    return createInitialSave();
  }

  const heroes = {};
  for (const [id, inst] of Object.entries(raw.heroes)) {
    if (!validHeroIds || validHeroIds.has(id)) {
      heroes[id] = normalizeHeroInstance({ ...inst, id });
    }
  }
  if (Object.keys(heroes).length === 0) {
    return createInitialSave();
  }

  const team = Array.isArray(raw.team)
    ? raw.team.filter((id) => Boolean(heroes[id])).slice(0, 3)
    : [];
  if (team.length === 0) {
    team.push(...Object.keys(heroes).slice(0, 3));
  }

  const equips = {};
  if (raw.equips && typeof raw.equips === 'object') {
    for (const [uid, eq] of Object.entries(raw.equips)) {
      const setId = EQUIP_SETS[eq.setId] ? eq.setId : 'kernel_set';
      const rarity = RARITY_ORDER[eq.rarity] ? eq.rarity : (LEGACY_RARITY_MAP[eq.rarity] || 'blue');
      equips[uid] = {
        ...eq,
        setId,
        rarity,
        equippedBy: eq.equippedBy && heroes[eq.equippedBy] ? eq.equippedBy : null
      };
    }
  }

  const treasures = {};
  if (raw.treasures && typeof raw.treasures === 'object') {
    for (const [uid, tr] of Object.entries(raw.treasures)) {
      const tpl = TREASURE_MAP[tr.templateId];
      const rarity = tpl ? tpl.rarity : (RARITY_ORDER[tr.rarity] ? tr.rarity : (LEGACY_RARITY_MAP[tr.rarity] || 'blue'));
      treasures[uid] = {
        ...tr,
        rarity,
        equippedBy: tr.equippedBy && heroes[tr.equippedBy] ? tr.equippedBy : null
      };
    }
  }

  return {
    diamonds: raw.diamonds ?? 3200,
    gold: raw.gold ?? 15000,
    exp: raw.exp ?? 500,
    maxClearedStage: raw.maxClearedStage ?? 0,
    pitySr: raw.pitySr ?? 0,
    pitySsr: raw.pitySsr ?? 0,
    pityEquip: raw.pityEquip ?? 0,
    pityTreasure: raw.pityTreasure ?? 0,
    totalPulls: raw.totalPulls ?? 0,
    nextUid: raw.nextUid ?? 100,
    team,
    heroes,
    equips,
    treasures
  };
}

export function loadSave(savePath, validHeroIds = null) {
  try {
    if (fs.existsSync(savePath)) {
      const raw = fs.readFileSync(savePath, 'utf-8');
      return migrateSave(JSON.parse(raw), validHeroIds);
    }
  } catch (err) {
    console.error('Failed to read save, resetting:', err.message);
  }
  const fresh = createInitialSave();
  persistSave(savePath, fresh);
  return fresh;
}

export function persistSave(savePath, data) {
  const dir = path.dirname(savePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${savePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, savePath);
}

export function grantGodGear(save) {
  const sets = Object.keys(EQUIP_SETS);
  for (let i = 0; i < 3; i++) {
    const setId = sets[i % sets.length];
    for (const slot of EQUIP_SLOTS) {
      const uid = nextInstanceUid(save, 'eq');
      save.equips[uid] = createEquipInstance(uid, setId, slot, 'violet_gold', MAX_EQUIP_LEVEL);
    }
  }
  const topTreasures = TREASURE_TEMPLATES
    .filter((t) => RARITY_ORDER[t.rarity] >= RARITY_ORDER.violet_gold);
  for (const tpl of topTreasures) {
    const uid = nextInstanceUid(save, 'tr');
    save.treasures[uid] = createTreasureInstance(uid, tpl.id, MAX_TREASURE_LEVEL);
  }
}

export function grantLinusAndJeff(save) {
  if (!save.heroes.ur_linus) {
    save.heroes.ur_linus = normalizeHeroInstance({ id: 'ur_linus', level: 1, star: 1, shards: 0 });
  }
  if (!save.heroes.ur_jeff) {
    save.heroes.ur_jeff = normalizeHeroInstance({ id: 'ur_jeff', level: 1, star: 1, shards: 0 });
  }
  const third = save.team.find((id) => id !== 'ur_linus' && id !== 'ur_jeff') || 'sr_arch';
  if (!save.heroes[third]) {
    save.heroes[third] = normalizeHeroInstance({ id: third, level: 1, star: 1, shards: 0 });
  }
  save.team = ['ur_linus', 'ur_jeff', third];
}
