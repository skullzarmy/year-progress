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

interface Palette {
  /** SVG <defs> content (gradients etc.) */
  defs: string;
  /** Full-bleed background markup */
  background: string;
  panelFill: string;
  panelStroke: string;
  panelRadius: number;
  text: string;
  muted: string;
  trackFill: string;
  barFill: string;
  barRadius: number;
  font: string;
  numberFont: string;
  title: (year: number) => string;
  prefix: string;
}

const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Space Mono', 'Courier New', monospace";

const PALETTES: Record<ThemeName, Palette> = {
  glassmorphism: {
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4facfe"/><stop offset=".55" stop-color="#00f2fe"/><stop offset="1" stop-color="#ffb199"/></linearGradient>
<linearGradient id="fill" x1="0" x2="1"><stop offset="0" stop-color="#ff0844"/><stop offset="1" stop-color="#ffb199"/></linearGradient>`,
    background: `<rect width="1200" height="630" fill="url(#bg)"/><circle cx="130" cy="110" r="230" fill="#ffea00" opacity=".75"/><circle cx="1090" cy="560" r="260" fill="#ff0844" opacity=".6"/>`,
    panelFill: 'rgba(255,255,255,0.55)', panelStroke: 'rgba(255,255,255,0.85)', panelRadius: 36,
    text: '#000000', muted: '#1e293b', trackFill: 'rgba(255,255,255,0.55)', barFill: 'url(#fill)', barRadius: 20,
    font: SANS, numberFont: SANS, title: (y) => `${y} PROGRESS`, prefix: '',
  },
  vaporwave: {
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000033"/><stop offset=".4" stop-color="#660066"/><stop offset=".8" stop-color="#ff3399"/><stop offset="1" stop-color="#ff99cc"/></linearGradient>
<linearGradient id="fill" x1="0" x2="1"><stop offset="0" stop-color="#000080"/><stop offset="1" stop-color="#1084d0"/></linearGradient>`,
    background: `<rect width="1200" height="630" fill="url(#bg)"/>${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="0" x2="1200" y1="${470 + i * i * 5 + i * 8}" y2="${470 + i * i * 5 + i * 8}" stroke="#ff00ff" opacity=".55"/>`).join('')}`,
    panelFill: '#c0c0c0', panelStroke: '#ffffff', panelRadius: 0,
    text: '#000000', muted: '#404040', trackFill: '#ffffff', barFill: 'url(#fill)', barRadius: 0,
    font: SANS, numberFont: SANS, title: (y) => `YEAR_${y}.EXE`, prefix: '',
  },
  '80s-digital': {
    defs: '',
    background: `<rect width="1200" height="630" fill="#0d0000"/>`,
    panelFill: '#0a0000', panelStroke: '#330000', panelRadius: 8,
    text: '#ff3333', muted: '#c73a3a', trackFill: '#1a0000', barFill: '#ff3333', barRadius: 4,
    font: MONO, numberFont: MONO, title: (y) => `${y} PROGRESS`, prefix: '',
  },
  cyberpunk: {
    defs: `<pattern id="fill" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="28" fill="#00f0ff"/><rect x="14" width="14" height="28" fill="#008b99"/></pattern>`,
    background: `<rect width="1200" height="630" fill="#020205"/><rect x="40" y="40" width="1120" height="550" fill="none" stroke="#00f0ff" opacity=".25"/>`,
    panelFill: '#111116', panelStroke: '#ff003c', panelRadius: 0,
    text: '#fcee0a', muted: '#00f0ff', trackFill: '#050505', barFill: 'url(#fill)', barRadius: 0,
    font: MONO, numberFont: MONO, title: (y) => `${y} // PROGRESS`, prefix: '',
  },
  terminal: {
    defs: '',
    background: `<rect width="1200" height="630" fill="#000000"/>`,
    panelFill: 'none', panelStroke: '#22c55e', panelRadius: 0,
    text: '#4ade80', muted: '#22c55e', trackFill: '#021a0a', barFill: '#4ade80', barRadius: 0,
    font: MONO, numberFont: MONO, title: (y) => `root@${y}:~# progress`, prefix: '> ',
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
  const barX = 120, barW = 960, barY = 395, barH = 56;
  const fillW = Math.round((barW * pct) / 100);
  const days = `${progress.daysRemaining} day${progress.daysRemaining === 1 ? '' : 's'} remaining`;
  const numSize = theme === '80s-digital' ? 112 : theme === 'terminal' || theme === 'cyberpunk' ? 104 : 128;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="${esc(`${progress.year} is ${pct.toFixed(2)}% complete`)}">
<defs>${p.defs}<clipPath id="bar"><rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${p.barRadius}"/></clipPath></defs>
${p.background}
<rect x="70" y="70" width="1060" height="490" rx="${p.panelRadius}" fill="${p.panelFill}" stroke="${p.panelStroke}" stroke-width="3"/>
<text x="600" y="170" text-anchor="middle" font-family="${p.font}" font-size="40" font-weight="800" letter-spacing="6" fill="${p.muted}">${esc(p.title(progress.year))}</text>
<text x="600" y="320" text-anchor="middle" font-family="${p.numberFont}" font-size="${numSize}" font-weight="800" fill="${p.text}">${esc(pctText)}</text>
<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="${p.barRadius}" fill="${p.trackFill}"/>
<g clip-path="url(#bar)"><rect x="${barX}" y="${barY}" width="${fillW}" height="${barH}" fill="${p.barFill}"/></g>
<text x="600" y="505" text-anchor="middle" font-family="${p.font}" font-size="36" fill="${p.text}">${esc(days)}</text>
<text x="600" y="598" text-anchor="middle" font-family="${p.font}" font-size="24" fill="#ffffff" opacity=".85" stroke="#000" stroke-opacity=".35" stroke-width=".6">${esc(footer)}</text>
</svg>`;
}
