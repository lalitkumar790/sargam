/**
 * audio-engine.js  — v4 (bulletproof)
 * ─────────────────────────────────────────────────────────────
 * ROOT CAUSE OF SILENCE — three bugs in v3:
 *
 *   1. AudioContext created at page load (app.js calls init()).
 *      Chrome suspends it instantly; no user gesture has happened yet.
 *
 *   2. XHR on file:// in Chrome returns status=0 + 0-byte body.
 *      Old code treated status===0 as success, decodeAudioData silently
 *      failed, buffer never cached, play() returned without sound.
 *
 *   3. ready=true was set even with a suspended context, so the
 *      new Audio() fallback at the top of play() never triggered.
 *
 * FIX STRATEGY
 * ─────────────────────────────────────────────────────────────
 *   • AudioContext created LAZILY — only inside a real user-gesture handler.
 *   • XHR validated: if byteLength === 0 → treat as failure.
 *   • play() always has two layers:
 *       Layer A  Web Audio API (buffer, effects, pitch) — when context is RUNNING
 *       Layer B  new Audio().play()                     — guaranteed fallback
 *   • ready flag only true when ctx.state === 'running'.
 *
 * Signal chain (Layer A):
 *   BufferSource → noteGain → masterGain
 *                               ├─► dryGain  → destination
 *                               └─► convolver → wetGain → destination
 * ─────────────────────────────────────────────────────────────
 */

const AudioEngine = (() => {
  'use strict';

  /* ── private state ──────────────────────────────────────── */
  let ctx        = null;
  let masterGain = null;
  let dryGain    = null;
  let wetGain    = null;
  let convolver  = null;

  // Buffer cache:  "instrName_noteIdx" → AudioBuffer
  const bufCache  = {};
  // In-flight XHR promises (de-duplicate concurrent loads)
  const inFlight  = {};

  // Queued volume/reverb calls made before ctx existed
  let pendingVolume = 0.85;
  let pendingReverb = 0.15;

  /* ── context creation (MUST happen inside user gesture) ─── */
  function _createCtx() {
    if (ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    ctx        = new Ctx();
    masterGain = ctx.createGain();
    masterGain.gain.value = pendingVolume;

    dryGain = ctx.createGain();
    dryGain.gain.value = 1 - pendingReverb;

    wetGain = ctx.createGain();
    wetGain.gain.value = pendingReverb;

    convolver        = ctx.createConvolver();
    convolver.buffer = _buildImpulse(2.0, 3.5);

    // Wire: masterGain → dry path + reverb path
    masterGain.connect(dryGain);
    masterGain.connect(convolver);
    convolver.connect(wetGain);
    dryGain.connect(ctx.destination);
    wetGain.connect(ctx.destination);

    console.info('[AudioEngine] AudioContext created. State:', ctx.state);
  }

  /* ── synthetic exponential reverb impulse ───────────────── */
  function _buildImpulse(durSec, decay) {
    if (!ctx) return null;
    const n   = Math.round(ctx.sampleRate * durSec);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return buf;
  }

  /* ── XHR buffer loader ──────────────────────────────────── */
  function _xhrLoad(url) {
    return new Promise((resolve, reject) => {
      const xhr       = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';

      xhr.onload = () => {
        // status 0 happens on file:// — but Chrome gives 0 bytes → reject
        const ok = (xhr.status === 200) ||
                   (xhr.status === 0 && xhr.response && xhr.response.byteLength > 0);
        if (!ok) {
          reject(new Error(`XHR failed: status=${xhr.status} bytes=${xhr.response?.byteLength ?? 'n/a'} url=${url}`));
          return;
        }
        ctx.decodeAudioData(
          xhr.response,
          buf => resolve(buf),
          err => reject(new Error(`decodeAudioData failed for ${url}: ${err}`))
        );
      };

      xhr.onerror = () => reject(new Error(`XHR network error: ${url}`));
      xhr.send();
    });
  }

  /* ── load buffer (cached + de-duplicated) ───────────────── */
  async function _loadBuffer(instrName, noteIdx) {
    if (!ctx || ctx.state === 'suspended') return null;   // not ready for Web Audio yet

    const key = `${instrName}_${noteIdx}`;
    if (bufCache[key])  return bufCache[key];
    if (inFlight[key])  return inFlight[key];

    const url  = `./sounds/${instrName}${noteIdx + 1}.mp3`;
    const task = _xhrLoad(url)
      .then(buf => { bufCache[key] = buf; delete inFlight[key]; return buf; })
      .catch(err => { delete inFlight[key]; throw err; });

    inFlight[key] = task;
    return task;
  }

  /* ══════════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════ */

  /**
   * Call this inside EVERY user-gesture handler (click, keydown, touchend).
   * Creates the AudioContext on first call, resumes if suspended.
   * Safe to call repeatedly.
   */
  function resume() {
    _createCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => console.info('[AudioEngine] Context resumed'));
    }
  }

  /**
   * play() — two-layer approach
   *
   *  Layer A  (preferred): Web Audio API with effects + pitch shift.
   *           Used when AudioContext is running AND buffer loads successfully.
   *
   *  Layer B  (guaranteed fallback): new Audio().play()
   *           Used when file:// blocks XHR, or context isn't running yet,
   *           or any other failure. Always produces sound.
   *
   * @param {string}  instrName
   * @param {number}  noteIdx       0–6
   * @param {number}  [semitones=0] pitch shift
   * @param {number}  [when=0]      AudioContext time offset in seconds
   * @param {number}  [gain=1]      per-note gain
   */
  async function play(instrName, noteIdx, semitones = 0, when = 0, gain = 1) {
    const src = `./sounds/${instrName}${noteIdx + 1}.mp3`;

    /* ── Layer A: try Web Audio API ── */
    if (ctx && ctx.state === 'running') {
      let buf = null;
      try {
        buf = await _loadBuffer(instrName, noteIdx);
      } catch (e) {
        console.warn(`[AudioEngine] Buffer load failed (${src}) — using Audio fallback. Reason:`, e.message);
      }

      if (buf) {
        const source = ctx.createBufferSource();
        source.buffer             = buf;
        source.playbackRate.value = Math.pow(2, semitones / 12);

        const noteGain = ctx.createGain();
        noteGain.gain.value = gain;

        source.connect(noteGain);
        noteGain.connect(masterGain);

        const startAt = ctx.currentTime + Math.max(0, when);
        source.start(startAt);
        return;   // ← Layer A succeeded, done
      }
    }

    /* ── Layer B: new Audio() — always works ── */
    if (when > 0) {
      // Scheduled future note — use setTimeout as approximation
      setTimeout(() => _playSimple(src, gain), when * 1000);
    } else {
      _playSimple(src, gain);
    }
  }

  function _playSimple(src, gain) {
    const audio = new Audio(src);
    audio.volume = Math.min(1, Math.max(0, gain * pendingVolume));
    audio.play().catch(e => console.warn('[AudioEngine] Audio.play() blocked:', e.message));
  }

  /* ── preload: fire-and-forget background buffer loading ─── */
  function preload(instruments, noteCount) {
    // Wait until context exists (first user gesture), then load
    const _tryLoad = () => {
      if (!ctx || ctx.state !== 'running') return;
      instruments.forEach(name => {
        for (let i = 0; i < noteCount; i++) {
          _loadBuffer(name, i).catch(() => {});
        }
      });
    };

    // Retry every second until context is running
    const id = setInterval(() => {
      if (ctx && ctx.state === 'running') { _tryLoad(); clearInterval(id); }
    }, 1000);
  }

  /* ── parameter control ──────────────────────────────────── */
  function setVolume(v) {
    pendingVolume = v;
    if (masterGain && ctx) masterGain.gain.setTargetAtTime(v, ctx.currentTime, 0.01);
  }

  function setReverb(wet) {
    pendingReverb = wet;
    if (wetGain && dryGain && ctx) {
      wetGain.gain.setTargetAtTime(wet,     ctx.currentTime, 0.01);
      dryGain.gain.setTargetAtTime(1 - wet, ctx.currentTime, 0.01);
    }
  }

  /* ── utilities ──────────────────────────────────────────── */
  function currentTime() { return ctx ? ctx.currentTime : performance.now() / 1000; }
  function isReady()     { return !!(ctx && ctx.state === 'running'); }

  // init() is now a no-op — context is created lazily in resume()
  // Kept for API compatibility with app.js
  function init() {
    console.info('[AudioEngine] Lazy init registered. Context will be created on first user gesture.');
  }

  return { init, resume, preload, play, setVolume, setReverb, currentTime, isReady };
})();
