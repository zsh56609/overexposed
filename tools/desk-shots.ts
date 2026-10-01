// npm run desk:shots — screenshots of the game in recorded states, or of every screen of a run (round V1a).
//
//   npm run desk:shots -- s02 s07:paper=flash s10:tip=craft      the states of check/desk-states.json, each with
//                                                                 an optional finishing touch (check/desk-replay.ts:
//                                                                 tip=<cell>, paper=<id>, hover=<n>, bubble, tapback)
//   npm run desk:shots -- --all                                   every recorded state
//   npm run desk:shots -- --screens                               one seeded run, every screen once: the title, the
//                                                                 credits, the manager choice, a draft of three and
//                                                                 of four, after an extra pick and a reroll, the deck,
//                                                                 a season door, the last door, the hand, the ending
// Options: --browser=chrome|firefox, --size=1280x720 (m for a phone), --out=check/out/shots, --seed= (screens).
// Runs the Vite dev server in-process; the shots are PNG files named after the state or screen.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { launch, sizesFromArgs, type BrowserName, type Page } from '../check/browser.ts';
import { loadStates, post, reach, ROOT } from '../check/desk-replay.ts';

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const browser = flag('browser', 'chrome') as BrowserName;
const size = sizesFromArgs([`--sizes=${flag('size', '1280x720')}`])[0] as { width: number; height: number; mobile: boolean };
const out = flag('out', join(ROOT, 'check', 'out', 'shots'));
const specs = args.filter((a) => !a.startsWith('--'));
mkdirSync(out, { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One seeded run through every screen, a shot of each the first time it shows. */
async function screens(page: Page, url: string): Promise<string[]> {
  const shot = async (name: string) => {
    const file = join(out, `screen-${name}.png`);
    await page.screenshot(file);
    return file;
  };
  const saved: string[] = [];
  const click = (selector: string, index = 0) => page.evaluate<boolean>(`(() => { const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}]; if (!el || el.disabled) return false; el.click(); return true; })()`);
  await page.navigate(`${url}?seed=${flag('seed', '3319043840')}`, 3000);
  saved.push(await shot('title'));
  await click('.credits-open');
  await sleep(300);
  saved.push(await shot('credits'));
  await click('.plain.credits button');
  await sleep(200);
  await click('button.big');
  await sleep(400);
  saved.push(await shot('manager'));
  await click('.manager-choice .choose', 0); // Dex: a fourth card on each offer
  await sleep(600);
  const seen = new Set<string>();
  for (let guard = 0; guard < 400; guard++) {
    const screen = await page.evaluate<string>(`document.querySelector('.ending') ? 'ending' : document.querySelector('.draft') ? 'draft' : document.querySelector('.gates') ? 'doors' : 'hand'`);
    if (screen === 'ending') {
      await sleep(400);
      saved.push(await shot('ending'));
      break;
    }
    if (screen === 'draft') {
      const n = await page.evaluate<number>(`document.querySelectorAll('.draft .card.offer').length`);
      const picks = await page.evaluate<string>(`document.querySelector('.draft h2')?.textContent ?? ''`);
      if (!seen.has(`draft${n}`)) {
        seen.add(`draft${n}`);
        saved.push(await shot(`draft-${n}-offers`));
      }
      if (/2/.test(picks) && !seen.has('extra')) {
        seen.add('extra');
        saved.push(await shot('draft-after-extra-pick'));
      }
      if (!seen.has('deck')) {
        seen.add('deck');
        await click('.desk .deckbtn');
        await sleep(300);
        saved.push(await shot('deck'));
        await click('.deck-viewer .row button');
        await sleep(200);
      }
      // An extra pick once there is money for it; a reroll once; then a card.
      if (!seen.has('extraTaken') && (await click('.draft > .row > button', 0))) {
        seen.add('extraTaken');
      } else if (!seen.has('reroll') && (await click('.draft > .row > button', 1))) {
        seen.add('reroll');
        await sleep(300);
        saved.push(await shot('draft-after-reroll'));
      } else await click('.draft .take', 0);
      await sleep(300);
      continue;
    }
    if (screen === 'doors') {
      const last = await page.evaluate<boolean>(`!!document.querySelector('.gates')?.textContent?.match(/year|ending|night/i)`);
      const name = last ? 'last-door' : 'season-door';
      if (!seen.has(name)) {
        seen.add(name);
        saved.push(await shot(name));
      }
      await click('.gates .take', 0);
      await sleep(400);
      continue;
    }
    if (!seen.has('hand')) {
      seen.add('hand');
      saved.push(await shot('hand'));
    }
    // Play what can be played, then end the month.
    if (!(await click('.desk .hand .card[aria-disabled="false"]'))) await click('.desk .endbtn');
    await sleep(150);
  }
  return saved;
}

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5192, strictPort: false } });
await server.listen();
const url = server.resolvedUrls?.local[0] as string;
const page = await launch(browser, size);
try {
  if (args.includes('--screens')) {
    for (const f of await screens(page, url)) console.log('saved', f);
  } else {
    const states = loadStates();
    const list = args.includes('--all') ? Object.keys(states) : specs;
    if (list.length === 0) console.log('name a state (see check/desk-states.json), or pass --all or --screens');
    for (const spec of list) {
      // A state's name, then ':' and a finishing touch if any; names may hold ':' themselves (card:<id>, ending:<id>).
      const at = states[spec] ? -1 : [...spec.matchAll(/:/g)].map((m) => m.index).reverse().find((i) => states[spec.slice(0, i)]) ?? -1;
      const [key, touch] = at < 0 ? [spec, undefined] : [spec.slice(0, at), spec.slice(at + 1)];
      const state = states[key];
      if (!state) {
        console.log(`no state ${key}`);
        continue;
      }
      const r = await reach(page, url, state);
      await post(page, touch);
      const file = join(out, `${key.replace(/[^a-z0-9]+/gi, '_')}${touch ? '-' + touch.replace(/[^a-z0-9]+/gi, '_') : ''}.png`);
      await page.screenshot(file);
      console.log(`${key}${touch ? ':' + touch : ''} ${r} (${state.note}) → ${file}`);
    }
  }
} finally {
  await page.close();
  await server.close();
}
