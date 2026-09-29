# Status

As of 2026-09-30. **Read this first; update it at the end of every
session** (AGENTS.md → Session rules).

Overexposed is a deck-building career sim for the Game Gauntlet SIM Jam,
played in the browser. You are a young singer with one year: 12 months
(4 seasons × 3). Fast hype builds heat, heat crystallises into scandal
cards, and scandals clog the hand by winter. Rules and architecture:
[AGENTS.md](../AGENTS.md). UI scope: [ui-plan.md](ui-plan.md). Design
decisions: [decisions.md](decisions.md).

## Done

| Area | State | Where |
|---|---|---|
| Engine | Pure TypeScript reducer, seeded RNG, 19 frozen GameEvents; strict mode in dev and sim, lenient in the shipped build. Read-only queries for the UI: heatLine, lineMoved, endingIfYearEndedNow, monthsLeft, yearAwards | `/core` |
| Content | 34 cards (21 action, 7 opportunity, 6 scandal), 8 gates, 4 endings, 7 awards; JSON with i18n keys only | `/content`, `i18n/en.json` |
| Validation | Schema, ids, i18n keys, reachability, awards, code boundaries (including no rule logic in /ui); missing prose as warnings | `npm run validate` |
| Sim | 7 personas, headless, seeded; 10 bands. Award rates per persona | `npm run sim`, `npm run sim:awards` |
| Balance | Rounds 1–5 done. All 10 bands pass on seeds 20260929, 1 and 424242 | `sim/out/tuning-log.md` |
| Frozen for UI | Run structure, gates, endings, resources, starting deck, heat formula, heat display, GameEvent list | AGENTS.md §2 |
| UI layer 1 | A complete run in the browser; previews checked against the reducer (dcf231e). A fixed 1280×720 stage scaled to fit any viewport | `/ui`, `/check` |
| UI layer 2, part 1 | The meaning layer, unstyled: writing drafts v1 and v2 imported (no prose gaps), goals board, deck viewer, heat display and END TURN preview; the story at the moment of decision (D21, D6); goals order and marker (D22); year-end awards and the final gate's predictions (D16, D23) | `/ui`, `i18n/en.json` |

## The UI as it stands

Legibility only: system fonts, no palette, no animation. The screen comes
from `state.phase`, what is clickable from `legalActions`, every number
from /core. Everything sits on the fixed 1280×720 stage (`ui/Stage.tsx`,
decision 17), scaled to fit any viewport. The play area (feed, this
season's gates, hand, draft or gate) is on the left; the goals board holds
the right rail in every phase.

What each screen answers (ui-plan §13 priority):
- **What am I doing.** The title screen shows the opening premise.
  Hovering a card (long-press on touch) opens a preview floating beside
  it (D6) that leads with the headline the card would print — the same
  variant, from the same hash of seed, month and card instance, that the
  feed prints once it is played (D21) — then its numbers and any line it
  crosses. Hovering END TURN lists the scandals that would print by their
  headlines, each with its cause. The feed aggregates per action (D5): one
  headline per card played, set in its register (LOUD bold, quiet italic,
  Money plain), its deltas beneath; draws merged into one line; each
  scandal as a red lead line with who is blamed; a season opener when a
  season starts; one month-end line with the month's deltas and the heat
  that carries over (none in the last month). The line's movement (a
  number from /core) is told where it happened (D18).
- **What am I aiming for.** The goals board (D10, D22), always in view:
  Headliner, The Musician's Musician, Cautionary Tale, Nobody Yet —
  aspirations first — each with its goal line and live requirements, and
  an "If the year ended today" marker on the ending the year would
  resolve to now. The final gate predicts each option's ending and awards
  ("This ends the year as: Nobody Yet · Critics' Choice"), or says once
  "Either way, the year ends as …" when they are identical (D23). The
  ending screen ("One year later.") shows the ending's name and text, then
  every award won with its citation as a plain list, the run summary, and
  the other three endings with their goal lines.
- **What can I do.** The deck viewer (D12): deck and discard pile, grouped
  and sorted by name, never in draw order. Opened from the masthead in
  every phase.
- **Clarity.** The heat display (D1) counts no scandals: "N TO GO", or
  "LINE CROSSED · N TO THE NEXT". The END TURN button carries the
  month-end count (D2), Copycat copies included.

Checks (2026-09-30, end of this round):
- `npm run sim`: identical to the layer 2 baseline apart from the
  wall-clock time. Prose, previews, the goals marker and awards touch no
  game RNG and move no band.
- `npm run check:preview`: 0 mismatches over 18,931 states — 35,983 card
  previews, each headline identical to the one the feed prints; 5,451
  month-end scandal cards (1,001 copies); 300 final gates (600 options),
  each option's predicted ending and awards identical to the real
  finished year's.
- `npm run validate`: 0 errors, 0 warnings (326 i18n keys, no prose gaps).
- `npm run sim:awards`: every award inside its target on seeds 20260929,
  1 and 424242; no run without an award (rates in decisions.md).
- Stage: overflow audits in headless Chrome with the floating preview
  opened over every card position and END TURN at every state. 1280×720
  (dev server): 16 random runs (842 states, 2,460 card hovers, 598 END
  TURN hovers, 135 deck views) plus 7 recorded runs (the four endings, a
  final gate whose options differ only in awards, a four-award ending, an
  eight-card hand). Production build at 800×450 (8 runs, 419 states) and
  667×375 phone landscape (8 runs, 387 states), each plus the same 7
  recorded runs. Zero overflows everywhere.

## Gap list: prose still to write

None. Drafts v1 and v2 (`docs/writing/`) filled every gap; `npm run
validate` reports no prose warnings. The voice rules live in
`docs/writing/voice.md`.

## Known issues

Fixed this round: the story arrived after the decision; the goals board
vanished during decisions; the goals board listed endings in resolution
order; "✓ not: Signed to a label" (now "Not yet signed to a label"); the
interface labels "Your career is over" and "The story so far"; the heat
carry-over printed as its own line every month; two identical final-gate
predictions.

Still open:
- The season transition beat itself (D13) is not built; the line's
  movement is told in the feed.
- The draft preview from /core (D8) is not built: a draft card shows its
  requirement, not its outcome.
- A hover preview once stayed on a card while the pointer was on END TURN.
  Seen under automated input only; confirm with a real mouse.
- `act()` in `ui/App.tsx` fast-forwards the queue and then executes the
  click. Harmless while nothing animates; it must change to D7 (a click
  only fast-forwards) before any animation lands.
- Code comments still cite "CLAUDE.md §N". They resolve, because
  CLAUDE.md imports AGENTS.md.
- Tooling: the Vite dev server on Windows sometimes misses the last of
  several writes to one file within a second and then serves a stale
  module. After a scripted multi-edit, touch the file (or restart the
  server) before checking in the browser.

## Next task

**The author's playtest of this build**, then **layer 2 part 2: visual
craft** — type, palette, halftone, card layout, the front-page setting of
the feed, season transitions (AGENTS.md §6; ui-plan §10 and §13). It
designs for the one 1280×720 canvas (D17) and keeps everything inside it.

## Waiting on the author

- **Playtest this build.** Does the story now arrive at the moment of
  decision, and do the goals stay in view while you choose?
- **Prose that may read badly in play** (the author's call; agents do not
  rewrite prose):
  - Headline variants that fit one branch only, though a hash picks the
    variant whatever branch fired: Fan Meetup's "FANS QUEUE FOR HOURS TO
    MEET NEW FAVOURITE" (the went-viral branch); Tabloid Bait's "SINGER
    BREAKS SILENCE — AND IT'S EVERYWHERE BY LUNCH" (the 2+ scandals
    branch); Cover Single's "FANS SAY THE COVER BEATS THE ORIGINAL"
    (leans to the Craft 15+ branch).
  - Headlines that assume an early career print in any month, however
    famous the player is by then: Open Mic's "LOCAL CROWD FALLS SILENT FOR
    NEWCOMER" (a starting card, seen in month 11 at Hype ~75), Late Night
    Show's "LATE-NIGHT DEBUT: NEWCOMER STEALS THE SHOW" (on every play,
    not only the first), Fan Meetup's "… NEW FAVOURITE".
  - Nobody Yet's text ("No headlines, good or bad") sits above People's
    Choice in 13% and Breakthrough of the Year in 18% of player-like
    Nobody Yet runs.
- **The final gate rarely decides the ending.** Of 1,500 player-like final
  gates, 75.7% give the same ending and awards either way, 19.9% differ
  only in awards, 4.4% in the ending. A design question, not a bug.
- **itch and Safari/iPad.** Set the embed's viewport dimensions to
  1280×720 with the fullscreen button on, upload a new build, and play it
  in Safari on a Mac and, if possible, an iPad in landscape. To build:
  `npm run build`, then from `dist/`:
  `C:/Windows/System32/tar.exe -a -cf ../overexposed.zip index.html assets`.
- **A hand-timed first run.** The target is 10–15 minutes (ui-plan §12).
- **First-run mechanic exposure** (decisions.md, 2026-09-29): in the next
  playtest, play a cautious first run and note whether a scandal ever
  appears.

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
npm run sim              # headless balance run (bands in AGENTS.md §5)
npm run sim:awards       # year-end award rates per persona
npm run validate         # content, i18n keys, prose gaps, code boundaries
npm run typecheck
npm run check:preview    # every UI preview against the real reducer outcome
```

With `npm run dev` running, `/check/embed.html` shows the game in an
itch-style frame at 1280×720, 1024×576, 800×450 and two phone sizes, with
a fullscreen button and the stage scale and text size read out.
