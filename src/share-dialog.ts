import './share.css';
import { buildCardSvg, CARD_HEIGHT, CARD_WIDTH, isTheme, type ThemeName } from './lib/card.ts';
import { calculateProgress } from './lib/progress.ts';

const TEMPLATE = `<dialog id="share-dialog" aria-labelledby="share-title">
      <form method="dialog" class="share-panel">
        <div class="share-head">
          <h2 id="share-title">Share your progress</h2>
          <button type="submit" class="ui-btn share-close" aria-label="Close">&times;</button>
        </div>
        <div class="share-preview" aria-live="polite">
          <img id="share-image" alt="Year progress card" width="1200" height="630" hidden />
          <p id="share-status" class="share-status">Rendering…</p>
        </div>
        <section class="share-section" aria-labelledby="share-save-label">
          <h3 id="share-save-label">Save image</h3>
          <div class="share-grid">
            <button type="button" id="share-copy" class="ui-btn" disabled>Copy image</button>
            <button type="button" id="share-download" class="ui-btn" disabled>Download</button>
            <button type="button" id="share-native" class="ui-btn" hidden disabled>Share…</button>
          </div>
        </section>
        <section class="share-section" aria-labelledby="share-post-label">
          <h3 id="share-post-label">Post to</h3>
          <nav class="share-grid" aria-label="Post to social networks">
          <a class="ui-btn" id="share-x" href="https://twitter.com/intent/tweet?url=https%3A%2F%2Fyip.joepeterson.work%2F" target="_blank" rel="noopener noreferrer">X</a>
          <a class="ui-btn" id="share-bluesky" href="https://bsky.app/intent/compose?text=https%3A%2F%2Fyip.joepeterson.work%2F" target="_blank" rel="noopener noreferrer">Bluesky</a>
          <a class="ui-btn" id="share-facebook" href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fyip.joepeterson.work%2F" target="_blank" rel="noopener noreferrer">Facebook</a>
          <a class="ui-btn" id="share-linkedin" href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fyip.joepeterson.work%2F" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a class="ui-btn" id="share-reddit" href="https://www.reddit.com/submit?url=https%3A%2F%2Fyip.joepeterson.work%2F" target="_blank" rel="noopener noreferrer">Reddit</a>
          <a class="ui-btn" id="share-whatsapp" href="https://wa.me/?text=https%3A%2F%2Fyip.joepeterson.work%2F" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a class="ui-btn" id="share-telegram" href="https://t.me/share/url?url=https%3A%2F%2Fyip.joepeterson.work%2F" target="_blank" rel="noopener noreferrer">Telegram</a>
          <a class="ui-btn" id="share-email" href="mailto:?subject=Year%20Progress&body=https%3A%2F%2Fyip.joepeterson.work%2F">Email</a>
        </nav>
        </section>
        <p id="share-message" class="share-message" role="status"></p>
      </form>
    </dialog>`;

function mount(): HTMLDialogElement {
  document.body.insertAdjacentHTML('beforeend', TEMPLATE);
  return document.getElementById('share-dialog') as HTMLDialogElement;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const dialog = mount();
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

export async function open() {
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

