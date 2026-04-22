/**
 * recorder.js
 * ─────────────────────────────────────────────────────────────
 * Records note events (instrument, note, timestamp) and replays
 * them with sample-accurate scheduling via Web Audio API.
 * ─────────────────────────────────────────────────────────────
 */

const Recorder = (() => {
  'use strict';

  // Map noteIdx → Bootstrap badge colour class (matches original HTML)
  const BADGE_CLASS = [
    'bg-primary-subtle   border border-primary-subtle   text-primary-emphasis',
    'bg-success-subtle   border border-success-subtle   text-success-emphasis',
    'bg-warning-subtle   border border-warning-subtle   text-warning-emphasis',
    'bg-info-subtle      border border-info-subtle      text-info-emphasis',
    'bg-secondary-subtle border border-secondary-subtle text-secondary-emphasis',
    'bg-danger-subtle    border border-danger-subtle    text-danger-emphasis',
    'bg-dark-subtle      border border-dark-subtle      text-dark-emphasis',
  ];

  // ── State ────────────────────────────────────────────────────
  let isRecording = false;
  let notes       = [];        // { instrIdx, noteIdx, tMs }  — wall-clock time offset
  let startMs     = 0;

  // ── DOM refs ─────────────────────────────────────────────────
  const recordBtn = document.getElementById('recordBtn');
  const replayBtn = document.getElementById('replayBtn');
  const clearBtn  = document.getElementById('clearBtn');
  const status    = document.getElementById('recordStatus');
  const strip     = document.getElementById('recordedNotes');

  if (!recordBtn) return {};   // section not in DOM

  // ── Capture from Instruments.onNote ──────────────────────────
  Instruments.onNote((instrIdx, noteIdx, when) => {
    if (!isRecording || when !== 0) return;   // don't record scheduled (game/sequencer) notes
    const entry = { instrIdx, noteIdx, tMs: Date.now() - startMs };
    notes.push(entry);
    _addPill(instrIdx, noteIdx);
  });

  // ── Pill rendering ────────────────────────────────────────────
  function _addPill(instrIdx, noteIdx) {
    const pill  = document.createElement('span');
    const cls   = BADGE_CLASS[noteIdx] || BADGE_CLASS[0];
    pill.className = `badge rounded-pill ${cls}`;
    pill.style.cursor = 'default';
    pill.title = `${Instruments.INSTRUMENTS[instrIdx]} — ${Instruments.NOTES[noteIdx]}`;
    pill.textContent = Instruments.NOTES[noteIdx];

    // Small pop-in
    pill.style.transform = 'scale(0.5)';
    pill.style.opacity   = '0';
    pill.style.transition = 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s';
    strip.appendChild(pill);
    requestAnimationFrame(() => {
      pill.style.transform = 'scale(1)';
      pill.style.opacity   = '1';
    });
  }

  // ── Controls ──────────────────────────────────────────────────
  recordBtn.addEventListener('click', () => {
    if (isRecording) _stopRecording();
    else             _startRecording();
  });

  replayBtn.addEventListener('click', _replay);
  clearBtn.addEventListener('click',  _clear);

  function _startRecording() {
    notes       = [];
    strip.innerHTML = '';
    startMs     = Date.now();
    isRecording = true;

    recordBtn.textContent = '⏹ Stop';
    recordBtn.classList.replace('btn-outline-danger', 'btn-danger');
    status.textContent    = '🔴 Recording…';
    replayBtn.disabled    = true;
    clearBtn.disabled     = true;
  }

  function _stopRecording() {
    isRecording = false;
    recordBtn.textContent = '⏺ Record';
    recordBtn.classList.replace('btn-danger', 'btn-outline-danger');
    const n = notes.length;
    status.textContent = n ? `${n} note${n > 1 ? 's' : ''} saved` : 'Nothing recorded';
    if (n) { replayBtn.disabled = false; clearBtn.disabled = false; }
  }

  function _replay() {
    if (!notes.length) return;
    replayBtn.disabled = true;
    status.textContent = '▶ Replaying…';

    // Use AudioContext currentTime for sample-accurate scheduling
    const now     = AudioEngine.currentTime();
    const originMs = notes[0].tMs;

    notes.forEach(({ instrIdx, noteIdx, tMs }) => {
      const offsetSec = (tMs - originMs) / 1000;
      AudioEngine.play(Instruments.INSTRUMENTS[instrIdx], noteIdx, 0, offsetSec);
    });

    const durationMs = notes[notes.length - 1].tMs - originMs + 800;
    setTimeout(() => {
      replayBtn.disabled = false;
      status.textContent = 'Replay done';
    }, durationMs);
  }

  function _clear() {
    notes       = [];
    strip.innerHTML = '';
    status.textContent  = 'Cleared — ready to record';
    replayBtn.disabled  = true;
    clearBtn.disabled   = true;
  }

  // ── Export for Sargam Roll / AI training ─────────────────────
  function exportJSON() {
    return JSON.stringify({
      version: 1,
      instrument: Instruments.getActiveName(),
      notes: notes.map(n => ({
        note: Instruments.NOTES[n.noteIdx],
        instrument: Instruments.INSTRUMENTS[n.instrIdx],
        tMs: n.tMs,
      })),
    }, null, 2);
  }

  return { exportJSON };
})();
