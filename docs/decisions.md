# Decisions

Design decisions, dated, newest first. A design decision made in
conversation is written here in the same session (AGENTS.md → Session
rules).

---

## 2026-10-19 — Round R7, Part F: v0.7

- `package.json` is 0.7.0; the credits' foot reads "Made for the Game
  Gauntlet SIM Jam · v0.7". The itch zip, `overexposed-v0.7.zip`, replaces
  v0.6: built from a clean export of the round's last source commit, packed
  as in R6 (`index.html assets audio`).
- AGENTS.md: §0 rule 4 ends "…replays exactly from its seed and the memory
  it started with"; §7's version list gains "R7 v0.7"; "Cut for the jam"
  loses the 27 once-per-run variants. status.md drops them from its cut
  list too.
- The acceptance is AGENTS.md §8's for a release candidate, with
  check:interactions in the same nine configurations, and sim:compare
  against the R6 baseline (content and rules changed; the tuning is in the
  round's report).

## 2026-10-19 — Round R7, Part E: the next run remembers the last

- **E1, what the browser keeps** (`ui/memory.ts`, beside the collections,
  with their try/catch guards but no session copy — where storage is
  missing or refuses, a run has no memory): the events of the run being
  played, each written as it is offered, so a run left or reloaded still
  counts; the events of the latest earlier run that met any (a run that met
  none changes nothing); and for each group shown once a run, the variant
  last shown, written as it is shown — the opening card, a season's card,
  the doors, the ending. It is read and written outside React's state
  initialisers and updaters: the page's first run is made as App loads,
  PLAY AGAIN's in its handler, the writes in effects.
- **E2, an input to the run**: `createInitialState(seed, content, { memory
  })` keeps it in GameState (`memory`, with the ids and variants content no
  longer has left out), so a replay with the same seed and memory plays the
  same; with none a run plays exactly as before (sim:compare: 18 files
  identical). A run loaded with ?seed= neither reads nor writes it. A run
  that fails logs its seed and memory as JSON to the console.
- **E3**: the draw's pool first leaves out the events the last run met,
  falling back to the whole pool only when nothing else is eligible; a
  follow-up is never held back.
- **E4**: a run settles its once-a-run lines as it starts (`onceLines`):
  for each group the variant after the one last shown, else the seed's own
  choice; the screens, the previews and a replay read them from the state.
- **E5**, `npm run sim:memory`: two runs in a row per persona, the second
  on a new seed. Without memory the second meets about 2 of its 6 events
  again and reads about 6 of its 13 once-a-run lines in the same variant;
  with the first's memory, 0.01–0.09 events (crafter 0.6, artisan 0.3)
  and no line.

## 2026-10-19 — Round R7, Part D: the second variants

- The 27 line groups shown once a run get their second variant (`.2`, draft
  v10): the opening, the four season openers, the eight doors' flavour and
  the fourteen minor endings' text. Validate's 27 variant warnings go;
  sim:variants finds no group short. check:overflow sets every group to its
  longest, so the longer second variants are held to fit.
- Spring's opener is never shown: since round R3 spring's card is the
  opening, which shows the opening's paragraphs. Its keys stay in content
  (both variants), unread.

## 2026-10-19 — Round R7, Part C: the events

- **C1, three new chains.** mum_sunday opens chain home (months 2–8): "I'll
  be there." sets went_home, "Can't this week." sets missed_dinner.
  producer_room opens chain lio (months 2–8; its a sets lio_session);
  photographer opens chain lens (months 3–8; its a sets tipped_off).
  juno_hello's weight is 3, keeping about its R6 share now that six openers
  compete for two chains (41 % → 44.5 % of player-like runs, seed
  20260929). juno_soundalike's "Call it out." sets juno_feud, and no
  month-12 Juno event comes after it. maxChains stays 2. Each new flag has
  its two labels.
- **C2, thirteen events** (draft v10): the chains' follow-ups mum_gran,
  mum_quiet, lio_track, photographer_again; Juno's one-offs juno_interview
  (months 6–8, between juno_hello and its follow-up) and the four month-12
  events, each in one rival's year (when.rival) at weight 3 — a run meets
  at most one; the lanes' one-offs director_read and guest_judge (screen),
  reality_show and fake_ad (celebrity), the letters from houses.
- **C3, tuned with the sim** on the three batch seeds under both managers,
  new events first. Changed from the author's starting numbers:
  photographer_again a needs and costs £5,000 (was £3,000), c heat +4 (+2);
  director_read a craft +2, hype +2 (+3, +3); juno_shortlist a hype +1
  (+2), b heat +2 (+3); mum_gran a hype +1, heat −1 (+2, −2); guest_judge
  a hype +1 (+3), b hype +4 (+6); lio_track b hype +1 (+2), c hype +1
  (+3); fake_ad c hype +1, heat +2 (+3, +1); reality_show a hype +3 (+4),
  b hype +1 (+2); juno_carpet b hype +2 (+3). Existing events, each by one
  or two: mum_sunday a heat −4 (−3), so that going home is a real choice
  now that it sets a flag; sam_interview c hype +1 (+2) and casting_arc a
  hype +1 (+2), for the band below.
- What still fails, and why. **juno_credit/a** (91–95 % of greedy
  appearances): only comeback meets it, and its two modes decide it — in
  its clean-up mode it always takes the money, in its spike mode the
  credit; nothing in the state at month 10 changes that comparison, so no
  setting of the event's own numbers within two moves the share. Under
  Mags, **dealseeker's Breakthrough** is 70.4 % and 70.2 % on two of the
  three seeds (band ≤ 70 %; 67.7 % on the third, 64–69 % under Dex): the
  C1 chains alone, at the starting numbers, put it at 69.5/72.5/70.6 % —
  the home and lio chains take the two chain slots early, so the heavy ex
  and sam chains come less (ex_feature 27 % → 7 % of runs) and a dealseeker
  year is cleaner — and with mum_sunday at −4 it goes home when its heat is
  4 or more. With mum_sunday at −3 instead, dealseeker passes everywhere
  but mum_sunday/b is taken in 91–93 % of greedy appearances. The round
  keeps −4: the smaller miss.
- The sim report gains two tables: each lane's events by the established
  lane when they came, and per rival arc the share of its runs that meet an
  event of its year. check/desk-states.json is recorded again; the pile
  case for an opportunity moves to card:streaming_role, celebFamous no
  longer holding one.

## 2026-10-19 — Round R7, Part B: what an event can ask

- **B1, the rival's year**: `when.rival` lists the rival arcs an event may
  come in (ids from press.rival.arcs). A run's arc is `rivalArc(content,
  seed)`, fixed when it starts, so the condition is a pure read; rivalArc
  moves to core/rival.ts (press.ts re-exports it) so the events can read it
  without an import cycle. Validate holds the ids.
- **B2, a weight**: `when.weight`, a whole number from 1 to 5 (default 1),
  multiplies an event's weight in the draw together with the lane's.
- **B3**: the event budget is 28; docs/content-schema.md documents both
  fields. "↺ remembered" keeps its rule.

## 2026-10-19 — Round R7, Part A: from playing v0.6

- **A1, a played card never jumps behind the hand.** Its face flew in
  `.motion-flight` (z-index 85, above the hand's 35) until the flight
  ended, then lay in the pile (26), under the hand — on that frame jumping
  from in front of the cards still in the hand to behind them. At the end
  of the hold (0.29 s) the lifted card is only 50 px up and the cards left
  in the hand re-fan under it, so in every hand of two or more it overlaps
  them there; to be clear of them by then it would have to rise about
  270–290 px. Asked, the author chose: the lift and the hold stay as they
  are; in the carry the card rises out of the fan in front of it, and from
  the first frame it overlaps no card left in the hand it goes under the
  hand and the season's dim (z-index 31, above the bubbles' 30) and lands
  there. Where the plain path would overlap the fan all the way down to its
  slot (hands of five or more), the middle of the carry is raised, by as
  little as clears the fan (68–136 px in the pile's plane), so the card
  clears it first and comes down behind it. `ui/desk/flight.ts` plans each
  flight from the fan and the desk's perspective (a hovered card counted
  too, 4 px to spare, clear for 60 ms); `Motion.tsx` animates the plan, the
  layer changing once, by the flight container's own z-index keyframes.
  Timings, the paper coming forward, the tails, reduced motion's crossfade
  and skipping stay as they were. check:motion plays every flight — hands
  of 1 up to desk-states' bigHand, every place, every pile slot — on a dev
  page with the game's own desk (`check/flight.html`), in Chromium at
  1280×720, and holds that the layer changes on no frame where the face
  overlaps a card and that, once under, it is never in front of one again;
  the frames rising out in front after the hold are reported.
- **A2, the credits read as credits.** One row per credit, the role (a deck
  section's head) beside the name (11.5px), the links after their name: who
  made the game, the music, the typefaces, the art and sound, the AI
  assistance. A name may wrap to a second line; nothing else in a row does
  (check:overflow holds it). A foot gives the jam and the version after a
  middle dot. The copyright notices and the URLs leave the panel: the font
  licence it links to (`ui/fonts/OFL.txt`, still imported, so it ships)
  carries both fonts' notices. CREDITS.md and the itch page keep the
  detail, the six track titles included.
- **A3**: Sam's interview's "No comment." adds Everyone's Running It
  (`copycat_story`), not The Breakup Story: Sam's story is not a split.
  Data only; its words stay.
- **A4, the manager's bubbles always come one by one.** The next action
  used to complete them (Bubbles' onTails): a card played while a month's
  four bubbles were coming brought the rest in one frame. Now the first
  comes once the desk is still, and the rest keep their pace (0.38 s) from
  it whatever the player does: an action, a card's flight and the month's
  end never bring them at once. They hold no input. A month that ends
  (END TURN) before they have all come shows no more of them. Reduced
  motion keeps its all-at-once with a single buzz. check:motion's arrival
  case is the author's: a month with four bubbles, a card played 0.3 s
  after the desk is still.

## 2026-10-18 — Round R6, Part B: v0.6

- `package.json` is 0.6.0; the credits read "v0.6". The itch zip,
  `overexposed-v0.6.zip`, replaces v0.5: built from a clean export of the
  round's last source commit, packed as in R5 (`index.html assets audio`).
- AGENTS.md: only §7's version list changes, gaining "R6 v0.6"; §10's
  disclosure stays as it is.
- The acceptance is AGENTS.md §8's for a release candidate, with
  check:interactions in the same nine configurations. No content or rule
  changed, so no sim:compare.

## 2026-10-18 — Round R6, Part A: no ambience

- **A1**: playing v0.5, the author found that the room's tone and the
  season's weather (rain in spring, wind in autumn and winter; R4, B3) read
  as hum on ordinary speakers rather than as a room, and the music already
  carries the mood. The game starts no ambience: `ambience()` and `WEATHER`
  are gone from `ui/sound/sound.ts`, and so is the 'amb' bus's volume in
  `apply()`; App no longer calls it, and the room's season (`roomSeason`)
  went with it. The module stays exactly as the author's (validate holds the
  copy equal); its ambience API is simply unused. The weather stays where
  it is seen, in the Flash's ear. House rules' Sound effects covers the
  effects alone: its line is the author's "Cards, papers and the phone."
  `MUSIC_GAIN` stays 0.25; its comment no longer measures the music
  against the room.
- **A2**: the words around it say what is left — the sound layer's header
  and comments, `ui/settings.ts`, House rules' comment, the visual README
  §10 (which also said R3's flight to Deck & Discard for the sweep, R2's
  slide again since R5), CREDITS.md and status.md. The replays stay muted;
  `openReady`'s reason now names what a replay still renders on the main
  thread before the worker has delivered: the first sampled sounds (the
  offers' deals, a door, a letter), short since the room went — three
  replays with the sound on showed no task over 50 ms after BEGIN — and
  BEGIN's own audio context, 55–90 ms here, seconds where a headless Chrome
  is slow to open its audio.
- **A3**: no check expects an ambience; check:clicks plays with the sound
  on, with no console error.

## 2026-10-18 — Round R5, Part C: v0.5

- `package.json` is 0.5.0; the credits read "v0.5". The itch zip,
  `overexposed-v0.5.zip`, replaces v0.4: built from a clean export of the
  round's last source commit, packed as in R4 (`index.html assets audio`).
- AGENTS.md: only §7's version list changes, gaining "R5 v0.5".
- The acceptance is AGENTS.md §8's for a release candidate, with
  check:interactions in the same nine configurations (B2 and B3 check
  there), A3's worker probe once on the production build (dist/ served,
  Chromium), and sim:compare against R4's baseline (`sim/out/r4-v04`):
  every file identical.
- Found in the acceptance: check:interactions' door hover read 0 % once in
  WebKit at 1280×720. An animation's time moves on only at a frame, and
  headless WebKit's come about 70 ms apart here, so a read 60 ms after the
  hover can fall before the next frame and see the transition at its
  start. The mid read now waits for the next frame after the 60 ms (one
  frame later: about 16 ms in Chromium and Firefox).
- B8 came in during the acceptance; the acceptance ran again from the
  start on the code with it.

## 2026-10-18 — Round R5, Part B: fixes from playing and checking v0.4

- **B1, the manager's month end where it does nothing.** `monthEndEffects`
  stopped at turnStart, draftOffer, gateOffer or ending, but not at
  eventOffered: at the ends of months 1, 5, 7 and 11, whose next month opens
  on an event, it returned [eventOffered], which counted as an effect. The
  END TURN preview showed the perk row with no value for either manager
  (Dex has no month-end perk at all), and Mags got a month-end line there:
  of 1,300 lines over runSeeds(20260929, 200) with the random persona, 777
  followed an eventOffered. Now a month end's manager effects stop at the
  first of turnStart, draftOffer, eventOffered, gateOffer and ending, one
  list (`MONTH_END_STOPS`) beside `monthEndEffects` in core/manager.ts.
  The perk's effects are untouched: endings, awards and tiers do not move.
  check:preview gains an oracle with its own literal list, which neither
  calls `monthEndEffects` nor imports the list: the END TURN preview's perk
  row and a month-end line appear exactly when the manager has a month-end
  perk, the month is one it acts in (when it names them), and the span
  after turnEnd holds a non-warning event. On the engine before the fix it
  reports 330 mismatches in 20 runs; after it, none. sim:variants moved
  only monthEnd:guardian (6.41 to 2.55 a run, at most 3), and validate's
  warnings fell to 27, all the cut once-per-run variants. No new prose.
- **B2, TAKEN leaves with its card.** The stamp is the `.lift`'s sibling in
  the offer's slot, so the flight (`flyToDeck`) left it alone on the empty
  slot, from about 0.6 to 1.0 s after the press. The flight now carries a
  copy of it, in the same place and at the same angle on the face, and the
  slot's is hidden; the flight also starts at the size the offers show the
  card (1.1×), where R4's copy started at its own size. Reduced motion and
  off are unchanged: no flight, the screen leaves whole. check:interactions,
  where it takes an offer at full motion: 200 ms into the flight (760 ms
  after the press), no stamp on the slot and one in the flight.
- **B3, the phone shakes.** `buzz` composed `${own} translateX(3px)` with the
  phone's computed transform, 'none': 'none translateX(3px)' is invalid
  CSS, and the browser dropped the keyframe — the shake V1b gave an incoming
  message never moved. One helper, `composeTransforms` (ui/motion.ts), in
  which 'none' adds nothing, now composes every keyframe built on a computed
  transform: the phone's shake, the hand dropping at END TURN, B4's sweep.
  check:motion and check:interactions wrap Element.prototype.animate after
  every load (`watchKeyframes`, check/desk-replay.ts) and fail on any
  keyframe value CSS.supports rejects under its property's CSS name
  (offset, easing and composite left out), naming the element and the
  value; the record lives in the tab's sessionStorage across loads.
- **B4, the month's pile leaves to the right.** R3's D1 sent every card of
  the pile, and every new scandal card, to the Deck & Discard button,
  shrinking to 0.3: on the desk it read as the cards scattering into the
  room. The sweep is R2's again (512f6c4): each card's face slides right
  along the desk, translate(260px, 20px), and fades, 550 ms, 80 ms apart;
  no shrink, no flight. The held chip still ticks +1 as each scandal card's
  slide ends; the sweep keeps its one deal sound. Reduced motion and off are
  unchanged. The offer taken still flies to Deck & Discard: one new card
  going into the deck.
- **B5, PLAY AGAIN as wide as the paper above it**: it was sized by its text,
  233.6 px under a 226 px front page. It now takes the front pages' width
  (`--fp-width`), both edges on the last page's, its words centred (as much
  leading space as the letter-spacing trails). check:overflow, in its
  awards-night states (runs and replays): both edges within 1 px.
- **B6, no change** (the author's question, decided): the scrapbook's
  awards stay visible when not won. Endings hide what has not been found
  because an ending's name gives its story away. An award is a goal: its
  name and how it is won give the next run a target, and show what the game
  counts (hype in a month, craft at the year's end, scandals held).
- **B7, the notes say scandals the doors' way**: the mark, the scandal icon
  and the threshold, "6+" and "5 or fewer" (`ui.doors.min`,
  `ui.doors.max`); `goals.note.scandalsMin` and `goals.note.scandalsMax`
  go. The notes' colours stay as they are, on purpose: the icons carry the
  stat's colour and ✓/✗ the met state, while the words stay in ink. A door
  colours its threshold on a large pale card; a note's words are 7.8 px on
  four pastels, where the hype gold would read at 3.5–4.4:1 and the scandal
  red at 3.7–4.8:1, against 10.5:1 and more in ink.
- **B8, nothing behind a screen is ever the page's cream.** html, body and
  the stage took `--page` (#f4f1ea), which showed wherever nothing covered
  the stage: the first paint, before the app mounts, and the awards night,
  which fades in from opacity 0 over the stage and so came out of cream.
  The page and the stage are ink (#15120e) now, and `--page` is gone;
  index.html carries the ink inline, so it holds before the stylesheet
  loads. desk:shots (every recorded state and a run's screens, 55 shots)
  and desk:compare (13), before and after, pixel by pixel: no pixel of the
  old cream changed anywhere, so nothing relied on it, and nothing needed
  a background of its own. The title's photograph is requested as the app
  starts (`titlePhoto()` takes its size from the window, which the stage
  fits), no longer in the title's effect after mount, and the desk
  photos' warm-up waits until it is drawn; the spotlight's 0.6 s arrival
  and the name's develop are unchanged. Measured from navigation in
  Chromium at 1280×720, the built game served locally, the median of three
  runs (this machine draws fast; the author's saw the name at 0.9 s): v0.4
  painted cream at 25 ms, the name at 224 ms, the photograph from 342 ms,
  settled by 871 ms; now every frame before the title is ink, and the
  first not dark is the title with its name, at 210 ms; the photograph
  from 307 ms, settled by 824 ms. From the last door: v0.4 showed one or
  two cream frames after the dark (about 2.12 s) and the night faded in
  out of them; now the dark runs into the night, which lights up out of
  it.

## 2026-10-18 — Round R5, Part A: the sound module, version 6

- **A1**: the author's module v6 (SHA-256 c1777be8…) is copied to
  `ui/sound/oxsound.js` with the one added line `export { OXSound };`, as
  in R4; validate's check of the copy holds as it is. v6 renders the
  sampled sounds in a worker built from its own generators (a Blob URL),
  builds the theatre's reverb once prepare() is done or first needed, and
  has no CommonJS line: the build's COMMONJS_VARIABLE_IN_ESM warning is
  gone (R4's note on it is marked superseded).
- **A2**: the replays keep their mute (`openReady`), for the right reason:
  a replay reaches the desk within milliseconds of BEGIN, before the worker
  has delivered the samples, so its first sounds render on the main thread
  (on v6 the rain loop at Continue gives a 300–380 ms task). Corrected in
  `ui/sound/sound.ts`, `openReady`, `oxsound.d.ts` and status.md; R4's
  decision keeps its text with a note.
- **A3**: the worker never fails silently. check:clicks, which plays as a
  player does, wraps `window.Worker` before BEGIN and counts the workers
  made from a blob: URL (the photo workers are files): where the page has
  an AudioContext, within 15 s of BEGIN one is made, answers every message
  it is sent and is terminated; where it has none (Playwright's WebKit on
  Windows), none is made. The dev server neither bundles nor minifies the
  module, which builds the worker's source from its own functions' text,
  so the same probe runs once on the production build (Part C).

## 2026-10-18 — Round R4, Part D: v0.4, the playtest build

- `package.json` is 0.4.0; the credits read "v0.4". The itch zip,
  `overexposed-v0.4.zip`, is built from a clean export of the round's last
  commit and holds `index.html`, `assets` and `audio` — the six tracks as
  the author gave them.
- AGENTS.md: §7 puts R4 before the 10/24 playtest build, which it makes
  (v0.4), and the versions gain v0.4; §10's disclosure names the sound
  (effects synthesized in code with AI assistance, no audio-generation
  models) and the music (Holizna, CC0 1.0). To stay under 24 KiB it drops
  its stale "started late" line and two historical notes (the sim built in
  week one; how the content budget was raised).
- check:interactions' hover-ease samples now read the style once the mouse
  is over the element, then wait: headless WebKit takes a hover in at its
  next style update, about 70 ms apart here, and its door and offer hovers
  sampled at 0 % though they ease (a per-frame probe: 29 ms 9 %, 101 ms
  58 %, 173 ms 87 %, 317 ms all the way).
- The module's own CommonJS guard (`typeof module !== 'undefined'`) draws
  one build warning, COMMONJS_VARIABLE_IN_ESM; it is harmless in the
  browser and the copy is never edited. *(Superseded in R5, Part A: module
  v6 has no CommonJS line, and the build no warning.)*
- Found in the acceptance, and fixed:
  - A3d's old stack of papers stayed 0.52 s after a D7 skip; a skip must land
    the settled desk at once. `Papers` takes the queue's skip count: a skip
    ends the drop, or never starts it. The drop is one of the desk's tails
    too: it holds no input, and the next action lands it first — a season
    card's Continue can be clicked 0.2 s after the papers start to drop.
    check:motion's settled layouts wait for it (`.news.dropping`), as they
    wait for the bubbles' arrival.
  - Safari lets a media element play without a click only once it has played
    from one, and the second music player's first track comes at a season
    change. Both players play an empty sound (a data URI, no request) from
    BEGIN's click.
  - check:motion's cases at the last door compare the awards night across
    passes, and A7's "New" shows only the first time: each pass now starts
    from no awards collected.
  - After BEGIN the module renders its sampled sounds in idle callbacks on
    the main thread — 58 renders, three of each sampled sound and the rain;
    Chrome measured long tasks of 83–95 ms among them. A replay races into a
    run's first seconds while they run, and check:motion's busy long-press
    failed twice on it. The checks' loader (`openReady`, so every replay)
    adds `?mute`, which keeps the sound from starting (`startSound`); the
    cues are still logged. The checks that hear the game load it as a player
    does: check:clicks' runs, check:interactions' month, bubbles and hovers,
    and the real-input run. Real play gives the renders the opening card's
    reading time; moving them off the main thread is a change to the
    author's module, so it is left to the author. *(Reason corrected in R5,
    Part A: module v6 renders in a worker; a replay reaches the desk within
    milliseconds of BEGIN, before the worker has delivered the samples, so
    its first sounds render on the main thread. The mute stays.)*

## 2026-10-18 — Round R4, Part C: answers to the R2 and R3 questions

- **C1**: the twelve flag labels R2 left as placeholders are the author's
  six pairs: Lent Sam the rent; Lent Sam half the rent; Turned Sam down;
  Told the papers about your break-up; Wrote a song with Juno Vale; Turned
  Juno Vale down — each with its "Never …" side.
- **C2**: the one-sided replies stay as they are — sam_rent/c,
  producer_room/a, casting_arc/a — and so does juno_hello/b at 89.4 %. No
  persona change, no content change.
- **C3**: a text that opens a season (April, October) keeps its arrival:
  its messages one by one after the season card, a click showing them all.
- **C4**: BEGIN stays 56 px in from the corner, as the reference has it.
- **C5**: real Safari and iPad are the author's to test; the rounds keep
  Playwright's WebKit as the stand-in.

## 2026-10-18 — Round R4, Part B: sound and music

- **B1, the module.** The author's `docs/design/sound/overexposed-sound.js`
  is copied to `ui/sound/oxsound.js` with one added last line,
  `export { OXSound };`, and typed by `oxsound.d.ts`; validate holds the two
  equal but for that line. `init()` comes from the first BEGIN click,
  `prepare()` once the opening card has settled; a hidden page suspends the
  graph and pauses the music, a shown one resumes both. A play the browser
  refuses, or a browser without Web Audio, leaves the game silent with no
  console error.
- **B2, effects with their beat.** `ui/sound/director.ts` listens to the
  queue beside React and plays each beat's sound as the beat is emitted; a
  D7 skip emits none of the beats it skips, so none of their sounds play.
  The screens play their own (a hover, a stamp, a panel, the phone, the
  night). Where the table left room:
  - the first deal after a shuffle plays shuffle, then its deal;
  - a play that draws plays one deal on its land beat (a shuffle first if it
    shuffled): a play has no beat per card;
  - the pile's flight plays one deal, and only when something lies on it;
  - the papers drop on the publish beat of a step that turns the month, and
    of signing (the first papers arrive); never on the night;
  - a letter's tick is silent, its SENT stamp at the reply beat is the stamp;
    a text's reply sends at the answer's first beat, their answer bubbles at
    the reply beat;
  - an extra pick or a new offer has no beat: its spend plays as its number
    rolls (not with motion off, not after a skip);
  - the manager cards dealt as the desk comes up play two deals at their
    landings (0.55 s, 0.67 s); a click that completes the scene drops them;
  - a text's messages bubble one by one in full motion; with reduced motion
    they come at once, with the buzz alone; the month's bubbles likewise;
  - the ovation is for the majors on the upper side of the fame axis — the
    axis on hype, read from content: The Breakthrough and Overexposed — as
    the night names the major (0.6 s); applause per plaque from 2.45 s,
    0.3 s apart; shown at once by a click, what has not sounded starts then,
    still 0.3 s apart;
  - a paper the player pulls forward is silent: the table names the play's;
  - a hand card's hover sounds only while the desk is idle; a sound for
    something arriving plays once, development's StrictMode included.
- **B3, the room** under the desk from the opening card's Continue to the
  awards night, with the weather of the season shown (`WEATHER`), changing
  with the season card. Sound effects off mutes the effects' and the room's
  buses; on again restores the module's own levels. *(Superseded in R6,
  Part A: the game starts no ambience.)*
- **B4, music.** Two `<audio>` elements, each through its own gain into the
  music bus, at `MUSIC_GAIN` 0.25. The director keeps where the music is: the
  scandal track at a step's first impact; at a month end that printed none,
  the season's track back at its date beat (2.5 s, the fade the scandal
  track came in with; the prompt gave none) unless the season changes in
  that step; a season card brings its season's track (3 s) unless the month
  end before it printed a scandal; the lights going out fade it (1.2 s). A
  step whose beats are skipped, or that has none (motion off), still moves
  the music, its last move at once: the music follows the year, heard or
  not. A track that comes back starts from its beginning. Tracks warm by a
  fetch into the HTTP cache, only with Music on.
- **B5–B6.** House rules: Mark my stories, Sound effects, Music, Reduce
  motion; both new switches on by default. The credits gain Music (with
  Holizna's OpenGameArt page) and Sound rows; CREDITS.md a Sound section.
- **B7, the checks.** `?cues` logs every cue (`window.__cues`), a beat's
  tagged step:index:kind. check:interactions asserts a month's cues and a
  D7 click's silence; check:clicks runs with the sound on — the check
  browsers now let media start without a gesture (Chrome's autoplay flag,
  Firefox's two prefs) — and reads the dev server's track log: before May
  the first run asks for spring's track only, and the scandal track's once
  a scandal is held. Playwright's WebKit on Windows has no Web Audio: the
  game is silent there, without error. check:pace reports the event step
  (no bound).

## 2026-10-18 — Round R4, Part A: what the author found in v0.3

- **A1, hovers ease.** An entrance animation that kept filling its last
  frame overrode the element's own transition: the manager cards' and the
  bubbles' hovers snapped, the manager heading and footer vanished in one
  frame at signing, the unsigned card dimmed in one. The rule: an
  entrance's rest style is its visible end state, so an entrance fills
  backwards — its first frame during its delay, never its last after it
  ends. Every entrance in ui/ changed (bubbles, the reaction row, the
  previews, the desk coming up, the papers dropping, the manager cards
  and heading, an event's messages, the panels, the title's photograph,
  name and flashes, the opening card, the ink). Kept: exits whose element
  is removed when they end (the preview's, the overlays', the title's
  going, the white flash, the ink going, the bulbs going out), and the
  awards night's `.rv`, whose rest style hides it until `.shown`.
  check:interactions hovers a manager card, an offer, a hand card, a
  paper, a sticky note, a bubble and a door in full motion: 60 ms after
  each one's transition delay its transform lies strictly between its rest
  and its hover.
- **A2, signing** (replaces R3's B3), from the action, which the SIGNED
  stamp sends 0.56 s after the click (`SIGN` in ui/timeline.ts): 0 s the
  heading and footer fade (0.25 s) and the other card slides down off the
  stage, 0.45 s ease-in, turning 7°, back at full opacity as it goes; 0.12 s
  the signed card follows on its own side, its size unchanged, and the
  phone glows once (the message glow, `glowPhone`); 0.6 s the dim lifts
  (0.35 s); 0.75 s publish — the papers drop, the stat bar and notes come
  up; 1.8 s settled, the offers coming up over their dim. Nothing flies
  into the phone. Click to offers: about 2.45 s.
- **A3, leaving and arriving over the desk.** What leaves leaves as one
  piece, once; the dim never flickers; nothing blinks out.
  - a: an answer is held to be read — until it has arrived (a text's pop,
    0.28 s; a letter's outcome fade-in, 0.5 s), then 1.6 s and 0.1 s a word
    (a run of letters or digits, `answerWords`). A click ends the hold.
  - b: one exit, the overlay's (`Over`): the content — the phone with
    everything on it, a letter, the offers, the doors, a season card, the
    manager choice — goes down 40 px (a letter up) and fades, 0.4 s
    ease-in; the event screen's own exit is gone. `eventClose` now starts
    that exit and the month is published after it.
  - c: the dim is one layer of its own (App's `dim-layer`). It comes up
    with the first overlay and stays through the steps between overlays —
    a door, an offer, an answer — until the month opens onto the desk,
    when its state is published in play; signing is the exception.
  - d: at a month change the new papers drop onto the old stack, which
    stays under them, inert, until covered (`Papers`), in place of the old
    stack going first.
  - e: the offer taken flies to Deck & Discard (a copy of its face, 0.56 s;
    `flyToDeck`), instead of vanishing with the screen.
  - Reduced motion: no travel, crossfades of at most 0.2 s, the reading
    hold kept; motion off: none.
- **A4**: every season card's button and the opening card's read
  "Continue".
- **A5, the manager writes every month**: `messages.quietAfter` 0 reads as
  "always" (core/manager.ts; validate allows 0), so a month in which
  nothing else fires brings the quiet line for the fame band. sim:managers:
  no month opens without a message under either manager (was 25–26 %);
  the quiet lines rise from about 0.7 to 3.7–3.8 a run.
- **A6**: the awards night's bottom block stands right-aligned on the
  front pages' right edge (164 px in), the mirror of the manager's last
  word on their left edge.
- **A7, awards collected** (`overexposed.awardsWon`, guarded as the
  endings are). The scrapbook has two pages, Endings and Awards, by tabs
  in its head; it opens on Endings and its title counts the open page. The
  awards page shows the seven as the night's plaques, four and three: won
  bright, Winner and its citation; not yet won dimmed, "Not won yet", its
  name and how it is won. `howKey` per award (`award.<id>.how`): its
  placeholders are the award's numeric conditions, filled with their min
  (else max); validate checks them. A plaque won for the first time says
  "New"; the title and the awards night count "Awards won {n} / {total}"
  under the endings found.
- **A8, the craft icon follows the card** (`craftLane`, ui/desk/model.ts):
  a music card's craft chips show the note, a screen card's the
  clapperboard, whatever the career; a card shown as a lane variant takes
  the variant's lane. Neutral and celebrity cards, the stat bar and the
  doors keep the career's — the note before a lane is established. On every
  face: the hand, the offers, the deck panel, the preview's needs and
  results.

## 2026-10-17 — Round R3, amended: the title is one photograph

The author, looking at the title mock: the desk is the game's busiest screen, so
the title should not be the desk. This replaces Part A's A1 and Part B's B1,
B2, B3 and B6 below (reference docs/design/visual/ref/r3-title-v2.png, drawn by
r3-title-v2.html; r3-title.png is deleted).

- **A1, the title** (ui/screens/Title.tsx, ui/screens/title.css): one photograph,
  the whole stage, no desk and no stat bar. The photo worker draws the
  reference's `titleScene` — the singer at the mic in a spotlight, the
  photographers' flashes, their cameras and the crowd dark in front — in a new
  light-on-ink mode (ui/desk/halftone.ts `renderTitleCanvas`): bright areas
  print as large cream dots (#CFC6B2) on ink, a positive on a dark page. It is
  drawn once, at the stage's pixel size (device pixels, at most 3840 wide; the
  reference's 7 px dot cell scaled with it), in the worker where there is one,
  and kept for the page's life. Over it, as the reference lays them out:
  OVEREXPOSED in Playfair Display 900, cream, glowing; a short red rule; the
  slogan in Playfair italic (`ui.title.slogan`); BEGIN bottom right, tabloid
  red, in END TURN's corner at the reference's place (56 px in from the edges,
  not END TURN's own 22); "Endings found {n} / {total}" with the dots and the
  three links bottom left; a dark fade at the top and the bottom.
  - Arrival: the spotlight comes up (the photograph fades in, 0.6 s; it waits
    for the photograph on a first load) and the name develops, white-hot with a
    wide bloom, settling to cream (0.8 s). Then six flashes pop near the edges,
    each once in a 13.7 s cycle at its own moment (2.1, 4.6, 6.2, 9.1, 10.5 and
    12.8 s): a white burst of 0.1 s and a 0.3 s fade, a fixed pattern, never
    random. Their keyframes are not `tr-…`: they never end, so no click
    completes them. Reduced motion or off: no develop and no flashes.
  - The title paper, the mirror's five notes, the fan of five faces and their
    CSS are gone, with the six keys only they used (`ui.title.ear`, `.line1`,
    `.line2`, `.endingsFound`, `.foundOf`, `.tagline`).
- **B1**, BEGIN: one big flash — the screen goes white (0.12 s), holds, and
  clears (to 0.75 s) — and the opening card develops out of it, from
  overexposed to itself (0.6 s), over the photograph, which dims itself (the
  card brings no dim of its own), its words gone.
- **B2**, "Into spring": the card fades; the photograph goes to dark (0.3 s);
  the desk comes up out of the dark (0.3–0.7 s), the mirror's bulbs lighting
  one by one (25 ms apart); the two manager cards are dealt onto it (from 0.55
  s). The manager choice is clickable at 1.2 s, inside the 1.5 s a season
  card's button allows (A3). Before the manager is signed the desk has no
  papers, no notes and no stat bar.
- **B3**, signing: as before, the other card slides away and the signed one
  flies to the phone and fades into it; the month's three papers now drop onto
  the desk (from 70 px above, 0.4 s, 60 ms apart), the stat bar and the
  mirror's notes coming in with them; then the offers.
- **B6**, PLAY AGAIN: the fade through ink (0.35 s in, 0.3 s out), then the
  title arrives as on first load, its photograph already drawn.
- Reduced motion: each a crossfade of at most 0.2 s; D7: a click during B1 or
  B2 completes it at once and does nothing else.

## 2026-10-17 — Round R3, Part E: small things

- **E1, the mug** (docs/design/visual/ref/mug.svg): the neutral desk's mug is
  the reference's drawing — rim and base share the desk's foreshortening, a
  red band follows the cylinder — scaled to the old mug's body (34 px) and
  standing where it stood. Its contact shadow is the standing objects' own
  (`.cshadow`), so the drawing's two blurred shadow ellipses are left out;
  its gradients' ids carry a `mug-` prefix; its two wisps of steam keep the
  old mug's steam motion.
- **E2, lane variants of a card's display text**: a card may carry
  `laneText`, a name and headlines by established lane (content-schema.md);
  the flavour falls back to the card's own. The established lane before a
  play picks the headline (/core's `readLines` and the play preview alike,
  still keys only, from the variant's own shuffle bag); the faces, the offers
  and the deck name the card by it. Presentation only: effects and the sim
  are unchanged. Vocal Coaching in the screen lane is "Scene Study", with the
  four approved lines; its craft chip already showed the clapperboard in the
  screen lane. validate checks the lane, the keys and the fields.

## 2026-10-17 — Round R3, Part D: what the player cannot see

- **D1, scandals held.** The Deck & Discard button carries a red newspaper
  chip with /core's `scandalCount` — deck, hand and discard — from the
  first one, and the stat bar's tooltip on the button: "Scandals you hold:
  {n}." over "They come back when your deck is shuffled, and holding them
  brings the next one sooner." (the approved sentence, split at its first
  full stop into the shared header and line). At the month end the pile is
  swept toward the button, not off the desk: each card flies to it and
  shrinks away, and the chip ticks up as a scandal goes in, with a "+1" in
  the quiet stat-delta style. On the mirror a scandal clause shows "(you
  have {n})" (`ui.doors.have`, the doors' words), on its own line under
  the clause: the note's lines are one line each, and the clause and the
  count together do not fit the note.
- **D2, the numbers.** "The numbers" on the awards night opens a centred
  panel in the panels' style (`NumbersPanel`), closed by its button,
  Escape or a click outside, in place of the list under the link. Every
  number is a stat bar chip in the stat bar's colours: Peak ★; Year end ★,
  craft with the lane's icon, 🔥 and £; 📰 n Scandals held; Milestones; Doors
  passed {passed} of {total}; Cards played {n}. New keys `ui.ending.peak`,
  `ui.ending.yearEnd`, `ui.ending.doors` (for `ui.ending.gates`);
  `ui.ending.scandals` loses its number to the chip; `ui.ending.peakHype`
  and `ui.ending.final` give way to the chips.
- The Milestones list every flag held, so the six event flags' labels — the
  TODO(prose) placeholders R2 listed — now show there when held.

## 2026-10-17 — Round R3, Part C: the month, in order

- **C1, the messages wait for a clear desk.** While the month's season
  card, its event and its offers have the desk, its messages do not show
  (the phone's lock screen holds them too). Once its hand is dealt and the
  desk is still, they come one by one — the first 0.25 s after, the rest
  0.38 s apart, the phone buzzing with each message, each bubble rising in
  as it did on its beat. They are the desk's own tails now
  (ui/desk/DeskItems.tsx `Bubbles`), not beats of a step: they hold no
  input, and the next action brings the rest at once, the phone's buzz
  finished with them (the acceptance's check:motion: a skip leaves nothing
  moving). No step waits for
  them any more, so the month ends got shorter: unskipped, a calm one at
  most 2.40 s (was 2.99), one with scandals at most 4.76–6.97 s by count
  (was 5.59–7.75).
- **C2, the bubbles stay.** The author saw bubbles vanish after a play or a
  print; it was not reproduced. Ruled out: the month's messages derived
  anew after each action (16,559 steps of seeded random runs under both
  managers: a month's list never changed once opened); Mags, a reaction, a
  paper picked by hand, the paper that comes forward and each print
  (Chromium months by real input under both managers, bubbles sampled
  every 90 ms for presence, visibility and being clear at their centre:
  none lost, none covered but by the reaction row, which opens over the next
  bubble by design); the stack pushing old bubbles up (check:overflow holds
  them clear of the stat bar at the longest text); a hover preview over them
  (160 previews on the recorded states: none covers a bubble). What could
  still take a shown bubble away was how R1 counted them: not as the
  bubbles' own state but recomputed on every render as a slice of the
  month's list, from the step the queue had active. Now the bubbles keep
  their own count for the month, which only grows, and keep every bubble
  shown until the month changes, whatever the next render's list or count.
  check:interactions asserts it for both managers: from the title with
  motion full, through a month of plays, paper picks and prints, the
  bubbles shown never decrease before END TURN.

## 2026-10-17 — Round R3, Part B: from one scene to the next

- **One set of transitions** (ui/motion.ts `TRANSITION`, ui/style.css):
  every transition is a CSS animation whose keyframes are named `tr-…`.
  Reduced motion makes each a crossfade of at most 0.2 s; motion off, none
  (the checks measure where things settle).
- **B4, what opens over the desk** — the offers, the doors, an event, a
  season card, the manager choice, the panels: the dim fades in in 0.2 s,
  the content rises and fades in in 0.25 s (`Over` in
  ui/screens/common.tsx; the panels' `Overlay`); on the way out, 0.15 s,
  the last content kept, inert, that long. The content can be used at
  once: an entrance holds no input, so no transition lengthens a hold. The
  event's own phone-up and letter-landing entrances (0.45 s) give way to
  the shared one.
- **B1** BEGIN: the fan slides down off the desk, the desk dims, the
  opening card rises in. **B2** "Into spring": the card fades, the title
  paper slides off to the left, the two manager cards are dealt onto the
  desk and the heading fades in. Both are the screen's own, 0.52 s and
  0.82 s, and the desk counts as busy while they run; a click during one
  completes it at once and does nothing else (D7).
- **B3** signing is the manager's step's own timeline (ui/timeline.ts
  `SIGN`): the other card slides away, the signed one flies to the phone
  and fades into it (0.6 s), the month is published at 0.75 s — its three
  papers come in where the title paper stood, with the stat bar and the
  mirror's notes — and the step ends at 1.3 s; then the offers. A click
  skips it, as any step.
- **B5** the last door: its step puts the mirror's bulbs out one after
  another (0.7 s), then the room goes dark (0.45 s), before the state is
  published; the awards night fades up out of the dark on "One year
  later.". **B6** PLAY AGAIN: a fade through ink (0.35 s); the next run's
  title comes up under it and its bulbs come on one after another. A click
  during the fade completes it.
- **Checks**: check:queue checks signing's beats in order and the lights
  going out before the awards night; check:clicks and check:overflow begin
  the next run at the title PLAY AGAIN leads to.

## 2026-10-17 — Round R3, Part A: the opening

- **Versions** (the author, R3): R1's build is v0.1, R2's v0.2, this round's
  v0.3, the jam submission v1.0. `package.json` carries it; Vite defines
  `__APP_VERSION__` from it, and the credits show "v0.3" small at the foot.
  The itch zip is named `overexposed-v<version>.zip`.
- **The title is the desk** (docs/design/visual/ref/r3-title.png; where the
  mock and the prompt differ, the prompt): the night before the year, as in
  March — no stat bar, no bubbles, the notebook's page blank, the phone's
  lock screen with the player's own time. The run to come is made when the
  page opens, so the title is its desk and the opening its variant.
  - The title paper stands where the papers stand, larger (572×404): the
    masthead OVEREXPOSED (47 px, so the two ears fit beside it) between
    "Spring / 2027" and the Flash's "Only / £1"; the dateline; the singer
    under the lights from the photo worker (the bare photograph box until
    the worker has drawn it); "Photograph: staff."; the two italic lines.
  - The mirror is lit and holds five notes: the four majors with their
    names and goal lines, no ticks, and the scrapbook as the black card
    ("Your scrapbook" / "Endings found" / "{n} of {total}" and the dots).
    Any of them opens the scrapbook.
  - Five real faces fan at the front, drawn by the card component, never
    played: vocal_coaching, side_gig, tabloid_story, press_junket,
    open_mic. The mock's fan (two Side Gigs and The Feud) differs; the
    prompt's set is used.
  - BEGIN in END TURN's place and style; Settings and Credits beneath.
    The old title band, its fan and their CSS are gone, and the manager
    choice no longer draws a mirror and desk of its own: it is dealt onto
    the real desk.
- **The opening card and the season cards**: BEGIN brings spring's card
  ("March 2027", "Spring", the opening's paragraphs after its first line);
  "Into spring" brings the manager choice. Every season's card waits for its
  button, "Into {season}" (`ui.season.go`). Its entrance is the month end's
  last beat — a click during it only fast-forwards (D7) — and the step ends
  once the button can be clicked; the offers, the doors and the events wait
  for it. The card is the screens' own (`ui/screens/Season.tsx`), no longer
  part of the month's motion.
- **Checks**: the replays, check:clicks and check:overflow begin at BEGIN,
  answer the opening card and every season card; check:clicks reaches the
  title's controls and the cards' buttons; check:overflow audits the title
  as the desk (the title paper holds its masthead, ears, dateline and
  lines) and the cards as screens; check:pace's season change now ends
  where the card's button can be clicked.

## 2026-10-17 — Round R2, Part E: the events in the sim, and their numbers

- **E1** (sim/personas.ts): at an event the greedy personas simulate each
  reply they can afford and score it as a card play is scored — the state
  it leaves against the one before, an action it spends at the persona's
  `slots` weight; `random` takes a random reply it can afford. A flag only
  an event reads is worth nothing to them (flag values count endings,
  gates and cards; the personas are not changed).
- **E2** (`npm run sim`): events per run (the mean, and the share of runs
  meeting each number), each event's appearances, each reply's share per
  persona, pooled over the player-like personas, over the greedy ones
  ('greedy') and over the greedy ones where every reply was affordable
  ('open'), the times each reply was taken, chains opened and finished,
  and the scandal cards answers added. Each run's JSON lists its events.
- **E3** (docs/sim.md): at least 5 events a run for every player-like
  persona; no reply taken in more than 90% of its event's appearances,
  pooled over the greedy player-like personas where every reply was
  affordable; every reply taken somewhere in the batch; a reply with no
  effect exempt from the last two.
- **E4, why**: with draft-v9's numbers every existing band still passed
  without the events, on the three seeds, and four failed with them. The
  answers the greedy players take added about 14 hype by the year's end
  (minmaxer 89 → 104, dealseeker 104 → 117) and craft before the doors:
  The Breakthrough rose over 70% for minmaxer (up to 70.8%) and
  dealseeker (up to 74.8%), and under Mags gate_session_work and
  gate_award_show rose to 65.1–66.2% met. Event numbers only (no card or
  gate changed), each within 2 of the draft and £1,000:

  | reply | draft-v9 | now |
  |---|---|---|
  | producer_room/a | craft +6 | craft +4 |
  | casting_arc/a | craft +3, hype +4 | craft +2, hype +2 |
  | juno_hello/a | craft +4, hype +4 | craft +3, hype +2 |
  | juno_hello/b | craft +2 | craft +4 |
  | photographer/a | hype +6 | hype +4 |
  | juno_credit/b | hype +6 | hype +4 |
  | ex_reply/c | hype +8 | hype +6 |
  | panel_show/a | hype +3 | hype +2 |
  | panel_show/b | hype +6 | hype +4 |
  | ex_feature/a | hype +6 | hype +4 |
  | sam_interview/c | hype +4 | hype +2 |
  | charity_song/a | hype +2 | hype +1 |
  | charity_song/b | −£2,000 (needs £2,000), heat −2 | −£1,000 (needs £1,000), heat −4 |

  The cuts fall on the replies the greedy players take; the replies they
  never reach (sam_band, sam_payback, juno_soundalike, ex_reply/b) keep
  the draft's numbers, and so do the amounts the prose names (Sam's
  £2,000, half of it, the money sent back). juno_hello/b and
  charity_song/b were raised so that each is a real alternative: "Thanks,
  but I'm writing my own." and "Send a donation instead." are now taken by
  the craft-led and the cautious players.
- **E4, after**: every existing band passes under both managers on all
  three seeds — The Breakthrough at most 68.7% (dealseeker) and 62.1%
  (minmaxer), the two doors at most 63.7% met — and sim:awards, sim:tiers
  and sim:managers pass on all three. Events per run 5.5–5.9 for every
  player-like persona; every reply is taken somewhere.
- **One new band fails, on every seed and manager**: three replies are
  taken in every appearance by the greedy players. "I can't right now.
  Sorry." (sam_rent/c): the other two replies cost £2,000 and £1,000 now
  and pay back later, in a follow-up the greedy players do not value, and
  the prose fixes both amounts. "On my way." (producer_room/a) and "I'll be
  there at nine." (casting_arc/a): an action for craft and hype, against a
  reply that does nothing; the greedy players value an action at their
  `slots` weight (1.5–2), below what either brings even at 2 under the
  draft — only a cost of two actions turns one of them down, which would
  change both events. For the author: accept them as the take-it-or-leave-
  it offers they are, let them cost two actions, or have the personas
  value the flags events read (an instrument change).

## 2026-10-17 — Round R2, Part C: the events on the desk

- **A text** (README §9; mockups/vanity.html, "Event · text"): the desk
  dims, the phone comes up large, the caption to its left — the date and
  the category, the event's title, the category's line. The messages
  arrive one at a time, each after 0.7 s of typing dots, 1.1 s apart, the
  first 0.25 s in; the replies 0.4 s after the last. A click during the
  arrival shows it all (D7); with motion reduced or off, all of it is there
  at once.
- **A letter** ("Event · letter"): it lands slightly turned, on the
  paper's letterhead (its masthead, the desk and the date) or a house's
  (its name in plain serif, the date). The body is typed in Courier New —
  the mockup's face, a system font of the same widths on every machine,
  so a letter breaks its lines alike everywhere. "Your reply" over tick
  boxes with chips. The outcome and the SENT stamp share the letter's
  foot, the stamp beside the words, never over them (the mockup's corner
  stamp sat over a long outcome). A letter of four paragraphs — the
  schema's most, which no event reaches yet — sits 14 px higher and sets
  its body at 13 px so it stays on the stage; the content's letters keep
  the mockup's sizes.
- **Chips** (0.3): a reply the player can afford shows what the reducer
  does — the outcome its preview would show, a bulb for an action, the
  scandal for a scandal card; one they can't shows its effects as content
  writes them, and "Needs …"; "↺ remembered" where it sets a flag an event
  reads; "No cost" where it does nothing (the mockup's words).
- **Answering is a step** (ui/timeline.ts `eventTimeline`, `EVENT_PACE`):
  the player's bubble or the tick at once; their answer, or the SENT stamp
  and the outcome, 1.3 s (a text) or 0.45 s (a letter) later; the answer's
  effects from 0.25 s after that, 0.12 s apart — numbers roll, a bulb an
  action spends goes dark (a new `actions` beat), a scandal card is
  carried to this month's pile (0.62 s) as a month end's lands, without
  the headline it never had; the phone goes down or the letter leaves
  0.9 s after the answer, and after the last effect; the state is
  published 0.38 s later and the month opens — the paper that printed the
  answer in front, then the offers, the deal, the manager's messages.
  Reduced motion: no travel, crossfades only, the answer still held up to
  0.5 s to be read.
- **This month's actions** show from its first decision on: an answer
  spends them before the offers, so the bulbs show them through the draft.
- **Checks**: a dev page (check/events.html) shows every event — with its
  replies, with money at nothing so a reply that needs it shows disabled,
  and answered — and two at the schema's limits built only from the
  content's longest words (three messages and three replies; four
  paragraphs and three choices). check:overflow audits each, and the events
  met in its runs, with the event's own audit (the letter holds its words,
  the caption stays clear of the phone, no words over other words);
  check:clicks clicks every reply on the page (one the player can afford
  sends itself, a disabled one nothing) and answers the events in its runs;
  check:queue checks every answer's beats in order, with answers that add a
  scandal and spend an action.

## 2026-10-17 — Round R2, Parts A, B and D: the event engine, the prose, the press

- **The engine** (core/events.ts, core/reducer.ts; additive): a new phase
  `event`, a new action `CHOOSE_EVENT { choice }`, two new GameEvents —
  `eventOffered { eventId }` and `eventChosen { eventId, choice }` — and the
  run's `eventLog`. At the start of months 2, 4, 6, 8, 10 and 12
  (`rules.events.months`), after the season's opening card and before the
  offers and the draw: an open chain's eligible follow-up (the
  earliest-opened chain first), else one drawn with the game's seeded RNG
  among the eligible openers and one-offs, an event of the established
  lane weighted ×2; at most once a run each; at most two chains opened.
  The month's actions are refreshed when the event comes, so "−1 action"
  comes off them (startTurn does not refresh them again). Heat from an
  answer is blamed on no card, as a gate's is. "↺ remembered" is derived
  from content: a choice that sets a flag some event's condition reads.
- **The prose** (Part B): draft-v9 saved verbatim and committed on its
  own; its 163 lines imported by a script that parses the draft itself,
  so every key content reads comes from the approved text. Effects as the
  draft writes them, money in thousands; "Tabloid Story" and "Public
  Feud" are `tabloid_story` and `public_feud`. The six flags the events
  set need the flag labels validate requires; the draft has none, so they
  are TODO(prose) placeholders (the UI never shows them: an event's choice
  shows "↺ remembered" instead).
- **The press prints what you said** (Part D, core): an answer's press
  line prints when it is chosen (core/lines.ts, a line with a `source`),
  in its choice's paper, placed by the existing tables — a LOUD line as a
  card's LOUD line, in lane or off by fame; a scandal line as a scandal —
  and joins frontPages, the early lane's paper count, the fame meter and
  the year in front pages. A scandal card an answer adds is held, not
  printed: no headline of its own, nothing going to press. On the desk a
  printed answer's dek is the player's own reply, then what it did.
- **Checks**: validate checks the events (fields, months, speakers,
  chains, a choice without a requirement in every event, papers, a budget
  of 15); check:preview previews every answer against the reducer and
  checks each run's event log; desk-states re-recorded with event steps.

## 2026-10-17 — Round R2, Part 0: the author's decisions on R1's questions

- **The year in front pages** (0.1; core/press.ts `seasonPages`): for each
  season, the player's most prominent story printed in its three months
  on any paper — a lead, then a secondary story, then a brief; ties to the
  later month, and within a month to the paper on the desk — whether or
  not it led its page. Only a season in which the player printed nothing
  shows the world's lead of its last month. In the 15 recorded endings,
  59 of 60 seasons now show the player (13 under R1's rule).
- **The pace of a month end** (0.2; ui/timeline.ts `PACE`): every beat and
  its order kept; the holds shortened and the beats overlapping — the
  stat bar's numbers roll while the next beat starts, the next scandal
  lifts 0.54 s after the last one even across the resources between
  them, the sweep runs into the date, the manager's bubbles arrive while
  the hand is dealt, the season's card holds 2.2 s. Measured over real
  reducer steps (check/pace.ts, now the last step of check:queue: five
  personas, both managers), unskipped, from END TURN (or the door's
  click, with its stamp) to the next decision:

  | Month end | Before (median / max) | After (median / max) | Target |
  |---|---|---|---|
  | Calm | 3.23 / 7.46 s | 1.40 / 3.04 s | 4 s |
  | 1 scandal | 7.99 / 12.30 s | 4.61 / 5.71 s | 6 s |
  | 2 scandals | 9.90 / 15.57 s | 5.27 / 6.30 s | 6.6 s |
  | 3 scandals | 10.55 / 16.16 s | 5.86 / 6.77 s | 7.2 s |
  | 4 scandals | 10.55 / 15.17 s | 6.45 / 7.36 s | 7.8 s |
  | Season change | 8.59 / 8.73 s | 5.05 / 5.17 s | 5.5 s |

  The awards night's reveal is unchanged.
- **Previews show results as the card faces do** (0.3; ui/desk/Preview.tsx):
  the story first, then each resource as its chip ("★ +3", "+£1,000"),
  actions as the action bulb with a signed number, scandal cards as the
  newspaper in scandal red, heat as "🔥 2 → 6 · 1 TO GO"; a requirement as
  the face's "Needs ♪ 15+ (you have 6)"; a scandal's rules as its face's
  lines. Words only where no number is involved: the story, a card added
  or removed, a flag, a line crossed, the month end's scandals and their
  causes. The bulb is drawn in code (`i-bulb`).
- **A favicon** (0.4): the tabloid-red square with a cream ring, an inline
  SVG in index.html — no image file, nothing new in the zip.

## 2026-10-17 — Round R1 acceptance: one name for one thing

- **The desk's phone screen is `.phone-screen`**: the screens around the
  desk stand under the root class `.scr` (Part B), and the phone's lock
  screen was also `.scr`, so the screens' rules reached into the phone
  (its font, colour and box sizing, and the reduced and off motion
  overrides) and check:motion's parity read the phone's clock as the
  "choice" on screen — a run crossing a minute failed in all three
  browsers. Renamed in the desk (V1b's code), no visual change; the check
  reads `.screen-over, .scr` only.
- **check:interactions follows Part G**: it closed the deck by the plain
  viewer's button, so the deck stayed open and END TURN's click fell on
  the dimmed scene. It now opens and closes the deck and House rules
  from the stat bar by real clicks.
- **check:motion follows the stamped choices**: a door or an offer wears
  its stamp before its action goes (Parts B–D), so the month input check
  now waits until the action is dispatched (the queue busy, or the step
  counted) before it skips or reads the settled desk. It had not run
  since Part A; with these three fixes it passes in Chromium and Firefox
  at all three sizes and in WebKit at 1280×720.

## 2026-10-17 — Round R1 acceptance: a preview under a resting pointer

- **Found in the run by real input**: a card that comes under a resting
  pointer while a play holds input (the fan closing) gets its pointer
  enter during the hold, when every preview is cleared, and none after:
  moving within it showed nothing until the pointer left and came back.
  A card and END TURN now take focus on the pointer's next move over
  them too; the same card at the same place is the same focus, so a
  pointer moving within a card renders nothing again.

## 2026-10-17 — Round R1, Part I: the checks, leaner

- **What a round runs**: build, typecheck, validate, `check:queue`,
  `check:preview` — now the previews (60 runs by default) and the press
  contract only; `check:clicks` is its own step — and `check:clicks` and
  `check:overflow` in Chromium at 1280×720 and 844×390. A release
  candidate runs them in all three browsers at all three sizes, with
  `check:preview -- --runs=300`, `check:motion` and
  `check:overflow:full` (AGENTS.md §8, §11).
- **Kept**: the checks that guard correctness — `check:queue`,
  `check:preview`, `check:clicks`, `check:overflow` (and `:full`),
  `check:interactions`, `check:motion`, the press contract, the
  photo-worker check, `sim:compare` — and the desk's review tools
  `desk:states`, `desk:shots`, `desk:compare`, `desk:photos`,
  `desk:sheet`.
- **Removed**: everything that only measured frames, power or
  compositors, or recorded video — `desk:perf`, `desk:motion-perf`,
  `desk:motion-shots`, `desk:reference` and the tools behind them, with
  `motion-active-perf`, `motion-cases`, `motion-record`,
  `render-environment`, `profile-summary` and `perf-observed.ps1`.
- **The evidence folders** (`docs/handoff/v1a-compare/`, `v1b-compare/`,
  `v1b-evidence/`) are deleted from the working tree; the history keeps
  them, and the handoff notes and reports link to them at 92d97c9.
  `desk:compare` now writes to `check/out/compare/` with its own index
  page; every check and tool output is under the ignored `check/out/` or
  `sim/out/`.

## 2026-10-17 — Round R1, Part G: the deck, the scrapbook, House rules, the credits

- **Four panels over the scene** (README §9; mockups/vanity.html, shots
  20–22), in ui/screens/Panels.tsx: over the desk a panel starts below the
  stat bar, which stays in view; over the title and the awards night it
  covers the stage and stands where it would on the desk. Escape or a
  click on the dimmed scene closes any of them; each has its own close
  button with the mockup's label.
- **The deck**: the mockup's panel, its minis the hand's own faces at
  0.42, sorted by name in two sections, "Still to draw" and "Played"; a
  scandal is its red face. Deviation: a deck grown past the panel's room
  (four rows of ten) takes the next smaller step (0.36, 0.3, 0.25, 0.2)
  rather than scroll — nothing on the stage scrolls (decision 17). Cards
  in the hand are on the desk, so neither section lists them.
- **The endings scrapbook**: the green board, a column a major with its
  name and goal line, the found minors as taped clippings, the rest as
  dashed "Not found yet" outlines; reached from the title and the awards
  night. The endings found are also kept for the session, so the board
  shows this year's ending when the browser refuses storage.
- **House rules**: Mark my stories (on) and Reduce motion (off), kept in
  this browser (ui/settings.ts). Reduce motion asks for the existing
  reduced mode through the same switch the OS preference and the audits
  use; with it off, the OS preference decides again. Sound stays hidden
  until the game has sound. A whole row is its switch. Reached from the
  title and a small gear button beside Deck in the stat bar (drawn in
  code, no third-party icon).
- **The credits**, in House rules' style: the game's name as the kicker,
  "Credits", the two fonts' notices and the licence link — the existing
  approved words.
- **The plain screens are gone**: the deck viewer and the credits were
  the last; ui/style.css keeps the frame, the stage, the base resets, the
  offers' and doors' layer and the error line, and 44 i18n keys only the
  plain screens used were removed.

## 2026-10-17 — Round R1, Part H3–H4: the paper comes to you; one way to appear

- **The paper comes to you** (README §2, §9; replaces the back paper's
  ping): as a card lifts, the desk reads which paper the play changes —
  the desk's issue before and after it (`paperForPlay`, ui/desk/model.ts)
  — and that paper comes forward with the click's own motion while the
  card is carried, so its story prints in front. It stays in front until
  another play brings a different paper forward, the player picks one,
  or the month ends. Several papers changed: the one whose lead changed;
  both or neither: the one with the played card's own story; no visible
  change: nothing moves. Measured on four recorded states: loud plays
  bring their paper forward by 0.4 s. A cooling or drawing play that adds
  or removes a story "going to press" also changes that paper's visible
  stories, so it comes forward too. The card's input hold is unchanged;
  reduced motion swaps the papers under a 0.15 s crossfade.
- **One way to appear**: the hand's previews and END TURN's rise and fade
  in as the stat bar's tooltip does (0.15 s) after a brief delay (70 ms),
  so sweeping across the hand does not flicker, and fade out quickly
  (0.1 s) — also when an input hold hides one; reduced motion fades
  only. The reaction row rises in the same way. END TURN, the Deck
  button, the tickets and the screens' buttons share one short hover
  transition (0.15 s). With motion off, as the audits run, a closed
  preview goes at once.

## 2026-10-17 — Round R1, Part H1–H2: one order and icons on every face

- **One order on every face**: the name, the body, then the italic
  flavour line, always last and at least one body line below it; a
  longer body moves the flavour down (a one-line body keeps it at the
  108px anchor). A scandal: its name, "Can't be played", its rules, then
  its in-hand line as the flavour.
- **Every number is an icon and a number**, as on the plain-value cards.
  A face's body is now lines (`FaceLine` in ui/desk/model.ts): the plain
  values; "Needs" and the condition in icons; a conditional's branches
  one line each — the condition in icons, an arrow, its values —
  "Otherwise" for the other branch; a flag condition in the flag's own
  short label ("Signed", "Went viral", words of the cards' approved
  texts); a season condition as the season ("Winter"); scandals removed
  as the countdown's newspaper in scandal red ("📰 −1"); what is no
  number in a short phrase of the existing words ("Remove a Stunt card",
  "Add a Studio Session to your discard pile", "Copies itself into your
  discard pile", "−1 action"). The 13 cards that fell back to a sentence
  all fit the format; none keeps its text. Requirements list their stats
  in the stat bar's order, money as "£4,000" (no plus), as the prompt's
  examples do.
- **"Opportunity" is a small sticker** in the top right corner, where the
  cost bulbs sit; like them, a fanned card shows it in front or on hover.
- **On a scandal's red face** its rules' values take the dark faces' light
  colours, the red ones in cream.
- **Every face is checked**: a dev page (check/faces.html, ui/dev) shows
  all 42 faces in a hand of five, a crowded hand of eight and an offer of
  four; check:overflow audits them at every size — the name in its box,
  no body line wider than the face, the flavour clear of the body, the
  body on the face. It found one: "Networking" in a crowded hand, now set
  a size smaller like the other crowded notebook names. check:preview
  holds each face's values to the card's effects.

## 2026-10-17 — Round R1, Parts E and F: the awards night and the year in front pages

- **The awards night** as mockups/screens.html sets it: the curtains and
  the spotlight, "One year later.", the major as kicker, the minor as
  title, the ending's prose; the year's awards as winner cards (name and
  citation from content; no "Nominated": /core gives winners only); then
  PLAY AGAIN and "Endings found N / 14" with dots. The mockup's reveal
  sequence plays once; a click during it shows the night at once and
  plays nothing (decision 7).
- **Added to the mockup's layout**, as the prompt asks: Juno Vale's
  closing line under the prose; the manager's last word as two bubbles
  under "<first name> · Manager" (the desk's own label); the run summary
  folded under a small "The numbers" toggle. The mockup's "Replay the
  night" gives way to the scrapbook link (with Part G).
- **The plaques are 124 px tall** (the mockup's 114): the overflow audit
  found a two-line award name with a three-line citation spilling out.
- **The year in front pages** (Part F): /core's new read-only
  `seasonPages(history)` picks, for each season, the month whose front
  paper's lead is about the player (the player's line, fame filler or a
  frenzy's spillover), ranked by the line's prominence, ties to the later
  month; with no player lead, the season's last front page — the world
  went on. Each shows the paper, the season, the headline exactly as
  printed (the tabloid's in its capitals, a scandal's in red) and the
  lead's photograph by its scene tag.

## 2026-10-17 — Round R1, Parts C and D: the offers and the doors

- **The offers** (README §9, shot 15): "<Month Year> · offers" / "Take
  one." / "The rest go to someone else." over the dimmed desk, the stat
  bar in view. The offered cards wear the hand's faces at 1.1× (the face
  rules in hand.css now also apply under `.faces`); four cards fit at full
  size. Dex's extra card wears the paper-clipped tag, its words content's
  offer label. A click stamps TAKEN and the others fade. The tickets: "Take
  one more £N" and "Reroll the offer £N" — the free reroll's label from
  content — greyed out when not legal, and "You have £N".
- **No story preview on an offer**: /core has no query for the line an
  offered card would print (D8 was never built), so nothing shows there.
- **"Take one." stays after "Take one more"**: the mockup has no other
  title, and the greyed ticket says what was bought.
- **The doors** (shots 16, 17): two invitations with a double gold rule and
  opposite tilts; "You're invited", the gate's name and flavour; each
  requirement as ✓/✗, the stat's icon and the threshold in its colour, then
  "(you have N)" — never the stat's name (README §9, newer than shot 16,
  which still prints "30+ hype"); a requirement without a stat in plain
  words; "If you pass · if you fail" as the cards' value chips (an effect
  that is no plain value in words); Likely or Unlikely from the reducer's
  own preview; a click stamps ACCEPTED and the other fades.
- **The last door**: "Winter · the last door" / "The last door of the
  year." / "Either way, the year ends as …" when both doors end the year
  alike — otherwise each invitation names its ending with the existing
  line — and "On the night" with the awards each choice wins, always,
  from the final-gate preview.

## 2026-10-17 — Round R1, Part B: the title and the manager choice

- **As mockups/screens.html sets them**, every label verbatim: the title's
  band, "FOUR SEASONS · ONE CAREER", the red rule, BEGIN, "Endings found
  N / 14" with a dot per minor ending, and the fan of cards drawn in code;
  the manager choice's two business cards on the vanity under the mirror.
  Every manager line and the opening come from content. No seed on screen
  (`?seed=` still replays one).
- **The season label is the opening's own first paragraph** ("Spring.",
  shown as SPRING.): the content's only opening begins with it, so a
  separate label would have printed the season twice.
- **The footer reads the mockup's "Click a card to sign."**, as the prompt
  asks, instead of content's "Choose one."
- **A choice wears its stamp before it is made**: SIGNED lands, the other
  card fades, and the month begins 0.56 s later (0.15 s with reduced
  motion; at once with motion off, as the audits run).
- **The fonts load before the title shows** (a 3 s cap if one never
  comes). The links to the scrapbook and settings arrive with Part G;
  until then the title links to the credits.
- The screens stand beside the desk under one root class (`.scr`), with
  the desk's colour tokens; the overflow audit covers them, skips
  decoration (`data-deco`), and checks boxes marked `data-fit` hold their
  text.

## 2026-10-17 — Round R1, Part A: the hand's feel

- **A card play holds input only until the card is set down and the fan
  has closed** — the queue's settle, 930 ms after the click. Its visual
  tails (the printed story, the handwriting, the rolling numbers and
  signed figures, the paper's ping, the countdown's bump) play on but no
  longer hold input: the next action completes them at once, in their
  final state, and proceeds. Within the hold, and for the month end, a
  click still only fast-forwards (decision 7, revised in ui-plan).
- **How:** the tails stopped calling the queue's `hold`; the queue keeps
  a hook (`onTails`) the desk's motion registers with, and the action
  handler settles the tails (`settleTails`) before it reduces.
  `check:queue` asserts the queue is free after the settle and that the
  hook runs.
- **Measured** (headless Chromium, seed 3, click to the desk idle): Open
  Mic (loud) 2,115 → 936 ms; Side Gig (money) 2,113 → 940 ms; Vocal
  Coaching (quiet) 3,582 → 939 ms. The author's own measure before the
  change: 2.8 s and 3.6 s. A click 1.2 s into Vocal Coaching's
  handwriting now completes it and lifts the next card at once.

## 2026-10-17 — Round R1, Part 0: the author's decisions

- **V1b is accepted for the jam as built** (game source `2964ef8`). Real
  Safari and iPad: the author tests the itch build when a device is at
  hand. The Chromium 4× publication frames: no further work. WebKit
  motion at 800×450 and 844×390: not required. The WebKit
  continuous-input failure is re-checked after Part A (at most 45
  minutes). The status lock ("V1b incomplete; no phase 3/V2") is lifted.
- **Acceptance from now on** (AGENTS.md §8): every round — build,
  typecheck, validate, check:queue, check:preview, check:clicks and
  check:overflow in Chromium at 1280×720 and 844×390, and sim:compare
  whenever content or rules change; a release candidate — the same in
  Chromium, Firefox and WebKit at the three sizes. No CPU-throttled
  timing, recordings, frame galleries, performance JSON or evidence
  folders; one Chinese report per round, under about 200 lines.
- **The order of work to the deadline** (AGENTS.md §7): R1 (10/17–18) →
  the public early build; R2 (10/19–21) events; R3 (10/22–23) fixes;
  10/24 the playtest build; 10/25–31 polish, sound, a retune; 11/1 the
  freeze; submit 11/3 JST. Cut for the jam: the 27 once-per-run
  variants, hand-painted illustration and the photo collage (every image
  is drawn in code), the year in review as its own phase (the awards
  night's front pages cover it).
- **The AI disclosure and the credits**: the art is drawn in code with AI
  assistance — no image-generation models, no public-domain images
  (AGENTS.md §10, CREDITS.md).

## 2026-10-01 — Round V1a: the draft the author could not play, and the handoff

- **The blocker** (the author's play of the V1a build): after the
  manager's choice the draft showed its title, Extra pick and Reroll, and
  no cards. The plain screens — the draft and the gates, the deck, the
  error line — were drawn inside `.desk`, so the desk's rules reached
  them: the hand's `.desk .card` (absolute, 490px down) put every offer
  below the stage, and the desk's resets (`.desk *`, `.desk button`)
  stripped the panel's buttons. **The plain screens now stand beside the
  desk**, in the stage, over a scrim of their own (`.screen-over`), and
  **the hand's rules are scoped to the hand** (`.desk .hand .card`,
  `.desk .hand .f-…`). Every plain screen checked: the title and its
  credits, the manager choice, the draft with three and four offers, after
  an extra pick and after a reroll, the deck, a season door, the last door,
  the ending. No other screen had collided.
- **Why no check caught it**: the checks took the draft's cards with
  `element.click()`, which reaches a button wherever it lies; the click
  check hit-tested only the hand and END TURN; the overflow audit measured
  only the desk; the reference screenshots were all months on the desk.
- **The assertion that would have caught it** (`check:clicks`): in every
  state, every control for a legal action — New run and Credits, the
  manager choice, each offer's Take, Extra pick and Reroll, each door,
  every playable card, END TURN, the deck's buttons, Play again — lies
  inside the stage and is the element `elementFromPoint` finds at its
  centre (a fanned card at the centre of the strip it shows, in its own
  tilted frame). At 1280×720, 800×450 and a phone held landscape, in
  Chromium and Firefox: 6,503 controls in 1,359 states over the six
  runs, 0 blocked. On the old build it fails at once:
  "Take" lies outside the stage, nothing is hit at its centre.
  `check:overflow` audits the plain screens too — nothing off the stage,
  nothing cut off by a box that hides its overflow — and fails on the old
  build as well (`div.card.offer` off the stage). Both run in Chromium and
  Firefox.
- **The stat bar's keyboard focus** is read from the pointer (no press in
  the last 600 ms) instead of `:focus-visible`, which headless Firefox
  never sets: its window never has focus. The same in a browser; the
  keyboard test is skipped where the window has no focus.
- **The overflow audit puts React's nodes back** after trying each scene
  in the script page: rebuilding the page from its HTML left React holding
  nodes no longer in it, and a later month's script crashed the app under
  the audit (never in play).
- **A Firefox that cannot start its tab is started again.** Three times a
  check waited forever on Firefox. Firefox's own log says why: on this
  Windows machine its sandbox sometimes fails to start a tab's process
  ("Failed to launch tab subprocess"), about one fresh browser in ten to
  twenty-five, and that tab never loads anything. The driver now starts
  such a browser again (its first tab must answer within 8 s; three
  tries), keeps the page in its first tab's process (Fission off in the
  throwaway profile, so loading the game starts no new process), ends the
  whole process tree on close (killing Firefox's launcher alone had left
  browsers running), and gives up on a silent browser — two minutes for a
  command, twenty for a page script — failing the check and naming the
  command. Forty launches in a row: none stalled, three started again.
- **Every tool in the repo**, each with an npm script, for the agent that
  continues on another machine: the browser driver (Chrome over CDP,
  Firefox over WebDriver BiDi, no dependency); the state finder and the
  replay steps (`desk:states` → `check/desk-states.json`: the reference
  states, the biggest hand, a hand for every card, and now every minor
  ending); the longer overflow audit (`check:overflow:full`); the
  interaction check; the screenshots, the reference comparison, the
  performance run, the photographs, a contact sheet of shots; the sim's
  baseline and its comparison; and the tuning instruments of earlier
  rounds, ported to today's /core — `tune:thresholds`, `tune:endings`,
  `tune:lanes`, `tune:try`. `tune:try` plays a content patch in memory
  (the old experiment runner wrote it into `content/` and restored it).
  What each replaced, and the scratch scripts left out — one-off importers
  whose drafts and results are in the repo, file-editing scripts, probes
  whose answers are recorded here: `docs/handoff/v1a.md`, "Tools".

## 2026-10-01 — Round V1a: acceptance

- **The sim is untouched**: `sim`, `sim:awards`, `sim:tiers` and
  `sim:managers` on seeds 20260929, 1 and 424242 are identical to the
  Part 0 baseline, every run record and every report line.
- **Every desk text at its longest**: a new check, `npm run
  check:overflow`, makes every line group read as its longest variant (and
  every press subject the longest noun), plays seeded runs through the real
  UI at 1280×720, 800×450 and a phone held landscape, and audits the desk at
  every state and every hover. It found three things, now fixed:
  - **The script page grows with its scene**: one real scene (the
    interview room) ran 9px past the mockup's 126px box and lost its punch
    line. The page is at least 126px, as long as its scene; the check tries
    all nine scenes as written.
  - **Card text keeps to the strip a fanned card shows**: from six cards the
    next card covered the end of the text. Values and flavour narrow to the
    strip; names keep the mockup's width until the hand is crowded (eight
    cards and more), where they drop a size and may take three lines.
  - A script line group is not a set of variants: the check keeps scenes as
    written instead of making every line the longest.
- **The papers stand by transform**, not left and top, and a back paper's
  shade is a veil, not a brightness filter: the filter's transition dropped
  a third of the frames in Firefox and the left/top one laid the desk out
  again every frame (954 layouts in a dozen switches, now 73). Same look.
- **Money everywhere**: the ending's run summary still said "capital"; it
  says "money", as round 2c named it.
- **Browsers**: Chromium and Firefox 142 (driven headless over WebDriver
  BiDi, no dependency) pass the same audits and the desk's interactions.
  WebKit is untested: it needs Playwright's WebKit build, a download and a
  dev dependency, which the author has not approved.
- **The reference comparison** is in `docs/handoff/v1a-compare/`: the
  game in the state nearest each of shots 01–14, beside the shot.
  (Round R1 moved its output to `check/out/compare/`; this one is in the
  history at 92d97c9.)

## 2026-10-01 — Round V1a, Part F: the hand

- **As README §6 and the mockup set it**: the fan centred at x=540, 150px
  apart (128 above five cards), tilted up to 8° and lifted in the middle;
  the hover (13px up, 60% of the tilt, ×1.012, 0.42 s after 70 ms); the
  fixed anchors (name 18px, values 70px, flavour 108px); bulbs top right
  only above one action; the eleven faces from content's `face` field,
  the headshot a halftone drawing. END TURN at the bottom right, red in a
  frenzy.
- **Draws that swell the hand** tighten the fan so it never reaches END
  TURN (at most 960px wide: eight cards sit 111px apart).
- **Values** (round V1a, 0.3): icon and number in the resource's colour,
  lighter on the dark faces, paler on gloss, deeper on gold; money green
  earned, red spent; "Draw N". Craft's icon is the stat bar's, by the
  established lane, so one resource wears one icon at a time. A flag a
  card sets is a value too, in the flag's own words ("Went viral",
  "Signed to a label"). A card with a requirement adds it under its
  values ("Needs Hype 25+"); conditional cards keep their rules text,
  and rules longer than two lines push the flavour down.
- **A scandal** is red with a dashed white border and ✕; its values line
  reads "Can't be played", its in-hand line is the flavour, and its rules
  (when drawn, at month end) sit below. Clicked, it shakes and the desk
  says so; so does any card once the month has no actions left; a card
  whose requirement is unmet shakes and shows its preview, which says why.
- **The previews** on hover (and long-press, and keyboard focus) are the
  plain previews on a newsprint slip, standing above the highest a lifted
  card reaches.
- **Playing is plain until V1b**: the card leaves the fan and the fan
  re-lays at once — the mockup's gliding close of the gap is V1b's.
- **Signs**: figures take a true minus (U+2212), as the reference sets
  them ("−3", "−£1,000"), everywhere the interface signs a number.
- **Actions, not slots**: the interface strings that still said "slot"
  (the preview's "Actions left", the reasons, the effects) now say
  "action", as round 2c named them; an extra action lasts "this month".
- `check:clicks` now hit-tests a fanned card across the strip the next
  card leaves showing, in the card's own tilted frame, with transitions
  settled; `check:preview` holds the fan and END TURN to /core.

## 2026-10-01 — Round V1a, Part E: the desk, the phone and the manager

- **As README §4–§5 and the mockup set them.** Flat in the desk's own
  perspective: the lane's props (music: two different sheets of music;
  screen: the script and the clapperboard, arm open; celebrity: the GLOSS
  magazine; no lane yet: nothing flat), the spiral notebook with its
  pencil, a frenzy's three red clippings, and the phone. Standing: the
  metronome (music), the brush cup (celebrity) or the mug (no lane), with
  a contact shadow, and in a frenzy two crumpled paper balls, each its own
  shape from the run's seed.
- **The notebook's page** is the player's latest quiet line; the script is
  the fame band's scene for the season, from content (round 2c).
- **The metronome** is the mockup's engine: it swings (2.4 s, 1.3 s in a
  frenzy); a click finishes the stroke and eases it to the centre; another
  starts it with a growing swing. It starts stopped under the system's
  reduced-motion setting.
- **The phone**: no badge; one bar per notification — this month's
  manager messages in blue and, in a frenzy, the press in red (at most
  six); the player's own local time, as their phone formats it, without
  AM/PM, refreshed every 15 s; in a frenzy a red screen that buzzes every
  few seconds. No `Math.random()`: the buzz only shakes and lights the
  phone, it adds no bar.
- **The bubbles** are this month's messages from /core, two bubbles each,
  under the manager's **first name** ("Marguerite · Manager", as the
  mockup labels them — the full name runs into the mirror's bulbs).
  Clicking a bubble opens ❤️ 😂 👍 (💔 😭 👍 in a frenzy); a reaction is
  kept per bubble of one message — month, place in the month, bubble —
  never per words; choosing it again removes it; a click elsewhere closes
  the row. UI state only. The reaction sets are keys (`ui.react.*`), and
  so are the words drawn on the props (`desk.sheet.*`).
- `check:preview` holds the lane's props, the notebook, the script, the
  phone's bars and the bubbles to /core at every state.

## 2026-10-01 — Round V1a, Part D: the papers

- **As README §2 and the mockup set them**: three papers standing on the
  desk, real newsprint, each masthead with its ears, the dateline (date,
  issue number, tagline), the lead with its kicker, dek and photograph —
  or, on the Marquee, the weekend box office — and the row of three. The
  names are content's; the logos' lettering (b-side in lower case,
  MARQUEE in spaced capitals) is the stylesheet's, as the mockup sets it.
- **The front paper is /core's lead paper.** Clicking a paper behind
  pulls it forward (it also answers Enter and Space); the choice lasts
  until the issue or its lead changes. Switching re-renders only the
  papers — measured: every DOM change lands inside the papers.
- **Mark my stories** is on (the setting is round V2's): the player's
  stories carry the red rule, the rival's the purple one, and the
  player's film its rule in the box office.
- **The photographs** are the mockup's drawings, three per scene: the
  drawing itself, mirrored, and reframed closer, each with its crowds,
  rain, lights and passers-by shifted by the seed; the street is drawn in
  the issue's season, the paparazzi shot in the red duotone. The shuffle
  bag runs on /core's count (Part A), so the same picture never leads a
  paper two months running — `check:preview` checks it across every run.
  Each picture is drawn the first time it is needed (about 7 ms) and
  cached. A small blur in code replaces the canvas filter, which WebKit
  lacks, so every browser draws the same picture. The director's chair
  in the film-set picture reads "DIRECTOR", now a key.
- **Left out**: the mockup's ★★★★☆ under the B-Side's review of the
  player's single. It is a number, and the game has no review score to
  give it; the author decides whether it should show one (craft's tier,
  say).
- **The plain feed is gone.** The papers show this month's issue; earlier
  months are not on the desk. The manager's messages return as bubbles in
  Part E.
- **For the author** (not changed): README §7 says that once the player
  is Known a scandal month puts the tabloid on the desk. /core's lead-paper
  rule (round 2b) ranks the papers by the player's most prominent story
  and breaks a tie for the lane's paper, so when the player also has a
  lead story in their lane's paper that month, that paper stays in front
  and the tabloid stands behind with the scandal leading it. It is /core's
  rule and sim:press reports it; the author decides whether the tie
  should go to the scandal.

## 2026-10-01 — Round V1a, Part C: the mirror

- **As README §3 and the mockup set it**: the bulb frame (eight bulbs
  along the top, five down each side), the glass and its reflections, the
  black card, and three sticky notes at the mockup's three spots, for the
  majors other than today's in content's order, in their content colours.
  Notes and card scale up on hover.
- **The notes speak the stat bar's language**: ✓ or ✗ (their own keys,
  `ui.note.met` and `ui.note.unmet`), the icon, and the words — "Known ·
  80+", "5 or fewer scandals", "Already known" — never "(you have N)".
  *(The scandal words superseded in R5, B7: "5 or fewer", "6+", as the
  doors say them.)*
- **In a frenzy**: the mockup's pattern of dark, harsh and flickering
  bulbs, the red glass, and a red clipping on the glass. The README does
  not say what the clipping reads; the mockup's sample repeats the
  tabloid's scandal headline, so it reads **the month's newest scandal
  headline**, as the papers print it — no new prose.
- The flicker stops under the system's reduced-motion setting, until V2's
  "Reduce motion" can drive it.
- `check:preview` holds the mirror to /core at every state: the black
  card is `endingIfYearEndedNow`; the notes are the other majors, each
  requirement /core's clause (met, number, tier word); **no note ever
  looks achieved**; and the clipping is one of the month's scandal
  headlines, only in a frenzy.

## 2026-10-01 — Round V1a, Part B: the stat bar

- **As README §1 and the mockup set it**: the geometry (five cells of
  114px from x=16, the actions cell fixed at 586–694 so the bulbs centre
  on x=640), the order, the icons in their fixed colours, the tier word
  with its small number, the countdown's four levels (from /core's
  `countdownLevel`), money in pounds, the three bulbs, the current
  season's three marks and the date, and the measured optical offsets.
  The craft icon is the clapperboard exactly while the established lane
  is screen.
- **Actions used go dark from the left**, as the mockup's play does.
  While drafting or at a gate every bulb is lit: the month's actions are
  all still ahead.
- **Tooltips**: on hover, on a long-press on touch, and on keyboard focus;
  a tap does not open one (it only focuses the cell). The tooltip stands
  above the plain screens of round V2, so it can be read while choosing —
  in the mockup it would sit under the overlay's scrim.
- **The deck opens from the stat bar**: a small "Deck & discard" button
  after the actions cell. The README places no deck opener on the desk;
  the deck is a V2 screen, and this keeps it reachable in every phase
  until V2 decides where it lives.
- `check:preview` now builds the desk's model at every state and holds
  it to /core: every tier word and number, the icons, the countdown and
  its level, money, the actions, the date and the season marks, each
  tooltip, the season, and the crisis look (the issue's frenzy, recounted
  from the month's scandal lines). Before each END TURN, the issue on the
  desk must be the month END TURN prints.

## 2026-10-01 — Round V1a, Part A: the desk's foundations

- **The stage** stays the one 1280×720 stage, scaled to fit, and now
  clips: nothing of the scene draws outside it. The new styles live under
  `.desk`, the old ones under `.plain`, so the two never collide while
  both are on screen.
- **Fonts**: Playfair Display (regular and italic) and Libre Franklin,
  the variable fonts, self-hosted as WOFF2 in `ui/fonts/`. No dependency
  and no download at run time: `tools/woff2.ts` wraps each original TTF
  in WOFF2 without transforming its tables, and checks that every table
  comes back byte for byte. The font data is unchanged and not subset,
  so under the OFL-FAQ the fonts keep their names although Playfair has
  a Reserved Font Name. The notices and the licence ship beside them
  (`ui/fonts/OFL.txt`) and are credited in-game (a Credits screen from
  the title) and in `CREDITS.md` for the itch page.
- **Tokens**: the README's colours, the season lights, the value
  colours and the paper stocks are CSS variables (`ui/desk/tokens.css`),
  never literals in the components.
- **One adapter** (`ui/desk/model.ts`) turns state and history into
  every word and number the desk shows, from /core queries and content;
  the components render its fields and compute nothing. It is pure, so
  check:preview can hold the desk to /core.
- **The issue on the desk** is the current month's, as it stands: in the
  play phase, the front pages as they would print if the month ended now
  (the stories printed so far plus the scandals its end would add, from
  the reducer run the END TURN preview already makes — those are marked
  `coming` for V1b); while drafting, the month so far (/core's new
  `issueNow`); at a gate and at the year's end, the month just printed.
  The crisis look follows that issue's frenzy.
- **The box office is /core's** (`boxOffice`, seeded, never the game
  RNG), its films and takings content (`press.boxOffice`). It takes the
  Marquee's right column unless the lead is the rival's, a scandal, or
  the player's own story before they are famous — those carry a
  photograph, as the mockup sets it.
- **The photographs' shuffle bag is counted by /core**: each lead carries
  `photo`, how many earlier months led its paper with the same scene, and
  the desk picks the drawing with `bagIndex` on it — never the same
  picture on a paper two times running, and no comparison in /ui. The
  street is one bag whatever the season; the season only changes how it
  is drawn.
- **Content, not code**: the sticky notes' colours (`majors[].note`), the
  season of each act (`rules.seasons`), each paper's issue number
  (`papers[].issue`). Validate checks all three and every desk key.
- **The desk's words** — the papers' ears, taglines, issue labels and
  kickers, the captions, the props' labels, the card faces' header
  lines — are the mockup's, keyed in `en.json`. The ten film titles are
  the mockup's sample list and stay `TODO(prose)` until the author
  approves them; the player's film, *One Year*, is the README's.
- **Scaffolding**: until Parts B–F replace them, the plain stat strip,
  feed, goals board and hand sit over the new scene where the desk's
  parts will go, so the game stays playable end to end; the draft, the
  gates, the deck and the ending keep their plain screens (V2) over the
  dimmed scene.

## 2026-10-01 — Round 308e7bb answered; round V1a begins

Round V1a builds the desk as the visual reference's README §1–§7 describe
it, static: every state, hover, tooltips and the simple interactions. Its
motion is round V1b; the screens around the desk are V2. The author's
answers:

1. **Confirmed**:
   - Dex = D2; Mags = M1;
   - the Label Deal at hype 50, the Award Show at craft 47;
   - the three screen cards from summer;
   - the quiet month after one silent month;
   - Money and Actions as names, and "1 month left";
   - the four scene-tag readings;
   - Mags's text "every season" with relief in months 3, 6 and 9.
2. **The minor floor at 1.0% is accepted, with a second band that gives it
   meaning**: every minor reaches 3% or more of one player-like persona's
   runs, under each manager. An ending has to be reachable by a way of
   playing, not only through the mix of personas. `npm run sim` checks it
   and prints each minor's best persona.
   On seeds 20260929, 1 and 424242 it passes under both managers:

   | Minor | Dex: best persona, share | Mags: best persona, share |
   |---|---|---|
   | leading_role | dealseeker 33.1–35.6% | dealseeker 30.0–32.9% |
   | household_name | comeback 18.9–19.9% | comeback or dealseeker 16.9–17.3% |
   | star | dealseeker 13.1–15.0% | dealseeker 17.1–20.0% |
   | the_independent | minmaxer 6.7–7.1% | minmaxer 4.4–6.5% |
   | redemption_arc | comeback 9.5–12.5% | comeback 5.4–6.7% |
   | tabloid_royalty | comeback 22.5–26.0% | comeback 21.8–24.7% |
   | meltdown | comeback or dealseeker 17.5–18.3% | comeback 22.6–23.4% |
   | character_actor | artisan 52.6–54.5% | artisan 44.4–47.4% |
   | the_one_to_watch | random 11.7–12.3% | random 11.8–14.5% |
   | craftsman | artisan 44.6–46.1% | artisan 49.8–52.4% |
   | nobody | random 16.0–19.2% | random 16.7–19.8% |
   | flash_in_the_pan | random 7.0–7.4% | random 6.6–7.4% |
   | running_on_empty | random 9.1–9.5% | random 6.1–7.7% |
   | starting_over | random 9.8–11.0% | random 8.5–9.2% |

3. **Card faces show effects as values, not prose.** A card whose effects
   are all plain values needs no rules text; a conditional rule keeps its
   text. The three screen cards keep their rules generated from their
   effects.
4. **Draft v8** is saved verbatim (docs/writing/draft-v8.md, committed on
   its own as 0440182) and imported:
   - six lines replaced, each keeping its key;
   - The Daily Flash's giant marrow is a summer story (`act: 2`, so once a
     run, in summer);
   - one new B-Side one-off, `paper.bside.world.35`. The B-Side pool is 35
     for 34.1 showings a run: its variant warning is gone.
5. **check:clicks alternates the manager** run by run, so any two runs
   cover both.
6. **The order of work changed**: V1a → V1b (the motion on the desk) →
   phase 3 (events) → V2 (the screens around the desk) → phase 4 (the year
   in review, the once-per-run variants, full retuning) → the feature
   freeze. The visual work runs alongside the content, not after the
   freeze. Corrected in:
   - AGENTS.md §6 and §7;
   - docs/status.md, the next task and the schedule;
   - docs/design/content-expansion.md, the status note;
   - docs/ui-plan.md, §10's layer 3 row and §14;
   - docs/design/visual/README.md, its opening note and "Where each
     decision lands".
7. **The visual reference is v18**: mockups/vanity.html is titled "visual
   direction v18" and the README's status line runs to v18.
   - The README is the spec and wins. Shots 01–14 predate v17: they still
     show the phone's number badge, which v17 removed.
   - The README's §8 still quotes round 2b's perk texts. The game's are
     D2 and M1.

**The baseline for V1a** (presentation only), recorded after these
changes in sim/out/baseline-v1a, not committed: `npm run sim`,
`sim:awards`, `sim:tiers` and `sim:managers` on seeds 20260929, 1 and
424242.
- The results equal round 308e7bb's. Every run record (2 managers × 3
  seeds × 9,000 runs) and the award, tier and manager reports are
  identical; the sim report adds only the new band and its table.
- 14 of 14 bands pass under each manager on each seed.
- V1a must leave all of it unchanged.

## 2026-10-01 — Round 2c, Part F: the perks and the base game

- **Where Part F began.** Parts A–E in, round 2b's perks still on:
  - Dex passed every band.
  - Under Mags (−1 heat every month) four bands failed — major
    concentration, minor reachability, the scandal median and gate met%
    (seed 20260929) — and she was strictly better.
  - With no manager, dealseeker's Breakthrough was already 63.5–64.1%.
    F2's 67% held before any lever: round 2c's content (the lane-weighted
    draft, the screen cards) had moved it from round 2b's 69.3%.
- **The engine: two perk fields**, data like the rest.
  - `extraOffer`, with `extraOfferKey` as its label: N more cards on every
    draft offer. They are drawn after the lane card and the rest, from
    what the pool has left. `DraftState.extras` names them, and a reroll
    deals them again.
  - `monthEndTurns`: the months whose end the month-end effects land on.
  - `check:preview` asserts the offer's size, the extras and their labels
    against the reducer. `check:clicks` asserts the label in the DOM.
  - The sim runs `--manager=none` for the base game, and records picks
    of the manager's card.
- **Mags: M1.** −1 heat at the end of months 3, 6 and 9, after the
  month's check ("You lose 1 heat at the end of every season.").
  - Pooled over three seeds on the final content, the known share
    (Breakthrough + Overexposed) is 52.4% under M1 against Dex's 55.1%.
  - M2 and M3 reverse criterion (c): 55.2% and 55.5% against Dex's 55.1%.
  - Measured first with D1, before the gate changes, M2 left Mags
    strictly better on two seeds of three, and M3 on all three.
- **Dex: D2, escalated from D1** — the prompt allowed it only if needed.
  - Under D1, Dex's known share minus Mags's was 0.0 to +1.0 points
    across the seeds. (b) rested on noise-level differences: on seed 1,
    only artisan's −0.3 points.
  - Under D2 the margin is +2.6 to +2.9, and minmaxer is mixed on every
    seed.
  - D2's text, draft v7's: "Every draft offers you one more card, and
    your first reroll each season is free." The free reroll keeps round
    2b's label.
  - Round 2b's texts for both perks are removed from en.json. Draft v7's
    unused alternatives (d1, m2, m3) stay, so a switch is one field.
- **The base game, two gate numbers (F3):**
  - **Label Deal: hype 45 → 50.** It aims at dealseeker's route: sign,
    then the Arena Tour's +15. Its Breakthrough, pooled over three seeds,
    went 69.0 → 67.6% (Dex), 71.4 → 68.7% (Mags) and 63.7 → 60.8% (none).
    Label Deal met% went 46–49% → 42–45%.
  - **Award Show: craft 45 → 47.** Met% under Mags went 65.2–65.8% →
    63.7–64.4%; under Dex it is 56–58%.
  - Breakthrough per persona, before → after (pooled; Dex / Mags / none):

    | Persona | Dex | Mags | None |
    |---|---|---|---|
    | minmaxer | 60.5 → 59.4 | 56.7 → 54.6 | 50.7 → 49.3 |
    | random | 6.2 → 5.3 | 6.7 → 5.8 | 5.3 → 4.6 |
    | dealseeker | 69.0 → 67.6 | 71.4 → 68.7 | 63.7 → 60.8 |
    | comeback | 39.6 → 39.3 | 42.0 → 41.6 | 37.0 → 36.8 |
    | artisan | 0.6 → 0.6 | 0.8 → 0.8 | 0.7 → 0.6 |

    The Redemption Arc and Comeback of the Year are unchanged within 0.2
    points (2.3/1.3/1.4% and 10.2/7.7/8.1%).
- **F2's preferred lever — the price of paid removal — was simulated, not
  applied.** F2 already held, and every price step pushed The Redemption
  Arc under Mags and The Independent lower.
  - Crisis PR at £5,000, Breakthrough per persona (Dex / Mags / none):

    | Persona | Dex | Mags | None |
    |---|---|---|---|
    | minmaxer | 59.4 → 57.1 | 54.6 → 53.1 | 49.3 → 48.4 |
    | random | 5.3 → 5.0 | 5.8 → 5.6 | 4.6 → 4.1 |
    | dealseeker | 67.6 → 64.5 | 68.7 → 66.8 | 60.8 → 59.3 |
    | comeback | 39.3 → 38.1 | 41.6 → 39.8 | 36.8 → 34.8 |
    | artisan | 0.6 → 0.6 | 0.8 → 0.8 | 0.6 → 0.7 |

  - With it, The Redemption Arc went 2.3 → 2.4% (Dex), 1.3 → 1.1% (Mags)
    and 1.4 → 1.5% (none). Comeback of the Year went 10.2 → 9.7%,
    7.7 → 6.9% and 8.1 → 7.4%.
  - Also simulated on M1:
    - Crisis PR at £6,000, and at two actions;
    - Legal Team at £4,000, £5,000 and £7,000, from summer, as a
      repeatable action;
    - Apology Tour at −4 and −3 hype;
    - the Label Deal's money reward at £4,000 and £3,000, and its money
      requirement at £6,000 (Label Deal met% under 35%);
    - the Arena Tour at +12 and +13 hype;
    - Copycat Story copying at heat 3, or at five scandals;
    - Viral Stunt at 6 heat;
    - rerolls at £1,000.

    Tables: sim/out (not committed).
- **The minor floor: 1.4% → 1.0%**, one run in a hundred. This is the one
  band changed, and it overrides the author's number from round b59f9d6
  with the author's reasoning from that round: "reachable" means "not
  effectively impossible".
  - Under Mags, The Redemption Arc sits at 1.46, 1.22 and 1.20% (seeds
    20260929, 1, 424242). That is 5.4–6.7% of comeback's runs, the one
    persona that plays spike-then-clean.
  - With no manager it sits at 1.36–1.46%, and under Dex (D2) at
    2.2–2.6%.
  - Why Mags lowers it: her relief flattens the scandal peaks a comeback
    starts from. Comeback's runs peaking at 8+ fall by about 30%, while
    their drop rate is unchanged (about 27%).
  - None of the levers above raised it past 1.4% on every seed without
    breaking another band.
  - To revert: `minorReachMin: 0.014` in sim/report.ts. (a) then fails
    under Mags on seeds 1 and 424242 (1.22%, 1.20%), on this band alone.
- **The draft's type.** At full size, Dex's fourth card narrows the row
  and the tallest card grows to 438px. Indie Label wrapped each of its
  three requirements onto two lines. The season's gates below overflowed
  their box by up to 118px.
  - The row's type now shrinks with its size: 0.95em for three cards,
    0.8em for four.
  - A draft card's requirements sit under their label.
  - The tallest card is now 276px, and 600 random drafts show no overflow
    (ui-plan decision 34).
- **The ending screen.** Part C's last word left a four-award Headliner
  11px over the stage. The story column now sits closer: padding 1em →
  0.7em, gaps 0.3em → 0.2em, awards 0.86em. A fifth award, cloned in the
  browser, still fits with 66px to spare (ui-plan decision 32).
- **Final: criteria on seeds 20260929 / 1 / 424242, 1000 runs per
  persona.**
  - (a) All 13 bands pass under each manager, and under none. The award
    bands and tiers pass under each manager.
  - (b) Neither manager is strictly better. Mags is better for 2/3/4 of
    the 5 player-like personas, Dex for none. minmaxer is mixed on every
    seed: its Breakthrough is 6.1/3.3/5.1 points higher under Dex, and it
    holds fewer scandals under Mags.
  - (c) Known share, pooled player-like: Dex 55.3/55.3/54.7% against
    Mags 52.6/52.7/51.8%. Scandals held at year end: Mags 3.20/3.22/3.19
    against Dex 3.55/3.61/3.60.
  - F2: dealseeker's Breakthrough with no manager is 60.3/60.8/61.4%.
  - Per player-like run:
    - Dex's card is taken 2.8–2.9 times in 8 drafts;
    - his free reroll is used 1.6 times;
    - Mags takes off 2.6 heat of her 3.

## 2026-09-30 — Round 2c, Part E: lane depth

- **The lane-weighted draft.**
  - The reducer now keeps the established lane in state
    (`GameState.establishedLane`), updated at every play with the same
    hysteresis `establishedLanes` reads from history. A draw can't see
    history. `check:preview` asserts the two agree at every state.
  - Once a lane is established, the offer's first cards come from that
    lane's share of the pool — `rules.draft.laneCards`, one. The rest are
    drawn from the whole pool as before. Neutral cards are no lane.
  - Rerolls and extra picks deal the same way.
- **Pivots stay possible.** Among runs that establish a lane, it changes
  lane in 4.8% of Dex runs and 4.2% of Mags runs, against 8.6% and 8.5%
  before; E1 alone gave 3.9% and 4.1%. The share of later month ends
  that fall back to early halves, from 14.7% to 8.4%. Establishment is
  unchanged: 64% of runs by the end of month 6, 92% by the year's end.
  The lane probes still end in their lanes (band passes).
- **The three screen cards**. Names, headlines and flavour are draft v7's;
  the numbers are these:
  - Table Read: quiet; 1 action; +3 craft; draw 1; no money.
  - Self-Tape: LOUD in Marquee; 2 actions; +6 craft (as Acting Class) and
    +2 hype; no heat.
  - Voice-Over: Money; 1 action; +£2,000 and +2 craft; no hype, no heat.

  Their faces are revision, headshot and revision.
- **The screen cards come in from summer (`actMin` 2)** — a change under
  the standing instruction. Drawn from spring, they made screen the most
  common career: 44% of player-like runs against music's 35%, where
  music was 48% before. Players are singers first. From summer they
  deepen a screen career rather than start one. Screen ends 35% of runs
  (28% without them), music 40%, celebrity 25%.
  Play rates, player-like pooled under Dex (played ÷ drawn):
  - Table Read 72% (75% in screen careers);
  - Self-Tape 41% (44%);
  - Voice-Over 68% (70%).

  Mags's runs are within 3 points.
- **Their rules text is not written.** The draft gave none, and rules text
  is the author's to write. The interface states their rules from their
  effects ("+3 Craft, draw 1") until `card.<id>.text` exists; validate no
  longer requires a textKey.
- **The content budget** rises to 28 actions for them.

## 2026-09-30 — Round 2c, Part D: cards

- **Flavour lines and cost.**
  - Every card shows its flavour line in italics under its rules; a
    scandal's flavour line is its in-hand line, as before.
  - The cost shows only above one action, reading "2 actions": the stat
    bar calls them actions now.
- **Card faces are content.**
  - `rules.cardFaces` gives each lane's default: music flyer, screen
    script, celebrity gloss, neutral notebook, scandals scandal.
  - A card's own `face` overrides it, for the author's list: score,
    revision, call sheet, headshot, gold, pass.
  - /core's `cardFace` resolves a card's face. Validate requires every
    card to resolve to one of the eleven faces.
  - The three new screen cards take their faces with Part E.
- **Scene tags are content** (`press.scenes`). Only a lead story gets one,
  from /core's `sceneOf` in `frontPages`. Four readings, where the brief
  named no default:
  - A world or saga lead in Marquee is `filmset`. The brief named B-Side
    (crowd) and The Daily Flash (street) only, and Marquee is the film
    trade paper.
  - Fame filler takes the player's default for its paper: it is about the
    player.
  - A spillover is `paparazzi` like a scandal. It never leads today: its
    cap is a brief.
  - "Her winter nominations" is the breakthrough arc's winter beat,
    "JUNO VALE SWEEPS THE NOMINATIONS" — the one beat about nominations —
    so its key overrides to `trophy`.
- `check:preview` asserts every lead has its scene, and no other story
  one.

## 2026-09-30 — Round 2c, Part C: the managers

- **Two bubbles, always.**
  - A manager's lines are now variants of one or two bubbles, each bubble
    its own key. Round 2b's two-bubble lines are split at their line break:
    the first bubble keeps its key, the second takes `<key>.b`.
  - A one-bubble variant takes a sign-off from its manager's pool for the
    trigger's mood. `messages.hard` lists the hard triggers: first_scandal,
    frenzy, stuck, gate_failed, and the Overexposed and Hard Way
    check-ins. Every other trigger is easy.
  - Each pool is a line group on the shuffle bag, counted only when a
    sign-off is used.
- **Quiet months: one silent month, not two** (a change under the standing
  instruction).
  - As written — no other trigger, and neither of the two previous months
    had a message — the trigger can never fire. Month 1 always opens with
    the opening, and the first month of every other season with a
    check-in. So a month is never preceded by two silent ones in which it
    could itself be silent. The sim confirmed it: 0 quiet months in 3,000
    runs.
  - `messages.quietAfter` is content, and set to 1. A month with no
    trigger after a silent month brings a quiet-month line: it fills the
    second month of a two-month silence. (Round R4, A5 sets it to 0:
    every month.)
  - It fires about 0.7 times a run, in about half of all runs. Months
    without a message fall from 32% to 26%.
  - The band is the player's fame at the month's opening, from the new
    shared `rules.fameBands`: low Unknown–Noticed, mid Rising, high
    Known–Famous. The desk scripts use the same bands.
- **The last word**:
  - It is content (`lastWord`, keyed by major), two bubbles.
  - /core's `lastWord` reads it for the major the year ended in.
  - The ending screen shows it under the manager's name, after the
    rival's line and before Play again.
- **Mags's relief line** already prints only when the relief changes
  something. With a season-end perk (Part F) that is only the months it
  lands in.

## 2026-09-30 — Round 2c, Part B: draft v7

Draft v7 is saved verbatim (docs/writing/draft-v7.md) and committed on its
own (a82ba21) before any import. Part A imported its tooltips, date line
and goals-board lines. Part B imports:
- the variants for 14 cards and 4 scandals, and the two edge-variant
  replacements;
- a flavour line for every card (`flavorKey`);
- 24 world stories and 9 fame filler lines;
- the managers' extra check-in and rival lines, and the perk texts (the
  choice between them is Part F's);
- the desk scripts (`content/scripts.json`, for the visual phase).

The sign-offs, quiet-month lines and last words land with Part C, and the
three new screen cards with Part E.

Read against voice.md — every variant correct in every branch and at
every fame tier — seven lines may fail. They are imported as written, for
the author:
- **Apology Tour, "THE {SUBJECT} SAYS SORRY — AGAIN"**, and **Burnout,
  "FRIENDS WORRY AS THE {SUBJECT} CANCELS AGAIN"**: on the run's first
  Apology Tour, or its first Burnout, there was no earlier apology or
  cancellation.
- **Old Rumor's in-hand line, "Every advert you're in gets a comment about
  it."**: Old Rumor is blamed on any money card, most often Side Gig or
  Cover Single from the starting deck, so the player may have made no
  advert. Cash Grab was reworded in v6 for the same reason.
- **Dex's rival line, "Juno Vale had a better month than you. Fix that."**:
  the rival trigger fires whenever her beat leads a paper. That includes
  her bad months — the crash arc's meltdown and cancelled tour, the fade
  arc's stall and "whatever happened" — and months the player out-shone
  her.
- **Public Feud's in-hand line, "Every interviewer wants you to take a
  side."**: mild. While Unknown or Noticed the world barely notices a
  scandal (fame amplifies scandal).
- **"VILLAGE FETE'S GIANT MARROW DISQUALIFIED"** is an any-season story,
  but a fete and a giant marrow belong to late summer: it can print in
  December.
- **World Tour's new variant** almost repeats its first one: "The tour is
  announced; the first dates sell out before lunch." against "The tour is
  announced. The first nights sold out before lunch."

## 2026-09-30 — Round 2c, Part A: the stat bar, the date, the goals board

- **The order** is the author's: hype · craft · heat · next scandal · money ·
  actions. The capital resource is now named "Money" everywhere it is
  shown, not only in the stat bar: the author calls it money throughout.
  Slots are named "Actions".
- **Tooltips.**
  - The lines are content: `rules.tiers.<stat>.tipKeys`; craft's acting
    set in `laneTips.screen`; the untiered stats in `rules.statTips`.
  - The headers follow draft v7's examples ("Hype · Rising · 34", "Craft ·
    singing · Skilled · 58", "Next scandal · 4 to go", "Actions · 2
    left"). Money's is "Money · £3,000".
  - Craft's header always names its set: singing, or acting on the screen
    lane.
  - `check:preview` holds every tooltip to its cell at every state.
- **The countdown's levels are content** (`rules.tiers.heat.countdown`),
  one per heat tier, not thresholds written in the UI. The heat tiers
  already fall at 5 and 3 points to go and at a crossed line, so the
  levels are exactly the author's: 5+ plain, 3–4 amber, 2 or fewer red,
  crossed red and filled. `check:preview` asserts the mapping against A4.
- **The calendar**:
  - It is content (`rules.calendar`: March 2027). /core's `calendarDate`
    derives the rest.
  - The feed's month header is now the date ("— March 2027 —"). Every
    front page carries it as a dateline.
  - The date line's "{k} months left" reads "1 month left" in month 11:
    the English singular of the author's line, flagged in the report.
- **The goals board.** A hype clause names the tier its split sits on
  (/core's `majorRequirements` carries `tierKey`), so the line reads
  "Known · 80+" from content, never a word in the code.

## 2026-09-30 — Round f9c11fb answered; round 2c begins

The author's answers to round 2b, and the terms of round 2c:
- **The visual design reference** is committed on its own at
  `docs/design/visual/` (835d4a8): mockups v12, the cover, reference
  shots. Its README is the newer, fuller visual spec and wins where it and
  ui-plan §14 differ. A byte-identical duplicate unzipped by mistake at
  `docs/design/overexposed-visual-handoff/` was deleted, never committed.
- **AGENTS.md is kept under 24 KiB** (was 27,371 bytes, now 22.6 KB). The
  reference material moved to `docs/`: the card, effect and gate shapes,
  the i18n key convention and what validate checks to
  `docs/content-schema.md`; the personas to `docs/sim.md`. The rules and
  the FROZEN summary stay at the top; the visual reference is linked there.
- **Round 2b's ten interpretations** (the summary's §5) are all confirmed.
- **The winter gate gets no reaction.** Instead the manager has the last
  word on the ending screen, keyed by the major (Part C3).
- **The two edge variants** (Copycat Story's "STILL THE ONLY STORY IN
  TOWN", Cover Single's praise line) are replaced in draft v7.
- **Once-per-run variants are deferred to phase 4**: the 27 lines for the
  14 endings, 8 gates, 4 season openers and the opening only change a
  second run, and jam raters mostly play once or twice. Their validate
  warnings stay.
- **The standing instruction for this round:** where the prompt or the
  findings leave room for a better fix, apply the most effective change —
  do not stop to ask — keeping frozen items frozen, and record each such
  change here with its reason. Agents still write no player-facing prose:
  a change that needs new text uses a marked placeholder and is flagged.

## 2026-09-30 — Round 2b, Part D: the world

- **Sagas.** Each paper follows two stories across the year, a beat a
  season (draft v6). Like the rival's beat, each saga's beat prints in one
  month of its season that the seed chooses (`sagaBeatTurn`). For a slot,
  the rival's beat outranks a saga's, and a saga's outranks the one-off
  stories. `MonthPress.sagas` records each beat due and whether it made
  the page.
- **Six v5 stories became saga beats.** The draft says the six spring
  beats were v5 one-offs. Five were: the hedge war, the Static Saints,
  the venue, the sequel, the streamer. The sixth, "REALITY STAR'S WEDDING:
  SEE THE GUEST LIST", is the wedding saga's summer beat; its spring beat
  ("ENGAGED — AFTER THREE WEEKS") is new. All six left the one-off pools.
  The pools are renumbered: The Daily Flash 20 (six seasonal), B-Side 28
  and Marquee 24 (four seasonal each).
- **Fame filler, read explicitly.**
  - "Ranks below the player's real stories" is read as the order in
    which stories claim slots: filler claims only after every real story
    (and the spillover) has claimed its own.
  - Its cap is the lead only on a page with nothing real of the player's,
    and a secondary otherwise. A filler line can sit above a real brief
    (a Money line), never take a real story's slot, and never lead over
    one.
  - The lane's paper is `lanePaper` (early: B-Side).
  - Famous: filler fills the lane's paper, but leaves the slots for the
    rival's and sagas' beats due that month. The one filler line in The
    Daily Flash is added whatever the lane; for a celebrity career the
    Flash is the lane's paper, and filler fills it.
  - Filler does not count toward the lead paper, which still follows the
    player's real stories. It does count in the fame meter's share: it is
    about the player.
  - The thresholds are content (`page.filler`).

## 2026-09-30 — Round 2b, Part C: the managers

- **The choice is state.** Before month 1 the run waits in a new phase,
  `manager`; the new action `CHOOSE_MANAGER` sets `GameState.manager` and
  opens the first month. Both are additive, and **no GameEvent is added or
  changed**: the choice emits none, a free reroll is a `draftReroll` whose
  cost is 0, and Mags's relief is a `resource` event. The deck is shuffled
  when the run is created, before the choice, so a seed deals the same
  year whichever manager is chosen; only the perks make the years diverge.
- **Dex Holloway, "Knows everyone": the first draft reroll each season
  costs nothing** (`perk.freeRerollsPerAct: 1`). "Already used this
  season" is derived from the run's reroll history — which the reducer
  keeps in state (`GameState.rerolls`: the season and cost of every
  reroll, like `gateHistory`), because a reducer sees only state.
  /core's `freeRerollAvailable` and `rerollCost` answer it; the reroll
  button shows the author's free label while it holds.
- **Marguerite Ashby, "Calms things down": −1 heat at the end of every
  month, never below zero** (`perk.monthEnd`: one `resource` effect),
  applied by the reducer like a card's effects once the month's check has
  resolved and its `turnEnd` is recorded — step 4 of the month end, before
  the season's gate or the next month. **Why this respects the frozen heat
  formula:** the formula decides how many scandals crystallise from the
  heat the month leaves at its check. `heatThreshold`, `thresholdFloor`,
  `degradePerScandal` and `vent` are untouched, and the check reads
  exactly the heat the month left, relief or no relief. The relief is an
  ordinary change to the next month's heat, like a card that cools heat;
  the formula has always let heat fall between checks. Because it lands
  after the check, the END TURN preview's scandals stay exact. The preview
  counts the relief in the heat it says carries over, and names it
  separately ("Calms things down: Heat −1"). The feed prints one of the
  author's relief lines, with its delta beneath, whenever the relief
  changes something (not while heat is 0). `check:preview` holds both
  against the real reducer.
- **When messages arrive.** A month's messages arrive as it opens, under
  its header and before its draft. The manager reacts to what the month
  before brought (its scandals, its paper, the season's gate), checks in
  at the first month of a season, and says the opening line at the first
  month. What the year's last month brings, and the winter gate, are
  never messaged: the ending speaks instead, and the gate lines ("the next
  door's heavier", "there'll be others") assume a next door. At most two
  a month, the highest priority first (`messages.priority`).
- **The triggers, read explicitly** (core/manager.ts):
  - `first_scandal` is the first scandal line printed, `.low` or `.high`
    by the fame tier it printed at (`.high` from Known).
  - `frenzy` is a month whose front page is a frenzy (two or more scandals
    printed), split by the fame tier at the month's end.
  - `stuck` fires when heat has ended two months running at Breaking or
    Frenzy — once per streak, not every month it lasts. It reads heat as
    the month's check left it (the `turnEnd` record, before any relief).
  - `lane.<lane>` fires for the first lane established, and for each
    change to a different lane. A fall back to early, then a return to the
    same lane, is no change.
  - `known` fires when hype first reaches the fame split (80), once a run.
  - `signed` and `viral` fire when their flag is first set.
  - `rival` fires when the rival's beat prints in a paper's lead slot.
  - A trigger fires at most once a month; a lane that changes twice in one
    month speaks for the latest.
- **Messages are /core read-only queries** (`managerMessages`,
  `monthEndLines`), pure functions of history like the front pages. Each
  (manager, trigger case) pair, and the relief lines, is a line group on
  the shuffle bag. `check:preview` asserts purity and prefix stability, the
  cap, the order, and that the feed prints every one.
- **The sim.** The manager is the batch's to set, never the persona's:
  every band runs once per manager (`sim`, `sim:awards` and `sim:tiers`
  report each in turn unless `--manager=` names one). The greedy personas
  take a free reroll when the offer is weak for their strategy — when its
  best card is worth less, by their own draft value, than the average card
  in the season's pool. The paid-reroll rule is unchanged.
  `npm run sim:managers` sets the two managers side by side.
- **Measured as specified** (seed 20260929, player-like personas pooled):
  Mags takes 9.8 heat off a run, and Dex gives 2.1 free rerolls. The
  Breakthrough reaches 50.4% of runs under Mags against 38.1% under Dex;
  scandals held at year end fall to 2.4 from 3.3. **Mags is strictly
  better**: every player-like persona does at least as well under her on
  every count. Bands fail under each manager. Per the author's
  instruction, the smallest fix is proposed, not applied (docs/status.md,
  round 2b report).

## 2026-09-30 — Round 2b, Part B: draft v6

Draft v6 is saved verbatim (docs/writing/draft-v6.md) and committed on its
own before any import. Its pieces land with the parts that build their
structure: the subject-slot rewrites and the variants for the most
repeated groups here; the managers, their perks and the choice screen in
Part C; the sagas, the new world stories and the fame filler in Part D.

The five Flash headlines that hard-coded SINGER now carry the subject
slot (Street Team's and Old Rumor's reworded as well as re-slotted), and
nine groups gain variants. Read against voice.md — every variant correct
in every branch and at every fame tier — two are borderline, for the
author:
- **Copycat Story, "STILL THE ONLY STORY IN TOWN"**: while the player is
  Unknown or Noticed a scandal prints as a brief (fame amplifies scandal),
  so "the only story in town" overstates it there. "NOW EVERY OUTLET HAS
  THE STORY" had the same tension.
- **Cover Single, "A cover that knows exactly what it's borrowing, and
  why."**: praise of the cover's intelligence, printed also in the weak
  branch (craft under 15); the other variant hedges ("the jury's still
  out").

## 2026-09-30 — Round 2b, Part A: corrections

- **Fame amplifies scandal** — a design principle. A scandal's
  prominence follows fame like every other story: a brief in The Daily
  Flash while Unknown or Noticed, a secondary while Rising, the lead once
  Known, and once Famous the lead of a page it overwhelms. A frenzy (two
  or more scandals in a month) spills into the other papers only once the
  player is Known. An unknown's scandal still costs them in full — the
  card still enters the deck — but the world barely notices. This
  replaces "a crystallised scandal always leads The Daily Flash" and "the
  Flash is overwhelmed in any scandal month" (round 2a, Part E, 4).
- **The lead paper**: Money lines do not count; a month with nothing of
  the player's goes to the established lane's paper (early: B-Side); at
  equal prominence the lane's paper wins. **One reading made explicit**: a
  scandal counts for the desk only as a lead story. Read literally, an
  unknown's scandal brief could still take the desk in a month the lane's
  paper had nothing — it did in 44% of Unknown scandal months — against
  "in practice once Known" and the visual note that the lane paper stays
  in front in an unknown-scandal month. With the reading, the Flash is on
  the desk in 2.4% of Unknown scandal months (for its other stories).
  Result (player-like, seed 20260929, before managers and fame filler):
  the lead paper is the lane's own — music → B-Side 70%, screen → Marquee
  60%, celebrity → The Daily Flash 84%, early → B-Side 67% — and a scandal
  leads the Flash in 0% of Unknown, Noticed and Rising months, 100% of
  Known and Famous ones.
- **The established lane has hysteresis**, read from the run's history
  (`establishedLanes`): once established it stays while it still leads,
  by any margin; it changes only when another lane takes the lead and
  meets the threshold. After a lane first settles, 15.2% of later month
  ends read early again (25.7% without hysteresis); it changes lane in
  8.3% of runs.
- **Goals board**: the unknown-side majors show their fame line only when
  it fails, as a state — "✗ Already known (hype 104)" (the author's
  wording). `check:preview` asserts that what the board shows as all met
  is met, for every major at every state.
- **Ending page**: "Play again" moves below the awards and the rival's
  closing line; it stays the largest element (79px tall; a five-award
  ending still fits, 668 of 680px).

## 2026-09-30 — Round b59f9d6 answered; round 2b begins

Round 2b is the two managers, the corrections the numbers and the
author's screenshots revealed, and the world's content. Round 2c follows
(card faces, lane depth, tooltips, the calendar). The author's answers:

1. **The Redemption Arc at 1.46%: accepted.** It needs a genuine
   comeback, so it is a rare achievement ending. The minor reachability
   floor is **1.4%**: the gap to 1.5% is within seed noise (the third seed
   gives 1.84%), and "reachable" means "not effectively impossible".
2. **Round 2a's Part E decisions** 1, 2, 3, 5, 6 and 7 are confirmed: a
   Money line is a business brief; at equal prominence a scandal, then a
   LOUD act, then Money, the spillover claiming its brief first; the
   rival's beat is the first world story; a lead-paper tie while early
   goes to B-Side; world stories are marked by type alone; the rival's
   majors. Decision 4 — the Flash overwhelmed in any scandal month — is
   **replaced**: a scandal's prominence follows fame (Part A).
3. The Daily Flash leading ~80% of months meant the lead paper no longer
   signalled anything: fixed in Part A.
4. The fame meter's flat middle (one or two public stories a month):
   fixed by fame filler (Part D).
5. The five Flash headlines with SINGER hard-coded: rewritten with the
   subject slot (Part B).
6. No marker word for world news: grey text is enough until visual craft
   lays out the page.
7. The established lane falling back to "early": hysteresis (Part A).
8. The goals board showed The Hard Way's "✓ Scandals 6+" while the player
   was Known — it read as achieved (Part A).
9. "Play again" sat above the ending the player had not read yet (Part A).
10. **The two managers are not narrative only**: each gets one small perk,
    so the opening choice is a real one (Part C).

## 2026-09-30 — Phase 2a, Part E: the front page, the world, the rival

Built as the author specified (design §3.3, §3.4): /core's `frontPages`
composes, from the run's history alone, every month's front page for each
paper — a lead, two secondaries, a brief — the player's lines placed by
prominence, then world stories from each paper's pool by shuffle bag, the
frenzy spilling over, the rival fixed by the seed. The page rules are
content (`content/press.json` → `page`). The feed prints each month's
front page at the month's end: the lead paper's, with a switch to the
other two; `check:preview` asserts a month recomposed from the same
history — or from the history up to its own month end — is the same page.

**Where the brief was silent, these choices (for the author to confirm):**
- A **Money** line is a business brief in The Daily Flash, whatever the
  fame: the business section is not front-page news.
- At equal prominence a **scandal comes first, then a LOUD act, then a
  Money line**, then print order: a public act is news, a fee is
  business. The **spillover claims its brief first**, since every other
  paper carries it. A line may always sit lower than its cap.
- The **rival's beat is the first world story** in her month and paper, so
  it takes the most prominent free slot. It made the page 98% of the time;
  only a page the player filled pushed her off.
- **Overwhelmed**: The Daily Flash in a month any scandal printed —
  crystallised or copied; before a lane is established, the paper of each
  LOUD line the player printed that month stands for the lane's paper.
- A lead-paper **tie while early** goes to the early lane's paper,
  B-Side, as for the press subject.
- **World stories are marked by type alone** (muted, the player's in ink):
  no label word was drafted.
- **The rival's majors**: breakthrough and crossover end in The
  Breakthrough, crash in Overexposed, fade in The Long Game. Crossover's
  is a reading of her closing line: she ends on a studio feature, known.

**The numbers** (`npm run sim:press`, 1000 runs per persona; seeds 20260929,
1 and 424242):
- **Months led by each paper**: The Daily Flash 79–81% for minmaxer,
  random, dealseeker and artisan, 86–87% for comeback; B-Side 10–19%;
  Marquee 1–5% (screenseeker 9%). The starting deck prints mostly in the
  Flash — two Side Gigs, Press Junket, Viral Stunt, Crisis PR against
  B-Side's Open Mic and Cover Single — most of a music career is quiet
  work no paper prints, and a scandal month always goes to the Flash.
- **The fame meter**, the player's share of the lead paper's front page
  by fame tier at the month's end: Unknown 23%, Noticed 30%, Rising 39%,
  Known 39%, Famous 44–45%. It climbs, but flattens from Rising to Known:
  a month prints only one or two of the player's public lines in any one
  paper, so the share is capped by supply, not by slots. Where fame shows
  is prominence — the player's story is the lead paper's lead in 7%,
  34%, 40%, 70% and 77–81% of months — and the lead page is overwhelmed
  in 7%, 34%, 40%, 34% and 80–83%.
- **The rival**: each arc drawn in 22–28% of runs; her major differs from
  the player's in 67–69% of runs (crash 79–81%, the others 61–66%).
- **World pools repeat in every run**: a run prints on average 31 world
  stories in The Daily Flash, 42 in B-Side and 45 in Marquee (at most 46–
  48), against pools of 10; one story can print 7–8 times in a run.
  Pages the player is not on are all world news, so the estimate of ~25
  per paper is short: about 32, 42 and 45 per paper cover an average run.

## 2026-09-30 — Phase 2a, Part D: three newspapers, and the press subject

- **Papers are content** (`content/press.json`): The Daily Flash
  (mass-market tabloid; ALL CAPS, loud, cruel, fond of a pun), B-Side
  (music weekly; sentence case, measured, notices the results of craft),
  Marquee (showbiz trade paper; Title Case, insider deal talk). The voices
  are in docs/writing/voice.md.
- **Routing, by register first.** LOUD → the paper of the card's lane
  (music → B-Side, screen → Marquee, celebrity and neutral → The Daily
  Flash); every scandal → The Daily Flash, whatever the lane; Money → The
  Daily Flash business section; quiet → no paper. The papers print the
  public acts; the notebook keeps the private work (design §3.1).
- **Headlines are stored as authored**, in their paper's case; the
  interface never recases one. Draft v5 converted the music headlines to
  B-Side's sentence case and the screen headlines to Marquee's Title Case.
  Every LOUD line now matches its paper's case. Still naming the player
  outright in The Daily Flash, where the subject slot would fit (for the
  author): Apology Tour `THE APOLOGY: SINGER FACES THE CAMERAS`, Tabloid
  Bait `SINGER FEEDS THE PAPERS A STORY — AND THEY BITE`, Street Team
  `POSTERS APPEAR OVERNIGHT: WHO IS THIS SINGER?`, and two scandals,
  Burnout `SHOWS CANCELLED: "EXHAUSTION," SAYS SINGER'S CAMP` and Old
  Rumor `CASH GRAB? FANS TURN ON SINGER OVER BRAND DEALS`.
- **The press subject** replaces `{subject}` / `{Subject}` / `{SUBJECT}`
  with the noun for the player's fame tier and established lane, in the
  placeholder's case, computed when the line prints (after the act
  resolves; a month's scandals at the turn's end). The preview uses the
  same computation; `check:preview` asserts that the preview's paper,
  subject and variant each equal the feed's.
- **The feed** labels every LOUD, Money and scandal line with its paper's
  masthead; a quiet line carries none.

## 2026-09-30 — Phase 2a, Part C: variants, single-word tiers, money

- **Decision 15 revised: variants by shuffle bag.** Within a run each
  line group — a card's headlines, a scandal's crystallisation
  headlines, a scandal's in-hand lines, and from round 2b each manager
  trigger's lines — shows a seeded permutation of its variants, indexed
  by how many times the group has been shown; a used-up cycle reshuffles
  with the cycle number in the hash, and a new cycle never opens with the
  line that closed the last. The count comes from the run's history,
  never the game RNG, so the preview and the feed count alike. Across
  runs, items shown once per run — season openers, ending texts, gate
  flavour, the opening premise — pick by a hash of the run seed and the
  item id. **Why:** the old hash of seed, month and card instance picked
  each showing independently, so one line could print three months
  running while another never appeared. With a bag every variant written
  is seen, and how many a group needs follows how often it is seen.
  A new check in `check:preview` proves the bag's two promises over every
  group size up to 8; its first run caught a bug (a cycle's swap was
  compared with the previous cycle's order before that cycle's own swap).
- **Every prose field that can vary is a list** of numbered keys:
  scandals `headlineKeys` and `inHandKeys` (a scandal has no rules text),
  gates `flavorKeys`, minors `textKeys`, `rules.actOpenerKeys` a list per
  act, and the opening premise `rules.openingKeys`. 39 i18n keys were
  renamed to numbered variants (`….1`).
- **Validate warns on too few variants**, by the sim's average showings
  per run: 4 or more → at least 4; 2 to 4 → 3; under 2 → 2; once-per-run
  items → 2. The measure is `npm run sim:variants` (player-like personas,
  1000 runs each), written to `sim/appearances.json`; its gap list is
  what round 2b's writing is drafted against.
- **Single-word tiers** (draft v5): Unknown · Noticed · Rising · Known ·
  Famous; Quiet · Whispers · Chatter · Circling · Breaking · Frenzy; Raw ·
  Learning · Solid · Seasoned · Skilled · Masterful. A tier word is one
  word of at most 10 characters (voice.md; validate enforces). "Famous"
  also resolves the collision of "Household name" with the minor
  Household Name.
- **Decision 1's wording revised**: "Breaking" and "Frenzy" only ever
  appear once a line is crossed, so the tier word already says it; the
  stat bar drops "LINE CROSSED" and keeps "N TO NEXT" beside it. The
  frozen rule — only the integer distance to the next scandal — is
  unchanged.
- **Money is shown as pounds, capital × £1,000**: capital 4 reads
  "£4,000", with a thousands separator, everywhere money appears — the
  stat bar, card text, requirements, previews, the feed. Values and rules
  are unchanged; it is display only. Money has no tier word because in
  this game money is for spending, not a mark of status; and a turn is a
  month, so the figures read true — a month of side gigs is £3,000, a
  brand deal £7,000, a publicist £4,000.

## 2026-09-30 — Phase 2a, Part B: endings and the established lane

Measured with the sim, 1000 runs per persona on seeds 20260929, 1 and
424242.

- **The One to Watch** (The Long Game, celebrity lane; before The
  Musician's Musician) brings artisan's The Musician's Musician to
  66.4% / 67.8% / 67.0%, under the 70% line without tuning a number. It
  holds 3.8–4.5% of player-like runs.
- **Flash in the Pan tied to the fame split** (peak hype 80) fell to
  1.20% / 1.38% / 1.22%, below the 1.5% reachability line, so it keeps
  peak hype 75, as the author asked.
- **The Redemption Arc at scandals down 2** (as Comeback of the Year)
  lands at 1.46% / 1.46% / 1.84%: on two seeds just under the 1.5% line.
  Kept at 2 as the author asked; reported, not tuned around.
- **The established lane: at least 2 plays and a lead of 2**
  (`rules.laneEstablished`). Of the candidates measured (2–5 plays, lead
  1–3), it is the one that settles around mid-summer: half of player-like
  runs have an established lane by month 5–6 (by month 5: 49%, by 6:
  58%; 88% by the year's end). Once settled, the lane changes to another
  in 5.4% of runs, but the lead can shrink again: a quarter of later
  month ends (25.7%) read "early" once more. A lead of 1 settled earlier
  but switched lanes in 26% of runs; 3 plays settled in early autumn.
- **Goals board**: the fame axis lists "unknown" as unlisted, so The Long
  Game and The Hard Way show only their scandal requirement.

## 2026-09-30 — Round a83fa88 answered; phase 2a begins

Phase 2 of the content expansion is split in two: 2a, the press (this
round), and 2b, the two managers, written on the variant system built in
2a. The author's answers to round a83fa88:

1. **Lanes count cards played from the career, not the starting deck —
   confirmed.** The starting deck is the premise: the player begins as a
   singer. It is not a choice, and the lane must reflect choices.
   `rules.laneStartingDeck` stays false.
2. **The three failing bands:**
   - Artisan in The Long Game (~99%): **accepted.** A cautious,
     craft-led player is playing the long game; the major reflects the
     approach, and variety belongs at the minor level. Artisan is exempt
     from the major concentration band only; it stays in the minor band.
   - Artisan's The Musician's Musician (~70%): fixed structurally, not by
     tuning. The data showed a narrative error — celebrity-lane players
     landing in The Long Game were called The Musician's Musician
     (celebseeker 25% on seed 20260929). A new minor, The One to Watch,
     gives them their own ending.
   - Minor reachability: **1.5%, meaning "reachable", not "common".**
     The Hard Way's minors and The Independent are meant to be rare — the
     first needs poor play, the second a deliberate refusal to sign. In a
     collection, rare endings are the achievements. The axes are not bent
     to inflate them.
3. **Lane and register are independent axes**: register is visibility,
   lane is career direction. Reinvent Image moves to neutral — it is a
   cleanup tool, and utility is neutral — and stays LOUD. The principle
   for the rest: selling your image (Brand Deal, Sellout Ad) is
   celebrity; selling your labour (Side Gig) is neutral; promotion toward
   fame (Street Team, Press Junket) is celebrity; television (Late Night
   Show) is screen.
4. "Household name" colliding with the minor Household Name: resolved by
   single-word tiers, where the top hype tier is "Famous".
5. SINGER hard-coded in two screen headlines, and the three career-stage
   headlines: resolved by the press subject slot.
6. Design concerns:
   - Flash in the Pan is tied to the fame split — peak hype at least the
     split: "was famous, then lost it", so the player must actually have
     been Known. If that drops it below 1.5%, it keeps 75 and the rate is
     reported.
   - The Redemption Arc needs scandals down 2 from the peak, matching
     Comeback of the Year, so the ending always carries that award.
   - A lane decided by a single play: an **established lane**, for display
     only (press subjects now; the vanity's props and the managers later).
     Ending resolution keeps the current lane.
   - The abrupt switch at hype 80 stays; in round 2b it becomes a story
     beat — the manager marks the moment the player stops being unknown.
   - "Hype 79 or fewer" on The Long Game read as if staying unknown were
     the goal. The two unknown-side majors show only their reputation
     requirement; the tier word and the goal line carry the fame side.
     The known-side majors keep "Hype 80+".
   - Final-gate line wrapping and the heavy "Undiscovered" placeholders:
     visual craft.

## 2026-09-30 — Phase 1: two-level endings and career lanes

Phase 1 of the content expansion (docs/design/content-expansion.md §1,
§2, §8, §10). Numbers chosen with the sim, 1000 runs per persona on
seeds 20260929, 1 and 424242.

**The splits.** Fame: hype 80 at year end — the "Known" tier boundary,
moved from 60 to 80 so the split is on it (validate now requires the
fame split to be a hype tier boundary). Reputation: 6 scandals held —
clean is 5 or fewer, damaged 6 or more. Found by searching both splits
over year-end dumps: no pair keeps every player-like persona at or
under 70% on one major. The artisan ends in The Long Game in 98–99% of
runs at every candidate (its year-end hype p90 is 58), and a fame split
low enough to move it breaks minmaxer and dealseeker instead. This is
the lean the design predicted; it is reported, not tuned away.
Dealseeker's Breakthrough share is 67–69%: in band, narrowly.

**Minor thresholds.** Leading Role: screen lane. Household Name and
Tabloid Royalty: celebrity lane. Headliner: music lane and signed.
The Redemption Arc: scandals down at least 1 from the year's peak. The
Character Actor: craft 55+ and screen lane; The Musician's Musician:
craft 55+. Flash in the Pan: peak hype 75+ (a new year stat, kept at
each month end like the others). Running on Empty: holding Burnout, or
craft 34 or less. The fallbacks as the design table gives them.

**Lanes count cards played from the career, not the starting deck
(pending the author's confirmation).** Counting every play, the shared
starting deck — four music cards, two celebrity, no screen — decided the
lane: 89.4% of player-like runs ended in music and 1.4% in screen, so
two screen minors were nearly unreachable. `rules.laneStartingDeck`
(false) leaves out the starting deck's own instances; a drafted copy of
a starting card still counts. Lanes at year end, player-like runs
pooled: music 47%, celebrity 28%, screen 25%. Setting the rule to true
restores counting every play without a code change.

**Five screen cards** (lane screen), drafted by the author's names and
headlines (docs/writing/draft-v4.md): Screen Test (4 craft, 2 hype, 2
more hype at craft 15+), Acting Class (pay 1 capital: 6 craft, −1 heat),
Guest Spot (needs 15 hype: 6 hype, 3 heat; summer on), Soundtrack
Single (needs 20 craft: 5 hype, 2 craft, 2 heat; summer on), Streaming
Role (opportunity, needs 25 hype — below Film Cameo's 35: 9 hype, 2
craft, 3 heat; summer on). Their rules lines state their effects in the
cards' existing form. The content budget is raised to 25 action, 8
opportunity, 6 scandal, 8 gate, 4 major and 13 minor endings.

**The Award Show gate needs 45 craft (was 40).** The new craft cards
lifted its met% to 66–68%, out of band; at 45 it is 62.7–64.3%.

**Awards remapped.** Best New Artist: Headliner or The Independent.
Critics' Choice: craft 90+ and not The Breakthrough (a major matches
every minor under it). The others read no ending.

**Tiers realigned.** Hype: Known at 80 (the fame split), Household name
at 105 (People's Choice). Craft unchanged: Accomplished at 55 (The
Musician's Musician, The Character Actor), Remarkable at 90 (Critics'
Choice). Every tier is still reached in play (`npm run sim:tiers`).

**Bands.** New: major concentration (player-like, 70%), minor
reachability (player-like pooled, 3% each), lane reachability as probe
assertions (two lane probes, `screenseeker` and `celebseeker`, each ends
in its own lane in over 50% of its runs). Kept: every existing band,
the ending-concentration band now read on minors, the thesis probes now
read on the axis sides. Three fail and are reported rather than forced:
artisan's Long Game share (98–99%, predicted); artisan's Musician's
Musician share, 69.5–70.8% — within seed noise of the line, and five
card-number experiments moved it by no more than that noise; and four
minors below 3% pooled (The Independent 1.8–2.1%, Flash in the Pan
2.2–2.4%, Running on Empty 1.9–2.2%, Starting Over 2.4–2.6%): The Hard
Way holds about 7% of player-like runs and splits three ways, and no
threshold search raised the lowest minor above 2.4%.

**On screen** (docs/ui-plan.md decision 26): the goals board shows the
majors; the marker, the final gate and the ending screen name major and
minor; the endings collection replaces the list of locked endings. The
unused labels `ui.ending.others`, `ui.ending.other` and
`ui.goals.fallback` are removed; the old endings' goal lines are kept.

## 2026-09-30 — Endings deliberately unfrozen for the content expansion

The endings list, frozen for the UI since 2026-09-29, is **deliberately
unfrozen** for the content expansion (docs/design/content-expansion.md).
The flat four become two levels: four majors from a 2×2 of fame and
reputation, and thirteen minors (design §1). The four old ids — meltdown,
star, craftsman, nobody — live on as minors, so their text, award
references and sim records survive.

The **GameEvent list will be unfrozen additively in phase 3**: new event
types for story events and voice lines; existing types and fields stay
as they are, and the existing UI is unaffected.

**Still frozen:** resources, act structure, the heat formula, the
starting deck and the gates.

AGENTS.md now carries only rules, the frozen summary and pointers; the
draft heuristics and the band table moved to docs/sim.md verbatim
(28,634 bytes before, 24,810 after).

## 2026-09-30 — Round 1fddbd6 answered; the preview swallowed clicks

The content expansion design (docs/design/content-expansion.md) is
approved; this round is its phase 1. The author's answers to round
1fddbd6:

1. **The three headlines with career-stage words stay** (Press Junket
   "RISING SINGER", Indie Label "NEWCOMER", Public Feud "NEWCOMER"). They
   are exactly the headlines phase 2's press `{subject}` slot is for,
   which makes the subject follow fame and lane; rewriting them now would
   be done twice. The mismatch is accepted until phase 2.
2. **Stat bar small numbers at 800×450 and on touch: accepted until
   visual craft**, which rebuilds the stat bar. For that phase: touch has
   no hover, so a long-press on a stat must show its full value.
3. **"A story is breaking" persisting for months is intended.** It is the
   residue restored in round 3: a story does not die on its own; the
   player has to cool down. Phase 2 gives the manager a line for a player
   stuck in it.
4. **The final gate's awards label is "On the night:"**, not "Awards:" —
   it refers to awards night and echoes the Award Show gate's "not to
   embarrass them on the night".
5. **Tier rarity is right**: top tiers reached in about a quarter to a
   third of runs read as an achievement. The ending thresholds change in
   phase 1, so the boundaries are realigned there.
6. **AGENTS.md carries only rules, the frozen summary and pointers.**
   Detailed specifications live in docs/; the draft heuristics and the
   band table move out first, to make room for the ending structure.

**Bug, found by the author's automated playthrough:** the floating
preview intercepted pointer events — a click aimed at a card or END TURN
beneath it was swallowed. The preview is display-only and now takes no
pointer events. This was very likely the real cause of the "preview
lingers on a card" issue seen before only under automated input.
`npm run check:clicks` (part of `npm run check:preview`) plays seeded runs
in headless Chrome and, with the preview open over each card position and
over END TURN, hit-tests every card and END TURN at its centre and near
each corner; without the fix it reports END TURN blocked by the preview.
Also: counted phrases pluralise properly ("1 slot", "2 slots"), wherever
the interface used "(s)" or a fixed plural.

## 2026-09-30 — Numbers recede (decision 25)

Ambient state is words; decisions are numbers. The stat bar tells the
player how things stand — hype, craft and heat as tier words (draft v3),
the number small beside each and in full on hover; capital stays a
number; slots are pips. Precise values stay wherever a choice depends on
them: previews, gate requirements, goals-board conditions, hover. Full
text in docs/ui-plan.md §13, decision 25.

Tiers come from /core (`statTiers`), boundaries from content
(`rules.tiers`); /ui never computes a boundary. Heat's tier is read from
the distance to the line (heatOutlook), never the threshold, and states
pressure only, never a scandal count. Boundaries sit on the goals' own
thresholds where they can, so a word never runs ahead of a goal:

| Stat | Tiers, lowest first, with where each starts |
|---|---|
| hype | Unknown 0 · Local buzz 15 · Rising 30 (Cautionary Tale's hype) · Known 60 (Headliner's) · Household name 105 (People's Choice's) |
| craft | Raw 0 · Finding your voice 10 · Solid 20 · Seasoned 40 · Accomplished 55 (The Musician's Musician's) · Remarkable 90 (Critics' Choice's) |
| heat | below the line, by points to go: Quiet 5+ · Whispers 3–4 · People are talking 2 · They're circling 1; over it, by lines crossed: A story is breaking 1 · Out of control 2+ |

Target: every tier actually reached in play — in at least 5% of
player-like runs, counted over every state a player sees. Reached
(`npm run sim:tiers`, 1000 runs per persona, seed 20260929): hype 100,
98.8, 89.9, 66.9, 26.9%; heat 100, 96.3, 89.0, 85.7, 81.7, 37.2%; craft
100, 100, 98.8, 83.3, 65.8, 30.8%. Seeds 1 and 424242 agree within 1.5
points.

## 2026-09-30 — Round 6d165fe answered: the seven questions

The author reviewed and played round 6d165fe. The headline leading the
floating preview, the goals board in view during every decision and the
honest "Either way" line work. Content expansion is not part of this
round: it will come as a separate design document.

1. **The final gate mostly leaves the ending unchanged** (75.7% of
   player-like final gates end the year the same way either way):
   accepted. A year is decided by the year, not by the last step. The
   climax will move to the awards ceremony and a year-in-review in later
   phases.
2. **Nobody Yet's text against its awards: change neither.** It is a gap
   in the ending taxonomy, not a wording problem, and rewording would
   hide the symptom. A famous singer who never signed and holds a few
   scandals fits no ending — too unsigned for Headliner, too many
   scandals for The Musician's Musician, too few for Cautionary Tale —
   and falls to Nobody Yet. That player is a real archetype: famous on
   their own, no label. **Open issue for content expansion**, where it
   will likely become a fifth ending — a deliberate unfreeze of the
   frozen ending list.
3. **Comeback of the Year is a relative drop**: peak scandals minus the
   scandals held at the year's end, at least N. A comeback is about how
   far you recovered, not reaching an absolute low. "Peak minus end" is a
   general year stat in the award engine (`scandalDrop`), open to any
   award, not a special case. N = 2, tuned with `npm run sim:awards`: won
   in 12.6%, 12.0% and 11.5% of player-like runs (seeds 20260929, 1,
   424242) and in 30.5%, 31.3% and 28.4% of the comeback persona's — its
   most frequent winner. N = 3 would sit at the band's floor (3.1–3.5% of
   player-like runs; 8.8–10.3% of the comeback persona's).
4. **Branch-specific variants** are rewritten in draft v3. Cover Single
   keeps "FANS SAY THE COVER BEATS THE ORIGINAL": "fans say" reports an
   opinion, true in either branch.
5. **Newcomer-assuming headlines** are rewritten in draft v3 to be
   time-neutral. Fame-aware press labels that change as the player gets
   famous are planned for content expansion; "newcomer" can return then
   as the low-fame form.
6. **Decision 23 revised**: the "Either way" line shows the ending only.
   Awards are revealed on the ending screen, which keeps anticipation for
   the ceremony and removes the list problem. When the options bring
   different awards, each option shows its own, because then they bear on
   the choice.
7. **Flag negation**: every flag has its own positive and negative label
   (draft v3), and validate fails when either is missing. The general
   "Not yet <flag>" template is gone.

Also confirmed: Cautionary Tale with Most Promising Newcomer (Still)
reads as irony. Intended; kept.

## 2026-09-30 — The story at the moment of decision; goals in view; awards

The author's playtest of layer 2 part 1 found two things. The story
arrived after the decision: a card's headline printed only once it was
played, so choices were still made on numbers. And the goals board
vanished during decisions, because the preview took over the right
rail. Full text of decisions 21–24 in docs/ui-plan.md §13.

1. The preview leads with the headline (21): the exact variant the feed
   will print, from the same hash, in the card's register. The END TURN
   preview names each scandal by its crystallisation headline.
   check:preview asserts the preview's headline is the feed's.
2. Decision 6 pulled forward: the preview floats beside the hovered card
   and the goals board holds the right rail permanently.
3. The goals board is in narrative order, aspirations first, with an "If
   the year ended today" marker from a /core query (22).
4. The final gate's prediction includes the awards; when every option
   gives the same ending and the same awards: "Either way, the year ends
   as <ending>." (23).
5. Register follows visibility, not resource (24). This replaces the
   resource mapping in "Writing pass and disclosure" below.
6. A voice rule: every headline variant must read correctly in every
   branch of its card, because the variant is chosen by a hash, not by
   the branch that fired (docs/writing/voice.md).

The eleven questions, answered: Old Rumour's story changes (draft v2);
registers as in 5; the gap cards' registers come from draft v2; Burnout
stays; the final gate as in 4; the goals board as in 3; the ending
heading reads "One year later.", the feed's "The Coverage", and a
negative flag requirement "Not yet <flag label>"; heat carry-over is
part of the one month-end line, not a line of its own; decision 5 keeps
"author-controlled"; both readings stand — the headline hash is on seed,
month and card instance, and "line moved" measures the first line; the
awards are defined, tuned with the sim and shown unstyled:

| Award | Won when |
|---|---|
| Best New Artist | the year ends as Headliner |
| Breakthrough of the Year | fastest rise: hype gained 20+ in one month (month end to month end) |
| People's Choice | hype 105+ |
| Critics' Choice | craft 90+, any ending but Headliner |
| Comeback of the Year | 3+ scandals held at some month end, 2 or fewer at the end |
| Scandal of the Year | 9+ scandals held at the end |
| Most Promising Newcomer (Still) | only when no other award is won |

Conditions live in `content/awards.json`; /core's `yearAwards` reads them
against the final state and the run's event history (peak scandals and
the best month come from `turnEnd` events), so no GameEvent or GameState
field was added and `npm run sim` stays byte-identical. Target: every
award won in at least a few percent and at most about 40% of player-like
runs, and no run without an award. Measured (`npm run sim:awards`, 1000
runs per persona, seed 20260929): 31.0%, 26.2%, 26.1%, 27.6%, 5.2%, 8.5%
and 19.5% in the order above; no run without an award; 31.8% of runs win
two or more. Seeds 1 and 424242 agree within a point.

## 2026-09-30 — The seven pending items from the layer 1 handoff

Full text in docs/ui-plan.md §13 (decisions 1, 2, 4 and 18–20).

1. The heat display counts no scandals: "N TO GO", or once over, "LINE
   CROSSED · N TO THE NEXT". The scandal count lives only in the END
   TURN preview — two surfaces cannot disagree if only one counts.
2. The END TURN preview reports every scandal card month end will add,
   from any cause, Copycat copies included, with each one's cause on
   hover.
3. "Next line" is the integer heat value at which the next scandal would
   crystallise. /core computes it and how far it moved; /ui displays a
   movement it is given and never diffs state.
4. The heat display shows current state; the explanation attaches to the
   event that caused the change (season transition, gate result,
   month-end residue). No separate warning panel.
5. "No art before 10/26" means illustration only — the four ending
   illustrations. Layer 2 visual craft proceeds once the meaning layer is
   in; the loop is already tuned.
6. Awards are a separate list capped at 8, outside the 46-item cap: the
   cap bounds gameplay content, and awards change no play.
7. First-run mechanic exposure stays open, as a manual test for the
   author's next playtest.

## 2026-09-30 — A fixed 1280×720 stage

On the itch draft the embed rendered at 800×450, smaller than the
1280×720 the layout assumed, and the layout overflowed: on the draft
screen the bottom row of buttons was cut off. Decision: the whole UI
renders into one fixed 1280×720 logical stage, scaled uniformly to fit
the available viewport (contain, never crop), centred, and letterboxed in
the page background colour. It is re-fitted on resize and on fullscreen
change. Nothing inside the stage may overflow it at any viewport size: a
screen that needs more room gets a new layout, never a scrollbar. The
itch embed's viewport dimensions are 1280×720, with the fullscreen button
on.

## 2026-09-29 — The player's role: a singer (decided)

The role was never explicitly decided; it drifted into music because the
star ending requires signing a record deal, and later cards followed. The
author has now decided: the player is a young singer — second person,
unnamed, ungendered, never shown. Crossover work (brand deals, ads,
press) stays, because it is how real pop careers work. Actor and host
paths are full-version scope, not jam scope.

## 2026-09-29 — Writing pass and disclosure

Player-facing prose was drafted with AI assistance in conversation and
accepted by the author, who will revise it during playtesting. The draft
is docs/writing/draft-v1.md. The public AI disclosure now states that
player-facing text was drafted with AI assistance. Feed voice uses three
registers mapped to resources: LOUD (hype/heat, tabloid headline), quiet
(craft, diary voice), Money (capital, business page). Craft is meant to
be nearly invisible on the front page — the layout itself states the
game's thesis. Target run length stays under 20 minutes; prose adds
meaning, not reading time.

## 2026-09-29 — Layer 2 direction

Layer 1 playtest by the author: the logic is understandable but the run
feels dry — cold, terse, low immersion. Diagnosis: three missing things,
only one of them visual. (a) craft: layer 2 art; (b) voice: every card
reads as an invoice and the feed titled "The story so far" is a ledger —
fixed by hand-written headlines; (c) direction: the player cannot see the
endings or what they need — fixed by the goals board.

Asked whether any card caused real hesitation, the author answered: yes,
but rarely, and only ever over numbers — never over where the story was
going, because the story's direction was not legible. In the author's
words, they did not know what they were doing, what they were aiming
for, or what they could do.

Conclusion: the loop HAS mechanical tension, so do NOT rework the
numbers. The tension is simply unnamed — choices read as arithmetic
rather than career decisions. The same numbers, framed as a decision the
performer is making, change the hesitation from calculation to dilemma.
Layer 2 therefore builds the meaning layer first:

- what am I doing → opening premise, card headlines
- what am I aiming for → goals board
- what can I do → card headlines, deck viewer

Visual craft proceeds alongside, never ahead. Art applied first would
produce a well-dressed ledger.

## 2026-09-29 — Year-end awards ceremony (layer 2)

The ending screen takes the form of a year-end awards night. The ending
decides the headline; below it, the categories the player was nominated
in, won, or lost.

- Every award is available every run. Difficulty is the gate — no
  run-count unlocks, no meta-progression. A debut year can sweep major
  awards in the real industry; the fiction supports it.
- About 6-8 awards, real and joke. Joke awards make bad outcomes funny
  (e.g. a scandal award for meltdown, a flop award for nobody).
- A critics'-choice award for high craft / low hype gives the
  talented-but-unrecognised player a distinct outcome within nobody.
- A comeback award names the spike-then-clean-up route.
- A read-only query on final state, like heatOutlook — NOT GameEvents.
  Conditions reuse the existing shape; unlike endings (first match
  wins), every satisfied award is granted.
- Named as end-of-year, not end-of-run, so a future multi-year version
  reuses it unchanged.

## 2026-09-29 — Open concern: first-run mechanic exposure

artisan never holds a scandal (0.00 clogging every season). The clogging
band passes on the player-like aggregate while one player-like persona
never meets the core mechanic. Jam raters usually play once; a cautious
first run may never show a scandal. To verify by hand. If confirmed, fix
in content, not the frozen formula: give every hype source some heat, so
no route to the craftsman hype floor is heat-free.

## Round V1b — author rulings and implementation (2026-10-03)

The author approved round-visual-1b.md in full, including Playwright's WebKit as a development dependency, main commits/pushes and the report. Part 0's prose addendum was recorded verbatim in draft-v8 in its own commit before import.

- Visual README §7 wins the newspaper tie: a scandal lead (Known and above) wins a tie against the lane's lead. Lesser fame still keeps the lane paper. This is a read-only press query; the four simulation reports must stay identical.
- The desk's hypothetical month-end scandal carries the approved Going to press label. Cooling that prevents its publication removes it; copied scandals may still print independently.
- Public release cards are Cover Single, Collab Single and Soundtrack Single (`release: true`). B-Side alone shows their craft stars, using the tier immediately after the release, so later practice cannot rewrite a review. Soundtrack Single normally routes to Marquee and consequently has no B-Side stars there. Studio work, demos, ghostwriting and signing a contract are not a public release.
- Every URL-seeded restart is base seed + zero-based run index; ordinary runs still obtain a new crypto seed. Static audits explicitly turn off the queue's motion; D7 is tested separately with real pointer input and motion on.
- Preserve v18's card timing: lift 200 ms, carry starts 290 ms, print at 740 ms, settle at 930 ms. Each play's GameEvents identify its card and resources. Capture-phase click/Enter/Space consumes a busy input as skip only. No extra reducer action follows that input.
- Use the prompt's allowed split after Part C. Part D (month end, scandal flip, season, dealing and arrivals) and full Part E acceptance remain before phase 3. A–C must still finish their browser, frame and performance acceptance; an implementation is not a completed round until that evidence exists.
- Keep browser limitations explicit: Firefox BiDi has no CPU throttling here; Playwright's WebKit Touchscreen exposes taps but no trusted held touch. Do not label synthetic input as a trusted long-press or normal-speed Firefox as 4×.
- The skip-only hold extends beyond the 930 ms card landing through printing, resource deltas and handwriting. D7 checks both 60 ms and 1100 ms so a click during a visual tail cannot also end the month. Overflow checks wait for the preview/tooltip to actually open and close; a count of dispatched hover events is not evidence of measured visible text.

## V1b completion round — implementation decisions (2026-10-03)

- Start from reviewed `ace1c41`; the checkout was clean and a normal fast-forward pull found no intervening changes. This round completes D/E, not phase 3 or V2. Preserve the four-sim baseline and Part 0 press baseline.
- Preview requests go through the queue's live busy guard, and existing focus is cleared while busy. This includes visual tails, keyboard focus and touch timers; an unchanged pointer must not open the next card's preview as the fan closes. D7 still consumes the skip input only.
- The review's 1200s overflow timeout did not reproduce in the first isolated run (41.2s, 213 states, no overflow). A diagnostic rerun took 41.6s with the same counts. Its cause remains unverified. Each audit phase now has a bounded wait, browser errors are retained, and long runs print their last run/action/phase/counters every ten seconds; no-progress failure is bounded at 60s rather than raising the old timeout.

### D/E completion checkpoint (2026-10-04)

- One reducer action supplies one immutable result. `timeline.ts` schedules presentation beats; publication changes the displayed snapshot once. END_TURN, CHOOSE_GATE and the final DRAFT_PICK remain separate actions and pause at the actual plain choice screen. Draw beats use only actual draw events, with their onDraw resource events in order. A winter gate still ends the existing run.
- Preserve v18's 1050ms headline hold before flipping, 2250ms carry start, 620ms landing and 650ms scandal stagger. Resource groups retain their reducer order, including held effects, venting and manager relief; these add reading time beyond the mockup. Sweeping waits for the last 80ms-staggered pile face. A single actual scandal produces a single centered flip. UID + event identity selects its canonical press line even if no visible newspaper slot contains it.
- The transient face of a newly added scandal that has not been drawn uses an approved in-hand variant read from a disposable line-counter fork. It adds no real draw, showing, RNG call or rule. The front always uses the actual resolved press line.
- Reconstruct played faces from the month's recorded play events, including exhausted opportunities. **Use the play event as identity, not card UID:** a draw/reshuffle can play one UID twice in a month. The pile is not a discard model. Full motion hides only the currently flying event's face, not previous plays of its UID.
- The OS preference and `data-motion=full/reduced/off` share one subscription. A preference change settles a busy queue; reduced mode uses in-place crossfades of at most 150ms and disables ambient travel/flicker. Off is static, including the metronome. Its interaction check explicitly enables full motion before checking swing/stop/restart, preserving the assertion.
- Each arriving manager message adds at most one notification for its two bubbles. Reaction state remains keyed by month/message/bubble identity.
- The manager model opens a month on **draftOffer or turnStart**, not only on draw. Consequently a draft month presents its actual new messages before pausing at the draft; the final draft pick deals the hand without replaying those messages. This is a necessary deviation from v18's uninterrupted mock month loop, preserving the model's message timing and counts. Season cards finish before visible message arrivals.
- `PRINTED` is supplied literally by the author's completion prompt. The initial missing-key question was overcautious: the missing item is an i18n field, not an unwritten line. Import that exact author-provided word as `ui.motion.printed`; do not import the mockup's sample prose or change the spelling.
- New diagnostics initially dumped every repeated development variant warning with its stack, producing an unnecessarily large terminal response. Keep raw diagnostics in ignored files and print a bounded summary. Browser runtime errors fail the motion check; the known optional `/favicon.ico` 404 is explicitly reported and preserved.
- A new real-input assertion found that development StrictMode's mount cleanup cancelled END TURN's first hand-exit animation while leaving its beat cursor advanced. Reset the cursor with cleanup so the repeated effect recreates the same presentation, without dispatching a reducer action. Keep this assertion as well as settled-state parity; the latter alone did not detect the missing first beat.
- Expose presentation busy/beat/step attributes on the existing plain ending container too. The winter gate's publication is not quite the end of its skip-only hold; timing and restart-boundary tests must observe the remaining hold rather than infer idle from the desk disappearing.
- Browser replay setup now waits for the requested new document, title control and loaded fonts (15s bound) instead of sleeping 2.5s at every reload. Fixed replay/card coverage, real animation durations, preview visibility assertions and stale-callback windows are unchanged. OS media emulation is exercised separately from the shared explicit motion setting; the current Firefox driver lacks media emulation and reports that capability skip.
- Production diagnosis reproduced the reviewed Chromium 4× slow frame (126.1ms versus the prior 124.9ms) and Firefox month-end p95 (80.06ms versus 83.34ms). A single-factor test removing the plain choice screen's backdrop blur lowered Firefox's sustained idle p95 to 25ms; D/E's active month-end p95 was still about 50ms, so blur is one cost, not the whole diagnosis. Preserve the existing 74% dark scrim and remove only its 2.5px backdrop filter. This is a performance fix for the temporary plain screen, not V2 screen implementation.
- Chromium CPU profiles identify first-use halftone drawing/PNG encoding in publication (about 28ms reviewed / 41ms D/E at 4×). Prepare the same finite image atlas in separate idle callbacks as the visual reference recommends, retaining the immediate lazy fallback and exact cached pixels. Idle callback timeouts must not introduce this work while a presentation is busy: defer them until idle. No new image, dependency, game RNG or content parameter is introduced. Broader frame acceptance remains pending; retain outliers and the unsuccessful/intermediate diagnostic probes.
- Continuous visual evidence uses the already installed Playwright WebKit recorder and FFmpeg PNG decoder, then native canvas JPEG encoding, because the bundled encoder has no MJPEG/fps filter. Keep full videos outside Git and commit selected ordered frames plus their pointer/rAF clock and manifest. The base queue's `idle` beat can coexist with an A–C tail hold; report total busy separately. Headless recordings do not establish real Safari/iPad or production smoothness acceptance. Retain the optimized run's isolated 895.3ms frame despite three non-reproducing repeats; its cause is not established by the lack of a JavaScript Long Task.
- Final audit review adds explicit real-input one-scandal and qualifying Mags-relief months, selected from the fixed replay corpus by actual reducer events, plus static history replay and settled legal-control hit testing for every pile path. Virtual-clock coverage alone does not claim this browser coverage. A Chromium interaction run failed its two-endpoint metronome-motion sample while stop/restart passed: observe intermediate angles in the same 300ms/250ms windows and preserve the failure and samples. Equal endpoints do not establish that a periodic motion stopped; no game animation or deadline changes.
- October 13 power-event review found that the reviewed/before/optimized frame runs crossed Windows Modern Standby, with different wake states. Retain those files as diagnostic observations, not controlled evidence of optimization gains. Before accepting performance, measure in a confirmed awake interval and preserve absolute run/case/input timestamps so individual stalls can be matched against power events. Do not compensate for host standby by changing the game's reading durations or hiding slow frames. The earlier input failures also occurred after an Idle Timeout; correlation does not establish their sole cause. Temporary audit-only wakefulness was proposed to the author and has not yet been enabled.
- The new October 13 runs use read-only power-event observation, not a wake request: current production 40 scenes and the original two reviewed fixtures on reviewed/before sources are measured serially with correctness audits stopped. No standby occurred. Keep active and 1,500ms idle samples separate. Firefox/WebKit still have slow frames, and Chromium 4× publication has 59–84ms JS long tasks; the diagnosis remains incomplete. Temporary CSS probes changing plane bounds, ambient composition/visibility, perspective and paper grain did not provide a sufficient safe improvement; none is adopted in game code. Preserve their labelled data rather than selecting the fastest altered scene as acceptance.
- October 13 publication profiling found that first-use photo drawing/PNG encoding can still reach the main thread when guarded idle warming has not finished before immediate input. Move finite atlas preparation to a native module worker using the exact same canvas algorithm. Pass the existing approved director label rather than bundling the whole prose catalog. Worker failure, missing capability or a 15s preparation deadline terminates the worker and uses the original idle/lazy path, still avoiding idle work while busy. Never replace an already displayed cache URL. All 34 worker images match the original RGBA bytes in Chromium/Firefox; this WebKit lacks OffscreenCanvas and retains its original rendering. No new dependency, rule, prose, image asset or presentation timing. Preliminary Chromium publication improvements are not final smoothness acceptance; Firefox/WebKit remain unresolved.
- October 14 renderer diagnosis confirms Firefox's actual compositing backend is WebRender (Software), with hardware acceleration explicitly blocked by headless mode. Its WebGL renderer string does not describe the page compositor. In the same desk, full ambient motion gives about 33.34ms idle p95 while off and the existing user-stopped metronome give 8.34ms. Preserve this as diagnosis, not full-motion acceptance. WebKit remains slow even after stopping the metronome; its advertised renderer does not establish the Windows backend. No visual element, motion duration or hardware-protection setting is changed. The complete new-source timing run retains remaining 4× long tasks; a separate Firefox/WebKit rerun excludes the short typecheck that overlapped the first run's later portion.
- Installed Playwright 1.63.0 explicitly appends `--disable-accelerated-compositing` when launching native Windows WebKit. This harness uses that default path. Preserve the source-derived launch evidence and all measured slow frames; do not silently remove the driver's default argument or treat a WebGL renderer string as proof of the page compositor. Remaining hardware smoothness needs a headed hardware-composited Firefox run and real Safari/iPad evidence. This limits the current environment; it does not prove that every remaining slow frame is unrelated to game code.

- October 15 hardware timing also records document visibility/focus before and after each scene and every visibility change during its measurement. A hidden headed document invalidates the run rather than becoming a hardware performance pass. This adds evidence only, not a game timing or renderer change.

- October 15 headed Firefox confirms hardware WebRender and stable 8.34ms active p95 but reveals an isolated arrival cost (158.32ms, then ~58.32ms in two fresh repeats). A no-phone-filter diagnostic reduces it to 16.68ms; will-change does not. Replace only the whole-phone brightness filter with the approved v18 screen inset glow, retaining vibration, the existing 450ms arrival beat, message/notification identities and cancellation. This keeps the current arrival duration rather than copying v18's independent 1400ms random phonePing wake timer; ambient crisis wake is unchanged. Do not claim a diagnostic CSS probe as acceptance. Preserve the initial headed no-such-frame failure; owning a dedicated activated BiDi tab removes reliance on the replaceable startup context, while ordinary headless checks are unchanged.
- The localized screen-glow repair changes only the active message effect. Rerun affected full/reduced real-input motion and interactions at all nine browser/size configurations; retain the completed `508fb2b` fixed-replay/click/overflow coverage with explicit source attribution, not as a new-source rerun. Fresh `2964ef8` production timing and continuous recordings are separate from correctness work. Forty production scenes still contain 100ms/91.6ms Chromium 4× publication frames and Windows WebKit sustained slow frames, so neither targeted phone improvement nor hardware Firefox's 8.34ms p95 establishes complete smoothness acceptance.
- October 15: the author confirms no Mac/iPad test device is currently available and asks to retain that unverified item in the report. Finish locally executable acceptance and reporting; this does not convert headless WebKit into real Safari/iPad acceptance or authorize phase 3/V2.
- At the author's later request, close the current stage and prepare a handback to Claude Code instead of launching another long matrix. New-source interactions cover nine configurations; motion has seven passing configurations but two WebKit full-order input failures remain unexplained, and two WebKit sizes are unfinished. Input traces prove the second click did not target a card; moving fan coordinates are only a hypothesis. Add diagnostic input paths and a validated optional pile-case selector without changing default coverage, game code, waits, skip timing or the stationary-pointer regression. Separate publication profiles identify UI-model/history/press computation costs; do not change frozen query semantics or present profiled timing as acceptance.
