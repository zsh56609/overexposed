# Status

As of 2026-10-17: round R1 is under way — the screens around the desk and the hand's feel, then the public early
build on itch. **Read this first; update it at the end of every session** (AGENTS.md → Session rules).

Overexposed is a deck-building career sim for the Game Gauntlet SIM Jam, played in the browser: one year as a young
singer, 12 months in four seasons. Fast hype builds heat, heat crystallises into scandal cards, and scandals clog the
hand by winter. The year ends on one of 4 major and 14 minor endings. A run takes 10–15 minutes.

Where things are: the rules and the frozen design, [AGENTS.md](../AGENTS.md); the look,
[design/visual/README.md](design/visual/README.md) with its mockups and shots; decisions,
[decisions.md](decisions.md); round reports, [reports/](reports/).

## Built

| Area | State |
|---|---|
| Engine | Pure TypeScript reducer, seeded, 19 GameEvents; content-driven cards, gates, two-level endings, awards, managers, the press, lanes and the draft; read-only queries for everything the UI shows |
| Content | 42 cards, 8 gates, 4 majors and 14 minors, 7 awards, 2 managers, 3 papers, 9 desk scripts; prose keyed in `i18n/en.json` |
| Sim | 9 personas, 14 bands, once per manager; `sim:compare` holds a round to the recorded numbers |
| The desk (V1a) | Stat bar, papers with code-drawn halftone photographs, mirror, props, phone and bubbles, the fanned hand |
| Its motion (V1b) | Accepted for the jam as built (game source `2964ef8`): the card's flight to the pile, the printed story, rolling numbers, the month end in beats. Reports: [reports/2026-10-15-v1b-acceptance.md](reports/2026-10-15-v1b-acceptance.md); handoff: [handoff/v1b.md](handoff/v1b.md) |
| The hand's feel (R1, Part A) | A card play holds input only until the card is set down (about 0.94 s, from 2.1 s for loud and money cards and 3.6 s for quiet ones); its tails play on and the next action completes them (decision 7, revised) |
| Screens around the desk | Still the plain layer-1 versions: title, manager choice, offers, doors, deck, ending — round R1 replaces them |

## Next

1. **R1 (10/17–18):** the title and the manager choice, the offers, the doors, the awards night with the year in front
   pages, then the deck, the scrapbook, settings and credits; a release-candidate check; the public early build.
2. **R2 (10/19–21):** phase 3, events (prose comes as draft-v9).
3. **R3 (10/22–23):** fixes from play and feedback. **10/24:** the playtest build on itch.
4. **10/25–31:** polish, sound, a retune. **11/1:** feature freeze. **11/2–3:** fixes only, the itch page; submit
   11/3 JST. Deadline 11/5 04:00 JST — treat 11/4 as the real one.

Cut for the jam: the 27 once-per-run variants; hand-painted illustration and the photo collage (every image is drawn
in code); the year in review as its own phase.

## For the author

- Real Safari and iPad: test the itch build when a device is at hand (the itch embed at 1280×720, fullscreen on).
- Playtest: does Dex's extra card compete with Mags's calm; does the stat bar read at a glance; do players start a
  second run unprompted; time a first run against 10–15 minutes.

## Acceptance

Every round: build, typecheck, validate, `check:queue`, `check:preview`, `check:clicks` and `check:overflow` in
Chromium at 1280×720 and 844×390; `sim:compare` when content or rules change. A release candidate: the same in
Chromium, Firefox and WebKit at 1280×720, 800×450 and 844×390. No timing evidence, recordings or evidence folders;
one Chinese report per round in `docs/reports/` (AGENTS.md §8).

## Commands

```
npm run dev | build | typecheck | validate
npm run check:queue | check:preview | check:clicks | check:overflow
node check/clicks.ts --browsers=chrome --sizes=1280x720,844x390m     # the every-round narrowing
npm run sim -- --seed=20260929                                       # and sim:awards, sim:tiers, sim:managers
npm run sim:baseline -- --out=sim/out/<name>; npm run sim:compare -- <a> <b>
```

Every command and tool: AGENTS.md §11 and [handoff/v1a.md](handoff/v1a.md#tools). Playwright (dev only) drives
WebKit: `npx playwright install webkit` once on a new machine. To build the itch zip: `npm run build`, then from
`dist/`, `tar -a -cf <outside the repo>/overexposed.zip index.html assets`.
