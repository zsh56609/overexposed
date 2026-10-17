# Status

As of 2026-10-17: round R1 is done — every screen around the desk is built, the hand's feel is fixed, the card faces
share one order, and the checks are leaner. The public early build goes on itch next. **Read this first; update it at
the end of every session** (AGENTS.md → Session rules).

Overexposed is a deck-building career sim for the Game Gauntlet SIM Jam, played in the browser: one year as a young
singer, 12 months in four seasons. Fast hype builds heat, heat crystallises into scandal cards, and scandals clog the
hand by winter. The year ends on one of 4 major and 14 minor endings. A run takes 10–15 minutes.

Where things are: the rules and the frozen design, [AGENTS.md](../AGENTS.md); the look,
[design/visual/README.md](design/visual/README.md) with its mockups and shots; decisions,
[decisions.md](decisions.md); round reports, [reports/](reports/) — the latest,
[reports/2026-10-17-r1.md](reports/2026-10-17-r1.md).

## Built

| Area | State |
|---|---|
| Engine | Pure TypeScript reducer, seeded, 19 GameEvents; content-driven cards, gates, two-level endings, awards, managers, the press, lanes and the draft; read-only queries for everything the UI shows (R1 added `seasonPages`) |
| Content | 42 cards, 8 gates, 4 majors and 14 minors, 7 awards, 2 managers, 3 papers, 9 desk scripts; prose keyed in `i18n/en.json`; no TODO(prose) left |
| Sim | 9 personas, 14 bands, once per manager; `sim:compare` holds a round to the recorded numbers |
| The desk (V1a, V1b) | Stat bar, papers with code-drawn halftone photographs, mirror, props, phone and bubbles, the fanned hand, and its motion. Handoff notes: [handoff/v1a.md](handoff/v1a.md), [handoff/v1b.md](handoff/v1b.md) |
| The hand (R1) | A play holds input only until the card is down (about 0.94 s); its tails play on and the next action completes them. One face order everywhere (name, body, flavour), every number an icon; the paper a play prints in comes forward; popovers rise and fade in one way |
| Screens (R1, `ui/screens/`) | The title, the manager choice, the offers, the doors and the last door, the awards night with the year in four front pages, and four panels — the deck, the endings scrapbook, House rules (`ui/settings.ts`) and the credits. No plain screen is left |

## Next

1. **Now:** the public early build on itch, from the R1 release candidate (the zip is built outside the repo; see the
   R1 report).
2. **R2 (10/19–21):** phase 3, events (prose comes as draft-v9).
3. **R3 (10/22–23):** fixes from play and feedback. **10/24:** the playtest build on itch.
4. **10/25–31:** polish, sound, a retune. **11/1:** feature freeze. **11/2–3:** fixes only, the itch page; submit
   11/3 JST. Deadline 11/5 04:00 JST — treat 11/4 as the real one.

Cut for the jam: the 27 once-per-run variants; hand-painted illustration and the photo collage (every image is drawn
in code); the year in review as its own phase.

## For the author

- Real Safari and iPad: test the itch build when a device is at hand (the itch embed at 1280×720, fullscreen on).
- The year in front pages follows the rule as written: a season shows a player lead only when the player's story led
  a front page; below Famous it rarely does, so many years show mostly the world's news (the R1 report has the count).
  A decision for the author: keep it, or fall back to the player's most prominent story of the season first.
- The pace of a month end: unskipped, it takes 7.7 s at the median and up to 11.5 s, and a season change about
  8.6 s from the door to the next offers (a click skips). Shorten it, or keep V1b's sequence as accepted.
- Optional: the hover preview still lists its outcome in words ("+3 Hype"); the card faces use icons.
- Playtest: does Dex's extra card compete with Mags's calm; does the stat bar read at a glance; do players start a
  second run unprompted; time a first run against 10–15 minutes.

## Acceptance

Every round: build, typecheck, validate, `check:queue`, `check:preview` (60 runs), `check:clicks` and
`check:overflow` in Chromium at 1280×720 and 844×390; `sim:compare` when content or rules change. A release
candidate: the same in Chromium, Firefox and WebKit at 1280×720, 800×450 and 844×390, with `check:preview --
--runs=300`, `check:motion` and `check:overflow:full`. No timing evidence, recordings or evidence folders; one
Chinese report per round in `docs/reports/` (AGENTS.md §8).

## Commands

```
npm run dev | build | typecheck | validate
npm run check:queue | check:preview | check:clicks | check:overflow
node check/clicks.ts --browsers=chrome --sizes=1280x720,844x390m     # the every-round narrowing (also overflow)
npm run check:preview -- --runs=300; npm run check:motion; npm run check:overflow:full   # release candidates
npm run sim -- --seed=20260929                                       # and sim:awards, sim:tiers, sim:managers
npm run sim:baseline -- --out=sim/out/<name>; npm run sim:compare -- <a> <b>
```

Every command and tool: AGENTS.md §11 and [handoff/v1a.md](handoff/v1a.md#tools). Playwright (dev only) drives
WebKit: `npx playwright install webkit` once on a new machine. To build the itch zip: `npm run build`, then from
`dist/`, `tar -a -cf <outside the repo>/overexposed.zip index.html assets`.
