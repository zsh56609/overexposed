# Handoff: round V1a → V1b

Round V1a built the desk, static: the main screen as `docs/design/visual/README.md` §1–§7 describes it,
every state, hover, tooltips and the simple interactions. Round V1b adds the motion on the desk — README §9
"Playing a card" and "Month end". This note is what the V1b agent needs; the decisions behind each part are in
`docs/decisions.md` (the round's entries of 2026-10-01: "Round 308e7bb answered", then "Round V1a" Parts A–F and its acceptance).

## Where things are

| File | What it is |
|---|---|
| `ui/desk/model.ts` | The one adapter from /core: `deskModel({ state, steps, lines })` → `DeskModel`, every word and number on the desk. Pure and DOM-free; `check:preview` holds it to /core at every state. `deskIssue(state, steps)` gives the issue on the desk and the history it was composed from. |
| `ui/desk/Desk.tsx` | The scene's layers, back to front; `DeskActions` (`deck`, `play`, `end`, `focus`); the toast (`useToast`). Children draw over the scene: the hover previews. The plain screens stand beside it (below). |
| `ui/desk/StatBar.tsx`, `Icons.tsx` | §1. The icon symbols are drawn once (`IconDefs`) and used by reference. |
| `ui/desk/Mirror.tsx` | §3. |
| `ui/desk/Papers.tsx`, `halftone.ts` | §2, §7. `photoUrl(scene, season, variant)` draws and caches the halftone photographs (and the headshot). |
| `ui/desk/DeskItems.tsx`, `drawings.ts` | §4–§5: the desk's plane (`DeskPlane`: props, notebook, clippings, `Phone`), the standing props (`Uprights`: metronome, brush cup, mug, paper balls), the manager's `Bubbles`. |
| `ui/desk/Hand.tsx` | §6: `fan(n)`, `fanSpacing(n)`, the cards, END TURN. |
| `ui/desk/css/*.css`, `tokens.css`, `fonts.css` | Every rule scoped under `.desk`; colours are tokens (`tokens.css`). |

The run's state flows as before: `App` → `EventQueue` (`ui/queue.ts`) → `snap.state` and `snap.steps` →
`deskModel` (memoised on them) → `<Desk>`. The queue is still layer 1: `play()` drains a step at once and
`skip()` (called on every click) fast-forwards. **V1b's player goes there**: replace `play()` with a timed player
over each step's `events` (the frozen GameEvents, `docs/game-events.md`) and keep `skip()` as the fast-forward.
Nothing upstream changes.

**The plain screens stand beside the desk, never inside it.** Everything under `.desk` takes the desk's rules —
the `.desk *` reset, `.desk button`, the hand's — and the V1a build the author played lost the draft's cards
that way: the offers took the hand's `.desk .card` and fell off the stage. `App.tsx` now draws the draft and the
gates (over their own scrim, `.screen-over`), the deck and the error line beside `<Desk>`, inside `.stage`, and
the hand's rules are scoped to the hand (`.desk .hand .card`). Keep a new desk rule scoped to its part, and give
V2's screens their own root beside the desk. `check:clicks` and `check:overflow` now fail when a plain screen's
control leaves the stage or is covered.

## The hooks

Every element V1b animates carries a `data-hook` (or a stable class) and stays mounted across actions:

| Hook | Element | For |
|---|---|---|
| `stats` | the stat bar | — |
| `value-hype`, `value-craft`, `value-heat`, `value-money` | each cell's word or money (`.w`) | the value that rolls to its new number, briefly tinted |
| `number-hype`, `number-craft`, `number-heat` | the small number (`.n`) | the small signed figure appears just above it ("+4", "−£1,000") |
| `countdown` | the countdown pill (`.pill`, level classes `warn`, `close`, `over`) | `bump` when it changes |
| `bulbs` | the three action bulbs (`i`, `.used` from the left) | one goes dark per play; they relight on the deal |
| `date` | the date (`.when b`) | the date flips at the month's end |
| `mirror`, `today`, `clipping` | the mirror, the black card, the frenzy's clipping | — |
| `papers` | the three papers (`.news`, `data-front`); each page `.pp[data-paper]` with `pos0`–`pos2` | "Just in" printing, the paper behind lifting (`ping`), PRINTED stamp |
| — | each story: `.lead` or `.it`, `data-kind` (`player`, `scandal` lines are `player` with `.red`), `data-coming="1"` | the stories the month's end will print (the scandals): **news becomes a card** lifts exactly these |
| `notebook` | the notebook page (`.nb-txt`) | quiet work written word by word; the old line fades |
| `script`, `metronome` | the script prop, the metronome (its engine is in `Metronome`) | — |
| `phone` | the phone on the desk (bars `.nt.mgr` / `.nt.press`) | a message arriving adds a bar, lights the screen, buzzes |
| `bubbles` | the manager's messages; each bubble `.bub[data-k="<month>.<index>.<bubble>"]` | bubbles grow in at the bottom and push the others up |
| `hand` | the fan (`--strip` on it); each card `.card[data-uid][data-card]` | lift, carry, set down |
| `pile` | `.scene3d.pile`: this month's pile, in the desk's own perspective (1100px, vanishing point 640,140) | cards laid flat: give each a `.plane` (origin 640,556, the desk's hinge) and tilt it to 64° |
| `endturn` | END TURN (`.endbtn.end`) | the press at the month's end |
| `toast` | the note in the middle of the desk | — |

## What V1a left to V1b on purpose

- **Stat changes are plain**: the values change at once. V1b adds the rolling value and the small figure above
  it (README §9). Signed figures already use a true minus (U+2212) through `signed()` and `signedMoney()`.
- **Playing a card is plain**: the card leaves the fan and the fan re-lays at once. The mockup's `left .45s`
  transition on `.card` (the hand closing the gap) was left out; the cards only transition their hover.
  `fan(n)` gives each card's `left`, tilt and lift; the fan never reaches END TURN (at most 960px wide) and
  narrows its text to `--strip`.
- **The papers already show the month's end**: in the play phase the issue on the desk is the month as it would
  print if the player ended it now — `check:preview` asserts it equals the printed month, so the month-end beats
  can run from the desk as it stands. The stories the end adds carry `data-coming`.
- **The papers stand by transform**, not `left`/`top`: `.pp.pos0` is `translate(0, 56px) rotate(-.8deg)`,
  `.pos1` `translate(-8px, 0) rotate(-2deg)`, `.pos2` `translate(12px, 28px) rotate(1.6deg)`; a back paper's
  shade is a veil (`::before`, opacity `--shade`), not `filter` (a filter transition dropped frames in Firefox).
  **A `ping` keyframe must compose the paper's own translate and tilt**, or it will jump.
- **Crisis props fade by class**: the clippings and paper balls are always mounted; `.desk.crisis` shows them.
- **Reduced motion**: the bulbs' flicker, the steam, the phone's buzz and the scandal shake stop under the
  system's `prefers-reduced-motion`, and the metronome starts stopped. V2's "Reduce motion" setting should drive
  the same switches; V1b's beats should honour both.
- **The pile layer is empty**; `.scene3d` and `.plane` are in `css/scene.css`.

## Checks that cover the desk

- `npm run check:preview` — every number and word on the desk against /core, at every state of 300 runs; the
  issue before END TURN equals the month printed. Then `check:clicks`.
- `npm run check:clicks` — in every state, every control for a legal action (on the title, the credits, the
  manager choice, the draft, the doors, the hand, the deck, the ending) lies on the stage and is the element hit
  at its centre — a fanned card across the strip its neighbour leaves, in its own tilted frame — and no click on
  a card or END TURN is swallowed by its preview. At 1280×720, 800×450 and a phone held landscape, in Chromium
  and Firefox; transitions are switched off while it measures.
- `npm run check:overflow` — every text at its longest variant, on the desk at every state and hover and on the
  plain screens (nothing off the stage, nothing cut off), at the three sizes in both browsers.
  `npm run check:overflow:full` plays 10 runs a size and replays every state of `check/desk-states.json`.
- `npm run check:interactions` — the desk by real input: the stat bar's tooltips by mouse, long-press and
  keyboard; the bubbles' reactions; the metronome; switching papers touches only the papers; the scandal's
  shake, "no actions left", the preview, a play, END TURN and the deck.

A motion round should keep them green: the checks switch transitions off, so a V1b animation must settle into
the same layout. Headless Firefox never has window focus, so the keyboard test is skipped there.

## Tools

Everything below runs from the repo alone: no dependency beyond `package.json`, and Chrome (or Edge) and Firefox
where they are usually installed on Windows, macOS or Linux (`check/browser.ts`: Chrome over the DevTools
protocol, Firefox over WebDriver BiDi; `CHROME_PATH` and `FIREFOX_PATH` point elsewhere). Shots and sheets go to
`check/out/`, sim records to `sim/out/` — neither is committed: keep a baseline on the machine that compares
against it. On Windows, Firefox's sandbox sometimes fails to start a tab's process and the tab never loads:
the driver starts such a browser again and says so on stderr ("(firefox: … starting it again)"). A browser that
stops answering fails the check after two minutes (twenty for a page script, which may run a whole audit),
naming the command, instead of hanging it.

| Command | What it does |
|---|---|
| `npm run desk:states` | The state finder: the sim's personas play until every target is met, and the steps that reach each state ([kind, index] per action) go to `check/desk-states.json` — the reference shots' states, more of the desk (no lane yet, frenzies, the countdown's levels), the biggest hand, a hand for every card, every minor ending. Run it after a content change: old steps stop replaying. |
| (module) `check/desk-replay.ts` | The replay steps: `reach()` loads a state's seed and clicks its steps through the real UI; `post()` adds a finishing touch (a tooltip, a paper forward, a hover, a bubble's reactions). |
| `npm run check:overflow:full` | The longer overflow audit: 10 runs a size, then every recorded state replayed and audited, with each card's preview and each paper forward. |
| `npm run check:interactions` | Above. |
| `npm run desk:shots -- s02 s07:paper=flash` · `-- --all` · `-- --screens` | Screenshots of recorded states (with a finishing touch), of all of them, or of every screen of one run: the title, the credits, the manager choice, drafts of three and four, after an extra pick and a reroll, the deck, a door, the last door, the hand, the ending. `--browser=`, `--size=`, `--out=`. |
| `npm run desk:compare` | The reference comparison: the game in the state nearest each of shots 01–14, beside the shot, into `docs/handoff/v1a-compare/` (`--out=` elsewhere). |
| `npm run desk:perf` | The production build's timings: the cold load, the first desk after the manager's choice, a play, sweeping the hand, switching papers; at 1× and 4× CPU (`--throttle=`), in Chromium and Firefox. |
| `npm run desk:photos` | A contact sheet of every halftone photograph the papers can print. |
| `npm run desk:sheet -- <out.png> <in.png>…` | Screenshots on one sheet: a captioned grid (`--cols=`), or the same strip of each stacked (`--band=0,110`). |
| `npm run sim:baseline -- --out=sim/out/<name>`, `npm run sim:compare -- <a> <b>` | Records `sim`, `sim:awards`, `sim:tiers` and `sim:managers` on seeds 20260929, 1 and 424242; then proves two records the same game, every run record and every report line. A round that must not move the numbers records before and after. |
| `npm run tune:thresholds` | The distributions behind year-end thresholds — final hype, craft and money, peak hype, the best month, scandals at the peak and at the end, the drop — per persona, pooled, and within each major. `--dump=` writes every year end as JSON. |
| `npm run tune:endings -- --patch="…"` | Majors and minors per persona under the content and under candidate patches of the endings, resolved by /core's own query on the same years; `--awards` adds the awards each ending brings. |
| `npm run tune:lanes` | When the career lane settles, for candidate rules (`--plays=`, `--leads=`). |
| `npm run tune:try -- --patch="…"` | A content change tried before it is made: validated, played in memory on three seeds under each manager; the failing bands and the endings printed. Nothing is written. |

Every `tune` script takes `--runs=`, `--seed=` (`tune:try`: `--seeds=`) and `--manager=`; a patch is a JS function
body run on a copy of the content, with its parts by name and `card(id)`, `gate(id)`, `major(id)`, `minor(id)`,
`award(id)`, `axis(id)` (`sim/tune/common.ts`).

Left out, on purpose:
- **One-off importers** of the author's drafts (v1–v7) into `i18n/en.json` and `/content`: each ran once on its
  draft's layout; the drafts are in `docs/writing/`, the results in the repo. A new draft needs its own importer.
- **File-editing scripts**: how edits were made, not tools.
- **Probes whose answers are recorded** in `docs/decisions.md`: decision 1's scandal count against decision 2's
  preview (now held by `check:preview`), final gates with one ending and different awards, one run's final-gate
  previews, stat tiers along recorded runs, the stage's worst cases (now the biggest hand and the overflow audit),
  the desk model's smoke test (covered by `check:preview`), one-off measurements and searches.
- **Formatters for the author's round summaries**: the sim's own reports carry the numbers.

## Open questions left for the author (not V1b's to decide)

- README §7 and /core's lead-paper rule disagree when a Known player's scandal month also has a lead story in
  the lane's paper (Part D entry). Shot 09 is the case.
- The B-Side's ★★★★☆ under the player's single is left out: the game has no review score.
- The ten film titles are the mockup's sample list, kept `TODO(prose)`.
- The deck opens from a button in the stat bar until V2 places it.
