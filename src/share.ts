// Tiny trigger: the dialog (markup, CSS, card renderer) loads on first use so it
// stays out of the critical path.
const btn = document.getElementById('share-btn') as HTMLButtonElement;
let loading: Promise<typeof import('./share-dialog.ts')> | undefined;
const load = () => (loading ??= import('./share-dialog.ts'));

// Warm the chunk as soon as the user shows intent.
for (const ev of ['pointerenter', 'focus', 'touchstart'] as const) btn.addEventListener(ev, () => void load(), { once: true, passive: true });

btn.addEventListener('click', () => void load().then((m) => m.open()));
