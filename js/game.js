/**
 * game.js
 * ─────────────────────────────────────────────────────────────
 * Melody Bubble Drop game.
 * Reads canvas background from the document body so it naturally
 * adapts to Bootstrap light/dark mode — no custom colours forced.
 * ─────────────────────────────────────────────────────────────
 */

const Game = (() => {
  'use strict';

  const { INSTRUMENTS, NOTES } = Instruments;

  const MELODIES = {
    Yaman:    { notes: ['Sa','Re','Ga','Ma','Pa','Dha','Ni','Sa','Ni','Dha','Pa','Ma','Ga','Re','Sa'], bpm: 88,  desc: 'Evening raga — Kalyan thaat' },
    Bhairav:  { notes: ['Sa','Re','Ga','Ma','Pa','Dha','Ni','Dha','Pa','Ma','Ga','Re','Sa'],           bpm: 68,  desc: 'Morning raga — peaceful' },
    Bhupali:  { notes: ['Sa','Re','Ga','Pa','Dha','Sa','Dha','Pa','Ga','Re','Sa'],                     bpm: 78,  desc: 'Pentatonic — serene' },
    Desh:     { notes: ['Sa','Ma','Pa','Ni','Sa','Ni','Pa','Ma','Pa','Ga','Re','Sa'],                   bpm: 100, desc: 'Late night — romantic' },
    Malkauns: { notes: ['Sa','Ga','Ma','Dha','Ni','Sa','Ni','Dha','Ma','Ga','Sa'],                     bpm: 62,  desc: 'Deep night — introspective' },
  };

  // Bootstrap subtle tints — match original badge colours
  const NOTE_HEX = ['#3b82f6','#22c55e','#ca8a04','#0891b2','#64748b','#dc2626','#7c3aed'];

  const PLATFORM_H = 56;
  const BUBBLE_R   = 26;
  const FALL_PX    = 2.0;

  // ── State ────────────────────────────────────────────────────
  let canvas, ctx;
  let running      = false;
  let bubbles      = [];
  let pops         = [];
  let queue        = [];
  let spawnTimer   = null;
  let rafId        = null;
  let activeMelody = 'Yaman';

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('bubbleCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    _resize();
    window.addEventListener('resize', () => { _resize(); if (!running) _drawIdle(); });

    // Raga buttons
    document.querySelectorAll('.raga-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.raga-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeMelody = btn.dataset.melody;
        if (!running) _drawIdle();
      });
    });

    document.getElementById('startGameBtn')?.addEventListener('click', _start);
    document.getElementById('stopGameBtn')?.addEventListener('click',  _stop);

    _drawIdle();
  }

  function _resize() {
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth  || 640;
    canvas.height = canvas.offsetHeight || 420;
  }

  // ── Idle canvas ───────────────────────────────────────────────
  function _drawIdle() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    _drawBg();
    _drawPlatform();
    const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    ctx.fillStyle = dark ? 'rgba(210,210,230,0.5)' : 'rgba(40,40,60,0.42)';
    ctx.font = '15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Select a raga above, then press ▶ Play Melody', canvas.width / 2, (canvas.height - PLATFORM_H) / 2);
  }

  function _drawBg() {
    // Match actual Bootstrap body background
    const bg = window.getComputedStyle(document.body).backgroundColor || '#ffffff';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function _drawPlatform() {
    const y    = canvas.height - PLATFORM_H;
    const colW = canvas.width / 7;
    const dark = document.documentElement.getAttribute('data-bs-theme') === 'dark';

    ctx.fillStyle = dark ? '#343a40' : '#e9ecef';
    ctx.fillRect(0, y, canvas.width, PLATFORM_H);

    ctx.strokeStyle = dark ? '#495057' : '#dee2e6';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();

    NOTES.forEach((note, i) => {
      const cx = colW * i + colW / 2;
      const cy = y + PLATFORM_H / 2;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fillStyle = NOTE_HEX[i];
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = dark ? '#dee2e6' : '#212529';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(note, cx, cy);
    });
  }

  // ── Bubble ────────────────────────────────────────────────────
  class Bubble {
    constructor(note) {
      this.note    = note;
      this.idx     = NOTES.indexOf(note);
      this.color   = NOTE_HEX[this.idx];
      const colW   = canvas.width / 7;
      this.x       = colW * this.idx + colW / 2 + (Math.random() - 0.5) * 12;
      this.y       = -BUBBLE_R - 4;
      this.speed   = FALL_PX + (Math.random() - 0.5) * 0.2;
      this.sway    = Math.random() * Math.PI * 2;
    }
    update() {
      this.y += this.speed;
      this.sway += 0.04;
      this.x += Math.sin(this.sway) * 0.3;
    }
    landed() { return this.y + BUBBLE_R >= canvas.height - PLATFORM_H; }
    draw() {
      const { x, y, color, note } = this;
      const r = BUBBLE_R;
      ctx.save();
      const gr = ctx.createRadialGradient(x - r*0.3, y - r*0.3, r*0.05, x, y, r);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.4, color + 'cc');
      gr.addColorStop(1,   color + '44');
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - r*0.28, y - r*0.28, r*0.13, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();
      ctx.fillStyle = '#1a1a2e';
      ctx.font = `bold ${Math.round(r*0.57)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(note, x, y + 1);
      ctx.restore();
    }
  }

  // ── Pop effect ────────────────────────────────────────────────
  class Pop {
    constructor(x, y, color) {
      this.x = x; this.y = y; this.color = color;
      this.r = BUBBLE_R; this.alpha = 1;
      this.sparks = Array.from({ length: 6 }, () => ({
        a: Math.random() * Math.PI * 2, s: 1.5 + Math.random() * 2, d: 0,
      }));
    }
    update() { this.r += 3; this.alpha -= 0.08; this.sparks.forEach(s => { s.d += s.s; }); }
    dead()   { return this.alpha <= 0; }
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.stroke();
      this.sparks.forEach(s => {
        ctx.beginPath();
        ctx.arc(this.x + Math.cos(s.a)*s.d, this.y + Math.sin(s.a)*s.d, 2.5, 0, Math.PI*2);
        ctx.fillStyle = this.color;
        ctx.fill();
      });
      ctx.restore();
    }
  }

  // ── Game loop ─────────────────────────────────────────────────
  function _loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    _drawBg();
    _drawPlatform();

    const alive = [];
    bubbles.forEach(b => {
      b.update();
      if (b.landed()) {
        pops.push(new Pop(b.x, canvas.height - PLATFORM_H, b.color));
        Instruments.playByName(b.note);
      } else {
        b.draw();
        alive.push(b);
      }
    });
    bubbles = alive;

    pops = pops.filter(p => { p.update(); p.draw(); return !p.dead(); });

    // HUD
    const mel   = MELODIES[activeMelody];
    const total = mel.notes.length;
    const done  = total - queue.length - bubbles.length;
    const dark  = document.documentElement.getAttribute('data-bs-theme') === 'dark';
    ctx.fillStyle = dark ? 'rgba(200,200,220,0.45)' : 'rgba(40,40,70,0.38)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`${activeMelody}  ·  ${Math.min(done, total)} / ${total}`, canvas.width - 8, 8);

    if (running || bubbles.length || pops.length) {
      rafId = requestAnimationFrame(_loop);
    } else {
      setTimeout(_drawIdle, 600);
      document.getElementById('startGameBtn').disabled = false;
      document.getElementById('stopGameBtn').disabled  = true;
      const gs = document.getElementById('gameStatus');
      if (gs) { gs.textContent = '✓ Melody complete'; setTimeout(() => gs.textContent = '', 3000); }
    }
  }

  // ── Spawn ─────────────────────────────────────────────────────
  function _spawn() {
    if (!queue.length) { running = false; clearInterval(spawnTimer); return; }
    bubbles.push(new Bubble(queue.shift()));
  }

  // ── Start / Stop ──────────────────────────────────────────────
  function _start() {
    _stop();
    AudioEngine.resume();
    const mel = MELODIES[activeMelody];
    queue   = [...mel.notes];
    bubbles = []; pops = [];
    running = true;
    document.getElementById('startGameBtn').disabled = true;
    document.getElementById('stopGameBtn').disabled  = false;
    const gs = document.getElementById('gameStatus');
    if (gs) gs.textContent = mel.desc;
    const ms = (60 / mel.bpm) * 1000;
    _spawn();
    spawnTimer = setInterval(_spawn, ms);
    rafId = requestAnimationFrame(_loop);
  }

  function _stop() {
    running = false;
    clearInterval(spawnTimer);
    cancelAnimationFrame(rafId);
    bubbles = []; pops = []; queue = [];
    document.getElementById('startGameBtn').disabled = false;
    document.getElementById('stopGameBtn').disabled  = true;
    const gs = document.getElementById('gameStatus');
    if (gs) gs.textContent = '';
    _drawIdle();
  }

  return { init };
})();
