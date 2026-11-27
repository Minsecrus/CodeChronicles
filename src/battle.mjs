import { ELEMENTS } from './constants.mjs';
import { computeHeroStats, computeTeamSynergy } from './stats.mjs';

function getElementMultiplier(attackerEl, defenderEl) {
  if (attackerEl === 'ai' && defenderEl !== 'ai') return { mult: 1.10, advantage: true };
  if (ELEMENTS[attackerEl]?.beats === defenderEl) return { mult: 1.20, advantage: true };
  if (ELEMENTS[defenderEl]?.beats === attackerEl) return { mult: 0.85, advantage: false };
  return { mult: 1.0, advantage: false };
}

function makeBattleUnit(entry, side, slot, synergy) {
  const { heroDef, instance, equips = [], treasures = [] } = entry;
  const s = computeHeroStats(heroDef, instance, equips, treasures);
  const maxHp = Math.round(s.hp * (1 + (synergy?.hpBonus || 0)));
  const atk = Math.round(s.atk * (1 + (synergy?.atkBonus || 0)));
  const def = Math.round(s.def * (1 + (synergy?.defBonus || 0)));
  const spd = Math.round(s.spd * (1 + (synergy?.spdBonus || 0)));
  const critRate = Math.min(0.95, s.critRate + (synergy?.critBonus || 0));
  const critDmg = Number((s.critDmg + (synergy?.critDmgBonus || 0)).toFixed(2));
  const passives = new Set((s.passives || []).map((p) => p.id));
  const initShield = s.initShield || 0;

  return {
    uid: `${side}_${slot}`,
    side,
    slot,
    heroId: heroDef.id,
    name: heroDef.name,
    rarity: heroDef.rarity,
    element: heroDef.element,
    emblem: heroDef.emblem,
    level: instance.level || 1,
    star: instance.star || 1,
    maxHp,
    hp: maxHp,
    atk,
    def,
    spd,
    critRate,
    critDmg,
    dodgeRate: s.dodgeRate,
    blockRate: s.blockRate,
    blockMitigation: s.blockMitigation,
    armorPen: s.armorPen || 0,
    rageGainMult: s.rageGainMult || 1,
    shieldMult: s.shieldMult || 1,
    ccResist: s.ccResist || 0,
    varianceFloor: s.varianceFloor || 0.95,
    dotResist: s.dotResist || 0,
    passives,
    skill: heroDef.skill,
    skillMultiplier: s.skillMultiplier,
    rage: Math.min(100, 40 + (s.initRageBonus || 0) + (synergy?.initRageBonus || 0)),
    shield: initShield,
    burnTurns: 0,
    burnDmg: 0,
    leakStacks: 0,
    leakDmg: 0,
    defDownTurns: 0,
    atkUpTurns: 0,
    stunTurns: 0,
    resetUsed: false,
    rollbackUsed: false,
    breakerUsed: false
  };
}

function grantShield(unit, rawAmount) {
  const amt = Math.round(rawAmount * (unit.shieldMult || 1));
  unit.shield += amt;
  return amt;
}

function addRage(unit, rawAmount) {
  const amt = Math.round(rawAmount * (unit.rageGainMult || 1));
  unit.rage = Math.min(100, unit.rage + amt);
}

function cloneSnapshot(u) {
  return {
    uid: u.uid,
    side: u.side,
    slot: u.slot,
    heroId: u.heroId,
    name: u.name,
    rarity: u.rarity,
    element: u.element,
    emblem: u.emblem,
    level: u.level,
    star: u.star,
    maxHp: u.maxHp,
    hp: u.hp,
    shield: u.shield,
    rage: u.rage
  };
}

function applyDamage(attacker, defender, mult, rng = Math.random) {
  if (rng() < defender.dodgeRate) {
    return {
      uid: defender.uid,
      damage: 0,
      heal: 0,
      shield: 0,
      crit: false,
      dodged: true,
      blocked: false,
      stunned: false,
      advantage: false,
      hpAfter: defender.hp,
      shieldAfter: defender.shield,
      rageAfter: defender.rage,
      killed: false
    };
  }

  // Code Review: shatter 50% shield & apply defense down before damage
  if (attacker.passives.has('code_review')) {
    if (defender.shield > 0) defender.shield = Math.floor(defender.shield * 0.5);
    defender.defDownTurns = Math.max(defender.defDownTurns, 2);
  }

  let atkScale = attacker.atkUpTurns > 0 ? 1.22 : 1.0;
  if (attacker.passives.has('ddl_berserk')) {
    const missingRatio = Math.max(0, 1 - attacker.hp / attacker.maxHp);
    atkScale += missingRatio * 0.45;
  }
  const effAtk = attacker.atk * atkScale;

  let defScale = defender.defDownTurns > 0 ? 0.70 : 1.0;
  if (attacker.passives.has('prune_execute') && defender.hp < defender.maxHp * 0.5) {
    defScale *= 0.80;
  }
  if (attacker.armorPen > 0) {
    defScale *= Math.max(0.40, 1 - attacker.armorPen);
  }
  const effDef = defender.def * defScale;

  let raw = (effAtk * mult) * (effAtk / (effAtk + effDef * 0.9 + 30)) + effAtk * 0.22 * mult;
  if (attacker.passives.has('execute_bonus') && defender.hp < defender.maxHp * 0.4) {
    raw *= 1.25;
  }
  if (attacker.passives.has('prune_execute') && defender.hp < defender.maxHp * 0.5) {
    raw *= 1.30;
  }

  const { mult: elMult, advantage } = getElementMultiplier(attacker.element, defender.element);
  const crit = rng() < attacker.critRate;
  const critMult = crit ? attacker.critDmg : 1.0;
  const blocked = rng() < defender.blockRate;
  const blockMult = blocked ? (1 - defender.blockMitigation) : 1.0;
  const variance = (attacker.varianceFloor || 0.95) + rng() * 0.10;
  const totalDamage = Math.max(1, Math.round(raw * elMult * critMult * blockMult * variance));

  let remaining = totalDamage;
  if (defender.shield > 0) {
    const absorbed = Math.min(defender.shield, remaining);
    defender.shield -= absorbed;
    remaining -= absorbed;
  }
  let breakerTriggered = false;
  let breakerShield = 0;
  if (defender.hp - remaining <= 0 && defender.passives.has('circuit_breaker') && !defender.breakerUsed) {
    defender.breakerUsed = true;
    defender.hp = 1;
    breakerShield = grantShield(defender, defender.maxHp * 0.18);
    breakerTriggered = true;
  } else {
    defender.hp = Math.max(0, defender.hp - remaining);
  }
  const killed = defender.hp === 0;
  if (!killed) {
    addRage(defender, 20);
    if (attacker.passives.has('memory_leak')) {
      defender.leakStacks = Math.min(3, defender.leakStacks + 1);
      defender.leakDmg = Math.max(defender.leakDmg, Math.round(attacker.atk * 0.25));
    }
  }

  return {
    uid: defender.uid,
    damage: totalDamage,
    heal: 0,
    shield: 0,
    crit,
    dodged: false,
    blocked,
    stunned: false,
    advantage,
    breakerTriggered,
    breakerShield,
    hpAfter: defender.hp,
    shieldAfter: defender.shield,
    rageAfter: defender.rage,
    killed
  };
}

function getEffectiveSpd(u) {
  if (!u.passives.has('ddl_berserk')) return u.spd;
  const missingRatio = Math.max(0, 1 - u.hp / u.maxHp);
  return Math.round(u.spd * (1 + missingRatio * 0.25));
}

export function simulateBattle(allyEntries, enemyEntries, rng = Math.random) {
  const allySynergy = computeTeamSynergy(allyEntries.map((e) => e.heroDef));
  const enemySynergy = computeTeamSynergy(enemyEntries.map((e) => e.heroDef));

  const allies = allyEntries.map((e, i) => makeBattleUnit(e, 'ally', i, allySynergy));
  const enemies = enemyEntries.map((e, i) => makeBattleUnit(e, 'enemy', i, enemySynergy));
  const allUnits = [...allies, ...enemies];
  const unitByUid = new Map(allUnits.map((u) => [u.uid, u]));

  const initialAllies = allies.map(cloneSnapshot);
  const initialEnemies = enemies.map(cloneSnapshot);
  const events = [];
  const MAX_ROUNDS = 30;
  let finalRound = 0;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    finalRound = round;
    const order = allUnits
      .filter((u) => u.hp > 0)
      .sort((a, b) => getEffectiveSpd(b) - getEffectiveSpd(a) || (a.side === 'ally' ? -1 : 1));

    for (const actor of order) {
      if (actor.hp <= 0) continue;

      if (actor.passives.has('round_shield')) {
        const shAmt = grantShield(actor, actor.maxHp * 0.08);
        events.push({
          round, actorUid: actor.uid, actorSide: actor.side, actorName: actor.name,
          actionType: 'passive', skillName: '守护护盾',
          targets: [{
            uid: actor.uid, damage: 0, heal: 0, shield: shAmt,
            crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
            hpAfter: actor.hp, shieldAfter: actor.shield, rageAfter: actor.rage, killed: false
          }],
          actorRageAfter: actor.rage
        });
      }

      // Burn DoT
      if (actor.burnTurns > 0) {
        const burn = Math.max(1, Math.round(actor.burnDmg * (1 - (actor.dotResist || 0))));
        let rem = burn;
        if (actor.shield > 0) {
          const abs = Math.min(actor.shield, rem);
          actor.shield -= abs;
          rem -= abs;
        }
        actor.hp = Math.max(0, actor.hp - rem);
        actor.burnTurns -= 1;
        events.push({
          round, actorUid: actor.uid, actorSide: actor.side, actorName: actor.name,
          actionType: 'dot', skillName: '灼烧',
          targets: [{
            uid: actor.uid, damage: burn, heal: 0, shield: 0,
            crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
            hpAfter: actor.hp, shieldAfter: actor.shield, rageAfter: actor.rage, killed: actor.hp === 0
          }],
          actorRageAfter: actor.rage
        });
        if (actor.hp <= 0) {
          if (allies.every((u) => u.hp <= 0) || enemies.every((u) => u.hp <= 0)) break;
          continue;
        }
      }

      // Memory Leak DoT
      if (actor.leakStacks > 0) {
        const leak = Math.max(1, Math.round(actor.leakDmg * actor.leakStacks * (1 - (actor.dotResist || 0))));
        let rem = leak;
        if (actor.shield > 0) {
          const abs = Math.min(actor.shield, rem);
          actor.shield -= abs;
          rem -= abs;
        }
        actor.hp = Math.max(0, actor.hp - rem);
        events.push({
          round, actorUid: actor.uid, actorSide: actor.side, actorName: actor.name,
          actionType: 'dot', skillName: `内存泄漏×${actor.leakStacks}`,
          targets: [{
            uid: actor.uid, damage: leak, heal: 0, shield: 0,
            crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
            hpAfter: actor.hp, shieldAfter: actor.shield, rageAfter: actor.rage, killed: actor.hp === 0
          }],
          actorRageAfter: actor.rage
        });
        if (actor.hp <= 0) {
          if (allies.every((u) => u.hp <= 0) || enemies.every((u) => u.hp <= 0)) break;
          continue;
        }
      }

      // Stunned / Blocked check
      if (actor.stunTurns > 0) {
        actor.stunTurns -= 1;
        events.push({
          round, actorUid: actor.uid, actorSide: actor.side, actorName: actor.name,
          actionType: 'stunned', skillName: '进程阻塞',
          targets: [{
            uid: actor.uid, damage: 0, heal: 0, shield: 0,
            crit: false, dodged: false, blocked: false, stunned: true, advantage: false,
            hpAfter: actor.hp, shieldAfter: actor.shield, rageAfter: actor.rage, killed: false
          }],
          actorRageAfter: actor.rage
        });
        continue;
      }

      const ownTeam = actor.side === 'ally' ? allies : enemies;
      const oppTeam = actor.side === 'ally' ? enemies : allies;
      const aliveEnemies = oppTeam.filter((u) => u.hp > 0);
      const aliveAllies = ownTeam.filter((u) => u.hp > 0);
      if (aliveEnemies.length === 0) break;

      const useSkill = actor.rage >= 100;
      const targetsResult = [];
      let skillName = '普通攻击';
      let actionType = 'basic';

      if (!useSkill) {
        const target = aliveEnemies[0];
        const firstHit = applyDamage(actor, target, 1.0, rng);
        targetsResult.push(firstHit);
        if (actor.passives.has('multithread') && target.hp > 0 && rng() < 0.55) {
          targetsResult.push(applyDamage(actor, target, 0.65, rng));
        }
        if (actor.passives.has('cas_combo') && target.hp > 0 && rng() < 0.25) {
          targetsResult.push(applyDamage(actor, target, 0.40, rng));
        }
        addRage(actor, 45);
      } else {
        actionType = 'skill';
        skillName = actor.skill.name;
        actor.rage = 0;
        const stype = actor.skill.type;
        const mult = actor.skillMultiplier;

        if (stype === 'aoe_stun_burn' || stype === 'aoe_stun' || stype === 'aoe_burn' || stype === 'aoe_dmg' || stype === 'fortress_slam') {
          if (stype === 'fortress_slam') {
            const shieldAmt = grantShield(actor, actor.maxHp * 0.30);
            targetsResult.push({
              uid: actor.uid, damage: 0, heal: 0, shield: shieldAmt,
              crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
              hpAfter: actor.hp, shieldAfter: actor.shield, rageAfter: actor.rage, killed: false
            });
          }
          aliveEnemies.forEach((target, idx) => {
            const res = applyDamage(actor, target, mult, rng);
            if (!res.killed && !res.dodged) {
              if (stype === 'aoe_stun_burn' || stype === 'aoe_burn') {
                target.burnTurns = 2;
                target.burnDmg = Math.round(actor.atk * 0.35);
              }
              if (((stype === 'aoe_stun_burn' && idx === 0 && rng() < 0.40) || (stype === 'aoe_stun' && rng() < 0.35)) && rng() >= (target.ccResist || 0)) {
                target.stunTurns = 1;
                res.stunned = true;
              }
            }
            targetsResult.push(res);
          });
        } else if (stype === 'team_shield_aoe_exec') {
          for (const ally of aliveAllies) {
            const shieldAmt = grantShield(ally, actor.atk * 1.0);
            targetsResult.push({
              uid: ally.uid, damage: 0, heal: 0, shield: shieldAmt,
              crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
              hpAfter: ally.hp, shieldAfter: ally.shield, rageAfter: ally.rage, killed: false
            });
          }
          for (const target of aliveEnemies) {
            const missingBonus = 1 + (1 - target.hp / target.maxHp) * 0.45;
            targetsResult.push(applyDamage(actor, target, mult * missingBonus, rng));
          }
        } else if (stype === 'team_shield_nuke') {
          for (const ally of aliveAllies) {
            const shieldAmt = grantShield(ally, actor.atk * 1.1);
            targetsResult.push({
              uid: ally.uid, damage: 0, heal: 0, shield: shieldAmt,
              crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
              hpAfter: ally.hp, shieldAfter: ally.shield, rageAfter: ally.rage, killed: false
            });
          }
          targetsResult.push(applyDamage(actor, aliveEnemies[0], mult, rng));
        } else if (stype === 'team_heal_shield') {
          for (const ally of aliveAllies) {
            const healAmt = Math.round(actor.atk * mult);
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
            const shieldAmt = grantShield(ally, actor.atk * 0.40);
            targetsResult.push({
              uid: ally.uid, damage: 0, heal: healAmt, shield: shieldAmt,
              crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
              hpAfter: ally.hp, shieldAfter: ally.shield, rageAfter: ally.rage, killed: false
            });
          }
        } else if (stype === 'heal_lowest' || stype === 'heal_lowest_one') {
          const sorted = [...aliveAllies].sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp));
          const count = stype === 'heal_lowest' ? 2 : 1;
          for (const ally of sorted.slice(0, count)) {
            const healAmt = Math.round(actor.atk * mult);
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
            targetsResult.push({
              uid: ally.uid, damage: 0, heal: healAmt, shield: 0,
              crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
              hpAfter: ally.hp, shieldAfter: ally.shield, rageAfter: ally.rage, killed: false
            });
          }
        } else if (stype === 'crit_execute') {
          const target = [...aliveEnemies].sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
          const execMult = target.hp < target.maxHp * 0.5 ? mult * 1.35 : mult;
          targetsResult.push(applyDamage(actor, target, execMult, rng));
        } else if (stype === 'armor_break') {
          const target = aliveEnemies[0];
          const res = applyDamage(actor, target, mult, rng);
          if (!res.killed && !res.dodged) target.defDownTurns = 2;
          targetsResult.push(res);
        } else if (stype === 'team_atk_buff') {
          for (const ally of aliveAllies) ally.atkUpTurns = 2;
          targetsResult.push(applyDamage(actor, aliveEnemies[0], mult, rng));
        } else if (stype === 'lifesteal') {
          const res = applyDamage(actor, aliveEnemies[0], mult, rng);
          targetsResult.push(res);
          if (res.damage > 0) {
            const healAmt = Math.round(res.damage * 0.45);
            actor.hp = Math.min(actor.maxHp, actor.hp + healAmt);
            targetsResult.push({
              uid: actor.uid, damage: 0, heal: healAmt, shield: 0,
              crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
              hpAfter: actor.hp, shieldAfter: actor.shield, rageAfter: actor.rage, killed: false
            });
          }
        } else if (stype === 'self_shield') {
          const shieldAmt = grantShield(actor, actor.maxHp * 0.24);
          targetsResult.push({
            uid: actor.uid, damage: 0, heal: 0, shield: shieldAmt,
            crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
            hpAfter: actor.hp, shieldAfter: actor.shield, rageAfter: actor.rage, killed: false
          });
          targetsResult.push(applyDamage(actor, aliveEnemies[0], mult, rng));
        } else {
          targetsResult.push(applyDamage(actor, aliveEnemies[0], mult, rng));
        }

        if (actor.passives.has('multithread')) {
          for (const ally of aliveAllies) {
            ally.rage = Math.min(100, ally.rage + 15);
          }
        }
      }

      if (actor.passives.has('crit_rage') && targetsResult.some((t) => t.crit)) {
        actor.rage = Math.min(100, actor.rage + 15);
      }

      if (actor.defDownTurns > 0) actor.defDownTurns -= 1;
      if (actor.atkUpTurns > 0) actor.atkUpTurns -= 1;

      events.push({
        round,
        actorUid: actor.uid,
        actorSide: actor.side,
        actorName: actor.name,
        actionType,
        skillName,
        targets: targetsResult,
        actorRageAfter: actor.rage
      });

      // Handle passive reactions on targets
      for (const t of targetsResult) {
        const defender = unitByUid.get(t.uid);
        if (!defender) continue;

        if (t.breakerTriggered) {
          events.push({
            round, actorUid: defender.uid, actorSide: defender.side, actorName: defender.name,
            actionType: 'passive', skillName: '熔断降级',
            targets: [{
              uid: defender.uid, damage: 0, heal: 0, shield: t.breakerShield || 0,
              crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
              hpAfter: defender.hp, shieldAfter: defender.shield, rageAfter: defender.rage, killed: defender.hp === 0
            }],
            actorRageAfter: defender.rage
          });
        }

        if (defender.hp <= 0) continue;

        if (t.dodged) {
          if (defender.passives.has('dodge_heal')) {
            const healAmt = Math.round(defender.maxHp * 0.08);
            defender.hp = Math.min(defender.maxHp, defender.hp + healAmt);
            events.push({
              round, actorUid: defender.uid, actorSide: defender.side, actorName: defender.name,
              actionType: 'passive', skillName: '闪避回生',
              targets: [{
                uid: defender.uid, damage: 0, heal: healAmt, shield: 0,
                crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
                hpAfter: defender.hp, shieldAfter: defender.shield, rageAfter: defender.rage, killed: false
              }],
              actorRageAfter: defender.rage
            });
          }
          if (defender.passives.has('async_dodge') && actor.hp > 0) {
            defender.rage = Math.min(100, defender.rage + 25);
            const cRes = applyDamage(defender, actor, 0.55, rng);
            events.push({
              round, actorUid: defender.uid, actorSide: defender.side, actorName: defender.name,
              actionType: 'counter', skillName: '异步甩锅',
              targets: [cRes],
              actorRageAfter: defender.rage
            });
          }
        }

        if (t.blocked && defender.passives.has('block_counter') && actor.hp > 0) {
          const cRes = applyDamage(defender, actor, 0.65, rng);
          events.push({
            round, actorUid: defender.uid, actorSide: defender.side, actorName: defender.name,
            actionType: 'counter', skillName: '硬核反击',
            targets: [cRes],
            actorRageAfter: defender.rage
          });
        }

        // Low-HP triggers: Linus git reset & git_rollback
        if (defender.passives.has('code_review') && !defender.resetUsed && defender.hp < defender.maxHp * 0.35) {
          defender.resetUsed = true;
          const healAmt = Math.round(defender.maxHp * 0.35);
          defender.hp = Math.min(defender.maxHp, defender.hp + healAmt);
          defender.burnTurns = 0;
          defender.leakStacks = 0;
          defender.defDownTurns = 0;
          defender.stunTurns = 0;
          events.push({
            round, actorUid: defender.uid, actorSide: defender.side, actorName: defender.name,
            actionType: 'passive', skillName: 'git reset --hard',
            targets: [{
              uid: defender.uid, damage: 0, heal: healAmt, shield: 0,
              crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
              hpAfter: defender.hp, shieldAfter: defender.shield, rageAfter: defender.rage, killed: false
            }],
            actorRageAfter: defender.rage
          });
        } else if (defender.passives.has('git_rollback') && !defender.rollbackUsed && defender.hp < defender.maxHp * 0.30) {
          defender.rollbackUsed = true;
          const healAmt = Math.round(defender.maxHp * 0.30);
          const shAmt = grantShield(defender, defender.maxHp * 0.15);
          defender.hp = Math.min(defender.maxHp, defender.hp + healAmt);
          events.push({
            round, actorUid: defender.uid, actorSide: defender.side, actorName: defender.name,
            actionType: 'passive', skillName: 'Git 回滚',
            targets: [{
              uid: defender.uid, damage: 0, heal: healAmt, shield: shAmt,
              crit: false, dodged: false, blocked: false, stunned: false, advantage: false,
              hpAfter: defender.hp, shieldAfter: defender.shield, rageAfter: defender.rage, killed: false
            }],
            actorRageAfter: defender.rage
          });
        }
      }

      if (allies.every((u) => u.hp <= 0) || enemies.every((u) => u.hp <= 0)) {
        break;
      }
    }

    if (allies.every((u) => u.hp <= 0) || enemies.every((u) => u.hp <= 0)) {
      break;
    }
  }

  const victory = enemies.every((u) => u.hp <= 0) && allies.some((u) => u.hp > 0);
  return {
    victory,
    rounds: finalRound,
    initialAllies,
    initialEnemies,
    events
  };
}
