(function () {
  const THEME_KEY = 'zec_explorer_theme';

  function applyTheme(theme) {
    const body = document.body;
    body.classList.remove('theme-light', 'theme-dark');
    if (theme === 'light') {
      body.classList.add('theme-light');
    } else {
      body.classList.add('theme-dark');
    }
  }

  function initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored || (prefersDark ? 'dark' : 'light');
    applyTheme(initial);

    const toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.body.classList.contains('theme-light') ? 'light' : 'dark';
        const next = current === 'light' ? 'dark' : 'light';
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
      });
    }
  }

  async function fetchSummary() {
    try {
      const res = await fetch('/api/summary');
      if (!res.ok) return;
      const data = await res.json();

      const heightEl = document.getElementById('stat-height');
      const verifEl = document.getElementById('stat-verification');
      const bestEl = document.getElementById('stat-bestblock');
      const tpsEl = document.getElementById('stat-tps');
      const blockRateEl = document.getElementById('stat-blockrate');

      if (heightEl && typeof data.height === 'number') {
        heightEl.textContent = data.height.toLocaleString();
      }
      if (verifEl && typeof data.verificationprogress === 'number') {
        verifEl.textContent = (data.verificationprogress * 100).toFixed(2) + '%';
      }
      if (bestEl && data.bestblockhash) {
        bestEl.textContent = data.bestblockhash;
      }
      if (tpsEl && typeof data.approxTps === 'number') {
        tpsEl.textContent = data.approxTps.toFixed(2) + ' tx/s';
      }
      if (blockRateEl && typeof data.blocksPerHour === 'number') {
        blockRateEl.textContent = data.blocksPerHour.toFixed(2) + ' blocks/hr';
      }
    } catch (e) {
      // ignore errors for UI polling
    }
  }

  function initLiveStats() {
    if (!document.getElementById('stat-height')) return; // only on home
    fetchSummary();
    setInterval(fetchSummary, 10000); // every 10s
  }

  window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLiveStats();
  });
})();
