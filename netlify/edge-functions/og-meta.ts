import type { Context } from '@netlify/edge-functions';

const THEMES = ['glassmorphism', 'vaporwave', '80s-digital', 'cyberpunk', 'terminal'];

/**
 * Makes the Open Graph / Twitter image theme-aware: `/?theme=cyberpunk` is
 * served with `og:image` pointing at `/og.png?theme=cyberpunk`.
 */
export default async (request: Request, context: Context) => {
  const theme = new URL(request.url).searchParams.get('theme');
  const response = await context.next();
  if (!theme || !THEMES.includes(theme)) return response;

  const html = await response.text();
  const out = html.replaceAll('/og.png"', `/og.png?theme=${theme}"`);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(out, { status: response.status, headers });
};

export const config = { path: '/' };
