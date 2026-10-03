// npm run check:overflow — every text at its longest, on the desk and on the plain screens (round V1a).
//
// Every line group's variants are made to read as its longest variant, and every press subject as the longest
// noun; then seeded runs are played through the real UI at each size — 1280x720, 800x450 and a phone held
// landscape — in headless Chrome and Firefox (check/browser.ts), and at every state:
// - the desk is audited: each fixed box holds its text (stat cells, mastheads, datelines, the box office, card
//   names, the notes' requirement lines, the phone's clock, END TURN), each page holds its stories, the notes stay
//   on the glass and apart, the notebook holds its words and the script page holds every scene as written, the
//   bubbles stay below the stat bar, a card's text stays in the strip its neighbour leaves showing and above the
//   stage's edge, and tooltips, previews and notes stay on the stage — with every card's preview, every stat
//   tooltip, each paper pulled forward and a bubble's reaction row open along the way;
// - the plain screens of round V2 are audited (after the author found the draft's offers pushed off its panel):
//   the title, its credits, the manager choice, every draft (after extra picks and rerolls too), the deck viewer,
//   the season doors, the ending — nothing in them leaves the stage, and nothing is cut off by a box that hides
//   its overflow.
// With --replays, every state recorded in check/desk-states.json (the reference states, the biggest hand, a hand
// for every card, every minor ending's screen) is replayed and audited too. Transitions are switched off: the
// check measures where things settle.
//
// Runs the Vite dev server in-process. Usage:
//   node check/overflow.ts [--runs=4] [--replays] [--sizes=1280x720,800x450,844x390m] [--browsers=chrome,firefox]

import { createServer } from 'vite';
import { browsersFromArgs, launch, sizesFromArgs } from './browser.ts';
import { loadStates, PLAY_STEPS, ROOT } from './desk-replay.ts';
import { auditStep } from './audit-progress.ts';

const arg = (name: string, fallback: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const RUNS = Number(arg('runs', '4'));
const REPLAYS = process.argv.includes('--replays');
const SIZES = sizesFromArgs(process.argv);
const BROWSERS = browsersFromArgs(process.argv);

/** Runs in the page: every line group's variants set to its longest (the strings module the app itself imported). */
const PATCH = `(async () => {
  const urls = performance.getEntriesByType('resource').map((e) => new URL(e.name)).map((u) => u.pathname + u.search);
  if (!urls.some(u=>u.startsWith('/i18n/en.json')) || !urls.some(u=>u.startsWith('/content/scripts.json'))) throw new Error('audit modules not loaded; ready='+document.readyState+' url='+location.href);
  const m = await import(urls.find((u) => u.startsWith('/i18n/en.json')));
  const s = m.default;
  // The desk scripts are fixed scenes, not variants: kept as written, each tried in the script page by the audit.
  const content = await import(urls.find((u) => u.startsWith('/content/scripts.json')));
  window.__scenes = content.default.scripts.map((sc) => ({ heading: s[sc.headingKey], lines: sc.lines.map((l) => ({ kind: l.kind, text: s[l.key] })) }));
  const groups = new Map();
  for (const [k, v] of Object.entries(s)) {
    if (typeof v !== 'string' || k.startsWith('script.')) continue;
    const g = k.startsWith('press.subject.') ? 'press.subject.*' : k.replace(/\\.\\d+(?=\\.|$)/g, '.#');
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(k);
  }
  let patched = 0;
  for (const keys of groups.values()) {
    if (keys.length < 2) continue;
    const longest = keys.map((k) => s[k]).reduce((a, b) => (b.length > a.length ? b : a));
    for (const k of keys) if (s[k] !== longest) { s[k] = longest; patched++; }
  }
  return patched + ' strings set to their group\\'s longest';
})()`;

/** Runs in the page: the desk audit, in stage pixels. */
const AUDIT = `window.__deskAudit = (where) => {
  const out = [];
  const add = (m) => out.push(where + ': ' + m);
  const desk = document.querySelector('.desk');
  if (!desk) return out;
  const stage = desk.getBoundingClientRect();
  const k = stage.width / 1280; // the stage's scale: every measure below is in stage pixels
  const S = (r) => ({ l: (r.left - stage.left) / k, t: (r.top - stage.top) / k, r: (r.right - stage.left) / k, b: (r.bottom - stage.top) / k });
  const name = (el) => el.tagName.toLowerCase() + '.' + String(el.className.baseVal ?? el.className).trim().split(/\\s+/).join('.');
  const holds = (el, what) => { if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) add(what + ' ' + name(el) + ' holds ' + el.scrollWidth + 'x' + el.scrollHeight + ' in ' + el.clientWidth + 'x' + el.clientHeight + ' "' + el.textContent.slice(0, 50) + '"'); };
  const within = (el, box, what, pad = 0.5) => { const a = S(el.getBoundingClientRect()), b = box; if (a.l < b.l - pad || a.t < b.t - pad || a.r > b.r + pad || a.b > b.b + pad) add(what + ' ' + name(el) + ' at ' + [a.l, a.t, a.r, a.b].map(Math.round) + ' outside ' + [b.l, b.t, b.r, b.b].map(Math.round) + ' "' + el.textContent.slice(0, 40) + '"'); };
  const STAGE = { l: 0, t: 0, r: 1280, b: 720 };
  // The stat bar: every cell's content on one line in its cell; the date clear of the deck button.
  for (const c of desk.querySelectorAll('.stats .cell')) holds(c, 'stat cell');
  const when = desk.querySelector('.stats .when'), deckb = desk.querySelector('.stats .deckbtn');
  if (when && deckb && S(when.getBoundingClientRect()).l < S(deckb.getBoundingClientRect()).r + 8) add('the date runs into the deck button');
  if (deckb) holds(deckb, 'deck button');
  const tip = desk.querySelector('.tip.on'); if (tip) { within(tip, STAGE, 'tooltip'); holds(tip, 'tooltip'); }
  // The papers: each page holds its stories; mastheads, datelines and the box office on their lines.
  for (const p of desk.querySelectorAll('.pp')) {
    holds(p, 'paper');
    for (const x of p.querySelectorAll('.mh, .dl, .bo div, .kk')) holds(x, 'paper line');
    const rw = p.querySelector('.rw'); if (rw) { const pr = S(p.getBoundingClientRect()), rr = S(rw.getBoundingClientRect()); if (p.classList.contains('pos0') && rr.b > pr.b - 4) add('the front paper ' + p.dataset.paper + ' is cut off at the bottom: row ends ' + Math.round(rr.b) + ', page ' + Math.round(pr.b)); }
    for (const e of p.querySelectorAll('.ear')) { const er = e.getBoundingClientRect(), mr = p.querySelector('.mhrow').getBoundingClientRect(); if (er.height > mr.height + 1) add('ear taller than its masthead row "' + e.textContent + '"'); }
  }
  // The mirror: the black card and the notes inside the glass, the notes' requirement lines on one line.
  const glass = desk.querySelector('.glass');
  if (glass) {
    const g = S(glass.getBoundingClientRect());
    for (const n of desk.querySelectorAll('.mirror .sticky, .mirror .today')) within(n, { l: g.l - 30, t: g.t - 30, r: g.r + 30, b: g.b }, 'mirror note');
    for (const r of desk.querySelectorAll('.mirror .req')) holds(r, 'note requirement');
    const today = desk.querySelector('.mirror .today'), notes = [...desk.querySelectorAll('.mirror .sticky')];
    const box = (el) => S(el.getBoundingClientRect());
    const all = [today, ...notes].filter(Boolean);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const a = box(all[i]), b = box(all[j]); const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ox > 6 && oy > 6) add('mirror notes overlap ' + name(all[i]) + ' / ' + name(all[j]) + ' by ' + Math.round(ox) + 'x' + Math.round(oy)); }
    const clip = desk.querySelector('.mirror .clipM'); if (clip) within(clip, STAGE, 'clipping');
  }
  // The desk: the notebook's page and the script hold their words.
  const nb = desk.querySelector('.notebook'); if (nb) { const t = nb.querySelector('.nb-txt'); if (t && t.offsetTop + t.offsetHeight > nb.clientHeight + 1) add('notebook page overflows: ' + (t.offsetTop + t.offsetHeight) + ' > ' + nb.clientHeight + ' "' + t.textContent.slice(0, 40) + '"'); }
  const sc = desk.querySelector('.script');
  if (sc) {
    // Every scene of every band in the page, as it is written; then the page as it was — React's own nodes put back,
    // since a page rebuilt from its HTML would leave React holding nodes that are no longer in it.
    const was = [...sc.childNodes];
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    for (const scene of window.__scenes ?? []) {
      sc.innerHTML = '<b>' + esc(scene.heading) + '</b>' + scene.lines.map((l) => {
        if (l.kind === 'action') return '<span class="act">' + esc(l.text) + '</span>';
        const at = l.text.indexOf(': ');
        const cue = at > 0 ? '<span class="cue">' + esc(l.text.slice(0, at)) + ':</span> ' : '';
        const text = at > 0 ? l.text.slice(at + 2) : l.text;
        return '<p>' + cue + (l.kind === 'you' ? '<i>' + esc(text) + '</i>' : '<span>' + esc(text) + '</span>') + '</p>';
      }).join('');
      holds(sc, 'script');
      if (sc.offsetTop + sc.offsetHeight > 236) add('the script "' + scene.heading + '" runs off the desk: ' + (sc.offsetTop + sc.offsetHeight) + 'px');
    }
    sc.replaceChildren(...was);
  }
  const clk = desk.querySelector('.lock .clk'); if (clk) holds(clk, 'phone clock');
  // The bubbles stay below the stat bar and on the stage, the reaction row too.
  const bub = desk.querySelector('.bubbles'); if (bub && bub.children.length) { const b = S(bub.getBoundingClientRect()); if (b.t < 50) add('bubbles reach the stat bar: top ' + Math.round(b.t)); }
  for (const x of desk.querySelectorAll('.bub, .rx-bar')) within(x, { l: 0, t: 46, r: 1280, b: 720 }, 'bubble');
  // The hand: each name in its box; each body's text in the card's visible part and strip.
  const cards = [...desk.querySelectorAll('.hand .card')];
  cards.forEach((c, i) => {
    const nm = c.querySelector('.name'); if (nm) holds(nm, 'card name');
    const body = c.querySelector('.body');
    const next = cards[i + 1];
    const strip = next ? Math.min(c.offsetWidth, next.offsetLeft - c.offsetLeft) : c.offsetWidth;
    if (body) {
      const bottom = body.offsetTop + body.offsetHeight;
      if (bottom > 222) add('card body runs below the stage: ' + bottom + 'px ("' + (c.querySelector('.name')?.textContent ?? '') + '")');
      if (body.offsetLeft + body.offsetWidth > strip + 2 && next) add('card body wider than its visible strip (' + strip + 'px) in a hand of ' + cards.length);
    }
    for (const x of c.querySelectorAll('.cs, .revtag, .pass')) holds(x, 'card header');
  });
  const end = desk.querySelector('.endbtn'); if (end) holds(end, 'END TURN');
  const fl = desk.querySelector('.floating'); if (fl) { within(fl, { l: 0, t: 46, r: 1280, b: 720 }, 'preview'); }
  const toast = desk.querySelector('.toast.on'); if (toast) within(toast, STAGE, 'toast');
  if (document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1) add('the page scrolls');
  return out;
};`;

/** Runs in the page: the plain screens' audit — nothing off the stage, nothing cut off by a box hiding its overflow. */
const PLAIN = `window.__plainAudit = (where) => {
  const out = [];
  const add = (m) => out.push(where + ': ' + m);
  const stage = document.querySelector('.stage').getBoundingClientRect();
  const name = (el) => el.tagName.toLowerCase() + '.' + String(el.className.baseVal ?? el.className).trim().split(/\\s+/).join('.');
  const text = (el) => ' "' + (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40) + '"';
  const clips = (el) => { const cs = getComputedStyle(el); return ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY); };
  for (const root of document.querySelectorAll('.stage .plain')) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden') continue;
      if (r.left < stage.left - 1 || r.top < stage.top - 1 || r.right > stage.right + 1 || r.bottom > stage.bottom + 1) { add('off the stage: ' + name(el) + text(el)); continue; }
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (!clips(a)) continue;
        if (a.classList.contains('stage') || a.classList.contains('frame')) break;
        const ar = a.getBoundingClientRect();
        if (r.left < ar.left - 1 || r.top < ar.top - 1 || r.right > ar.right + 1 || r.bottom > ar.bottom + 1) { add('cut off by ' + name(a) + ': ' + name(el) + text(el)); break; }
      }
    }
  }
  return out;
};`;

/** Runs in the page: plays RUNS seeded runs by DOM, auditing every state and every hover along the way. */
const DRIVE = (runs: number) => `(async () => {
  document.documentElement.dataset.motion = 'off';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const shown = async (selector, yes = true) => { for (let i=0;i<40;i++) { if (!!document.querySelector(selector) === yes) return; await sleep(10); } throw new Error('audit target did not ' + (yes ? 'open: ' : 'close: ') + selector); };
  let rnd = 424242;
  const rand = (k) => { rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0; return (rnd >>> 8) % k; };
  const issues = {};
  const note = (l) => { for (const m of l) issues[m] = (issues[m] || 0) + 1; };
  const seen = { cards: new Set(), faces: new Set(), papers: new Set(), states: 0, previews: 0, tips: 0, fronts: 0, bubbles: 0, maxHand: 0, screens: {}, extraPicks: 0, rerolls: 0, deckViews: 0 };
  const plain = (where) => { seen.screens[where] = (seen.screens[where] || 0) + 1; note(__plainAudit(where)); };
  const over = (el) => { el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })); };
  const out = (el) => { el.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' })); };
  const deck = async () => {
    const b = document.querySelector('.desk .deckbtn'); if (!b) return;
    b.click(); await sleep(4); seen.deckViews++; plain('deck');
    document.querySelector('.deck-viewer .row button')?.click(); await sleep(4);
  };
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.appendChild(still);
  plain('title');
  document.querySelector('.credits-open')?.click(); await sleep(10);
  plain('credits');
  document.querySelector('.plain.credits button')?.click(); await sleep(10);
  document.querySelector('button.big').click();
  await sleep(40);
  for (let run = 0; run < ${runs}; run++) {
    let guard = 0;
    while (!document.querySelector('.ending') && guard++ < 800) {
      seen.states++;
      const phase = document.querySelector('.manager-choice') ? 'manager' : document.querySelector('.draft') ? 'draft' : document.querySelector('.gates') ? 'gate' : 'play';
      window.__auditProgress = { run, guard, phase, states:seen.states, previews:seen.previews, tips:seen.tips };
      if (phase === 'manager') { plain('manager'); const take = [...document.querySelectorAll('.manager-choice .choose')]; take[run % take.length].click(); await sleep(8); continue; }
      note(__deskAudit(phase));
      if (phase === 'draft') {
        plain('draft');
        const [extra, reroll] = [...document.querySelectorAll('.draft > .row > button')];
        const roll = rand(8);
        if (roll === 0) await deck();
        if (roll <= 2 && extra && !extra.disabled) { extra.click(); seen.extraPicks++; }
        else if (roll <= 4 && reroll && !reroll.disabled) { reroll.click(); seen.rerolls++; }
        else { const take = [...document.querySelectorAll('.draft .take')].filter((b) => !b.disabled); take[rand(take.length)].click(); }
        await sleep(6);
        continue;
      }
      if (phase === 'gate') { plain('doors'); const take = [...document.querySelectorAll('.gates .take')].filter((b) => !b.disabled); take[rand(take.length)].click(); await sleep(6); continue; }
      const cards = [...document.querySelectorAll('.desk .hand .card')];
      seen.maxHand = Math.max(seen.maxHand, cards.length);
      for (const c of cards) { seen.cards.add(c.dataset.card); seen.faces.add([...c.classList].find((x) => x.startsWith('f-'))); over(c); await shown('.floating'); seen.previews++; note(__deskAudit('preview')); out(c); await shown('.floating', false); }
      const end = document.querySelector('.desk .endbtn'); if (end) { over(end); await shown('.floating'); note(__deskAudit('end preview')); out(end); await shown('.floating', false); }
      for (const cell of document.querySelectorAll('.desk .stats [data-tip]')) { over(cell); await shown('.tip.on'); seen.tips++; note(__deskAudit('tooltip')); out(cell); await shown('.tip.on', false); }
      if (rand(3) === 0) {
        for (const p of [...document.querySelectorAll('.desk .pp')].filter((p) => !p.classList.contains('pos0'))) { p.click(); await sleep(4); seen.fronts++; seen.papers.add(p.dataset.paper); note(__deskAudit('paper ' + p.dataset.paper + ' forward')); }
        const b = [...document.querySelectorAll('.desk .bub:not(.who)')].at(-1); if (b) { b.click(); await sleep(4); seen.bubbles++; note(__deskAudit('reaction row')); document.body.click(); await sleep(2); }
      }
      if (rand(12) === 0) await deck();
      const playable = cards.filter((c) => c.getAttribute('aria-disabled') !== 'true');
      if (playable.length && rand(6)) playable[rand(playable.length)].click();
      else {
        const btn = document.querySelector('.desk .endbtn');
        if (!btn) throw new Error('a month on the desk without END TURN: the app is gone (see the dev server log for a React error)');
        btn.click();
      }
      await sleep(6);
    }
    if (!document.querySelector('.ending')) throw new Error('audit reached 800-action guard: '+JSON.stringify(window.__auditProgress));
    plain('ending');
    document.querySelector('button.play-again')?.click();
    await sleep(30);
  }
  return { states: seen.states, previews: seen.previews, tips: seen.tips, fronts: seen.fronts, bubbles: seen.bubbles, maxHand: seen.maxHand, screens: seen.screens, extraPicks: seen.extraPicks, rerolls: seen.rerolls, deckViews: seen.deckViews, cards: [...seen.cards].sort(), faces: [...seen.faces].sort(), issues: Object.entries(issues).sort((a, b) => b[1] - a[1]) };
})()`;

/** Runs in the page, once a recorded state is reached: the desk, every card's preview, each paper pulled forward. */
const REPLAY_AUDIT = `(async () => {
  const shown = async (selector, yes = true) => { for (let i=0;i<40;i++) { if (!!document.querySelector(selector) === yes) return; await sleep(10); } throw new Error('audit target did not ' + (yes ? 'open: ' : 'close: ') + selector); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.appendChild(still);
  await sleep(30);
  const issues = [...__deskAudit('state'), ...__plainAudit('state')];
  for (const c of document.querySelectorAll('.desk .hand .card')) { c.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })); await shown('.floating'); issues.push(...__deskAudit('preview')); c.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' })); await shown('.floating', false); }
  for (const p of [...document.querySelectorAll('.desk .pp')].filter((p) => !p.classList.contains('pos0'))) { p.click(); await sleep(4); issues.push(...__deskAudit('paper ' + p.dataset.paper)); }
  return { hand: document.querySelectorAll('.desk .hand .card').length, cards: [...document.querySelectorAll('.desk .hand .card')].map((c) => c.dataset.card), issues };
})()`;

type Out = { states: number; previews: number; tips: number; fronts: number; bubbles: number; maxHand: number; screens: Record<string, number>; extraPicks: number; rerolls: number; deckViews: number; cards: string[]; faces: string[]; issues: [string, number][] };

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5191, strictPort: false } });
await server.listen();
const url = server.resolvedUrls?.local[0];
const states = REPLAYS ? loadStates() : {};
let failed = false;
try {
  if (!url) throw new Error('the dev server did not start');
  for (const browser of BROWSERS) {
    for (const size of SIZES) {
      const tag = `${browser} ${size.width}x${size.height}${size.mobile ? ' (phone)' : ''}`;
      const page = await launch(browser, size);
      try {
        await page.navigate(`${url}?seed=20260929`, 3000);
        const t0 = performance.now();
        console.log(`starting overflow ${tag}`);
        await auditStep(page, `${tag} longest-text patch`, PATCH);
        await page.evaluate(AUDIT);
        await page.evaluate(PLAIN);
        const out = await auditStep<Out>(page, `${tag} ${RUNS} runs`, DRIVE(RUNS), 600_000);
        const screens = Object.entries(out.screens)
          .map(([k, n]) => `${k} ${n}`)
          .join(', ');
        console.log(
          `overflow check, ${tag}: ${out.states} states — ${out.previews} previews, ${out.tips} tooltips, ${out.fronts} papers pulled forward, ${out.bubbles} reaction rows, ` +
            `hands of up to ${out.maxHand}; plain screens ${screens} (${out.extraPicks} extra picks, ${out.rerolls} rerolls); ${out.cards.length} cards and ${out.faces.length} faces seen (${((performance.now() - t0) / 1000).toFixed(1)}s)`,
        );
        for (const [what, n] of out.issues.slice(0, 20)) console.log(`OVERFLOW ${n}x  ${what}`);
        if (out.issues.length > 0) failed = true;
        if (REPLAYS) {
          let n = 0;
          let broke = 0;
          const held = new Set<string>();
          for (const [key, state] of Object.entries(states)) {
            await page.navigate(`${url}?seed=${state.seed}`, 2500);
            await auditStep(page, `${tag} ${key} longest-text patch`, PATCH);
            await page.evaluate(AUDIT);
            await page.evaluate(PLAIN);
            const r = await auditStep<string>(page, `${tag} replay ${key}`, PLAY_STEPS(state.steps), 60_000);
            if (r !== 'ok') {
              broke++;
              console.log(`REPLAY ${key}: ${r} — run npm run desk:states after a content change`);
              continue;
            }
            const x = await auditStep<{ hand: number; cards: string[]; issues: string[] }>(page, `${tag} measure ${key}`, REPLAY_AUDIT);
            console.log(`replay ${tag} ${key}: ${x.issues.length} issues`);
            for (const id of x.cards) held.add(id);
            n += x.issues.length;
            for (const m of [...new Set(x.issues)].slice(0, 4)) console.log(`OVERFLOW ${key}  ${m}`);
          }
          console.log(`overflow check, ${tag}: ${Object.keys(states).length} recorded states replayed, ${held.size} cards in their hands — ${n} issues${broke ? `, ${broke} did not replay` : ''}`);
          if (n > 0 || broke > 0) failed = true;
        }
      } finally {
        await page.close();
      }
    }
  }
  console.log(failed ? 'FAIL: some text does not fit, or a screen is cut off' : 'PASS: every text fits, at its longest, on the desk and the plain screens, in every browser and size');
} catch (err) {
  failed = true;
  console.error(`overflow check: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
