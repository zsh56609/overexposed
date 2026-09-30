// npm run check:clicks — nothing may swallow a click aimed at a card or END TURN.
//
// The author's automated playthrough found the floating preview intercepting clicks meant for the cards and
// END TURN beneath it. The preview is display-only (pointer-events: none); this check keeps it that way.
// In the style of the stage overflow audits: seeded runs played through the real UI in headless Chrome,
// and at every play state, with the floating preview open over each card position and over END TURN,
// every card and END TURN — the hovered one included — must be the element a click at its centre, and
// near each corner, would reach. A hover that opens no preview fails too, so the check is never vacuous.
//
// Runs the Vite dev server in-process and needs Chrome or Edge (CHROME_PATH overrides the search).
// Usage: node check/clicks.ts [--runs=4] [--size=1280x720]

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name: string, fallback: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const RUNS = Number(arg('runs', '4'));
const [WIDTH, HEIGHT] = arg('size', '1280x720').split('x').map(Number) as [number, number];

const CHROMES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const chrome = CHROMES.find((p): p is string => !!p && existsSync(p));
if (!chrome) {
  console.error('click-through check: no Chrome or Edge found; set CHROME_PATH');
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs in the page: plays RUNS seeded runs by DOM and hit-tests every target under every preview. */
const DRIVE = (runs: number) => `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let rnd = 20260929;
  const rand = (k) => { rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0; return (rnd >>> 8) % k; };
  const blocked = {};
  const note = (m) => { blocked[m] = (blocked[m] || 0) + 1; };
  const stats = { runs: 0, states: 0, hovers: 0, targets: 0, points: 0 };
  const POINTS = [[0.5, 0.5], [0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]];
  const name = (el, cards, end) => (el === end ? 'END TURN' : 'card ' + (cards.indexOf(el) + 1) + ' of ' + cards.length);
  const describe = (el) => !el ? 'nothing' : el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\\s+/).join('.') : '') + (el.closest('.floating') ? ' (inside .floating)' : '');
  const hitBy = (target) => {
    const r = target.getBoundingClientRect();
    for (const [fx, fy] of POINTS) {
      stats.points++;
      const top = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
      if (!top || !(top === target || target.contains(top))) return top;
    }
    return null;
  };
  document.querySelector('button.big').click();
  await sleep(40);
  for (let run = 0; run < ${runs}; run++) {
    let guard = 0;
    while (!document.querySelector('.ending') && guard++ < 600) {
      stats.states++;
      if (document.querySelector('.manager-choice')) {
        const take = [...document.querySelectorAll('.manager-choice .choose')].filter((b) => !b.disabled);
        take[rand(take.length)].click();
      } else if (document.querySelector('.draft')) {
        const take = [...document.querySelectorAll('.draft .take')].filter((b) => !b.disabled);
        take[rand(take.length)].click();
      } else if (document.querySelector('.gates')) {
        const take = [...document.querySelectorAll('.gates .take')].filter((b) => !b.disabled);
        take[rand(take.length)].click();
      } else {
        const cards = [...document.querySelectorAll('.hand .card')];
        const end = document.querySelector('button.end');
        const targets = [...cards, end];
        for (const source of targets) {
          source.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
          await sleep(3);
          stats.hovers++;
          if (!document.querySelector('.floating')) note('no preview opened over ' + name(source, cards, end));
          for (const target of targets) {
            stats.targets++;
            const by = hitBy(target);
            if (by) note(name(target, cards, end) + ' blocked by ' + describe(by) + ' while previewing ' + name(source, cards, end));
          }
          source.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }));
          await sleep(1);
        }
        const playable = cards.filter((c) => c.getAttribute('aria-disabled') !== 'true');
        if (playable.length && rand(6)) playable[rand(playable.length)].click();
        else end.click();
      }
      await sleep(3);
    }
    stats.runs++;
    document.querySelector('button.play-again')?.click();
    await sleep(20);
  }
  return { ...stats, blocked: Object.entries(blocked).sort((a, b) => b[1] - a[1]) };
})()`;

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5190, strictPort: false } });
await server.listen();
const url = server.resolvedUrls?.local[0];
const profile = mkdtempSync(join(tmpdir(), 'overexposed-clicks-'));
const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${WIDTH},${HEIGHT}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', 'about:blank'], { stdio: 'ignore' });
let failed = true;
try {
  if (!url) throw new Error('the dev server did not start');
  let port = 0;
  for (let i = 0; i < 80 && !port; i++) {
    await sleep(250);
    try {
      port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
    } catch {
      // not written yet
    }
  }
  if (!port) throw new Error('Chrome did not open a DevTools port');
  const pages = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
  const page = pages.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map<number, (m: { result?: { result?: { value?: unknown }; exceptionDetails?: { exception?: { description?: string } } } }) => void>();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(String(e.data));
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)?.(m);
      pending.delete(m.id);
    }
  });
  const send = (method: string, params: object = {}) =>
    new Promise<{ result?: { result?: { value?: unknown }; exceptionDetails?: { exception?: { description?: string } } } }>((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${url}?seed=20260929` });
  await sleep(3000);
  const t0 = performance.now();
  const r = await send('Runtime.evaluate', { expression: DRIVE(RUNS), awaitPromise: true, returnByValue: true, timeout: 600_000 });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'the page script failed');
  const out = r.result?.result?.value as { runs: number; states: number; hovers: number; targets: number; points: number; blocked: [string, number][] };
  ws.close();
  console.log(
    `click-through check: ${out.runs} runs at ${WIDTH}x${HEIGHT}, ${out.states} states — ${out.hovers} previews opened, ` +
      `${out.targets} targets hit-tested at ${out.points} points (${((performance.now() - t0) / 1000).toFixed(1)}s)`,
  );
  for (const [what, n] of out.blocked.slice(0, 20)) console.log(`BLOCKED ${n}x  ${what}`);
  failed = out.blocked.length > 0 || out.runs < RUNS;
  console.log(failed ? `FAIL: ${out.blocked.length} kind(s) of blocked click` : 'PASS: every click reaches its card or END TURN');
} catch (err) {
  console.error(`click-through check: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  proc.kill();
  await server.close();
  await sleep(500);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // Chrome may still hold a file for a moment; the temp dir is the OS's to clean
  }
}
process.exit(failed ? 1 : 0);
