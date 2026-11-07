/**
 * Pure SVG builder for the "year progress" card. It is shared by the
 * Netlify OG-image function (rasterised with resvg) and the in-browser share
 * dialog (rasterised via <canvas>), so both always look the same.
 */
import type { YearProgress } from './progress.ts';

export const THEMES = ['glassmorphism', 'vaporwave', '80s-digital', 'cyberpunk', 'terminal'] as const;
export type ThemeName = (typeof THEMES)[number];

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

export function isTheme(value: string | null | undefined): value is ThemeName {
  return !!value && (THEMES as readonly string[]).includes(value);
}

interface Geometry {
  barX: number;
  barY: number;
  barW: number;
  barH: number;
  pct: number;
}

interface Palette {
  /** SVG <defs> content (gradients, filters etc.) */
  defs: string;
  /** Full-bleed background markup */
  background: string;
  /** Panel (card body) markup, including any chrome such as a title bar */
  panel: string;
  /** Progress bar markup */
  bar: (g: Geometry) => string;
  text: string;
  muted: string;
  titleColor: string;
  font: string;
  title: (year: number) => string;
  /** Percentage text renderer; defaults to a single <text>. */
  number?: (text: string, size: number, p: Palette) => string;
  numSize: number;
  prefix: string;
  /** Vertical offset applied to content when the panel has a title bar. */
  contentShift?: number;
}

const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Space Mono', 'Courier New', monospace";

const plainBar = (radius: number, track: string, fill: string, stroke = 'none') => (g: Geometry) => {
  const fillW = Math.round((g.barW * g.pct) / 100);
  return `<clipPath id="bar"><rect x="${g.barX}" y="${g.barY}" width="${g.barW}" height="${g.barH}" rx="${radius}"/></clipPath>
<rect x="${g.barX}" y="${g.barY}" width="${g.barW}" height="${g.barH}" rx="${radius}" fill="${track}" stroke="${stroke}"/>
<g clip-path="url(#bar)"><rect x="${g.barX}" y="${g.barY}" width="${fillW}" height="${g.barH}" fill="${fill}"/></g>`;
};

/** A bar made of discrete cells (LED segments / terminal blocks). */
const cellBar = (cells: number, gap: number, lit: string, off: string, offStroke: string, glow = '') => (g: Geometry) => {
  const w = (g.barW - gap * (cells - 1)) / cells;
  const on = Math.floor((g.pct / 100) * cells);
  let out = '';
  for (let i = 0; i < cells; i++) {
    const x = (g.barX + i * (w + gap)).toFixed(2);
    out += i < on
      ? `<rect x="${x}" y="${g.barY}" width="${w.toFixed(2)}" height="${g.barH}" fill="${lit}"${glow}/>`
      : `<rect x="${x}" y="${g.barY}" width="${w.toFixed(2)}" height="${g.barH}" fill="${off}" stroke="${offStroke}"/>`;
  }
  return out;
};

const PALETTES: Record<ThemeName, Palette> = {
  glassmorphism: {
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4facfe"/><stop offset=".55" stop-color="#00f2fe"/><stop offset="1" stop-color="#ffb199"/></linearGradient>
<linearGradient id="fill" x1="0" x2="1"><stop offset="0" stop-color="#ff0844"/><stop offset="1" stop-color="#ffb199"/></linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></linearGradient>`,
    background: `<rect width="1200" height="630" fill="url(#bg)"/><circle cx="130" cy="110" r="230" fill="#ffea00" opacity=".75"/><circle cx="1090" cy="560" r="260" fill="#ff0844" opacity=".6"/><circle cx="640" cy="40" r="140" fill="#00f2fe" opacity=".7"/>`,
    panel: `<rect x="70" y="70" width="1060" height="490" rx="40" fill="url(#sheen)" stroke="#fff" stroke-opacity=".9" stroke-width="3"/>`,
    bar: plainBar(28, 'rgba(255,255,255,0.55)', 'url(#fill)', 'rgba(255,255,255,0.8)'),
    text: '#000000', muted: '#1e293b', titleColor: '#1e293b', font: SANS,
    title: (y) => `${y} PROGRESS`, numSize: 128, prefix: '',
  },
  vaporwave: {
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000033"/><stop offset=".4" stop-color="#660066"/><stop offset=".8" stop-color="#ff3399"/><stop offset="1" stop-color="#ff99cc"/></linearGradient>
<linearGradient id="tb" x1="0" x2="1"><stop offset="0" stop-color="#000080"/><stop offset="1" stop-color="#1084d0"/></linearGradient>
<linearGradient id="fill" x1="0" x2="1"><stop offset="0" stop-color="#000080"/><stop offset="1" stop-color="#1084d0"/></linearGradient>`,
    background: `<rect width="1200" height="630" fill="url(#bg)"/><circle cx="600" cy="470" r="150" fill="#ffcc33" opacity=".85"/><rect y="470" width="1200" height="160" fill="#2a0a3a"/>${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="0" x2="1200" y1="${480 + i * i * 4 + i * 8}" y2="${480 + i * i * 4 + i * 8}" stroke="#ff00ff" opacity=".7"/>`).join('')}${Array.from({ length: 13 }, (_, i) => `<line x1="${600 + (i - 6) * 40}" y1="470" x2="${600 + (i - 6) * 190}" y2="630" stroke="#ff00ff" opacity=".6"/>`).join('')}`,
    panel: `<rect x="70" y="70" width="1060" height="490" fill="#c0c0c0" stroke="#fff" stroke-width="4"/><path d="M1130 70V560H70" fill="none" stroke="#808080" stroke-width="4"/><path d="M1134 66V564H66" fill="none" stroke="#000" stroke-width="2"/>
<rect x="78" y="78" width="1044" height="40" fill="url(#tb)"/><text x="94" y="106" font-family="${SANS}" font-size="24" font-weight="800" fill="#fff" letter-spacing="2">YEAR_PROGRESS.EXE</text>
${[0, 1, 2].map((i) => `<g><rect x="${1018 + i * 34}" y="85" width="28" height="26" fill="#c0c0c0" stroke="#fff"/><path d="M${1046 + i * 34} 85V111H${1018 + i * 34}" fill="none" stroke="#404040"/></g>`).join('')}<text x="1032" y="104" text-anchor="middle" font-family="${SANS}" font-size="22" font-weight="800" fill="#000">_</text><text x="1100" y="104" text-anchor="middle" font-family="${SANS}" font-size="22" font-weight="800" fill="#000">×</text>`,
    bar: (g) => `<rect x="${g.barX - 3}" y="${g.barY - 3}" width="${g.barW + 6}" height="${g.barH + 6}" fill="#fff" stroke="#808080" stroke-width="3"/>
<rect x="${g.barX}" y="${g.barY}" width="${Math.round((g.barW * g.pct) / 100)}" height="${g.barH}" fill="url(#fill)"/>`,
    text: '#000000', muted: '#404040', titleColor: '#000080', font: SANS,
    title: (y) => `${y} PROGRESS`, numSize: 120, prefix: '', contentShift: 24,
  },
  '80s-digital': {
    defs: `<filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".35"/></pattern>`,
    background: `<rect width="1200" height="630" fill="#0d0000"/><rect width="1200" height="630" fill="url(#scan)"/>`,
    panel: `<rect x="70" y="70" width="1060" height="490" rx="8" fill="#0a0000" stroke="#ff3333" stroke-opacity=".6" stroke-width="3" filter="url(#glow)"/><rect x="70" y="70" width="1060" height="490" rx="8" fill="#0a0000" stroke="#ff3333" stroke-width="2"/><rect width="1200" height="630" fill="url(#scan)"/>`,
    bar: cellBar(60, 6, '#ff3333', '#1a0000', '#330000', ' filter="url(#glow)"'),
    text: '#ff3333', muted: '#e04444', titleColor: '#ff3333', font: MONO,
    title: (y) => `\u25CF ${y} PROGRESS \u25CF`, numSize: 120, prefix: '',
    number: (t, size, p) => `<text x="600" y="320" text-anchor="middle" font-family="${p.font}" font-size="${size}" font-weight="800" fill="#ff3333" filter="url(#glow)" letter-spacing="2">${t}</text>`,
  },
  cyberpunk: {
    defs: `<pattern id="tape" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="20" height="40" fill="#fcee0a"/><rect x="20" width="20" height="40" fill="#050505"/></pattern>
<pattern id="fill" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="28" fill="#00f0ff"/><rect x="14" width="14" height="28" fill="#008b99"/></pattern>
<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#00f0ff" stroke-opacity=".12"/></pattern>`,
    background: `<rect width="1200" height="630" fill="#020205"/><rect width="1200" height="630" fill="url(#grid)"/>`,
    panel: `<path d="M80 80H1110L1140 110V570H110L80 540Z" fill="#ff003c" opacity=".35" transform="translate(12 12)"/><path d="M70 70H1100L1130 100V560H100L70 530Z" fill="#111116" stroke="#ff003c" stroke-width="4"/><path d="M70 70H1100L1130 100H70Z" fill="url(#tape)"/><rect x="70" y="70" width="1060" height="30" fill="none"/>`,
    bar: plainBar(0, '#050505', 'url(#fill)', '#333333'),
    text: '#fcee0a', muted: '#00f0ff', titleColor: '#ffffff', font: MONO,
    title: (y) => `// ${y} PROGRESS`, numSize: 104, prefix: '', contentShift: 14,
    number: (t, size, p) => `<text x="597" y="320" text-anchor="middle" font-family="${p.font}" font-size="${size}" font-weight="800" fill="#00f0ff">${t}</text><text x="603" y="320" text-anchor="middle" font-family="${p.font}" font-size="${size}" font-weight="800" fill="#ff003c">${t}</text><text x="600" y="320" text-anchor="middle" font-family="${p.font}" font-size="${size}" font-weight="800" fill="#fcee0a">${t}</text>`,
  },
  terminal: {
    defs: '',
    background: `<rect width="1200" height="630" fill="#000000"/>`,
    panel: `<rect x="70" y="70" width="1060" height="490" fill="none" stroke="#22c55e" stroke-width="2"/><line x1="70" x2="1130" y1="124" y2="124" stroke="#22c55e" stroke-dasharray="8 6"/><text x="92" y="106" font-family="${MONO}" font-size="24" fill="#22c55e">user@year-progress: ~</text><text x="1108" y="106" text-anchor="end" font-family="${MONO}" font-size="24" fill="#22c55e">[x]</text>`,
    bar: cellBar(40, 4, '#4ade80', '#021a0a', '#14532d'),
    text: '#4ade80', muted: '#22c55e', titleColor: '#22c55e', font: MONO,
    title: (y) => `$ ./progress --year ${y}`, numSize: 104, prefix: '> ', contentShift: 26,
  },
};

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

export interface CardOptions {
  theme: ThemeName;
  progress: YearProgress;
  /** Digits after the decimal point. */
  decimals?: number;
  /** Footer text, e.g. the site's hostname. */
  footer?: string;
}

export function buildCardSvg({ theme, progress, decimals = 4, footer = 'yip.joepeterson.work' }: CardOptions): string {
  const p = PALETTES[theme];
  const pct = Math.min(Math.max(progress.percentage, 0), 100);
  const pctText = `${p.prefix}${pct.toFixed(decimals)}%`;
  const shift = p.contentShift ?? 0;
  const g: Geometry = { barX: 120, barY: 395 + shift, barW: 960, barH: 56, pct };
  const days = `${progress.daysRemaining} day${progress.daysRemaining === 1 ? '' : 's'} remaining`;
  const numY = 320 + shift;
  const number = p.number
    ? p.number(esc(pctText), p.numSize, p).replace(/y="320"/g, `y="${numY}"`)
    : `<text x="600" y="${numY}" text-anchor="middle" font-family="${p.font}" font-size="${p.numSize}" font-weight="800" fill="${p.text}">${esc(pctText)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="${esc(`${progress.year} is ${pct.toFixed(2)}% complete`)}">
<defs>${p.defs}</defs>
${p.background}
${p.panel}
<text x="600" y="${170 + shift}" text-anchor="middle" font-family="${p.font}" font-size="40" font-weight="800" letter-spacing="6" fill="${p.titleColor}">${esc(p.title(progress.year))}</text>
${number}
${p.bar(g)}
<text x="600" y="${505 + shift}" text-anchor="middle" font-family="${p.font}" font-size="36" fill="${p.text}">${esc(days)}</text>
<text x="600" y="600" text-anchor="middle" font-family="${p.font}" font-size="24" fill="#ffffff" opacity=".85" stroke="#000" stroke-opacity=".35" stroke-width=".6">${esc(footer)}</text>
</svg>`;
}
