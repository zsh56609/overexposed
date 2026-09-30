# Status

As of 2026-09-30. **Read this first; update it at the end of every
session** (AGENTS.md → Session rules).

Overexposed is a deck-building career sim for the Game Gauntlet SIM Jam,
played in the browser. You are a young singer with one year: 12 months
(4 seasons × 3). Fast hype builds heat, heat crystallises into scandal
cards, and scandals clog the hand by winter. The year ends on one of four
major endings, refined into fourteen minors by the career lane you drifted
into (music, screen, celebrity) and the shape of the year. Three papers —
The Daily Flash, B-Side, Marquee — print what you do in public, a notebook
keeps what you do in private, and each month's front pages show how much
of the world's news is you. Rules and architecture:
[AGENTS.md](../AGENTS.md). UI scope: [ui-plan.md](ui-plan.md). Design
decisions: [decisions.md](decisions.md). The content expansion, approved
by the author and the reference for this phase:
[design/content-expansion.md](design/content-expansion.md); phase 1 and
round 2a of phase 2 are done.

## Done

| Area | State | Where |
|---|---|---|
| Engine | Pure TypeScript reducer, seeded RNG, 19 frozen GameEvents; strict mode in dev and sim, lenient in the shipped build. Two-level endings resolved through the same query the goals board reads. Read-only queries for the UI: heatLine, lineMoved, endingIfYearEndedNow, majorOf, majorRequirements, currentLane, establishedLane, laneShares, monthsLeft, yearAwards, yearStats, statTiers; the lines a run printed and their variants (readLines, LineCounter); the press (pressLines, frontPages, rivalArc) | `/core` |
| Content | 39 cards (25 action, 8 opportunity, 6 scandal), every non-scandal card in a lane; 8 gates; 4 major and 14 minor endings; 7 awards; stat tiers; the press — 3 papers, 30 world stories, 6 spillover lines, the rival's 4 arcs; JSON with i18n keys only | `/content`, `i18n/en.json` |
| Validation | Schema, ids, i18n keys, reachability, exhaustive endings, lanes, the content budget, awards, tiers (one word, ≤10 characters), the press, both labels for every flag, code boundaries; missing prose and too few variants as warnings | `npm run validate` |
| Sim | 9 personas, headless, seeded: 5 player-like, 2 control probes, 2 lane probes; 13 bands. Award rates, stat tier reach, appearances per line group (the variant gap list), and the press — lead papers, the fame meter, the rival, world pools | `npm run sim`, `sim:awards`, `sim:tiers`, `sim:variants`, `sim:press` |
| Balance | Round 2a (decisions.md, 2026-09-30): artisan exempt from major concentration; minor reachability at 1.5%. 13 of 13 bands pass on seed 424242; on 20260929 and 1 only minor reachability misses, by The Redemption Arc at 1.46% (Known issues) | `docs/sim.md` |
| Frozen | Run structure, gates, resources, starting deck, heat formula, heat display (its wording revised), GameEvent list (additive in phase 3). Endings deliberately unfrozen for the expansion | AGENTS.md §2 |
| UI layer 1 | A complete run in the browser; previews checked against the reducer. A fixed 1280×720 stage scaled to fit any viewport | `/ui`, `/check` |
| UI layer 2, part 1 | The meaning layer, unstyled (drafts v1–v3; D5–D26) | `/ui`, `i18n/en.json` |
| Expansion phase 1 | Endings and lanes (draft v4; D26) | `/core`, `/content`, `/ui`, `/sim` |
| Expansion round 2a | The press (draft v5): The One to Watch; the established lane; variants by shuffle bag (D15 revised); single-word tiers; money as pounds; three papers with the press subject; monthly front pages with world news, frenzy spillover and the rival Juno Vale (D27); the visual phase recorded (ui-plan §14) | all |

## The UI as it stands

Legibility only: system fonts, no palette, no animation. The screen comes
from `state.phase`, what is clickable from `legalActions`, every number
from /core. Everything sits on the fixed 1280×720 stage (`ui/Stage.tsx`,
decision 17), scaled to fit any viewport. The play area (feed, this
season's gates, hand, draft or gate) is on the left; the goals board holds
the right rail in every phase.

What each screen answers (ui-plan §13 priority):
- **What am I doing.** The title screen shows the opening premise (its
  variant for the run to come). Hovering a card (long-press on touch)
  opens a preview floating beside it that leads with the headline the
  card would print — paper, subject and variant exactly as the feed will
  print them — then its numbers and any line it crosses. Hovering END
  TURN lists the scandals that would print by their headlines. The feed
  aggregates per action: every LOUD, Money and scandal line with its
  paper's masthead (The Daily Flash, B-Side, Marquee), a quiet line
  without one — the player's notebook. At each month's end the feed prints
  that month's front page: the lead paper's (the one holding the player's
  most prominent story), with a switch to the other two; world stories in
  muted type. Each line group shows its variants through a shuffle bag:
  every variant once before any repeats, never the same line twice in a
  row.
- **What am I aiming for.** The goals board (D10, D22, D26): the four
  majors, aspirations first, each with its goal line and requirements —
  the known-side majors "Hype 80+", the unknown-side ones only their
  scandal requirement. The "If the year ended today" marker names major
  and minor. The final gate names the ending. The ending screen shows the
  major as the night's category, the minor and its text, the awards, the
  rival's closing line, the run summary and the endings collection.
- **What can I do.** The deck viewer (D12).
- **How things stand.** The stat bar (D25): tier words — Unknown · Noticed ·
  Rising · Known · Famous; Quiet · Whispers · Chatter · Circling · Breaking ·
  Frenzy; Raw · Learning · Solid · Seasoned · Skilled · Masterful — the
  number small beside each; money as pounds (capital × £1,000); heat keeps
  "N TO GO", or "N TO NEXT" once a line is crossed (D1).

Checks (2026-09-30, end of round 2a):
- `npm run sim`: the endings changed again, so a new baseline (decisions.md,
  2026-09-30, Part B). 9,000 runs per seed, 0 crashes, 0 soft-locks.
- `npm run check:preview`: 0 mismatches over 18,936 states — every card
  preview's headline, paper, subject and variant equal the feed's (36,198);
  every month-end scandal headline too; 1,600 shuffle-bag sequences keep
  their two promises; 3,600 months of front pages (10,800 pages) recompose
  identically, whether at their own month end or the year's. Then the
  click-through check: 0 blocked at 1280×720, 800×450 and 667×375.
- `npm run validate`: 0 errors; 61 warnings, all variant shortfalls (the
  gap list below).
- `npm run sim:awards`, `npm run sim:tiers`: pass on all three seeds.
- Stage overflow audits (headless Chrome, the floating preview open over
  every card position and END TURN at every state): 8 random runs at each
  of 1280×720 (dev), 800×450 and 667×375 phone landscape (production
  build); 17 recorded runs at each size — one per minor ending, the most
  awards, a final gate whose options differ in awards, a hand of 8 —
  3,216 states and 8,730 card hovers; every ending screen with the
  collection empty, full and storage blocked — 144 screens. Zero
  overflows everywhere.

## Gap list: prose still to write

`npm run sim:variants` prints the variant gap list — one row per line
group: paper, register, average showings per run, variants now, needed,
short — and writes `sim/appearances.json`, which validate reads. Now: 61 of
77 groups short, 149 variants to write. The world pools are most of it: a
run prints on average 31 world stories in The Daily Flash, 42 in B-Side and
45 in Marquee, against 10 each (89 stories short). Then Press Junket and
Copycat Story (2 short each), and one more variant each for the most-seen
lines, every season opener, gate flavour, ending text and the opening.
Round 2b's writing is drafted against it.

## Known issues

- **The Redemption Arc at scandals down 2** (as the author asked) is
  reached in 1.46% / 1.46% / 1.84% of player-like runs: under the 1.5% line
  on two seeds — the one band that misses. Kept, reported.
- **The Daily Flash leads 80% of months** for the player-like personas
  (comeback 86%); B-Side 10–19%, Marquee 1–5%. The starting deck prints
  mostly in the Flash, most music work is quiet, and a scandal month
  always goes to the Flash.
- **The fame meter** — the player's share of the lead page — climbs
  23% → 30% → 39% → 39% → 44% from Unknown to Famous, flat from Rising to
  Known: a month prints only one or two of the player's lines in any one
  paper. Prominence climbs clearly: the player's story leads the lead
  page in 7%, 34%, 40%, 70% and 78–81% of months.
- **World pools repeat in every run** (10 stories a paper; one story can
  print 7–8 times a run) until round 2b grows them.
- **An established lane can lapse**: a quarter of later month ends read
  "early" again after a lane first settles (the press subject returns to
  the music column).
- Five Flash headlines still name the player outright (Apology Tour,
  Tabloid Bait, Street Team; Burnout, Old Rumor) where `{SUBJECT}` would
  fit — for the author.
- The season transition beat itself (D13) is not built; the line's
  movement is told in the feed.
- The draft preview from /core (D8) is not built: a draft card shows its
  requirement, not its outcome.
- `act()` in `ui/App.tsx` fast-forwards the queue and then executes the
  click. Harmless while nothing animates; it must change to D7 (a click
  only fast-forwards) before any animation lands.
- AGENTS.md is at 26,594 bytes (limit ~28 KiB); the content shapes now live
  in `docs/content-schema.md`.
- Tooling: the Vite dev server on Windows sometimes misses the last of
  several writes to one file within a second; touch the file after a
  scripted multi-edit.

## Next task

**Content expansion round 2b: the managers** (design §3.2, §4): the
manager profile system with both profiles — the Veteran and the Guardian —
chosen at the opening; season check-ins; big-moment lines (first scandal,
signing, a lane shift, a failed gate, and the moment the player stops being
unknown at hype 80). Each manager trigger's lines are a line group on the
shuffle bag built in 2a. The writing — both managers' lines, and the world
pools grown to the size the gap list shows — is drafted against the gap
list and imported once the author accepts it. Then phase 3 (events,
additive GameEvents) and phase 4 (year in review, full retune) before the
10/15 freeze; visual craft (ui-plan §14) follows the expansion.

## Waiting on the author

- **The Redemption Arc**: keep scandals down 2 at 1.46–1.84% (under the
  1.5% line on two seeds), or decide otherwise.
- **The choices where the brief was silent** (decisions.md, Part E): a
  Money line is a business brief; at equal prominence a scandal, then a
  LOUD act, then Money; the spillover claims its brief first; the rival's
  beat is the first world story; a scandal copy overwhelms the Flash like a
  crystallised one; a lead-paper tie while early goes to B-Side; world
  stories are marked by type alone; the rival's majors (crossover ends in
  The Breakthrough).
- **The Flash's 80% of lead months, and the fame meter's flat middle** —
  accept, or change the page rules (they are content).
- **World-story label**: world stories are marked by muted type only; if
  you want a word, write it.
- **Playtest this build**: do the papers read as three voices, does the
  front page tell you how famous you are, and does Juno Vale register?
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
npm run sim              # headless balance run (bands in docs/sim.md)
npm run sim:awards       # year-end award rates per persona
npm run sim:tiers        # stat tiers reached in play, per persona
npm run sim:variants     # appearances per line group → sim/appearances.json, and the variant gap list
npm run sim:press        # front pages: lead papers, the fame meter, the rival, world-pool repeats
npm run validate         # content, i18n keys, prose gaps, variants, code boundaries
npm run typecheck
npm run check:preview    # every UI preview against the real reducer outcome, then check:clicks
npm run check:clicks     # clicks reach their card or END TURN with the preview open
```

With `npm run dev` running, `/check/embed.html` shows the game in an
itch-style frame at 1280×720, 1024×576, 800×450 and two phone sizes, with
a fullscreen button and the stage scale and text size read out.
