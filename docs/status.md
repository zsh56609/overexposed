# Status

As of 2026-09-30. **Read this first; update it at the end of every
session** (AGENTS.md → Session rules).

Overexposed is a deck-building career sim for the Game Gauntlet SIM Jam,
played in the browser. You are a young singer with one year: 12 months
(4 seasons × 3). Fast hype builds heat, heat crystallises into scandal
cards, and scandals clog the hand by winter. The year ends on one of four
major endings, refined into fourteen minors by the career lane you drifted
into (music, screen, celebrity) and the shape of the year. Before month 1
you choose a manager, who texts you as each month opens. Three papers —
The Daily Flash, B-Side, Marquee — print what you do in public, a notebook
keeps what you do in private, and each month's front pages show how much
of the world's news is you. Rules and architecture:
[AGENTS.md](../AGENTS.md). UI scope: [ui-plan.md](ui-plan.md). Design
decisions: [decisions.md](decisions.md). The content expansion, approved
by the author and the reference for this phase:
[design/content-expansion.md](design/content-expansion.md); phase 1 and
rounds 2a and 2b of phase 2 are done.

## Done

| Area | State | Where |
|---|---|---|
| Engine | Pure TypeScript reducer, seeded RNG, 19 frozen GameEvents; strict mode in dev and sim, lenient in the shipped build. Two-level endings resolved through the same query the goals board reads. A manager phase before month 1 (`CHOOSE_MANAGER`), with perks as data the engine applies. Read-only queries for the UI: heatLine, lineMoved, endingIfYearEndedNow, majorOf, majorRequirements, currentLane, establishedLanes, laneShares, monthsLeft, yearAwards, yearStats, statTiers, rerollCost, freeRerollAvailable; the lines a run printed and their variants (readLines, LineCounter); the press (pressLines, frontPages, rivalArc); the managers (managerMessages, monthEndLines) | `/core` |
| Content | 39 cards (25 action, 8 opportunity, 6 scandal), every non-scandal card in a lane; 8 gates; 4 major and 14 minor endings; 7 awards; stat tiers. The press: 3 papers, 72 one-off world stories (20, 28, 24), 6 sagas of 4 beats, 13 fame filler lines, 6 spillover lines, the rival's 4 arcs. 2 managers: a perk each, 76 message lines, 3 relief lines. JSON with i18n keys only | `/content`, `i18n/en.json` |
| Validation | Schema, ids, i18n keys, reachability, exhaustive endings, lanes, the content budget, awards, tiers (one word, ≤10 characters), the press, the managers, both labels for every flag, code boundaries; missing prose and too few variants as warnings | `npm run validate` |
| Sim | 9 personas, headless, seeded: 5 player-like, 2 control probes, 2 lane probes; 13 bands, **run once per manager**. Award rates, stat tier reach, appearances per line group (the variant gap list), the press — lead papers, the fame meter, the rival, sagas, world pools — and the two managers side by side | `npm run sim`, `sim:awards`, `sim:tiers`, `sim:variants`, `sim:press`, `sim:managers` |
| Balance | Before the managers, 13 of 13 bands passed on all three seeds (round 2b, Part 0; minor reachability at 1.4%). With the managers as specified, bands fail under each (Known issues) | `docs/sim.md` |
| Frozen | Run structure, gates, resources, starting deck, heat formula, heat display (its wording revised), GameEvent list (additive in phase 3; round 2b added none — the manager phase and `CHOOSE_MANAGER` are additive). Endings deliberately unfrozen for the expansion | AGENTS.md §2 |
| UI layer 1 | A complete run in the browser; previews checked against the reducer. A fixed 1280×720 stage scaled to fit any viewport | `/ui`, `/check` |
| UI layer 2, part 1 | The meaning layer, unstyled (drafts v1–v3; D5–D26) | `/ui`, `i18n/en.json` |
| Expansion phase 1 | Endings and lanes (draft v4; D26) | `/core`, `/content`, `/ui`, `/sim` |
| Expansion round 2a | The press (draft v5): The One to Watch; the established lane; variants by shuffle bag (D15 revised); single-word tiers; money as pounds; three papers with the press subject; monthly front pages with world news, frenzy spillover and the rival Juno Vale (D27); the visual phase recorded (ui-plan §14) | all |
| Expansion round 2b | Corrections: fame amplifies scandal; the lane's paper leads; the established lane has hysteresis; the goals board's failing state; Play again below the ending (D28). Draft v6. The two managers: the choice, one perk each, messages from twelve triggers (D29). The world: sagas, larger pools, fame filler (D30). The visual record (ui-plan §14) | all |

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
- **What am I doing.** The title screen shows the opening premise (its
  variant for the run to come). Hovering a card (long-press on touch)
  opens a preview floating beside it that leads with the headline the
  card would print — paper, subject and variant exactly as the feed will
  print them — then its numbers and any line it crosses. Hovering END
  TURN lists the scandals that would print by their headlines, and names
  Mags's relief in the heat that carries over. The feed aggregates per
  action: every LOUD, Money and scandal line with its paper's masthead, a
  quiet line without one — the player's notebook. As each month opens the
  manager's messages print under its header, labelled with their name
  (at most two, one or two bubbles each). At each month's end the feed
  prints that month's front page: the lead paper's (the lane's paper
  unless the player's biggest story is elsewhere), with a switch to the
  other two; world stories and saga beats in muted type, the player's
  stories and the fame filler about them in ink. Each line group shows its
  variants through a shuffle bag. Dex's free reroll shows on the draft's
  reroll button.
- **What am I aiming for.** The goals board (D10, D22, D26, D28): the four
  majors, aspirations first, each with its goal line and requirements —
  the known-side majors "Hype 80+", the unknown-side ones their scandal
  requirement, and their fame line only when it fails, as a state
  ("✗ Already known (hype 104)"). The "If the year ended today" marker
  names major and minor. The final gate names the ending. The ending
  screen reads top to bottom: the major as the night's category, the
  minor and its text, the awards, the rival's closing line, then Play
  again; the run summary and the endings collection beside it.
- **What can I do.** The deck viewer (D12).
- **How things stand.** The stat bar (D25): tier words — Unknown · Noticed ·
  Rising · Known · Famous; Quiet · Whispers · Chatter · Circling · Breaking ·
  Frenzy; Raw · Learning · Solid · Seasoned · Skilled · Masterful — the
  number small beside each; money as pounds (capital × £1,000); heat keeps
  "N TO GO", or "N TO NEXT" once a line is crossed (D1).

Checks (2026-09-30, end of round 2b):
- `npm run sim` on seeds 20260929, 1 and 424242, under each manager: 9,000
  runs a seed and manager, 0 crashes, 0 soft-locks. Bands: see Known
  issues.
- `npm run sim:awards`: every award in band under Dex on all three seeds;
  under Mags, People's Choice at 42.0–43.4% (band ≤ 40%) and Scandal of the
  Year at 2.5–2.9% (band ≥ 3%). `npm run sim:tiers`: pass on all three
  seeds under each manager.
- `npm run check:preview`: 0 mismatches over 19,411 states — every card
  preview's headline, paper, subject and variant equal the feed's
  (36,549); every month-end scandal headline, the relief and the heat
  carried; 2,909 reroll prices (1,406 free); 3,600 months of front pages
  and of manager messages (3,768 messages, 1,383 month-end lines) read
  again identically, whether at their own month or the year's end. Then
  the click-through check: 0 blocked.
- `npm run validate`: 0 errors; 57 warnings, all variant shortfalls (the
  gap list below).
- Stage overflow audits (headless Chrome, production build; the floating
  preview open over every card position and END TURN at every state), at
  1280×720, 800×450 and 667×375 phone landscape: 8 random runs at each
  size — 1,299 states, 3,757 card hovers, the manager choice 24 times
  (both managers), Dex's free label in 96 draft states, 102 months with
  two messages, 105 relief lines; 19 recorded runs at each size, every one
  opening with its manager choice — one per minor ending, the most awards,
  a final gate whose options differ in awards, a hand of 8, a free reroll,
  months with two messages — 3,753 states and 9,597 card hovers; every
  ending screen with the collection empty, full and storage blocked — 162
  screens. Zero overflows everywhere.

## Gap list: prose still to write

`npm run sim:variants` prints the variant gap list — one row per line
group: paper, register, average showings per run, variants now, needed,
short — and writes `sim/appearances.json`, which validate reads. The
personas play under each manager; a manager's own groups are averaged over
that manager's runs. Now: 57 of 119 groups short, 78 variants to write:
- **World pools, 24 stories**: a run prints on average 37 one-off stories
  in Marquee, 34 in B-Side and 25 in The Daily Flash, against 24, 28 and
  20 (13, 6 and 5 short).
- **The managers, 5**: Mags's relief lines (seen 9.8 times a run, 3
  written: 1 short); each manager's `checkin.long_game` (2.5 a run) and
  `rival` (2.4 a run), 1 short each.
- **Once a run, 27**: one more variant for every gate's flavour (8),
  season opener (4), ending text (14) and the opening.
- **Cards and scandals, 22**, one more each: Crisis PR, Reinvent Image,
  Collab Single, Mentorship, Film Cameo, Streaming Role, Award Campaign,
  Apology Tour, Meditation Retreat, Sellout Ad, Brand Deal, Indie Label,
  Legal Team, World Tour; and Bad Press, Public Feud, Burnout and Old
  Rumor, each its headline and its in-hand line.

## Known issues

- **The managers' perks as specified break bands, and Mags is strictly
  better** (`npm run sim:managers`; decisions.md, Part C). Mags takes 9.8
  heat off a player's run. Dex gives 2.1 free rerolls. Under Mags every
  player-like persona does at least as well on every count: The
  Breakthrough +12.3 points pooled (minmaxer +21.9, dealseeker +19.0), The
  Hard Way −3.5, scandals held −1.0.
  - Bands failing under Dex, on all three seeds: major concentration —
    dealseeker Breakthrough 71.0–72.6%. With no manager it was 69.3%, so
    any help crosses 70%.
  - Bands failing under Mags, on all three seeds:
    - major concentration: minmaxer 84–86%, dealseeker 90–92%;
    - minor reachability: Redemption Arc, Flash in the Pan, Running on
      Empty and Starting Over at 0.5–1.2%;
    - scandals held: median 1;
    - gate met%: Residency 67.5–68.1%, Award Show 72.7–73.6%;
    - two award bands (above).
  - The smallest fix is proposed, not applied (Waiting on the author).
- **The year's last month and the winter gate are never messaged**: a
  month's messages arrive as the next opens, and the ending speaks
  instead (decisions.md, Part C).
- **Fame filler repeats in famous runs**: filler averages under one line a
  run per paper, so four or five lines each meet the rule. A famous screen
  career can print Marquee's four up to 18 times in a year.
- **The established lane still lapses sometimes**: with hysteresis, 14.7–14.9%
  of later month ends read early after a lane first settles (25.7%
  without).
- The season transition beat itself (D13) is not built; the line's
  movement is told in the feed.
- The draft preview from /core (D8) is not built: a draft card shows its
  requirement, not its outcome.
- `act()` in `ui/App.tsx` fast-forwards the queue and then executes the
  click. Harmless while nothing animates; it must change to D7 (a click
  only fast-forwards) before any animation lands.
- AGENTS.md is at 27,371 bytes (limit ~28 KiB): the next addition should
  move something to `docs/`.
- Tooling: the Vite dev server on Windows sometimes misses the last of
  several writes to one file within a second; touch the file after a
  scripted multi-edit.

## Next task

**First, the author's call on the perks** (below). Then **content
expansion round 2c**: card faces, lane depth, tooltips, the calendar — and
the scene tags per line group that the newspaper photographs will need
(ui-plan §14). Then phase 3 (events, additive GameEvents) and phase 4 (year
in review, full retune) before the 10/15 freeze; visual craft (ui-plan §14)
follows the expansion.

## Waiting on the author

- **The perks.**
  - Mags as specified is strictly better, and bands fail under each
    manager (Known issues).
  - **The smallest fix proposed, not applied:** Mags's relief at the end
    of every season instead of every month. Her rule would read "You lose
    1 heat at the end of every season." It is a content change:
    `perk.monthEnd` as a conditional on the season's last month.
  - Simulated on all three seeds, it leaves neither manager strictly
    better: under Mags, three personas do better and two are mixed. It
    fixes minor reachability, the scandal median and Residency.
  - Two bands still fail under her: dealseeker Breakthrough 71.5–78.0%,
    and Award Show met% 67.2–68.4%.
  - Dex's one failure has the same cause: dealseeker sits at 69.3% with no
    manager.
  - **Also needs a decision:** headroom for any perk — a base-game retune
    toward a harder Breakthrough, or a review of the band for dealseeker.
  - Two other candidates were simulated and left bands failing:
    - relief only while no scandal is held: neither strictly better, but
      Breakthrough 77–78% for minmaxer;
    - −1 hype with the relief: fails minor reachability and the scandal
      median.
- **The readings made this round** (decisions.md, Parts A, C and D):
  - a scandal counts for the desk only as a lead story;
  - messages arrive as a month opens;
  - `stuck` fires once per streak;
  - a lane's fall back to early and return is no change;
  - fame filler claims after the real stories, with a secondary cap on a
    page with anything real;
  - the six v5 stories include the wedding's summer beat.
- **Two borderline variants** (decisions.md, Part B): Copycat Story's
  "STILL THE ONLY STORY IN TOWN" while Unknown or Noticed, and Cover
  Single's praise line in its weak branch.
- **Playtest this build**:
  - does the choice of manager feel like a real one;
  - do the messages land as the month opens;
  - does the front page now tell you how famous you are;
  - do the sagas register as the world's own year?
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
npm run sim:press        # front pages: lead papers, the fame meter, the rival, sagas, world-pool repeats
npm run sim:managers     # the two managers side by side, and the message triggers
npm run validate         # content, i18n keys, prose gaps, variants, code boundaries
npm run typecheck
npm run check:preview    # every UI preview against the real reducer outcome, then check:clicks
npm run check:clicks     # clicks reach their card or END TURN with the preview open
```

`--manager=<id>` runs one manager (`veteran` or `guardian`). With `npm run
dev` running, `/check/embed.html` shows the game in an itch-style frame at
1280×720, 1024×576, 800×450 and two phone sizes, with a fullscreen button
and the stage scale and text size read out.
