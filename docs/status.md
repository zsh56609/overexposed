# Status

As of 2026-10-20: round R8a, pictures and fewer words on screen, is done — R7b's newspaper photographs merged in (four
new scenes, the street redrawn, which stories print which), faces for the people who text and for the managers, the
phone and the standing objects on the desk redrawn, a photograph on every door and on the season cards, and three
trims of the text on screen. It has no build of its own: v0.8 is R8b's, and v0.7 (R7) stays on itch until then.
**Read this first; update it at the end of every session** (AGENTS.md → Session rules).

Overexposed is a deck-building career sim for the Game Gauntlet SIM Jam, played in the browser: one year as a young
singer, 12 months in four seasons. Fast hype builds heat, heat crystallises into scandal cards, and scandals clog the
hand by winter. The year ends on one of 4 major and 14 minor endings. A run takes 10–15 minutes.

Where things are: the rules and the frozen design, [AGENTS.md](../AGENTS.md); the look,
[design/visual/README.md](design/visual/README.md) with its mockups and shots; decisions,
[decisions.md](decisions.md); round reports, [reports/](reports/) — the latest,
[reports/2026-10-20-r8a.md](reports/2026-10-20-r8a.md).

## Built

| Area | State |
|---|---|
| Engine | Pure TypeScript reducer, seeded, 21 GameEvents; content-driven cards, gates, two-level endings, awards, managers, the press, lanes, the draft and the events (phase `event`, `CHOOSE_EVENT`; an event may ask for the rival's year and carry a weight, R7); read-only queries for everything the UI shows. A run starts from its seed and the memory of the last run (R7, `core/memory.ts`): the events it met are drawn only when nothing else is eligible, and every line shown once a run turns to its next variant |
| Content | 42 cards, 8 gates (each with its photograph, R8a), 4 majors and 14 minors, 7 awards, 2 managers, 3 papers, 9 desk scripts, 28 events in 6 chains; every line shown once a run in two variants; 12 photograph scenes, 70 of the press's scene overrides, the season cards' scenes and ten faces (R8a); prose keyed in `i18n/en.json`, all of it written |
| Sim | 9 personas, 17 bands, once per manager, with the events reported — each lane's events by the lane they came in, and the rival's year (R7); `sim:compare` holds a round to the recorded numbers; `sim:memory` plays two runs in a row |
| The desk (V1a, V1b, R8a) | Stat bar, papers with code-drawn halftone photographs (twelve scenes since R8a: a talk-show set, a recording studio, an arena, a press conference; the street a vox pop), mirror (its notes the ending's name and what it takes, R8a), props, phone and bubbles, the fanned hand, and its motion. R8a: the phone is the texts' phone scaled, lying further back, its lock screen a manager bar for each bubble on screen; the mug and the brush cup redrawn, each standing object with its own contact shadow; the magazine and the script lying with the desk; the manager's face beside their name. Handoff notes: [handoff/v1a.md](handoff/v1a.md), [handoff/v1b.md](handoff/v1b.md) |
| The hand (R1, R7, R8a) | A play holds input only until the card is down (about 0.94 s); its tails play on and the next action completes them. Since R8a a card in the hand has no flavour line but a scandal's: its preview shows it, last. The played card rises out of the fan in front of the hand and goes under it from the first frame it overlaps no card left in it (R7, `ui/desk/flight.ts`; check:motion plays every hand of 1–8 on `check/flight.html`). One face order everywhere (name, body, flavour), every number an icon; the paper a play prints in comes forward; popovers rise and fade in one way |
| Screens (R1, R3, R4, R8a, `ui/screens/`) | The manager choice (dealt onto the desk since R3; each card with its manager's face, R8a), the season cards (after spring, the season's scene light on ink in an oval, R8a), the offers, the doors and the last door (each with its photograph, the two always one height, R8a), the awards night with the year in four front pages, and five panels — the deck, the scrapbook (its Endings and Awards pages, R4), House rules (`ui/settings.ts`), the credits and the numbers (R3). One dim under every overlay, kept between overlays; everything over the desk leaves as one piece (R4). No plain screen is left |
| Events (R2, R8a) | A text comes up on the phone, message by message, its sender's face in the header (R8a); a letter lands on the desk, typed, with tick boxes (no "Hello," paragraph of its own since R8a). Answering is a step of its own: the reply, their answer or the SENT stamp, the effects landing, then the month opens with the paper that printed it in front. A dev page, `check/events.html`, shows every event and two at the schema's limits for the checks |
| The opening (R3, amended) | The title is one photograph, the whole stage (`ui/screens/Title.tsx`): the singer in a spotlight, drawn once by the photo worker light on ink, the name developing, flashes popping near the edges. BEGIN's white flash brings spring's card over it, dimmed; "Continue" takes it to dark and brings the desk up, its bulbs lighting, the manager cards dealt; signing slides both cards off the stage, the phone glowing once, and drops the month's papers onto the desk (R4); every season card waits for "Continue" (`ui/screens/Season.tsx`). One set of transitions (`ui/motion.ts`, `tr-…` keyframes); the last door puts the bulbs out; PLAY AGAIN fades through ink. The manager's messages come after the deal, one by one whatever the player does (R7), and stay till the month ends; the scandals held show on the Deck & Discard button. The build's version (`package.json`) is in the credits |
| Sound (R4, R5, R6, `ui/sound/`) | The author's effects, synthesized in code (`oxsound.js`, module v6, a copy validate holds equal to `docs/design/sound/`; its sampled sounds rendered in a worker after BEGIN), played with their beats by `director.ts` — a D7 skip plays none of the skipped beats' sounds. No ambience since R6. Holizna's six tracks (CC0 1.0, `public/audio/music/`), one at a time: spring from BEGIN, the scandal track while scandals print, each season's with its card, the night's own. House rules switch Sound effects and Music; `?cues` logs every cue for the checks |

## Next

1. **Now:** R8b — v0.8 (it uses the majors' goal lines the mirror's notes no longer show). v0.7 stays on itch until
   then (built outside the repo; see the R7 report).
2. **10/25–31:** polish and a retune, from what the playtest finds. **11/1:** feature freeze.
   **11/2–3:** fixes only, the itch page; submit 11/3 JST (v1.0). Deadline 11/5 04:00 JST — treat 11/4 as the real one.

Cut for the jam: hand-painted illustration and the photo collage (every image is drawn in code); the year in review
as its own phase.

## For the author

- Real Safari and iPad (the author's, C5): the itch embed at 1280×720, fullscreen on — and listen: Safari starts sound
  only from a click, and Playwright's WebKit on Windows has no Web Audio, so the checks never heard it.
- The sound's levels: the music's is one number, `MUSIC_GAIN` (0.25) in `ui/sound/sound.ts`; the effects' are the
  module's own. No ambience since R6.
- The module (v6) renders its sampled sounds in a worker after BEGIN, 5–6 s, while the opening card is read and a
  manager chosen; a sound played before the worker has delivered it renders on first use, on the main thread. The
  checks that replay a run reach the desk within milliseconds of BEGIN, so they load it muted (`?mute`).
- Mags's month-end lines (`monthEnd:guardian`): R5's B1 stops the manager's month end at the event that opens the
  next month, so they come only after real relief, 2.55 times a run, within their 3 variants.
- The events' tuning (R7, C3; every number in decisions.md). Two sim results stay outside their bands, and the
  author accepts both as they stand (R8a): juno_credit/a (91–95 % of greedy appearances) is one-sided as R4's three
  are, only comeback meeting it; under Mags, dealseeker's Breakthrough is 70.4 % and 70.2 % on two of three seeds
  (band ≤ 70 %), and mum_sunday's a keeps heat −4, since −3 makes mum_sunday/b one-sided.
- Spring's opener (both variants) is never shown — spring's card is the opening (R3); it stays in content until R9
  decides.
- R8a's pictures want a look on a real screen: the doors' ovals and the season cards' (drawn at the screen's own
  pixels), the faces at 22 px beside the bubbles, the phone lying back on the desk, the new mug and brush cup.
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
npm run sim -- --seed=20260929                                       # and sim:awards, sim:tiers, sim:managers, sim:memory
npm run sim:baseline -- --out=sim/out/<name>; npm run sim:compare -- <a> <b>
?seed=123 replays a run (and neither reads nor writes the memory of runs); ?cues logs the sound's cues (window.__cues, window.__music); ?mute keeps the sound off
```

Every command and tool: AGENTS.md §11 and [handoff/v1a.md](handoff/v1a.md#tools). Playwright (dev only) drives
WebKit: `npx playwright install webkit` once on a new machine. To build the itch zip: `npm run build`, then from
`dist/`, `tar -a -cf <outside the repo>/overexposed-v<version>.zip index.html assets audio` (since R4 the music is in
`public/audio/`, which Vite copies into `dist/`).
