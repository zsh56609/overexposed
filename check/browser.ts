// The checks' browsers (round V1a): headless Chrome or Edge over the DevTools protocol, and headless Firefox
// over WebDriver BiDi — no dependency. Every check and tool runs the same page scripts in either.
//
//   const page = await launch('firefox', { width: 1280, height: 720 });
//   await page.navigate(url); const n = await page.evaluate<number>('1 + 1'); await page.close();
//
// CHROME_PATH and FIREFOX_PATH override the search. A phone is emulated in Chrome (mobile metrics, touch);
// Firefox gets the phone's viewport only. A browser that stops answering fails the check after a while, naming
// the command, instead of hanging it.

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type BrowserName = 'chrome' | 'firefox';

export interface Page {
  readonly name: BrowserName;
  /** Runs an expression in the page (promises awaited); its JSON-able value. */
  evaluate<T = unknown>(expression: string): Promise<T>;
  navigate(url: string, settle?: number): Promise<void>;
  screenshot(path: string): Promise<void>;
  /** The mouse: moves to, or clicks at, a point in CSS pixels of the viewport. */
  move(x: number, y: number): Promise<void>;
  click(x: number, y: number): Promise<void>;
  /** A touch held down for `ms`, then lifted. */
  press(x: number, y: number, ms: number): Promise<void>;
  /** One key, by its name: 'Tab', 'Enter'. */
  key(name: 'Tab' | 'Enter'): Promise<void>;
  /** Chrome only: slows the CPU by `rate` (1 is off). */
  throttle(rate: number): Promise<void>;
  close(): Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** How long a command may go unanswered: a page script may run a whole audit, anything else a moment. */
const ANSWER_MS = 120_000;
const SCRIPT_MS = 20 * 60_000;
/** Rejects when `ms` pass first; the timer never keeps the process alive. */
function within<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new Error(`${what}: no answer from the browser in ${ms / 1000}s`)), ms);
    timer.unref();
  });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

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
const FIREFOXES = [
  process.env.FIREFOX_PATH,
  'C:/Program Files/Mozilla Firefox/firefox.exe',
  'C:/Program Files (x86)/Mozilla Firefox/firefox.exe',
  '/Applications/Firefox.app/Contents/MacOS/firefox',
  '/usr/bin/firefox',
];

/** The browser's executable, or null when it is not installed. */
export function find(name: BrowserName): string | null {
  return (name === 'chrome' ? CHROMES : FIREFOXES).find((p): p is string => !!p && existsSync(p)) ?? null;
}

/**
 * The browsers a check runs in, from `--browsers=chrome,firefox` (default `fallback`): each one installed,
 * a missing one skipped with a note. Exits when none is.
 */
export function browsersFromArgs(argv: readonly string[], fallback = 'chrome,firefox'): BrowserName[] {
  const asked = (argv.find((a) => a.startsWith('--browsers='))?.split('=')[1] ?? fallback).split(',').filter(Boolean) as BrowserName[];
  const have = asked.filter((b) => {
    if (b !== 'chrome' && b !== 'firefox') throw new Error(`unknown browser ${b}`);
    if (find(b)) return true;
    console.log(`(${b} is not installed here: skipped; ${b === 'chrome' ? 'CHROME_PATH' : 'FIREFOX_PATH'} points to one)`);
    return false;
  });
  if (have.length === 0) {
    console.error('no browser to run in: install Chrome or Firefox, or set CHROME_PATH / FIREFOX_PATH');
    process.exit(1);
  }
  return have;
}

/** Sizes from `--sizes=1280x720,800x450,844x390m` (m: a phone, emulated in Chrome). */
export function sizesFromArgs(argv: readonly string[], fallback = '1280x720,800x450,844x390m'): { width: number; height: number; mobile: boolean }[] {
  return (argv.find((a) => a.startsWith('--sizes='))?.split('=')[1] ?? fallback).split(',').map((s) => {
    const [width, height] = s.replace(/m$/, '').split('x').map(Number) as [number, number];
    return { width, height, mobile: s.endsWith('m') };
  });
}

export async function launch(name: BrowserName, size: { width: number; height: number; mobile?: boolean }): Promise<Page> {
  return name === 'chrome' ? launchChrome(size) : launchFirefox(size);
}

// ---------------------------------------------------------------------------
// Chrome over the DevTools protocol

type CdpReply = { result?: Record<string, unknown> & { result?: { value?: unknown }; exceptionDetails?: { text?: string; exception?: { description?: string } } }; error?: { message?: string } };

async function launchChrome({ width, height, mobile = false }: { width: number; height: number; mobile?: boolean }): Promise<Page> {
  const exe = find('chrome');
  if (!exe) throw new Error('no Chrome or Edge found; set CHROME_PATH');
  const profile = mkdtempSync(join(tmpdir(), 'overexposed-chrome-'));
  const proc = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${width},${height}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
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
  const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
  const target = targets.find((t) => t.type === 'page');
  if (!target) throw new Error('no page target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await within(new Promise((r) => ws.addEventListener('open', r)), 30_000, 'the DevTools connection');
  let id = 0;
  const pending = new Map<number, (m: CdpReply) => void>();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(String(e.data));
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)?.(m);
      pending.delete(m.id);
    }
  });
  const send = (method: string, params: object = {}) => {
    const i = ++id;
    const answer = new Promise<CdpReply>((res) => pending.set(i, res));
    ws.send(JSON.stringify({ id: i, method, params }));
    return within(answer, method === 'Runtime.evaluate' ? SCRIPT_MS : ANSWER_MS, method).finally(() => pending.delete(i));
  };
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const mouse = (type: string, x: number, y: number) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  return {
    name: 'chrome',
    async evaluate<T>(expression: string) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 1_800_000 });
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text ?? 'the page script failed');
      return r.result?.result?.value as T;
    },
    async navigate(url, settle = 2500) {
      await send('Page.navigate', { url });
      await sleep(settle);
    },
    async screenshot(path) {
      const r = await send('Page.captureScreenshot', { format: path.endsWith('.jpg') ? 'jpeg' : 'png', ...(path.endsWith('.jpg') ? { quality: 88 } : {}) });
      writeFileSync(path, Buffer.from(String(r.result?.data ?? ''), 'base64'));
    },
    async move(x, y) {
      await mouse('mouseMoved', x, y);
    },
    async click(x, y) {
      await mouse('mouseMoved', x, y);
      await mouse('mousePressed', x, y);
      await mouse('mouseReleased', x, y);
    },
    async press(x, y, ms) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await sleep(ms);
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    },
    async key(name) {
      const code = name === 'Tab' ? 9 : 13;
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code: name, windowsVirtualKeyCode: code });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: name, windowsVirtualKeyCode: code });
    },
    async throttle(rate) {
      await send('Emulation.setCPUThrottlingRate', { rate });
    },
    async close() {
      try {
        ws.close();
      } catch {
        // already closed
      }
      await stop(proc, profile);
    },
  };
}

// ---------------------------------------------------------------------------
// Firefox over WebDriver BiDi

type BidiValue = { type: string; value?: unknown };
const fromRemote = (v: BidiValue | undefined): unknown => {
  if (!v) return v;
  switch (v.type) {
    case 'undefined':
      return undefined;
    case 'null':
      return null;
    case 'string':
    case 'number':
    case 'boolean':
      return v.value;
    case 'array':
      return ((v.value ?? []) as BidiValue[]).map(fromRemote);
    case 'object':
      return Object.fromEntries(((v.value ?? []) as [string | BidiValue, BidiValue][]).map(([k, x]) => [typeof k === 'string' ? k : fromRemote(k), fromRemote(x)]));
    default:
      return v.value ?? `[${v.type}]`;
  }
};

async function launchFirefox(size: { width: number; height: number }): Promise<Page> {
  // Firefox's sandbox on Windows sometimes fails to start a tab's process ("Failed to launch tab subprocess" on its
  // stderr), and that tab never loads anything (round V1a's handoff): a browser whose first tab does not come up is
  // started again.
  for (let attempt = 1; ; attempt++) {
    try {
      return await startFirefox(size);
    } catch (err) {
      if (attempt === 3) throw err;
      console.error(`(firefox: ${err instanceof Error ? err.message : String(err)}; starting it again)`);
    }
  }
}

async function startFirefox({ width, height }: { width: number; height: number }): Promise<Page> {
  const exe = find('firefox');
  if (!exe) throw new Error('no Firefox found; set FIREFOX_PATH');
  const profile = mkdtempSync(join(tmpdir(), 'overexposed-firefox-'));
  writeFileSync(
    join(profile, 'user.js'),
    ['browser.shell.checkDefaultBrowser', 'datareporting.policy.dataSubmissionEnabled', 'toolkit.telemetry.reportingpolicy.firstRun'].map((p) => `user_pref("${p}", false);`).join('\n') +
      '\nuser_pref("browser.startup.homepage_override.mstone", "ignore");' +
      // Focus as if the window were in front (a headless window never is), so keyboard focus shows as it would.
      '\nuser_pref("focusmanager.testmode", true);' +
      // One process for the page from its first tab on: no new process to start when it loads the game.
      '\nuser_pref("fission.autostart", false);\n',
  );
  // Port 0: Firefox picks one and says which on stderr.
  const proc = spawn(exe, ['--headless', '--remote-debugging-port=0', '-profile', profile, '-no-remote', `--width=${width}`, `--height=${height}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let ws: WebSocket | undefined;
  const fail = async (err: unknown): Promise<never> => {
    try {
      ws?.close();
    } catch {
      // closed
    }
    await stop(proc, profile);
    throw err;
  };
  const url = await new Promise<string>((res, rej) => {
    let buf = '';
    const timer = setTimeout(() => rej(new Error('Firefox did not open WebDriver BiDi')), 30_000);
    proc.stderr?.on('data', (d: Buffer) => {
      buf += d.toString();
      const m = /WebDriver BiDi listening on (ws:\/\/\S+)/.exec(buf);
      if (m) {
        clearTimeout(timer);
        res(m[1] as string);
      }
    });
  }).catch(fail);
  const socket = new WebSocket(`${url}/session`);
  ws = socket;
  await within(
    new Promise((r, j) => {
      socket.addEventListener('open', r);
      socket.addEventListener('error', j);
    }),
    30_000,
    'the WebDriver BiDi connection',
  ).catch(fail);
  let id = 0;
  const pending = new Map<number, (m: { type: string; result?: Record<string, unknown>; error?: string; message?: string }) => void>();
  socket.addEventListener('message', (e) => {
    const m = JSON.parse(String(e.data));
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)?.(m);
      pending.delete(m.id);
    }
  });
  const send = (method: string, params: object = {}) => {
    const i = ++id;
    const answer = new Promise<Record<string, unknown>>((res, rej) =>
      pending.set(i, (m) => (m.type === 'error' ? rej(new Error(`${method}: ${m.error} ${m.message}`)) : res(m.result ?? {}))),
    );
    socket.send(JSON.stringify({ id: i, method, params }));
    return within(answer, method === 'script.evaluate' ? SCRIPT_MS : ANSWER_MS, method).finally(() => pending.delete(i));
  };
  await send('session.new', { capabilities: {} }).catch(fail);
  // The window's tab, once Firefox has settled it. BiDi can answer while the first tab does not exist yet, is
  // being replaced, or still loads its start page — and a navigation that raced it was never answered (round
  // V1a's handoff). So the tab is taken once it answers a script, and a navigation left unanswered is tried
  // again on the tab as it is by then.
  const settledTab = async (): Promise<string> => {
    for (let i = 0; i < 32; i++) {
      try {
        const tree = (await send('browsingContext.getTree', {})) as { contexts: { context: string }[] };
        const tab = tree.contexts[0]?.context;
        if (tab) {
          const r = (await send('script.evaluate', { expression: 'document.readyState', target: { context: tab }, awaitPromise: false })) as { result?: BidiValue };
          if (r.result?.value === 'complete') return tab;
        }
      } catch {
        // replaced while we asked
      }
      await sleep(250);
    }
    throw new Error('its first tab never loaded');
  };
  let context = await settledTab().catch(fail);
  await send('browsingContext.setViewport', { context, viewport: { width, height } }).catch(fail);
  const pointer = (actions: object[], pointerType = 'mouse') => send('input.performActions', { context, actions: [{ type: 'pointer', id: pointerType, parameters: { pointerType }, actions }] });
  const at = (x: number, y: number) => ({ type: 'pointerMove', x: Math.round(x), y: Math.round(y), duration: 0 });
  return {
    name: 'firefox',
    async evaluate<T>(expression: string) {
      const r = (await send('script.evaluate', { expression, target: { context }, awaitPromise: true, resultOwnership: 'none', serializationOptions: { maxObjectDepth: 30 } })) as { type: string; result?: BidiValue; exceptionDetails?: { text?: string } };
      if (r.type === 'exception') throw new Error(r.exceptionDetails?.text ?? 'the page script failed');
      return fromRemote(r.result) as T;
    },
    async navigate(url, settle = 2500) {
      for (let attempt = 1; ; attempt++) {
        try {
          await within(send('browsingContext.navigate', { context, url, wait: 'complete' }), 30_000, 'browsingContext.navigate');
          break;
        } catch (err) {
          if (attempt === 3) throw err;
          context = await settledTab();
          await send('browsingContext.setViewport', { context, viewport: { width, height } });
        }
      }
      await sleep(settle);
    },
    async screenshot(path) {
      const r = await send('browsingContext.captureScreenshot', { context, origin: 'viewport', format: { type: path.endsWith('.jpg') ? 'image/jpeg' : 'image/png', quality: 0.88 } });
      writeFileSync(path, Buffer.from(String(r.data ?? ''), 'base64'));
    },
    async move(x, y) {
      await pointer([at(x, y)]);
    },
    async click(x, y) {
      await pointer([at(x, y), { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }]);
    },
    async press(x, y, ms) {
      await pointer([at(x, y), { type: 'pointerDown', button: 0 }, { type: 'pause', duration: ms }, { type: 'pointerUp', button: 0 }], 'touch');
    },
    async key(name) {
      const value = name === 'Tab' ? '\uE004' : '\uE007';
      await send('input.performActions', { context, actions: [{ type: 'key', id: 'keyboard', actions: [{ type: 'keyDown', value }, { type: 'keyUp', value }] }] });
    },
    async throttle() {
      // Firefox's BiDi has no CPU throttling.
    },
    async close() {
      try {
        await Promise.race([send('browser.close', {}), sleep(3000)]);
      } catch {
        // closing
      }
      try {
        socket.close();
      } catch {
        // already closed
      }
      await stop(proc, profile);
    },
  };
}

async function stop(proc: ChildProcess, profile: string): Promise<void> {
  // The whole tree: on Windows the exe started is Firefox's launcher, and killing it alone left the browser and
  // its tab processes running — enough of them, and Firefox's sandbox could no longer start a tab (round V1a).
  if (process.platform === 'win32' && proc.pid) spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
  else proc.kill();
  await sleep(600);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // the browser may still hold a file for a moment; the temp dir is the OS's to clean
  }
}
