// Overexposed — every interaction sound and the ambience, synthesized in code. No audio files.
// Two kinds of synthesis:
//  • Sampled: paper, card stock, the stamp, applause and rain are built sample by sample from many tiny
//    events — paper is thousands of fibre crackles; applause is a few people near you and a full house
//    behind them, each clap shaped on measurements of recorded hand claps; the rain is a muffled wash with
//    drops ticking on the glass, tuned until it measured like a recording of rain on a window. Each is
//    rendered once (three variants; the rain loop one) into a buffer: by prepare(), in a worker off the main
//    thread where the page allows one (else in idle moments), or on first use.
//  • Live: tones, bells, the phone, the camera and the room are Web Audio graphs.
// Every random number comes from a fixed seed, so each sound is the same on every machine.
//
// API (a global, OXSound):
//   OXSound.init(ctx?, opts?)      create the audio graph (pass an OfflineAudioContext to render offline)
//   OXSound.prepare()              render the sampled sounds ahead of use, in a worker (call once, early on)
//   OXSound.play(name, when?)      play one sound; `when` is a context time, default now
//   OXSound.ambience(name, on)     start or stop a loop: room, rain, wind (1.5 s fades)
//   OXSound.volume(bus, v)         bus: master | sfx | amb | music
//   OXSound.musicBus()             the music bus (a GainNode): the music player connects its sources to it
//   OXSound.suspend(on)            suspend (true) or resume (false) all sound, e.g. while the page is hidden
//   OXSound.names, OXSound.ambienceNames, OXSound.tap() (an analyser on the output, for a meter)
// Browsers start audio only after a user gesture: call init() or play() from a click.

// The seeded random numbers every sound is built from, shared by the page and the render worker.
function oxMulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function oxHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

// ══ DSP: plain functions on Float32Arrays, no Web Audio — paper, cards, stamp, applause, rain ══
// Self-contained on purpose: it uses nothing outside itself, so the render worker can run its source as is.
function oxMakeDSP() {
  'use strict';
  function bq(type, f, q, sr) {
    const w = (2 * Math.PI * f) / sr, cw = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2; const a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
    if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; }
    else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; } // band-pass, 0 dB at the centre
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  }
  function run(x, c, len = x.length) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < len; i++) { const y = c[0] * x[i] + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y; }
    return x;
  }
  // Band-limit with gentle (Q 0.707) high- and low-pass filters, twice each for a steeper skirt.
  function band(x, sr, lo, hi) {
    if (lo) { run(x, bq('hp', lo, 0.707, sr)); run(x, bq('hp', lo, 0.707, sr)); }
    if (hi) { run(x, bq('lp', hi, 0.707, sr)); run(x, bq('lp', hi, 0.707, sr)); }
    return x;
  }
  const gauss = (r) => (r() + r() + r() + r() + r() + r() - 3) * 1.414;
  function poisson(r, lam) {
    if (lam <= 0) return 0;
    if (lam < 25) { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
    return Math.max(0, Math.round(lam + Math.sqrt(lam) * gauss(r)));
  }
  // Paper fibres: many tiny broadband ticks. rate(u) ticks/s and amp(u) follow the gesture (u from 0 to 1);
  // sizes are heavily skewed toward small, as in real crackle. Returned band-limited, never tonal.
  function crackle(N, sr, r, t0, dur, rate, amp, tau, lo, hi) {
    const x = new Float32Array(N), n0 = Math.round(t0 * sr), D = Math.round(dur * sr), B = Math.max(1, Math.round(sr * 0.002));
    for (let b = 0; b < D; b += B) {
      const u = b / D, k = poisson(r, (rate(u) * B) / sr);
      for (let j = 0; j < k; j++) {
        const at = n0 + b + Math.floor(r() * B), a = amp(u) * Math.pow(r(), 2.4) * (r() < 0.5 ? -1 : 1);
        const tc = ((tau[0] + r() * (tau[1] - tau[0])) * sr) / 1000, L = Math.ceil(tc * 7);
        for (let i = 0; i < L && at + i < N; i++) x[at + i] += a * (r() * 2 - 1) * Math.exp(-i / tc);
      }
    }
    return band(x, sr, lo, hi);
  }
  // Paper rubbing paper: noise whose level wavers the way a hand does.
  function hiss(N, sr, r, t0, dur, env, lo, hi) {
    const x = new Float32Array(N), n0 = Math.round(t0 * sr), D = Math.round(dur * sr);
    let w = 1, target = 1;
    for (let i = 0; i < D && n0 + i < N; i++) {
      if (i % 96 === 0) target = 0.55 + 0.45 * r();
      w += (target - w) * 0.02;
      x[n0 + i] = env(i / D) * w * (r() * 2 - 1);
    }
    return band(x, sr, lo, hi);
  }
  // The air a moving sheet pushes: soft, low, shaped like a breath.
  function air(sr, r, dur, hi) {
    const N = Math.round(dur * sr), y = new Float32Array(N);
    for (let i = 0; i < N; i++) y[i] = (r() * 2 - 1) * Math.pow(Math.sin((Math.PI * i) / N), 1.5);
    return band(y, sr, 120, hi);
  }
  // A sheet or a card landing: a short slap, and (body) the dull weight under it.
  function slap(sr, r, bright, body) {
    const N = Math.round(sr * 0.06), s = new Float32Array(N), b = new Float32Array(N);
    for (let i = 0; i < N; i++) { s[i] = (r() * 2 - 1) * Math.exp(-i / (sr * 0.0016)); b[i] = (r() * 2 - 1) * Math.exp(-i / (sr * 0.007)); }
    band(s, sr, 300, bright); band(b, sr, 0, 320);
    for (let i = 0; i < N; i++) s[i] += body * b[i];
    return s;
  }
  // One card leaving the thumb in a riffle.
  function flap(sr, r) {
    const N = Math.round(sr * 0.012), y = new Float32Array(N), tc = sr * (0.0006 + r() * 0.0006);
    for (let i = 0; i < N; i++) y[i] = (r() * 2 - 1) * Math.exp(-i / tc);
    band(y, sr, 900, 7000); return run(y, bq('bp', 2200 + r() * 900, 0.9, sr));
  }
  // The deck squared on the desk.
  function knock(sr, r) {
    const N = Math.round(sr * 0.06), y = new Float32Array(N);
    for (let i = 0; i < N; i++) y[i] = (r() * 2 - 1) * Math.exp(-i / (sr * 0.004));
    band(y, sr, 90, 900);
    const s = slap(sr, r, 3000, 0.6); for (let i = 0; i < N; i++) y[i] += 0.5 * s[i];
    return y;
  }
  function add(x, y, i0, g) { for (let i = 0; i < y.length && i0 + i < x.length; i++) x[i0 + i] += g * y[i]; return x; }
  function norm(chs, peak) {
    let m = 0; for (const x of chs) for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; }
    if (m > 0) for (const x of chs) for (let i = 0; i < x.length; i++) x[i] *= peak / m;
    return chs;
  }
  function tail(x, sr, ms) { const k = Math.min(x.length, Math.round((sr * ms) / 1000)); for (let i = 0; i < k; i++) x[x.length - 1 - i] *= i / k; return x; }
  // Make a texture loop: cross-fade its last `sec` into its head (equal power) and cut it there.
  function loop(x, sr, sec) {
    const F = Math.round(sr * sec), N = x.length - F;
    for (let i = 0; i < F; i++) { const a = Math.sqrt(i / F), b = Math.sqrt(1 - i / F); x[i] = x[i] * a + x[N + i] * b; }
    return x.subarray(0, N);
  }
  const sin = (u) => Math.sin(Math.PI * Math.max(0, Math.min(1, u)));
  const S = (sr, s) => Math.round(sr * s);

  // ── the sounds. Each takes (sr, r) and returns one channel, or [left, right].
  const GEN = {
    hover(sr, r) { // a card lifted a few millimetres
      const N = S(sr, 0.06), x = new Float32Array(N);
      add(x, crackle(N, sr, r, 0, 0.02, () => 900, () => 0.8, [0.05, 0.2], 2500, 9000), 0, 1);
      add(x, hiss(N, sr, r, 0, 0.04, sin, 2000, 8000), 0, 0.3);
      return norm([tail(x, sr, 10)], 0.04)[0];
    },
    pick(sr, r) { // flicked out of the hand, sliding off its neighbours
      const N = S(sr, 0.16), x = new Float32Array(N);
      add(x, slap(sr, r, 8000, 0.2), 0, 0.5);
      add(x, hiss(N, sr, r, 0.005, 0.1, (u) => Math.pow(1 - u, 1.5), 1200, 6000), 0, 0.35);
      add(x, crackle(N, sr, r, 0.005, 0.09, (u) => 350 * (1 - u), () => 0.6, [0.08, 0.3], 2000, 8000), 0, 0.8);
      return norm([tail(x, sr, 20)], 0.08)[0];
    },
    deal(sr, r) { // snapped off the deck, landing in the hand
      const N = S(sr, 0.14), x = new Float32Array(N);
      add(x, slap(sr, r, 9000, 0.1), 0, 0.6);
      add(x, hiss(N, sr, r, 0.004, 0.06, (u) => 1 - u, 1500, 7000), 0, 0.3);
      add(x, slap(sr, r, 3500, 1.4), S(sr, 0.07), 0.45);
      return norm([tail(x, sr, 15)], 0.08)[0];
    },
    land(sr, r) { // a card set down on the desk
      const N = S(sr, 0.16), x = new Float32Array(N);
      add(x, hiss(N, sr, r, 0, 0.03, (u) => u, 1000, 5000), 0, 0.3);
      add(x, slap(sr, r, 4000, 2.2), S(sr, 0.03), 1);
      add(x, crackle(N, sr, r, 0.03, 0.03, () => 400, () => 0.4, [0.08, 0.25], 2000, 7000), 0, 0.5);
      return norm([tail(x, sr, 20)], 0.17)[0];
    },
    shuffle(sr, r) { // riffled, bridged, squared on the desk
      const N = S(sr, 1.35), x = new Float32Array(N);
      for (let t = 0.02; t < 0.72; ) {
        const u = t / 0.72, rate = 26 + 52 * sin(u);
        add(x, flap(sr, r), S(sr, t), (0.35 + 0.4 * sin(u)) * (0.7 + 0.3 * r()));
        t += 1 / rate;
      }
      add(x, hiss(N, sr, r, 0.02, 0.7, sin, 1500, 6000), 0, 0.25);
      add(x, crackle(N, sr, r, 0.78, 0.22, (u) => 900 * (1 - u) + 200, (u) => 0.7 * (1 - u) + 0.2, [0.15, 0.5], 1200, 6000), 0, 0.9);
      add(x, knock(sr, r), S(sr, 1.06), 0.8); add(x, knock(sr, r), S(sr, 1.19), 0.6);
      return norm([tail(x, sr, 40)], 0.17)[0];
    },
    paper(sr, r) { // a newspaper slid over the others to the front
      const N = S(sr, 0.45), x = new Float32Array(N);
      const env = (u) => (u < 0.15 ? u / 0.15 : u > 0.7 ? Math.max(0, (1 - u) / 0.3) : 1);
      add(x, hiss(N, sr, r, 0.01, 0.3, env, 700, 5200), 0, 0.32);
      add(x, crackle(N, sr, r, 0, 0.32, (u) => 90 + 420 * env(u), (u) => 0.25 + 0.75 * env(u), [0.12, 0.5], 1400, 6500), 0, 1);
      add(x, air(sr, r, 0.22, 900), S(sr, 0.04), 0.22);
      add(x, slap(sr, r, 4500, 1.6), S(sr, 0.31), 0.5);
      add(x, crackle(N, sr, r, 0.31, 0.04, () => 300, () => 0.4, [0.1, 0.3], 1500, 6000), 0, 0.6);
      return norm([tail(x, sr, 30)], 0.12)[0];
    },
    letter(sr, r) { // a letter unfolded: two crisp folds
      const N = S(sr, 0.62), x = new Float32Array(N);
      for (const [t, g] of [[0, 1], [0.24, 0.8]]) {
        add(x, crackle(S(sr, 0.16), sr, r, 0, 0.12, (u) => 200 + 700 * sin(u), (u) => 0.3 + 0.7 * sin(u), [0.08, 0.35], 1800, 9000), S(sr, t), g);
        add(x, air(sr, r, 0.12, 1200), S(sr, t + 0.01), 0.25 * g);
        add(x, slap(sr, r, 7000, 0.8), S(sr, t + 0.12), 0.45 * g);
      }
      return norm([tail(x, sr, 30)], 0.15)[0];
    },
    month(sr, r) { // a calendar page turned
      const N = S(sr, 0.4), x = new Float32Array(N);
      add(x, crackle(S(sr, 0.06), sr, r, 0, 0.05, () => 500, (u) => 1 - u * 0.5, [0.08, 0.3], 1500, 8000), 0, 0.9);
      add(x, air(sr, r, 0.2, 1100), S(sr, 0.03), 0.35);
      add(x, hiss(S(sr, 0.2), sr, r, 0, 0.18, sin, 900, 5000), S(sr, 0.04), 0.25);
      add(x, slap(sr, r, 5500, 1.0), S(sr, 0.22), 0.6);
      return norm([tail(x, sr, 30)], 0.16)[0];
    },
    door(sr, r) { // two invitation cards laid on the desk
      const N = S(sr, 0.6), x = new Float32Array(N);
      for (const [t, g] of [[0, 1], [0.22, 0.85]]) {
        add(x, hiss(S(sr, 0.14), sr, r, 0, 0.12, (u) => sin(u * 0.9), 800, 5000), S(sr, t), 0.3 * g);
        add(x, slap(sr, r, 3800, 2.4), S(sr, t + 0.12), 0.9 * g);
      }
      return norm([tail(x, sr, 30)], 0.16)[0];
    },
    open(sr, r) { // a sheet drawn out
      const N = S(sr, 0.2), x = new Float32Array(N);
      add(x, hiss(N, sr, r, 0, 0.16, (u) => sin(u * 1.1), 900, 5500), 0, 0.6);
      add(x, crackle(N, sr, r, 0, 0.16, (u) => 250 * sin(u), () => 0.6, [0.08, 0.3], 1500, 7000), 0, 0.7);
      add(x, air(sr, r, 0.16, 900), 0, 0.25);
      return norm([tail(x, sr, 20)], 0.07)[0];
    },
    close(sr, r) { // and put back
      const N = S(sr, 0.2), x = new Float32Array(N);
      add(x, hiss(N, sr, r, 0, 0.11, (u) => 1 - u, 800, 5000), 0, 0.5);
      add(x, slap(sr, r, 3500, 1.2), S(sr, 0.1), 0.6);
      return norm([tail(x, sr, 20)], 0.07)[0];
    },
    clear(sr, r) { // a scandal torn in two
      const N = S(sr, 0.55), x = new Float32Array(N);
      const env = (u) => (0.6 + 0.4 * Math.sin(u * Math.PI * 5)) * Math.min(1, u * 8) * Math.max(0, 1 - Math.pow(u, 6));
      add(x, crackle(N, sr, r, 0.01, 0.42, (u) => 1600 * env(u) + 200, (u) => 0.4 + 0.6 * env(u), [0.06, 0.35], 1100, 8500), 0, 1);
      add(x, hiss(N, sr, r, 0.01, 0.42, env, 600, 3000), 0, 0.35);
      add(x, slap(sr, r, 5000, 0.6), S(sr, 0.44), 0.4);
      return norm([tail(x, sr, 30)], 0.14)[0];
    },
    pencil(sr, r) { // four pencil strokes in the notebook
      const N = S(sr, 0.6), x = new Float32Array(N);
      for (let k = 0; k < 4; k++) {
        const t = 0.02 + k * 0.12, d = 0.085 + 0.01 * (k % 2), M = S(sr, 0.12);
        add(x, crackle(M, sr, r, 0, d, (u) => 2200 * sin(u) + 300, (u) => 0.4 + 0.6 * sin(u), [0.04, 0.15], 2500, 9500), S(sr, t), 1);
        add(x, hiss(M, sr, r, 0, d, sin, 3000, 9000), S(sr, t), 0.4);
      }
      return norm([tail(x, sr, 20)], 0.06)[0];
    },
    print(sr, r) { // four strokes of the press, then the sheet feeds out
      const N = S(sr, 0.55), x = new Float32Array(N);
      for (let k = 0; k < 4; k++) {
        const at = S(sr, 0.01 + k * 0.078), M = S(sr, 0.05), c = new Float32Array(M), b = new Float32Array(M);
        for (let i = 0; i < M; i++) { c[i] = (r() * 2 - 1) * Math.exp(-i / (sr * 0.0008)); b[i] = (r() * 2 - 1) * Math.exp(-i / (sr * 0.006)); }
        band(c, sr, 1800, 9000); run(b, bq('bp', 700 + 60 * k, 1.2, sr)); band(b, sr, 0, 2500);
        add(x, c, at, 0.5); add(x, b, at, 1.2); add(x, knock(sr, r), at, 0.5);
      }
      add(x, hiss(S(sr, 0.2), sr, r, 0, 0.16, sin, 900, 5000), S(sr, 0.33), 0.25);
      return norm([tail(x, sr, 30)], 0.13)[0];
    },
    stamp(sr, r) { // a rubber stamp brought down hard on a wooden desk
      const N = S(sr, 0.35), x = new Float32Array(N);
      const M = S(sr, 0.12), thud = new Float32Array(M);
      for (let i = 0; i < M; i++) thud[i] = (r() * 2 - 1) * Math.exp(-i / (sr * 0.012));
      band(thud, sr, 35, 260);
      const e = new Float32Array(S(sr, 0.22)); for (let i = 0; i < S(sr, 0.005); i++) e[i] = (r() * 2 - 1) * Math.exp(-i / (sr * 0.001));
      const w1 = run(Float32Array.from(e), bq('bp', 165, 4.5, sr)), w2 = run(Float32Array.from(e), bq('bp', 390, 5, sr));
      add(x, thud, 0, 5.0); add(x, w1, 0, 7.0); add(x, w2, 0, 3.5); add(x, slap(sr, r, 2600, 1.5), 0, 0.9);
      return norm([tail(x, sr, 40)], 0.5)[0];
    },
    applause: (sr, r) => clapping(sr, r, 3.0, 4, false, 3.6, 0.45),     // the people near you
    applauseHouse: (sr, r) => clapping(sr, r, 3.0, 60, true, 3.4, 0.2), // the rest of the theatre
    ovation: (sr, r) => clapping(sr, r, 4.8, 6, false, 4.0, 0.45),
    ovationHouse: (sr, r) => clapping(sr, r, 4.8, 120, true, 4.0, 0.25),
    rain(sr, r) { return rainOnGlass(sr, r, RAIN); },
  };
  // People clapping in a theatre, modelled on recorded applause: a single clap is a 1–3 ms slap whose
  // energy sits between 500 Hz and 2.4 kHz, with a resonance set by the shape of the hands (cupped hands
  // ring low, flat hands high) and almost nothing above 4 kHz; each person claps at a steady 3.4–5 per
  // second. A few people near you are heard one by one; the rest of the house is a softer, darker crowd
  // (rendered separately so it can sit further back in the hall).
  function clapping(sr, r, T, people, far, rate0, peak) {
    const N = S(sr, T + 0.6), L = new Float32Array(N), R = new Float32Array(N);
    const M = S(sr, 0.03), y = new Float32Array(M), a1 = new Float32Array(M), a2 = new Float32Array(M), ck = new Float32Array(M);
    const ckHp = bq('hp', 1200, 0.707, sr), kc = Math.exp(-1 / (sr * 0.00012));
    for (let c = 0; c < people; c++) {
      const rate = far ? rate0 + r() * 1.6 : rate0 + 0.3 + r() * 0.3, f0 = 700 + r() * 1400, q = 1.4 + r() * 1.2, fb = 320 + r() * 280;
      const pan = (r() * 2 - 1) * (far ? 1 : 0.6), gain = far ? 0.25 + 0.35 * r() : 0.8 + 0.2 * r();
      const start = r() * 0.3 + (far ? 0.12 * r() : 0), stop = T * (0.68 + 0.32 * r());
      const res = bq('bp', f0, q, sr), body = bq('bp', fb, 1.2, sr), lp = bq('lp', far ? 2800 : 4600, 0.707, sr), hp = bq('hp', 220, 0.707, sr);
      const gl = Math.sqrt((1 - pan) / 2), gr = Math.sqrt((1 + pan) / 2);
      for (let t = start; t < stop; t += (1 / rate) * (1 + (r() - 0.5) * 0.08)) {
        const tc = sr * (0.0009 + r() * 0.0012);
        for (let i = 0, v = 1, k = Math.exp(-1 / tc); i < M; i++, v *= k) y[i] = (r() * 2 - 1) * v;
        a1.set(y); run(a1, res); a2.set(y); run(a2, body);
        // the instant the palms meet is a broadband click; the ring after it is the hands' resonance
        for (let i = 0, v = 1; i < M; i++, v *= kc) ck[i] = (r() * 2 - 1) * v;
        run(ck, ckHp); run(ck, ckHp);
        for (let i = 0; i < M; i++) y[i] = 1.6 * a1[i] + 0.45 * a2[i] + 0.35 * y[i];
        run(y, lp); run(y, hp);
        for (let i = 0; i < M; i++) y[i] += (far ? 0.25 : 0.75) * ck[i];
        const u = t / T, e = Math.min(1, u * 6) * (u > 0.7 ? 0.2 + 0.8 * Math.max(0, (1 - u) / 0.3) : 1);
        const a = gain * e * (0.8 + 0.4 * r()), at = S(sr, t);
        for (let i = 0; i < M && at + i < N; i++) { L[at + i] += a * gl * y[i]; R[at + i] += a * gr * y[i]; }
      }
    }
    tail(L, sr, 80); tail(R, sr, 80);
    return norm([L, R], peak);
  }
  // Rain on the dressing-room window, heard from inside — modelled on a recording of rain on a window.
  // The rain outside comes through the glass as a warm, muffled wash: most of its energy between 200 Hz
  // and 1.5 kHz, falling away above 2 kHz, and never quite steady, because it is thousands of drops a
  // second. On top of it, the drops that land on the pane: ticks of 1–3 ms, bright (2–8 kHz, some with a
  // brief glassy ring), a few dozen a second, nearly all faint and only a few sharp.
  function rainOnGlass(sr, r, P) {
    const T = P.T + P.xf, N = S(sr, T);
    // gusts: the wind throws the rain at the glass in fits — a slow and a quick wavering, the same in both ears
    const G = 64, gust = new Float32Array((N >> 6) + 2), gw = new Float32Array(gust.length);
    for (let j = 0, a = 0, b = 0, dt = G / sr; j < gust.length; j++) {
      a += (-a / P.gustSlow[0]) * dt + P.gustSlow[1] * Math.sqrt((2 * dt) / P.gustSlow[0]) * gauss(r);
      b += (-b / P.gustFast[0]) * dt + P.gustFast[1] * Math.sqrt((2 * dt) / P.gustFast[0]) * gauss(r);
      gust[j] = Math.exp(a + b); gw[j] = Math.exp((a + b) * P.washGust);
    }
    // the wash: noise whose level is set by a dense rain of tiny events (shot noise), then muffled by the glass
    const wash = (x) => {
      const k = Math.exp(-1 / (sr * P.washTau)), lam = P.washRate / sr;
      let e = 0, drift = 1, goal = 1, next = 0;
      for (let i = 0; i < N; i++) {
        if (i % 2048 === 0) goal = 1 + (r() - 0.5) * P.washDrift;
        drift += (goal - drift) * 0.0004;
        while (next <= i) { e += 0.3 + r(); next = i + 1 + Math.floor(-Math.log(1 - r()) / (lam * gw[i >> 6])); }
        e *= k; x[i] = drift * e * (r() * 2 - 1);
      }
      run(x, bq('hp', P.washLo, 0.707, sr)); run(x, bq('lp', P.washHi, P.washQ, sr));
      return x;
    };
    // the patter: faint drops all over the pane, too many to count — a fine grain of ticks, different in each ear
    const patter = (x) => {
      const k = Math.exp(-1 / (sr * P.patTau)), lam = P.patRate / sr;
      let e = 0, next = 0;
      for (let i = 0; i < N; i++) {
        while (next <= i) { e += Math.min(P.patCap, Math.pow(1 - r(), -1 / P.patTail)); next = i + 1 + Math.floor(-Math.log(1 - r()) / (lam * gust[i >> 6])); }
        e *= k; x[i] = e * (r() * 2 - 1);
      }
      run(x, bq('hp', P.patLo, 0.707, sr)); run(x, bq('lp', P.patHi, 0.707, sr));
      return x;
    };
    const out = [new Float32Array(N), new Float32Array(N)], tmp = new Float32Array(N);
    const mix = (x, gl, gr) => { const [l, rr] = out; for (let i = 0; i < N; i++) { l[i] += gl * x[i]; rr[i] += gr * x[i]; } };
    const mid = Math.sqrt((1 + P.washCorr) / 2), side = Math.sqrt((1 - P.washCorr) / 2); // the two ears hear much the same wash
    mix(wash(tmp), P.washGain * mid, P.washGain * mid); mix(wash(tmp), P.washGain * side, -P.washGain * side);
    mix(patter(tmp), P.patGain, 0); mix(patter(tmp), 0, P.patGain);
    // the drops on the pane, each placed somewhere on the glass (level and arrival time differ between ears)
    const hp = bq('hp', P.clickLo, 0.707, sr), lp = bq('lp', P.clickHi, 0.707, sr), body = bq('bp', 700, 0.8, sr);
    const M = S(sr, 0.03), y = new Float32Array(M), z = new Float32Array(M), [L0, R0] = out;
    const burst = (b, n, tau) => { for (let i = 0, v = 1, k = Math.exp(-1 / (sr * tau)); i < n; i++, v *= k) b[i] = (r() * 2 - 1) * v; };
    let t = 0, rate = P.rate, goal = P.rate;
    while ((t += -Math.log(1 - r()) / (rate * gust[Math.min(gust.length - 1, (t * sr) >> 6)])) < T) {
      if (r() < 0.02) goal = P.rate * (1 + (r() - 0.5) * P.rateDrift);
      rate += (goal - rate) * 0.05;
      const a = Math.min(P.cap, Math.pow(1 - r(), -1 / P.tail)) * P.dropGain, tau = P.tau[0] + r() * (P.tau[1] - P.tau[0]);
      const ring = a > P.ringFrom * P.dropGain && r() < P.ringOdds, big = a > P.bodyFrom * P.dropGain;
      const n = ring || big ? M : Math.min(M, Math.ceil(sr * tau * 7) + 48);
      burst(y, n, tau); run(y, hp, n); run(y, lp, n);
      if (ring) { // a brief glassy ring in the louder ones
        z.fill(0); burst(z, 64, 0.0003); run(z, bq('bp', P.ring[0] + r() * (P.ring[1] - P.ring[0]), P.ringQ, sr));
        for (let i = 0; i < M; i++) y[i] += P.ringGain * z[i];
      }
      if (big) { // the bigger drops knock the pane: a little low body under the tick
        burst(z, M, 0.0025); run(z, body);
        for (let i = 0; i < M; i++) y[i] += P.bodyGain * z[i];
      }
      const pan = r() * 2 - 1, gl = a * Math.sqrt((1 - pan) / 2), gr = a * Math.sqrt((1 + pan) / 2);
      const d = Math.round((r() - 0.5) * P.itd * sr), at = S(sr, t), il = at + Math.max(0, d), ir = at + Math.max(0, -d);
      for (let i = 0; i < n && il + i < N; i++) L0[il + i] += gl * y[i];
      for (let i = 0; i < n && ir + i < N; i++) R0[ir + i] += gr * y[i];
    }
    const res = out.map((x) => loop(x, sr, P.xf));
    let e = 0; for (const x of res) for (let i = 0; i < x.length; i++) e += x[i] * x[i];
    const g = P.level ? P.level / Math.sqrt(e / (2 * res[0].length)) : 1;
    for (const x of res) for (let i = 0; i < x.length; i++) x[i] *= g;
    return res;
  }
  // Settings, tuned until the render measured like the recording: the same balance across seven bands
  // (within about 1 dB), the same count of ticks standing 3, 6, 9 and 12 dB above the patter (about 55,
  // 19, 5 and 1.5 a second), the same flicker, and the same likeness between the two ears.
  const RAIN = {
    T: 12, xf: 0.5, level: 0.059,                     // a 12 s loop; level: RMS of the buffer (about −21 LUFS)
    washRate: 3000, washTau: 0.004, washDrift: 0.15, washLo: 110, washHi: 1200, washQ: 0.75, washCorr: 0.66, washGain: 0.03,
    patRate: 2500, patTau: 0.00025, patTail: 2.5, patCap: 4, patLo: 2800, patHi: 6500, patGain: 0.026,
    rate: 300, rateDrift: 0.4, tail: 2.0, cap: 10, dropGain: 0.05, tau: [0.00012, 0.0005], clickLo: 1800, clickHi: 7500,
    ringFrom: 3, ringOdds: 0.6, ring: [3500, 9000], ringQ: 40, ringGain: 0.6, bodyFrom: 5, bodyGain: 0.5, itd: 0.0016,
    gustSlow: [0.5, 0.2], gustFast: [0.05, 0.45], washGust: 0.15,
  };
  return { GEN, RAIN };
}

const OXSound = (() => {
  'use strict';
  let ctx = null, master = null, bus = {}, buf = {}, rev = null, hall = null, n = 0;
  const amb = {}, cache = {}, turn = {};
  const VARY = [1, 1.04, 0.97, 1.02, 0.985, 1.05, 0.96, 1.015, 0.99, 1.03];
  const vary = () => VARY[(n++) % VARY.length];

  const mulberry32 = oxMulberry32, hash = oxHash;
  const DSP = oxMakeDSP();

  function makeNoise(sr) {
    const r = mulberry32(1977), len = Math.floor(sr * 2.5);
    const white = new Float32Array(len), pink = new Float32Array(len), brown = new Float32Array(len);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = r() * 2 - 1;
      white[i] = w;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      pink[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      last = (last + 0.02 * w) / 1.02; brown[i] = last * 3.5;
    }
    const mk = (data) => { const b = ctx.createBuffer(1, data.length, sr); b.getChannelData(0).set(data); return b; };
    return { white: mk(white), pink: mk(pink), brown: mk(brown) };
  }
  // A small room for the stamp and the applause to ring in: stereo noise, decaying, darkened.
  function roomIR(sr) {
    const r = mulberry32(808), N = Math.round(sr * 1.6), b = ctx.createBuffer(2, N, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let lp = 0;
      for (let i = 0; i < N; i++) { const t = i / sr, v = (r() * 2 - 1) * Math.exp(-t / 0.22); lp += (v - lp) * 0.35; d[i] = t < 0.008 ? 0 : lp; }
    }
    return b;
  }

  // A theatre for the applause: early reflections off the walls, then a long tail that darkens as it dies.
  function hallIR(sr) {
    const r = mulberry32(1929), N = Math.round(sr * 3.2), b = ctx.createBuffer(2, N, sr);
    const early = [[0.019, 0.55, 0.3], [0.027, 0.3, 0.6], [0.041, 0.45, 0.4], [0.058, 0.35, 0.5], [0.083, 0.4, 0.3], [0.112, 0.3, 0.35]];
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let lp = 0;
      for (let i = 0; i < N; i++) {
        const t = i / sr, v = (r() * 2 - 1) * Math.exp(-t / 0.3) * Math.min(1, t / 0.03);
        const k = 0.5 * Math.exp(-t / 0.9) + 0.06; lp += (v - lp) * k; d[i] = t < 0.02 ? 0 : lp;
      }
      for (const [t, gL, gR] of early) { const i = Math.round(t * sr); d[i] += (c === 0 ? gL : gR) * (r() < 0.5 ? -1 : 1); }
    }
    return b;
  }

  function init(custom, opts) {
    if (ctx && !custom) { if (ctx.state === 'suspended' && ctx.resume) ctx.resume(); return ctx; }
    ctx = custom || new (window.AudioContext || window.webkitAudioContext)();
    for (const k of Object.keys(amb)) delete amb[k];
    for (const k of Object.keys(cache)) delete cache[k];
    gen++; prepared = false; // a render still on its way belongs to the old context
    master = ctx.createGain(); master.gain.value = 0.85;
    if (opts && opts.raw) master.connect(ctx.destination);
    else {
      // A soft clipper as the safety net: transparent below about −3 dBFS, rounding off stacked peaks above it.
      const N = 2048, curve = new Float32Array(N);
      for (let i = 0; i < N; i++) { const x = (i / (N - 1)) * 4 - 2, m = Math.abs(x); curve[i] = Math.sign(x) * (m < 0.7 ? m : 0.7 + 0.28 * Math.tanh((m - 0.7) / 0.28)); }
      const pre = ctx.createGain(), shaper = ctx.createWaveShaper();
      pre.gain.value = 0.5; shaper.curve = curve; shaper.oversample = '2x'; // the curve spans ±2, so the input is halved onto it
      master.connect(pre); pre.connect(shaper); shaper.connect(ctx.destination);
    }
    bus = {};
    for (const [k, v] of [['sfx', 1], ['amb', 0.7], ['music', 0.8]]) { const g = ctx.createGain(); g.gain.value = v; g.connect(master); bus[k] = g; }
    buf = makeNoise(ctx.sampleRate);
    rev = ctx.createConvolver(); rev.normalize = true; rev.buffer = roomIR(ctx.sampleRate); rev.connect(bus.sfx);
    hall = null; // the theatre is built when it is first needed, or once prepare() is done: it is the heaviest part of init
    return ctx;
  }
  function hallNode() {
    if (!hall) { hall = ctx.createConvolver(); hall.normalize = true; hall.buffer = hallIR(ctx.sampleRate); hall.connect(bus.sfx); }
    return hall;
  }

  // A sampled sound: three variants in turn, each rendered once and then played from the cache. A loop
  // (once = true) has just the one variant. The seed is the sound's name and its variant, nothing else.
  const seedOf = (name, v) => hash(name) + v * 977;
  function toBuffer(chs) {
    const b = ctx.createBuffer(chs.length, chs[0].length, ctx.sampleRate);
    chs.forEach((c, i) => b.getChannelData(i).set(c));
    return b;
  }
  function render(name, v) {
    const key = name + v;
    if (!cache[key]) { const out = DSP.GEN[name](ctx.sampleRate, mulberry32(seedOf(name, v))); cache[key] = toBuffer(Array.isArray(out) ? out : [out]); }
    return cache[key];
  }
  function sample(name, once) {
    return render(name, once ? 0 : (turn[name] = ((turn[name] || 0) + 1) % 3));
  }
  function playSample(name, t, wet, space) {
    const s = ctx.createBufferSource(); s.buffer = sample(name); s.connect(bus.sfx);
    if (wet) { const g = ctx.createGain(); g.gain.value = wet; s.connect(g); g.connect(space === 'hall' ? hallNode() : rev); }
    s.start(t);
  }

  // ── live building blocks ──────────────────────────────────────────────────────────────────────
  function env(t, a, d, peak) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0, t + a, d / 4);
    return g;
  }
  function route(node, o) {
    const dest = o.dest || bus.sfx;
    if (o.pan != null && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; node.connect(p); p.connect(dest); }
    else node.connect(dest);
  }
  function nz(t, o) {
    const s = ctx.createBufferSource(); s.buffer = buf[o.c || 'white']; s.loop = true;
    const a = o.a || 0.002, d = o.d || 0.1;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 2000, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + a + d);
    f.Q.value = o.q == null ? 1 : o.q;
    s.connect(f); let node = f;
    if (o.hp) { const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = o.hp; node.connect(h); node = h; }
    if (o.lp) { const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = o.lp; node.connect(l); node = l; }
    const g = env(t, a, d, o.p == null ? 0.3 : o.p); node.connect(g); route(g, o);
    s.start(t, ((n * 0.618034) % 1) * 2); s.stop(t + a + d * 1.6 + 0.05);
  }
  function tn(t, o) {
    const osc = ctx.createOscillator(); osc.type = o.w || 'sine';
    const a = o.a || 0.003, d = o.d || 0.1;
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.g || d));
    const g = env(t, a, d, o.p == null ? 0.2 : o.p); osc.connect(g); route(g, o);
    osc.start(t); osc.stop(t + a + d * 1.6 + 0.05);
  }
  function bell(t, o) {
    const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), d = o.d || 1;
    c.frequency.value = o.f; m.frequency.value = o.f * (o.r || 3.5);
    mg.gain.setValueAtTime(o.f * (o.i || 2), t); mg.gain.setTargetAtTime(0, t, d / 5);
    m.connect(mg); mg.connect(c.frequency);
    const g = env(t, 0.002, d, o.p || 0.1); c.connect(g); route(g, o);
    const end = t + d * 1.6 + 0.1; c.start(t); m.start(t); c.stop(end); m.stop(end);
  }
  function piano(t, o) {
    const B = 0.0004, d = o.d || 2, p = o.p || 0.15;
    for (let k = 1; k <= 9; k++) {
      const fk = o.f * k * Math.sqrt(1 + B * k * k);
      if (fk > 7000) break;
      tn(t, { f: fk, a: 0.004, d: d / Math.pow(k, 0.7), p: p / Math.pow(k, 1.1), dest: o.dest });
    }
    nz(t, { type: 'lowpass', f: Math.min(4000, o.f * 6), q: 0.7, d: 0.04, p: p * 0.4, dest: o.dest });
  }
  function shutter(t, p = 1) {
    nz(t, { f: 2600, q: 4, d: 0.012, p: 0.22 * p });
    nz(t + 0.016, { f: 1600, q: 3, d: 0.02, p: 0.16 * p });
    tn(t, { f: 200, f2: 110, d: 0.03, p: 0.06 * p });
  }

  // ── the sounds ────────────────────────────────────────────────────────────────────────────────
  const sampled = (name, wet, space) => (t) => playSample(name, t, wet, space);
  const SFX = {
    hover: sampled('hover'), pick: sampled('pick'), land: sampled('land'), deal: sampled('deal'), shuffle: sampled('shuffle'),
    paper: sampled('paper'), print: sampled('print'), pencil: sampled('pencil'),
    tick(t) { nz(t, { f: 4200, q: 7, d: 0.007, p: 0.12 }); tn(t, { f: 2100, d: 0.008, p: 0.025, w: 'square' }); },
    cash(t) {
      tn(t, { f: 95, f2: 60, d: 0.08, p: 0.2 }); nz(t, { type: 'lowpass', f: 900, q: 0.7, d: 0.07, p: 0.2 });
      bell(t + 0.05, { f: 2349, r: 3.01, i: 0.9, d: 0.6, p: 0.12 }); bell(t + 0.05, { f: 3136, r: 2.01, i: 0.6, d: 0.5, p: 0.075 });
    },
    spend(t) { nz(t, { f: 5200, f2: 2800, q: 3, a: 0.01, d: 0.15, p: 0.07 }); bell(t + 0.03, { f: 1760, r: 2.76, i: 1, d: 0.28, p: 0.09 }); bell(t + 0.11, { f: 1568, r: 2.76, i: 1, d: 0.24, p: 0.063 }); },
    heat(t) { shutter(t, 1.8); shutter(t + 0.11, 1.4); },
    line(t) { piano(t, { f: 55, d: 2.4, p: 0.14 }); piano(t, { f: 82.4, d: 2.0, p: 0.07 }); nz(t + 0.02, { type: 'highpass', f: 3000, q: 0.7, d: 0.06, p: 0.04 }); },
    scandal(t) {
      tn(t, { f: 92, f2: 44, d: 0.2, p: 0.3 }); nz(t, { type: 'lowpass', f: 1900, q: 0.6, d: 0.12, p: 0.23 });
      for (const f of [73.42, 77.78, 110, 155.56]) piano(t + 0.02, { f, d: 1.8, p: 0.075 });
    },
    clear: sampled('clear'),
    buzz(t) {
      for (let k = 0; k < 2; k++) {
        const tt = t + k * 0.3, o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = 168; lp.type = 'lowpass'; lp.frequency.value = 520;
        g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.11, tt + 0.012); g.gain.setValueAtTime(0.11, tt + 0.17); g.gain.linearRampToValueAtTime(0, tt + 0.2);
        o.connect(lp); lp.connect(g); g.connect(bus.sfx); o.start(tt); o.stop(tt + 0.22);
        nz(tt, { f: 900, q: 4, a: 0.01, d: 0.17, p: 0.025 });
      }
    },
    bubble(t) { const v = vary(); tn(t, { f: 900 * v, f2: 1350 * v, g: 0.04, a: 0.004, d: 0.06, p: 0.06 }); },
    send(t) { nz(t, { f: 700, f2: 3200, q: 0.8, a: 0.06, d: 0.22, p: 0.1 }); tn(t + 0.2, { f: 1318.5, a: 0.004, d: 0.18, p: 0.08 }); },
    letter: sampled('letter'),
    stamp: sampled('stamp', 0.18),
    button(t) { nz(t, { f: 3100, q: 2.2, d: 0.008, p: 0.08 }); tn(t, { f: 170, f2: 110, d: 0.03, p: 0.08 }); },
    open: sampled('open'), close: sampled('close'), door: sampled('door'),
    month: sampled('month'),
    season(t) { bell(t, { f: 1046.5, r: 3.5, i: 1.4, d: 1.6, p: 0.11 }); bell(t + 0.2, { f: 1568, r: 3.5, i: 1.2, d: 1.8, p: 0.08 }); },
    flash(t) {
      tn(t, { f: 2600, f2: 7600, g: 0.3, a: 0.06, d: 0.3, p: 0.015 });
      shutter(t + 0.32); nz(t + 0.32, { type: 'highpass', f: 2400, q: 0.7, d: 0.05, p: 0.2 }); tn(t + 0.32, { f: 120, f2: 60, d: 0.05, p: 0.1 });
    },
    applause(t) { playSample('applause', t, 0.25, 'hall'); playSample('applauseHouse', t, 0.8, 'hall'); },
    ovation(t) { playSample('ovation', t, 0.3, 'hall'); playSample('ovationHouse', t, 0.9, 'hall'); },
  };

  // ── ambience: loops that fade in and out ─────────────────────────────────────────────────────
  function ambStart(name) {
    if (amb[name]) return;
    const t = ctx.currentTime, out = ctx.createGain(), nodes = [];
    out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(1, t + 1.5); out.connect(bus.amb);
    const src = (c) => { const s = ctx.createBufferSource(); s.buffer = buf[c]; s.loop = true; s.start(t, ((n++) * 0.37) % 2); nodes.push(s); return s; };
    const filt = (type, f, q) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q == null ? 0.7 : q; return x; };
    const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const lfo = (rate, depth, param) => { const o = ctx.createOscillator(); o.frequency.value = rate; const d = gain(depth); o.connect(d); d.connect(param); o.start(t); nodes.push(o); };
    const chain = (...xs) => { for (let i = 0; i < xs.length - 1; i++) xs[i].connect(xs[i + 1]); return xs[xs.length - 1]; };
    if (name === 'room') {
      // the dressing room: a low room tone, the bulbs' mains hum, a street that swells now and then
      chain(src('brown'), filt('lowpass', 320), gain(0.07), out);
      for (const [f, a] of [[50, 0.004], [100, 0.0025], [150, 0.0012]]) { const o = ctx.createOscillator(); o.frequency.value = f; chain(o, gain(a), out); o.start(t); nodes.push(o); }
      const swell = gain(0.035); chain(src('pink'), filt('bandpass', 260, 0.6), swell, out); lfo(0.045, 0.035, swell.gain);
    } else if (name === 'rain') {
      const s = ctx.createBufferSource(); s.buffer = sample('rain', true); s.loop = true; chain(s, gain(0.16), out); s.start(t); nodes.push(s);
    } else if (name === 'wind') {
      const bp = filt('bandpass', 520, 0.9), level = gain(0.13);
      chain(src('pink'), bp, level, out); lfo(0.07, 260, bp.frequency); lfo(0.05, 0.085, level.gain);
    } else return;
    amb[name] = { out, nodes };
  }
  function ambStop(name) {
    const a = amb[name]; if (!a) return;
    const t = ctx.currentTime;
    a.out.gain.cancelScheduledValues(t); a.out.gain.setValueAtTime(a.out.gain.value, t); a.out.gain.linearRampToValueAtTime(0, t + 1.2);
    for (const x of a.nodes) { try { x.stop(t + 1.3); } catch (e) { /* already stopped */ } }
    delete amb[name];
  }

  // Render every sampled sound ahead of time, so that no sound waits on its first play (the rain loop takes
  // about 0.2 s to render, the full house of an ovation about 0.1 s). A worker does it off the main thread:
  // it runs the same generators from their own source with the same seeds, so its samples are the same. Where
  // the page allows no worker, or it fails, the rest are rendered in idle moments instead.
  let prepared = false, gen = 0;
  function renderWorker() {
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return null;
    try {
      const src = `'use strict';\nconst mulberry32 = ${oxMulberry32};\nconst DSP = (${oxMakeDSP})();\n` +
        'onmessage = (e) => { const j = e.data, out = DSP.GEN[j.name](j.sr, mulberry32(j.seed));' +
        ' const chs = (Array.isArray(out) ? out : [out]).map((c) => c.slice());' +
        ' postMessage({ key: j.key, gen: j.gen, sr: j.sr, chs }, chs.map((c) => c.buffer)); };';
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const w = new Worker(url);
      w.url = url;
      return w;
    } catch (e) {
      return null;
    }
  }
  function prepare() {
    init(); if (prepared) return; prepared = true;
    const jobs = [['rain', 0]];
    for (const k of Object.keys(DSP.GEN)) if (k !== 'rain') for (let v = 0; v < 3; v++) jobs.push([k, v]);
    const g = gen, sr = ctx.sampleRate;
    const idle = (f) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 50));
    const theatre = () => idle(() => { if (g === gen) hallNode(); });
    const inIdle = (list) => { const step = () => { if (g !== gen) return; const j = list.shift(); if (!j) { theatre(); return; } render(j[0], j[1]); idle(step); }; idle(step); };
    const w = renderWorker();
    if (!w) { inIdle(jobs); return; }
    let left = jobs.length, over = false;
    const end = (fallback) => {
      if (over) return; over = true;
      w.terminate(); URL.revokeObjectURL(w.url);
      if (fallback && g === gen) inIdle(jobs.filter(([name, v]) => !cache[name + v]));
      else theatre();
    };
    w.onmessage = (e) => {
      const d = e.data;
      if (d.gen === gen && ctx && ctx.sampleRate === d.sr && !cache[d.key]) cache[d.key] = toBuffer(d.chs);
      if (--left === 0) end(false);
    };
    w.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); end(true); };
    for (const [name, v] of jobs) w.postMessage({ key: name + v, gen: g, name, sr, seed: seedOf(name, v) });
  }

  return {
    init,
    prepare,
    names: Object.keys(SFX),
    ambienceNames: ['room', 'rain', 'wind'],
    play(name, when) { init(); const f = SFX[name]; if (!f) return; f(Math.max(ctx.currentTime + 0.005, when || 0)); },
    ambience(name, on) { init(); if (on) ambStart(name); else ambStop(name); },
    playing(name) { return !!amb[name]; },
    volume(which, v) { init(); const g = which === 'master' ? master : bus[which]; if (g) g.gain.value = v; },
    // The music bus, for the game's player: it connects its own sources here, each through its own gain for cross-fades.
    musicBus() { init(); return bus.music; },
    // While the page is hidden: true suspends the whole graph, false resumes it.
    suspend(on) { if (!ctx || !ctx.suspend) return; if (on) ctx.suspend(); else ctx.resume(); },
    tap() { init(); const an = ctx.createAnalyser(); an.fftSize = 1024; master.connect(an); return an; },
    get context() { return ctx; },
  };
})();
