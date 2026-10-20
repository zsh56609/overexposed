// node check/years.ts — four years from the title by real input (round R8c's acceptance): one per rival arc and, between
// them, each of Juno's four terms. A seed fixes the arc (core's rivalArc); the replies to her are chosen for the terms —
// with her (warm); declining her, then against her (cold); taking no side (neutral); and a year she never comes (unmet).
// A year that misses its terms is played again on the arc's next seed. Each year is played for Hype and the heat that
// comes with it, through the awards night: the arc, the terms, her line and her last word, the awards and the layout
// they took, the backdrop, and no console error. Chromium at 1280×720 unless --browsers and --sizes say otherwise.
// Runs the Vite dev server in-process. Usage: node check/years.ts [--browsers=chrome] [--sizes=1280x720] [--tries=6]

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { browsersFromArgs, launch, sizesFromArgs, type Page } from './browser.ts';
import { cardPoint, centre, openReady, ROOT } from './desk-replay.ts';
import { indexContent, rivalArc, type RivalTerms } from '../core/index.ts';
import { loadContent } from '../sim/content.ts';

const BROWSERS = browsersFromArgs(process.argv, 'chrome');
const SIZES = sizesFromArgs(process.argv, '1280x720');
const TRIES = Number(process.argv.find((a) => a.startsWith('--tries='))?.split('=')[1] ?? 6);
const en = JSON.parse(readFileSync(join(ROOT, 'i18n', 'en.json'), 'utf8')) as Record<string, string>;
const c = indexContent(loadContent());
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Pt = [number, number];

/** The four years: an arc each, its terms, its manager (the two in turn). */
const YEARS: readonly { readonly arc: string; readonly terms: RivalTerms; readonly manager: number }[] = [
  { arc: 'breakthrough', terms: 'unmet', manager: 0 },
  { arc: 'crash', terms: 'cold', manager: 1 },
  { arc: 'crossover', terms: 'neutral', manager: 0 },
  { arc: 'fade', terms: 'warm', manager: 1 },
];

/** The seeds that give an arc, in order. */
function seedsFor(arc: string, n: number): number[] {
  const out: number[] = [];
  for (let seed = 1; out.length < n && seed < 10_000; seed++) if (rivalArc(c, seed)?.id === arc) out.push(seed);
  return out;
}

/** A diagnostic that is an error: a thrown exception or an error logged — the optional favicon's 404 aside. */
const isError = (line: string): boolean => /"type":"error"|exceptionThrown|"level":"error"|^pageerror|^error:/.test(line) && !(line.includes('/favicon.ico') && line.includes('404'));

const IDLE = `document.querySelector('.desk')?.dataset.busy === '1' || !!document.querySelector('.screen-over.leaving')`;
async function idle(page: Page): Promise<void> {
  for (let i = 0; i < 300 && (await page.evaluate<boolean>(IDLE)); i++) await sleep(40);
}
const neutral = (page: Page) => page.evaluate<Pt>(`(() => { const r = document.querySelector('.stage').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height * 300 / 720]; })()`);
const WHERE = `(() => {
  const q = (s) => document.querySelector(s);
  return q('.ending') ? 'ending' : q('.title-screen:not(.dim) .begin') ? 'title' : q('.season-card .into') ? 'season' : q('.manager-choice .choose') ? 'manager'
    : q('.scr.offers') ? 'offers' : q('.scr.gates') ? 'doors' : q('.event-screen') ? 'event' : q('.desk .endbtn') ? 'play' : 'other';
})()`;

/** A reply to Juno for the terms: with her for warm; against her where there is a choice to be, else no side, for cold; no side for neutral and unmet. */
function replyFor(eventId: string, enabled: readonly number[], terms: RivalTerms): number {
  const event = c.events.find((e) => e.id === eventId);
  if (!event || event.category !== 'rival') return enabled[0] ?? 0;
  const stance = (i: number) => event.choices[i]?.stance;
  const pick = (want: (i: number) => boolean) => enabled.find(want);
  if (terms === 'warm') return pick((i) => stance(i) === 'with') ?? enabled[0] ?? 0;
  if (terms === 'cold') return pick((i) => stance(i) === 'against') ?? pick((i) => stance(i) === undefined) ?? enabled[0] ?? 0;
  return pick((i) => stance(i) === undefined) ?? enabled[0] ?? 0;
}

/** One move of the year by real input: a screen's choice (Juno's replies for the terms), else a play for Hype and heat, else END TURN. */
async function move(page: Page, manager: number, terms: RivalTerms, met: string[]): Promise<string> {
  const tap = async (at: Pt | null) => {
    if (at) await page.click(at[0], at[1]);
  };
  const enabled = (sel: string) => page.evaluate<number[]>(`[...document.querySelectorAll(${JSON.stringify(sel)})].flatMap((b, i) => (!b.disabled && b.getAttribute('aria-disabled') !== 'true' ? [i] : []))`);
  const where = await page.evaluate<string>(WHERE);
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
    const [i] = await enabled(sel);
    if (i !== undefined) await tap(await centre(page, sel, i));
    await sleep(1600);
  } else if (where === 'event') {
    for (let k = 0; k < 80; k++) {
      const open = await enabled('.event-screen .choose');
      if (open.length) {
        const id = await page.evaluate<string>(`document.querySelector('.event-screen')?.dataset.event ?? ''`);
        const choices = await page.evaluate<number[]>(`[...document.querySelectorAll('.event-screen .choose')].map((b) => Number(b.dataset.choice))`);
        const pick = replyFor(id, open.map((i) => choices[i] as number), terms);
        if (c.events.find((e) => e.id === id)?.category === 'rival') met.push(`${id} ${'abc'[pick]}`);
        await tap(await centre(page, '.event-screen .choose', choices.indexOf(pick)));
        break;
      }
      await sleep(250);
    }
    await sleep(2500);
  } else if (where === 'play') {
    const i = await page.evaluate<number>(`(() => {
      const ok = [...document.querySelectorAll('.desk .hand .card')].map((card, i) => [card, i]).filter(([card]) => card.getAttribute('aria-disabled') === 'false');
      const gain = (card, k) => Math.max(0, ...[...card.querySelectorAll('.r-' + k)].map((x) => Number((x.textContent.match(/\\+(\\d+)/) ?? [])[1] ?? 0)));
      const most = ok.reduce((best, x) => (best === null || gain(x[0], 'hype') + gain(x[0], 'heat') > gain(best[0], 'hype') + gain(best[0], 'heat') ? x : best), null);
      return (most ?? ok[0])?.[1] ?? -1;
    })()`);
    if (i >= 0) await tap(await cardPoint(page, i));
    else await tap(await centre(page, '.desk .endbtn'));
    await page.move(...(await neutral(page)));
    await sleep(i >= 0 ? 1400 : 3500);
  } else await sleep(300);
  return where;
}

/** The night as it stands: her line and last word, the awards and their layout, the backdrop. */
interface Night {
  readonly line: string | null;
  readonly word: string | null;
  readonly awards: string[];
  readonly box: string;
  readonly backdrop: { readonly scene: string | null; readonly w: number; readonly h: number } | null;
}
const NIGHT = `(() => {
  const q = (s) => document.querySelector(s);
  const img = q('.awards-night .backdrop');
  return {
    line: q('.awards-night .a-rival')?.textContent ?? null,
    word: q('.awards-night .rivalword .bub')?.textContent ?? null,
    awards: [...document.querySelectorAll('.awards-night .plaques [data-award]')].map((e) => e.dataset.award),
    box: q('.awards-night .plaques .pl.rest')?.classList.contains('wide') ? 'two plaques and a wide box' : q('.awards-night .plaques .pl.rest') ? 'three plaques and the fourth box' : 'plaques only',
    backdrop: img ? { scene: img.dataset.scene ?? null, w: img.naturalWidth, h: img.naturalHeight } : null,
  };
})()`;
const keyOf = (text: string | null): string | null => (text === null ? null : (Object.entries(en).find(([k, v]) => k.startsWith('rival.') && v === text)?.[0] ?? null));

/** A year from the title to the awards night on `seed`, its replies to Juno for `terms`. */
async function year(page: Page, url: string, seed: number, manager: number, terms: RivalTerms) {
  await openReady(page, `${url}?seed=${seed}`);
  const met: string[] = [];
  for (let guard = 0; guard < 900 && (await page.evaluate<string>(WHERE)) !== 'ending'; guard++) {
    await idle(page);
    await move(page, manager, terms, met);
  }
  // The night revealed, and the backdrop time to come.
  for (let k = 0; k < 120 && !(await page.evaluate<boolean>(`!!document.querySelector('.awards-night.shown')`)); k++) await sleep(250);
  await sleep(1500);
  const night = await page.evaluate<Night>(NIGHT);
  const lineKey = keyOf(night.line);
  const wordKey = keyOf(night.word);
  const got: RivalTerms = wordKey === null ? 'unmet' : (wordKey.split('.').at(-1) as RivalTerms);
  return { night, lineKey, wordKey, got, met, errors: page.diagnostics.filter(isError) };
}

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5199, strictPort: false } });
await server.listen();
const url = server.resolvedUrls?.local[0] as string;
let failed = false;
try {
  for (const browser of BROWSERS)
    for (const size of SIZES)
      for (const want of YEARS) {
        let done = false;
        for (const seed of seedsFor(want.arc, TRIES)) {
          const page = await launch(browser, size);
          try {
            const r = await year(page, url, seed, want.manager, want.terms);
            const tag = `${browser} ${size.width}x${size.height} seed ${seed} (${want.arc}, ${c.managers?.managers[want.manager]?.id ?? '-'})`;
            if (r.got !== want.terms) {
              console.log(`  ${tag}: her terms came ${r.got}, not ${want.terms} (answered: ${r.met.join(', ') || 'none'}): the arc's next seed`);
              continue;
            }
            done = true;
            const ok = r.errors.length === 0 && !!r.night.backdrop && r.night.backdrop.w > 0 && r.lineKey !== null && (want.terms === 'unmet') === (r.wordKey === null);
            if (!ok) failed = true;
            console.log(`${ok ? 'PASS' : 'FAIL'} ${tag}: ${want.terms} (answered: ${r.met.join(', ') || 'none'})`);
            console.log(`  her line ${r.lineKey ?? `? "${r.night.line}"`}; her last word ${r.wordKey ?? 'none'}`);
            console.log(`  awards ${r.night.awards.length} (${r.night.box}): ${r.night.awards.join(', ')}`);
            console.log(`  backdrop ${r.night.backdrop ? `${r.night.backdrop.scene} ${r.night.backdrop.w}x${r.night.backdrop.h}` : 'none'}; console errors ${r.errors.length}${r.errors.length ? `: ${r.errors.slice(0, 2).join('; ').slice(0, 300)}` : ''}`);
            break;
          } finally {
            await page.close();
          }
        }
        if (!done) {
          failed = true;
          console.log(`FAIL ${want.arc}: no seed of ${TRIES} gave ${want.terms}`);
        }
      }
  console.log(failed ? 'FAIL: a year missed its terms, its night, or an error came' : 'PASS: four years, the four arcs and the four terms, each through its night');
} catch (err) {
  failed = true;
  console.error(`years check: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
