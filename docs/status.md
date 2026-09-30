# Status

As of 2026-10-01. **Read this first; update it at the end of every
session** (AGENTS.md → Session rules).

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
| Sim | 9 personas, headless, seeded: 5 player-like, 2 control probes, 2 lane probes; 13 bands, **run once per manager**, and `--manager=none` for the base game. Award rates, stat tier reach, appearances per line group (the variant gap list), the press — lead papers, the fame meter, the rival, sagas, world pools, the established lane by month — and the two managers side by side | `npm run sim`, `sim:awards`, `sim:tiers`, `sim:variants`, `sim:press`, `sim:managers` |
| Balance | 13 of 13 bands pass on all three seeds under each manager and with none; awards and tiers pass under each manager; neither manager is strictly better (round 2c, Part F). The minor reachability floor is 1.0% (was 1.4%; Waiting on the author) | `docs/sim.md`, decisions.md |
| Frozen | Run structure, gates, resources, starting deck, heat formula, heat display (its wording revised), GameEvent list (additive in phase 3; rounds 2b and 2c added none). Endings deliberately unfrozen for the expansion | AGENTS.md §2 |
| UI layer 1 | A complete run in the browser; previews checked against the reducer. A fixed 1280×720 stage scaled to fit any viewport | `/ui`, `/check` |
| UI layer 2, part 1 | The meaning layer, unstyled (drafts v1–v3; D5–D26) | `/ui`, `i18n/en.json` |
| Expansion phase 1 | Endings and lanes (draft v4; D26) | `/core`, `/content`, `/ui`, `/sim` |
| Expansion round 2a | The press (draft v5): The One to Watch; the established lane; variants by shuffle bag (D15 revised); single-word tiers; money as pounds; three papers with the press subject; monthly front pages with world news, frenzy spillover and the rival Juno Vale (D27); the visual phase recorded (ui-plan §14) | all |
| Expansion round 2b | Corrections: fame amplifies scandal; the lane's paper leads; the established lane has hysteresis; the goals board's failing state; Play again below the ending (D28). Draft v6. The two managers: the choice, one perk each, messages from twelve triggers (D29). The world: sagas, larger pools, fame filler (D30). The visual record (ui-plan §14) | all |
| Expansion round 2c | The visual design reference committed. Draft v7. The stat bar in the author's order with tooltips, the calendar and date, the countdown's four levels, the goals board in tier words (D31). Two bubbles always, quiet months, the manager's last word (D32). Flavour lines, costs above one, card faces and scene tags as data (D33). The lane-weighted draft and three screen cards. The perks rebalanced — Dex's extra card and free reroll, Mags's season-end relief — with two gate numbers and the draft's type (D34) | all |

## The UI as it stands

Legibility only: system fonts, no palette, no animation. The screen comes
from `state.phase`, what is clickable from `legalActions`, every number
from /core. Everything sits on the fixed 1280×720 stage (`ui/Stage.tsx`,
decision 17), scaled to fit any viewport. The play area (feed, this
season's gates, hand, draft or gate) is on the left; the goals board holds
the right rail in every phase.

What each screen answers (ui-plan §13 priority):
- **Who is in my corner.** After the title, the manager choice: Dex
  Holloway and Marguerite Ashby side by side, each with a quote, a
  description, their one perk (its name and its rule) and how they text.
- **What am I doing.**
  - The title screen shows the opening premise (its variant for the run to
    come).
  - Hovering a card (long-press on touch) opens a preview floating beside
    it. It leads with the headline the card would print — paper, subject
    and variant exactly as the feed will print them — then its numbers and
    any line it crosses. Hovering END TURN lists the scandals that would
    print by their headlines, and names Mags's relief in the heat that
    carries over.
  - The feed aggregates per action: every LOUD, Money and scandal line
    with its paper's masthead, a quiet line without one — the player's
    notebook. Each month opens under its date ("— March 2027 —"), with the
    manager's messages: at most two, each two bubbles, a quiet-month line
    after a silent month.
  - At each month's end the feed prints that month's front page, with its
    dateline: the lead paper's, with a switch to the other two; world
    stories and saga beats in muted type, the player's stories and the fame
    filler about them in ink. Each line group shows its variants through a
    shuffle bag.
  - Cards show their flavour line in italics, and their cost only above
    one action. A draft offer under Dex holds a fourth card labelled "Dex
    knows someone"; his free reroll shows on the reroll button.
- **What am I aiming for.** The goals board (D10, D22, D26, D28, D31): the
  four majors, aspirations first, each with its goal line and requirements
  in tier words ("Known · 80+"). The "If the year ended today" marker names
  major and minor. The final gate names the ending. The ending screen reads
  top to bottom: the major as the night's category, the minor and its text,
  the awards, the rival's closing line, the manager's last word, then Play
  again; the run summary and the endings collection beside it.
- **What can I do.** The deck viewer (D12).
- **How things stand.**
  - The stat bar (D25, D31): hype · craft · heat · next scandal · money ·
    actions, in tier words with the number small beside each. Money is in
    pounds. The countdown keeps "N TO GO" or "N TO NEXT" (D1), in four
    levels: plain, amber, red, crossed.
  - Every cell has a tooltip. Craft names its set: singing, or acting on
    the screen lane.
  - The masthead shows the date and "<Season> · month k of 3"; its tooltip
    is the date line.

Checks (2026-10-01, end of round 2c):
- `npm run sim` on seeds 20260929, 1 and 424242, under Dex, under Mags and
  with no manager: 9,000 runs each, 0 crashes, 0 soft-locks, 13 of 13
  bands.
- `npm run sim:awards`: every award in band under each manager on all
  three seeds. `npm run sim:tiers`: pass.
- `npm run sim:managers`: neither manager strictly better on any seed.
  Messages: 1.07–1.09 a month, 12.9–13.1 a run.
- `npm run check:preview`: 300 runs, 19,238 states, 0 mismatches.
  - 36,630 card plays, each headline matched to the feed.
  - 2,918 offers dealt, 1,523 of them with Dex's card, labelled.
  - 2,868 reroll prices (1,429 free); 911 lane-weighted offers.
  - The stat bar with its tooltips and the date at every state.
  - 3,600 months of front pages (10,800 lead photographs) and of manager
    messages (3,987 two-bubble messages, 197 quiet months, 361 relief
    lines) read again identically; 300 last words.
- `npm run check:clicks`: 10 runs, 496 states, 80 drafts (48 with Dex's
  card, labelled): 0 blocked.
- `npm run validate`: 0 errors, 28 warnings (the gap list below).
- Stage overflow audits (headless Chrome, production build; the floating
  preview open over every card position and END TURN, and every stat-bar
  tooltip, at every state), at 1280×720, 800×450 and 667×375 phone
  landscape. Zero overflows everywhere.
  - 8 random runs at each size: 406–441 states, 1,166–1,296 card hovers,
    2,427–2,659 tooltips, 79–92 drafts (42–45 with Dex's four cards), 8
    last words.
  - 20 recorded runs at each size, every one opening with its manager
    choice: one per minor ending, the most awards (four), a final gate
    whose options differ in awards, a hand of 7, a free reroll, Dex's card
    taken, months with two messages. 1,321 states, 3,447 card hovers,
    8,101 tooltips, 306 drafts (171 with Dex's card).
  - Every ending screen with the collection empty, full and storage
    blocked: 57 screens at each size, each with the last word.

## Gap list: prose still to write

`npm run sim:variants` prints the variant gap list — one row per line
group: paper, register, average showings per run, variants now, needed,
short — and writes `sim/appearances.json`, which validate reads. The
personas play under each manager; a manager's own groups are averaged over
that manager's runs. Now: 28 of 132 groups short, 28 variants to write:
- **Once a run, 27** (deferred to phase 4): one more variant for every
  gate's flavour (8), season opener (4), ending text (14) and the opening.
- **B-Side's world pool, 1**: 34 stories, seen 34.1 times a run.

Also for the author:
- Rules text for Table Read, Self-Tape and Voice-Over. The interface
  states their rules from their effects meanwhile.

## Known issues

- **The Redemption Arc under Mags sits at 1.20–1.46%** of pooled runs,
  under the old 1.4% floor (Waiting on the author).
- **The winter gate gets no reaction** (confirmed in round 2c): a month's
  messages arrive as the next opens, and the manager's last word speaks
  at the ending instead.
- **World pools repeat**: 57–67% of runs print a repeat in some paper;
  28% read one in the lead paper, 0.56 stories a run.
- **Fame filler repeats at Famous**: the lead page prints 2.4 filler lines
  a month from pools of 7 and 8.
- **The established lane still lapses sometimes**: after it first settles,
  8.5–9.6% of later month ends read early again (14.7–14.9% in round 2b).
- The season transition beat itself (D13) is not built; the line's
  movement is told in the feed.
- The draft preview from /core (D8) is not built: a draft card shows its
  requirement, not its outcome.
- `act()` in `ui/App.tsx` fast-forwards the queue and then executes the
  click. Harmless while nothing animates; it must change to D7 (a click
  only fast-forwards) before any animation lands.
- AGENTS.md is at 22,711 bytes (limit 24 KiB).
- Tooling: the Vite dev server on Windows sometimes misses the last of
  several writes to one file within a second; touch the file after a
  scripted multi-edit.

## Next task

**Round V1a: the desk, static** (design/visual/README.md §1–§7). The order
of work (2026-10-01): V1a → V1b (the motion on the desk) → phase 3 (events,
additive GameEvents) → V2 (the screens around the desk) → phase 4 (the year
in review, the once-per-run variants, a full retune) → the feature freeze on
10/15. The visual work runs alongside the content, not after the freeze.

## Waiting on the author

- **Round 2c's Part F calls** (decisions.md, Part F):
  - Dex escalated to D2: under D1 his known-side lead over Mags was 0.0
    to +1.0 points.
  - Mags on M1.
  - The Label Deal at hype 50 and the Award Show at craft 47.
  - F2's removal-price lever simulated, not applied: F2 already held.
  - **The minor floor lowered to 1.0%, overriding round b59f9d6's 1.4%**
    with its reasoning. To revert: `minorReachMin: 0.014` in
    sim/report.ts. (a) then fails under Mags on seeds 1 and 424242, on
    this band alone.
- **Round 2c's other readings** (decisions.md):
  - quiet months after one silent month, not two (Part C);
  - the screen cards from summer (Part E);
  - "1 month left" in the date line (Part A);
  - the scene readings (Part D).
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

None beyond the items above.

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
npm run check:clicks     # clicks reach their card or END TURN with the preview open
```

`--manager=<id>` runs one manager (`veteran` or `guardian`); `npm run sim --
--manager=none` runs the base game, without managers. With `npm run dev`
running, `/check/embed.html` shows the game in an itch-style frame at
1280×720, 1024×576, 800×450 and two phone sizes, with a fullscreen button
and the stage scale and text size read out.
