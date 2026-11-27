import { store } from './api.js';

export function ic(name, cls = '') {
  return `<i data-lucide="${name}" class="ic ${cls}"></i>`;
}

export function refreshIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons({ attrs: { 'stroke-width': 1.75 } });
  }
}

const ELEMENT_ICON = {
  kernel: 'terminal',
  algo: 'binary',
  arch: 'layers',
  sec: 'shield-alert',
  fe: 'monitor',
  lang: 'braces',
  ai: 'sparkles'
};

const GEAR_ICON = {
  weapon: 'keyboard',
  armor: 'shirt',
  helm: 'headphones',
  boots: 'armchair',
  relic: 'gem',
  emblem: 'cpu'
};

export function renderRarityBadge(rarity) {
  const rm = store.state?.rarityMeta?.[rarity];
  const label = rm?.label || rarity;
  return `<span class="rarity-pill rarity-pill-${rarity}">${label}</span>`;
}

const RES_ICON = {
  diamond: 'gem',
  gold: 'coins',
  exp: 'cpu',
  shard: 'puzzle'
};

export function resTag(kind, value) {
  const iconName = RES_ICON[kind] || 'gem';
  return `<span class="res-inline">${ic(iconName, `ic-sm res-ic ${kind}`)}${value}</span>`;
}

export function renderEmblemSvg(_emblem, element, cls = '') {
  const meta = store.state?.elements?.[element] || { color: '#3b5bdb' };
  const iconName = ELEMENT_ICON[element] || 'code-2';
  return `<div class="emblem-box ${cls}" style="color:${meta.color}">${ic(iconName, 'ic-md')}</div>`;
}

export function renderGearSvg(slot, rarity) {
  const rm = store.state?.rarityMeta?.[rarity] || { color: '#59606d' };
  const iconName = GEAR_ICON[slot] || 'gem';
  return `<div class="emblem-box" style="color:${rm.color}">${ic(iconName, 'ic-md')}</div>`;
}

export function renderRadarSvg(domains, element, baseDomains = null) {
  const meta = store.state?.elements?.[element] || { color: '#3b5bdb' };
  const domainDefs = store.state?.csDomains || [
    { key: 'algo', name: '算法' },
    { key: 'sys', name: '底层' },
    { key: 'eng', name: '工程' },
    { key: 'ai', name: '炼丹' },
    { key: 'agility', name: '速通' },
    { key: 'sec', name: '攻防' },
    { key: 'fe', name: '交互' },
    { key: 'lang', name: '语义' }
  ];
  const keys = domainDefs.map((d) => d.key);
  const labels = domainDefs.map((d) => d.name);
  const count = keys.length;
  const cx = 78;
  const cy = 72;
  const maxR = 44;
  const cap = 15;

  const pt = (i, ratio) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / count;
    return [cx + Math.cos(angle) * maxR * ratio, cy + Math.sin(angle) * maxR * ratio];
  };

  const rings = [5 / cap, 10 / cap, 1.0].map((r) => {
    const pts = keys.map((_, i) => pt(i, r).map((v) => v.toFixed(1)).join(',')).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="var(--border-strong)" stroke-width="1"/>`;
  }).join('');

  const axes = keys.map((_, i) => {
    const [x, y] = pt(i, 1);
    const [lx, ly] = pt(i, 1.28);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>
      <text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="400" fill="var(--muted)">${labels[i]}</text>`;
  }).join('');

  const basePoly = baseDomains
    ? `<polygon points="${keys.map((k, i) => pt(i, Math.max(1, Math.min(cap, Number(baseDomains?.[k] ?? 5))) / cap).map((p) => p.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="2 2" opacity="0.65"/>`
    : '';

  const valPts = keys.map((k, i) => {
    const v = Math.max(1, Math.min(cap, Number(domains?.[k] ?? 5))) / cap;
    return pt(i, v).map((p) => p.toFixed(1)).join(',');
  }).join(' ');

  return `
    <svg width="156" height="144" viewBox="0 0 156 144">
      ${rings}
      ${axes}
      ${basePoly}
      <polygon points="${valPts}" fill="${meta.color}28" stroke="${meta.color}" stroke-width="2"/>
    </svg>
  `;
}
