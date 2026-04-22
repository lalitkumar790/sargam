/**
 * app.js  — v4
 * ─────────────────────────────────────────────────────────────
 * Entry point.
 *
 * AudioEngine.init() is now a no-op placeholder.
 * The AudioContext is created lazily inside AudioEngine.resume(),
 * which instruments.js calls at the top of every user-gesture handler.
 *
 * Preloading is triggered after the first gesture via the interval
 * loop inside AudioEngine.preload().
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // Register lazy init (no-op; actual context created on first gesture)
  AudioEngine.init();

  // Background preload — will self-retry until context is running
  AudioEngine.preload(Instruments.INSTRUMENTS, 7);

  // Sargam Roll composer — injects its section into the DOM
  SargamRoll.init();

  // Bubble game — attaches to existing canvas
  Game.init();

  console.info(
    '%c🎵 Saregama v4 ready',
    'color:#0d6efd;font-weight:bold',
    '| Play any note to activate Web Audio. new Audio() fallback active until then.'
  );
})();
