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
| Engine | Pure TypeScript reducer, seeded RNG, 19 frozen GameEvents; strict mode in dev and sim, lenient in the shipped build | `/core` |
| Content | 34 cards (21 action, 7 opportunity, 6 scandal), 8 gates, 4 endings; JSON with i18n keys only | `/content`, `i18n/en.json` |
| Validation | Schema, ids, i18n keys, reachability, code boundaries (including no rule logic in /ui); missing prose as warnings | `npm run validate` |
| Sim | 7 personas, headless, seeded; 10 bands | `npm run sim` |
| Balance | Rounds 1–5 done. All 10 bands pass on seeds 20260929, 1 and 424242 | `sim/out/tuning-log.md` |
| Frozen for UI | Run structure, gates, endings, resources, starting deck, heat formula, heat display, GameEvent list | AGENTS.md §2 |
| UI layer 1 | A complete run in the browser; previews checked against the reducer (dcf231e). A fixed 1280×720 stage scaled to fit any viewport | `/ui`, `/check` |
| UI layer 2, part 1 | The meaning layer, unstyled: the writing draft imported, goals board, deck viewer, the new heat display and END TURN preview (2026-09-30) | `/ui`, `i18n/en.json` |

## The UI as it stands

Legibility only: system fonts, no palette, no animation. The screen comes
from `state.phase`, what is clickable from `legalActions`, every number
from /core. Everything sits on the fixed 1280×720 stage (`ui/Stage.tsx`,
decision 17), scaled to fit any viewport.

What each screen answers (ui-plan §13 priority):
- **What am I doing.** The title screen shows the opening premise. The
  feed aggregates per action (D5): one headline per card played, chosen
  from its variants by a hash of seed, month and card instance (never the
  game RNG), set in its register (LOUD bold, quiet italic, Money plain),
  with its deltas beneath; draws merged into one line; each scandal as a
  red lead line with its headline and who is blamed; a season opener when
  a season starts. Explanations attach to their cause (D18): the month
  end says what heat carries over, a gate's line shows the heat it added,
  and the line's movement (a number from /core, `lineMoved`) is told
  where it happened. Scandals in hand show their in-hand line, with their
  rules told by the interface from their effects. Gates show their
  flavour.
- **What am I aiming for.** The goals board (D10): the four endings, each
  with its name, goal line and live requirements via explainCondition,
  shown in the right-hand column whenever nothing is being previewed. The
  ending screen shows the ending's name and text, and the other three with
  their goal lines. The final gate names the ending each option leads to
  (D11).
- **What can I do.** The deck viewer (D12): deck and discard pile, grouped
  and sorted by name, never in draw order. Opened from the side column in
  every phase, the first draft included.
- **Clarity.** The heat display (D1) counts no scandals: "N TO GO", or
  "LINE CROSSED · N TO THE NEXT", from /core's `heatLine`. The END TURN
  button carries the month-end count (D2) — every scandal card month end
  will add, Copycat copies included — and hovering it lists each one with
  its cause. The "if the month ended now" line is gone.

Checks (2026-09-30):
- `npm run sim`: identical to the pre-import baseline apart from the
  wall-clock time — the prose and its variant choice touch no game RNG.
- `npm run check:preview`: 0 mismatches over 18,931 states, including
  5,451 month-end scandal cards (1,001 copies) and 600 final gates naming
  their ending.
- `npm run validate`: 0 errors; 10 prose warnings (the gap list below).
- Stage: an overflow audit in headless Chrome over 16 seeded-random runs
  (852 states, every card and END TURN hovered, the deck viewer opened
  132 times) and a replay of a run to each of the four endings. All clean
  at 1280×720.

## Gap list: prose still to write

None. Draft v2 (`docs/writing/draft-v2.md`, imported 2026-09-30) filled
every gap; `npm run validate` reports no prose warnings. The voice rules
live in `docs/writing/voice.md`.

## Known issues

Fixed by layer 2 part 1: layer 1 issues 1 ("N to go" once a line is
crossed), 2 (two scandal counts), 3 (no deck view), 4 (crossing presented
as the card's consequence), 5 (heat carry-over unexplained), 7 (feed too
long), 9 (final gate and endings unlinked), 10 (ending names and text) and
11 (a heat forecast during gates). Issues 8 and 12 were fixed by the stage
layout.

Still open:
- The line's movement is told in the feed, but the season transition beat
  itself (D13) is not built.
- Requirement wording is awkward: "✓ not: Signed to a label".
- A hover preview once stayed on a card while the pointer was on END TURN.
  Seen under automated input only; confirm with a real mouse.
- Both final-gate options can lead to the same ending (seen: a Headliner
  run where both said "This ends the year as: Headliner"), so the last
  choice can be moot for the ending.
- The goals board lists endings in resolution order, so Cautionary Tale
  comes first. When two endings are fully met, it doesn't say which wins
  until the final gate.
- Interface labels that now sit beside the author's prose and may read
  badly: "Your career is over" on the ending screen (the endings speak of
  a year, and Nobody Yet of a career still going), and the feed's title
  "The story so far". Both are interface text for the author to judge.
- "Heat N carries into next month" prints at every month end with heat
  left: accurate, but frequent.
- `act()` in `ui/App.tsx` fast-forwards the queue and then executes the
  click. Harmless while nothing animates; it must change to D7 (a click
  only fast-forwards) before any animation lands.
- Code comments still cite "CLAUDE.md §N". They resolve, because
  CLAUDE.md imports AGENTS.md.

## Next task

**Layer 2 part 2: visual craft**, after the author has playtested this
build — type, palette, halftone, card layout, the front-page setting of
the feed, season transitions (AGENTS.md §6; ui-plan §10 and §13). It
designs for the one 1280×720 canvas (D17) and keeps everything inside it.
Still to build in layer 2: the floating card preview (D6), the draft
preview from /core (D8), the awards ceremony (D16; award names and
citations are already in `i18n/en.json`, the conditions are not written),
and the season transition beat (D13).

## Waiting on the author

- **Playtest this build** (the meaning layer): does the run now say what
  you are doing, what you are aiming for and what you can do?
- **Revise the imported prose** in `i18n/en.json` as playtests suggest
  (its canonical home; the drafts in `docs/writing/` are historical
  records).
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

None beyond the manual test above.

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
npm run validate         # content, i18n keys, prose gaps, code boundaries
npm run typecheck
npm run check:preview    # every UI preview against the real reducer outcome
```

With `npm run dev` running, `/check/embed.html` shows the game in an
itch-style frame at 1280×720, 1024×576, 800×450 and two phone sizes, with
a fullscreen button and the stage scale and text size read out.
