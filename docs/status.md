# Status

As of 2026-10-01, end of round V1a, with the fix for the draft the author could
not play and every tool in the repo for the handoff. **Read this first; update it
at the end of every session** (AGENTS.md → Session rules).

Overexposed is a deck-building career sim for the Game Gauntlet SIM Jam,
played in the browser. You are a young singer with one year: 12 months
(4 seasons × 3), March 2027 to February 2028. Fast hype builds heat, heat
crystallises into scandal cards, and scandals clog the hand by winter.
The year ends on one of four major endings, refined into fourteen minors
by the career lane you drifted into (music, screen, celebrity) and the
shape of the year. Before month 1 you choose a manager, who texts you as
each month opens and has the last word at the year's end. Three papers —
The Daily Flash, B-Side, Marquee — print what you do in public, a notebook
keeps what you do in private, and each month's front pages show how much
of the world's news is you.

Where things are:
- Rules and architecture: [AGENTS.md](../AGENTS.md).
- UI scope: [ui-plan.md](ui-plan.md).
- Design decisions: [decisions.md](decisions.md).
- The visual design reference, newer than ui-plan §14 and winning where
  they differ: [design/visual/README.md](design/visual/README.md).
- The content expansion, approved by the author and the reference for
  this phase: [design/content-expansion.md](design/content-expansion.md).
  Phase 1 and rounds 2a, 2b and 2c of phase 2 are done.

## Done

| Area | State | Where |
|---|---|---|
| Engine | Pure TypeScript reducer, seeded RNG, 19 frozen GameEvents; strict mode in dev and sim, lenient in the shipped build. Two-level endings resolved through the same query the goals board reads. A manager phase before month 1 (`CHOOSE_MANAGER`); perks as data the engine applies — extra cards on each draft offer, free rerolls, month-end effects in the months a perk lists. The established lane kept in state; the lane-weighted draft. Read-only queries for the UI: heatLine, lineMoved, endingIfYearEndedNow, majorOf, majorRequirements, currentLane, establishedLanes, laneShares, monthsLeft, calendarDate, yearAwards, yearStats, statTiers, tierTip, countdownLevel, fameBand, cardFace, rerollCost, freeRerollAvailable; the lines a run printed and their variants (readLines, LineCounter); the press (pressLines, frontPages with lead scenes, rivalArc); the managers (managerMessages, monthEndLines, lastWord) | `/core` |
| Content | 42 cards (28 action, 8 opportunity, 6 scandal), each with a flavour line and a face; every non-scandal card in a lane; 8 gates; 4 major and 14 minor endings; 7 awards; stat tiers with their tooltips; the calendar. The press: 3 papers, 96 one-off world stories (25, 34, 37), 6 sagas of 4 beats, 22 fame filler lines (8, 7, 7), 6 spillover lines, the rival's 4 arcs, scene tags for lead stories. 2 managers: a perk each, 139 message bubbles with their sign-offs and last words, 3 relief lines. 9 desk scripts for the visual phase. JSON with i18n keys only | `/content`, `i18n/en.json` |
| Validation | Schema, ids, i18n keys, reachability, exhaustive endings, lanes, the content budget, awards, tiers (one word, ≤10 characters) and their tooltips, the calendar, card faces, the press and its scenes, the managers (bubbles, sign-offs, last words, perks), desk scripts, both labels for every flag, code boundaries; missing prose and too few variants as warnings | `npm run validate` |
| Sim | 9 personas, headless, seeded: 5 player-like, 2 control probes, 2 lane probes; 14 bands, **run once per manager**, and `--manager=none` for the base game. Award rates, stat tier reach, appearances per line group (the variant gap list), the press — lead papers, the fame meter, the rival, sagas, world pools, the established lane by month — and the two managers side by side | `npm run sim`, `sim:awards`, `sim:tiers`, `sim:variants`, `sim:press`, `sim:managers` |
| Balance | 14 of 14 bands pass on all three seeds under each manager; awards and tiers pass under each manager; neither manager is strictly better (round 2c, Part F). The minor reachability floor is 1.0%, accepted with a second band: every minor reaches 3% of one player-like persona's runs, under each manager (round V1a, Part 0) | `docs/sim.md`, decisions.md |
| Frozen | Run structure, gates, resources, starting deck, heat formula, heat display (its wording revised), GameEvent list (additive in phase 3; rounds 2b and 2c added none). Endings deliberately unfrozen for the expansion | AGENTS.md §2 |
| UI layer 1 | A complete run in the browser; previews checked against the reducer. A fixed 1280×720 stage scaled to fit any viewport | `/ui`, `/check` |
| UI layer 2, part 1 | The meaning layer, unstyled (drafts v1–v3; D5–D26) | `/ui`, `i18n/en.json` |
| Expansion phase 1 | Endings and lanes (draft v4; D26) | `/core`, `/content`, `/ui`, `/sim` |
| Expansion round 2a | The press (draft v5): The One to Watch; the established lane; variants by shuffle bag (D15 revised); single-word tiers; money as pounds; three papers with the press subject; monthly front pages with world news, frenzy spillover and the rival Juno Vale (D27); the visual phase recorded (ui-plan §14) | all |
| Expansion round 2b | Corrections: fame amplifies scandal; the lane's paper leads; the established lane has hysteresis; the goals board's failing state; Play again below the ending (D28). Draft v6. The two managers: the choice, one perk each, messages from twelve triggers (D29). The world: sagas, larger pools, fame filler (D30). The visual record (ui-plan §14) | all |
| Round V1a | The desk, static (visual README §1–§7; decisions.md, the V1a entries): the stage clips; the fonts self-hosted with their licence and in-game credits; colour tokens; one adapter from /core (`ui/desk/model.ts`); the stat bar, the mirror, the three papers with halftone photographs and the box office, the desk's props, the phone and the manager's bubbles, the fanned hand and END TURN. /core adds `issueNow`, `boxOffice` and the photographs' counter. The plain play area is gone; the screens around the desk stay plain until V2. Handoff to V1b: docs/handoff/v1a.md | `ui/desk`, `/core`, `/check` |
| V1a fix and handoff | The plain screens stand beside the desk: in the build the author played, the draft's cards took the hand's rules and fell off the stage. The hand's rules are scoped to the hand. `check:clicks` asserts every legal action's control is on the stage and hit at its centre, and `check:overflow` audits the plain screens, both in Chromium and Firefox at three sizes. Every tool in the repo with an npm script: the state finder and its replays, the longer overflow audit, the interaction check, shots, the reference comparison, performance, photographs, contact sheets, the sim baseline, and the tuning instruments of earlier rounds (decisions.md, "the draft the author could not play") | `ui/App.tsx`, `/check`, `/tools`, `sim/tune` |
| Expansion round 2c | The visual design reference committed. Draft v7. The stat bar in the author's order with tooltips, the calendar and date, the countdown's four levels, the goals board in tier words (D31). Two bubbles always, quiet months, the manager's last word (D32). Flavour lines, costs above one, card faces and scene tags as data (D33). The lane-weighted draft and three screen cards. The perks rebalanced — Dex's extra card and free reroll, Mags's season-end relief — with two gate numbers and the draft's type (D34) | all |

## The UI as it stands

The run is played on **the desk** (round V1a): a dressing-room vanity on the
one 1280×720 stage, scaled to fit any viewport and clipped. Every word and
number on it comes from /core through one adapter (`ui/desk/model.ts`);
`check:preview` holds it to /core at every state. Nothing moves yet but the
desk's own life — the metronome, the phone's buzz, a frenzy's flickering
bulbs — and the hover: playing a card and the month's end are plain until
V1b.

- **The stat bar** (README §1): hype · craft · heat · next scandal · money ·
  actions, then the season's three marks and the date; a tooltip on every
  cell (hover, long-press, keyboard); the craft icon a clapperboard on the
  screen lane; the countdown in four levels; a Deck button until V2.
- **The papers** (§2, §7): this month's issue as it stands — The Daily
  Flash, B-Side and Marquee standing on the desk, /core's lead paper in
  front, a click pulls another forward. Halftone photographs drawn in code
  (three drawings a scene, never the same picture two months running), the
  Marquee's box office, the player's stories marked in red and the rival's
  in purple.
- **The mirror** (§3): "If the year ended today" on the black card, the
  other three majors on sticky notes in the stat bar's words; in a frenzy,
  flickering bulbs and the newest scandal's clipping on the glass.
- **The desk** (§4): the lane's props, the notebook with the latest quiet
  line, the pencil; an actor's script improving with fame; a frenzy's red
  clippings and crumpled paper.
- **The phone and the manager** (§5): notification bars on the lock screen,
  the player's local time; this month's messages above it as two bubbles
  each, with tapback reactions.
- **The hand** (§6): the fan, the faces by lane, values in the resources'
  colours, a scandal that shakes and says it can't be played, END TURN; the
  previews on hover (the headline a card would print, the scandals a month
  end would print), dressed for the desk.
- **The screens around the desk** are still the plain ones (round V2): the
  title with the credits, the manager choice, the draft and the gates over
  the dimmed desk, the deck, the ending. They stand beside the desk, never
  inside it, so the desk's rules cannot reach them (handoff/v1a.md).

Checks (2026-10-01, after the fix; Chromium and Firefox 142, headless, at
1280×720, 800×450 and a phone held landscape):
- `npm run sim`, `sim:awards`, `sim:tiers`, `sim:managers` on seeds
  20260929, 1 and 424242, recorded with `sim:baseline` and compared with
  V1a's record by `sim:compare`: identical, every run record (2 managers ×
  3 seeds × 9,000 runs) and every report line. 14 of 14 bands under each
  manager on each seed.
- `npm run validate`: 0 errors, 28 warnings (the gap list below).
- `npm run check:preview`: 300 runs, 19,238 states, 0 mismatches; 18,938
  desks against /core — 227,256 stories, 38,895 photographs, 17,919 box
  offices, 53,090 cards in the fan; 14,034 issues before END TURN equal to
  the month printed. The same counts V1a recorded.
- `npm run check:clicks` (the new assertion): 1,359 states, 6,503 controls
  for legal actions on the title, the credits, the manager choice, the
  drafts, the doors, the hand, the deck and the ending — every one on the
  stage and hit at its centre — and 21,912 targets hit-tested under 4,214
  open previews: 0 blocked.
- `npm run check:overflow`: 1,410 states, every plain screen and every
  hover, every text at its longest: 0 overflows. `check:overflow:full`:
  3,458 states in 60 runs, and in each configuration the 50 recorded
  states replayed — the reference states, the biggest hand, every card in
  a hand, every minor ending's screen: 0 overflows.
- `npm run check:interactions`: Chromium 24 of 24; Firefox 22 of 22, the
  keyboard test skipped (a headless window never has focus).
- WebKit is untested (it needs Playwright: a download and a dependency,
  waiting on the author).
- Performance (`npm run desk:perf`, production build, headless Chromium):
  first contentful paint 44 ms; the first desk painted 157 ms after the
  manager is chosen (462 ms at 4× CPU throttling); a play 14 ms (47 ms);
  sweeping the hand and switching papers, 0 frames over 20 ms, also at 4×.
  In Firefox: the first desk 88 ms, a play 27 ms, 0 frames over 20 ms.

## Gap list: prose still to write

`npm run sim:variants` prints the variant gap list — one row per line
group: paper, register, average showings per run, variants now, needed,
short — and writes `sim/appearances.json`, which validate reads. The
personas play under each manager; a manager's own groups are averaged over
that manager's runs. Now: 28 of 132 groups short, 28 variants to write:
- **Once a run, 27** (deferred to phase 4): one more variant for every
  gate's flavour (8), season opener (4), ending text (14) and the opening.
- **The Marquee's ten film titles** (round V1a): the mockup's sample list,
  shown as `TODO(prose)` until approved.

Also for the author:
- Rules text for Table Read, Self-Tape and Voice-Over. The interface
  states their rules from their effects meanwhile.

## Known issues

- **The Redemption Arc under Mags sits at 1.20–1.46%** of pooled runs,
  above the 1.0% floor the author accepted (round V1a, Part 0).
- **The winter gate gets no reaction** (confirmed in round 2c): a month's
  messages arrive as the next opens, and the manager's last word speaks
  at the ending instead.
- **World pools repeat**: 57–67% of runs print a repeat in some paper;
  28% read one in the lead paper, 0.56 stories a run.
- **Fame filler repeats at Famous**: the lead page prints 2.4 filler lines
  a month from pools of 7 and 8.
- **The established lane still lapses sometimes**: after it first settles,
  8.5–9.6% of later month ends read early again (14.7–14.9% in round 2b).
- The season transition beat itself (D13) is not built — it is V1b's
  "a new season gets a card".
- The draft preview from /core (D8) is not built: a draft card shows its
  requirement, not its outcome.
- `act()` in `ui/App.tsx` fast-forwards the queue and then executes the
  click. Harmless while nothing animates; it must change to D7 (a click
  only fast-forwards) before any animation lands.
- AGENTS.md is at 23,677 bytes (limit 24 KiB).
- Headless Firefox never has window focus, so the keyboard test of the
  stat bar's tooltips runs in Chromium only.
- Firefox on this Windows machine sometimes fails to start a tab's process
  (about one fresh browser in ten to twenty-five); the check driver starts
  it again and says so on stderr. A browser that stops answering now fails
  the check, naming the command, instead of hanging it.
- Past months' papers are not on the desk (the plain feed is gone); the year
  in review is phase 4.
- The first desk after the manager's choice draws its three photographs:
  150 ms, 440 ms on a slow machine. V1b may draw them after the first paint.
- Tooling: the Vite dev server on Windows sometimes misses the last of
  several writes to one file within a second; touch the file after a
  scripted multi-edit.

## Next task

**Round V1b: the motion on the desk** (design/visual/README.md §9, "Playing
a card" and "Month end"). Start from [handoff/v1a.md](handoff/v1a.md): the
hooks, what V1a left on purpose, and the checks a motion round keeps green.
Then phase 3 (events, additive GameEvents) → V2 (the screens around the
desk) → phase 4 (the year in review, the once-per-run variants, a full
retune) → the feature freeze on 10/15.

## Waiting on the author

- **Round V1a's calls** (decisions.md, the V1a entries):
  - README §7 against /core's lead-paper rule: a Known player's scandal
    month keeps the lane's paper in front when the player also leads it
    (shot 09). Should the tie go to the tabloid?
  - The B-Side's ★★★★☆ under the player's single left out (no review
    score in the game).
  - The ten film titles (above).
  - The Deck button in the stat bar until V2.
  - The manager's first name on the bubbles ("Marguerite · Manager").
  - Card faces: a requirement line under the values ("Needs Hype 25+"),
    a flag a card sets as a value ("Went viral").
- **WebKit / Safari**: testing it here needs Playwright's WebKit build — a
  download and a dev dependency. Say yes and it gets added; meanwhile the
  itch build on a real Mac or iPad is the test.
- **Seven lines flagged against voice.md** (decisions.md, Part B), imported
  as written.
- **Playtest this build**:
  - does Dex's fourth card feel like a real choice against Mags's calm;
  - do the tooltips and the date read at a glance;
  - does the last word land.
- **itch and Safari/iPad.** Set the embed's viewport dimensions to
  1280×720 with the fullscreen button on, upload a new build, and play it
  in Safari on a Mac and, if possible, an iPad in landscape. To build:
  `npm run build`, then from `dist/`:
  `C:/Windows/System32/tar.exe -a -cf ../overexposed.zip index.html assets`.
- **A hand-timed first run.** The target is 10–15 minutes (ui-plan §12).

## Open questions for the author

None beyond the items above. Round 308e7bb's questions were answered at the
start of round V1a (decisions.md, "Round 308e7bb answered").

## Schedule

| Date | Milestone |
|---|---|
| 2026-10-01 → | V1a → V1b → phase 3 → V2 → phase 4, in that order |
| 2026-10-15 | Internal feature freeze: tuning, polish and fixes only after this |
| ~2026-10-18 | Early build submitted to itch as insurance |
| 2026-10-26 | Illustration may start (the four ending illustrations; AGENTS.md §6) |
| 2026-11-05 04:00 JST | Deadline. Treat 2026-11-04 as the real one |

## Commands

```
npm run dev              # Vite dev server
npm run build            # typecheck + production build into dist/
npm run sim              # headless balance run, once per manager (bands in docs/sim.md)
npm run sim:awards       # year-end award rates per persona, once per manager
npm run sim:tiers        # stat tiers reached in play, per persona, once per manager
npm run sim:variants     # appearances per line group → sim/appearances.json, and the variant gap list
npm run sim:press        # front pages: lead papers, the fame meter, the rival, sagas, world pools, the lane by month
npm run sim:managers     # the two managers side by side, and the message triggers
npm run validate         # content, i18n keys, prose gaps, variants, code boundaries
npm run typecheck
npm run check:preview    # every UI preview against the real reducer outcome, then check:clicks
npm run check:clicks     # every legal action's control on the stage and hit at its centre; no click swallowed
npm run check:overflow   # every text at its longest, on the desk and the plain screens
npm run check:overflow:full    # 10 runs a size, and every state of check/desk-states.json replayed
npm run check:interactions     # the desk's tooltips, bubbles, papers and hand by real input
npm run sim:baseline -- --out=sim/out/<name>   # the four sims on three seeds, recorded
npm run sim:compare -- <a> <b>                 # two records the same game, or the lines that differ
npm run tune:thresholds  # the distributions behind year-end thresholds, per persona and within each major
npm run tune:endings -- --patch="…"   # majors and minors under candidate ending patches
npm run tune:lanes       # when the career lane settles, for candidate rules
npm run tune:try -- --patch="…"       # a content change played in memory on three seeds; nothing written
npm run desk:states      # find the recorded states again after a content change
npm run desk:shots -- <state> | --all | --screens   # screenshots
npm run desk:compare     # the game beside the visual reference's shots 01–14
npm run desk:perf        # the production build's timings, at 1× and 4× CPU
npm run desk:photos      # every halftone photograph on one sheet
npm run desk:sheet -- <out.png> <in.png>…   # screenshots on one sheet
```

`--manager=<id>` runs one manager (`veteran` or `guardian`); `npm run sim --
--manager=none` runs the base game, without managers. The browser checks run in
Chrome and Firefox at 1280×720, 800×450 and a phone held landscape
(`--browsers=`, `--sizes=` narrow them). Every tool and its options:
[handoff/v1a.md](handoff/v1a.md#tools). With `npm run dev`
running, `/check/embed.html` shows the game in an itch-style frame at
1280×720, 1024×576, 800×450 and two phone sizes, with a fullscreen button
and the stage scale and text size read out.
