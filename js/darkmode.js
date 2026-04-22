/**
 * darkmode.js
 * ─────────────────────────────────────────────────────────────
 * Toggles Bootstrap data-bs-theme. Persists to localStorage.
 * ─────────────────────────────────────────────────────────────
 */

const DarkMode = (() => {
  'use strict';

  const btn = document.getElementById('darkModeToggle');

  function apply(on) {
    document.documentElement.setAttribute('data-bs-theme', on ? 'dark' : 'light');
    if (btn) btn.textContent = on ? '☀️ Light Mode' : '🌙 Dark Mode';
    localStorage.setItem('sargam-darkMode', on);
  }

  // Restore on load
  apply(localStorage.getItem('sargam-darkMode') === 'true');

  if (btn) {
    btn.addEventListener('click', () => {
      apply(document.documentElement.getAttribute('data-bs-theme') !== 'dark');
    });
  }

  return { apply };
})();
