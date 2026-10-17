# Status

As of 2026-10-17: round R2 is done — the events (phase 3): fifteen texts and letters that come every other month,
answered on the phone or on paper, printed in the papers, measured and tuned in the sim. Its build is v0.2. Round R3
is next: what the author found playing the R1 build, and the opening rebuilt (v0.3). **Read this first; update it at
the end of every session** (AGENTS.md → Session rules).

Overexposed is a deck-building career sim for the Game Gauntlet SIM Jam, played in the browser: one year as a young
singer, 12 months in four seasons. Fast hype builds heat, heat crystallises into scandal cards, and scandals clog the
hand by winter. The year ends on one of 4 major and 14 minor endings. A run takes 10–15 minutes.

Where things are: the rules and the frozen design, [AGENTS.md](../AGENTS.md); the look,
[design/visual/README.md](design/visual/README.md) with its mockups and shots; decisions,
[decisions.md](decisions.md); round reports, [reports/](reports/) — the latest,
[reports/2026-10-17-r2.md](reports/2026-10-17-r2.md).

## Built

| Area | State |
|---|---|
| Engine | Pure TypeScript reducer, seeded, 21 GameEvents; content-driven cards, gates, two-level endings, awards, managers, the press, lanes, the draft and the events (phase `event`, `CHOOSE_EVENT`); read-only queries for everything the UI shows |
| Content | 42 cards, 8 gates, 4 majors and 14 minors, 7 awards, 2 managers, 3 papers, 9 desk scripts, 15 events in 3 chains; prose keyed in `i18n/en.json`; TODO(prose): the 12 labels of the six event flags |
| Sim | 9 personas, 17 bands, once per manager, with the events reported; `sim:compare` holds a round to the recorded numbers |
| The desk (V1a, V1b) | Stat bar, papers with code-drawn halftone photographs, mirror, props, phone and bubbles, the fanned hand, and its motion. Handoff notes: [handoff/v1a.md](handoff/v1a.md), [handoff/v1b.md](handoff/v1b.md) |
| The hand (R1) | A play holds input only until the card is down (about 0.94 s); its tails play on and the next action completes them. One face order everywhere (name, body, flavour), every number an icon; the paper a play prints in comes forward; popovers rise and fade in one way |
| Screens (R1, `ui/screens/`) | The title, the manager choice, the offers, the doors and the last door, the awards night with the year in four front pages, and four panels — the deck, the endings scrapbook, House rules (`ui/settings.ts`) and the credits. No plain screen is left |
| Events (R2) | A text comes up on the phone, message by message; a letter lands on the desk, typed, with tick boxes. Answering is a step of its own: the reply, their answer or the SENT stamp, the effects landing, then the month opens with the paper that printed it in front. A dev page, `check/events.html`, shows every event and two at the schema's limits for the checks |

## Next

1. **Now:** R3 — the author's findings from the R1 build and the opening rebuilt, as the R3 prompt sets out (v0.3, a
   release candidate). The v0.2 zip is built outside the repo (see the R2 report).
2. **10/24:** the playtest build on itch.
4. **10/25–31:** polish, sound, a retune. **11/1:** feature freeze. **11/2–3:** fixes only, the itch page; submit
   11/3 JST. Deadline 11/5 04:00 JST — treat 11/4 as the real one.

Cut for the jam: the 27 once-per-run variants; hand-painted illustration and the photo collage (every image is drawn
in code); the year in review as its own phase.

## For the author

- Real Safari and iPad: test the itch build when a device is at hand (the itch embed at 1280×720, fullscreen on).
- The events' one failing band: three replies the greedy players always take — "I can't right now. Sorry."
  (sam_rent), "On my way." (producer_room), "I'll be there at nine." (casting_arc). Accept them as take-it-or-leave-it
  offers, let the last two cost two actions, or have the personas value the flags events read (decisions.md, R2 Part E).
- The labels of the six event flags (TODO(prose), listed in the R2 report).
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
