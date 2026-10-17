# Status

As of 2026-10-18: round R4 is done — what the author found in v0.3 (hovers that ease, signing, one way to leave and
arrive over the desk, the awards collected, the craft icon by card), sound and music, and the author's answers to
the R2 and R3 questions. Its build is v0.4, the 10/24 playtest build, a release candidate. **Read this first; update
it at the end of every session** (AGENTS.md → Session rules).

Overexposed is a deck-building career sim for the Game Gauntlet SIM Jam, played in the browser: one year as a young
singer, 12 months in four seasons. Fast hype builds heat, heat crystallises into scandal cards, and scandals clog the
hand by winter. The year ends on one of 4 major and 14 minor endings. A run takes 10–15 minutes.

Where things are: the rules and the frozen design, [AGENTS.md](../AGENTS.md); the look,
[design/visual/README.md](design/visual/README.md) with its mockups and shots; decisions,
[decisions.md](decisions.md); round reports, [reports/](reports/) — the latest,
[reports/2026-10-18-r4.md](reports/2026-10-18-r4.md).

## Built

| Area | State |
|---|---|
| Engine | Pure TypeScript reducer, seeded, 21 GameEvents; content-driven cards, gates, two-level endings, awards, managers, the press, lanes, the draft and the events (phase `event`, `CHOOSE_EVENT`); read-only queries for everything the UI shows |
| Content | 42 cards, 8 gates, 4 majors and 14 minors, 7 awards, 2 managers, 3 papers, 9 desk scripts, 15 events in 3 chains; prose keyed in `i18n/en.json`, all of it written |
| Sim | 9 personas, 17 bands, once per manager, with the events reported; `sim:compare` holds a round to the recorded numbers |
| The desk (V1a, V1b) | Stat bar, papers with code-drawn halftone photographs, mirror, props, phone and bubbles, the fanned hand, and its motion. Handoff notes: [handoff/v1a.md](handoff/v1a.md), [handoff/v1b.md](handoff/v1b.md) |
| The hand (R1) | A play holds input only until the card is down (about 0.94 s); its tails play on and the next action completes them. One face order everywhere (name, body, flavour), every number an icon; the paper a play prints in comes forward; popovers rise and fade in one way |
| Screens (R1, R3, R4, `ui/screens/`) | The manager choice (dealt onto the desk since R3), the season cards, the offers, the doors and the last door, the awards night with the year in four front pages, and five panels — the deck, the scrapbook (its Endings and Awards pages, R4), House rules (`ui/settings.ts`), the credits and the numbers (R3). One dim under every overlay, kept between overlays; everything over the desk leaves as one piece (R4). No plain screen is left |
| Events (R2) | A text comes up on the phone, message by message; a letter lands on the desk, typed, with tick boxes. Answering is a step of its own: the reply, their answer or the SENT stamp, the effects landing, then the month opens with the paper that printed it in front. A dev page, `check/events.html`, shows every event and two at the schema's limits for the checks |
| The opening (R3, amended) | The title is one photograph, the whole stage (`ui/screens/Title.tsx`): the singer in a spotlight, drawn once by the photo worker light on ink, the name developing, flashes popping near the edges. BEGIN's white flash brings spring's card over it, dimmed; "Continue" takes it to dark and brings the desk up, its bulbs lighting, the manager cards dealt; signing slides both cards off the stage, the phone glowing once, and drops the month's papers onto the desk (R4); every season card waits for "Continue" (`ui/screens/Season.tsx`). One set of transitions (`ui/motion.ts`, `tr-…` keyframes); the last door puts the bulbs out; PLAY AGAIN fades through ink. The manager's messages come after the deal as the desk's tails and stay till the month ends; the scandals held show on the Deck & Discard button. The build's version (`package.json`) is in the credits |
| Sound (R4, `ui/sound/`) | The author's effects and the room, synthesized in code (`oxsound.js`, a copy validate holds equal to `docs/design/sound/`), played with their beats by `director.ts` — a D7 skip plays none of the skipped beats' sounds; the room under the desk with the season's weather. Holizna's six tracks (CC0 1.0, `public/audio/music/`), one at a time: spring from BEGIN, the scandal track while scandals print, each season's with its card, the night's own. House rules switch Sound effects and Music; `?cues` logs every cue for the checks |

## Next

1. **Now:** the v0.4 zip on itch — the 10/24 playtest build (built outside the repo; see the R4 report).
2. **10/25–31:** polish and a retune, from what the playtest finds. **11/1:** feature freeze.
   **11/2–3:** fixes only, the itch page; submit 11/3 JST (v1.0). Deadline 11/5 04:00 JST — treat 11/4 as the real one.

Cut for the jam: the 27 once-per-run variants; hand-painted illustration and the photo collage (every image is drawn
in code); the year in review as its own phase.

## For the author

- Real Safari and iPad (the author's, C5): the itch embed at 1280×720, fullscreen on — and listen: Safari starts sound
  only from a click, and Playwright's WebKit on Windows has no Web Audio, so the checks never heard it.
- The sound's levels: the music's is one number, `MUSIC_GAIN` (0.25) in `ui/sound/sound.ts`; the effects' and the
  room's are the module's own.
- The module renders its sampled sounds on the main thread after BEGIN: 58 renders in idle callbacks, long tasks of
  83–95 ms among them in Chrome. Real play spends that time on the opening card; a fast clicker may feel a hitch in the
  first seconds. Rendering them in a worker would end it — a change to the module, so the author's call.
- A prose gap: Mags's month-end lines (`monthEnd:guardian`) have 3 variants and come 6.4 times a run; validate asks
  for 4. The 27 once-per-run groups stay cut for the jam.
- The bubbles that went away (R3, C2): not reproduced. The bubbles now keep their own count, which only grows in a
  month, and check:interactions holds it for both managers; if one still goes, the month and the click before it find
  it.
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
?seed=123 replays a run; ?cues logs the sound's cues (window.__cues, window.__music); ?mute keeps the sound off
```

Every command and tool: AGENTS.md §11 and [handoff/v1a.md](handoff/v1a.md#tools). Playwright (dev only) drives
WebKit: `npx playwright install webkit` once on a new machine. To build the itch zip: `npm run build`, then from
`dist/`, `tar -a -cf <outside the repo>/overexposed-v<version>.zip index.html assets audio` (since R4 the music is in
`public/audio/`, which Vite copies into `dist/`).
