// npm run check:clicks — every control for a legal action can be seen and reached, and nothing swallows a click.
//
// Two assertions, over seeded runs played through the real UI, at three sizes (1280x720, 800x450, a phone held
// landscape) and in two browsers (headless Chrome and Firefox, check/browser.ts):
//
// 1. Reachable controls (round V1a, after the author found the draft's offers pushed off its panel): in every
//    state — the title and its credits, the manager choice, every draft (three offers and Dex's four, after an
//    extra pick, after a reroll), the season doors, the hand, the deck viewer, the ending — every control for a
//    legal action lies inside the stage and is the element actually hit at its centre (elementFromPoint). A
//    fanned card is hit at the centre of the strip of it the next card leaves showing, in its own tilted frame.
//    A state with no control for any action fails too.
// 2. Nothing swallows a click (round 2c and V1a): at every play state, with the floating preview open over
//    each card and over END TURN, every card and END TURN — the hovered one included — is the element a click
//    reaches: END TURN at its centre and near each corner, a card across its visible strip, near its top, its
//    middle and its lower edge. A hover that opens no preview fails too, so the check is never vacuous.
// At every draft (round 2c): at most one extra card — Dex's — labelled with his line, the label inside its card.
// The managers alternate run by run, so any two runs cover both. Transitions are switched off: the check
// measures where things settle.
//
// Runs the Vite dev server in-process. Usage:
//   node check/clicks.ts [--runs=4] [--sizes=1280x720,800x450,844x390m] [--browsers=chrome,firefox]

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { browsersFromArgs, launch, sizesFromArgs } from './browser.ts';
import { checkD7 } from './motion.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name: string, fallback: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const RUNS = Number(arg('runs', '4'));
const SIZES = sizesFromArgs(process.argv);
const BROWSERS = browsersFromArgs(process.argv);

/** Runs in the page: plays RUNS seeded runs by DOM, asserting reachable controls and unswallowed clicks. */
const DRIVE = (runs: number) => `(async () => {
  document.documentElement.dataset.motion = 'off';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let rnd = 20260929;
  const rand = (k) => { rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0; return (rnd >>> 8) % k; };
  const blocked = {};
  const note = (m) => { blocked[m] = (blocked[m] || 0) + 1; };
  const stats = { runs: 0, states: 0, hovers: 0, targets: 0, points: 0, drafts: 0, extraDrafts: 0, controls: 0, byScreen: {}, extraPicks: 0, rerolls: 0, deckViews: 0 };
  const POINTS = [[0.5, 0.5], [0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]];
  const name = (el, cards, end) => (el === end ? 'END TURN' : 'card ' + (cards.indexOf(el) + 1) + ' of ' + cards.length);
  const describe = (el) => !el ? 'nothing' : el.tagName.toLowerCase() + (el.className ? '.' + String(el.className.baseVal ?? el.className).trim().split(/\\s+/).join('.') : '') + (el.closest('.floating') ? ' (inside .floating)' : '');
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 30);
  const hitBy = (target) => {
    const r = target.getBoundingClientRect();
    for (const [fx, fy] of POINTS) {
      stats.points++;
      const top = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
      if (!top || !(top === target || target.contains(top))) return top;
    }
    return null;
  };
  // A fanned card is tilted and the next one overlaps it: probe points placed inside the card itself, across
  // the strip the next card leaves showing, are carried by the card's own transform.
  const stripOf = (card, cards) => { const next = cards[cards.indexOf(card) + 1]; return next ? Math.min(card.offsetWidth, next.offsetLeft - card.offsetLeft) : card.offsetWidth; };
  const probe = (card, x, y) => {
    const p = document.createElement('i');
    p.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:1px;height:1px;pointer-events:none';
    card.appendChild(p);
    const r = p.getBoundingClientRect();
    p.remove();
    return [r.left + 0.5, r.top + 0.5];
  };
  const hitCard = (card, cards) => {
    const strip = stripOf(card, cards);
    for (const [x, y] of [[10, 22], [strip - 12, 22], [strip / 2, 110], [10, 200], [strip - 12, 200]]) {
      stats.points++;
      const [px, py] = probe(card, x, y);
      const top = document.elementFromPoint(px, py);
      if (!top || !(top === card || card.contains(top))) return top;
    }
    return null;
  };
  // Assertion 1: every control for a legal action, inside the stage and hit at its centre.
  const screenOf = () => document.querySelector('.deck-viewer') ? 'deck' : document.querySelector('.plain.credits') ? 'credits' : document.querySelector('.plain.title') ? 'title' : document.querySelector('.manager-choice') ? 'manager' : document.querySelector('.draft') ? 'draft' : document.querySelector('.gates') ? 'doors' : document.querySelector('.ending') ? 'ending' : document.querySelector('.desk .hand') ? 'hand' : 'unknown';
  const CONTROLS = {
    title: ['button.big', '.credits-open'],
    credits: ['.plain.credits button'],
    manager: ['.manager-choice .choose'],
    draft: ['.draft .take', '.draft > .row > button', '.desk .deckbtn'],
    doors: ['.gates .take', '.desk .deckbtn'],
    hand: ['.desk .endbtn', '.desk .deckbtn'],
    deck: ['.deck-viewer .row button'],
    ending: ['button.play-again'],
  };
  const reachable = () => {
    const screen = screenOf();
    const stage = document.querySelector('.stage').getBoundingClientRect();
    const inStage = (x, y) => x >= stage.left - 0.5 && x <= stage.right + 0.5 && y >= stage.top - 0.5 && y <= stage.bottom + 0.5;
    const els = (CONTROLS[screen] ?? []).flatMap((sel) => [...document.querySelectorAll(sel)]).filter((el) => !el.disabled);
    const cards = screen === 'hand' ? [...document.querySelectorAll('.desk .hand .card')] : [];
    const playable = cards.filter((c) => c.getAttribute('aria-disabled') === 'false');
    if (screen === 'unknown') note('a state with no screen the check knows');
    if (els.length + playable.length === 0) note(screen + ': no control for any action');
    stats.byScreen[screen] = (stats.byScreen[screen] || 0) + 1;
    for (const el of els) {
      stats.controls++;
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (r.width < 1 || r.height < 1) { note(screen + ': "' + label(el) + '" has no size'); continue; }
      if (r.left < stage.left - 0.5 || r.top < stage.top - 0.5 || r.right > stage.right + 0.5 || r.bottom > stage.bottom + 0.5) note(screen + ': "' + label(el) + '" lies outside the stage');
      const top = document.elementFromPoint(x, y);
      if (!top || !(top === el || el.contains(top))) note(screen + ': "' + label(el) + '" is covered at its centre by ' + describe(top));
    }
    for (const card of playable) {
      stats.controls++;
      const [x, y] = probe(card, stripOf(card, cards) / 2, 110);
      if (!inStage(x, y)) note('hand: card ' + (cards.indexOf(card) + 1) + ' of ' + cards.length + ' lies outside the stage');
      const top = document.elementFromPoint(x, y);
      if (!top || !(top === card || card.contains(top))) note('hand: card ' + (cards.indexOf(card) + 1) + ' of ' + cards.length + ' is covered at its centre by ' + describe(top));
    }
  };
  const openDeck = async () => {
    const b = document.querySelector('.desk .deckbtn');
    if (!b) return;
    b.click(); await sleep(4);
    stats.deckViews++;
    reachable();
    document.querySelector('.deck-viewer .row button')?.click(); await sleep(4);
    if (document.querySelector('.deck-viewer')) note('the deck viewer does not close');
  };
  // Transitions are presentation: the check measures where things settle, not where they are mid-glide.
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { transition: none !important; }';
  document.head.appendChild(still);
  // The title and its credits.
  reachable();
  document.querySelector('.credits-open')?.click(); await sleep(10);
  reachable();
  document.querySelector('.plain.credits button')?.click(); await sleep(10);
  document.querySelector('button.big').click();
  await sleep(40);
  for (let run = 0; run < ${runs}; run++) {
    let guard = 0;
    while (!document.querySelector('.ending') && guard++ < 800) {
      stats.states++;
      reachable();
      if (document.querySelector('.manager-choice')) {
        // The managers alternate run by run (round V1a), so every check covers each of them.
        const take = [...document.querySelectorAll('.manager-choice .choose')].filter((b) => !b.disabled);
        take[run % take.length].click();
      } else if (document.querySelector('.draft')) {
        // Dex knows someone (round 2c, F1): at most one extra card, labelled with the manager's line, inside its card.
        stats.drafts++;
        const extras = [...document.querySelectorAll('.draft .card.extra')];
        if (extras.length > 0) stats.extraDrafts++;
        if (extras.length > 1) note('a draft shows ' + extras.length + ' extra cards');
        for (const x of extras) {
          const lab = x.querySelector('.extra-label');
          const text = (lab && lab.textContent) || '';
          if (!text || text.startsWith('manager.') || text.startsWith('TODO')) note('an extra card labelled "' + text + '"');
          const a = lab && lab.getBoundingClientRect();
          const b = x.getBoundingClientRect();
          if (a && (a.left < b.left - 0.5 || a.right > b.right + 0.5 || a.top < b.top - 0.5 || a.bottom > b.bottom + 0.5)) note('an extra card label outside its card');
        }
        if (document.querySelectorAll('.draft .card.offer').length > 4) note('a draft shows more than four cards');
        // Now and then an extra pick or a reroll when there is one to take, and a look at the deck.
        const [extra, reroll] = [...document.querySelectorAll('.draft > .row > button')];
        const roll = rand(8);
        if (roll === 0) await openDeck();
        if (roll <= 2 && extra && !extra.disabled) { extra.click(); stats.extraPicks++; }
        else if (roll <= 4 && reroll && !reroll.disabled) { reroll.click(); stats.rerolls++; }
        else { const take = [...document.querySelectorAll('.draft .take')].filter((b) => !b.disabled); take[rand(take.length)].click(); }
      } else if (document.querySelector('.gates')) {
        const take = [...document.querySelectorAll('.gates .take')].filter((b) => !b.disabled);
        take[rand(take.length)].click();
      } else {
        // Assertion 2: under every preview, every card and END TURN still takes the click.
        const cards = [...document.querySelectorAll('.desk .hand .card')];
        const end = document.querySelector('.desk .endbtn');
        const targets = [...cards, end];
        for (const source of targets) {
          source.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
          for (let wait = 0; wait < 30 && !document.querySelector('.floating'); wait++) await sleep(10);
          stats.hovers++;
          if (!document.querySelector('.floating')) note('no preview opened over ' + name(source, cards, end));
          for (const target of targets) {
            stats.targets++;
            const by = target === end ? hitBy(target) : hitCard(target, cards);
            if (by) note(name(target, cards, end) + ' blocked by ' + describe(by) + ' while previewing ' + name(source, cards, end));
          }
          source.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }));
          await sleep(1);
        }
        if (rand(12) === 0) await openDeck();
        const playable = cards.filter((c) => c.getAttribute('aria-disabled') !== 'true');
        if (playable.length && rand(6)) playable[rand(playable.length)].click();
        else end.click();
      }
      await sleep(3);
    }
    stats.states++;
    reachable();
    stats.runs++;
    document.querySelector('button.play-again')?.click();
    await sleep(20);
  }
  return { ...stats, blocked: Object.entries(blocked).sort((a, b) => b[1] - a[1]) };
})()`;

type Out = { runs: number; states: number; hovers: number; targets: number; points: number; drafts: number; extraDrafts: number; controls: number; byScreen: Record<string, number>; extraPicks: number; rerolls: number; deckViews: number; blocked: [string, number][] };

const server = await createServer({ root: ROOT, logLevel: 'error', server: { port: 5190, strictPort: false } });
await server.listen();
const url = server.resolvedUrls?.local[0];
let failed = false;
try {
  if (!url) throw new Error('the dev server did not start');
  for (const browser of BROWSERS) {
    for (const size of SIZES) {
      const tag = `${browser} ${size.width}x${size.height}${size.mobile ? ' (phone)' : ''}`;
      const page = await launch(browser, size);
      try {
        await checkD7(page, url);
        await page.navigate(`${url}?seed=20260929`, 3000);
        const t0 = performance.now();
        const out = await page.evaluate<Out>(DRIVE(RUNS));
        const screens = Object.entries(out.byScreen)
          .map(([k, n]) => `${k} ${n}`)
          .join(', ');
        console.log(
          `click-through check, ${tag}: ${out.runs} runs, ${out.states} states — ${out.controls} controls reached (${screens}; ${out.extraPicks} extra picks, ${out.rerolls} rerolls, ${out.deckViews} deck views), ` +
            `${out.hovers} previews opened, ${out.targets} targets hit-tested at ${out.points} points, ${out.drafts} drafts (${out.extraDrafts} with Dex's extra card, labelled) (${((performance.now() - t0) / 1000).toFixed(1)}s)`,
        );
        for (const [what, n] of out.blocked.slice(0, 20)) console.log(`BLOCKED ${n}x  ${what}`);
        if (out.blocked.length > 0 || out.runs < RUNS) failed = true;
      } finally {
        await page.close();
      }
    }
  }
  console.log(failed ? 'FAIL: a control could not be reached, or a click was swallowed' : 'PASS: every control for a legal action is on the stage and takes its click, in every browser and size');
} catch (err) {
  failed = true;
  console.error(`click-through check: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
