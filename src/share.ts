import { buildCardSvg, CARD_HEIGHT, CARD_WIDTH, isTheme, type ThemeName } from './lib/card.ts';
import { calculateProgress } from './lib/progress.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const dialog = $<HTMLDialogElement>('share-dialog');
const image = $<HTMLImageElement>('share-image');
const status = $<HTMLParagraphElement>('share-status');
const message = $<HTMLParagraphElement>('share-message');
const copyBtn = $<HTMLButtonElement>('share-copy');
const downloadBtn = $<HTMLButtonElement>('share-download');
const nativeBtn = $<HTMLButtonElement>('share-native');

let currentBlob: Blob | null = null;
let currentUrl: string | null = null;
let currentTheme: ThemeName = 'glassmorphism';
let currentYear = new Date().getFullYear();

/** Rasterise the SVG card to a PNG at 2x for crisp sharing. */
async function renderPng(svg: string): Promise<Blob> {
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = svgUrl;
    await img.decode();
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH * scale;
    canvas.height = CARD_HEIGHT * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function setMessage(text: string) {
  message.textContent = text;
}

function setBusy(busy: boolean) {
  const off = busy || !currentBlob;
  copyBtn.disabled = off || !(navigator.clipboard && 'write' in navigator.clipboard && typeof ClipboardItem !== 'undefined');
  downloadBtn.disabled = off;
  nativeBtn.disabled = off;
}

function fileName() {
  return `year-progress-${currentYear}-${currentTheme}.png`;
}

/** Post-intent links. They carry text + URL only; the preview image comes from the page's og:image. */
function updateSocialLinks(percentage: number, daysRemaining: number) {
  const url = `${location.origin}/?theme=${currentTheme}`;
  const text = `${currentYear} is ${percentage.toFixed(2)}% complete \u2014 ${daysRemaining} days left.`;
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const both = encodeURIComponent(`${text} ${url}`);
  const links: Record<string, string> = {
    'share-x': `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    'share-bluesky': `https://bsky.app/intent/compose?text=${both}`,
    'share-facebook': `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    'share-linkedin': `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    'share-reddit': `https://www.reddit.com/submit?url=${u}&title=${t}`,
    'share-whatsapp': `https://wa.me/?text=${both}`,
    'share-telegram': `https://t.me/share/url?url=${u}&text=${t}`,
    'share-email': `mailto:?subject=${encodeURIComponent('Year Progress')}&body=${both}`,
  };
  for (const [id, href] of Object.entries(links)) $<HTMLAnchorElement>(id).href = href;
}

async function open() {
  const attr = document.documentElement.getAttribute('data-theme');
  currentTheme = isTheme(attr) ? attr : 'glassmorphism';
  setMessage('');
  image.hidden = true;
  status.hidden = false;
  status.textContent = 'Rendering…';
  currentBlob = null;
  setBusy(true);
  if (!dialog.open) dialog.showModal();

  try {
    // Calculated at the moment of sharing, so the image is an exact snapshot.
    const progress = calculateProgress();
    currentYear = progress.year;
    updateSocialLinks(progress.percentage, progress.daysRemaining);
    const blob = await renderPng(buildCardSvg({ theme: currentTheme, progress, decimals: 7 }));
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentBlob = blob;
    currentUrl = URL.createObjectURL(blob);
    image.src = currentUrl;
    image.hidden = false;
    status.hidden = true;
  } catch {
    status.textContent = 'Sorry, the image could not be created in this browser.';
  }
  setBusy(false);
}

copyBtn.addEventListener('click', async () => {
  if (!currentBlob) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': currentBlob })]);
    setMessage('Image copied to clipboard.');
  } catch {
    setMessage('Copy was blocked by the browser. Use Download instead.');
  }
});

downloadBtn.addEventListener('click', () => {
  if (!currentUrl) return;
  const a = document.createElement('a');
  a.href = currentUrl;
  a.download = fileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setMessage('Download started.');
});

nativeBtn.addEventListener('click', async () => {
  if (!currentBlob) return;
  const file = new File([currentBlob], fileName(), { type: 'image/png' });
  try {
    await navigator.share({ files: [file], title: 'Year Progress', url: location.origin });
  } catch (err) {
    if ((err as DOMException).name !== 'AbortError') setMessage('Sharing failed. Try Download instead.');
  }
});

// Offer the native share sheet only where file sharing is supported.
const probe = new File([''], 'x.png', { type: 'image/png' });
if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] })) nativeBtn.hidden = false;

// Close when clicking the backdrop.
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => {
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = null;
  currentBlob = null;
  image.removeAttribute('src');
});

$<HTMLButtonElement>('share-btn').addEventListener('click', () => void open());
