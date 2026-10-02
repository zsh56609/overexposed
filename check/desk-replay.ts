// Replaying recorded desk states through the real UI (round V1a). The state finder (tools/desk-states.ts)
// records, for each named state, a seed and the steps that reach it — [kind, index] per action — in
// check/desk-states.json; the overflow audit, the screenshots, the reference comparison and the interaction
// check replay them here, clicking the same controls a player would.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from './browser.ts';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const STATES_FILE = join(ROOT, 'check', 'desk-states.json');

export type StepKind = 'manager' | 'draft' | 'extra' | 'reroll' | 'gate' | 'play' | 'end';
export type Step = readonly [StepKind, number];

export interface DeskState {
  readonly seed: number;
  readonly persona: string;
  readonly manager: string;
  readonly steps: readonly Step[];
  /** What the state is: month, lane, fame tier, season, frenzy, hand size. */
  readonly note: string;
  /** The cards in hand when it is reached. */
  readonly hand: readonly string[];
}

/** The recorded states, by name. Run `npm run desk:states` to find them again after content changes. */
export function loadStates(): Record<string, DeskState> {
  return JSON.parse(readFileSync(STATES_FILE, 'utf8')) as Record<string, DeskState>;
}

/** Runs in the page: clicks through the steps from the title; 'ok', or where it broke. */
export const PLAY_STEPS = (steps: readonly Step[]) => `(async (steps) => {
  document.documentElement.dataset.motion = 'off';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('button.big')?.click();
  await sleep(40);
  for (const [kind, i] of steps) {
    const cards = [...document.querySelectorAll('.desk .hand .card')];
    const el = kind === 'manager' ? document.querySelectorAll('.manager-choice .choose')[i]
      : kind === 'draft' ? document.querySelectorAll('.draft .take')[i]
      : kind === 'gate' ? document.querySelectorAll('.gates .take')[i]
      : kind === 'extra' || kind === 'reroll' ? document.querySelectorAll('.draft > .row > button')[i]
      : kind === 'end' ? document.querySelector('.desk .endbtn')
      : cards[i];
    if (!el) return 'broke at ' + kind + ' ' + i;
    el.click();
    await sleep(10);
  }
  return 'ok';
})(${JSON.stringify(steps)})`;

/** Loads the game on the state's seed and replays its steps; the page settles before it returns. */
export async function reach(page: Page, url: string, state: DeskState, settle = 700): Promise<string> {
  await page.navigate(`${url}?seed=${state.seed}`, 2500);
  const r = await page.evaluate<string>(PLAY_STEPS(state.steps));
  await page.move(640, 300);
  await new Promise((res) => setTimeout(res, settle));
  return r;
}

/** The centre of the first element matching `selector`, or null. */
export const centre = (page: Page, selector: string, index = 0) =>
  page.evaluate<[number, number] | null>(
    `(() => { const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}]; if (!el) return null; const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`,
  );

/** A point on a fanned card, in its own tilted frame (a probe it carries): its visible strip, by default. */
export const cardPoint = (page: Page, index: number, x = 40, y = 120) =>
  page.evaluate<[number, number] | null>(
    `(() => { const c = document.querySelectorAll('.desk .hand .card')[${index}]; if (!c) return null; const p = document.createElement('i'); p.style.cssText = 'position:absolute;left:${x}px;top:${y}px;width:1px;height:1px;pointer-events:none'; c.appendChild(p); const r = p.getBoundingClientRect(); p.remove(); return [r.x, r.y]; })()`,
  );

/**
 * A state's finishing touch before a screenshot: `tip=<cell>` hovers a stat cell (hype, craft, heat, next, money,
 * actions, when); `paper=<id>` pulls a paper forward by its masthead; `hover=<n>` hovers card n; `bubble` opens the
 * last bubble's reaction row; `tapback` puts a heart on the first bubble and opens the row on the last.
 */
export async function post(page: Page, spec: string | undefined): Promise<void> {
  if (!spec) return;
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  if (spec.startsWith('tip=')) {
    const at = await centre(page, `.desk [data-tip="${spec.slice(4)}"]`);
    if (at) await page.move(...at);
    await wait(500);
  } else if (spec.startsWith('paper=')) {
    const at = await page.evaluate<[number, number] | null>(
      `(() => { const el = document.querySelector('.desk [data-paper="${spec.slice(6)}"]'); if (!el) return null; const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + 12]; })()`,
    );
    if (at) await page.click(...at);
    await page.move(640, 300);
    await wait(900);
  } else if (spec.startsWith('hover=')) {
    const at = await cardPoint(page, Number(spec.slice(6)));
    if (at) await page.move(...at);
    await wait(700);
  } else if (spec === 'bubble' || spec === 'tapback') {
    const n = await page.evaluate<number>(`document.querySelectorAll('.desk .bub:not(.who)').length`);
    if (n === 0) return;
    if (spec === 'tapback') {
      const first = await centre(page, '.desk .bub:not(.who)', 0);
      if (first) await page.click(...first);
      await wait(250);
      const heart = await centre(page, '.desk .rx-bar button', 0);
      if (heart) await page.click(...heart);
      await wait(250);
    }
    const last = await centre(page, '.desk .bub:not(.who)', n - 1);
    if (last) await page.click(...last);
    await page.move(640, 300);
    await wait(400);
  }
}
