# Status

As of 2026-10-26: round R9c is done, and with it v0.9.3 — a release candidate whose zip (`overexposed-v0.9.3.zip`,
built outside the repo from R9c's last game commit) replaces v0.9.2 on itch; v0.9.3 is R9c. R9c, fixes only: the doors
note names the season whose doors the card shows; the deck cell's dot on the small words' x-height; the scrapbook's
clippings 17 apart, so the endings page has the awards page's room on this machine too; fourteen lines from the author
(docs/writing/draft-v15.md); the manager choice's samples without backdrop-filter; the doors card answers hover and
focus as the notes do, each door's row with a tooltip of its outcomes. R9b before it: a new player's first
month opens on its hand, with no offers, and the manager's notes come on that first desk — seven now, the seventh
pointing at the season's two doors, which stand on the mirror on an index card; the stat bar in two rows a cell, the
deck and the settings its cells; every bubble in liquid glass; the buttons tickets with depth; the scandal icon the
scandal card itself; three passes over the words (no dashes, more varied rhythm, American English, dollars); the
scrapbook's two pages with the same room round their contents. R9a before it: Juno at nearly every year's end, the
PRINTED stamp, the scrapbook's page turn and the hovers.
**Read this first; update it at the end of every session** (AGENTS.md → Session rules).

Overexposed is a deck-building career sim for the Game Gauntlet SIM Jam, played in the browser: one year as a young
singer, 12 months in four seasons. Fast hype builds heat, heat crystallises into scandal cards, and scandals clog the
hand by winter. The year ends on one of 4 major and 14 minor endings. A run takes 10–15 minutes.

Where things are: the rules and the frozen design, [AGENTS.md](../AGENTS.md); the look,
[design/visual/README.md](design/visual/README.md) with its mockups and shots; decisions,
[decisions.md](decisions.md); round reports, [reports/](reports/) — the latest,
[reports/2026-10-26-r9c.md](reports/2026-10-26-r9c.md).

## Built

| Area | State |
|---|---|
| Engine | Pure TypeScript reducer, seeded, 21 GameEvents; content-driven cards, gates, two-level endings, awards, managers, the press, lanes, the draft and the events (phase `event`, `CHOOSE_EVENT`; an event may ask for the rival's year and carry a weight, R7; a one-off marked `first` comes before the draw, R9a); read-only queries for everything the UI shows. A new player's run (`skipFirstDraft`, R9b) opens its first month on its hand, without offers. A run starts from its seed and the memory of the last run (R7, `core/memory.ts`): the events it met are drawn only when nothing else is eligible, and every line shown once a run turns to its next variant |
| Content | 42 cards, 8 gates (each with its photograph, R8a), 4 majors and 14 minors (each major with the night's backdrop scene, R8c), 12 awards (each with its trophy and short line, R8c), 2 managers, 3 papers, 9 desk scripts, 28 events in 6 chains (ten texts send a photograph, R8b and R8c; a rival event's replies take Juno's side or not, R8c; her four year-end texts come before the draw, and the carpet has a thread for a run that never met her, R9a); every line shown once a run in two variants; 13 photograph scenes (the room since R8d), 70 of the press's scene overrides, the season cards' scenes (spring's since R8d) and ten faces (R8a; Alex's redrawn, R8d); prose keyed in `i18n/en.json`, all of it written — spring's two openers gone (R8d: spring's card is the opening); since R9b in American English, money in dollars, no dashes in texts, notes, tips or the interface (docs/writing/draft-v14.md) |
| Sim | 9 personas, 17 bands, once per manager, with the events reported — each lane's events by the lane they came in, and the rival's year (R7); `sim:compare` holds a round to the recorded numbers; `sim:memory` plays two runs in a row; `--skip-first-draft` plays a new player's years (R9b) |
| The desk (V1a, V1b, R8a, R8d) | Stat bar, papers with code-drawn halftone photographs, black and white (twelve scenes since R8a: a talk-show set, a recording studio, an arena, a press conference; the street a vox pop; thirteen since R8d, the room, which no paper prints yet), mirror (its notes the ending's name and what it takes, R8a; the goal lines their tooltips, R8b), props, phone and bubbles, the fanned hand, and its motion. R8a: the phone is the texts' phone scaled, lying further back, its lock screen a manager bar for each bubble on screen; the mug and the brush cup redrawn, each standing object with its own contact shadow; the magazine and the script lying with the desk; the manager's face beside their name. R8d: the phone shows its true side, its left, as the desk's perspective has it. R9a: the PRINTED stamp leaves with its issue, fading as the date turns. R9b: the stat bar in two rows a cell — a label with its icon over a big value and its small word — with Deck & discard (cards to draw and played) and Settings its cells; the season's doors on the mirror, an index card; the bubbles in liquid glass; END TURN a ticket; the scandal icon the scandal card itself. Handoff notes: [handoff/v1a.md](handoff/v1a.md), [handoff/v1b.md](handoff/v1b.md) |
| The hand (R1, R7, R8a) | A play holds input only until the card is down (about 0.94 s); its tails play on and the next action completes them. Since R8a a card in the hand has no flavour line but a scandal's: its preview shows it, last. The played card rises out of the fan in front of the hand and goes under it from the first frame it overlaps no card left in it (R7, `ui/desk/flight.ts`; check:motion plays every hand of 1–8 on `check/flight.html`). One face order everywhere (name, body, flavour), every number an icon; the paper a play prints in comes forward; popovers rise and fade in one way |
| Screens (R1, R3, R4, R8a, R8d, `ui/screens/`) | The manager choice (dealt onto the desk since R3; each card with its manager's face, R8a), the season cards (the season's scene light on ink in an oval, R8a — spring's too since R8d — each season in its own muted hue, R8d), the offers, the doors and the last door (each with its photograph, the two always one height, R8a; printed in the scene's ink since R8d), the awards night with the year in four front pages (since R8c: each award with its trophy, the rest of a big year in a box, the major's scene behind it, warm since R8d, Juno's line and last word, PLAY AGAIN in brass), and five panels — the deck, the scrapbook (its Endings and Awards pages, R4; the awards a shelf of twelve, R8c; one size, its page turning with a slide and a sound, R9a), House rules (`ui/settings.ts`; Manager's notes since R8b), the credits (laid out again, R8b) and the numbers (R3). One dim under every overlay, kept between overlays; everything over the desk leaves as one piece (R4). In the scrapbook and on the awards night what the pointer is on lifts a little and catches the light (R9a). Since R9b the buttons are tickets with depth (BEGIN red), the offers' row has no "You have …", the phone's texts are glass on a warm screen, and the scrapbook's two pages have the same room round their contents. No plain screen is left |
| Events (R2, R8a, R8b) | A text comes up on the phone, message by message, its sender's face in the header (R8a); some send a photograph, one more message in its place (R8b: the author's seven drawings, `ui/photos.ts`, a chunk of its own); a letter lands on the desk, typed, with tick boxes (no "Hello," paragraph of its own since R8a). Answering is a step of its own: the reply, their answer or the SENT stamp, the effects landing, then the month opens with the paper that printed it in front. A dev page, `check/events.html`, shows every event and two at the schema's limits for the checks |
| The opening (R3, amended) | The title is one photograph, the whole stage (`ui/screens/Title.tsx`): the singer in a spotlight, drawn once by the photo worker light on ink (in oxblood and amber since R8d, the flashes cool; its cameras without glints), the name developing, flashes popping near the edges. BEGIN's white flash brings spring's card over it, dimmed, with spring's oval since R8d (the room; drawn first by the warm-up, only looked up by the card, faded in if it comes after it); "Continue" takes it to dark and brings the desk up, its bulbs lighting, the manager cards dealt; signing slides both cards off the stage, the phone glowing once, and drops the month's papers onto the desk (R4); every season card waits for "Continue" (`ui/screens/Season.tsx`). One set of transitions (`ui/motion.ts`, `tr-…` keyframes); the last door puts the bulbs out; PLAY AGAIN fades through ink. The manager's messages come after the deal, one by one whatever the player does (R7), and stay till the month ends; the scandals held show on the Deck & Discard button. The build's version (`package.json`) is in the credits |
| The manager's notes (R8b, `ui/screens/Notes.tsx`) | Seven notes in the manager's hand for a new player's first year — the stat bar and the bulbs on the first desk (R9b: a new player's March has no offers), the countdown, the season's doors (R9b), END TURN, the mirror, a Scandal — each once, at its moment, one at a time and never in the way (a preview over one fades it, a panel hides it, a click puts it away); the first time each ever shows, a veil and the target's glow. House rules' "Manager's notes" switches them, and turns itself off once all seven have come. A run with `?seed=` shows none unless `?notes=1`; `npm run check:notes` plays them by real input |
| Sound (R4, R5, R6, `ui/sound/`) | The author's effects, synthesized in code (`oxsound.js`, module v6, a copy validate holds equal to `docs/design/sound/`; its sampled sounds rendered in a worker after BEGIN), played with their beats by `director.ts` — a D7 skip plays none of the skipped beats' sounds. No ambience since R6. Holizna's six tracks (CC0 1.0, `public/audio/music/`), one at a time: spring from BEGIN, the scandal track while scandals print, each season's with its card, the night's own. House rules switch Sound effects and Music; `?cues` logs every cue for the checks |

## Next

1. **Now:** v0.9.3 on itch (R9c; the zip is built outside the repo from R9c's last game commit — see the R9c
   report), and the playtest it is for.
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
- The events' tuning (R7, C3; every number in decisions.md). Since R9a juno_credit is exempt from the reply cap (only
  comeback meets it, one persona deciding it all one way) and dealseeker's Breakthrough is inside its band on every seed
  (the label deal's heat); sam_rent/c, producer_room/a and casting_arc/a stay red, as R4 left them; mum_sunday's a
  keeps heat −4, since −3 makes mum_sunday/b one-sided.
- R8a's and R8d's pictures want a look on a real screen: the colours (the title, the four season ovals, the four
  backdrops, the eight doors; docs/design/visual/ref/r8d-colour.png is the reference), the faces at 22 px beside the
  bubbles and Alex's at 40 in his text, the phone's left side on the desk, the new mug and brush cup.
- R9c wants the author's screen: the manager choice's samples (the seam this machine's GPU never showed), the
  scrapbook's endings page beside the awards page, and the doors card's tooltips by mouse, keyboard and a long-press.
- R9b wants a real screen: the glass bubbles (backdrop-filter; Safari takes the -webkit- one), the tickets' depth,
  the stat bar's labels at phone size (4.6 px on an 844×390 screen), and a new player's first month — notes on, no
  offers in March, the doors note after the first play. The words want a read in place: dollars, Mom and Grandma.
- R9a wants a mouse on a real screen: the hovers in the scrapbook and on the awards night (pointer devices only), and
  the scrapbook's page turn with its sound; and a run that never answers Juno, to read the carpet's first contact in
  December.
- The bubbles that went away (R3, C2): not reproduced. The bubbles now keep their own count, which only grows in a
  month, and check:interactions holds it for both managers; if one still goes, the month and the click before it find
  it.
- The manager's notes (R8b) want a first-time player: does each come where it helps, does one ever sit where the
  player wants to look, and the "hold" lines on a phone or an iPad. To see them again: House rules → Manager's notes,
  on (the first-time highlight does not come back).
- Playtest: does Dex's extra card compete with Mags's calm; does the stat bar read at a glance; do players start a
  second run unprompted; time a first run against 10–15 minutes.

## Acceptance

Every round: build, typecheck, validate, `check:queue`, `check:preview` (60 runs), `check:clicks` and
`check:overflow` in Chromium at 1280×720 and 844×390; `sim:compare` when content or rules change. A release
candidate: the same in Chromium, Firefox and WebKit at 1280×720, 800×450 and 844×390, with `check:preview --
--runs=300`, `check:motion`, `check:overflow:full`, `check:interactions`, and since R8b `check:notes` (1280×720 and
844×390). No timing evidence, recordings or evidence folders; one
Chinese report per round in `docs/reports/` (AGENTS.md §8).

## Commands

```
npm run dev | build | typecheck | validate
npm run check:queue | check:preview | check:clicks | check:overflow
node check/clicks.ts --browsers=chrome --sizes=1280x720,844x390m     # the every-round narrowing (also overflow)
npm run check:preview -- --runs=300; npm run check:motion; npm run check:overflow:full   # release candidates
npm run check:notes; node check/notes.ts --years                     # the manager's notes; two unseeded years
npm run sim -- --seed=20260929                                       # and sim:awards, sim:tiers, sim:managers, sim:memory
npm run sim:baseline -- --out=sim/out/<name>; npm run sim:compare -- <a> <b>
?seed=123 replays a run (and neither reads nor writes the memory of runs; shows no manager's notes unless ?notes=1); ?cues logs the sound's cues (window.__cues, window.__music); ?mute keeps the sound off
```

Every command and tool: AGENTS.md §11 and [handoff/v1a.md](handoff/v1a.md#tools). Playwright (dev only) drives
WebKit: `npx playwright install webkit` once on a new machine. To build the itch zip: `npm run build`, then from
`dist/`, `tar -a -cf <outside the repo>/overexposed-v<version>.zip index.html assets audio` (since R4 the music is in
`public/audio/`, which Vite copies into `dist/`).
