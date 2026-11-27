import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COMPILE_PROFILES,
  COMPILE_TIERS,
  COVERAGE_TIERS,
  CS_DOMAINS,
  CS_MODULES,
  DEFAULT_CUSTOM_HEROES_PATH,
  ELEMENTS,
  EQUIP_SETS,
  EQUIP_SLOTS,
  EQUIP_SLOT_NAMES,
  EXPLORE_COSTS,
  FORGE_COSTS,
  GACHA_COSTS,
  MAX_CS_MODULE_LEVEL,
  MAX_DOMAIN_BONUS,
  MAX_EQUIP_LEVEL,
  MAX_LEVEL,
  MAX_STAR,
  MAX_TREASURE_LEVEL,
  PASSIVE_DEFS,
  RARITY_META,
  RARITY_ORDER,
  SKILL_TEMPLATES,
  STAR_SHARD_COST,
  STAGES,
  TREASURE_SLOTS,
  TREASURE_SLOT_NAMES,
  compileUpgradeCost,
  computeHeroStats,
  computeTeamSynergy,
  coverageUpgradeCost,
  createInitialSave,
  domainTrainCost,
  enrichEquip,
  enrichTreasure,
  equipEnhanceCost,
  getAllHeroes,
  getHeroMap,
  getStageConfig,
  grantGodGear,
  grantLinusAndJeff,
  levelUpCost,
  loadSave,
  moduleUpgradeCost,
  normalizeHeroInstance,
  persistSave,
  rollEquipForge,
  rollGacha,
  rollStageDrop,
  rollTreasureExplore,
  saveCustomHero,
  simulateBattle,
  treasureRefineCost
} from './game-data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

function getHeroGear(save, heroId) {
  const equips = Object.values(save.equips).filter((e) => e.equippedBy === heroId);
  const treasures = Object.values(save.treasures).filter((t) => t.equippedBy === heroId);
  return { equips, treasures };
}

function buildClientState(save, customHeroesPath) {
  const allHeroes = getAllHeroes(customHeroesPath);
  const heroMap = Object.fromEntries(allHeroes.map((h) => [h.id, h]));

  const equipsList = Object.values(save.equips)
    .map(enrichEquip)
    .sort((a, b) => (RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]) || (b.stats.score - a.stats.score));

  const treasuresList = Object.values(save.treasures)
    .map((t) => enrichTreasure(t))
    .sort((a, b) => (RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]) || (b.stats.score - a.stats.score));

  const ownedList = Object.values(save.heroes)
    .filter((inst) => Boolean(heroMap[inst.id]))
    .map((inst) => {
      const normInst = normalizeHeroInstance(inst);
      const def = heroMap[normInst.id];
      const heroEquips = equipsList.filter((e) => e.equippedBy === normInst.id);
      const heroTreasures = Object.values(save.treasures)
        .filter((t) => t.equippedBy === normInst.id)
        .map((t) => enrichTreasure(t, { ...def, domains: computeHeroStats(def, normInst).effectiveDomains }));
      const stats = computeHeroStats(def, normInst, heroEquips, heroTreasures);
      const nextLvCost = normInst.level < MAX_LEVEL ? levelUpCost(normInst.level) : null;
      const starCost = normInst.star < MAX_STAR
        ? { shards: STAR_SHARD_COST[normInst.star], gold: normInst.star * 2500 }
        : null;

      const domainCosts = {};
      for (const d of CS_DOMAINS) {
        const cur = normInst.domainsBonus[d.key] || 0;
        domainCosts[d.key] = cur < MAX_DOMAIN_BONUS ? domainTrainCost(cur) : null;
      }
      const nextCompileCost = normInst.compileLevel < COMPILE_TIERS.length - 1
        ? compileUpgradeCost(normInst.compileLevel)
        : null;
      const nextCoverageCost = normInst.coverageTier < COVERAGE_TIERS.length - 1
        ? coverageUpgradeCost(normInst.coverageTier)
        : null;
      const moduleCosts = {};
      for (const m of CS_MODULES) {
        const cur = normInst.modules[m.id] || 0;
        moduleCosts[m.id] = cur < MAX_CS_MODULE_LEVEL ? moduleUpgradeCost(cur) : null;
      }

      const equipSlots = {};
      for (const sl of EQUIP_SLOTS) {
        equipSlots[sl] = heroEquips.find((e) => e.slot === sl) || null;
      }
      const treasureSlots = {};
      for (const sl of TREASURE_SLOTS) {
        treasureSlots[sl] = heroTreasures.find((t) => t.slot === sl) || null;
      }

      return {
        ...def,
        baseDomains: def.domains,
        domains: stats.effectiveDomains,
        domainsBonus: normInst.domainsBonus,
        compileLevel: normInst.compileLevel,
        compileProfile: normInst.compileProfile,
        coverageTier: normInst.coverageTier,
        modules: normInst.modules,
        domainCosts,
        nextCompileCost,
        nextCoverageCost,
        moduleCosts,
        level: normInst.level,
        star: normInst.star,
        shards: normInst.shards,
        stats,
        equipSlots,
        treasureSlots,
        nextLvCost,
        starCost,
        inTeam: save.team.includes(normInst.id)
      };
    })
    .sort((a, b) => {
      if (a.inTeam !== b.inTeam) return a.inTeam ? -1 : 1;
      if (RARITY_ORDER[b.rarity] !== RARITY_ORDER[a.rarity]) {
        return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
      }
      return b.stats.power - a.stats.power;
    });

  const teamDefs = save.team.map((id) => heroMap[id]).filter(Boolean);
  const synergy = computeTeamSynergy(teamDefs);
  const teamHeroes = save.team.map((id) => ownedList.find((h) => h.id === id)).filter(Boolean);
  const baseTeamPower = teamHeroes.reduce((s, h) => s + h.stats.power, 0);
  const teamPower = Math.round(baseTeamPower * (1 + synergy.hpBonus * 0.5 + synergy.atkBonus * 0.5 + synergy.spdBonus * 0.5));

  const maxDisplayStage = Math.max(STAGES.length, save.maxClearedStage + 1);
  const stages = [];
  for (let i = 1; i <= maxDisplayStage; i++) {
    const cfg = getStageConfig(i);
    if (!cfg) continue;
    const enemyDefs = cfg.enemies.map((e) => heroMap[e.heroId]).filter(Boolean);
    const enemySynergy = computeTeamSynergy(enemyDefs);
    const enrichedEnemies = cfg.enemies.map((e) => {
      const def = heroMap[e.heroId];
      if (!def) return e;
      const es = computeHeroStats(def, { level: e.level, star: e.star });
      const maxHp = Math.round(es.hp * (1 + (enemySynergy.hpBonus || 0)));
      const hasHaShield = es.passives?.some((p) => p.id === 'ha_shield');
      return {
        ...e,
        name: def.name,
        rarity: def.rarity,
        element: def.element,
        emblem: def.emblem,
        maxHp,
        shield: hasHaShield ? Math.round(maxHp * 0.20) : 0,
        rage: Math.min(100, 40 + (es.initRageBonus || 0) + (enemySynergy.initRageBonus || 0))
      };
    });
    stages.push({
      ...cfg,
      enemies: enrichedEnemies,
      cleared: i <= save.maxClearedStage,
      unlocked: i <= save.maxClearedStage + 1
    });
  }

  return {
    diamonds: save.diamonds,
    gold: save.gold,
    exp: save.exp,
    maxClearedStage: save.maxClearedStage,
    pitySr: save.pitySr,
    pitySsr: save.pitySsr,
    pityEquip: save.pityEquip || 0,
    pityTreasure: save.pityTreasure || 0,
    totalPulls: save.totalPulls,
    team: save.team,
    teamPower,
    synergy,
    heroes: ownedList,
    equips: equipsList,
    treasures: treasuresList,
    stages,
    catalogCount: allHeroes.length,
    gachaCosts: GACHA_COSTS,
    forgeCosts: FORGE_COSTS,
    exploreCosts: EXPLORE_COSTS,
    elements: ELEMENTS,
    rarityMeta: RARITY_META,
    equipSets: EQUIP_SETS,
    equipSlotNames: EQUIP_SLOT_NAMES,
    treasureSlotNames: TREASURE_SLOT_NAMES,
    csDomains: CS_DOMAINS,
    maxDomainBonus: MAX_DOMAIN_BONUS,
    compileTiers: COMPILE_TIERS,
    compileProfiles: COMPILE_PROFILES,
    csModules: CS_MODULES,
    maxCsModuleLevel: MAX_CS_MODULE_LEVEL,
    coverageTiers: COVERAGE_TIERS,
    passiveDefs: PASSIVE_DEFS,
    skillTemplates: SKILL_TEMPLATES
  };
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1024 * 1024) reject(new Error('Request too large'));
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function handleApi(req, res, pathname, savePath, customHeroesPath) {
  const allHeroes = getAllHeroes(customHeroesPath);
  const heroMap = Object.fromEntries(allHeroes.map((h) => [h.id, h]));
  const validIds = new Set(Object.keys(heroMap));
  let save = loadSave(savePath, validIds);

  if (req.method === 'GET' && pathname === '/api/state') {
    return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  return readBody(req)
    .then((body) => {
      if (pathname === '/api/gacha') {
        const count = Number(body.count);
        const cost = GACHA_COSTS[count];
        if (!cost) return sendJson(res, 400, { ok: false, error: '无效的召唤次数' });
        if (save.diamonds < cost) return sendJson(res, 400, { ok: false, error: `钻石不足（需要 ${cost} 钻）` });

        save.diamonds -= cost;
        const pulls = rollGacha(save, count, Math.random, allHeroes);
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, pulls, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/custom-hero') {
        if (!body.name || !String(body.name).trim()) {
          return sendJson(res, 400, { ok: false, error: '请输入角色名称' });
        }
        const hero = saveCustomHero(customHeroesPath, body);
        save.heroes[hero.id] = normalizeHeroInstance({ id: hero.id, level: 1, star: 1, shards: 0 });
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, hero, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/hero/levelup') {
        const heroId = String(body.heroId || '');
        const times = body.times === 10 ? 10 : 1;
        const inst = save.heroes[heroId];
        if (!inst) return sendJson(res, 404, { ok: false, error: '未拥有该角色' });
        if (inst.level >= MAX_LEVEL) return sendJson(res, 400, { ok: false, error: '已达最高等级 Lv.100' });

        let upgraded = 0;
        for (let i = 0; i < times; i++) {
          if (inst.level >= MAX_LEVEL) break;
          const cost = levelUpCost(inst.level);
          if (save.exp < cost.exp || save.gold < cost.gold) {
            if (upgraded === 0) {
              return sendJson(res, 400, { ok: false, error: `资源不足（需 ${cost.exp} 晶体与 ${cost.gold} 金币）` });
            }
            break;
          }
          save.exp -= cost.exp;
          save.gold -= cost.gold;
          inst.level += 1;
          upgraded += 1;
        }
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, upgraded, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/hero/starup') {
        const heroId = String(body.heroId || '');
        const inst = save.heroes[heroId];
        if (!inst) return sendJson(res, 404, { ok: false, error: '未拥有该角色' });
        if (inst.star >= MAX_STAR) return sendJson(res, 400, { ok: false, error: '已达最高星级 ★6' });

        const reqShards = STAR_SHARD_COST[inst.star];
        const reqGold = inst.star * 2500;
        if (inst.shards < reqShards) return sendJson(res, 400, { ok: false, error: `碎片不足（需要 ${reqShards} 碎片）` });
        if (save.gold < reqGold) return sendJson(res, 400, { ok: false, error: `金币不足（需要 ${reqGold} 金币）` });

        inst.shards -= reqShards;
        save.gold -= reqGold;
        inst.star += 1;
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/hero/domain-train') {
        const heroId = String(body.heroId || '');
        const domain = String(body.domain || '');
        const inst = save.heroes[heroId];
        if (!inst) return sendJson(res, 404, { ok: false, error: '未拥有该角色' });
        if (!CS_DOMAINS.some((d) => d.key === domain)) return sendJson(res, 400, { ok: false, error: '无效的领域' });
        const norm = normalizeHeroInstance(inst);
        const cur = norm.domainsBonus[domain] || 0;
        if (cur >= MAX_DOMAIN_BONUS) return sendJson(res, 400, { ok: false, error: '该领域专精已满阶' });

        const cost = domainTrainCost(cur);
        if (save.exp < cost.exp || save.gold < cost.gold) {
          return sendJson(res, 400, { ok: false, error: `资源不足（需 ${cost.exp} 晶体与 ${cost.gold} 金币）` });
        }
        save.exp -= cost.exp;
        save.gold -= cost.gold;
        norm.domainsBonus[domain] = cur + 1;
        save.heroes[heroId] = norm;
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/hero/compile-up') {
        const heroId = String(body.heroId || '');
        const inst = save.heroes[heroId];
        if (!inst) return sendJson(res, 404, { ok: false, error: '未拥有该角色' });
        const norm = normalizeHeroInstance(inst);
        if (norm.compileLevel >= COMPILE_TIERS.length - 1) {
          return sendJson(res, 400, { ok: false, error: '已达最高编译优化 -Ofast' });
        }
        const cost = compileUpgradeCost(norm.compileLevel);
        if (save.exp < cost.exp || save.gold < cost.gold) {
          return sendJson(res, 400, { ok: false, error: `资源不足（需 ${cost.exp} 晶体与 ${cost.gold} 金币）` });
        }
        save.exp -= cost.exp;
        save.gold -= cost.gold;
        norm.compileLevel += 1;
        save.heroes[heroId] = norm;
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/hero/compile-profile') {
        const heroId = String(body.heroId || '');
        const profileId = String(body.profile || '');
        const inst = save.heroes[heroId];
        if (!inst) return sendJson(res, 404, { ok: false, error: '未拥有该角色' });
        const prof = COMPILE_PROFILES[profileId];
        if (!prof) return sendJson(res, 400, { ok: false, error: '无效的编译策略' });
        const norm = normalizeHeroInstance(inst);
        if (norm.compileLevel < prof.minTier) {
          return sendJson(res, 400, { ok: false, error: `需先将编译阶位升至 -O${prof.minTier} 才能启用该策略` });
        }
        norm.compileProfile = prof.id;
        save.heroes[heroId] = norm;
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/hero/module-up') {
        const heroId = String(body.heroId || '');
        const moduleId = String(body.moduleId || '');
        const inst = save.heroes[heroId];
        if (!inst) return sendJson(res, 404, { ok: false, error: '未拥有该角色' });
        if (!CS_MODULES.some((m) => m.id === moduleId)) return sendJson(res, 400, { ok: false, error: '无效的 CS 模块' });
        const norm = normalizeHeroInstance(inst);
        const cur = norm.modules[moduleId] || 0;
        if (cur >= MAX_CS_MODULE_LEVEL) return sendJson(res, 400, { ok: false, error: '该模块已达满级 Lv.5' });

        const cost = moduleUpgradeCost(cur);
        if (save.exp < cost.exp || save.gold < cost.gold) {
          return sendJson(res, 400, { ok: false, error: `资源不足（需 ${cost.exp} 晶体与 ${cost.gold} 金币）` });
        }
        save.exp -= cost.exp;
        save.gold -= cost.gold;
        norm.modules[moduleId] = cur + 1;
        save.heroes[heroId] = norm;
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/hero/coverage-up') {
        const heroId = String(body.heroId || '');
        const inst = save.heroes[heroId];
        if (!inst) return sendJson(res, 404, { ok: false, error: '未拥有该角色' });
        const norm = normalizeHeroInstance(inst);
        if (norm.coverageTier >= COVERAGE_TIERS.length - 1) {
          return sendJson(res, 400, { ok: false, error: '已达 100% 形式化验证' });
        }
        const cost = coverageUpgradeCost(norm.coverageTier);
        if (save.exp < cost.exp || save.gold < cost.gold) {
          return sendJson(res, 400, { ok: false, error: `资源不足（需 ${cost.exp} 晶体与 ${cost.gold} 金币）` });
        }
        save.exp -= cost.exp;
        save.gold -= cost.gold;
        norm.coverageTier += 1;
        save.heroes[heroId] = norm;
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/team') {
        const team = Array.isArray(body.team) ? body.team.map(String) : null;
        if (!team || team.length < 1 || team.length > 3) {
          return sendJson(res, 400, { ok: false, error: '出战小队需包含 1~3 名角色' });
        }
        const unique = [...new Set(team)];
        if (unique.length !== team.length) return sendJson(res, 400, { ok: false, error: '不可重复上阵同一角色' });
        for (const id of unique) {
          if (!save.heroes[id]) return sendJson(res, 400, { ok: false, error: `未拥有角色 ${id}` });
        }
        save.team = unique;
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/equip/forge') {
        const count = Number(body.count);
        const cost = FORGE_COSTS[count];
        if (!cost) return sendJson(res, 400, { ok: false, error: '无效的锻造次数' });
        if (save.gold < cost) return sendJson(res, 400, { ok: false, error: `金币不足（需要 ${cost} 金币）` });
        save.gold -= cost;
        const forged = rollEquipForge(save, count);
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, forged, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/equip/wear') {
        const heroId = String(body.heroId || '');
        const equipUid = String(body.equipUid || '');
        if (!save.heroes[heroId]) return sendJson(res, 404, { ok: false, error: '未拥有该角色' });
        const eq = save.equips[equipUid];
        if (!eq) return sendJson(res, 404, { ok: false, error: '装备不存在' });

        for (const other of Object.values(save.equips)) {
          if (other.equippedBy === heroId && other.slot === eq.slot) {
            other.equippedBy = null;
          }
        }
        eq.equippedBy = heroId;
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/equip/unequip') {
        const equipUid = String(body.equipUid || '');
        const eq = save.equips[equipUid];
        if (!eq) return sendJson(res, 404, { ok: false, error: '装备不存在' });
        eq.equippedBy = null;
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/equip/enhance') {
        const equipUid = String(body.equipUid || '');
        const times = body.times === 5 ? 5 : 1;
        const eq = save.equips[equipUid];
        if (!eq) return sendJson(res, 404, { ok: false, error: '装备不存在' });
        if (eq.level >= MAX_EQUIP_LEVEL) return sendJson(res, 400, { ok: false, error: `已达最高强化 +${MAX_EQUIP_LEVEL}` });

        let upgraded = 0;
        for (let i = 0; i < times; i++) {
          if (eq.level >= MAX_EQUIP_LEVEL) break;
          const cost = equipEnhanceCost(eq.level);
          if (save.gold < cost.gold) {
            if (upgraded === 0) return sendJson(res, 400, { ok: false, error: `金币不足（需要 ${cost.gold} 金币）` });
            break;
          }
          save.gold -= cost.gold;
          eq.level += 1;
          upgraded += 1;
        }
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, upgraded, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/equip/auto') {
        const heroId = String(body.heroId || '');
        const heroDef = getHeroMap(customHeroesPath)[heroId];
        if (!save.heroes[heroId] || !heroDef) return sendJson(res, 404, { ok: false, error: '未拥有该角色' });

        for (const slot of EQUIP_SLOTS) {
          const candidates = Object.values(save.equips)
            .filter((e) => e.slot === slot && (!e.equippedBy || e.equippedBy === heroId))
            .map(enrichEquip)
            .sort((a, b) => b.stats.score - a.stats.score);
          if (candidates.length > 0) {
            for (const c of candidates) {
              if (c.equippedBy === heroId) save.equips[c.uid].equippedBy = null;
            }
            save.equips[candidates[0].uid].equippedBy = heroId;
          }
        }
        for (const slot of TREASURE_SLOTS) {
          const candidates = Object.values(save.treasures)
            .filter((t) => t.slot === slot && (!t.equippedBy || t.equippedBy === heroId))
            .map((t) => enrichTreasure(t, heroDef))
            .sort((a, b) => (b.stats.score - a.stats.score) || (RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]));
          if (candidates.length > 0) {
            for (const c of candidates) {
              if (c.equippedBy === heroId) save.treasures[c.uid].equippedBy = null;
            }
            save.treasures[candidates[0].uid].equippedBy = heroId;
          }
        }
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/treasure/explore') {
        const count = Number(body.count);
        const cost = EXPLORE_COSTS[count];
        if (!cost) return sendJson(res, 400, { ok: false, error: '无效的寻宝次数' });
        if (save.diamonds < cost) return sendJson(res, 400, { ok: false, error: `钻石不足（需要 ${cost} 钻）` });
        save.diamonds -= cost;
        const explored = rollTreasureExplore(save, count);
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, explored, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/treasure/wear') {
        const heroId = String(body.heroId || '');
        const treasureUid = String(body.treasureUid || '');
        if (!save.heroes[heroId]) return sendJson(res, 404, { ok: false, error: '未拥有该角色' });
        const tr = save.treasures[treasureUid];
        if (!tr) return sendJson(res, 404, { ok: false, error: '宝物不存在' });

        for (const other of Object.values(save.treasures)) {
          if (other.equippedBy === heroId && other.slot === tr.slot) {
            other.equippedBy = null;
          }
        }
        tr.equippedBy = heroId;
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/treasure/unequip') {
        const treasureUid = String(body.treasureUid || '');
        const tr = save.treasures[treasureUid];
        if (!tr) return sendJson(res, 404, { ok: false, error: '宝物不存在' });
        tr.equippedBy = null;
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/treasure/refine') {
        const treasureUid = String(body.treasureUid || '');
        const times = body.times === 5 ? 5 : 1;
        const tr = save.treasures[treasureUid];
        if (!tr) return sendJson(res, 404, { ok: false, error: '宝物不存在' });
        if (tr.level >= MAX_TREASURE_LEVEL) return sendJson(res, 400, { ok: false, error: `已达最高精炼 +${MAX_TREASURE_LEVEL}` });

        let upgraded = 0;
        for (let i = 0; i < times; i++) {
          if (tr.level >= MAX_TREASURE_LEVEL) break;
          const cost = treasureRefineCost(tr.level);
          if (save.gold < cost.gold || save.exp < cost.exp) {
            if (upgraded === 0) return sendJson(res, 400, { ok: false, error: `资源不足（需 ${cost.gold} 金币与 ${cost.exp} 晶体）` });
            break;
          }
          save.gold -= cost.gold;
          save.exp -= cost.exp;
          tr.level += 1;
          upgraded += 1;
        }
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, upgraded, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/battle/start') {
        const stageId = Number(body.stageId);
        const stage = getStageConfig(stageId);
        if (!stage) return sendJson(res, 404, { ok: false, error: '关卡不存在' });
        if (stageId > save.maxClearedStage + 1) return sendJson(res, 400, { ok: false, error: '请先通关前置关卡' });

        const allyEntries = save.team
          .map((id) => {
            const heroDef = heroMap[id];
            const instance = save.heroes[id];
            if (!heroDef || !instance) return null;
            const { equips, treasures } = getHeroGear(save, id);
            return { heroDef, instance, equips, treasures };
          })
          .filter(Boolean);

        if (allyEntries.length === 0) return sendJson(res, 400, { ok: false, error: '请先配置出战角色' });

        const enemyEntries = stage.enemies.map((e) => ({
          heroDef: heroMap[e.heroId],
          instance: { level: e.level, star: e.star }
        }));

        const battle = simulateBattle(allyEntries, enemyEntries);
        let reward = { diamonds: 0, gold: 0, exp: 0, firstClear: false, drops: [] };
        if (battle.victory) {
          const firstClear = stageId > save.maxClearedStage;
          const baseReward = firstClear ? stage.firstRewards : stage.rewards;
          const drops = rollStageDrop(save, stageId);
          reward = { ...baseReward, firstClear, drops };
          save.diamonds += reward.diamonds;
          save.gold += reward.gold;
          save.exp += reward.exp;
          if (firstClear) save.maxClearedStage = stageId;
          persistSave(savePath, save);
        }

        return sendJson(res, 200, {
          ok: true,
          stage: { id: stage.id, code: stage.code, name: stage.name },
          battle,
          reward,
          state: buildClientState(save, customHeroesPath)
        });
      }

      if (pathname === '/api/battle/sweep') {
        const stageId = Number(body.stageId);
        const times = body.times === 5 ? 5 : 1;
        const stage = getStageConfig(stageId);
        if (!stage) return sendJson(res, 404, { ok: false, error: '关卡不存在' });
        if (stageId > save.maxClearedStage) return sendJson(res, 400, { ok: false, error: '仅已通关的关卡支持扫荡' });

        const drops = [];
        for (let i = 0; i < times; i++) {
          drops.push(...rollStageDrop(save, stageId));
        }
        const reward = {
          diamonds: stage.rewards.diamonds * times,
          gold: stage.rewards.gold * times,
          exp: stage.rewards.exp * times,
          times,
          drops
        };
        save.diamonds += reward.diamonds;
        save.gold += reward.gold;
        save.exp += reward.exp;
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, reward, state: buildClientState(save, customHeroesPath) });
      }

      if (pathname === '/api/gm') {
        const action = String(body.action || '');
        if (action === 'resources') {
          save.diamonds += 99999;
          save.gold += 500000;
          save.exp += 50000;
        } else if (action === 'unlock_all') {
          for (const h of allHeroes) {
            if (!save.heroes[h.id]) {
              save.heroes[h.id] = normalizeHeroInstance({ id: h.id, level: 1, star: 1, shards: 100 });
            } else {
              save.heroes[h.id].shards += 100;
            }
          }
        } else if (action === 'linus_jeff') {
          grantLinusAndJeff(save);
        } else if (action === 'max_team') {
          for (const id of save.team) {
            if (save.heroes[id]) {
              const norm = normalizeHeroInstance(save.heroes[id]);
              norm.level = MAX_LEVEL;
              norm.star = MAX_STAR;
              norm.compileLevel = COMPILE_TIERS.length - 1;
              norm.coverageTier = COVERAGE_TIERS.length - 1;
              for (const d of CS_DOMAINS) norm.domainsBonus[d.key] = MAX_DOMAIN_BONUS;
              for (const m of CS_MODULES) norm.modules[m.id] = MAX_CS_MODULE_LEVEL;
              save.heroes[id] = norm;
            }
          }
        } else if (action === 'god_gear') {
          grantGodGear(save);
        } else if (action === 'reset') {
          save = createInitialSave();
        } else {
          return sendJson(res, 400, { ok: false, error: '未知 GM 指令' });
        }
        persistSave(savePath, save);
        return sendJson(res, 200, { ok: true, action, state: buildClientState(save, customHeroesPath) });
      }

      return sendJson(res, 404, { ok: false, error: 'API 路径不存在' });
    })
    .catch((err) => sendJson(res, 400, { ok: false, error: err.message }));
}

function serveStatic(req, res, pathname) {
  const cleanPath = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.resolve(PUBLIC_DIR, `.${cleanPath}`);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    res.writeHead(404);
    return res.end('Not Found');
  }
  const ext = path.extname(resolved);
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(resolved).pipe(res);
}

export function startServer(options = {}) {
  const port = options.port ?? Number(process.env.PORT || 3456);
  const host = options.host ?? '0.0.0.0';
  const savePath = options.savePath ?? process.env.SAVE_PATH ?? path.join(__dirname, 'data', 'save.json');
  const customHeroesPath = options.customHeroesPath ?? process.env.CUSTOM_HEROES_PATH ?? DEFAULT_CUSTOM_HEROES_PATH;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      return handleApi(req, res, url.pathname, savePath, customHeroesPath);
    }
    return serveStatic(req, res, url.pathname);
  });

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const addr = server.address();
      resolve({ server, port: addr.port, host, savePath, customHeroesPath });
    });
  });
}

if (process.env.NO_AUTO_START !== '1' && path.resolve(process.argv[1] || '') === __filename) {
  startServer().then(({ port }) => {
    console.log(`Code Chronicles server listening at http://localhost:${port}`);
  });
}
