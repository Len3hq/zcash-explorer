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

  function initRawModal() {
    const modal = document.querySelector('[data-raw-modal]');
    if (!modal) return;

    // Always start hidden on page load
    modal.setAttribute('hidden', 'hidden');
    document.body.classList.remove('modal-open');

    const openBtn = document.querySelector('[data-raw-modal-open]');
    const closeBtn = modal.querySelector('[data-raw-modal-close]');
    const content = modal.querySelector('.modal');

    const open = () => {
      modal.removeAttribute('hidden');
      document.body.classList.add('modal-open');
    };

    const close = () => {
      modal.setAttribute('hidden', 'hidden');
      document.body.classList.remove('modal-open');
    };

    if (openBtn) openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);

    modal.addEventListener('click', (e) => {
      // Close when clicking anywhere outside the modal content
      if (!content.contains(e.target)) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
        close();
      }
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initRawModal();
  });
})();
