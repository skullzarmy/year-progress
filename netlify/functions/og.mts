import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { buildCardSvg, isTheme } from '../../src/lib/card.ts';
import { calculateProgress } from '../../src/lib/progress.ts';

/** Locate the bundled TTF fonts (see `included_files` in netlify.toml). */
function loadFontFiles(): string[] {
  const candidates = [
    join(process.cwd(), 'netlify/functions/fonts'),
    join(process.env.LAMBDA_TASK_ROOT ?? '', 'netlify/functions/fonts'),
    join(process.env.LAMBDA_TASK_ROOT ?? '', 'fonts'),
    new URL('./fonts', import.meta.url).pathname,
  ];
  const dir = candidates.find((d) => existsSync(d));
  return dir ? readdirSync(dir).filter((f) => f.endsWith('.ttf')).map((f) => join(dir, f)) : [];
}

const fontFiles = loadFontFiles();

export default async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const themeParam = url.searchParams.get('theme');
  const theme = isTheme(themeParam) ? themeParam : 'glassmorphism';

  // `at` lets callers render a specific moment (handy for previews/tests).
  const at = url.searchParams.get('at');
  const parsed = at ? new Date(at) : new Date();
  const now = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  const svg = buildCardSvg({ theme, progress: calculateProgress(now), decimals: 4 });
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: 'Inter',
      monospaceFamily: 'Space Mono',
    },
  })
    .render()
    .asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      // Progress moves slowly; a short shared cache keeps this cheap under crawler bursts.
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
    },
  });
};

export const config = { path: '/og.png' };
