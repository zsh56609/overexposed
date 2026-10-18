// Sound and music (round R4, Part B). The effects and the ambience are the author's module (./oxsound.js): every
// effect synthesized in code from a fixed seed, nothing recorded. The music is six tracks by Holizna (CC0 1.0), one at
// a time, through two <audio> elements, each with its own gain into the module's music bus. Nothing sounds before the
// first BEGIN click — browsers allow audio only after a gesture — and a play the browser refuses leaves the game
// silent, never an error. With `?cues` in the URL every cue is logged on window.__cues for the checks (B7); with
// `?mute` the sound never starts: the checks that replay a run reach the desk before the module's render worker has
// delivered its samples (see startSound).

import { OXSound, type OXAmbience } from './oxsound.js';
import { settings, subscribeSettings } from '../settings.ts';

/** The sounds the game asks for: the module's names (B2's table). */
export type Cue =
  | 'hover' | 'pick' | 'land' | 'paper' | 'print' | 'pencil' | 'tick' | 'cash' | 'spend' | 'heat' | 'line' | 'button' | 'stamp'
  | 'scandal' | 'clear' | 'deal' | 'shuffle' | 'month' | 'season' | 'door' | 'buzz' | 'bubble' | 'send' | 'letter'
  | 'open' | 'close' | 'flash' | 'ovation' | 'applause';

export type Track = 'spring' | 'summer' | 'autumn' | 'winter' | 'scandal' | 'awards';

/**
 * The music's level (B4): a track at this gain comes out about -32 LUFS, a little under a busy month of effects with
 * the room (-30 LUFS). One number; the author tunes it by ear.
 */
export const MUSIC_GAIN = 0.25;

/** The weather the Flash's ear names, under the room (B3): spring's showers rain, autumn's wind and winter's snow wind. */
export const WEATHER: Readonly<Record<string, OXAmbience | null>> = { spring: 'rain', summer: null, autumn: 'wind', winter: 'wind' };

declare global {
  interface Window {
    /** The cue log (B7): only with `?cues` in the URL. */
    __cues?: { readonly name: Cue; readonly at: number; readonly beat?: string }[];
    /** The music's moves, beside it: the track the game goes to (null: silence) and its fade. */
    __music?: { readonly track: Track | null; readonly ms: number; readonly at: number }[];
  }
}
const LOG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('cues');
const MUTE = typeof location !== 'undefined' && new URLSearchParams(location.search).has('mute');
if (LOG) {
  window.__cues = [];
  window.__music = [];
}

let ctx: BaseAudioContext | null = null;
const live = (): boolean => ctx !== null;

// ---------------------------------------------------------------------------------------------------- the effects

/** A sound, now. `beat` names the queue beat it belongs to (step:index), for the cue log. */
export function cue(name: Cue, beat?: string): void {
  if (LOG) window.__cues?.push(beat ? { name, at: Math.round(performance.now()), beat } : { name, at: Math.round(performance.now()) });
  if (!live() || !settings().soundEffects) return;
  try {
    OXSound.play(name);
  } catch {
    // silent
  }
}

let lastTick = -Infinity;
/** A number rolling in the stat bar: a tick per step it shows, at most every 50 ms. */
export function tick(): void {
  const now = performance.now();
  if (now - lastTick < 50) return;
  lastTick = now;
  cue('tick');
}

let lastHover = -Infinity;
/** A hand card under the mouse: once per card entered, at most every 60 ms. */
export function hover(): void {
  const now = performance.now();
  if (now - lastHover < 60) return;
  lastHover = now;
  cue('hover');
}

/** Cues in a row: the offers rising (three, 70 ms apart), the plaques (0.3 s apart). Returns how to stop the rest. */
export function cues(name: Cue, count: number, gap: number): () => void {
  const timers: number[] = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) cue(name);
    else timers.push(window.setTimeout(() => cue(name), i * gap));
  }
  return () => timers.forEach((t) => window.clearTimeout(t));
}

// ---------------------------------------------------------------------------------------------------- the room

let room = false;
let weather: OXAmbience | null = null;

/** The room whenever the desk is on stage, under its overlays too, with the season's weather; none elsewhere. */
export function ambience(season: string | null): void {
  if (!live()) return; // the desk comes up only after BEGIN, the gesture
  const wantRoom = season !== null;
  const wantWeather = season === null ? null : (WEATHER[season] ?? null);
  try {
    if (wantRoom !== room) OXSound.ambience('room', wantRoom);
    if (wantWeather !== weather) {
      if (weather) OXSound.ambience(weather, false);
      if (wantWeather) OXSound.ambience(wantWeather, true);
    }
  } catch {
    // silent
  }
  room = wantRoom;
  weather = wantWeather;
}

// ---------------------------------------------------------------------------------------------------- the music

interface Player {
  readonly el: HTMLAudioElement;
  readonly gain: GainNode;
  track: Track | null;
}
let players: Player[] = [];
let on: Player | null = null;
/** The track the game is on (null: none), whether or not Music is switched on. */
let current: Track | null = null;
const warmed = new Set<Track>();
const failed = new Set<Track>();
const url = (track: Track): string => `./audio/music/${track}.mp3`;
/** An empty sound, for unlocking a player (`unlock`): no request, nothing heard. */
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

/** The player not in use: the one fading out (`not`) keeps fading. */
function player(not: Player | null): Player | null {
  if (!ctx) return null;
  if (players.length === 0) {
    try {
      const bus = OXSound.musicBus();
      players = [0, 1].map(() => {
        const el = new Audio();
        el.preload = 'none';
        el.loop = true; // a track that ends starts again
        const gain = ctx!.createGain();
        gain.gain.value = 0;
        (ctx as AudioContext).createMediaElementSource(el).connect(gain);
        gain.connect(bus);
        const p: Player = { el, gain, track: null };
        el.addEventListener('error', () => {
          // A track that fails to load is skipped, with one console warning.
          if (p.track && !failed.has(p.track)) {
            failed.add(p.track);
            console.warn(`music: ${url(p.track)} could not be loaded; playing on without it`);
          }
        });
        return p;
      });
    } catch {
      return null;
    }
  }
  return players.find((p) => p !== not) ?? players[0] ?? null;
}

function ramp(p: Player, to: number, ms: number): void {
  if (!ctx) return;
  const g = p.gain.gain;
  const t = ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(to, t + Math.max(0.01, ms / 1000));
}

function fadeOut(p: Player, ms: number): void {
  ramp(p, 0, ms);
  const el = p.el;
  window.setTimeout(() => {
    if (on !== p) el.pause();
  }, ms + 60);
}

function start(track: Track, ms: number, not: Player | null): void {
  const p = player(not);
  if (!p) return;
  if (failed.has(track)) return;
  if (p.track !== track) {
    p.track = track;
    p.el.src = url(track);
    warmed.add(track);
  }
  try {
    p.el.currentTime = 0;
  } catch {
    // not seekable yet
  }
  p.gain.gain.value = 0;
  on = p;
  void p.el.play().then(
    () => ramp(p, MUSIC_GAIN, ms),
    () => {
      // refused (autoplay rules, a check's synthetic click): the game plays on silent
    },
  );
}

/** The game moves to a track (null: silence), cross-fading over `ms`; with Music off it only remembers it. */
export function music(track: Track | null, ms: number): void {
  if (track === current) return;
  current = track;
  if (LOG) window.__music?.push({ track, ms, at: Math.round(performance.now()) });
  if (!live() || !settings().music) return;
  const old = on;
  if (old) fadeOut(old, ms);
  on = null;
  if (track) start(track, ms, old);
}

/** A track soon needed loads ahead, never blocking a frame: the next season's in a season's last month, the scandal
 * track once a scandal is held, the awards track in winter. */
export function warm(track: Track): void {
  if (warmed.has(track) || failed.has(track) || !live()) return;
  warmed.add(track);
  void fetch(url(track))
    .then((r) => (r.ok ? r.blob() : null))
    .catch(() => null);
}

// ---------------------------------------------------------------------------------------------------- the lifecycle

function apply(): void {
  if (!live()) return;
  const s = settings();
  try {
    OXSound.volume('sfx', s.soundEffects ? 1 : 0);
    OXSound.volume('amb', s.soundEffects ? 0.7 : 0);
  } catch {
    // silent
  }
  if (!s.music && on) {
    fadeOut(on, 400);
    on = null;
  } else if (s.music && !on && current) start(current, 1500, null); // back in with the track the game is on
}

function visibility(): void {
  if (!live()) return;
  const hidden = document.visibilityState === 'hidden';
  try {
    OXSound.suspend(hidden);
  } catch {
    // silent
  }
  if (hidden) players.forEach((p) => p.el.pause());
  else if (on && settings().music) void on.el.play().catch(() => {});
}

/**
 * Safari lets a media element play without a click only once it has played from one, so both players play the empty
 * sound from BEGIN's click: the second's first track comes at a season change, with no click to start it.
 */
function unlock(): void {
  player(null);
  for (const p of players) {
    if (p.track) continue;
    p.el.src = SILENT;
    void p.el.play().then(
      () => p.el.pause(),
      () => {},
    );
  }
}

/**
 * The first BEGIN click (B1): the audio graph, from the gesture. Later calls do nothing. With `?mute` it never starts:
 * a replay reaches the desk within milliseconds of BEGIN, before the module's render worker has delivered the samples
 * (5–6 s), so its first sounds would render on the main thread — on module v6 the rain loop at Continue is a 300–380 ms
 * task — and the checks that replay measure motion and timing. The cues are still logged.
 */
export function startSound(): void {
  if (live() || MUTE) return;
  try {
    ctx = OXSound.init();
  } catch {
    ctx = null;
    return;
  }
  apply();
  subscribeSettings(apply);
  document.addEventListener('visibilitychange', visibility);
  unlock();
}

/**
 * Once the opening card has settled, never during BEGIN's flash: the sampled sounds, rendered ahead of first play — in
 * the module's worker (5–6 s, while the opening card is read and a manager chosen), else in idle moments.
 */
export function prepareSound(): void {
  if (!live()) return;
  try {
    OXSound.prepare();
  } catch {
    // silent
  }
}
