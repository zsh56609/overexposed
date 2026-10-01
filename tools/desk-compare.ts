// npm run desk:compare — the game beside the visual reference's shots 01–14 (round V1a): each shot's nearest
// recorded state (check/desk-states.json) replayed in headless Chrome at 1280x720 and saved as a JPEG in
// docs/handoff/v1a-compare/, whose index.html shows each next to its mockup shot.
//
//   01 s01b · 02 s02 · 03 s03b · 04 s04 · 05 s05 · 07 s07 · 08 s07 with The Daily Flash pulled forward · 09 s09 ·
//   10 s10 with craft's tooltip · 11 s10 with a heart on the first bubble and the row open on the last ·
//   12 the title · 13 the manager choice · 14 the ending after s09's year (screens of round V2, still plain).
//
// Usage: node tools/desk-compare.ts [--out=docs/handoff/v1a-compare] [--browser=chrome]

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { launch, type BrowserName } from '../check/browser.ts';
import { loadStates, post, reach, ROOT } from '../check/desk-replay.ts';

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const OUT = flag('out', join(ROOT, 'docs', 'handoff', 'v1a-compare'));
mkdirSync(OUT, { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Shot → the recorded state and its finishing touch. */
const SHOTS: [string, string, string?][] = [
  ['01', 's01b'],
  ['02', 's02'],
  ['03', 's03b'],
  ['04', 's04'],
  ['05', 's05'],
  ['07', 's07'],
  ['08', 's07', 'paper=flash'],
  ['09', 's09'],
  ['10', 's10', 'tip=craft'],
  ['11', 's10', 'tapback'],
];

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5193, strictPort: false } });
await server.listen();
const url = server.resolvedUrls?.local[0] as string;
const page = await launch(flag('browser', 'chrome') as BrowserName, { width: 1280, height: 720 });
const states = loadStates();
try {
  for (const [shot, key, touch] of SHOTS) {
    const state = states[key];
    if (!state) throw new Error(`no recorded state ${key}: run npm run desk:states`);
    const r = await reach(page, url, state, 900);
    if (r !== 'ok') throw new Error(`${key} ${r}: run npm run desk:states`);
    await post(page, touch);
    await page.screenshot(join(OUT, `${shot}.jpg`));
    console.log(`${shot} ← ${key}${touch ? ':' + touch : ''} (${state.note})`);
  }
  // 12 and 13: the title and the manager choice.
  const s09 = states.s09;
  if (!s09) throw new Error('no recorded state s09: run npm run desk:states');
  await page.navigate(`${url}?seed=${s09.seed}`, 2500);
  await page.screenshot(join(OUT, '12.jpg'));
  await page.evaluate(`document.querySelector('button.big').click()`);
  await sleep(700);
  await page.screenshot(join(OUT, '13.jpg'));
  // 14: s09's year to its end — END TURN, then the last door.
  await reach(page, url, s09);
  await page.evaluate(`document.querySelector('.desk .endbtn').click()`);
  await sleep(600);
  await page.evaluate(`document.querySelector('.gates .take')?.click()`);
  await sleep(1200);
  await page.screenshot(join(OUT, '14.jpg'));
  console.log('12 title · 13 manager choice · 14 ending:', await page.evaluate<string>(`document.querySelector('.ending h1')?.textContent ?? '?'`));
  console.log(`→ ${OUT} (open index.html)`);
} finally {
  await page.close();
  await server.close();
}
