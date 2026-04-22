/**
 * sargam-roll.js
 * ─────────────────────────────────────────────────────────────
 * Sargam Roll — a visual grid composer for Indian classical music.
 *
 * Layout: 7 rows (notes) × N columns (beats / steps)
 * Users click cells to toggle notes, set BPM, choose instrument,
 * then play back with sample-accurate scheduling.
 *
 * Every composition can be exported as structured JSON — this
 * becomes the training dataset for the AI model (Level 3).
 *
 * DOM injection: inserts its own section after #sargamRollAnchor
 * ─────────────────────────────────────────────────────────────
 */

const SargamRoll = (() => {
  'use strict';

  const { INSTRUMENTS, NOTES } = Instruments;

  // ── Config ───────────────────────────────────────────────────
  const STEPS      = 16;     // columns (beats per loop)
  const NOTE_ROWS  = 7;      // rows (Sa … Ni)
  const CELL_H     = 38;     // px height per row
  const CELL_W_MIN = 46;     // minimum cell width (scales up on wide screens)

  // Bootstrap badge colour classes (same order as HTML, index = noteIdx)
  const NOTE_BG = [
    'bg-primary-subtle   border-primary-subtle   text-primary-emphasis',
    'bg-success-subtle   border-success-subtle   text-success-emphasis',
    'bg-warning-subtle   border-warning-subtle   text-warning-emphasis',
    'bg-info-subtle      border-info-subtle      text-info-emphasis',
    'bg-secondary-subtle border-secondary-subtle text-secondary-emphasis',
    'bg-danger-subtle    border-danger-subtle    text-danger-emphasis',
    'bg-dark-subtle      border-dark-subtle      text-dark-emphasis',
  ];

  // ── State ────────────────────────────────────────────────────
  // grid[noteIdx][stepIdx] = { active: bool, instrIdx: number, velocity: 0–1 }
  let grid      = _emptyGrid();
  let bpm       = 100;
  let isPlaying = false;
  let curStep   = -1;
  let stepTimer = null;      // setInterval handle
  let instrIdx  = 0;         // selected instrument for new cells

  // Right-click drag state
  let dragging  = false;
  let dragMode  = null;      // 'paint' | 'erase'

  // ── DOM refs ─────────────────────────────────────────────────
  let gridEl, playBtn, stopBtn, bpmInput, bpmVal, instrSelect,
      exportBtn, clearBtn, loopCount;

  // ── Grid helpers ─────────────────────────────────────────────
  function _emptyGrid() {
    return Array.from({ length: NOTE_ROWS }, () =>
      Array.from({ length: STEPS }, () => ({ active: false, instrIdx: 0, velocity: 0.85 }))
    );
  }

  // ── Build DOM ─────────────────────────────────────────────────
  function _buildSection() {
    const anchor = document.getElementById('sargamRollAnchor');
    if (!anchor) return;

    const section = document.createElement('div');
    section.id = 'sargamRollSection';
    section.className = 'container col-xxl-8 px-4 py-5';
    section.innerHTML = `
      <h5 class="fw-semibold text-body-emphasis mb-1">🎼 Sargam Roll — Composer</h5>
      <p class="text-body-secondary small mb-3">
        Click cells to paint notes. Right-click to erase.
        Each column is one beat. Exports as JSON for AI training.
      </p>

      <!-- Controls row -->
      <div class="d-flex flex-wrap align-items-center gap-3 mb-3">

        <!-- Instrument selector -->
        <select id="srInstrSelect" class="form-select form-select-sm" style="width:140px">
          ${INSTRUMENTS.map((n, i) => `<option value="${i}">${n.charAt(0).toUpperCase() + n.slice(1)}</option>`).join('')}
        </select>

        <!-- BPM -->
        <div class="d-flex align-items-center gap-2">
          <label class="form-label small mb-0 fw-semibold">BPM</label>
          <input id="srBpmInput" type="range" class="form-range" min="40" max="200" step="1" value="100" style="width:100px" />
          <span id="srBpmVal" class="text-body-secondary small" style="min-width:32px">100</span>
        </div>

        <!-- Steps -->
        <div class="d-flex align-items-center gap-2">
          <label class="form-label small mb-0 fw-semibold">Steps</label>
          <select id="srStepsSelect" class="form-select form-select-sm" style="width:76px">
            <option value="8">8</option>
            <option value="16" selected>16</option>
            <option value="32">32</option>
          </select>
        </div>

        <!-- Play / Stop -->
        <button id="srPlayBtn" class="btn btn-sm btn-outline-primary">▶ Play</button>
        <button id="srStopBtn" class="btn btn-sm btn-outline-secondary" disabled>⏹ Stop</button>

        <!-- Clear -->
        <button id="srClearBtn" class="btn btn-sm btn-outline-secondary">🗑 Clear</button>

        <!-- Export -->
        <button id="srExportBtn" class="btn btn-sm btn-outline-secondary">⬇ Export JSON</button>
      </div>

      <!-- Grid wrapper -->
      <div id="srGridWrapper" class="sr-grid-wrapper border rounded-3 overflow-auto">
        <!-- Row labels + cells built dynamically -->
        <div id="srGrid" class="sr-grid"></div>
      </div>

      <p class="text-body-secondary mt-2" style="font-size:0.72rem">
        💡 Tip: Export JSON files collect your compositions as training data for the AI model (Level 3).
      </p>
    `;
    anchor.after(section);

    // Cache refs
    gridEl       = section.querySelector('#srGrid');
    playBtn      = section.querySelector('#srPlayBtn');
    stopBtn      = section.querySelector('#srStopBtn');
    bpmInput     = section.querySelector('#srBpmInput');
    bpmVal       = section.querySelector('#srBpmVal');
    instrSelect  = section.querySelector('#srInstrSelect');
    exportBtn    = section.querySelector('#srExportBtn');
    clearBtn     = section.querySelector('#srClearBtn');
    const stepsSelect = section.querySelector('#srStepsSelect');

    // Events
    bpmInput.addEventListener('input', () => {
      bpm = parseInt(bpmInput.value, 10);
      bpmVal.textContent = bpm;
    });
    instrSelect.addEventListener('change', () => { instrIdx = parseInt(instrSelect.value, 10); });
    stepsSelect.addEventListener('change', () => { _resize(parseInt(stepsSelect.value, 10)); });
    playBtn.addEventListener('click',   _play);
    stopBtn.addEventListener('click',   _stop);
    clearBtn.addEventListener('click',  _clear);
    exportBtn.addEventListener('click', _exportJSON);

    // Prevent context menu on grid (we use right-click for erase)
    section.querySelector('#srGridWrapper').addEventListener('contextmenu', e => e.preventDefault());

    _buildGrid();
  }

  // ── Grid rendering ────────────────────────────────────────────
  function _buildGrid() {
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const totalSteps = grid[0].length;

    NOTES.forEach((noteName, rowIdx) => {
      const row = document.createElement('div');
      row.className = 'sr-row';

      // Row label
      const label = document.createElement('span');
      label.className = `sr-label badge rounded-pill ${NOTE_BG[rowIdx].replace(/\s+/g, ' ')}`;
      label.textContent = noteName;
      row.appendChild(label);

      // Cells
      for (let step = 0; step < totalSteps; step++) {
        const cell = document.createElement('div');
        cell.className   = 'sr-cell';
        cell.dataset.row  = rowIdx;
        cell.dataset.step = step;
        _updateCellVisual(cell, grid[rowIdx][step]);
        _attachCellEvents(cell, rowIdx, step);
        row.appendChild(cell);
      }
      gridEl.appendChild(row);
    });
  }

  function _updateCellVisual(cell, cellData) {
    cell.classList.toggle('sr-cell-active', cellData.active);
    if (cellData.active) {
      const instr = INSTRUMENTS[cellData.instrIdx];
      cell.dataset.instrName = instr;
    } else {
      delete cell.dataset.instrName;
    }
  }

  function _getCellEl(rowIdx, step) {
    return gridEl?.querySelector(`[data-row="${rowIdx}"][data-step="${step}"]`);
  }

  // ── Cell interaction ──────────────────────────────────────────
  function _attachCellEvents(cell, rowIdx, step) {
    cell.addEventListener('mousedown', e => {
      e.preventDefault();
      AudioEngine.resume();
      if (e.button === 2) {
        // Right-click → erase
        dragging = true; dragMode = 'erase';
        _eraseCell(rowIdx, step, cell);
      } else {
        // Left-click → toggle
        dragging = true;
        dragMode = grid[rowIdx][step].active ? 'erase' : 'paint';
        if (dragMode === 'paint') _paintCell(rowIdx, step, cell);
        else                      _eraseCell(rowIdx, step, cell);
      }
    });
    cell.addEventListener('mouseenter', e => {
      if (!dragging) return;
      if (dragMode === 'paint') _paintCell(rowIdx, step, cell);
      else                      _eraseCell(rowIdx, step, cell);
    });
    // Touch support
    cell.addEventListener('touchstart', e => {
      e.preventDefault();
      AudioEngine.resume();
      dragging = true;
      dragMode = grid[rowIdx][step].active ? 'erase' : 'paint';
      if (dragMode === 'paint') _paintCell(rowIdx, step, cell);
      else                      _eraseCell(rowIdx, step, cell);
    }, { passive: false });
  }

  // Global mouseup ends drag
  document.addEventListener('mouseup',    () => { dragging = false; dragMode = null; });
  document.addEventListener('touchend',   () => { dragging = false; dragMode = null; });

  function _paintCell(rowIdx, step, cell) {
    if (grid[rowIdx][step].active && grid[rowIdx][step].instrIdx === instrIdx) return;
    grid[rowIdx][step] = { active: true, instrIdx, velocity: 0.85 };
    _updateCellVisual(cell, grid[rowIdx][step]);
    // Audition the note
    AudioEngine.play(INSTRUMENTS[instrIdx], rowIdx, 0, 0, 0.7);
  }

  function _eraseCell(rowIdx, step, cell) {
    if (!grid[rowIdx][step].active) return;
    grid[rowIdx][step] = { active: false, instrIdx, velocity: 0.85 };
    _updateCellVisual(cell, grid[rowIdx][step]);
  }

  // ── Resize steps ──────────────────────────────────────────────
  function _resize(newSteps) {
    grid = Array.from({ length: NOTE_ROWS }, (_, r) => {
      return Array.from({ length: newSteps }, (_, s) => {
        return (grid[r] && grid[r][s]) ? grid[r][s] : { active: false, instrIdx: 0, velocity: 0.85 };
      });
    });
    _buildGrid();
  }

  // ── Playback ──────────────────────────────────────────────────
  function _play() {
    if (isPlaying) return;
    isPlaying = true;
    curStep   = -1;
    playBtn.disabled = true;
    stopBtn.disabled = false;

    const stepMs = (60 / bpm) * 1000;
    _tick();
    stepTimer = setInterval(_tick, stepMs);
  }

  function _tick() {
    // Remove previous cursor
    if (curStep >= 0) {
      document.querySelectorAll(`.sr-cell[data-step="${curStep}"]`).forEach(c => c.classList.remove('sr-cursor'));
    }
    curStep = (curStep + 1) % grid[0].length;

    // Paint cursor column
    document.querySelectorAll(`.sr-cell[data-step="${curStep}"]`).forEach(c => c.classList.add('sr-cursor'));

    // Schedule all active notes in this step
    grid.forEach((row, noteIdx) => {
      const cell = row[curStep];
      if (!cell.active) return;
      AudioEngine.play(INSTRUMENTS[cell.instrIdx], noteIdx, 0, 0, cell.velocity);
    });
  }

  function _stop() {
    clearInterval(stepTimer);
    isPlaying = false;
    // Remove cursor highlight
    document.querySelectorAll('.sr-cursor').forEach(c => c.classList.remove('sr-cursor'));
    playBtn.disabled = false;
    stopBtn.disabled = true;
    curStep = -1;
  }

  function _clear() {
    _stop();
    grid = _emptyGrid();
    _buildGrid();
  }

  // ── Export as training JSON ───────────────────────────────────
  function _exportJSON() {
    const totalSteps = grid[0].length;
    const events = [];

    for (let step = 0; step < totalSteps; step++) {
      for (let noteIdx = 0; noteIdx < NOTE_ROWS; noteIdx++) {
        const cell = grid[noteIdx][step];
        if (!cell.active) continue;
        events.push({
          step,
          note:       NOTES[noteIdx],
          noteIdx,
          instrument: INSTRUMENTS[cell.instrIdx],
          instrIdx:   cell.instrIdx,
          velocity:   cell.velocity,
        });
      }
    }

    const payload = {
      version: 1,
      format:  'sargam-roll',
      bpm,
      steps:   totalSteps,
      events,
      // Metadata useful for AI training
      meta: {
        noteSet:     NOTES,
        instruments: INSTRUMENTS,
        exportedAt:  new Date().toISOString(),
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sargam-composition-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    _buildSection();
    _injectStyles();
  }

  // ── Grid CSS (self-contained so styles.css stays untouched) ──
  function _injectStyles() {
    if (document.getElementById('sr-styles')) return;
    const style = document.createElement('style');
    style.id = 'sr-styles';
    style.textContent = `
      .sr-grid-wrapper { background: transparent; }

      .sr-grid {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 10px;
        min-width: max-content;
      }

      .sr-row {
        display: flex;
        align-items: center;
        gap: 3px;
      }

      .sr-label {
        width: 54px;
        min-width: 54px;
        text-align: center;
        font-size: 0.78rem;
        margin-right: 4px;
        cursor: default;
      }

      .sr-cell {
        width: ${CELL_W_MIN}px;
        height: ${CELL_H}px;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.1s, transform 0.08s;
        border: 1px solid var(--bs-border-color, #dee2e6);
        background-color: var(--bs-body-bg, #fff);
        user-select: none;
        -webkit-user-select: none;
        flex-shrink: 0;
      }

      .sr-cell:hover {
        filter: brightness(0.92);
      }

      /* Active cell — filled with instrument tint */
      .sr-cell-active[data-instr-name="sitar"]     { background-color: #cfe2ff; border-color: #9ec5fe; }
      .sr-cell-active[data-instr-name="flute"]     { background-color: #d1e7dd; border-color: #a3cfbb; }
      .sr-cell-active[data-instr-name="tabla"]     { background-color: #fff3cd; border-color: #ffd97d; }
      .sr-cell-active[data-instr-name="harmonium"] { background-color: #cff4fc; border-color: #9eeaf9; }
      .sr-cell-active[data-instr-name="violin"]    { background-color: #e2e3e5; border-color: #c4c8cb; }
      .sr-cell-active[data-instr-name="sarod"]     { background-color: #f8d7da; border-color: #f1aeb5; }

      /* Dark mode active cells */
      [data-bs-theme="dark"] .sr-cell-active[data-instr-name="sitar"]     { background-color: #084298; border-color: #0a58ca; }
      [data-bs-theme="dark"] .sr-cell-active[data-instr-name="flute"]     { background-color: #0a3622; border-color: #146c43; }
      [data-bs-theme="dark"] .sr-cell-active[data-instr-name="tabla"]     { background-color: #664d03; border-color: #997404; }
      [data-bs-theme="dark"] .sr-cell-active[data-instr-name="harmonium"] { background-color: #032830; border-color: #055160; }
      [data-bs-theme="dark"] .sr-cell-active[data-instr-name="violin"]    { background-color: #2b2d30; border-color: #495057; }
      [data-bs-theme="dark"] .sr-cell-active[data-instr-name="sarod"]     { background-color: #58151c; border-color: #842029; }

      /* Playback cursor column */
      .sr-cell.sr-cursor {
        outline: 2px solid #0d6efd;
        outline-offset: -1px;
        transform: scaleY(0.92);
      }

      [data-bs-theme="dark"] .sr-cell.sr-cursor {
        outline-color: #6ea8fe;
      }

      /* Idle cell hover in dark mode */
      [data-bs-theme="dark"] .sr-cell {
        background-color: var(--bs-body-bg, #212529);
        border-color: var(--bs-border-color, #495057);
      }
    `;
    document.head.appendChild(style);
  }

  return { init };
})();
