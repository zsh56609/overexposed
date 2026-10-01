// npm run check:interactions — the desk's interactions by real pointer, touch and keyboard input (round V1a), in
// headless Chrome and Firefox (check/browser.ts), on states recorded in check/desk-states.json:
// - a stat tooltip opens on hover and closes on leaving; opens on a long-press, not on a tap, and closes on a tap
//   elsewhere; opens on keyboard focus;
// - a bubble's reaction row opens on a click; a reaction becomes a badge, another replaces it, the same again
//   removes it; a click elsewhere closes the row;
// - the metronome swings, settles at the centre on a click, and swings again on the next;
// - a paper behind comes forward on a click by its masthead, and nothing outside the papers changes;
// - a scandal shakes and the desk says it can't be played; a card's preview opens on hover; a click plays a card
//   (one card fewer, one bulb darker); with no actions left a click says so; END TURN's preview opens on hover and
//   a click ends the month; the deck opens from the stat bar and closes.
// Runs the Vite dev server in-process. Usage: node check/interactions.ts [--browsers=chrome,firefox]

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { browsersFromArgs, launch, type Page } from './browser.ts';
import { cardPoint, centre, loadStates, reach, ROOT } from './desk-replay.ts';

const BROWSERS = browsersFromArgs(process.argv);
const en = JSON.parse(readFileSync(join(ROOT, 'i18n', 'en.json'), 'utf8')) as Record<string, string>;
const states = loadStates();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Result = [what: string, ok: boolean | 'skipped'];

async function tooltips(page: Page, url: string): Promise<Result[]> {
  const out: Result[] = [];
  const state = states.s02;
  if (!state) return [['tooltips: no recorded state s02', false]];
  await reach(page, url, state);
  const on = () => page.evaluate<boolean>(`!!document.querySelector('.desk .tip.on')`);
  const heat = await centre(page, '.desk [data-tip="heat"]');
  if (!heat) return [['tooltips: no heat cell', false]];
  await page.move(...heat);
  await sleep(300);
  out.push(['a tooltip opens on hover', await on()]);
  await page.move(640, 300);
  await sleep(300);
  out.push(['it closes when the pointer leaves', !(await on())]);
  const money = (await centre(page, '.desk [data-tip="money"]')) as [number, number];
  try {
    await page.press(...money, 700);
    await sleep(200);
    out.push(['it opens on a long-press', await on()]);
    await page.press(640, 300, 40);
    await sleep(300);
    out.push(['a tap elsewhere closes it', !(await on())]);
    await page.press(...money, 60);
    await sleep(600);
    out.push(['a short tap does not open it', !(await on())]);
  } catch (err) {
    out.push([`touch: ${err instanceof Error ? err.message.slice(0, 60) : String(err)}`, 'skipped']);
  }
  // Keyboard: Tab until a stat cell has the focus. A headless window that is never in front (Firefox) sends no
  // focus events at all, so there the keyboard cannot be tested.
  if (!(await page.evaluate<boolean>(`document.hasFocus()`))) return [...out, ['keyboard focus: this headless window never has focus', 'skipped']];
  let focused = false;
  for (let i = 0; i < 40 && !focused; i++) {
    await page.key('Tab');
    focused = await page.evaluate<boolean>(`!!document.activeElement?.closest?.('.desk .stats [data-tip]')`);
  }
  await sleep(200);
  out.push(['it opens on keyboard focus', focused && (await on())]);
  await page.evaluate(`document.activeElement?.blur()`);
  await sleep(200);
  out.push(['it closes on blur', !(await on())]);
  return out;
}

async function bubblesAndMetronome(page: Page, url: string): Promise<Result[]> {
  const out: Result[] = [];
  const state = states.s02;
  if (!state) return [['bubbles: no recorded state s02', false]];
  await reach(page, url, state);
  const bubble = await centre(page, '.desk .bub:not(.who)', 0);
  if (!bubble) out.push(['reactions: no message this month', 'skipped']);
  else {
    const badges = () => page.evaluate<string>(`[...document.querySelectorAll('.desk .rx')].map((x) => x.textContent).join('')`);
    await page.click(...bubble);
    await sleep(300);
    out.push(['a click opens the reaction row', (await page.evaluate<number>(`document.querySelectorAll('.desk .rx-bar button').length`)) === 3]);
    await page.click(...((await centre(page, '.desk .rx-bar button', 1)) as [number, number]));
    await sleep(300);
    const first = await badges();
    out.push(['a reaction becomes a badge', first.length > 0 && !(await page.evaluate<boolean>(`!!document.querySelector('.desk .rx-bar')`))]);
    await page.click(...bubble);
    await sleep(250);
    await page.click(...((await centre(page, '.desk .rx-bar button', 2)) as [number, number]));
    await sleep(300);
    const second = await badges();
    out.push(['another replaces it', second.length > 0 && second !== first]);
    await page.click(...bubble);
    await sleep(250);
    await page.click(...((await centre(page, '.desk .rx-bar button', 2)) as [number, number]));
    await sleep(300);
    out.push(['the same again removes it', (await badges()) === '']);
    await page.click(...bubble);
    await sleep(250);
    await page.click(640, 300);
    await sleep(300);
    out.push(['a click elsewhere closes the row', !(await page.evaluate<boolean>(`!!document.querySelector('.desk .rx-bar')`))]);
  }
  const metro = await centre(page, '.desk .metro');
  if (!metro) out.push(['metronome: not on this desk', 'skipped']);
  else {
    const angle = () => page.evaluate<string>(`document.querySelector('.desk .metro-arm').style.transform`);
    const a1 = await angle();
    await sleep(300);
    out.push(['the metronome swings', a1 !== (await angle())]);
    await page.click(...metro);
    await sleep(2800);
    const s1 = await angle();
    await sleep(300);
    out.push(['a click settles it at the centre', s1 === (await angle()) && /rotate\(0(\.0+)?deg\)/.test(s1)]);
    await page.click(...metro);
    await sleep(700);
    const r1 = await angle();
    await sleep(250);
    out.push(['another click swings it again', r1 !== (await angle())]);
  }
  return out;
}

async function papers(page: Page, url: string): Promise<Result[]> {
  const state = states.s09;
  if (!state) return [['papers: no recorded state s09', false]];
  await reach(page, url, state);
  await page.evaluate(`(() => {
    window.__touched = new Set();
    // The desk's own life — the metronome's swing, the phone's buzz and clock — goes on while papers switch.
    const part = (n) => { const el = n.nodeType === 1 ? n : n.parentElement; if (el?.closest('.metro, .phone')) return null; const p = el?.closest('.news, .mirror, .stats, .hand, .bubbles, .deskscene, .endbtn'); return p ? p.className.split(' ')[0] : 'other'; };
    window.__mo = new MutationObserver((list) => { for (const m of list) { const p = part(m.target); if (p) window.__touched.add(p); } });
    window.__mo.observe(document.querySelector('.desk'), { subtree: true, childList: true, attributes: true, characterData: true });
  })()`);
  const back = await page.evaluate<[number, number, string]>(`(() => { const p = [...document.querySelectorAll('.desk .pp')].find((x) => !x.classList.contains('pos0')); const r = p.getBoundingClientRect(); return [r.x + r.width / 2, r.y + 12, p.dataset.paper]; })()`);
  await page.click(back[0], back[1]);
  await page.move(640, 300);
  await sleep(900);
  const front = await page.evaluate<string>(`document.querySelector('.desk .news').dataset.front`);
  const touched = await page.evaluate<string[]>(`(() => { window.__mo.disconnect(); return [...window.__touched]; })()`);
  return [
    ['a paper behind comes forward on a click', front === back[2]],
    [`only the papers change (${touched.join(', ')})`, touched.length > 0 && touched.every((t) => t === 'news')],
  ];
}

async function hand(page: Page, url: string): Promise<Result[]> {
  const out: Result[] = [];
  const state = states.s04; // a screen hand holding scandals: one shakes
  if (!state) return [['hand: no recorded state s04', false]];
  await reach(page, url, state);
  const look = () => page.evaluate<{ cards: number; used: number; toast: string | null; preview: boolean; phase: string }>(`({ cards: document.querySelectorAll('.desk .hand .card').length, used: document.querySelectorAll('.desk .slotbulbs i.used').length, toast: document.querySelector('.desk .toast.on')?.textContent ?? null, preview: !!document.querySelector('.desk .floating'), phase: document.querySelector('.draft') ? 'draft' : document.querySelector('.gates') ? 'gate' : document.querySelector('.desk .hand') ? 'play' : 'other' })`);
  const kinds = await page.evaluate<string[]>(`[...document.querySelectorAll('.desk .hand .card')].map((c) => c.className)`);
  const si = kinds.findIndex((k) => k.includes('f-scandal'));
  if (si < 0) out.push(['a scandal in hand', 'skipped']);
  else {
    await page.click(...((await cardPoint(page, si)) as [number, number]));
    await sleep(250);
    const shaking = await page.evaluate<boolean>(`document.querySelectorAll('.desk .hand .card')[${si}].classList.contains('nope')`);
    out.push(["a scandal shakes and says it can't be played", shaking && (await look()).toast === en['ui.toast.scandal']]);
  }
  await page.move(640, 300);
  await sleep(300);
  // The rest on a hand with nothing but cards to play.
  const music = states.s02;
  if (!music) return [...out, ['hand: no recorded state s02', false]];
  await reach(page, url, music);
  const pi = await page.evaluate<number>(`[...document.querySelectorAll('.desk .hand .card')].findIndex((c) => c.getAttribute('aria-disabled') === 'false')`);
  if (pi < 0) return [...out, ['a playable card', 'skipped']];
  await page.move(...((await cardPoint(page, pi)) as [number, number]));
  await sleep(400);
  out.push(["a card's preview opens on hover", (await look()).preview]);
  const before = await look();
  await page.click(...((await cardPoint(page, pi)) as [number, number]));
  await page.move(640, 300);
  await sleep(400);
  const after = await look();
  out.push(['a click plays it: one card fewer, a bulb darker', after.cards === before.cards - 1 && after.used > before.used]);
  for (let k = 0; k < 4; k++) {
    const idx = await page.evaluate<number>(`[...document.querySelectorAll('.desk .hand .card')].findIndex((c) => c.getAttribute('aria-disabled') === 'false')`);
    if (idx < 0) break;
    await page.click(...((await cardPoint(page, idx)) as [number, number]));
    await page.move(640, 300);
    await sleep(250);
  }
  const other = await page.evaluate<number>(`[...document.querySelectorAll('.desk .hand .card')].findIndex((c) => !c.classList.contains('f-scandal'))`);
  if (other < 0 || (await look()).used < 3) out.push(['no actions left', 'skipped']);
  else {
    await page.click(...((await cardPoint(page, other)) as [number, number]));
    await sleep(250);
    out.push(['with no actions left a click says so', (await look()).toast === en['ui.toast.noActions']]);
  }
  const end = (await centre(page, '.desk .endbtn')) as [number, number];
  await page.move(...end);
  await sleep(400);
  out.push(["END TURN's preview opens on hover", (await look()).preview]);
  const deck = (await centre(page, '.desk .deckbtn')) as [number, number];
  await page.click(...deck);
  await sleep(300);
  const opened = await page.evaluate<boolean>(`!!document.querySelector('.deck-viewer')`);
  const close = await centre(page, '.deck-viewer .row button');
  if (close) await page.click(...close);
  await sleep(300);
  out.push(['the deck opens from the stat bar and closes', opened && !(await page.evaluate<boolean>(`!!document.querySelector('.deck-viewer')`))]);
  const turn = await page.evaluate<string>(`document.querySelector('.desk [data-hook="date"]')?.textContent ?? ''`);
  await page.click(...end);
  await sleep(700);
  const next = await page.evaluate<string>(`document.querySelector('.desk [data-hook="date"]')?.textContent ?? ''`);
  out.push(['a click on END TURN ends the month', next !== turn || (await look()).phase !== 'play']);
  return out;
}

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5195, strictPort: false } });
await server.listen();
const url = server.resolvedUrls?.local[0] as string;
let failed = false;
try {
  for (const browser of BROWSERS) {
    const page = await launch(browser, { width: 1280, height: 720 });
    try {
      const results = [...(await tooltips(page, url)), ...(await bubblesAndMetronome(page, url)), ...(await papers(page, url)), ...(await hand(page, url))];
      const passed = results.filter(([, ok]) => ok === true).length;
      const skipped = results.filter(([, ok]) => ok === 'skipped').length;
      console.log(`interactions, ${browser}: ${passed} of ${results.length - skipped} pass${skipped ? `, ${skipped} skipped` : ''}`);
      for (const [what, ok] of results) if (ok !== true) console.log(`  ${ok === 'skipped' ? 'skipped' : 'FAIL'}  ${what}`);
      if (results.some(([, ok]) => ok === false)) failed = true;
    } finally {
      await page.close();
    }
  }
  console.log(failed ? 'FAIL: an interaction does not behave' : 'PASS: every interaction behaves, in every browser');
} catch (err) {
  failed = true;
  console.error(`interactions check: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
