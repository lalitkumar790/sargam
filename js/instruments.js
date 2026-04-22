/**
 * instruments.js  — v4
 * ─────────────────────────────────────────────────────────────
 * Instrument selection, keyboard/touch/click dispatch, badge flash,
 * audio-controls wiring.
 *
 * AudioEngine.resume() is called FIRST in every user-gesture handler.
 * This ensures the AudioContext is created + running before play().
 * ─────────────────────────────────────────────────────────────
 */

const Instruments = (() => {
  'use strict';

  const INSTRUMENTS = ['sitar', 'flute', 'tabla', 'harmonium', 'violin', 'sarod'];
  const NOTES       = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'];
  const KEYS        = ['a',  's',  'd',  'f',  'j',  'k',   'l' ];

  let activeIdx  = 0;
  let pitchShift = 0;
  const noteListeners = [];

  const instrBtns   = Array.from(document.querySelectorAll('.instrument'));
  const activeLabel = document.getElementById('activeInstrumentLabel');

  /* ── instrument selection ───────────────────────────────── */
  function selectInstrument(idx) {
    instrBtns.forEach(b => b.classList.remove('btn-dark'));
    instrBtns[idx].classList.add('btn-dark');
    activeIdx = idx;
    if (activeLabel) {
      const n = INSTRUMENTS[idx];
      activeLabel.textContent = n.charAt(0).toUpperCase() + n.slice(1) + ' selected';
    }
  }

  function getActiveIdx()  { return activeIdx; }
  function getActiveName() { return INSTRUMENTS[activeIdx]; }

  /* ── note trigger ───────────────────────────────────────── */
  function triggerNote(instrIdx, noteIdx, when = 0) {
    AudioEngine.play(INSTRUMENTS[instrIdx], noteIdx, pitchShift, when);
    if (when === 0) _flashBadge(noteIdx, INSTRUMENTS[instrIdx]);
    noteListeners.forEach(fn => fn(instrIdx, noteIdx, when));
  }

  function playActive(noteIdx) {
    triggerNote(activeIdx, noteIdx);
  }

  function playByName(noteName, instrIdx, when = 0) {
    const noteIdx = NOTES.indexOf(noteName);
    if (noteIdx === -1) return;
    const idx = instrIdx !== undefined ? instrIdx : activeIdx;
    AudioEngine.play(INSTRUMENTS[idx], noteIdx, pitchShift, when);
    if (when === 0) _flashBadge(noteIdx, INSTRUMENTS[idx]);
    noteListeners.forEach(fn => fn(idx, noteIdx, when));
  }

  /* ── badge flash ────────────────────────────────────────── */
  function _flashBadge(noteIdx, instrName) {
    const el = document.querySelectorAll(`.note-badge.${instrName}`)[noteIdx];
    if (!el) return;
    el.classList.remove('note-active');
    void el.offsetWidth;
    el.classList.add('note-active');
    setTimeout(() => el.classList.remove('note-active'), 380);
  }

  /* ── note badge click / touch ───────────────────────────── */
  INSTRUMENTS.forEach((name, instrIdx) => {
    document.querySelectorAll(`.note-badge.${name}`).forEach((badge, noteIdx) => {
      badge.addEventListener('click', () => {
        AudioEngine.resume();          // ← FIRST: create/resume context
        selectInstrument(instrIdx);
        triggerNote(instrIdx, noteIdx);
      });
      badge.addEventListener('touchend', e => {
        e.preventDefault();
        AudioEngine.resume();          // ← FIRST
        selectInstrument(instrIdx);
        triggerNote(instrIdx, noteIdx);
      });
    });
  });

  /* ── instrument icon click / touch ─────────────────────── */
  instrBtns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      AudioEngine.resume();            // ← FIRST
      selectInstrument(idx);
    });
    btn.addEventListener('touchend', e => {
      e.preventDefault();
      AudioEngine.resume();            // ← FIRST
      selectInstrument(idx);
    });
  });

  /* ── keyboard ───────────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.repeat) return;
    const noteIdx = KEYS.indexOf(e.key);
    if (noteIdx === -1) return;
    AudioEngine.resume();              // ← FIRST
    playActive(noteIdx);
  });

  /* ── audio controls ─────────────────────────────────────── */
  const volumeSlider = document.getElementById('volumeSlider');
  const pitchSlider  = document.getElementById('pitchSlider');
  const reverbSlider = document.getElementById('reverbSlider');

  volumeSlider?.addEventListener('input', function () {
    AudioEngine.resume();
    AudioEngine.setVolume(parseFloat(this.value));
    document.getElementById('volumeVal').textContent = Math.round(this.value * 100) + '%';
  });

  pitchSlider?.addEventListener('input', function () {
    pitchShift = parseInt(this.value, 10);
    document.getElementById('pitchVal').textContent = (pitchShift >= 0 ? '+' : '') + pitchShift;
  });

  reverbSlider?.addEventListener('input', function () {
    AudioEngine.resume();
    AudioEngine.setReverb(parseFloat(this.value));
    document.getElementById('reverbVal').textContent = Math.round(this.value * 100) + '%';
  });

  /* ── subscription ───────────────────────────────────────── */
  function onNote(fn) { noteListeners.push(fn); }

  /* ── default selection ──────────────────────────────────── */
  selectInstrument(0);

  return { INSTRUMENTS, NOTES, KEYS, selectInstrument, getActiveIdx, getActiveName, triggerNote, playActive, playByName, onNote };
})();
