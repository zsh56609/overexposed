# Decisions

Design decisions, dated, newest first. A design decision made in
conversation is written here in the same session (AGENTS.md → Session
rules).

---

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
    second month of a two-month silence.
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
- `PRINTED` is required by the prompt but no existing i18n key supplies it. `ui.motion.printed` deliberately remains a loud missing key while the earlier author question is pending; do not silently import mockup prose or claim final acceptance with this gap.
- New diagnostics initially dumped every repeated development variant warning with its stack, producing an unnecessarily large terminal response. Keep raw diagnostics in ignored files and print a bounded summary. Browser runtime errors fail the motion check; the known optional `/favicon.ico` 404 is explicitly reported and preserved.
