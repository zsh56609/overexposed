// npm run check:overflow — every text at its longest, on the desk and on the screens around it (round V1a; R1).
//
// Every line group's variants are made to read as its longest variant, and every press subject as the longest
// noun; then seeded runs are played through the real UI at each size — 1280x720, 800x450 and a phone held
// landscape — in headless Chrome and Firefox (check/browser.ts), and at every state:
// - the desk is audited: each fixed box holds its text (stat cells, mastheads, datelines, the box office, card
//   names, the notes' requirement lines, the phone's clock, END TURN), each page holds its stories, the notes stay
//   on the glass and apart, the season's doors card (round R9b) inside the glass and clear of the notes and bubbles, the notebook holds its words and the script page holds every scene as written, the
//   bubbles stay below the stat bar, a card's text stays in the strip its neighbour leaves showing and above the
//   stage's edge, and tooltips, previews and notes stay on the stage — with every card's preview, every stat
//   tooltip, every door's row's tooltip on the doors card (round R9c, E2: its outcomes two lines, each one line; by
//   season, all four seen), each paper pulled forward and a bubble's reaction row open along the way;
// - the plain screens of round V2 are audited (after the author found the draft's offers pushed off its panel):
//   the title, its credits, the manager choice, every draft (after extra picks and rerolls too), the deck viewer,
//   the season doors, the ending — nothing in them leaves the stage, and nothing is cut off by a box that hides
//   its overflow;
// - the events (round R2): each one met in the runs, and every event of the content on its own page
//   (check/events.html) with two more at the schema's limits — with its replies, with one it can't afford, and
//   answered — on the stage, the letter holding its words, no words over other words.
// And the scrapbook at its fullest (round R9b, D2b): every ending found and every award won, then none — both pages
// inside the book, every plaque's words inside its 124 px, every column of clippings inside the book with each clipping
// found or not as it is taller.
// With --replays, every state recorded in check/desk-states.json (the reference states, the biggest hand, a hand
// for every card, every minor ending's screen) is replayed and audited too. Transitions are switched off: the
// check measures where things settle.
//
// Runs the Vite dev server in-process. Usage:
//   node check/overflow.ts [--runs=4] [--replays] [--sizes=1280x720,800x450,844x390m] [--browsers=chrome,firefox]

import { createServer } from 'vite';
import { browsersFromArgs, launch, sizesFromArgs } from './browser.ts';
import { loadStates, openReady, PLAY_STEPS, ROOT } from './desk-replay.ts';
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
    // An event's messages are a sequence, not variants (round R2), and so is a rival text's unmet thread (round R9a):
    // the events page shows each as written.
    if (typeof v !== 'string' || k.startsWith('script.') || (k.startsWith('event.') && (k.includes('.message.') || k.includes('.unmet.')))) continue;
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
  // The stat bar (round R9b, B1): every cell's contents inside its width — its label row and its value row, or the
  // date's marks and month — each on one line. Across only: a cell lets its type's descenders show below it.
  for (const c of desk.querySelectorAll('.stats .cell')) {
    if (c.scrollWidth > c.clientWidth + 1) add('stat cell ' + name(c) + ' holds ' + c.scrollWidth + ' in ' + c.clientWidth + ' across "' + c.textContent.slice(0, 40) + '"');
    const cb = S(c.getBoundingClientRect());
    for (const row of c.querySelectorAll(':scope > .hd, :scope > .val, :scope > .strip, :scope > b, :scope > .slotbulbs')) {
      const rb = S(row.getBoundingClientRect());
      if (rb.l < cb.l - 0.5 || rb.r > cb.r + 0.5) add('stat cell ' + name(c) + ': its ' + name(row) + ' ' + Math.round(rb.r - rb.l) + ' px wide in ' + Math.round(cb.r - cb.l) + ' "' + row.textContent.slice(0, 30) + '"');
    }
  }
  const tip = desk.querySelector('.tip.on'); if (tip) { within(tip, STAGE, 'tooltip'); holds(tip, 'tooltip'); }
  // The papers: each page holds its stories; mastheads, datelines and the box office on their lines.
  for (const p of desk.querySelectorAll('.pp')) {
    holds(p, 'paper');
    for (const x of p.querySelectorAll('.mh, .dl, .bo div, .kk')) holds(x, 'paper line');
    const rw = p.querySelector('.rw'); if (rw) { const pr = S(p.getBoundingClientRect()), rr = S(rw.getBoundingClientRect()); if (p.classList.contains('pos0') && rr.b > pr.b - 4) add('the front paper ' + p.dataset.paper + ' is cut off at the bottom: row ends ' + Math.round(rr.b) + ', page ' + Math.round(pr.b)); }
    for (const e of p.querySelectorAll('.ear')) { const er = e.getBoundingClientRect(), mr = p.querySelector('.mhrow').getBoundingClientRect(); if (er.height > mr.height + 1) add('ear taller than its masthead row "' + e.textContent + '"'); }
  }
  // The mirror: the black card and the notes inside the glass, the notes' requirement lines on one line. The real
  // mirror's, by its hook: each of the manager's bubbles holds a frosted copy with its classes (round R9d, A2).
  const mirror = desk.querySelector('[data-hook="mirror"]');
  const glass = mirror?.querySelector('.glass');
  if (glass) {
    const g = S(glass.getBoundingClientRect());
    for (const n of desk.querySelectorAll('.mirror .sticky, .mirror .today')) within(n, { l: g.l - 30, t: g.t - 30, r: g.r + 30, b: g.b }, 'mirror note');
    for (const r of desk.querySelectorAll('.mirror .req')) holds(r, 'note requirement');
    const today = desk.querySelector('.mirror .today'), notes = [...desk.querySelectorAll('.mirror .sticky')];
    const box = (el) => S(el.getBoundingClientRect());
    const all = [today, ...notes].filter(Boolean);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const a = box(all[i]), b = box(all[j]); const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ox > 6 && oy > 6) add('mirror notes overlap ' + name(all[i]) + ' / ' + name(all[j]) + ' by ' + Math.round(ox) + 'x' + Math.round(oy)); }
    const clip = mirror.querySelector('.clipM'); if (clip) within(clip, STAGE, 'clipping');
    // The season's doors card (round R9b, A3): inside the glass with its tilt, clear of the black card, the three notes,
    // the frenzy's clipping and the manager's bubbles; its height, its room above the glass's foot and its least gap to a
    // note kept for the report, by season.
    const doors = desk.querySelector('.mirror [data-hook="doors"]');
    if (doors) {
      within(doors, g, 'the doors card');
      const d = box(doors);
      const gapTo = (el) => { const b = box(el); return Math.max(d.t - b.b, b.t - d.b, d.l - b.r, b.l - d.r); };
      for (const el of [...mirror.querySelectorAll('.sticky, .today, .clipM'), ...desk.querySelectorAll('.bubbles .bub')]) if (gapTo(el) <= 0) add('the doors card meets ' + name(el) + ' "' + el.textContent.slice(0, 30) + '"');
      const seen = (window.__doorsCard ??= {}), season = desk.dataset.season ?? '?', was = seen[season];
      const gap = Math.min(...all.map(gapTo));
      seen[season] = { h: Math.max(doors.offsetHeight, was?.h ?? 0), room: Math.round(Math.min(g.b - d.b, was?.room ?? Infinity) * 10) / 10, gap: Math.round(Math.min(gap, was?.gap ?? Infinity) * 10) / 10 };
    }
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

/**
 * Runs in the page: the season's doors (round R8a, D1) — each invitation's height and where its bottom falls on the
 * stage, and how clear its odds stamp stands of its photograph's oval: measured in the card's own frame (offsets ignore
 * the card's tilt), the oval with its 4 px ring as an ellipse, the stamp as its turned rectangle, their least distance
 * sampled along the stamp's edges (negative: the stamp is on the oval).
 */
const DOORS_MEASURE = `window.__doorsMeasure = () => {
  const st = document.querySelector('.stage').getBoundingClientRect();
  const k = st.height / 720;
  const invs = [...document.querySelectorAll('.doors .inv')];
  const clearance = [];
  for (const d of invs) {
    const odds = d.querySelector('.odds'), oval = d.querySelector('.ivp');
    if (!odds || !oval) continue;
    const a = oval.offsetWidth / 2 + 4, b = oval.offsetHeight / 2 + 4;
    const cx = oval.offsetLeft + oval.offsetWidth / 2, cy = oval.offsetTop + oval.offsetHeight / 2;
    const m = new DOMMatrix(getComputedStyle(odds).transform);
    const w = odds.offsetWidth, h = odds.offsetHeight, ox = odds.offsetLeft + w / 2, oy = odds.offsetTop + h / 2;
    const at = (x, y) => [ox + m.a * x + m.c * y, oy + m.b * x + m.d * y];
    const poly = [at(-w / 2, -h / 2), at(w / 2, -h / 2), at(w / 2, h / 2), at(-w / 2, h / 2)];
    let least = Infinity;
    for (let i = 0; i < 4; i++) {
      const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % 4];
      for (let s = 0; s <= 40; s++) {
        const x = x0 + ((x1 - x0) * s) / 40, y = y0 + ((y1 - y0) * s) / 40;
        if (((x - cx) / a) ** 2 + ((y - cy) / b) ** 2 <= 1) least = Math.min(least, -1);
        for (let deg = 0; deg < 360; deg += 2) least = Math.min(least, Math.hypot(x - cx - a * Math.cos((deg * Math.PI) / 180), y - cy - b * Math.sin((deg * Math.PI) / 180)));
      }
    }
    clearance.push(least);
  }
  return { heights: invs.map((d) => d.offsetHeight), bottoms: invs.map((d) => (d.getBoundingClientRect().bottom - st.top) / k), clearance };
};`;

/** Runs in the page: the plain screens' audit — nothing off the stage, nothing cut off by a box hiding its overflow. */
const PLAIN = `${DOORS_MEASURE}
window.__plainAudit = (where) => {
  const out = [];
  const add = (m) => out.push(where + ': ' + m);
  const stage = document.querySelector('.stage').getBoundingClientRect();
  const name = (el) => el.tagName.toLowerCase() + '.' + String(el.className.baseVal ?? el.className).trim().split(/\\s+/).join('.');
  const text = (el) => ' "' + (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40) + '"';
  const clips = (el) => { const cs = getComputedStyle(el); return ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY); };
  // The plain screens and the screens around the desk (round R1). Decoration (data-deco) may run off the stage on
  // purpose, like the title's fan of cards; a box marked data-fit must hold its text.
  for (const root of document.querySelectorAll('.stage :is(.plain, .scr)')) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (el.closest('[data-deco]')) continue;
      if (el.matches('[data-fit]') && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) add('does not hold its text: ' + name(el) + ' ' + el.scrollWidth + 'x' + el.scrollHeight + ' in ' + el.clientWidth + 'x' + el.clientHeight + text(el));
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
  // The awards night (round R5, B5): PLAY AGAIN as wide as the last front page above it, both edges within 1 px.
  const again = document.querySelector('.awards-night .play-again');
  const lastPage = [...document.querySelectorAll('.awards-night .fp')].at(-1);
  if (again && lastPage) {
    const a = again.getBoundingClientRect(), p = lastPage.getBoundingClientRect();
    if (Math.abs(a.left - p.left) > 1 || Math.abs(a.right - p.right) > 1) add('PLAY AGAIN at ' + a.left.toFixed(1) + '-' + a.right.toFixed(1) + ', the last front page at ' + p.left.toFixed(1) + '-' + p.right.toFixed(1));
  }
  // The plaques with their trophies (round R8c, B2), on the night and on the scrapbook's shelf: the name 15 px, the
  // citation (a how-line on the shelf) 10 px, the plaque's padding 9 12 9 8.
  for (const pl of document.querySelectorAll(':is(.awards-night, .ov .book) .pl.tro')) {
    const n = pl.querySelector('.n'), c = pl.querySelector('.c'), cs = getComputedStyle(pl);
    if (n && getComputedStyle(n).fontSize !== '15px') add('a plaque\\'s name is ' + getComputedStyle(n).fontSize + ', not 15px:' + text(n));
    if (c && getComputedStyle(c).fontSize !== '10px') add('a plaque\\'s citation is ' + getComputedStyle(c).fontSize + ', not 10px:' + text(c));
    const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' ');
    if (pad !== '9px 12px 9px 8px') add('a plaque\\'s padding is ' + pad + ':' + text(pl));
  }
  // The night's boxes (round R8c, B3): each 124 px high and holding what it holds; four on the front pages' columns
  // (the wide box over the third and fourth), fewer centred; an entry's name and short line each on one line, uncut.
  const plaques = [...document.querySelectorAll('.awards-night .plaques')].find((p) => p.offsetParent !== null);
  if (plaques) {
    const k = stage.width / 1280;
    const S = (r) => ({ l: (r.left - stage.left) / k, r: (r.right - stage.left) / k, t: (r.top - stage.top) / k, b: (r.bottom - stage.top) / k });
    const boxes = [...plaques.children].filter((e) => e.classList.contains('pl')).map((e) => [e, S(e.getBoundingClientRect())]);
    for (const [b, r] of boxes) {
      if (Math.abs(r.b - r.t - 124) > 0.5) add('an award box is ' + (r.b - r.t).toFixed(1) + ' px high, not 124:' + text(b));
      if (b.scrollHeight > b.clientHeight + 1) add('an award box does not hold what it holds: ' + b.scrollHeight + ' in ' + b.clientHeight + text(b));
    }
    const wide = boxes.find(([b]) => b.classList.contains('wide'));
    const columns = boxes.length === 4 ? [164, 406, 648, 890] : wide ? [164, 406, 648] : null;
    if (columns) {
      if (boxes.some(([, r], i) => Math.abs(r.l - columns[i]) > 1)) add('the award boxes stand at ' + boxes.map(([, r]) => Math.round(r.l)).join(', ') + ', not on the columns ' + columns.join(', '));
      if (wide && Math.abs(wide[1].r - wide[1].l - 468) > 1) add('the wide box is ' + Math.round(wide[1].r - wide[1].l) + ' px wide, not 468');
    } else if (boxes.length > 0) {
      const mid = (boxes[0][1].l + boxes[boxes.length - 1][1].r) / 2;
      if (Math.abs(mid - 640) > 1) add('the award plaques are centred on ' + mid.toFixed(1) + ', not 640');
    }
    for (const el of plaques.querySelectorAll('.pl.rest .rn, .pl.rest .rc')) if (el.scrollWidth > el.clientWidth + 0.5) add('an award\\'s line in the box is cut: ' + el.scrollWidth + ' in ' + el.clientWidth + text(el));
  }
  // The scrapbook's shelf (round R8c, B4): its last row inside the book, the book on the stage.
  const book = document.querySelector('.ov .book');
  const shelf = book ? [...book.querySelectorAll('.awards-page .prow')] : [];
  if (book && shelf.length > 0) {
    const b = book.getBoundingClientRect(), last = shelf[shelf.length - 1].getBoundingClientRect();
    if (last.bottom > b.bottom + 0.5) add('the shelf\\'s last row ends ' + (last.bottom - b.bottom).toFixed(1) + ' px below the book');
  }
  // The book one size on both pages (round R9a, D1): 580 tall, its page inside it, the book on the stage — the height
  // and the room under each page kept for the report.
  if (book) {
    const k = stage.height / 720, b = book.getBoundingClientRect(), pg = book.querySelector('.pages > .page:not(.going)');
    const h = b.height / k;
    if (Math.abs(h - 580) > 0.5) add('the scrapbook is ' + h.toFixed(1) + ' px tall on its ' + book.dataset.page + ' page, not 580');
    if (b.top < stage.top - 0.5 || b.bottom > stage.bottom + 0.5) add('the book runs off the stage');
    if (pg) {
      const room = (b.bottom - pg.getBoundingClientRect().bottom) / k;
      if (room < -0.5) add('the scrapbook\\'s ' + book.dataset.page + ' page ends ' + (-room).toFixed(1) + ' px below the book');
      const seen = (window.__book ??= {});
      const was = seen[book.dataset.page];
      if (!was || room < was.room) seen[book.dataset.page] = { h: Math.round(h * 10) / 10, room: Math.round(room * 10) / 10 };
    }
  }
  // The credits (round R7, A2; round R8b, C4): a role on one line, a name on at most two, the foot on one — and a foot.
  const lines = (el) => { const r = document.createRange(); r.selectNodeContents(el); const tops = []; for (const b of r.getClientRects()) if (b.width >= 1 && !tops.some((y) => Math.abs(y - b.top) < 3)) tops.push(b.top); return tops.length; };
  for (const row of document.querySelectorAll('.p-credits .crow')) {
    const role = row.querySelector('h4'), name = row.querySelector('span');
    if (role && lines(role) > 1) add('a credit\\'s role wraps:' + text(role));
    if (name && lines(name) > 2) add('a credit\\'s name runs to ' + lines(name) + ' lines:' + text(name));
  }
  const foot = document.querySelector('.p-credits .ver');
  if (document.querySelector('.p-credits') && !foot) add('the credits have no foot');
  if (foot && lines(foot) > 1) add('the credits\\' foot wraps:' + text(foot));
  // Juno on the night (round R8c, D4 and D5): her line one line, the night's top ending above the awards\\' label; the
  // last words\\' blocks on the stage and clear of the bottom block (PLAY AGAIN and the counters).
  const night = [...document.querySelectorAll('.awards-night')].find((n) => n.offsetParent !== null);
  if (night) {
    const line = night.querySelector('.a-rival');
    if (line && lines(line) > 1) add('Juno\\'s line runs to ' + lines(line) + ' lines:' + text(line));
    const top = night.querySelector('.a-top'), label = night.querySelector('.a-label');
    if (top && label && top.getBoundingClientRect().bottom > label.getBoundingClientRect().top + 0.5) add('the night\\'s top runs ' + (top.getBoundingClientRect().bottom - label.getBoundingClientRect().top).toFixed(1) + ' px into the awards\\' label');
    const bottom = night.querySelector('.a-bottom')?.getBoundingClientRect();
    for (const w of night.querySelectorAll('.lastword')) {
      if (w.offsetParent === null) continue;
      const r = w.getBoundingClientRect();
      if (r.left < stage.left - 0.5 || r.top < stage.top - 0.5 || r.right > stage.right + 0.5 || r.bottom > stage.bottom + 0.5) add('a last word runs off the stage:' + text(w));
      if (bottom && r.left < bottom.right && bottom.left < r.right && r.top < bottom.bottom && bottom.top < r.bottom) add('a last word meets the bottom block (PLAY AGAIN and the counters):' + text(w));
    }
  }
  // The business cards' faces (round R8a): no text on a card runs under its face — the name, the role and the quote
  // wrap beside it. Measured with the card's own tilt off, so a line's box is the line itself, then the tilt put back.
  for (const card of document.querySelectorAll('.manager-choice .bcard')) {
    const face = card.querySelector('.face');
    if (!face) { add('a business card without its face'); continue; }
    const was = [card.style.transform, card.style.transition];
    card.style.transition = 'none';
    card.style.transform = 'none';
    const f = face.getBoundingClientRect();
    for (const el of card.querySelectorAll('.nm, .role, .q, .desc, .perk, .tag')) {
      const range = document.createRange();
      range.selectNodeContents(el);
      if ([...range.getClientRects()].some((b) => b.width >= 1 && b.right > f.left + 0.5 && b.left < f.right - 0.5 && b.bottom > f.top + 0.5 && b.top < f.bottom - 0.5)) add('a business card\\'s text runs under its face:' + text(el));
    }
    [card.style.transform, card.style.transition] = was;
  }
  // The season's doors (round R8a, D1): the two always the same height; each odds stamp clear of its oval.
  if (document.querySelector('.doors .inv')) {
    const dm = __doorsMeasure();
    if (dm.heights.length === 2 && Math.abs(dm.heights[0] - dm.heights[1]) > 0.5) add('the doors differ in height: ' + dm.heights.join(' and '));
    for (const c of dm.clearance) if (c < 4) add('an odds stamp ' + (c < 0 ? 'stands on' : 'stands ' + c.toFixed(1) + ' px from') + ' its photograph');
  }
  return out;
};`;

/**
 * Runs in the page: the title (round R3, amended) — one photograph, the whole stage. The name on one line across the
 * stage; the slogan, the endings found, the links and BEGIN each hold their text, on the stage, clear of each other.
 */
const TITLE_AUDIT = `window.__titleAudit = (where) => {
  const out = [];
  const add = (m) => out.push(where + ': ' + m);
  const t = document.querySelector('.title-screen');
  if (!t) return out;
  const stage = document.querySelector('.stage').getBoundingClientRect();
  const k = stage.width / 1280;
  const S = (r) => ({ l: (r.left - stage.left) / k, t: (r.top - stage.top) / k, r: (r.right - stage.left) / k, b: (r.bottom - stage.top) / k });
  const name = (el) => el.tagName.toLowerCase() + '.' + String(el.className.baseVal ?? el.className).trim().split(/\\s+/).join('.');
  const holds = (el, what) => { if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) add(what + ' ' + name(el) + ' holds ' + el.scrollWidth + 'x' + el.scrollHeight + ' in ' + el.clientWidth + 'x' + el.clientHeight + ' "' + el.textContent.slice(0, 50) + '"'); };
  const within = (el, what) => { const a = S(el.getBoundingClientRect()); if (a.l < -0.5 || a.t < -0.5 || a.r > 1280.5 || a.b > 720.5) add(what + ' off the stage at ' + [a.l, a.t, a.r, a.b].map(Math.round) + ' "' + el.textContent.slice(0, 40) + '"'); };
  const tname = t.querySelector('.tname');
  if (tname) {
    if (tname.scrollWidth > tname.clientWidth + 1) add('the name is wider than the stage: ' + tname.scrollWidth);
    const r = document.createRange(); r.selectNodeContents(tname); const g = S(r.getBoundingClientRect());
    if (g.l < 0 || g.r > 1280 || g.t < 0) add('the name runs off the stage at ' + [g.l, g.t, g.r, g.b].map(Math.round));
  } else add('no name');
  // The foot's counts (round R4, A7): the endings found and the awards won, a row each, as one block.
  const parts = [['slogan', '.slogan'], ['endings and awards', '.counts'], ['links', '.tlinks'], ['BEGIN', '.begin']].map(([w, sel]) => [w, t.querySelector(sel)]);
  for (const row of t.querySelectorAll('.counts .found')) holds(row, 'count row');
  // Each counter's total is its dots (round R8c, B5): the endings' 14, the awards' 12.
  for (const row of t.querySelectorAll('.counts .found')) {
    const dots = row.querySelectorAll('.dots i').length;
    const m = /\\/\\s*(\\d+)/.exec(row.textContent);
    if (!m || Number(m[1]) !== dots) add('a counter reads "' + row.textContent.trim().slice(0, 40) + '" over ' + dots + ' dots');
  }
  for (const [w, el] of parts) { if (!el) { add('no ' + w); continue; } holds(el, w); within(el, w); }
  for (const l of t.querySelectorAll('.tlinks button')) { holds(l, 'link'); within(l, 'link'); }
  const boxes = parts.filter(([, el]) => el).map(([w, el]) => [w, S(el.getBoundingClientRect())]);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i][1], b = boxes[j][1];
    if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) add(boxes[i][0] + ' runs into ' + boxes[j][0]);
  }
  return out;
};`;

/**
 * Runs in the page: every card face (round R1, H1-H2) — the name in its box, the flavour clear of the body (one
 * order: name, body, flavour), no body line wider than the face, the body on the face, the pass's label clear of it.
 */
const FACES = `window.__faceAudit = (where) => {
  const out = [];
  for (const card of document.querySelectorAll('.card')) {
    const add = (m) => out.push(where + ': ' + (card.dataset.card ?? '?') + ' ' + m);
    const name = card.querySelector('.name'), body = card.querySelector('.body'), fx = card.querySelector('.fx'), fl = card.querySelector('.fl');
    if (name && (name.scrollHeight > name.clientHeight + 1 || name.scrollWidth > name.clientWidth + 1)) add('name does not fit its box');
    if (fx && fl && fl.offsetTop < fx.offsetTop + fx.offsetHeight + 8) add('flavour touches the body');
    for (const ln of card.querySelectorAll('.ln')) if (ln.scrollWidth > ln.clientWidth + 1) add('body line wider than the face: "' + ln.textContent + '"');
    if (body && body.offsetTop + body.offsetHeight > card.clientHeight - 6) add('body runs off the face');
    const pass = card.querySelector('.pass');
    if (pass && body) { const a = pass.getBoundingClientRect(), b = body.getBoundingClientRect(); if (a.top < b.bottom && a.bottom > b.top && a.left < b.right && a.right > b.left) add('the pass label overlaps the body'); }
  }
  return out;
};`;

/** Runs in the page (check/faces.html): every face of the content in a hand of five, of eight and an offer of four. */
const ALL_FACES = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.documentElement.dataset.motion = 'off';
  // The check measures where things settle: no transition carries a card between two groups' places.
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.appendChild(still);
  const issues = [];
  let groups = 0;
  // Every face before a lane is established, then in a music year and a screen year (round R4, A8): a screen card in
  // a music year shows its own clapperboard, a music card in a screen year its note (or its variant's clapperboard).
  for (const lane of [null, 'music', 'screen']) {
    for (const layout of ['hand5', 'hand8', 'offer']) {
      const n = window.__faces.show(layout, 0, lane);
      for (let g = 0; g < n; g++) {
        window.__faces.show(layout, g, lane);
        groups++;
        await sleep(40);
        const where = layout + ' ' + g + (lane ? ' (' + lane + ' year)' : '');
        issues.push(...__faceAudit(where), ...(layout === 'offer' ? __plainAudit(where) : __deskAudit(where)));
      }
    }
  }
  return { groups, cards: window.__faces.cards.length, issues };
})()`;

/**
 * Runs in the page: an event's own audit (round R2, Part C) — the letter holds its words, the caption stays clear of
 * the phone, and no words lie over other words (the SENT stamp included). Measured flat: the letter's and the
 * phone's turn would swell every line's box into the next.
 */
const EVENTS = `window.__eventAudit = (where) => {
  const out = [];
  const add = (m) => out.push(where + ': ' + m);
  const flat = document.createElement('style');
  flat.textContent = '.event-screen .letter, .event-screen .phone-big { transform: none !important; }';
  document.head.appendChild(flat);
  try {
    const screen = document.querySelector('.event-screen');
    if (!screen) { add('no event screen'); return out; }
    const shown = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false; } return true; };
    const inside = (r, b) => r.left >= b.left - 1 && r.top >= b.top - 1 && r.right <= b.right + 1 && r.bottom <= b.bottom + 1;
    const meets = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
    const words = (el) => ' "' + (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30) + '"';
    const letter = screen.querySelector('.letter');
    if (letter) {
      const box = letter.getBoundingClientRect();
      for (const el of letter.querySelectorAll('*')) { const r = el.getBoundingClientRect(); if (r.width >= 1 && r.height >= 1 && shown(el) && !inside(r, box)) add('off the letter:' + words(el)); }
    }
    const cap = screen.querySelector('.evcap'), phone = screen.querySelector('.phone-big');
    if (cap && phone && meets(cap.getBoundingClientRect(), phone.getBoundingClientRect())) add('the caption runs into the phone');
    const marks = [];
    const walk = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent.trim() || !shown(n.parentElement)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width >= 1 && r.height >= 1) marks.push({ el: n.parentElement, node: n, r });
    }
    const stamp = screen.querySelector('.sent');
    if (stamp && shown(stamp)) marks.push({ el: stamp, node: stamp, r: stamp.getBoundingClientRect() });
    for (let i = 0; i < marks.length; i++) for (let j = i + 1; j < marks.length; j++) {
      const a = marks[i], b = marks[j];
      if (a.node === b.node || a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (meets(a.r, b.r)) add('words overlap:' + words(a.el) + ' and' + words(b.el));
    }
  } finally { flat.remove(); }
  return out;
};`;

/** Runs in the page (check/events.html): every event, and the two at the schema's limits, in each of its states. */
const ALL_EVENTS = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.documentElement.dataset.motion = 'off';
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.appendChild(still);
  const issues = [];
  let shown = 0;
  let disabled = 0;
  // The texts' photographs (round R8b): loaded before anything is looked at; each text that carries one holds it in its
  // thread in every state, with room to spare (layout pixels, the phone's tilt aside).
  await window.__events.photos;
  const spare = {};
  const n = window.__events.show(0, 'choices');
  for (let i = 0; i < n; i++) {
    // A rival text with a thread for a run that never answered her (round R9a, A4): both threads, unmet and met.
    for (const met of window.__events.unmet[i] ? [false, true] : [null])
    for (const mode of ['choices', 'broke', 'answered']) {
      window.__events.show(i, mode, met === true);
      await sleep(40);
      const where = window.__events.ids[i] + ' ' + mode + (met === null ? '' : met ? ' met' : ' unmet');
      // Broke: only where a reply needs money, so one shows disabled with what it needs.
      if (mode === 'broke') { if (!document.querySelector('.event-screen .choose.off')) continue; disabled++; }
      shown++;
      issues.push(...__plainAudit(where), ...__eventAudit(where));
      const pic = document.querySelector('.event-screen .thread .pic');
      if (pic) {
        const th = pic.closest('.thread');
        const last = [...th.children].at(-1);
        const room = th.offsetTop + th.clientHeight - parseFloat(getComputedStyle(th).paddingBottom) - (last.offsetTop + last.offsetHeight);
        if (!pic.querySelector('img')) issues.push(where + ': its photograph is not in the thread');
        if (room < 0) issues.push(where + ': the thread overflows with its photograph, by ' + Math.round(-room) + ' px');
        spare[where] = Math.round(room);
      }
    }
  }
  return { events: n, shown, disabled, spare, issues };
})()`;

/** Runs in the page: plays RUNS seeded runs by DOM, auditing every state and every hover along the way. */
const DRIVE = (runs: number) => `(async () => {
  document.documentElement.dataset.motion = 'off';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const shown = async (selector, yes = true) => { for (let i=0;i<40;i++) { if (!!document.querySelector(selector) === yes) return; await sleep(10); } throw new Error('audit target did not ' + (yes ? 'open: ' : 'close: ') + selector); };
  let rnd = 424242;
  const rand = (k) => { rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0; return (rnd >>> 8) % k; };
  const issues = {};
  const note = (l) => { for (const m of l) issues[m] = (issues[m] || 0) + 1; };
  const seen = { cards: new Set(), faces: new Set(), papers: new Set(), states: 0, previews: 0, tips: 0, fronts: 0, bubbles: 0, maxHand: 0, screens: {}, extraPicks: 0, rerolls: 0, deckViews: 0, doors: { pairs: 0, apart: 0, tallest: 0, bottom: 0, clear: Infinity, worst: 0, worstBottom: 0 }, doorTips: {} };
  const longest = { ends: null, night: null };
  // The nights with five to eight awards (round R8c, B3): few years win five and seven is rare, so these are chosen
  // lists, shown in the night's place by the night's own component (ui/dev/night.tsx) — the plaques the longest
  // names and citations, the box the longest names and short lines, every boxed one fresh. The tightest line's room.
  // Then every line of Juno's in her place (D4: 21), and every last word (D5): each of hers (12) beside the manager's
  // longest, each manager's for each major (8) beside her longest.
  seen.nights = { lists: 0, tightest: null, lines: 0, words: 0 };
  const nights = async () => {
    const fx = await import('/ui/dev/night.tsx');
    const core = await import('/core/index.ts');
    const text = await import('/ui/text.ts');
    const { content } = await import('/ui/content.ts');
    const c = core.indexContent(content);
    const ids = c.awards.map((a) => a.id);
    const entry = (id) => Math.max(text.awardName(c, id).length, text.awardShort(c, id).length);
    const plaque = (id) => text.awardName(c, id).length + text.awardCitation(c, id).length;
    for (const n of [5, 6, 7, 8]) {
      const shown = n <= 6 ? 3 : 2;
      const rest = [...ids].sort((x, y) => entry(y) - entry(x)).slice(0, n - shown);
      const top = ids.filter((id) => !rest.includes(id)).sort((x, y) => plaque(y) - plaque(x)).slice(0, shown);
      const undo = fx.showPlaques(c, [...top, ...rest], rest);
      await sleep(30);
      plain('the night with ' + n + ' awards');
      // A line's room: from its words' end to its entry's end (the words' own box shrinks to them).
      const k = document.querySelector('.stage').getBoundingClientRect().width / 1280;
      for (const el of document.querySelectorAll('.awards-night .plaques .pl.rest :is(.rn, .rc)')) {
        const r = document.createRange();
        r.selectNodeContents(el);
        const ri = el.closest('.ri');
        const room = (ri.getBoundingClientRect().right - r.getBoundingClientRect().right) / k;
        if (!seen.nights.tightest || room < seen.nights.tightest.room) seen.nights.tightest = { room: Math.round(room * 10) / 10, what: el.textContent + ' (' + n + ')' };
      }
      seen.nights.lists++;
      undo();
    }
    const { t } = await import('/ui/i18n.ts');
    const arcs = c.press?.rival?.arcs ?? [];
    const keys = arcs.flatMap((a) => ['neutral', 'warm', 'cold'].flatMap((terms) => (a.award ? ['rival.' + a.id + '.end.' + terms + '.won', 'rival.' + a.id + '.end.' + terms + '.lost'] : ['rival.' + a.id + '.end.' + terms])));
    const line = document.querySelector('.awards-night .a-rival');
    if (line) {
      const was = line.textContent;
      for (const key of keys) {
        line.textContent = t(key);
        plain('Juno\\'s lines');
        seen.nights.lines++;
      }
      line.textContent = was;
    }
    const words = arcs.flatMap((a) => ['neutral', 'warm', 'cold'].map((terms) => 'rival.' + a.id + '.last.' + terms));
    const lasts = (c.managers?.managers ?? []).flatMap((m) => Object.values(m.lastWord ?? {}).map((bubbles) => ({ manager: m.id, bubbles })));
    const size = (keys) => keys.reduce((n, k) => n + t(k).length, 0);
    const longestLast = [...lasts].sort((x, y) => size(y.bubbles) - size(x.bubbles))[0] ?? null;
    const longestWord = [...words].sort((x, y) => t(y).length - t(x).length)[0] ?? null;
    for (const [last, word] of [...words.map((w) => [longestLast, w]), ...lasts.map((l) => [l, longestWord])]) {
      const undo = fx.showWords(c, last, word);
      await sleep(20);
      plain('the last words');
      seen.nights.words++;
      undo();
    }
  };
  const lastDoors = async () => {
    if (longest.ends === null) {
      const core = await import('/core/index.ts');
      const text = await import('/ui/text.ts');
      const { t } = await import('/ui/i18n.ts');
      const { content } = await import('/ui/content.ts');
      const c = core.indexContent(content);
      longest.ends = c.minors.map((m) => t('ui.gate.leadsTo', { ending: text.endingPair(c, m.major, m.id) })).sort((x, y) => y.length - x.length)[0];
      // A year wins at most eight (round R8c): the three longest names, then the most "+n" can say.
      longest.night = [...c.awards.map((a) => text.awardName(c, a.id)).sort((x, y) => y.length - x.length).slice(0, 3), t('ui.doors.nightMore', { n: 5 })].join(' · ');
      longest.label = t('ui.doors.night');
    }
    const added = [], hidden = [];
    for (const inv of document.querySelectorAll('.doors .inv')) {
      for (const el of inv.querySelectorAll('.ends, .night')) { hidden.push(el); el.style.display = 'none'; }
      const ends = document.createElement('div'); ends.className = 'ends'; ends.textContent = longest.ends;
      const night = document.createElement('div'); night.className = 'night'; const b = document.createElement('b'); b.textContent = longest.label; night.append(b, longest.night);
      inv.querySelector('.oc').after(ends, night); added.push(ends, night);
    }
    plain('the last doors at their longest');
    const dm = __doorsMeasure();
    seen.doors.worst = Math.max(seen.doors.worst, ...dm.heights);
    seen.doors.worstBottom = Math.max(seen.doors.worstBottom, ...dm.bottoms);
    for (const el of added) el.remove();
    for (const el of hidden) el.style.display = '';
  };
  const plain = (where) => { seen.screens[where] = (seen.screens[where] || 0) + 1; note(__plainAudit(where)); };
  const over = (el) => { el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })); };
  const out = (el) => { el.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' })); };
  // A panel (round R1, Part G): opened from its button, audited, closed from its own.
  const panel = async (opener, id, where = id) => {
    const b = document.querySelector(opener); if (!b) return;
    b.click(); await shown('.p-' + id); plain(where);
    // The scrapbook's second page (round R4, A7): the awards, as plaques.
    const awards = document.querySelector('.p-' + id + ' .tab[data-tab="awards"]');
    if (awards) { awards.click(); await sleep(30); plain(where + ' (awards)'); }
    document.querySelector('.p-' + id + ' .closeb').click(); await shown('.p-' + id, false);
  };
  const deck = async () => { seen.deckViews++; await panel('.desk .deckbtn', 'deck'); };
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.appendChild(still);
  // The title (round R3, amended): one photograph; audited as itself, its three panels from its links.
  note(__titleAudit('title'));
  seen.screens.title = 1;
  for (const [id, opener] of [['scrapbook', '.title-screen .scrapbook-open'], ['settings', '.title-screen .settings-open'], ['credits', '.title-screen .credits-open']]) await panel(opener, id);
  document.querySelector('.title-screen .begin').click();
  await sleep(40);
  plain('opening card');
  // The opening card (round R8d, A2): spring's oval above the date, its box there even before the picture comes, and
  // the column — the oval's top to CONTINUE's foot — inside the stage.
  {
    const st = document.querySelector('.stage').getBoundingClientRect(), k = st.height / 720;
    const oval = document.querySelector('.season-card .sc-photo'), go = document.querySelector('.season-card .into');
    if (!oval) note(['opening card: no oval above the date']);
    if (!go) note(['opening card: no CONTINUE']);
    if (oval && go) {
      const top = (oval.getBoundingClientRect().top - st.top) / k, bottom = (go.getBoundingClientRect().bottom - st.top) / k;
      seen.opening = { top: Math.round(top * 10) / 10, bottom: Math.round(bottom * 10) / 10 };
      if (top < 0 || bottom > 720) note(['opening card: its column runs from ' + top.toFixed(1) + ' to ' + bottom.toFixed(1) + ', off the 720 stage']);
    }
  }
  document.querySelector('.season-card .into').click();
  await sleep(20);
  for (let run = 0; run < ${runs}; run++) {
    let guard = 0;
    while (!document.querySelector('.ending') && guard++ < 800) {
      seen.states++;
      const phase = document.querySelector('.title-screen:not(.dim)') ? 'title' : document.querySelector('.season-card') ? 'season' : document.querySelector('.manager-choice') ? 'manager' : document.querySelector('.draft') ? 'draft' : document.querySelector('.gates') ? 'gate' : document.querySelector('.event-screen') ? 'event' : 'play';
      window.__auditProgress = { run, guard, phase, states:seen.states, previews:seen.previews, tips:seen.tips };
      // PLAY AGAIN leads back to the title (round R3, B6): audited, then BEGIN starts the next run.
      if (phase === 'title') { seen.screens.title++; note(__titleAudit('title')); document.querySelector('.title-screen .begin').click(); await sleep(8); continue; }
      if (phase === 'season') { plain('season card'); note(__deskAudit('season card')); document.querySelector('.season-card .into').click(); await sleep(8); continue; }
      if (phase === 'manager') { plain('manager'); note(__deskAudit('manager')); const take = [...document.querySelectorAll('.manager-choice .choose')]; take[run % take.length].click(); await sleep(8); continue; }
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
      if (phase === 'gate') {
        plain('doors');
        const dm = __doorsMeasure();
        if (dm.heights.length === 2) { seen.doors.pairs++; seen.doors.apart = Math.max(seen.doors.apart, Math.abs(dm.heights[0] - dm.heights[1])); }
        seen.doors.tallest = Math.max(seen.doors.tallest, ...dm.heights);
        seen.doors.bottom = Math.max(seen.doors.bottom, ...dm.bottoms);
        seen.doors.clear = Math.min(seen.doors.clear, ...dm.clearance);
        if (document.querySelector('.doors .inv .ends, .doors .inv .night')) await lastDoors();
        const take = [...document.querySelectorAll('.gates .take')].filter((b) => !b.disabled); take[rand(take.length)].click(); await sleep(6); continue;
      }
      // An event (round R2): its screen audited, then a reply it can afford; while the answer plays, nothing to take.
      if (phase === 'event') {
        plain('event'); note(__eventAudit('event'));
        const take = [...document.querySelectorAll('.event-screen .choose')].filter((b) => !b.disabled && b.getAttribute('aria-disabled') !== 'true');
        if (take.length) take[rand(take.length)].click();
        await sleep(6);
        continue;
      }
      const cards = [...document.querySelectorAll('.desk .hand .card')];
      seen.maxHand = Math.max(seen.maxHand, cards.length);
      for (const c of cards) { seen.cards.add(c.dataset.card); seen.faces.add([...c.classList].find((x) => x.startsWith('f-'))); over(c); await shown('.floating'); seen.previews++; note(__deskAudit('preview')); out(c); await shown('.floating', false); }
      const end = document.querySelector('.desk .endbtn'); if (end) { over(end); await shown('.floating'); note(__deskAudit('end preview')); out(end); await shown('.floating', false); }
      for (const cell of document.querySelectorAll('.desk .stats [data-tip]')) { over(cell); await shown('.tip.on'); seen.tips++; note(__deskAudit('tooltip')); out(cell); await shown('.tip.on', false); }
      // The doors card's rows (round R9c, E2): each its own tooltip, on the stage, its outcomes two lines of one line each.
      for (const row of document.querySelectorAll('.desk [data-hook="doors"] .door')) {
        over(row); await shown('.tip.on');
        const season = document.querySelector('.desk')?.dataset.season ?? '?';
        seen.doorTips[season] = (seen.doorTips[season] || 0) + 1;
        note(__deskAudit('door tooltip'));
        const t = document.querySelector('.desk .tip.on');
        const lines = [...t.querySelectorAll('.outcomes .oc-row')];
        if (lines.length !== 2) note(['door tooltip: ' + lines.length + ' lines of outcomes, not 2, for ' + row.dataset.gate]);
        for (const l of lines) { const k = [...l.children].map((c) => c.getBoundingClientRect()); if (k.some((b, i) => i > 0 && b.top >= k[0].bottom - 1)) note(['door tooltip: a line of outcomes wraps, ' + row.dataset.gate + ' "' + l.textContent + '"']); }
        out(row); await shown('.tip.on', false);
      }
      if (rand(3) === 0) {
        for (const p of [...document.querySelectorAll('.desk .pp')].filter((p) => !p.classList.contains('pos0'))) { p.click(); await sleep(4); seen.fronts++; seen.papers.add(p.dataset.paper); note(__deskAudit('paper ' + p.dataset.paper + ' forward')); }
        const b = [...document.querySelectorAll('.desk .bub:not(.who)')].at(-1); if (b) { b.click(); await sleep(4); seen.bubbles++; note(__deskAudit('reaction row')); document.body.click(); await sleep(2); }
      }
      if (rand(12) === 0) await deck();
      else if (rand(16) === 0) await panel('.desk .setbtn', 'settings', 'settings over the desk');
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
    if (seen.nights.lists === 0) await nights();
    await panel('.awards-night .scrapbook-open', 'scrapbook', 'scrapbook over the awards night');
    await panel('.awards-night .numbers-toggle', 'numbers', 'the numbers over the awards night');
    document.querySelector('button.play-again')?.click();
    await sleep(30);
  }
  return { states: seen.states, previews: seen.previews, tips: seen.tips, fronts: seen.fronts, bubbles: seen.bubbles, maxHand: seen.maxHand, screens: seen.screens, extraPicks: seen.extraPicks, rerolls: seen.rerolls, deckViews: seen.deckViews, doors: seen.doors, doorTips: seen.doorTips, nights: seen.nights, opening: seen.opening ?? null, book: window.__book ?? null, doorsCard: window.__doorsCard ?? null, cards: [...seen.cards].sort(), faces: [...seen.faces].sort(), issues: Object.entries(issues).sort((a, b) => b[1] - a[1]) };
})()`;

/**
 * Runs in the page (round R9b, D2b): the scrapbook opened from the title, with the collections the page loaded with —
 * each page's room under it; on the endings page each column's first clipping's top and every clipping's height with
 * its margin (stage px, so the columns' worst mix can be summed); on the awards page each plaque's words against its
 * padding box (the least room, and any plaque whose words run out of it).
 */
const BOOK_MEASURE = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const shown = async (sel, yes = true) => { for (let i = 0; i < 150; i++) { if (!!document.querySelector(sel) === yes) return; await sleep(20); } throw new Error('the scrapbook did not ' + (yes ? 'open' : 'close')); };
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.appendChild(still);
  document.querySelector('.title-screen .scrapbook-open').click();
  await shown('.p-scrapbook .ov-page, .p-scrapbook .cols');
  await sleep(40);
  const k = document.querySelector('.stage').getBoundingClientRect().height / 720;
  const book = document.querySelector('.ov .book');
  const room = () => (book.getBoundingClientRect().bottom - book.querySelector('.pages > .page:not(.going)').getBoundingClientRect().bottom) / k;
  const endings = room();
  const columns = [...book.querySelectorAll('.cols .col')].map((col) => {
    const clips = [...col.querySelectorAll('.clip')];
    // The first clipping's top in layout (a found one is turned, so its box's top is not), from the column's own.
    return { major: col.dataset.major, top: clips.length ? (col.getBoundingClientRect().top - book.getBoundingClientRect().top) / k + (clips[0].offsetTop - col.offsetTop) : 0, clips: clips.map((c) => ({ minor: c.dataset.minor, h: c.offsetHeight + parseFloat(getComputedStyle(c).marginBottom) })) };
  });
  const inner = (book.getBoundingClientRect().height) / k;
  document.querySelector('.p-scrapbook .tab[data-tab="awards"]').click();
  await shown('.p-scrapbook .awards-page');
  for (let i = 0; i < 50 && book.querySelector('.pages > .going'); i++) await sleep(20);
  await sleep(40);
  const awards = room();
  let tightest = Infinity;
  const out = [];
  for (const pl of book.querySelectorAll('.awards-page .pl')) {
    const r = pl.getBoundingClientRect(), cs = getComputedStyle(pl), tx = pl.querySelector('.tx')?.getBoundingClientRect();
    if (!tx) continue;
    const top = r.top + (parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop)) * k, bottom = r.bottom - (parseFloat(cs.borderBottomWidth) + parseFloat(cs.paddingBottom)) * k;
    const spare = Math.min(tx.top - top, bottom - tx.bottom) / k;
    tightest = Math.min(tightest, spare);
    if (spare < -0.5 || pl.scrollWidth > pl.clientWidth + 1) out.push('a plaque\\'s words run out of it (' + spare.toFixed(1) + ' px): ' + pl.dataset.award + (pl.classList.contains('dim') ? ', not won' : ', won'));
    if (Math.abs(r.height / k - 124) > 0.5) out.push('a plaque is ' + (r.height / k).toFixed(1) + ' px high, not 124: ' + pl.dataset.award);
  }
  document.querySelector('.p-scrapbook .closeb').click();
  await shown('.p-scrapbook', false);
  return { endings: Math.round(endings * 10) / 10, awards: Math.round(awards * 10) / 10, book: Math.round(inner * 10) / 10, columns, tightest: Math.round(tightest * 10) / 10, issues: out };
})()`;
type BookFill = { endings: number; awards: number; book: number; columns: { major: string; top: number; clips: { minor: string; h: number }[] }[]; tightest: number; issues: string[] };

/**
 * The scrapbook at its fullest (round R9b, D2b): the ids from the scrapbook itself, then the page loaded again with every
 * ending found and every award won, and with none — every line at its longest — and measured. The worst column is each
 * column's clippings, each found or not as it is taller. The collections are left empty.
 */
async function bookExtremes(page: Awaited<ReturnType<typeof launch>>, url: string, tag: string): Promise<{ all: BookFill; none: BookFill; worst: { major: string; room: number } }> {
  await openReady(page, `${url}?seed=20260929`);
  const ids = await page.evaluate<{ minors: string[]; awards: string[] }>(`(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    document.querySelector('.title-screen .scrapbook-open').click();
    for (let i = 0; i < 150 && !document.querySelector('.p-scrapbook .cols'); i++) await sleep(20);
    const minors = [...document.querySelectorAll('.p-scrapbook [data-minor]')].map((e) => e.dataset.minor);
    document.querySelector('.p-scrapbook .tab[data-tab="awards"]').click();
    for (let i = 0; i < 150 && !document.querySelector('.p-scrapbook .awards-page'); i++) await sleep(20);
    return { minors, awards: [...document.querySelectorAll('.p-scrapbook .awards-page [data-award]')].map((e) => e.dataset.award) };
  })()`);
  const fill = async (all: boolean): Promise<BookFill> => {
    await page.evaluate(`localStorage.setItem('overexposed.endingsFound', ${JSON.stringify(JSON.stringify(all ? ids.minors : []))}); localStorage.setItem('overexposed.awardsWon', ${JSON.stringify(JSON.stringify(all ? ids.awards : []))})`);
    await openReady(page, `${url}?seed=20260929`);
    await auditStep(page, `${tag} longest-text patch (the scrapbook ${all ? 'full' : 'empty'})`, PATCH);
    return auditStep<BookFill>(page, `${tag} the scrapbook ${all ? 'full' : 'empty'}`, BOOK_MEASURE);
  };
  const all = await fill(true);
  const none = await fill(false);
  await page.evaluate(`localStorage.removeItem('overexposed.endingsFound'); localStorage.removeItem('overexposed.awardsWon')`);
  // Each column's worst mix: its first clipping's top, and each clipping found or not as it is taller.
  const worst = all.columns.map((col, i) => {
    const other = none.columns[i];
    const height = col.clips.reduce((sum, clip, j) => sum + Math.max(clip.h, other?.clips[j]?.h ?? 0), 0);
    return { major: col.major, room: Math.round((all.book - col.top - height) * 10) / 10 };
  });
  return { all, none, worst: worst.reduce((a, b) => (b.room < a.room ? b : a)) };
}

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

type Out = { states: number; previews: number; tips: number; fronts: number; bubbles: number; maxHand: number; screens: Record<string, number>; extraPicks: number; rerolls: number; deckViews: number; doors: { pairs: number; apart: number; tallest: number; bottom: number; clear: number; worst: number; worstBottom: number }; doorTips: Record<string, number>; nights: { lists: number; tightest: { room: number; what: string } | null; lines: number; words: number }; opening: { top: number; bottom: number } | null; book: Record<string, { h: number; room: number }> | null; doorsCard: Record<string, { h: number; room: number; gap: number }> | null; cards: string[]; faces: string[]; issues: [string, number][] };

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
        await openReady(page,`${url}?seed=20260929`);
        const t0 = performance.now();
        console.log(`starting overflow ${tag}`);
        await auditStep(page, `${tag} longest-text patch`, PATCH);
        await page.evaluate(AUDIT);
        await page.evaluate(PLAIN);
        await page.evaluate(EVENTS);
        await page.evaluate(TITLE_AUDIT);
        const out = await auditStep<Out>(page, `${tag} ${RUNS} runs`, DRIVE(RUNS), 600_000);
        const screens = Object.entries(out.screens)
          .map(([k, n]) => `${k} ${n}`)
          .join(', ');
        console.log(
          `overflow check, ${tag}: ${out.states} states — ${out.previews} previews, ${out.tips} tooltips, ${out.fronts} papers pulled forward, ${out.bubbles} reaction rows, ` +
            `hands of up to ${out.maxHand}; screens ${screens} (${out.extraPicks} extra picks, ${out.rerolls} rerolls); ${out.cards.length} cards and ${out.faces.length} faces seen (${((performance.now() - t0) / 1000).toFixed(1)}s)`,
        );
        // The opening card (round R8d, A2): spring's oval to CONTINUE's foot.
        console.log(`overflow check, ${tag}: the opening card — ${out.opening ? `spring's oval from y ${out.opening.top} to CONTINUE's foot at y ${out.opening.bottom} of 720` : 'not measured'}`);
        // The scrapbook one size (round R9a, D1): both pages, each its height and the least room under its page.
        const pages = ['endings', 'awards'].map((p) => (out.book?.[p] ? `${p} ${out.book[p]!.h} tall, ${out.book[p]!.room} px under its page` : `${p} not seen`));
        console.log(`overflow check, ${tag}: the scrapbook — ${pages.join('; ')}`);
        if (pages.some((p) => p.endsWith('not seen'))) {
          failed = true;
          console.log('OVERFLOW scrapbook  a page of the scrapbook was not seen');
        }
        if (!out.opening) {
          failed = true;
          console.log('OVERFLOW opening  the opening card was not measured');
        }
        // The season's doors card (round R9b, A3): each season's tallest, its least room above the glass's foot and to a note.
        const seasons = ['spring', 'summer', 'autumn', 'winter'].map((s) => (out.doorsCard?.[s] ? `${s} ${out.doorsCard[s]!.h} px tall, ${out.doorsCard[s]!.room} px above the glass's foot, ${out.doorsCard[s]!.gap} px from the nearest note` : `${s} not seen`));
        console.log(`overflow check, ${tag}: the doors card — ${seasons.join('; ')}`);
        if (seasons.some((s) => s.endsWith('not seen'))) {
          failed = true;
          console.log('OVERFLOW doors card  a season\'s doors card was not seen');
        }
        // Its rows' tooltips (round R9c, E2): how many were opened in each season.
        const rowTips = ['spring', 'summer', 'autumn', 'winter'].map((s) => `${s} ${out.doorTips[s] ?? 0}`);
        console.log(`overflow check, ${tag}: the doors card's rows' tooltips — ${rowTips.join(', ')}`);
        if (rowTips.some((s) => s.endsWith(' 0'))) {
          failed = true;
          console.log('OVERFLOW doors card  a season\'s rows\' tooltips were not seen');
        }
        // The doors (round R8a, D1): each pair's heights, the tallest and where it ends, the stamps' clearance.
        const d = out.doors;
        console.log(
          `overflow check, ${tag}: doors — ${d.pairs} pairs, each pair's heights ${d.apart <= 0.5 ? 'equal' : `apart by up to ${d.apart} px`}; the tallest ${d.tallest} px, ending at y ${Math.round(d.bottom)}; ` +
            `the year's last doors at their longest (the longest ending line, three award names and +5) ${d.worst} px, ending at y ${Math.round(d.worstBottom)} of 720; the odds stamps ${d.clear.toFixed(1)} px or more from the photographs`,
        );
        // The nights with five to eight awards (round R8c, B3), from chosen lists: the tightest line in a box.
        const nt = out.nights;
        console.log(`overflow check, ${tag}: the night with 5, 6, 7 and 8 awards (${nt.lists} chosen lists) — the tightest line in a box ${nt.tightest ? `"${nt.tightest.what}", ${nt.tightest.room} px to spare` : '-'}; Juno's ${nt.lines} lines in her place, ${nt.words} pairs of last words`);
        if (nt.lists !== 4 || nt.lines !== 21 || nt.words !== 20) {
          console.log(`OVERFLOW nights  not all shown: ${nt.lists} of 4 lists, ${nt.lines} of 21 lines, ${nt.words} of 20 pairs of last words`);
          failed = true;
        }
        for (const [what, n] of out.issues.slice(0, 20)) console.log(`OVERFLOW ${n}x  ${what}`);
        if (out.issues.length > 0) failed = true;
        // Every face of the content, at its longest, in the hand and in an offer of four (round R1, H2).
        await openReady(page, `${url}check/faces.html`, `!!window.__faces && !!document.querySelector('.card')`);
        await auditStep(page, `${tag} faces patch`, PATCH);
        await page.evaluate(AUDIT);
        await page.evaluate(PLAIN);
        await page.evaluate(FACES);
        const faces = await auditStep<{ groups: number; cards: number; issues: string[] }>(page, `${tag} faces`, ALL_FACES, 120_000);
        console.log(`overflow check, ${tag}: all ${faces.cards} faces in a hand of five, a hand of eight and an offer of four (${faces.groups} groups)`);
        for (const m of [...new Set(faces.issues)].slice(0, 20)) console.log(`OVERFLOW faces  ${m}`);
        if (faces.issues.length > 0) failed = true;
        // Every event (round R2, Part C), and the two at the schema's limits — three messages and three replies, four
        // paragraphs and three choices: with their replies, with one they can't afford, and answered.
        await openReady(page, `${url}check/events.html`, `!!window.__events && !!document.querySelector('.event-screen')`);
        await auditStep(page, `${tag} events patch`, PATCH);
        await page.evaluate(PLAIN);
        await page.evaluate(EVENTS);
        const evs = await auditStep<{ events: number; shown: number; disabled: number; spare: Record<string, number>; issues: string[] }>(page, `${tag} events`, ALL_EVENTS, 120_000);
        console.log(`overflow check, ${tag}: ${evs.events} events (two at the limits) in ${evs.shown} states — with their replies, answered, and ${evs.disabled} with a reply they can't afford`);
        // The texts with a photograph (round R8b): every state of each, and the tightest.
        const rooms = Object.entries(evs.spare).sort((a, b) => a[1] - b[1]);
        const texts = new Set(rooms.map(([w]) => w.split(' ')[0]));
        console.log(`overflow check, ${tag}: ${texts.size} texts with their photographs in ${rooms.length} states — the tightest ${rooms[0]?.[0] ?? '-'}, ${rooms[0]?.[1] ?? '-'} px to spare`);
        // Juno's two (round R8c, D7): each text's tightest state — the carpet's in both its threads, a run that never
        // answered her and one that did (round R9a, A4).
        const juno = [['juno_carpet', 'unmet'], ['juno_carpet', 'met'], ['juno_unsigned', '']].map(([id, form]) => {
          const own = rooms.filter(([w]) => w.split(' ')[0] === id && (w.split(' ')[2] ?? '') === form);
          return `${id}${form ? ` ${form}` : ''} ${own.length ? `${own[0]?.[1]} px (${own[0]?.[0].split(' ')[1]})` : 'not shown'}`;
        });
        console.log(`overflow check, ${tag}: Juno's texts with their photographs — ${juno.join(', ')}`);
        if (juno.some((x) => x.endsWith('not shown'))) {
          console.log('OVERFLOW events  a text of Juno\'s with its photograph was not shown');
          failed = true;
        }
        if (texts.size === 0) {
          console.log('OVERFLOW events  no text showed a photograph');
          failed = true;
        }
        for (const m of [...new Set(evs.issues)].slice(0, 20)) console.log(`OVERFLOW events  ${m}`);
        if (evs.issues.length > 0) failed = true;
        // The scrapbook at its fullest (round R9b, D2b).
        const ex = await bookExtremes(page, url, tag);
        console.log(
          `overflow check, ${tag}: the scrapbook full and empty — endings ${ex.all.endings} px under the page with every one found, ${ex.none.endings} with none, ` +
            `the worst column (${ex.worst.major}, each clipping found or not as it is taller) ${ex.worst.room}; awards ${ex.all.awards} px under the page with all won, ${ex.none.awards} with none; ` +
            `every plaque's words ${Math.min(ex.all.tightest, ex.none.tightest)} px or more inside it`,
        );
        const bookIssues = [...ex.all.issues, ...ex.none.issues, ...(Math.min(ex.all.endings, ex.none.endings, ex.all.awards, ex.none.awards) < -0.5 ? ['a page of the scrapbook ends below the book'] : []), ...(ex.worst.room < -0.5 ? [`the column ${ex.worst.major} of clippings, found or not, ends ${-ex.worst.room} px below the book`] : [])];
        for (const m of bookIssues) console.log(`OVERFLOW scrapbook  ${m}`);
        if (bookIssues.length > 0) failed = true;
        if (REPLAYS) {
          let n = 0;
          let broke = 0;
          const held = new Set<string>();
          for (const [key, state] of Object.entries(states)) {
            await openReady(page,`${url}?seed=${state.seed}`);
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
  console.log(failed ? 'FAIL: some text does not fit, or a screen is cut off' : 'PASS: every text fits, at its longest, on the desk and the screens around it, in every browser and size');
} catch (err) {
  failed = true;
  console.error(`overflow check: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
