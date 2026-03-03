import './style.css';

// DOM Elements
const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
const progressFill = document.getElementById('progress-fill') as HTMLDivElement;
const semanticProgress = document.getElementById('semantic-progress') as HTMLProgressElement;
const percentageText = document.getElementById('percentage-text') as HTMLSpanElement;
const daysRemainingText = document.getElementById('days-remaining') as HTMLSpanElement;

// Terminal specifics
const termPrefix = document.getElementById('term-prefix')!;
const termCursor = document.getElementById('term-cursor')!;

// Theme Handling
const THEME_KEY = 'year_progress_theme';
const VALID_THEMES = ['glassmorphism', 'vaporwave', '80s-digital', 'cyberpunk', 'terminal'];

function getInitialTheme(): string {
  // 1. Check URL parameters first
  const urlParams = new URLSearchParams(window.location.search);
  const urlTheme = urlParams.get('theme');
  if (urlTheme && VALID_THEMES.includes(urlTheme)) {
    return urlTheme;
  }
  
  // 2. Fallback to localStorage
  const localTheme = localStorage.getItem(THEME_KEY);
  if (localTheme && VALID_THEMES.includes(localTheme)) {
    return localTheme;
  }
  
  // 3. Default
  return 'glassmorphism';
}

let currentTheme = getInitialTheme();

function setTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme);
  themeSelect.value = theme;
  localStorage.setItem(THEME_KEY, theme);
  currentTheme = theme;
  
  // Update URL without reloading the page
  const url = new URL(window.location.href);
  url.searchParams.set('theme', theme);
  window.history.replaceState({}, '', url);
  
  const vaporTitlebar = document.querySelector('.vapor-titlebar');
  if (vaporTitlebar) {
    if (theme === 'vaporwave') {
      vaporTitlebar.classList.remove('hidden');
    } else {
      vaporTitlebar.classList.add('hidden');
    }
  }

  if (theme === 'terminal') {
    termPrefix.classList.remove('hidden');
    termCursor.classList.remove('hidden');
  } else {
    termPrefix.classList.add('hidden');
    termCursor.classList.add('hidden');
  }
}

// Initial Theme
setTheme(currentTheme);

let isTransitioning = false;

themeSelect.addEventListener('change', async (e) => {
  if (isTransitioning) {
    e.preventDefault();
    (e.target as HTMLSelectElement).value = currentTheme;
    return;
  }
  
  const targetTheme = (e.target as HTMLSelectElement).value;
  if (targetTheme === currentTheme) return;

  const overlay = document.getElementById('transition-overlay');
  
  if (overlay) {
    isTransitioning = true;
    (e.target as HTMLSelectElement).disabled = true;

    // 1. Prepare overlay aesthetics for the incoming theme
    overlay.setAttribute('data-next-theme', targetTheme);
    overlay.classList.remove('hidden');
    
    // Force DOM reflow to ensure the CSS transition triggers
    void overlay.offsetWidth;
    
    // 2. Fade in
    overlay.classList.add('active');
    
    // Wait for fade (400ms) + buffer for the user to see the transition screen
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // 3. Swap the application theme securely behind the overlay
    setTheme(targetTheme);
    
    // Give the browser time to paint, compute layout, and swap web fonts
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 4. Fade out
    overlay.classList.remove('active');
    
    // Wait for CSS fade out to finish
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Clean up
    overlay.classList.add('hidden');
    (e.target as HTMLSelectElement).disabled = false;
    isTransitioning = false;
  } else {
    setTheme(targetTheme);
  }
});

// Progress Calculation
function calculateProgress() {
  const now = new Date();
  const year = now.getFullYear();
  
  const startOfYear = new Date(year, 0, 1).getTime();
  const startOfNextYear = new Date(year + 1, 0, 1).getTime();
  
  const totalMs = startOfNextYear - startOfYear;
  const elapsedMs = now.getTime() - startOfYear;
  const remainingMs = totalMs - elapsedMs;
  
  const percentage = (elapsedMs / totalMs) * 100;
  const daysRemaining = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  
  return { percentage, daysRemaining };
}

let lastTickTime = 0;

function update(time: number) {
  const { percentage, daysRemaining } = calculateProgress();
  const percentString = percentage.toFixed(7) + '%';
  
  // Throttle updates slightly to 30fps to avoid excessive DOM writes 
  // and make animations smoother/less visually taxing.
  if (time - lastTickTime > 33) {
    progressFill.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
    
    if (currentTheme === 'terminal') {
       // A clean text block representation that doesn't trigger seizure/motion issues
       const blocksCount = Math.floor(percentage / 4); // 25 blocks total
       const blocks = '█'.repeat(blocksCount) + '▒'.repeat(25 - blocksCount);
       percentageText.textContent = `[${blocks}] ${percentString}`;
    } else {
       percentageText.textContent = percentString;
    }
    
    daysRemainingText.textContent = `${daysRemaining} days remaining`;
    semanticProgress.value = percentage;
    semanticProgress.textContent = percentString;
    
    lastTickTime = time;
  }
  
  requestAnimationFrame(update);
}

requestAnimationFrame(update);
