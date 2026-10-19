// A played card never jumps behind the hand (round R7, A1; check:motion). For every hand the game deals — 1 card up to
// the recorded biggest (desk-states' bigHand) — every place of the played card in it and every slot of this month's
// pile, the card is played by a real click on the flight page (check/flight.html: the game's own desk, queue and
// motion) and its flight sampled frame by frame: the face's outline and every card left in the hand, as the browser
// draws them, and the layer the face is in.
//
// The author's choice (2026-10-19): the lift and the hold stay as they are; the card then rises out of the fan in front
// of it, and from the first frame it overlaps no card left in the hand it goes under the hand and the season's dim.
// Held: the layer changes on no frame where the face overlaps a card, and once under, the face is never in front of a
// card it overlaps again. Reported: the frames after the hold in which the face, rising out, is drawn in front of a card
// it overlaps. Chromium at 1280×720 only (844×390 is the same stage, scaled).

import assert from 'node:assert/strict';
import type { Page } from './browser.ts';
import { cardPoint, loadStates, openReady } from './desk-replay.ts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** The hand's layer (hand.css): a face above it is drawn in front of the cards. */
const HAND_Z = 35;
/** The end of the hold (ui/queue.ts CARD_TIMING.carry): the frames after it are measured. */
const HOLD = 290;
const SLOTS = 5;

/** A flight's frames: [ms into the flight, the face's layer, 1 if it overlaps a card left in the hand]. */
export type Frame = readonly [number, number, number];
export interface Flight {
  readonly n: number;
  readonly pile: number;
  readonly played: number;
  readonly frames: readonly Frame[];
}

/** Runs in the page: samples each frame from the click until the flying face is gone. */
const SAMPLER = `(() => {
  const corners = (el) => { const out = []; for (const [x, y] of [[0, 0], [el.offsetWidth, 0], [el.offsetWidth, el.offsetHeight], [0, el.offsetHeight]]) { const p = document.createElement('i'); p.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:0;height:0;pointer-events:none'; el.appendChild(p); out.push(p); } return out; };
  const overlap = (a, b) => {
    for (const poly of [a, b]) for (let i = 0; i < 4; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % 4], len = Math.hypot(y2 - y1, x1 - x2) || 1, nx = (y2 - y1) / len, ny = (x1 - x2) / len;
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const [x, y] of a) { const d = x * nx + y * ny; amin = Math.min(amin, d); amax = Math.max(amax, d); }
      for (const [x, y] of b) { const d = x * nx + y * ny; bmin = Math.min(bmin, d); bmax = Math.max(bmax, d); }
      if (amax <= bmin + 0.5 || bmax <= amin + 0.5) return false;
    }
    return true;
  };
  window.__fl = { frames: [], seen: false, done: false };
  const tick = () => {
    const face = document.querySelector('.motion-flight .plane .card');
    if (!face) { if (window.__fl.seen) { window.__fl.done = true; return; } requestAnimationFrame(tick); return; }
    window.__fl.seen = true;
    const motion = face.getAnimations()[0];
    const t = motion ? Number(motion.currentTime) : -1;
    const z = Number(getComputedStyle(document.querySelector('.motion-flight')).zIndex);
    const cards = [...document.querySelectorAll('.desk .hand .card')].filter((c) => getComputedStyle(c).visibility !== 'hidden');
    const probes = [face, ...cards].map(corners);
    const quads = probes.map((ps) => ps.map((p) => { const r = p.getBoundingClientRect(); return [r.left, r.top]; }));
    for (const p of probes.flat()) p.remove();
    window.__fl.frames.push([Math.round(t), z, quads.slice(1).some((q) => overlap(quads[0], q)) ? 1 : 0]);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})()`;

/** Every flight from every hand of 1 up to bigHand's size, every place in it and every pile slot, measured. */
export async function measureFlights(page: Page, url: string): Promise<Flight[]> {
  const biggest = loadStates().bigHand?.hand.length ?? 8;
  await openReady(page, `${url}check/flight.html`, `!!window.__flight && !!document.querySelector('.desk .hand .card')`);
  const flights: Flight[] = [];
  for (let n = 1; n <= biggest; n++)
    for (let pile = 0; pile < SLOTS; pile++)
      for (let played = 0; played < n; played++) {
        assert.equal(await page.evaluate<number>(`window.__flight.setup(${n}, ${pile})`), n, `flight page: a hand of ${n} not built`);
        await page.evaluate(`document.documentElement.dataset.motion='full'`);
        await page.move(10, 100);
        await page.evaluate(SAMPLER);
        await page.click(...(await cardPoint(page, played))!);
        const start = Date.now();
        while (!(await page.evaluate<boolean>('window.__fl.done'))) {
          assert.ok(Date.now() - start < 4000, `flight ${n}/${played}/${pile}: the face never landed`);
          await sleep(40);
        }
        flights.push({ n, pile, played, frames: await page.evaluate<Frame[]>('window.__fl.frames') });
      }
  return flights;
}

/** A flight's account: the frames rising out in front, whether it went under, and the frames that break the rule. */
export function judge(f: Flight): { readonly rising: number; readonly under: number | null; readonly jump: boolean; readonly frontAfter: number; readonly landedInFront: boolean } {
  // Rising out: the time after the hold the face is drawn in front of a card it overlaps, frame to frame (ms).
  let rising = 0;
  f.frames.forEach(([t, z, o], i) => {
    const next = f.frames[i + 1]?.[0];
    if (t > HOLD && z > HAND_Z && o === 1 && next !== undefined) rising += next - t;
  });
  const first = f.frames.findIndex(([, z]) => z <= HAND_Z);
  const last = f.frames.at(-1);
  return {
    rising,
    under: first >= 0 ? f.frames[first]![0] : null,
    jump: first >= 0 && f.frames[first]![2] === 1,
    frontAfter: first >= 0 ? f.frames.slice(first).filter(([, z, o]) => z > HAND_Z && o === 1).length : 0,
    landedInFront: !!last && last[1] > HAND_Z && last[2] === 1,
  };
}

export async function checkFlights(page: Page, url: string): Promise<void> {
  const width = await page.evaluate<number>('innerWidth');
  if (page.name !== 'chrome' || width !== 1280) {
    console.log(`SKIP flights ${page.name} ${width}: measured in Chromium at 1280x720 (the same stage at every size)`);
    return;
  }
  const flights = await measureFlights(page, url);
  let rising = 0, risingFlights = 0, maxRising = 0, latest = 0;
  for (const f of flights) {
    const j = judge(f);
    const name = `a hand of ${f.n}, card ${f.played + 1}, pile slot ${f.pile + 1}`;
    assert.ok(j.under !== null, `${name}: the face never went under the hand`);
    assert.equal(j.jump, false, `${name}: the face went under on a frame it overlapped a card`);
    assert.equal(j.frontAfter, 0, `${name}: under, then in front of a card it overlaps`);
    rising += j.rising;
    if (j.rising) risingFlights++;
    maxRising = Math.max(maxRising, j.rising);
    latest = Math.max(latest, j.under ?? 0);
  }
  console.log(
    `flights chrome: ${flights.length} played (hands of 1-${Math.max(...flights.map((f) => f.n))}, every place, ${SLOTS} pile slots) — each under the hand from a frame it overlaps no card, the latest at ${latest} ms, never in front again; rising out in front after the hold: ${risingFlights} flights, ${Math.round(rising / Math.max(1, risingFlights))} ms on average, at most ${maxRising} ms`,
  );
}
