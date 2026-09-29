# Status

As of 2026-09-30. **Read this first; update it at the end of every
session** (AGENTS.md → Session rules).

Overexposed is a deck-building career sim for the Game Gauntlet SIM Jam,
played in the browser. A run is 12 months (4 seasons × 3). Fast hype
builds heat, heat crystallises into scandal cards, and scandals clog the
hand by winter. Rules and architecture: [AGENTS.md](../AGENTS.md). UI
scope: [ui-plan.md](ui-plan.md). Design decisions:
[decisions.md](decisions.md).

## Done

| Area | State | Where |
|---|---|---|
| Engine | Pure TypeScript reducer, seeded RNG, 19 frozen GameEvents; strict mode in dev and sim, lenient in the shipped build | `/core` |
| Content | 34 cards (21 action, 7 opportunity, 6 scandal), 8 gates, 4 endings; JSON with i18n keys only | `/content`, `i18n/en.json` |
| Validation | Schema, ids, i18n keys, reachability, code boundaries (including no rule logic in /ui) | `npm run validate` |
| Sim | 7 personas, headless, seeded; 10 bands | `npm run sim` |
| Balance | Rounds 1–5 done. All 10 bands pass on seeds 20260929, 1 and 424242 | `sim/out/tuning-log.md` |
| Frozen for UI | Run structure, gates, endings, resources, starting deck, heat formula, heat display, GameEvent list | AGENTS.md §2 |
| UI layer 1 | A complete run in the browser; previews checked against the reducer (commit dcf231e). A fixed 1280×720 stage scaled to fit any viewport (2026-09-30) | `/ui`, `/check` |

## UI layer 1 — actual state

Functional and plain: system fonts, no animation. The screen comes from
`state.phase`, what is clickable from `legalActions`, every number from
/core.

- Stage (`ui/Stage.tsx`): the whole UI is laid out at 1280×720 and
  scaled to fit the viewport (contain, never crop), centred and
  letterboxed. It re-fits on resize and fullscreen, and no screen
  scrolls, except that the feed, a log of the whole run, scrolls inside
  its column. Body text is 20px on the stage: 16px at 1024×576, 12.5px at
  800×450, 10.4–10.8px at phone landscape. A hand of 6 or more cards
  (draw effects; 8 is the most seen) shrinks card text to 16px on the
  stage, 10px at 800×450.
- Stage tests (2026-09-30): an overflow audit over every state of 40+
  seeded runs at 1280×720, with every card preview opened, plus an
  8-card hand. The production build was audited over 3 runs each at
  800×450 and at 667×375 with mobile emulation. The re-fit was checked
  through real resize and fullscreen events in headless Chrome. All
  clean.

- Screens: title, draft (with extra pick and reroll), play, gate, ending,
  play again. `?seed=N` in the URL replays a run.
- Previews (`ui/preview.ts`): card play, end of month, gate, and draft
  requirements — each runs the reducer on a hypothetical action.
- Event feed: one line per GameEvent, through an `EventQueue`
  (`ui/queue.ts`) that drains at once. Layer 3's animation player slots
  in there.
- Strings: 128 `ui.*` keys in `i18n/en.json`. A missing key renders
  bracketed and warns in the console.
- Checks: `npm run check:preview` — 300 seeded runs, 18,931 states,
  0 mismatches. `npm run validate` flags rule logic in /ui.
- Build: 275.7 KB of JS (83.9 KB gzipped). Local cold load: 35 ms to
  DOMContentLoaded. Vite `base: './'` is set.
- Acceptance (ui-plan §11): 5 of 6 met. The itch draft and Safari item
  waits on the author.
- One run driven by the agent took 57 decisions: 32 card plays, 12 month
  ends, 9 draft picks, 4 gates. Human play time is not measured yet.

## Known issues from the layer 1 playtest

Most are addressed by a layer 2 decision (ui-plan §13; D = decision).

| # | Issue | Addressed by |
|---|---|---|
| 1 | "N to go" misleads once a line is crossed: it counts to the next scandal while one is already due. A card preview showed "Heat 2 → 7 · 3 to go" beside "crosses the line" | D1 |
| 2 | Two scandal counts can disagree: the status strip's "if the month ended now" (heatOutlook, the state as it stands) and the END TURN preview (the reducer, including onEndOfTurn effects such as Copycat Story) | D2 |
| 3 | The first screen of a run is a draft, and the deck is never visible, only counted | D12, D8 |
| 4 | The card preview presents crossing a line as the card's consequence, but scandals only print at month end | D3 |
| 5 | Heat carrying over between months is never explained (6 → 2 after a scandal, then carried into the next month) | open |
| 6 | The line moves at a season change with no notice: "5 to go" became "4 to go" at summer with heat unchanged | D4, D13 |
| 7 | The feed is too long: one line per event, 263 lines a run, a median of 21 a month, 54% of them resource and draw bookkeeping. About 14 lines are visible at 1280×720 | D5 |
| 8 | The preview sat in the right rail, far from the hand, and was cut off in winter when the season's gates listed more requirements | Cut-off fixed by the stage layout (the preview has its own column); D6 still moves it beside the card |
| 9 | The final gate decides the ending, but nothing on screen links them, and no ending conditions are visible all run. A Star run that also met Craftsman is never told | D10, D11 |
| 10 | The ending screen has no ending names, placeholder text, and three bare "Locked ending" lines | D9, D16 |
| 11 | The heat forecast stays on screen during gates, including the final one, when no month is left to end | open (small) |
| 12 | The draft's Take buttons sat at different heights because card texts differ in length | Fixed by the stage layout: buttons sit at the bottom of each card |
| 13 | Requirement wording is awkward: "✓ not: Signed to a label" | layer 2 UI text (D15) |
| 14 | A hover preview once stayed on a card while the pointer was on END TURN. Seen under automated input only; confirm with a real mouse | to verify |

Also:
- `act()` in `ui/App.tsx` fast-forwards the queue and then executes the
  click. That is harmless while nothing animates, but it must change to
  D7 (a click only fast-forwards) before any animation lands.
- Code comments still cite "CLAUDE.md §N". They resolve, because
  CLAUDE.md imports AGENTS.md. Update them when those files are next
  touched.

## Next task

Layer 2, per [ui-plan.md](ui-plan.md) §13. Build the meaning layer first
— goals board (D10), feed headlines and the headline field (D5, D15),
ending names (D9), season openers (D13), deck viewer (D12) — with visual
craft alongside it, never ahead. Agents build the fields, keys and
placeholders; the author writes the prose (D15).

Notes for whoever builds it:
- Read-only /core queries layer 2 needs: the next line and how far it
  moved (D4: the integer heat value at which the next scandal would
  crystallise), "as if this card were in hand"
  for the draft preview (D8), and the awards on final state
  (decisions.md, 2026-09-29). The goals board (D10) can show every
  ending's clauses through explainCondition. Saying which ending the run
  is heading for needs /core, though: endings resolve by priority, and a
  priority walk in /ui would be rule logic.
- New fields and keys go into the AGENTS.md §2 schemas, the §3 key
  convention and validate as they are built: the D15 schema (card
  headline variants and register; scandal headline and in-hand text;
  ending name, goal line and text; gate flavour; season openers; the
  opening premise; award names and citations). The ending's goal line
  doubles as D9's one-line hint for a locked ending. Agents build
  fields, keys and placeholders and import approved prose; they never
  invent it.

## Open questions for the author

None. The seven raised at the layer 1 handoff were decided on 2026-09-30
(ui-plan §13, decisions 1, 2, 4 and 18–20); the one left open is a manual
test, listed below.

## Waiting on the author

- **itch draft and Safari/iPad test.** The layer 1 build is on an itch
  draft (2026-09-30). It rendered at 800×450 and clipped, which the fixed
  stage fixes. Still to do: set the embed's viewport dimensions to
  1280×720 with the fullscreen button on, upload the new build, and play
  it in Safari on a Mac and, if possible, on an iPad in landscape. To build: `npm run build`, then zip the contents of `dist/`
  with `index.html` at the root and forward-slash paths. From `dist/`:
  `C:/Windows/System32/tar.exe -a -cf ../overexposed.zip index.html assets`.
- **The player-facing prose (D15, amended 2026-09-29).** The author
  accepted an AI-assisted writing draft, `docs/writing/draft-v1.md`; the
  public disclosure says player-facing text was drafted with AI
  assistance (AGENTS.md §10). The draft is imported into `i18n/en.json`,
  which is then the canonical home of the prose. The author revises it
  during playtesting and writes what the draft leaves pending.
- **A hand-timed first run.** The target is 10–15 minutes (ui-plan §12).
- **First-run mechanic exposure** (decisions.md, 2026-09-29): in the next
  playtest, play a cautious first run and note whether a scandal ever
  appears.

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
npm run validate         # content, i18n keys, code boundaries
npm run typecheck
npm run check:preview    # every UI preview against the real reducer outcome
```

With `npm run dev` running, `/check/embed.html` shows the game in an
itch-style frame at 1280×720, 1024×576, 800×450 and two phone sizes, with
a fullscreen button and the stage scale and text size read out.
