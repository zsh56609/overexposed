// npm run check:clicks — every control for a legal action can be seen and reached, and nothing swallows a click.
//
// Two assertions, over seeded runs played through the real UI, at three sizes (1280x720, 800x450, a phone held
// landscape) and in two browsers (headless Chrome and Firefox, check/browser.ts):
//
// 1. Reachable controls (round V1a, after the author found the draft's offers pushed off its panel): in every
//    state — the title and its credits, the manager choice, every draft (three offers and Dex's four, after an
//    extra pick, after a reroll), the season doors, every event (round R2: its replies, or its letter's tick
//    boxes), the hand, the deck viewer, the ending — every control for a
//    legal action lies inside the stage and is the element actually hit at its centre (elementFromPoint). A
//    fanned card is hit at the centre of the strip of it the next card leaves showing, in its own tilted frame.
//    A state with no control for any action fails too.
// 2. Nothing swallows a click (round 2c and V1a): at every play state, with the floating preview open over
//    each card and over END TURN, every card and END TURN — the hovered one included — is the element a click
//    reaches: END TURN at its centre and near each corner, a card across its visible strip, near its top, its
//    middle and its lower edge. A hover that opens no preview fails too, so the check is never vacuous.
// At every draft (round 2c): at most one extra card — Dex's — labelled with his line, the label inside its card.
// Every event on its own page (round R2, check/events.html), and two at the schema's limits — three messages and
// three replies, four paragraphs and three choices — with money and without: every reply it can afford is on the
// stage, hit at its centre and sends itself; one it can't afford sends nothing.
// The managers alternate run by run, so any two runs cover both. Transitions are switched off: the check
// measures where things settle.
//
// Runs the Vite dev server in-process. Usage:
//   node check/clicks.ts [--runs=4] [--sizes=1280x720,800x450,844x390m] [--browsers=chrome,firefox]

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { auditStep } from './audit-progress.ts';
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
  const stats = { runs: 0, states: 0, hovers: 0, targets: 0, points: 0, drafts: 0, extraDrafts: 0, controls: 0, byScreen: {}, extraPicks: 0, rerolls: 0, deckViews: 0, settingsViews: 0, events: 0, unaffordable: 0, seasonCards: 0 };
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
  // A panel (round R1, Part G) is the screen while it is open: the deck, the scrapbook, House rules, the credits.
  const screenOf = () => document.querySelector('.ov[data-panel]') ? document.querySelector('.ov[data-panel]').dataset.panel : document.querySelector('.season-card') ? 'season' : document.querySelector('.title-screen:not(.dim)') ? 'title' : document.querySelector('.manager-choice') ? 'manager' : document.querySelector('.draft') ? 'draft' : document.querySelector('.gates') ? 'doors' : document.querySelector('.event-screen') ? 'event' : document.querySelector('.ending') ? 'ending' : document.querySelector('.desk .hand') ? 'hand' : 'unknown';
  const CONTROLS = {
    // The title (round R3, amended): BEGIN and its three links.
    title: ['.title-screen .begin', '.title-screen .tlinks .link'],
    // A season's card, the opening's included (round R3): its button.
    season: ['.season-card .into'],
    credits: ['.p-credits .closeb', '.p-credits a'],
    scrapbook: ['.p-scrapbook .closeb', '.p-scrapbook .tab'],
    settings: ['.p-settings .closeb', '.p-settings .srow'],
    deck: ['.p-deck .closeb'],
    numbers: ['.p-numbers .closeb'],
    manager: ['.manager-choice .choose'],
    draft: ['.draft .take', '.draft > .row > button', '.desk .deckbtn', '.desk .setbtn'],
    doors: ['.gates .take', '.desk .deckbtn', '.desk .setbtn'],
    event: ['.event-screen .choose'],
    hand: ['.desk .endbtn', '.desk .deckbtn', '.desk .setbtn'],
    ending: ['button.play-again', '.awards-night .link'],
  };
  const reachable = () => {
    const screen = screenOf();
    const stage = document.querySelector('.stage').getBoundingClientRect();
    const inStage = (x, y) => x >= stage.left - 0.5 && x <= stage.right + 0.5 && y >= stage.top - 0.5 && y <= stage.bottom + 0.5;
    const els = (CONTROLS[screen] ?? []).flatMap((sel) => [...document.querySelectorAll(sel)]).filter((el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true');
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
  // A panel opens from its button, every control in it is reached, and it closes from its own button.
  const visit = async (opener, id) => {
    const b = document.querySelector(opener);
    if (!b) { note('no button opens ' + id); return false; }
    b.click(); await sleep(4);
    if (!document.querySelector('.p-' + id)) { note(opener + ' does not open ' + id); return false; }
    reachable();
    return true;
  };
  const close = async (id) => {
    document.querySelector('.p-' + id + ' .closeb')?.click(); await sleep(4);
    if (document.querySelector('.p-' + id)) note('the ' + id + ' panel does not close');
  };
  const openDeck = async () => {
    if (!(await visit('.desk .deckbtn', 'deck'))) return;
    stats.deckViews++;
    await close('deck');
  };
  // House rules over the desk: Mark my stories turns the red margin rule off and on again (left as it was).
  const openSettings = async () => {
    if (!(await visit('.desk .setbtn', 'settings'))) return;
    stats.settingsViews++;
    const mark = document.querySelector('.p-settings .srow[data-setting="markStories"]');
    const before = document.querySelector('.desk').classList.contains('marks');
    mark.click(); await sleep(4);
    if (document.querySelector('.desk').classList.contains('marks') === before) note('Mark my stories does not reach the desk');
    mark.click(); await sleep(4);
    if (document.querySelector('.desk').classList.contains('marks') !== before) note('Mark my stories does not turn back');
    await close('settings');
  };
  // Transitions are presentation: the check measures where things settle, not where they are mid-glide.
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { transition: none !important; }';
  document.head.appendChild(still);
  // The title and its three panels: the scrapbook, House rules, the credits.
  reachable();
  const TITLE_OPENS = { scrapbook: '.title-screen .scrapbook-open', settings: '.title-screen .settings-open', credits: '.title-screen .credits-open' };
  for (const id of ['scrapbook', 'settings', 'credits']) if (await visit(TITLE_OPENS[id], id)) await close(id);
  document.querySelector('.title-screen .begin').click();
  await sleep(40);
  // The opening card (round R3): spring's, before the manager.
  stats.states++;
  reachable();
  stats.seasonCards++;
  document.querySelector('.season-card .into').click();
  await sleep(20);
  for (let run = 0; run < ${runs}; run++) {
    let guard = 0;
    while (!document.querySelector('.ending') && guard++ < 800) {
      window.__auditProgress={run,guard,states:stats.states,controls:stats.controls,previews:stats.hovers,phase:document.querySelector('.manager-choice,.draft,.gates,.event-screen,.hand')?.className};
      stats.states++;
      reachable();
      if (document.querySelector('.title-screen:not(.dim)')) {
        // PLAY AGAIN leads back to the title (round R3, B6): BEGIN starts the next run.
        document.querySelector('.title-screen .begin').click();
      } else if (document.querySelector('.season-card')) {
        // A season's card waits for its button (round R3).
        stats.seasonCards++;
        document.querySelector('.season-card .into').click();
      } else if (document.querySelector('.manager-choice')) {
        // The managers alternate run by run (round V1a), so every check covers each of them.
        const take = [...document.querySelectorAll('.manager-choice .choose')].filter((b) => !b.disabled);
        take[run % take.length].click();
      } else if (document.querySelector('.draft')) {
        // Dex knows someone (round 2c, F1): at most one extra card, its paper-clipped tag (round R1) the manager's line, on its card.
        stats.drafts++;
        const extras = [...document.querySelectorAll('.draft .dslot.extra')];
        if (extras.length > 0) stats.extraDrafts++;
        if (extras.length > 1) note('a draft shows ' + extras.length + ' extra cards');
        for (const x of extras) {
          const lab = x.querySelector('.dtag');
          const text = (lab && lab.textContent) || '';
          if (!text || text.startsWith('manager.') || text.startsWith('TODO')) note('an extra card labelled "' + text + '"');
          const a = lab && lab.getBoundingClientRect();
          const b = x.getBoundingClientRect();
          if (a && (a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)) note('an extra card tag not on its card');
        }
        if (document.querySelectorAll('.draft .dslot').length > 4) note('a draft shows more than four cards');
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
      } else if (document.querySelector('.event-screen')) {
        // An event (round R2): a reply it can afford; one it can't shows, disabled, and takes no click.
        stats.events++;
        const all = [...document.querySelectorAll('.event-screen .choose')];
        const take = all.filter((b) => !b.disabled && b.getAttribute('aria-disabled') !== 'true');
        if (take.length < all.length) stats.unaffordable++;
        for (const off of all.filter((b) => !take.includes(b))) { off.click(); await sleep(2); if (!document.querySelector('.event-screen .choose')) note('a reply that cannot be afforded was taken'); }
        if (take.length) take[rand(take.length)].click();
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
        else if (rand(16) === 0) await openSettings();
        const playable = cards.filter((c) => c.getAttribute('aria-disabled') !== 'true');
        if (playable.length && rand(6)) playable[rand(playable.length)].click();
        else end.click();
      }
      await sleep(3);
    }
    stats.states++;
    reachable();
    // The awards night's scrapbook holds this year's ending among the found.
    if (await visit('.awards-night .scrapbook-open', 'scrapbook')) {
      if (!document.querySelector('.p-scrapbook .clip:not(.miss)')) note('the scrapbook shows no ending found after a year');
      await close('scrapbook');
    }
    // The year's numbers, in their own panel (round R3, D2).
    if (await visit('.awards-night .numbers-toggle', 'numbers')) await close('numbers');
    stats.runs++;
    document.querySelector('button.play-again')?.click();
    await sleep(20);
  }
  return { ...stats, blocked: Object.entries(blocked).sort((a, b) => b[1] - a[1]) };
})()`;

/**
 * Runs in the page (check/events.html): every event of the content, and the two at the schema's limits — three
 * messages and three replies, four paragraphs and three choices — with money to spare and with none (round R2).
 * Every reply it can afford is on the stage, hit at its centre, and its click sends that reply; one it can't
 * afford shows, disabled, and its click sends nothing.
 */
const EVENT_PAGE = `(async () => {
  document.documentElement.dataset.motion = 'off';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 200 && !window.__events; i++) await sleep(20);
  const still = document.createElement('style');
  still.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  document.head.appendChild(still);
  const blocked = [];
  let replies = 0, disabled = 0, states = 0;
  const n = window.__events.show(0, 'choices');
  const stage = document.querySelector('.stage').getBoundingClientRect();
  for (let i = 0; i < n; i++) for (const mode of ['choices', 'broke']) {
    window.__events.show(i, mode);
    await sleep(30);
    states++;
    const where = window.__events.ids[i] + ' ' + mode + ': reply ';
    const all = [...document.querySelectorAll('.event-screen .choose')];
    if (all.length === 0) blocked.push(where + 'none shown');
    for (const el of all) {
      const ok = !el.disabled && el.getAttribute('aria-disabled') !== 'true';
      const r = el.getBoundingClientRect();
      if (r.left < stage.left - 0.5 || r.top < stage.top - 0.5 || r.right > stage.right + 0.5 || r.bottom > stage.bottom + 0.5) blocked.push(where + el.dataset.choice + ' lies outside the stage');
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!top || !(top === el || el.contains(top))) { blocked.push(where + el.dataset.choice + ' is covered at its centre'); continue; }
      const before = window.__events.acted.length;
      top.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      await sleep(4);
      const sent = window.__events.acted.slice(before);
      if (ok) {
        replies++;
        if (sent.length !== 1 || sent[0].type !== 'CHOOSE_EVENT' || sent[0].choice !== Number(el.dataset.choice)) blocked.push(where + el.dataset.choice + ' sent ' + JSON.stringify(sent));
      } else {
        disabled++;
        if (sent.length > 0) blocked.push(where + el.dataset.choice + ' cannot be afforded but sent ' + JSON.stringify(sent));
      }
    }
  }
  return { events: n, states, replies, disabled, blocked };
})()`;

type Out = { runs: number; states: number; hovers: number; targets: number; points: number; drafts: number; extraDrafts: number; controls: number; byScreen: Record<string, number>; extraPicks: number; rerolls: number; deckViews: number; settingsViews: number; events: number; unaffordable: number; seasonCards: number; blocked: [string, number][] };

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
        const out = await auditStep<Out>(page,`clicks ${tag} ${RUNS} runs`,DRIVE(RUNS),600_000);
        const screens = Object.entries(out.byScreen)
          .map(([k, n]) => `${k} ${n}`)
          .join(', ');
        console.log(
          `click-through check, ${tag}: ${out.runs} runs, ${out.states} states — ${out.controls} controls reached (${screens}; ${out.extraPicks} extra picks, ${out.rerolls} rerolls, ${out.deckViews} deck views, ${out.settingsViews} House rules over the desk), ` +
            `${out.hovers} previews opened, ${out.targets} targets hit-tested at ${out.points} points, ${out.drafts} drafts (${out.extraDrafts} with Dex's extra card, labelled), ${out.events} events (${out.unaffordable} with a reply they could not afford, which took no click), ${out.seasonCards} season cards (${((performance.now() - t0) / 1000).toFixed(1)}s)`,
        );
        for (const [what, n] of out.blocked.slice(0, 20)) console.log(`BLOCKED ${n}x  ${what}`);
        if (out.blocked.length > 0 || out.runs < RUNS) failed = true;
        // Every event on its own page (round R2): its replies, and one it can't afford.
        await page.navigate(`${url}check/events.html`, 3000);
        const ev = await auditStep<{ events: number; states: number; replies: number; disabled: number; blocked: string[] }>(page, `clicks ${tag} events`, EVENT_PAGE, 120_000);
        console.log(`click-through check, ${tag}: ${ev.events} events (two at the limits) in ${ev.states} states — ${ev.replies} replies took their click, ${ev.disabled} it could not afford took none`);
        for (const what of ev.blocked.slice(0, 20)) console.log(`BLOCKED events  ${what}`);
        if (ev.blocked.length > 0 || ev.disabled === 0) failed = true;
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
