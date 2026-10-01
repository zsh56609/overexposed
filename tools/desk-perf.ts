// npm run desk:perf — the desk's performance on the production build (round V1a): the cold load to the title's
// first contentful paint, the first desk (from choosing the manager to the desk painted), a play (from taking the
// first offer to the hand painted), and frame times while the mouse sweeps across the hand and while the papers
// are switched — in headless Chrome unthrottled and at 4× CPU throttling (a slow laptop), and in headless Firefox.
// Builds into dist/ first, then serves it with Vite's preview server.
//
// Usage: node tools/desk-perf.ts [--browsers=chrome,firefox] [--throttle=1,4] [--no-build]
// Headless Firefox renders in software: its frame times are pessimistic.

import { build, preview } from 'vite';
import { browsersFromArgs, launch, type BrowserName } from '../check/browser.ts';
import { ROOT } from '../check/desk-replay.ts';

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const BROWSERS = browsersFromArgs(args);
const THROTTLES = flag('throttle', '1,4').split(',').map(Number);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const FRAMES = `(() => { window.__frames = []; let last = performance.now(); window.__on = true; const tick = (t) => { window.__frames.push(t - last); last = t; if (window.__on) requestAnimationFrame(tick); }; requestAnimationFrame(tick); })()`;
const STOP = `(() => { window.__on = false; const f = window.__frames.slice(1).sort((a, b) => a - b); const q = (p) => +f[Math.min(f.length - 1, Math.floor(f.length * p))].toFixed(1); return { frames: f.length, p50: q(0.5), p95: q(0.95), max: +f.at(-1).toFixed(1), over20: f.filter((x) => x > 20).length, over33: f.filter((x) => x > 33.4).length }; })()`;
type Frames = { frames: number; p50: number; p95: number; max: number; over20: number; over33: number };

async function measure(browser: BrowserName, throttle: number, url: string) {
  const page = await launch(browser, { width: 1280, height: 720 });
  try {
    await page.throttle(throttle);
    await page.navigate(`${url}?seed=3319043840`, 4000);
    const fcp = await page.evaluate<number | null>(`(() => { const p = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint'); return p ? Math.round(p.startTime) : null; })()`);
    await page.evaluate(`document.querySelector('button.big').click()`);
    await sleep(500);
    const first = await page.evaluate<{ managerToDesk: number; offerToHand: number }>(`(async () => {
      const painted = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const t0 = performance.now();
      document.querySelector('.manager-choice .choose').click();
      while (!document.querySelector('.desk')) await new Promise((r) => setTimeout(r, 1));
      await painted();
      const desk = performance.now() - t0;
      await new Promise((r) => setTimeout(r, 1500)); // the first desk settles (its photographs decode)
      const t1 = performance.now();
      document.querySelector('.draft .take').click();
      while (!document.querySelector('.desk .hand .card')) await new Promise((r) => setTimeout(r, 1));
      await painted();
      return { managerToDesk: Math.round(desk), offerToHand: Math.round(performance.now() - t1) };
    })()`);
    await sleep(800);
    await page.evaluate(FRAMES);
    for (let k = 0; k < 3; k++) {
      for (let x = 160; x <= 930; x += 14) await page.move(x, 600);
      for (let x = 930; x >= 160; x -= 14) await page.move(x, 600);
    }
    const hand = await page.evaluate<Frames>(STOP);
    await page.move(640, 300);
    await sleep(500);
    await page.evaluate(FRAMES);
    for (let k = 0; k < 10; k++) {
      const at = await page.evaluate<[number, number]>(`(() => { const p = [...document.querySelectorAll('.desk .pp')].find((x) => !x.classList.contains('pos0')); const r = p.getBoundingClientRect(); return [r.x + r.width / 2, r.y + 12]; })()`);
      await page.click(...at);
      await sleep(600);
    }
    const papers = await page.evaluate<Frames>(STOP);
    return { fcp, ...first, hand, papers };
  } finally {
    await page.close();
  }
}

if (!args.includes('--no-build')) await build({ root: ROOT, logLevel: 'warn' });
const server = await preview({ root: ROOT, logLevel: 'warn', preview: { port: 4174, strictPort: false } });
const url = server.resolvedUrls?.local[0] as string;
try {
  console.log('browser  throttle  FCP ms  first desk ms  play ms  hand sweep (frames · p95 · max · >20ms)  paper switch (frames · p95 · max · >20ms)');
  for (const browser of BROWSERS) {
    for (const throttle of browser === 'chrome' ? THROTTLES : [1]) {
      const r = await measure(browser, throttle, url);
      const f = (x: Frames) => `${x.frames} · ${x.p95} · ${x.max} · ${x.over20}`;
      console.log(`${browser.padEnd(8)} ${String(throttle + '×').padEnd(9)} ${String(r.fcp).padEnd(7)} ${String(r.managerToDesk).padEnd(14)} ${String(r.offerToHand).padEnd(8)} ${f(r.hand).padEnd(42)} ${f(r.papers)}`);
    }
  }
} finally {
  await new Promise<void>((r) => server.httpServer.close(() => r()));
}
