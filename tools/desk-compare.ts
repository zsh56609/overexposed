// npm run desk:compare — the game beside the visual reference's shots 01–14 (round V1a): each shot's nearest
// recorded state (check/desk-states.json) replayed in headless Chrome at 1280x720 and saved as a JPEG in
// check/out/compare/, with an index.html that shows each next to its mockup shot. An output, never committed
// (round R1); the comparison V1a committed is in the history at 92d97c9, docs/handoff/v1a-compare/.
//
//   01 s01b · 02 s02 · 03 s03b · 04 s04 · 05 s05 · 07 s07 · 08 s07 with The Daily Flash pulled forward · 09 s09 ·
//   10 s10 with craft's tooltip · 11 s10 with a heart on the first bubble and the row open on the last ·
//   12 the title · 13 the manager choice · 14 the awards night after s09's year.
//
// Usage: node tools/desk-compare.ts [--out=check/out/compare] [--browser=chrome]

import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createServer } from 'vite';
import { launch, type BrowserName } from '../check/browser.ts';
import { loadStates, post, reach, ROOT } from '../check/desk-replay.ts';

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const OUT = flag('out', join(ROOT, 'check', 'out', 'compare'));
const SHOTS_DIR = join(ROOT, 'docs', 'design', 'visual', 'shots');
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
  console.log('12 title · 13 manager choice · 14 awards night');
  // The page: each mockup shot beside the game's.
  const mockups = readdirSync(SHOTS_DIR);
  const rows = [...SHOTS.map(([shot]) => shot), '12', '13', '14'].map((shot) => {
    const mockup = mockups.find((f) => f.startsWith(`${shot}-`));
    const src = mockup ? relative(OUT, join(SHOTS_DIR, mockup)).split(sep).join('/') : '';
    return `<section><h2>${shot}${mockup ? ` · ${mockup.replace(/^\d+-|\.jpg$/g, '')}` : ''}</h2><div class="pair"><figure><img src="${src}" alt=""><figcaption>Mockup</figcaption></figure><figure><img src="${shot}.jpg" alt=""><figcaption>Game</figcaption></figure></div></section>`;
  });
  writeFileSync(
    join(OUT, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Desk comparison</title><style>body{margin:0;background:#15120E;color:#EDE6D6;font:15px/1.5 system-ui,sans-serif}section{max-width:1400px;margin:0 auto;padding:16px;border-top:1px solid rgba(237,230,214,.15)}h2{font:700 18px Georgia,serif;margin:0 0 8px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}figure{margin:0}img{width:100%;display:block}figcaption{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9c8e7b}</style>${rows.join('')}`,
  );
  console.log(`→ ${OUT} (open index.html)`);
} finally {
  await page.close();
  await server.close();
}
