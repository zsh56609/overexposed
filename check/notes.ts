// npm run check:notes — the manager's notes (round R8b, B8) by real input, in headless Chrome, Firefox and WebKit
// (check/browser.ts) at 1280×720 and 844×390, from the title of ?seed=3&notes=1 with a fresh store:
// - the year played for heat (Dex): each of the six comes at its moment, whole on the stage — the stat bar on the
//   first offers, the bulbs on the first hand, the countdown after a play that raised heat, END TURN with no actions
//   left, the mirror on a later month's hand, a scandal in the hand (its note placed by its card); and on a recorded
//   autumn hand holding a scandal (check/desk-states.json, s04), the scandal's note follows its card as the hand fans again;
// - no note, turned as it stands, meets a hand card, END TURN, or an offer's card or button;
// - the first time each comes it is highlighted (the veil; the note in lit); a click puts it away (in seen); none
//   comes twice;
// - a card's preview over a note fades it and lets clicks through, and END TURN's over its own note; a panel hides a
//   note, and it is back once the panel closes;
// - all six seen, House rules' switch reads off; turned back on, a note comes again, not highlighted;
// - a seeded run without notes=1 shows none, nor does a run with the switch off;
// - under touch input the actions note says "hold": its .touch line.
// With --years instead: two years from the title as a new player has them — unseeded, a fresh store, one per manager,
// played for Hype (a Scandal in the hand by summer), through the awards night: when each note came and why, all six,
// the switch off after them, and no console error (Chromium at 1280×720 unless --browsers and --sizes say otherwise).
// Runs the Vite dev server in-process. Usage: node check/notes.ts [--years] [--browsers=chrome,firefox,webkit] [--sizes=1280x720,844x390m]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { browsersFromArgs, launch, sizesFromArgs, type Page } from './browser.ts';
import { cardPoint, centre, loadStates, openReady, PLAY_STEPS, ROOT } from './desk-replay.ts';
import { CARD_W, fan } from '../ui/desk/fan.ts';
import { NOTE_IDS, NOTE_MARKS, type NoteId } from '../ui/notes.ts';

const YEARS = process.argv.includes('--years');
const BROWSERS = browsersFromArgs(process.argv, YEARS ? 'chrome' : undefined);
const SIZES = sizesFromArgs(process.argv, YEARS ? '1280x720' : '1280x720,844x390m');
const en = JSON.parse(readFileSync(join(ROOT, 'i18n', 'en.json'), 'utf8')) as Record<string, string>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Result = [what: string, ok: boolean | 'skipped'];
type Pt = [number, number];
type Quad = Pt[];

/** A line as its note's accessible name reads it: the marks are icons, not words. */
const plain = (line: string) => line.replace(new RegExp(`\\[(?:${NOTE_MARKS.join('|')})\\]\\s*`, 'g'), '');
const STORE = `(() => { try { return JSON.parse(localStorage.getItem('overexposed.notes') ?? '{}'); } catch { return {}; } })()`;
const FRESH = `localStorage.removeItem('overexposed.notes'); localStorage.removeItem('overexposed.settings')`;

/** A diagnostic that is an error: a thrown exception or an error logged — the optional favicon's 404 aside. */
const isError = (line: string): boolean => /"type":"error"|exceptionThrown|"level":"error"|^pageerror|^error:/.test(line) && !(line.includes('/favicon.ico') && line.includes('404'));

/**
 * The page's side: `__quad(el)`, an element's four corners on the 1280×720 stage through every transform (probes at
 * its corners); `__notes`, each note as it came and what the desk showed then; `__pointer`, the last pointer put down.
 */
const HELPERS = `(() => {
  if (window.__notesWatch) return;
  window.__notesWatch = true;
  const q = (s) => document.querySelector(s);
  window.__quad = (el) => {
    if (!el) return null;
    const st = q('.stage').getBoundingClientRect();
    const k = st.width / 1280 || 1;
    const on = (x, y) => [(x - st.left) / k, (y - st.top) / k];
    const cs = getComputedStyle(el);
    if (cs.position === 'static' && cs.transform === 'none') {
      const r = el.getBoundingClientRect();
      return [on(r.left, r.top), on(r.right, r.top), on(r.right, r.bottom), on(r.left, r.bottom)];
    }
    const w = el.offsetWidth, h = el.offsetHeight, bx = el.clientLeft, by = el.clientTop;
    return [[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => {
      const p = document.createElement('i');
      p.style.cssText = 'position:absolute;left:' + (x - bx) + 'px;top:' + (y - by) + 'px;width:0;height:0;margin:0;padding:0;border:0;pointer-events:none';
      el.appendChild(p);
      const r = p.getBoundingClientRect();
      p.remove();
      return on(r.left, r.top);
    });
  };
  const log = (window.__notes = []);
  let last = null;
  const look = () => {
    const layer = q('[data-hook="notes"]');
    const id = layer?.dataset.note ?? null;
    if (id === last) return;
    last = id;
    if (!id) return;
    const desk = q('.desk');
    log.push({
      id, at: performance.now(), veil: !!layer.querySelector('.oxn-veil'), turn: Number(desk?.dataset.turn ?? 0),
      offers: !!q('.scr.offers'), hand: document.querySelectorAll('.desk .hand .card').length,
      used: document.querySelectorAll('.desk .slotbulbs i.used').length, bulbs: document.querySelectorAll('.desk .slotbulbs i').length,
      heat: Number(q('[data-hook="number-heat"]')?.dataset.final ?? NaN), scandals: document.querySelectorAll('.desk .hand .card.f-scandal').length,
      label: q('.oxn')?.getAttribute('aria-label') ?? '',
    });
  };
  new MutationObserver(look).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-note'] });
  look();
  window.__pointer = null;
  document.addEventListener('pointerdown', (e) => { window.__pointer = e.pointerType; }, true);
})()`;

/** A note as it came: what the desk showed at that moment. */
interface Came {
  readonly id: NoteId;
  readonly at: number;
  readonly veil: boolean;
  readonly turn: number;
  readonly offers: boolean;
  readonly hand: number;
  readonly used: number;
  readonly bulbs: number;
  readonly heat: number;
  readonly scandals: number;
  readonly label: string;
}

/** Two convex outlines meet: no edge of either separates them (touching is not meeting). */
function meets(a: Quad, b: Quad): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i] as Pt;
      const [x2, y2] = poly[(i + 1) % poly.length] as Pt;
      const nx = y2 - y1,
        ny = x1 - x2;
      const pa = a.map(([x, y]) => x * nx + y * ny),
        pb = b.map(([x, y]) => x * nx + y * ny);
      if (Math.max(...pa) <= Math.min(...pb) + 1e-6 || Math.max(...pb) <= Math.min(...pa) + 1e-6) return false;
    }
  }
  return true;
}

const IDLE = `document.querySelector('.desk')?.dataset.busy === '1' || !!document.querySelector('.screen-over.leaving')`;
async function idle(page: Page): Promise<void> {
  for (let i = 0; i < 300 && (await page.evaluate<boolean>(IDLE)); i++) await sleep(40);
}
const neutral = (page: Page) => page.evaluate<Pt>(`(() => { const r = document.querySelector('.stage').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height * 300 / 720]; })()`);
const WHERE = `(() => {
  const q = (s) => document.querySelector(s);
  return q('.title-screen:not(.dim) .begin') ? 'title' : q('.season-card .into') ? 'season' : q('.manager-choice .choose') ? 'manager'
    : q('.scr.offers') ? 'offers' : q('.scr.gates') ? 'doors' : q('.event-screen') ? 'event' : q('.desk .endbtn') ? 'play' : 'other';
})()`;

/** The year as the walk has played it: plays this month, months ended, the last move, the heat before the last play. */
interface Walk {
  plays: number;
  monthsEnded: number;
  last: 'play' | 'end' | 'screen' | '';
  heatBefore: number;
}

/**
 * One move of the year by real input: whatever screen is up, its choice (the manager `manager`); else a play — for heat,
 * a card that raises it first; for Hype, the card that raises it most — else END TURN.
 */
async function move(page: Page, input: 'mouse' | 'touch', w: Walk, manager = 0, policy: 'heat' | 'hype' = 'heat'): Promise<string> {
  const tap = async (at: Pt | null) => {
    if (!at) return false;
    if (input === 'touch') await page.press(at[0], at[1], 40);
    else await page.click(at[0], at[1]);
    return true;
  };
  const first = (sel: string) => page.evaluate<number>(`[...document.querySelectorAll(${JSON.stringify(sel)})].findIndex((b) => !b.disabled && b.getAttribute('aria-disabled') !== 'true')`);
  const where = await page.evaluate<string>(WHERE);
  if (where !== 'play' && where !== 'other') w.last = 'screen';
  if (where === 'title') {
    await tap(await centre(page, '.title-screen .begin'));
    await sleep(900);
  } else if (where === 'season') {
    await sleep(600);
    await tap(await centre(page, '.season-card .into'));
    await sleep(1500);
  } else if (where === 'manager') {
    await sleep(1200);
    await tap(await centre(page, '.manager-choice .choose', manager));
    await sleep(1500);
  } else if (where === 'offers' || where === 'doors') {
    const sel = where === 'offers' ? '.offers .take' : '.gates .take';
    const i = await first(sel);
    if (i >= 0) await tap(await centre(page, sel, i));
    await sleep(1600);
  } else if (where === 'event') {
    // A text's messages arrive first; its replies open after them.
    for (let k = 0; k < 80; k++) {
      const i = await first('.event-screen .choose');
      if (i >= 0) {
        await tap(await centre(page, '.event-screen .choose', i));
        break;
      }
      await sleep(250);
    }
    await sleep(2500);
  } else if (where === 'play') {
    const i = await page.evaluate<number>(`(() => {
      const ok = [...document.querySelectorAll('.desk .hand .card')].map((c, i) => [c, i]).filter(([c]) => c.getAttribute('aria-disabled') === 'false');
      const hot = ok.find(([c]) => [...c.querySelectorAll('.r-heat')].some((x) => x.textContent.includes('+')));
      const hype = (c) => Math.max(0, ...[...c.querySelectorAll('.r-hype')].map((x) => Number((x.textContent.match(/\\+(\\d+)/) ?? [])[1] ?? 0)));
      const most = ok.reduce((best, x) => (best === null || hype(x[0]) > hype(best[0]) ? x : best), null);
      return ((${JSON.stringify(policy)} === 'hype' && most && hype(most[0]) > 0 ? most : hot) ?? ok[0])?.[1] ?? -1;
    })()`);
    if (i >= 0) {
      w.heatBefore = await page.evaluate<number>(`Number(document.querySelector('[data-hook="number-heat"]')?.dataset.final ?? NaN)`);
      await tap(await cardPoint(page, i));
      if (input === 'mouse') await page.move(...(await neutral(page)));
      w.plays++;
      w.last = 'play';
      await sleep(1400);
    } else {
      await tap(await centre(page, '.desk .endbtn'));
      if (input === 'mouse') await page.move(...(await neutral(page)));
      w.plays = 0;
      w.monthsEnded++;
      w.last = 'end';
      await sleep(3500);
    }
  } else await sleep(300);
  return where;
}

/** The note up and what it must keep clear of, on the stage. */
interface Layout {
  readonly up: string | null;
  readonly note: Quad | null;
  readonly left: number;
  readonly faded: boolean;
  readonly through: boolean;
  readonly obstacles: readonly { readonly what: string; readonly quad: Quad }[];
  readonly floating: Quad | null;
  /** The hand's size, and the leftmost scandal's place in it. */
  readonly hand: number;
  readonly scandalAt: number;
}
const LAYOUT = `(() => {
  const q = (s) => document.querySelector(s);
  const all = (s) => [...document.querySelectorAll(s)];
  const note = q('.oxn:not(.out)');
  const obstacles = [
    ...all('.desk .hand .card').map((el, i) => ({ what: 'hand card ' + (i + 1), quad: window.__quad(el) })),
    ...all('.desk .endbtn').map((el) => ({ what: 'END TURN', quad: window.__quad(el) })),
    ...all('.scr.offers .lift').map((el, i) => ({ what: 'offer ' + (i + 1), quad: window.__quad(el) })),
    ...all('.scr.offers .tkt').map((el) => ({ what: 'offer button ' + el.className.replace('tkt ', ''), quad: window.__quad(el) })),
  ];
  const cards = all('.desk .hand .card');
  return {
    up: q('[data-hook="notes"]')?.dataset.note ?? null,
    note: window.__quad(note),
    left: note ? parseFloat(note.style.left) : NaN,
    faded: !!note?.classList.contains('faded'),
    through: !!note && getComputedStyle(note).pointerEvents === 'none',
    obstacles,
    floating: window.__quad(q('.desk .floating')),
    hand: cards.length,
    scandalAt: cards.findIndex((c) => c.classList.contains('f-scandal')),
  };
})()`;

/** Where the scandal's note stands by its card (B2): right of centre, to its left; else from its centre. */
function scandalLeft(hand: number, at: number): number {
  const spot = fan(hand)[at] ?? { left: 540 - CARD_W / 2 };
  const middle = spot.left + CARD_W / 2;
  return Math.max(8, Math.min(1280 - 8 - 284, middle > 640 ? spot.left - 330 : middle - 30));
}

/** Whether a note came at its moment (B2), and the moment in words. */
function atItsMoment(c: Came, w: Walk): [string, boolean] {
  switch (c.id) {
    case 'stats':
      return ['on the offers', c.offers];
    case 'actions':
      return ['on a hand not yet played', c.hand > 0 && !c.offers && w.plays === 0];
    case 'heat':
      return [`after a play that raised heat (${w.heatBefore} → ${c.heat})`, w.last === 'play' && c.heat > w.heatBefore];
    case 'end':
      return [`with no actions left (${c.used} of ${c.bulbs} bulbs used)`, c.bulbs > 0 && c.used === c.bulbs];
    case 'mirror':
      return [`on a later month's hand not yet played (${w.monthsEnded} months ended)`, c.hand > 0 && w.plays === 0 && w.monthsEnded >= 1];
    case 'scandal':
      return [`with ${c.scandals} scandal${c.scandals === 1 ? '' : 's'} in the hand`, c.scandals > 0];
  }
}

/** The run so far: which notes came, the previews tried, a timeline for the report. */
interface Year {
  readonly done: Set<NoteId>;
  readonly timeline: string[];
  cardPreview: boolean;
  endPreview: boolean;
  /** The scandal's note seen to follow its card as the hand fans again. */
  follows: boolean;
}

/**
 * A note that came, in full: at its moment, whole on the stage, clear of the hand, END TURN and the offers; on its first
 * time, highlighted; a preview over it fades it and lets clicks through; the scandal's follows its card as the hand fans
 * again; a click puts it away into seen.
 */
async function seeNote(page: Page, c: Came, w: Walk, y: Year, first: boolean, out: Result[]): Promise<void> {
  // Its entrance done (260 ms).
  await page.evaluate(`new Promise((r) => setTimeout(r, Math.max(0, 450 - (performance.now() - ${c.at}))))`);
  const L = await page.evaluate<Layout>(LAYOUT);
  const tag = `${c.id} (month ${c.turn})`;
  if (L.up !== c.id || !L.note) {
    out.push([`${tag}: gone before it could be read`, false]);
    return;
  }
  if (first) {
    const [moment, ok] = atItsMoment(c, w);
    y.timeline.push(`${c.id}: month ${c.turn}, ${moment} — ${c.hand} cards in hand, ${c.used} of ${c.bulbs} bulbs used`);
    out.push([`${tag} comes ${moment}`, ok]);
    out.push([`${tag} is highlighted the first time it comes`, c.veil]);
  }
  const off = L.note.filter(([x, yy]) => x < -0.5 || x > 1280.5 || yy < -0.5 || yy > 720.5);
  out.push([`${tag} stands whole on the stage${off.length ? `: a corner at ${off.map(([x, yy]) => `${Math.round(x)},${Math.round(yy)}`).join(' ')}` : ''}`, off.length === 0]);
  const hit = L.obstacles.filter((o) => o.quad && meets(L.note as Quad, o.quad)).map((o) => o.what);
  out.push([`${tag} meets no hand card, END TURN or offer${hit.length ? `: meets ${hit.join(', ')}` : ''}`, hit.length === 0]);
  if (c.id === 'scandal' && L.scandalAt >= 0) {
    const want = scandalLeft(L.hand, L.scandalAt);
    out.push([`${tag} stands by its card (left ${Math.round(L.left)}, its card's place gives ${Math.round(want)})`, Math.abs(L.left - want) < 1]);
  }
  // A card's preview over it: fades it, lets clicks through; gone, it is back.
  if (!y.cardPreview && L.hand > 0 && !c.offers) {
    for (let i = 0; i < L.hand && !y.cardPreview; i++) {
      const at = await cardPoint(page, i);
      if (!at) continue;
      await page.move(...at);
      await sleep(450);
      const P = await page.evaluate<Layout>(LAYOUT);
      if (P.floating && P.note && meets(P.floating, P.note)) {
        y.cardPreview = true;
        await page.move(...(await neutral(page)));
        await sleep(450);
        const back = await page.evaluate<Layout>(LAYOUT);
        out.push([`a card's preview over ${tag} fades it and lets clicks through, and it is back once the preview goes`, P.faded && P.through && !back.faded && back.up === c.id]);
      }
    }
    await page.move(...(await neutral(page)));
    await sleep(300);
  }
  // END TURN's preview over its own note.
  if (c.id === 'end' && !y.endPreview) {
    const at = await centre(page, '.desk .endbtn');
    if (at) {
      await page.move(...at);
      await sleep(450);
      const P = await page.evaluate<Layout>(LAYOUT);
      await page.move(...(await neutral(page)));
      await sleep(450);
      const back = await page.evaluate<Layout>(LAYOUT);
      y.endPreview = !!P.floating && !!P.note && meets(P.floating, P.note);
      out.push([`END TURN's preview over ${tag} fades it and lets clicks through, and it is back once the preview goes`, y.endPreview && P.faded && P.through && !back.faded && back.up === c.id]);
    }
  }
  // The scandal's note follows its card as the hand fans again: a play of another card keeps it up. Tried each time
  // the note comes until there is another card to play (a scandal drawn after the month's last play leaves none).
  if (c.id === 'scandal' && !y.follows) {
    const other = await page.evaluate<number>(`[...document.querySelectorAll('.desk .hand .card')].findIndex((c) => c.getAttribute('aria-disabled') === 'false')`);
    const at = other >= 0 ? await cardPoint(page, other) : null;
    if (at) {
      y.follows = true;
      w.heatBefore = await page.evaluate<number>(`Number(document.querySelector('[data-hook="number-heat"]')?.dataset.final ?? NaN)`);
      await page.click(...at);
      await page.move(...(await neutral(page)));
      w.plays++;
      w.last = 'play';
      await sleep(1400);
      await idle(page);
      await sleep(400);
      const A = await page.evaluate<Layout>(LAYOUT);
      if (A.scandalAt < 0) {
        // The play took the scandal out of the hand (Crisis PR): its note goes with it, and the following waits for another.
        out.push([`${tag} goes when its card leaves the hand`, A.up !== 'scandal']);
        y.follows = false;
        y.done.add(c.id);
        return;
      }
      const want = scandalLeft(A.hand, A.scandalAt);
      out.push([`${tag} follows its card as the hand fans again (left ${Math.round(A.left)}, its card's place gives ${Math.round(want)})`, A.up === 'scandal' && Math.abs(A.left - want) < 1]);
      const hitAfter = A.obstacles.filter((o) => o.quad && A.note && meets(A.note, o.quad)).map((o) => o.what);
      out.push([`${tag}, the hand fanned again, meets no card${hitAfter.length ? `: meets ${hitAfter.join(', ')}` : ''}`, hitAfter.length === 0]);
    }
  }
  // A panel hides it; closed, it is back (B3).
  if (c.id === 'actions' && first) {
    const deck = await centre(page, '.desk .deckbtn');
    if (deck) {
      await page.click(...deck);
      await sleep(700);
      const hidden = await page.evaluate<boolean>(`!!document.querySelector('.p-deck') && !document.querySelector('.oxn:not(.out)')`);
      const close = await centre(page, '.p-deck .closeb');
      if (close) await page.click(...close);
      await page.move(...(await neutral(page)));
      await sleep(800);
      const back = await page.evaluate<string | null>(`document.querySelector('[data-hook="notes"]')?.dataset.note ?? null`);
      out.push([`a panel hides ${tag}, and it is back once the panel closes`, hidden && back === c.id]);
      // Its coming back is the same note, not a second coming: off the log.
      await page.evaluate(`(() => { const l = window.__notes; if (l.length && l[l.length - 1].id === ${JSON.stringify(c.id)}) l.pop(); })()`);
    } else out.push([`a panel hides ${tag}: no Deck & Discard button`, false]);
  }
  // A click puts it away; it is in seen (and in lit, the highlight had).
  const at = await centre(page, '.oxn:not(.out)');
  if (at) await page.click(...at);
  await page.move(...(await neutral(page)));
  await sleep(350);
  const after = await page.evaluate<{ up: string | null; seen: string[]; lit: string[] }>(`(() => { const s = ${STORE}; return { up: document.querySelector('[data-hook="notes"]')?.dataset.note ?? null, seen: s.seen ?? [], lit: s.lit ?? [] }; })()`);
  out.push([`${tag}: a click puts it away, into seen${first ? ' and lit' : ''}`, after.up !== c.id && after.seen.includes(c.id) && (!first || after.lit.includes(c.id))]);
  y.done.add(c.id);
}

/** The year from its title with the notes asked for and a fresh store: the six at their moments, then the switch. */
async function year(page: Page, url: string): Promise<{ results: Result[]; timeline: string[] }> {
  const out: Result[] = [];
  await openReady(page, `${url}?seed=3&notes=1`);
  await page.evaluate(FRESH);
  await openReady(page, `${url}?seed=3&notes=1`);
  await page.evaluate(HELPERS);
  const w: Walk = { plays: 0, monthsEnded: 0, last: '', heatBefore: NaN };
  const y: Year = { done: new Set(), timeline: [], cardPreview: false, endPreview: false, follows: false };
  let read = 0;
  const comes = async (ms: number): Promise<Came[]> => {
    for (let t = 0; t <= ms; t += 100) {
      const log = await page.evaluate<Came[]>('window.__notes');
      if (log.length > read) return log.slice(read);
      if (t < ms) await sleep(100);
    }
    return [];
  };
  for (let guard = 0; guard < 160 && y.done.size < NOTE_IDS.length; guard++) {
    await idle(page);
    // The stat bar's note waits for the offers to be still (B2): on the first offers, time for it.
    const where = await page.evaluate<string>(WHERE);
    const fresh = await comes(where === 'offers' && !y.done.has('stats') ? 5000 : 350);
    if (fresh.length) {
      for (const c of fresh) {
        if (y.done.has(c.id)) out.push([`${c.id} comes twice`, false]);
        else await seeNote(page, c, w, y, true, out);
      }
      read += fresh.length;
      continue;
    }
    await move(page, 'mouse', w);
  }
  const missing = NOTE_IDS.filter((id) => !y.done.has(id));
  out.push([`all six came${missing.length ? `: not ${missing.join(', ')}` : ''}`, missing.length === 0]);
  if (!y.cardPreview) out.push(["a card's preview over a note: none met one in this year", false]);
  // All six seen and none up: House rules' switch reads off.
  await idle(page);
  await sleep(500);
  await page.click(...((await centre(page, '.desk .setbtn')) as Pt));
  await sleep(600);
  const switchState = () => page.evaluate<string | null>(`document.querySelector('[data-setting="notes"]')?.getAttribute('aria-checked') ?? null`);
  out.push(['all six seen, the switch reads off', (await switchState()) === 'false']);
  // Turned back on: seen empties, lit keeps the six; a note comes again, not highlighted.
  const sw = await centre(page, '[data-setting="notes"]');
  if (sw) await page.click(...sw);
  await sleep(400);
  const store = await page.evaluate<{ seen?: string[]; lit?: string[] }>(STORE);
  out.push([`turned back on: it reads on, seen empties, lit keeps the six (${store.lit?.length ?? 0})`, (await switchState()) === 'true' && (store.seen ?? []).length === 0 && NOTE_IDS.every((id) => store.lit?.includes(id))]);
  const close = await centre(page, '.p-settings .closeb');
  if (close) await page.click(...close);
  await sleep(600);
  let again: Came | null = null;
  for (let guard = 0; guard < 60 && !again; guard++) {
    await idle(page);
    const where = await page.evaluate<string>(WHERE);
    const fresh = await comes(where === 'offers' ? 5000 : 350);
    if (fresh.length) {
      again = fresh[0] as Came;
      read += fresh.length;
      break;
    }
    await move(page, 'mouse', w);
  }
  if (!again) out.push(['turned back on, a note comes again', false]);
  else {
    out.push([`turned back on, ${again.id} comes again (month ${again.turn}), not highlighted`, !again.veil]);
    y.timeline.push(`again: ${again.id}, month ${again.turn}, not highlighted`);
    await seeNote(page, again, w, y, false, out);
  }
  return { results: out, timeline: y.timeline };
}

/**
 * The scandal's note follows its card as the hand fans again (B2), on a recorded hand that holds a scandal and cards to
 * play (s04: autumn, five cards, the scandal in the middle). Replayed with the switch off and every note lit; then the
 * switch turned on, the notes come again from the start: each put away until the scandal's, and a play of another card.
 */
async function refan(page: Page, url: string): Promise<Result[]> {
  const out: Result[] = [];
  const state = loadStates().s04;
  if (!state) return [['the scandal note follows its card: no recorded state s04', false]];
  const at = `${url}?seed=${state.seed}&notes=1`;
  await openReady(page, at);
  await page.evaluate(`${FRESH}; localStorage.setItem('overexposed.settings', JSON.stringify({ notes: false })); localStorage.setItem('overexposed.notes', JSON.stringify({ seen: ${JSON.stringify(NOTE_IDS)}, lit: ${JSON.stringify(NOTE_IDS)} }))`);
  await openReady(page, at);
  await page.evaluate(HELPERS);
  const replay = await page.evaluate<string>(PLAY_STEPS(state.steps));
  if (replay !== 'ok') return [[`the scandal note follows its card: the replay ${replay}`, false]];
  await idle(page);
  await sleep(500);
  await page.click(...((await centre(page, '.desk .setbtn')) as Pt));
  await sleep(500);
  const sw = await centre(page, '[data-setting="notes"]');
  if (sw) await page.click(...sw);
  await sleep(300);
  const close = await centre(page, '.p-settings .closeb');
  if (close) await page.click(...close);
  await sleep(600);
  const w: Walk = { plays: 0, monthsEnded: 0, last: '', heatBefore: NaN };
  const y: Year = { done: new Set(), timeline: [], cardPreview: true, endPreview: true, follows: false };
  let read = 0;
  for (let guard = 0; guard < 8 && !y.follows; guard++) {
    await idle(page);
    await sleep(400);
    const log = await page.evaluate<Came[]>('window.__notes');
    const c = log[read];
    if (!c) break;
    read++;
    await seeNote(page, c, w, y, false, out);
  }
  if (!y.follows) out.push(['the scandal note follows its card as the hand fans again: it never came with a card to play', false]);
  return out;
}

/** A run that must show no note: seeded without notes=1, or with the switch turned off at the title. */
async function quiet(page: Page, url: string, how: 'seeded' | 'off'): Promise<Result> {
  const at = how === 'seeded' ? `${url}?seed=3` : `${url}?seed=3&notes=1`;
  await openReady(page, at);
  await page.evaluate(FRESH);
  await openReady(page, at);
  await page.evaluate(HELPERS);
  if (how === 'off') {
    await page.click(...((await centre(page, '.title-screen .settings-open')) as Pt));
    await sleep(600);
    const sw = await centre(page, '[data-setting="notes"]');
    if (sw) await page.click(...sw);
    await sleep(300);
    const off = await page.evaluate<string | null>(`document.querySelector('[data-setting="notes"]')?.getAttribute('aria-checked') ?? null`);
    const close = await centre(page, '.p-settings .closeb');
    if (close) await page.click(...close);
    await sleep(600);
    if (off !== 'false') return ['the switch off: it would not turn off', false];
  }
  // Through the moments of the first month and into the second's hand: the offers, the hand, plays, END TURN.
  const w: Walk = { plays: 0, monthsEnded: 0, last: '', heatBefore: NaN };
  for (let guard = 0; guard < 40 && !(w.monthsEnded >= 1 && (await page.evaluate<string>(WHERE)) === 'play' && w.plays >= 1); guard++) {
    await idle(page);
    if ((await page.evaluate<string>(WHERE)) === 'offers') await sleep(2500);
    else await sleep(500);
    await move(page, 'mouse', w);
  }
  await idle(page);
  await sleep(600);
  const shown = await page.evaluate<{ log: number; dom: number }>(`({ log: window.__notes.length, dom: document.querySelectorAll('.oxn').length })`);
  const what = how === 'seeded' ? 'a seeded run without notes=1' : 'a run with the switch off';
  return [`${what} shows no note through ${w.monthsEnded} month${w.monthsEnded === 1 ? '' : 's'}${shown.log ? `: ${shown.log} came` : ''}`, shown.log === 0 && shown.dom === 0 && w.monthsEnded >= 1];
}

/** Under touch input the actions note reads its .touch line: from the title by taps to the first hand. */
async function touchLine(page: Page, url: string): Promise<Result> {
  await openReady(page, `${url}?seed=3&notes=1`);
  await page.evaluate(FRESH);
  await openReady(page, `${url}?seed=3&notes=1`);
  await page.evaluate(HELPERS);
  const w: Walk = { plays: 0, monthsEnded: 0, last: '', heatBefore: NaN };
  let read = 0;
  try {
    for (let guard = 0; guard < 30; guard++) {
      await idle(page);
      const where = await page.evaluate<string>(WHERE);
      let log: Came[] = [];
      for (let t = 0; t < (where === 'offers' && read === 0 ? 5000 : 400); t += 100) {
        log = await page.evaluate<Came[]>('window.__notes');
        if (log.length > read) break;
        await sleep(100);
      }
      const c = log[read];
      if (c) {
        read++;
        await page.evaluate(`new Promise((r) => setTimeout(r, Math.max(0, 450 - (performance.now() - ${c.at}))))`);
        if (c.id === 'actions') {
          const pointer = await page.evaluate<string | null>('window.__pointer');
          const want = plain(en['notes.actions.veteran.touch'] ?? '');
          if (c.label === want) return ['under touch input the actions note reads its touch line', true];
          if (page.name === 'firefox' && pointer !== 'touch') return [`under touch input the actions note reads its touch line: Firefox's headless taps arrive as ${pointer ?? 'no pointer'}`, 'skipped'];
          return [`under touch input the actions note reads its touch line: it reads "${c.label.slice(0, 40)}…", the last pointer ${pointer ?? 'none'}`, false];
        }
        // Another note on the way (the stat bar's): a tap puts it away.
        const at = await centre(page, '.oxn:not(.out)');
        if (at) await page.press(at[0], at[1], 40);
        await sleep(400);
        continue;
      }
      await move(page, 'touch', w);
    }
  } catch (err) {
    return [`under touch input the actions note reads its touch line: ${err instanceof Error ? err.message.slice(0, 80) : String(err)}`, 'skipped'];
  }
  return ['under touch input the actions note reads its touch line: it never came', false];
}

/**
 * A year from the title as a new player has it (--years): unseeded, a fresh store, the manager `manager`, played for
 * Hype, every note left to go by itself, through the awards night; then PLAY AGAIN, and House rules from the title.
 */
async function fullYear(page: Page, url: string, manager: number): Promise<{ results: Result[]; timeline: string[] }> {
  const out: Result[] = [];
  const timeline: string[] = [];
  await openReady(page, url);
  await page.evaluate(FRESH);
  await openReady(page, url);
  await page.evaluate(HELPERS);
  const w: Walk = { plays: 0, monthsEnded: 0, last: '', heatBefore: NaN };
  let read = 0;
  let scandalBy = 0;
  const night = `!!document.querySelector('.ending')`;
  for (let guard = 0; guard < 900 && !(await page.evaluate<boolean>(night)); guard++) {
    await idle(page);
    const where = await page.evaluate<string>(WHERE);
    // Time for a note's moment to be read (the offers' once they are still).
    if (where === 'offers') await sleep(1800);
    else await sleep(350);
    const log = await page.evaluate<Came[]>('window.__notes');
    for (const c of log.slice(read)) {
      const [moment, ok] = atItsMoment(c, w);
      timeline.push(`${c.id}: month ${c.turn}, ${moment}${c.veil ? ', highlighted' : ''}`);
      out.push([`${c.id} came ${moment} (month ${c.turn})`, ok]);
    }
    read = log.length;
    if (!scandalBy && (await page.evaluate<number>(`document.querySelectorAll('.desk .hand .card.f-scandal').length`)) > 0) scandalBy = await page.evaluate<number>(`Number(document.querySelector('.desk')?.dataset.turn ?? 0)`);
    await move(page, 'mouse', w, manager, 'hype');
  }
  const reached = await page.evaluate<boolean>(night);
  out.push(['the year reached its ending', reached]);
  // The awards night: wait for PLAY AGAIN.
  let again: Pt | null = null;
  for (let k = 0; k < 240 && !again; k++) {
    again = await centre(page, 'button.play-again');
    if (!again) await sleep(250);
  }
  out.push(['the awards night came, to PLAY AGAIN', !!again]);
  const came = (await page.evaluate<Came[]>('window.__notes')).map((c) => c.id);
  const missing = NOTE_IDS.filter((id) => !came.includes(id));
  out.push([`all six notes came${missing.length ? `: not ${missing.join(', ')}` : ''}`, missing.length === 0]);
  out.push([`each came once (${came.length} in all)`, came.length === new Set(came).size]);
  out.push([`a Scandal in the hand by summer (month ${scandalBy || 'none'})`, scandalBy > 0 && scandalBy <= 6]);
  // PLAY AGAIN, the title's House rules: the switch reads off.
  if (again) {
    await page.click(...again);
    await sleep(2500);
    const open = await centre(page, '.title-screen .settings-open');
    if (open) await page.click(...open);
    await sleep(700);
  }
  const sw = await page.evaluate<string | null>(`document.querySelector('[data-setting="notes"]')?.getAttribute('aria-checked') ?? null`);
  out.push(['after the six, House rules\' switch reads off', sw === 'false']);
  return { results: out, timeline };
}

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5197, strictPort: false } });
await server.listen();
const url = server.resolvedUrls?.local[0] as string;
let failed = false;
try {
  for (const browser of BROWSERS) {
    for (const size of SIZES) {
      if (YEARS) {
        for (const [manager, name] of ['Dex', 'Mags'].entries()) {
          const page = await launch(browser, size);
          try {
            const run = await fullYear(page, url, manager);
            const errors = page.diagnostics.filter(isError);
            const results = [...run.results, [`no console error${errors.length ? `: ${errors.slice(0, 2).join('; ').slice(0, 300)}` : ''}`, errors.length === 0] as Result];
            const passed = results.filter(([, ok]) => ok === true).length;
            console.log(`notes, a year with ${name}, ${browser} ${size.width}x${size.height}: ${passed} of ${results.length} pass`);
            for (const line of run.timeline) console.log(`  ${line}`);
            for (const [what, ok] of results) if (ok !== true) console.log(`  FAIL  ${what}`);
            if (results.some(([, ok]) => ok === false)) failed = true;
          } finally {
            mkdirSync('check/out', { recursive: true });
            writeFileSync(`check/out/notes-year-${name}-${browser}-${Date.now()}.json`, JSON.stringify(page.diagnostics, null, 2));
            await page.close();
          }
        }
        continue;
      }
      const page = await launch(browser, size);
      try {
        const run = await year(page, url);
        const results = [...run.results, ...(await refan(page, url)), await quiet(page, url, 'seeded'), await quiet(page, url, 'off'), await touchLine(page, url)];
        const errors = page.diagnostics.filter(isError);
        results.push([`no page error${errors.length ? `: ${errors.slice(0, 2).join('; ')}` : ''}`, errors.length === 0]);
        const passed = results.filter(([, ok]) => ok === true).length;
        const skipped = results.filter(([, ok]) => ok === 'skipped').length;
        console.log(`notes, ${browser} ${size.width}x${size.height}: ${passed} of ${results.length - skipped} pass${skipped ? `, ${skipped} skipped` : ''}`);
        for (const line of run.timeline) console.log(`  ${line}`);
        for (const [what, ok] of results) if (ok !== true) console.log(`  ${ok === 'skipped' ? 'skipped' : 'FAIL'}  ${what}`);
        if (results.some(([, ok]) => ok === false)) failed = true;
      } finally {
        mkdirSync('check/out', { recursive: true });
        writeFileSync(`check/out/notes-${browser}-${size.width}-${Date.now()}.json`, JSON.stringify(page.diagnostics, null, 2));
        await page.close();
      }
    }
  }
  console.log(failed ? 'FAIL: a note does not behave' : 'PASS: every note comes, stands and goes as it should, in every browser');
} catch (err) {
  failed = true;
  console.error(`notes check: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
