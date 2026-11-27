import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.NO_AUTO_START = '1';

const {
  CS_DOMAINS,
  ELEMENTS,
  EQUIP_SETS,
  HEROES,
  HERO_MAP,
  RARITY_LIST,
  RARITY_ORDER,
  TREASURE_TEMPLATES,
  computeHeroStats,
  computeTeamSynergy,
  createEquipInstance,
  createInitialSave,
  createTreasureInstance,
  getDomainResonanceMult,
  migrateSave,
  rollGacha,
  simulateBattle
} = await import('./game-data.mjs');
const { startServer } = await import('./server.mjs');

// 1. Unit tests: 9 rarities, 7 elements (double-triangle), 8 CS domains, bonds, dodge/block/critDmg
{
  assert.equal(HEROES.length, 28, 'Expected 28 built-in CS heroes across 9 rarities and 7 factions');
  assert.equal(Object.keys(ELEMENTS).length, 7, 'Expected 7 factions (2 triangles + compute)');
  assert.equal(CS_DOMAINS.length, 8, 'Expected 8 CS radar domains');
  for (const elId of Object.keys(ELEMENTS)) {
    assert.ok(HEROES.some((h) => h.element === elId), `Expected at least 1 hero for faction ${elId}`);
  }
  assert.equal(HERO_MAP.ssr_hopper.element, 'lang');
  assert.equal(HERO_MAP.red_dennis.element, 'lang');
  assert.equal(HERO_MAP.r_qa.element, 'sec');
  assert.equal(HERO_MAP.r_moyu.element, 'fe');
  assert.equal(Object.keys(EQUIP_SETS).length, 8, 'Expected 8 equip sets');
  const vgTreasures = TREASURE_TEMPLATES.filter((t) => t.rarity === 'violet_gold');
  assert.equal(vgTreasures.length, 6, 'Expected 6 violet_gold treasures');
  assert.equal(vgTreasures.filter((t) => t.slot === 'relic').length, 3);
  assert.equal(vgTreasures.filter((t) => t.slot === 'emblem').length, 3);
  for (const r of RARITY_LIST) {
    assert.ok(HEROES.some((h) => h.rarity === r), `Expected at least 1 hero for rarity ${r}`);
  }
  assert.ok(HERO_MAP.ur_linus && HERO_MAP.ur_jeff && HERO_MAP.red_dennis && HERO_MAP.red_dijkstra);

  const baseLinus = computeHeroStats(HERO_MAP.ur_linus, { level: 50, star: 3 });
  assert.ok(baseLinus.blockRate > 0.15 && baseLinus.critDmg >= 1.70);

  const fullSet = [
    createEquipInstance('e1', 'kernel_set', 'weapon', 'violet_gold', 10),
    createEquipInstance('e2', 'kernel_set', 'armor', 'violet_gold', 10),
    createEquipInstance('e3', 'kernel_set', 'helm', 'violet_gold', 10),
    createEquipInstance('e4', 'kernel_set', 'boots', 'violet_gold', 10)
  ];
  const treasures = [
    createTreasureInstance('t1', 'tr_ur_01', 5),
    createTreasureInstance('t2', 'tr_ssr_01', 3)
  ];
  const geared = computeHeroStats(HERO_MAP.ur_linus, { level: 50, star: 3 }, fullSet, treasures);
  assert.ok(geared.atk > baseLinus.atk);
  assert.ok(geared.critDmg > baseLinus.critDmg + 0.30);
  assert.ok(geared.initRageBonus > baseLinus.initRageBonus);
  assert.equal(geared.activeSets.length, 2);

  // Treasure bonuses follow Fibonacci 1,2,3,5,8,13,21,34,55,89 scaling & hero attributes
  const fib = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
  for (let i = 0; i < fib.length; i++) {
    const ratio = (getDomainResonanceMult(i + 1) - 1) / (getDomainResonanceMult(1) - 1);
    assert.ok(Math.abs(ratio - fib[i]) < 1e-9, `Expected Fibonacci ratio ${fib[i]} at level ${i + 1}`);
  }
  const jeffWithH100 = computeHeroStats(HERO_MAP.ur_jeff, { level: 50, star: 3 }, [], [treasures[0]]);
  const jeffBase = computeHeroStats(HERO_MAP.ur_jeff, { level: 50, star: 3 });
  const linusWithH100 = computeHeroStats(HERO_MAP.ur_linus, { level: 50, star: 3 }, [], [treasures[0]]);
  assert.ok((jeffWithH100.atk - jeffBase.atk) > (linusWithH100.atk - baseLinus.atk));

  // Linus + Jeff Dean personal bond
  const bondSyn = computeTeamSynergy([HERO_MAP.ur_linus, HERO_MAP.ur_jeff, HERO_MAP.ssr_knuth]);
  assert.ok(bondSyn.activeBonds.some((b) => b.id === 'bond_linus_jeff'));
  assert.ok(bondSyn.atkBonus >= 0.15 && bondSyn.initRageBonus >= 20);

  // 50-pull hard pity test: guarantees red or above
  const save = createInitialSave();
  save.pitySsr = 49;
  const pullRes = rollGacha(save, 1, () => 0.99);
  assert.ok(RARITY_ORDER[pullRes[0].rarity] >= RARITY_ORDER.red, 'Hard pity at 50 should guarantee red+');

  // Migration from old R/SR/SSR/UR equips & treasures
  const legacySave = {
    diamonds: 999,
    team: ['sr_arch'],
    heroes: { sr_arch: { id: 'sr_arch', level: 10, star: 2, shards: 0 } },
    equips: { eq_old: { uid: 'eq_old', setId: 'kernel_set', slot: 'weapon', rarity: 'UR', level: 5, name: '黑客机械键盘', equippedBy: 'sr_arch' } },
    treasures: { tr_old: { uid: 'tr_old', templateId: 'tr_ur_01', slot: 'relic', rarity: 'UR', level: 2, name: 'H100 算力核心', equippedBy: 'sr_arch' } }
  };
  const migrated = migrateSave(legacySave, new Set(Object.keys(HERO_MAP)));
  assert.equal(migrated.equips.eq_old.rarity, 'violet_gold');
  assert.equal(migrated.treasures.tr_old.rarity, 'violet_gold');

  // Dodge + async_dodge test
  const dodger = {
    heroDef: HERO_MAP.r_moyu,
    instance: { level: 25, star: 3 },
    equips: [
      createEquipInstance('d1', 'acm_set', 'boots', 'violet_gold', 30),
      createEquipInstance('d2', 'acm_set', 'weapon', 'violet_gold', 30),
      createEquipInstance('d3', 'acm_set', 'armor', 'violet_gold', 30),
      createEquipInstance('d4', 'acm_set', 'helm', 'violet_gold', 30)
    ],
    treasures: [createTreasureInstance('dt1', 'tr_ur_02', 10)]
  };
  const dodgeBattle = simulateBattle(
    [{ heroDef: HERO_MAP.r_intern, instance: { level: 1, star: 1 } }],
    [dodger],
    () => 0.01
  );
  assert.ok(dodgeBattle.events.some((e) => e.targets.some((t) => t.dodged)), 'Dodge should trigger');
  assert.ok(dodgeBattle.events.some((e) => e.actionType === 'counter' && e.skillName === '异步甩锅'), 'async_dodge counter should trigger');

  // Block + block_counter + crit test
  const blocker = {
    heroDef: HERO_MAP.ssr_thompson,
    instance: { level: 30, star: 3 },
    equips: [
      createEquipInstance('b1', 'ha_set', 'armor', 'violet_gold', 30),
      createEquipInstance('b2', 'ha_set', 'helm', 'violet_gold', 30),
      createEquipInstance('b3', 'ha_set', 'weapon', 'violet_gold', 30),
      createEquipInstance('b4', 'ha_set', 'boots', 'violet_gold', 30)
    ],
    treasures: [createTreasureInstance('bt1', 'tr_ur_03', 10)]
  };
  const blockBattle = simulateBattle(
    [{ heroDef: HERO_MAP.ssr_knuth, instance: { level: 50, star: 4 } }],
    [blocker],
    () => 0.25
  );
  assert.ok(blockBattle.events.some((e) => e.targets.some((t) => t.crit)), 'Crit should trigger');
  assert.ok(blockBattle.events.some((e) => e.targets.some((t) => t.blocked)), 'Block should trigger');
  assert.ok(blockBattle.events.some((e) => e.actionType === 'counter' && e.skillName === '硬核反击'), 'Block counter should trigger');

  // CS cultivation dimensions: domain training, compiler optimization + profile, CS modules, coverage
  const trained = computeHeroStats(HERO_MAP.ur_linus, {
    level: 50,
    star: 3,
    domainsBonus: { algo: 5, sys: 5, eng: 0, ai: 0, agility: 0 },
    compileLevel: 4,
    compileProfile: 'fast_math',
    coverageTier: 5,
    modules: { complexity: 5, concurrency: 5, cache: 5, consensus: 5 }
  });
  assert.equal(trained.effectiveDomains.algo, 13);
  assert.equal(trained.effectiveDomains.sys, 15);
  assert.ok(trained.atk > baseLinus.atk * 1.8);
  assert.ok(trained.armorPen >= 0.20);
  assert.equal(trained.rageGainMult, 1.25);
  assert.equal(trained.shieldMult, 1.30);
  assert.equal(trained.ccResist, 0.50);
  assert.equal(trained.varianceFloor, 1.02);
  assert.equal(trained.dotResist, 0.30);
  assert.ok(trained.passives.some((p) => p.id === 'cas_combo'));
  assert.ok(trained.passives.some((p) => p.id === 'l1_prefetch'));
  assert.ok(trained.passives.some((p) => p.id === 'circuit_breaker'));
  assert.ok(trained.initShield > 0);

  // Circuit breaker saves a hero from a lethal blow once with 1 HP + 18% shield
  const glassTank = {
    heroDef: HERO_MAP.r_intern,
    instance: { level: 1, star: 1, modules: { consensus: 5 } }
  };
  const nuker = {
    heroDef: HERO_MAP.ur_jeff,
    instance: { level: 80, star: 5 }
  };
  const breakerBattle = simulateBattle([nuker], [glassTank], () => 0.50);
  assert.ok(
    breakerBattle.events.some((e) => e.actionType === 'passive' && e.skillName === '熔断降级'),
    'Circuit breaker passive event should trigger on lethal hit'
  );
}

// 2. End-to-end API smoke test
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-chronicles-'));
const tmpSave = path.join(tmpDir, 'save.json');
const tmpCustom = path.join(tmpDir, 'custom-heroes.json');

const { server, port } = await startServer({
  port: 0,
  host: '127.0.0.1',
  savePath: tmpSave,
  customHeroesPath: tmpCustom
});
const base = `http://127.0.0.1:${port}`;

async function api(method, url, body) {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json();
  return { status: res.status, json };
}

try {
  let r = await api('GET', '/api/state');
  assert.equal(r.status, 200);
  assert.equal(r.json.state.diamonds, 3200);
  const stage12 = r.json.state.stages.find((s) => s.id === 12);
  assert.ok(stage12.enemies.every((e) => e.name && e.name !== e.heroId && e.maxHp > 0));

  // GM summon Linus + Jeff Dean & verify bond
  r = await api('POST', '/api/gm', { action: 'linus_jeff' });
  assert.equal(r.status, 200);
  assert.ok(r.json.state.team.includes('ur_linus') && r.json.state.team.includes('ur_jeff'));
  assert.ok(r.json.state.synergy.activeBonds.some((b) => b.id === 'bond_linus_jeff'));

  // Double-triangle element advantage check: sec beats fe
  const secVsFe = simulateBattle(
    [{ heroDef: HERO_MAP.gd_schneier, instance: { level: 30, star: 2 } }],
    [{ heroDef: HERO_MAP.or_css, instance: { level: 30, star: 2 } }],
    () => 0.50
  );
  assert.ok(
    secVsFe.events.some((e) => e.actorSide === 'ally' && e.targets.some((t) => t.advantage)),
    'sec should have element advantage against fe'
  );

  // New bond check: Whitfield Diffie + Bruce Schneier
  const secBond = computeTeamSynergy([HERO_MAP.ur_diffie, HERO_MAP.gd_schneier]);
  assert.ok(secBond.activeBonds.some((b) => b.id === 'bond_zero_trust'));

  // Create custom friend card in new faction 'lang' with 8-domain stats
  r = await api('POST', '/api/custom-hero', {
    name: '测试好友·阿伟',
    title: '类型体操大师',
    rarity: 'platinum',
    element: 'lang',
    domains: { algo: 8, sys: 9, eng: 10, ai: 6, agility: 8, sec: 7, fe: 6, lang: 10 },
    passiveId: 'git_rollback',
    skillType: 'armor_break',
    skillName: '通宵修复'
  });
  assert.equal(r.status, 200);
  assert.equal(r.json.hero.rarity, 'platinum');
  assert.equal(r.json.hero.element, 'lang');
  assert.equal(r.json.hero.domains.lang, 10);
  const customId = r.json.hero.id;

  // Put Linus + Jeff + Friend into team
  r = await api('POST', '/api/team', { team: ['ur_linus', 'ur_jeff', customId] });
  assert.equal(r.status, 200);

  // GM resources, god gear, auto equip, max team, battle stage 1
  r = await api('POST', '/api/gm', { action: 'resources' });
  assert.equal(r.status, 200);
  r = await api('POST', '/api/gm', { action: 'god_gear' });
  assert.equal(r.status, 200);
  assert.ok(r.json.state.equips.some((e) => e.rarity === 'violet_gold'));
  r = await api('POST', '/api/equip/auto', { heroId: 'ur_linus' });
  assert.equal(r.status, 200);
  r = await api('POST', '/api/gm', { action: 'max_team' });
  assert.equal(r.status, 200);

  r = await api('POST', '/api/battle/start', { stageId: 1 });
  assert.equal(r.status, 200);
  assert.equal(r.json.battle.victory, true);

  // Verify max_team maxed out CS cultivation on team members
  const customMaxed = r.json.state.heroes.find((h) => h.id === customId);
  assert.equal(customMaxed.compileLevel, 4);
  assert.equal(customMaxed.coverageTier, 5);
  assert.equal(customMaxed.domainsBonus.algo, 5);
  assert.equal(customMaxed.modules.complexity, 5);

  // CS cultivation API endpoints on a non-maxed owned hero (r_intern)
  const targetId = 'r_intern';
  r = await api('POST', '/api/hero/domain-train', { heroId: targetId, domain: 'algo' });
  assert.equal(r.status, 200);
  const afterTrain = r.json.state.heroes.find((h) => h.id === targetId);
  assert.equal(afterTrain.domainsBonus.algo, 1);

  r = await api('POST', '/api/hero/compile-up', { heroId: targetId });
  assert.equal(r.status, 200);
  r = await api('POST', '/api/hero/compile-profile', { heroId: targetId, profile: 'low_latency' });
  assert.equal(r.status, 200);
  const afterLowLat = r.json.state.heroes.find((h) => h.id === targetId);
  assert.ok(40 + afterLowLat.stats.initRageBonus >= 100, 'low_latency should grant full starting rage');
  r = await api('POST', '/api/hero/module-up', { heroId: targetId, moduleId: 'complexity' });
  assert.equal(r.status, 200);
  r = await api('POST', '/api/hero/coverage-up', { heroId: targetId });
  assert.equal(r.status, 200);
  const afterCult = r.json.state.heroes.find((h) => h.id === targetId);
  assert.equal(afterCult.compileLevel, 1);
  assert.equal(afterCult.compileProfile, 'low_latency');
  assert.equal(afterCult.modules.complexity, 1);
  assert.equal(afterCult.coverageTier, 1);

  // Reset
  r = await api('POST', '/api/gm', { action: 'reset' });
  assert.equal(r.status, 200);
  assert.equal(r.json.state.diamonds, 3200);

  console.log('ALL TESTS PASSED');
} finally {
  server.closeAllConnections?.();
  server.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
