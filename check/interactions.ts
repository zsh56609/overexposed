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
//   a click ends the month; the deck and House rules open from the stat bar and close (round R1, Part G);
// - a bubble once shown stays until the month ends (round R3, C2): for each manager, from the title with motion full,
//   through a month of plays, paper picks and prints, the bubbles shown, sampled every 90 ms, never decrease.
// - hovers ease (round R4, A1): a manager card, an offer, a hand card, a paper, a sticky note, a bubble and a door,
//   60 ms after each one's transition delay, stand strictly between their rest and their hover.
// - a month's sounds (round R4, B7), from the cue log `?cues` keeps: a deal per card dealt, a pick and a land per
//   play, a button at END TURN, a stamp for PRINTED, the month at the date; no cue twice for one beat (ticks
//   excepted); and a click during the next month end (D7) drops the cues of the beats it skips.
// Runs the Vite dev server in-process. Usage: node check/interactions.ts [--browsers=chrome,firefox]

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { browsersFromArgs, sizesFromArgs, launch, type Page } from './browser.ts';
import { badKeyframes, cardPoint, centre, loadStates, reach, ROOT, watchKeyframes } from './desk-replay.ts';

const BROWSERS = browsersFromArgs(process.argv);
const en = JSON.parse(readFileSync(join(ROOT, 'i18n', 'en.json'), 'utf8')) as Record<string, string>;
const states = loadStates();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const neutral = (page: Page) => page.evaluate<[number, number]>(`(() => { const r = document.querySelector('.desk').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height * 300 / 720]; })()`);
type Result = [what: string, ok: boolean | 'skipped'];

/**
 * Hovers ease (round R4, A1): an entrance animation that kept filling its last frame overrode the element's own
 * transition, so a hover's transform landed at once. In full motion, a manager card, an offer, a hand card, a paper,
 * a sticky note, a bubble and a door are hovered with the mouse; 60 ms after each one's own transition delay (the
 * hand's and the offers' are 70 ms), its transform lies strictly between its rest and its hover value.
 */
async function hoversEase(page: Page, url: string): Promise<Result[]> {
  const out: Result[] = [];
  const idle = async () => { for (let i = 0; i < 250 && (await page.evaluate<boolean>(`document.querySelector('.desk,[data-presentation]')?.dataset.busy === '1' || !!document.querySelector('.screen-over.leaving,.bubbles[data-revealing]')`)); i++) await sleep(40); };
  // A transform as a 4x4 matrix's sixteen numbers, a 2D one lifted into it, so any two can be compared.
  const matrix = (sel: string) => page.evaluate<number[] | null>(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return null;
    const t = getComputedStyle(el).transform;
    const v = !t || t === 'none' ? [1, 0, 0, 1, 0, 0] : t.replace(/^matrix(3d)?\\(|\\)$/g, '').split(',').map(Number);
    return v.length === 16 ? v : [v[0], v[1], 0, 0, v[2], v[3], 0, 0, 0, 0, 1, 0, v[4], v[5], 0, 1];
  })()`);
  const eases = async (label: string, sel: string, hover: string, delay: number, point?: () => Promise<[number, number] | null>): Promise<void> => {
    await page.move(4, 4);
    await sleep(500);
    const at = point ? await point() : await centre(page, hover);
    const rest = await matrix(sel);
    if (!at || !rest) {
      out.push([`hover eases: ${label} not found`, false]);
      return;
    }
    await page.move(at[0], at[1]);
    // A browser takes the hover in at its next style update — headless WebKit's come about 70 ms apart here — so the
    // style is read at once: the hover is taken in now, and its transition runs from now, in every browser.
    await matrix(sel);
    await sleep(delay + 60);
    // Read at the next frame (round R5): an animation's time moves on only at a frame, and headless WebKit's come about
    // 70 ms apart here, so a read between two frames can still see the transition at its start.
    await page.evaluate(`new Promise((done) => requestAnimationFrame(() => done(0)))`);
    const mid = await matrix(sel);
    await sleep(900);
    const end = await matrix(sel);
    await page.move(4, 4);
    if (!mid || !end) {
      out.push([`hover eases: ${label} went away`, false]);
      return;
    }
    const d = end.map((v, i) => v - (rest[i] ?? 0));
    const k = d.reduce((best, v, i) => (Math.abs(v) > Math.abs(d[best] ?? 0) ? i : best), 0);
    const span = d[k] ?? 0;
    const f = span === 0 ? NaN : ((mid[k] ?? 0) - (rest[k] ?? 0)) / span;
    out.push([`hover eases: ${label}, ${Number.isNaN(f) ? 'no hover move' : `${Math.round(f * 100)}% of the way`} at ${delay + 60} ms`, f > 0.02 && f < 0.98]);
  };
  await page.navigate(`${url}?seed=20261017`, 1500);
  await watchKeyframes(page);
  await page.evaluate(`document.documentElement.dataset.motion = 'full'`);
  for (let i = 0; i < 100 && !(await centre(page, '.title-screen .begin')); i++) await sleep(50);
  await sleep(400);
  const press = async (sel: string, i = 0) => { const at = await centre(page, sel, i); if (at) await page.click(...at); return !!at; };
  await press('.title-screen .begin');
  await sleep(900);
  await press('.season-card .into');
  await sleep(1800);
  await eases('a manager card', '.manager-choice .biz:nth-child(2)', '.manager-choice .biz:nth-child(2) .bcard', 0);
  await press('.manager-choice .choose', 1);
  await sleep(2700);
  await idle();
  await eases('an offer', '.offers .dslot:nth-child(2) .lift', '.offers .dslot:nth-child(2) .lift', 70);
  // TAKEN leaves with its card (round R5, B2): 200 ms into the flight, which starts 560 ms after the press, the slot
  // shows no stamp and the flight holds one.
  const pressed = Date.now();
  await press('.offers .take', 0);
  await sleep(Math.max(0, 760 - (Date.now() - pressed)));
  const taken = await page.evaluate<{ slot: boolean; flight: boolean }>(`(() => {
    const s = document.querySelector('.offers .dslot.taken .stampT');
    const shows = !!s && getComputedStyle(s).visibility !== 'hidden' && Number(getComputedStyle(s).opacity) > 0.05;
    return { slot: shows, flight: !!document.querySelector('.offer-flight .stampT') };
  })()`);
  out.push([`TAKEN leaves with its card: ${taken.slot ? 'a stamp on the slot' : 'none on the slot'}, ${taken.flight ? 'one in the flight' : 'none in the flight'}`, !taken.slot && taken.flight]);
  await sleep(840);
  await idle();
  for (let i = 0; i < 30 && (await page.evaluate<boolean>(`!!document.querySelector('.offers .take')`)); i++) { await press('.offers .take', 0); await sleep(1600); await idle(); }
  await sleep(600);
  await idle();
  await eases('a hand card', '.desk .hand .card:nth-child(2)', '.desk .hand .card:nth-child(2)', 70);
  // A paper behind, by the strip of it that shows above the front one.
  await eases('a paper', '.desk .news .pp.pos1', '.desk .news .pp.pos1', 0, () => page.evaluate<[number, number] | null>(`(() => { const p = document.querySelector('.desk .news .pp.pos1'); if (!p) return null; const r = p.getBoundingClientRect(); return [r.x + r.width / 2, r.y + 12]; })()`));
  await eases('a sticky note', '.desk .mirror .sticky', '.desk .mirror .sticky', 0);
  await eases('a bubble', '.desk .bubbles .bub[data-k]', '.desk .bubbles .bub[data-k]', 0);
  // A door: the season's last month, its doors laid out; then full motion for the hover.
  const s02 = states.s02;
  const gate = s02 ? s02.steps.findIndex((x) => x[0] === 'gate') : -1;
  if (s02 && gate > 0 && (await reach(page, url, { ...s02, steps: s02.steps.slice(0, gate) })) === 'ok') {
    await page.evaluate(`document.documentElement.dataset.motion = 'full'`);
    await sleep(300);
    await eases('a door', '.doors .inv', '.doors .inv', 0);
  } else out.push(['hover eases: no recorded door', false]);
  return out;
}

/** A cue the game played, as `?cues` logs it (ui/sound/sound.ts): a beat's is tagged step:index:kind (ui/sound/director.ts). */
interface CueLog {
  readonly name: string;
  readonly at: number;
  readonly beat?: string;
}

/**
 * A month's sounds (round R4, B7), in full motion from the title with `?cues`: BEGIN, the opening's Continue, a manager
 * signed, the offers taken; then the month — its hand dealt, a deal for each card; two plays, a pick and a land each;
 * END TURN, its button, the PRINTED stamp and the date's month. No cue sounds twice for one beat but the ticks. Then
 * the next month, and a click 0.35 s into its month end — after the stamp, before its numbers: none of the beats it
 * skipped is heard.
 */
async function monthCues(page: Page, url: string): Promise<Result[]> {
  const out: Result[] = [];
  const idle = async () => { for (let i = 0; i < 250 && (await page.evaluate<boolean>(`document.querySelector('.desk')?.dataset.busy === '1' || !!document.querySelector('.screen-over.leaving')`)); i++) await sleep(40); };
  const press = async (selector: string, index = 0) => { const at = await centre(page, selector, index); if (at) await page.click(...at); return !!at; };
  const log = () => page.evaluate<CueLog[]>(`window.__cues ?? []`);
  const none: CueLog = { name: '', at: 0 };
  const stepOf = (c: CueLog) => c.beat?.split(':')[0] ?? '';
  const kindOf = (c: CueLog) => c.beat?.split(':').at(-1) ?? '';
  const hand = () => page.evaluate<number>(`document.querySelectorAll('.desk .hand .card').length`);
  // Takes the offers (a season's Continue, an event's first reply it can afford) until the month's hand is dealt.
  const toPlay = async () => {
    for (let i = 0; i < 12 && !(await page.evaluate<boolean>(`!!document.querySelector('.desk .hand .card') && !document.querySelector('.screen-over:not(.leaving)')`)); i++) {
      const reply = await page.evaluate<number>(`[...document.querySelectorAll('.event-screen .choose')].findIndex((b) => !b.disabled && b.getAttribute('aria-disabled') !== 'true')`);
      if (reply >= 0) {
        await sleep(4000); // a text's messages arrive first
        await press('.event-screen .choose', reply);
        await sleep(5000);
      } else if (!(await press('.offers .take', 0))) await press('.season-card .into');
      await sleep(1600);
      await idle();
    }
    await sleep(500);
  };
  // The hand just dealt: a deal cue on each deal beat of the step that dealt it, one beat a card.
  const dealt = async (what: string) => {
    const cues = await log();
    const step = stepOf(cues.filter((c) => kindOf(c) === 'deal').at(-1) ?? none);
    const deals = cues.filter((c) => stepOf(c) === step && kindOf(c) === 'deal' && c.name === 'deal').length;
    const n = await hand();
    out.push([`${what}: a deal for each card dealt (${deals} for ${n})`, step !== '' && deals === n]);
  };
  await page.navigate(`${url}?seed=20261017&cues`, 1500);
  await watchKeyframes(page);
  await page.evaluate(`delete document.documentElement.dataset.motion`);
  for (let i = 0; i < 100 && !(await centre(page, '.title-screen .begin')); i++) await sleep(50);
  await sleep(400);
  await press('.title-screen .begin');
  await sleep(900);
  await press('.season-card .into');
  await sleep(1500);
  await press('.manager-choice .choose', 0);
  await sleep(700);
  await idle();
  await toPlay();
  await dealt('the first month');
  // Two plays: a pick as each leaves the hand, a land as it lands.
  let plays = 0;
  for (let k = 0; k < 2; k++) {
    const before = (await log()).length;
    const card = await page.evaluate<number>(`[...document.querySelectorAll('.desk .hand .card')].findIndex((c) => c.getAttribute('aria-disabled') === 'false')`);
    const at = card < 0 ? null : await cardPoint(page, card);
    if (!at) break;
    await page.click(...at);
    await page.move(...(await neutral(page)));
    await sleep(1400);
    await idle();
    plays++;
    const cues = (await log()).slice(before);
    const picks = cues.filter((c) => c.name === 'pick' && kindOf(c) === 'lift');
    const lands = cues.filter((c) => c.name === 'land' && kindOf(c) === 'land');
    out.push([`play ${k + 1}: a pick and a land (${picks.length}, ${lands.length})`, picks.length === 1 && lands.length === 1 && stepOf(picks[0] ?? none) === stepOf(lands[0] ?? none)]);
  }
  if (plays === 0) out.push(['a month played: no playable card', false]);
  // END TURN: its button, PRINTED's stamp, the date's month.
  const ended = (await log()).length;
  await press('.desk .endbtn');
  await page.move(...(await neutral(page)));
  await sleep(4000);
  await idle();
  const end = (await log()).slice(ended);
  const endStep = stepOf(end.find((c) => kindOf(c) === 'endPress') ?? none);
  const of = (kind: string, name: string) => end.filter((c) => stepOf(c) === endStep && kindOf(c) === kind && c.name === name).length;
  out.push([`END TURN: button ${of('endPress', 'button')}, stamp ${of('stamp', 'stamp')}, month ${of('date', 'month')}`, endStep !== '' && of('endPress', 'button') === 1 && of('stamp', 'stamp') === 1 && of('date', 'month') === 1]);
  await toPlay();
  await dealt('the second month');
  // D7: a click 0.35 s into the next month end skips its numbers, its sweep and its date, and their sounds.
  await page.evaluate(`window.__skipAt = null; window.addEventListener('click', () => { if (window.__skipAt === null && document.querySelector('.desk')?.dataset.busy === '1') window.__skipAt = performance.now(); }, true)`);
  const skipping = (await log()).length;
  await press('.desk .endbtn');
  await sleep(350);
  await page.click(...(await neutral(page)));
  await sleep(2500);
  await idle();
  const skipAt = await page.evaluate<number | null>(`window.__skipAt`);
  const after = (await log()).slice(skipping);
  const skipStep = stepOf(after.find((c) => kindOf(c) === 'endPress') ?? none);
  const late = after.filter((c) => stepOf(c) === skipStep && skipAt !== null && c.at > skipAt);
  out.push([`a D7 click drops the skipped beats' cues${late.length ? `: heard ${late.map((c) => `${c.name}@${kindOf(c)}`).join(', ')}` : ''}`, skipStep !== '' && skipAt !== null && late.length === 0 && !after.some((c) => stepOf(c) === skipStep && c.name === 'month')]);
  // No cue twice for one beat, ticks excepted.
  const seen = new Map<string, number>();
  for (const c of await log()) if (c.beat && c.name !== 'tick') seen.set(`${c.beat} ${c.name}`, (seen.get(`${c.beat} ${c.name}`) ?? 0) + 1);
  const twice = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
  out.push([`no cue twice for one beat${twice.length ? `: ${twice.slice(0, 4).join(', ')}` : ''}`, twice.length === 0 && seen.size > 0]);
  return out;
}

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
  await page.move(...await neutral(page));
  await sleep(300);
  out.push(['it closes when the pointer leaves', !(await on())]);
  const money = (await centre(page, '.desk [data-tip="money"]')) as [number, number];
  try {
    await page.evaluate(`(()=>{
      const trace=window.__tipTrace=[];const start=performance.now();
      for(const type of ['pointerdown','pointerup','pointercancel','pointerover','pointerout','focusin','focusout','click','contextmenu'])document.addEventListener(type,e=>trace.push({at:performance.now()-start,type,pointer:e.pointerType,trusted:e.isTrusted,target:e.target.closest?.('[data-tip]')?.dataset.tip??e.target.tagName,visible:!!document.querySelector('.tip.on')}),{capture:true});
      let last=false;const sample=()=>{const visible=!!document.querySelector('.tip.on');if(last!==visible){trace.push({at:performance.now()-start,type:'visibility',visible});last=visible;}if(performance.now()-start<1200)requestAnimationFrame(sample)};sample();
    })()`);
    await page.press(...money, 700);
    await sleep(200);
    const opened=await on();
    mkdirSync('check/out',{recursive:true});const traceFile=`check/out/tooltip-touch-${page.name}-${Date.now()}.json`;
    writeFileSync(traceFile,JSON.stringify(await page.evaluate('window.__tipTrace'),null,2));
    console.log(`  tooltip long-press ${page.name}: ${opened?'open':'FAILED'}; trusted-event trace ${traceFile}`);
    out.push(['it opens on a long-press', opened]);
    await page.press(...await neutral(page), 40);
    await sleep(300);
    out.push(['a tap elsewhere closes it', !(await on())]);
    await page.press(...money, 60);
    await sleep(600);
    out.push(['a short tap does not open it', !(await on())]);
  } catch (err) {
    if(page.name!=='webkit'||!(err instanceof Error)||err.message!=='WebKit driver: trusted long-press unsupported by Playwright Touchscreen')throw err;
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

/**
 * Round R3, C2: the bubbles stay. For each manager, the author's seed from the title with motion full: BEGIN, the
 * opening card, the manager, the first offer; then a month of plays, a paper picked by hand between them and each
 * play's print, the bubbles shown sampled every 90 ms in the page. They never decrease before END TURN.
 */
async function bubblesStay(page: Page, url: string): Promise<Result[]> {
  const out: Result[] = [];
  const idle = async () => { for (let i = 0; i < 200 && (await page.evaluate<boolean>(`document.querySelector('.desk')?.dataset.busy === '1' || !!document.querySelector('.screen-over.leaving')`)); i++) await sleep(40); };
  const press = async (selector: string, index = 0) => { const at = await centre(page, selector, index); if (at) await page.click(...at); return !!at; };
  for (const [index, manager] of ['Dex', 'Mags'].entries()) {
    await page.navigate(`${url}?seed=20261017`, 1500);
    await watchKeyframes(page);
    await page.evaluate(`delete document.documentElement.dataset.motion`);
    for (let i = 0; i < 100 && !(await centre(page, '.title-screen .begin')); i++) await sleep(50);
    await sleep(400);
    await press('.title-screen .begin');
    await sleep(900);
    await press('.season-card .into');
    await sleep(1500);
    await press('.manager-choice .choose', index);
    await sleep(700);
    await idle();
    await press('.offers .take', 0);
    await sleep(400);
    await idle();
    await page.evaluate(`window.__stay = { max: 0, drops: [] }; window.__stayTimer = setInterval(() => {
      const n = [...document.querySelectorAll('.desk .bubbles .bub[data-k]')].filter((el) => Number(getComputedStyle(el).opacity) > 0.05).length;
      if (n < window.__stay.max) window.__stay.drops.push(n + ' after ' + window.__stay.max);
      window.__stay.max = Math.max(window.__stay.max, n);
    }, 90);`);
    let plays = 0;
    let picks = 0;
    for (let round = 0; round < 8; round++) {
      await idle();
      if (round % 2 === 1 && (await press('.desk .pp.pos1'))) picks++;
      await sleep(300);
      const card = await page.evaluate<number>(`[...document.querySelectorAll('.desk .hand .card')].findIndex((c) => c.getAttribute('aria-disabled') === 'false')`);
      if (card < 0) break;
      const at = await cardPoint(page, card);
      if (!at) break;
      await page.move(...at);
      await sleep(250);
      await page.click(...at);
      plays++;
      await sleep(1600);
    }
    await sleep(1200);
    const stay = await page.evaluate<{ max: number; drops: string[] }>(`(() => { clearInterval(window.__stayTimer); return window.__stay; })()`);
    if (stay.max === 0) out.push([`bubbles stay (${manager}): no message this month`, 'skipped']);
    else out.push([`bubbles stay through ${plays} plays and ${picks} paper picks (${manager}, ${stay.max} shown)${stay.drops.length ? ': dropped ' + stay.drops.slice(0, 3).join(', ') : ''}`, stay.drops.length === 0 && plays > 0]);
  }
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
    await page.click(...await neutral(page));
    await sleep(300);
    out.push(['a click elsewhere closes the row', !(await page.evaluate<boolean>(`!!document.querySelector('.desk .rx-bar')`))]);
  }
  const metro = await centre(page, '.desk .metro');
  if (!metro) out.push(['metronome: not on this desk', 'skipped']);
  else {
    // This interaction explicitly exercises ambient motion; replay itself is static.
    await page.evaluate(`document.documentElement.dataset.motion='full'`);
    await sleep(100);
    const angle = () => page.evaluate<string>(`document.querySelector('.desk .metro-arm').style.transform`);
    // A periodic swing can have equal angles at two distinct instants. Observe the
    // intermediate positions in the same 300ms window rather than just its endpoints.
    const moving=async(count:number,gap:number)=>{
      const angles=[await angle()];
      for(let i=0;i<count;i++){await sleep(gap);angles.push(await angle());}
      console.log(`  metronome ${page.name}: motion samples ${JSON.stringify(angles)}`);
      return new Set(angles).size>1;
    };
    out.push(['the metronome swings', await moving(3,100)]);
    await page.click(...metro);
    // The reference caps each frame's elapsed time at 50ms. A low-frame-rate WebKit window can
    // therefore take longer than 2.8s in wall time to finish its stroke and settle. Observe the
    // stable centre before restarting; keep a deadline so a lost click still fails the check.
    const stopStarted = performance.now();
    let s1 = await angle();
    let zeroSamples = 0;
    while (performance.now() - stopStarted < 7000 && zeroSamples < 3) {
      await sleep(100);
      s1 = await angle();
      zeroSamples = /rotate\(0(\.0+)?deg\)/.test(s1) ? zeroSamples + 1 : 0;
    }
    console.log(`  metronome ${page.name}: stable centre ${zeroSamples >= 3 ? 'after' : 'not reached within'} ${Math.round(performance.now() - stopStarted)}ms`);
    await sleep(300);
    out.push(['a click settles it at the centre', zeroSamples >= 3 && s1 === (await angle())]);
    await page.click(...metro);
    await sleep(700);
    out.push(['another click swings it again', await moving(5,50)]);
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
  await page.move(...await neutral(page));
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
  await page.move(...await neutral(page));
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
  await page.move(...await neutral(page));
  await sleep(400);
  const after = await look();
  out.push(['a click plays it: one card fewer, a bulb darker', after.cards === before.cards - 1 && after.used > before.used]);
  for (let k = 0; k < 4; k++) {
    const idx = await page.evaluate<number>(`[...document.querySelectorAll('.desk .hand .card')].findIndex((c) => c.getAttribute('aria-disabled') === 'false')`);
    if (idx < 0) break;
    await page.click(...((await cardPoint(page, idx)) as [number, number]));
    await page.move(...await neutral(page));
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
  // A panel opens from its button in the stat bar and closes from its own (round R1, Part G).
  const panel = async (opener: string, id: string): Promise<boolean> => {
    await page.click(...((await centre(page, opener)) as [number, number]));
    await sleep(300);
    const opened = await page.evaluate<boolean>(`!!document.querySelector('.p-${id}')`);
    const close = await centre(page, `.p-${id} .closeb`);
    if (close) await page.click(...close);
    await sleep(300);
    return opened && !(await page.evaluate<boolean>(`!!document.querySelector('.p-${id}')`));
  };
  out.push(['the deck opens from the stat bar and closes', await panel('.desk .deckbtn', 'deck')]);
  out.push(['House rules open from the stat bar and close', await panel('.desk .setbtn', 'settings')]);
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
    for (const size of sizesFromArgs(process.argv)) {
    const page = await launch(browser, size);
    try {
      const results = [...(await tooltips(page, url)), ...(await bubblesAndMetronome(page, url)), ...(await papers(page, url)), ...(await hand(page, url)), ...(await bubblesStay(page, url)), ...(await hoversEase(page, url)), ...(await monthCues(page, url))];
      // Every keyframe animated over the runs, CSS-valid (round R5, B3): the phone's shake, the hand, the month's pile.
      const rejected = await badKeyframes(page);
      results.push([`no keyframe value CSS rejects${rejected.length ? `: ${rejected.slice(0, 3).map((b) => `${b.element} ${b.property}: ${b.value}`).join('; ')}` : ''}`, rejected.length === 0]);
      const passed = results.filter(([, ok]) => ok === true).length;
      const skipped = results.filter(([, ok]) => ok === 'skipped').length;
      console.log(`interactions, ${browser} ${size.width}x${size.height}: ${passed} of ${results.length - skipped} pass${skipped ? `, ${skipped} skipped` : ''}`);
      for (const [what, ok] of results) if (ok !== true) console.log(`  ${ok === 'skipped' ? 'skipped' : 'FAIL'}  ${what}`);
      if (results.some(([, ok]) => ok === false)) failed = true;
    } finally {
      mkdirSync('check/out',{recursive:true});
      writeFileSync(`check/out/interactions-${browser}-${size.width}-${Date.now()}.json`,JSON.stringify(page.diagnostics,null,2));
      await page.close();
    }
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
