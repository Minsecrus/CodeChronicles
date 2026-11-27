import { MAX_LEVEL, MAX_STAR } from './constants.mjs';
import { HERO_MAP } from './heroes.mjs';
import { computeHeroStats } from './stats.mjs';

export const STAGES = [
  { id: 1, code: '1-1', name: 'Hello World 实验室', enemies: [{ heroId: 'r_intern', level: 1, star: 1 }, { heroId: 'r_moyu', level: 1, star: 1 }], rewards: { diamonds: 120, gold: 400, exp: 80 }, firstRewards: { diamonds: 200, gold: 800, exp: 160 } },
  { id: 2, code: '1-2', name: 'NullPointer 峡谷', enemies: [{ heroId: 'r_qa', level: 3, star: 1 }, { heroId: 'r_ddl', level: 3, star: 1 }], rewards: { diamonds: 140, gold: 500, exp: 100 }, firstRewards: { diamonds: 240, gold: 1000, exp: 200 } },
  { id: 3, code: '1-3', name: '死循环回廊', enemies: [{ heroId: 'r_pm', level: 5, star: 1 }, { heroId: 'sr_arch', level: 5, star: 1 }], rewards: { diamonds: 160, gold: 650, exp: 130 }, firstRewards: { diamonds: 280, gold: 1200, exp: 260 } },
  { id: 4, code: '1-4', name: '段错误深渊', enemies: [{ heroId: 'r_ddl', level: 8, star: 1 }, { heroId: 'sr_hacker', level: 8, star: 2 }, { heroId: 'r_moyu', level: 8, star: 1 }], rewards: { diamonds: 200, gold: 850, exp: 170 }, firstRewards: { diamonds: 360, gold: 1600, exp: 340 } },
  { id: 5, code: '2-1', name: '死锁迷宫', enemies: [{ heroId: 'sr_algor', level: 12, star: 2 }, { heroId: 'r_intern', level: 12, star: 2 }, { heroId: 'r_qa', level: 12, star: 2 }], rewards: { diamonds: 220, gold: 1100, exp: 220 }, firstRewards: { diamonds: 400, gold: 2200, exp: 420 } },
  { id: 6, code: '2-2', name: 'OOM 炼丹炉', enemies: [{ heroId: 'sr_trainer', level: 16, star: 2 }, { heroId: 'sr_ops', level: 16, star: 2 }, { heroId: 'r_pm', level: 16, star: 2 }], rewards: { diamonds: 240, gold: 1400, exp: 280 }, firstRewards: { diamonds: 450, gold: 2800, exp: 540 } },
  { id: 7, code: '2-3', name: 'Git 冲突风暴', enemies: [{ heroId: 'ssr_knuth', level: 22, star: 2 }, { heroId: 'sr_arch', level: 20, star: 2 }, { heroId: 'sr_algor', level: 20, star: 2 }], rewards: { diamonds: 280, gold: 1800, exp: 360 }, firstRewards: { diamonds: 520, gold: 3500, exp: 700 } },
  { id: 8, code: '2-4', name: '编译器圣殿', enemies: [{ heroId: 'ssr_hopper', level: 28, star: 3 }, { heroId: 'sr_ops', level: 26, star: 3 }, { heroId: 'ssr_thompson', level: 26, star: 2 }], rewards: { diamonds: 320, gold: 2300, exp: 460 }, firstRewards: { diamonds: 640, gold: 4500, exp: 900 } },
  { id: 9, code: '3-1', name: '停机悖论塔', enemies: [{ heroId: 'ssr_turing', level: 35, star: 3 }, { heroId: 'sr_trainer', level: 34, star: 3 }, { heroId: 'sr_hacker', level: 34, star: 3 }], rewards: { diamonds: 360, gold: 3000, exp: 600 }, firstRewards: { diamonds: 720, gold: 6000, exp: 1200 } },
  { id: 10, code: '3-2', name: 'Unix 根服务器', enemies: [{ heroId: 'ssr_thompson', level: 44, star: 4 }, { heroId: 'ssr_knuth', level: 44, star: 3 }, { heroId: 'ssr_hopper', level: 42, star: 3 }], rewards: { diamonds: 420, gold: 3800, exp: 780 }, firstRewards: { diamonds: 840, gold: 7600, exp: 1500 } },
  { id: 11, code: '3-3', name: '万卡算力集群', enemies: [{ heroId: 'ur_jeff', level: 55, star: 4 }, { heroId: 'ssr_turing', level: 52, star: 4 }, { heroId: 'ssr_hopper', level: 52, star: 4 }], rewards: { diamonds: 500, gold: 4800, exp: 1000 }, firstRewards: { diamonds: 1000, gold: 9600, exp: 2000 } },
  { id: 12, code: '3-4', name: '线上 P0 事故终局', enemies: [{ heroId: 'ur_linus', level: 68, star: 5 }, { heroId: 'ur_jeff', level: 65, star: 5 }, { heroId: 'ssr_thompson', level: 65, star: 5 }], rewards: { diamonds: 600, gold: 6200, exp: 1300 }, firstRewards: { diamonds: 1500, gold: 15000, exp: 3200 } }
];

export function getStageConfig(stageId) {
  const id = Number(stageId);
  const preset = STAGES.find((s) => s.id === id);
  if (preset) {
    const recPower = preset.enemies.reduce((sum, e) => {
      return sum + computeHeroStats(HERO_MAP[e.heroId], e).power;
    }, 0);
    return { ...preset, recommendedPower: recPower, endless: false };
  }
  if (!Number.isInteger(id) || id < 13) return null;

  const tier = id - 12;
  const pool = ['ur_linus', 'ur_jeff', 'ssr_knuth', 'ssr_turing', 'ssr_hopper', 'ssr_thompson'];
  const lv = Math.min(MAX_LEVEL, 70 + tier * 5);
  const st = Math.min(MAX_STAR, 5 + Math.floor(tier / 4));
  const enemies = [0, 1, 2].map((idx) => ({
    heroId: pool[(tier + idx * 2) % pool.length],
    level: lv,
    star: st
  }));
  const recPower = enemies.reduce((sum, e) => sum + computeHeroStats(HERO_MAP[e.heroId], e).power, 0);
  return {
    id,
    code: `LC-${tier}`,
    name: `无尽 LeetCode 塔·第${tier}层`,
    enemies,
    rewards: {
      diamonds: 650 + tier * 60,
      gold: 7000 + tier * 1200,
      exp: 1500 + tier * 260
    },
    firstRewards: {
      diamonds: 1600 + tier * 150,
      gold: 18000 + tier * 2500,
      exp: 3600 + tier * 500
    },
    recommendedPower: recPower,
    endless: true
  };
}
