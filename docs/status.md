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
- Read-only /core queries layer 2 needs: the next line's position (D4,
  once defined — see the open questions), "as if this card were in hand"
  for the draft preview (D8), and the awards on final state
  (decisions.md, 2026-09-29). The goals board (D10) can show every
  ending's clauses through explainCondition. Saying which ending the run
  is heading for needs /core, though: endings resolve by priority, and a
  priority walk in /ui would be rule logic.
- New fields and keys go into the AGENTS.md §2 schemas, the §3 key
  convention and validate as they are built. That covers the ending
  nameKey (D9), a hint key per ending (D9 names no field for it), the
  card headline field (D15), the season openers (D13) and the opening
  premise. Agents create the keys with placeholders; the author writes
  the text.

## Open questions for the author

- **D1 vs D2.** The "1 SCANDAL DUE" count comes from heatOutlook (the
  state as it stands, per the frozen display rule). The END TURN count
  comes from the reducer and includes onEndOfTurn effects, so the two can
  disagree. With today's content that happens in autumn with exactly one
  scandal held and Copycat Story in hand at heat ≥ 4. Copycat adds a copy
  of itself before the heat check, which drops the threshold from 5.5 to
  5. Decide what the heat display shows in that case.
- **Copycat copies.** The copy a Copycat Story adds at month end is a
  new scandal card, but not a crystallisation. Decide whether "N
  scandals will print" (D2) and the lead story (D5) count it. Otherwise
  it lands unannounced.
- **D4's "next line".** The position of the next line above current heat
  also jumps when heat crosses a line (7 → 14 after a big play), and a
  failed gate's heat can hide a line that came closer. Define the query
  so its before/after diff shows only the line moving. Also confirm D4 is
  a sanctioned exception to AGENTS.md's "the UI … never diffs states".
- **Crossing without a card.** Heat can end up over a line with no card
  played: a gate's failure penalty, a new season's tighter line, or the
  vent's residue. Decide where the light warning (D3) goes then.
- **Art date.** AGENTS.md §6 says "Do not start art before 2026-10-26",
  but layer 2 puts visual craft alongside the meaning layer now. The plan
  reads the date as applying to illustration (layer 4) only. Please
  confirm.
- **Awards and the content budget.** 6–8 awards are a new content type
  outside the 46-piece ceiling in AGENTS.md §2. Please confirm the
  budget.
- **First-run mechanic exposure** (decisions.md, 2026-09-29): verify by
  hand whether a cautious first run can finish without ever seeing a
  scandal.

## Waiting on the author

- **itch draft and Safari/iPad test.** The layer 1 build is on an itch
  draft (2026-09-30). It rendered at 800×450 and clipped, which the fixed
  stage fixes. Still to do: set the embed's viewport dimensions to
  1280×720 with the fullscreen button on, upload the new build, and play
  it in Safari on a Mac and, if possible, on an iPad in landscape. To build: `npm run build`, then zip the contents of `dist/`
  with `index.html` at the root and forward-slash paths. From `dist/`:
  `C:/Windows/System32/tar.exe -a -cf ../overexposed.zip index.html assets`.
- **The player-facing prose (D15).** Everything in `i18n/en.json` today
  was written in agent sessions: every commit that touched it carries a
  Claude co-author trailer. That covers card names and rules text; gate,
  season and flag names; the 128 `ui.*` labels; and the placeholder
  ending texts. The disclosure "all text is hand-written" holds only once
  the author has written all of it, or once the disclosure is narrowed.
- **A hand-timed first run.** The target is 10–15 minutes (ui-plan §12).

## Schedule

| Date | Milestone |
|---|---|
| 2026-10-15 | Internal feature freeze: tuning, polish and fixes only after this |
| ~2026-10-18 | Early build submitted to itch as insurance |
| 2026-10-26 | Art may start (AGENTS.md §6) |
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
