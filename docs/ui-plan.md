# Overexposed — UI plan

Scope and structure for the browser UI. Read alongside AGENTS.md.
This document does not redefine anything AGENTS.md marks FROZEN — it
references it. Visual direction lives in AGENTS.md §6.

**Build one layer at a time. Only the current layer is in scope.**

**Current layer: 2.** Layer 1 was built on 2026-09-29 (§11). Its findings
are folded into this plan; the decisions for layer 2 are in §13.

---

## 1. Principle: the human is the seventh persona

A sim persona does three things through /core. The UI does the same
three things through the same interface.

| Sim persona | UI |
|---|---|
| Asks /core for legal actions | Decides what is clickable |
| Runs the reducer on a hypothetical to score it | Powers the preview |
| Reads GameEvents after acting | Drives what the player sees happen |

**/ui never computes a rule.** No resource comparisons, cost checks,
condition checks, or threshold maths in /ui. Ask /core. A single
`if (capital >= 4)` in /ui means the rule now has two implementations,
and they will drift.

UI phase is derived from /core state. /ui does not keep a parallel
state machine.

---

## 2. Flow

```
Title → new run → choose a manager (round 2b)
  each turn:
    [a draft turn — turns 1 and 2 today, read from content] → Draft
    → draw → play → end turn → resolution (end-of-turn card effects,
      heat check, crystallisation)
    [last turn of the season] → Gate → season transition
  after the winter gate → Ending (the ending and the year's awards, §8)
  → play again
```

---

## 3. Main screen layout

A fixed 1280×720 logical stage, scaled to fit the viewport (§9).

```
┌────────────────────────────────────────────────────────────┐
│ OVEREXPOSED   seed · deck 8 · discard 4   SPRING · M2      │  masthead
├────────────────────────────────────────────────────────────┤
│ Hype Rising  Craft Solid  Cap 6  Heat Quiet  5 TO GO  ●●○  │  stat strip
├─────────────────────────────┬──────────────┬───────────────┤
│ This turn's front page      │ THIS SEASON  │ GOALS         │
│ one headline per card       │  gates, live │  Headliner    │
│ scandal = red lead story    │              │  Musician's   │
├─────────────────────────────┴──────────────┤  Cautionary   │
│ [card] [card] [card] [dead] [card]         │  Nobody Yet   │  hand
│       [ END TURN · 1 scandal will print ]  │  (in view     │
│                                            │   always)     │
└────────────────────────────────────────────┴───────────────┘
```

The stat strip is words first (decision 25): hype, craft and heat show
their tier — fame, skill, pressure — with the number small beside it and
in full on hover; capital stays a number; slots are pips (●●○). Heat
keeps its integers (§5): after its tier, "N TO GO", or "N TO NEXT" once
heat is over a line (the tier word — Breaking, Frenzy — already says it).
It counts no scandals; the count lives only in the END TURN preview.

The feed carries the press (phase 2a, decision 27): every LOUD, Money and
scandal line with its paper's masthead, a quiet line without one (the
notebook), and at each month's end that month's front page — the lead
paper's, with a switch to the other two.
There is no proportional heat bar: a bar needs a denominator, which is the effective
threshold, which the frozen rules forbid displaying.

The END TURN button carries the end-of-month preview (§4), the one
place scandals are counted. There is no separate "if the month ended
now" status line.

The centre panel is the event feed, set as this turn's front page. It
consumes the frozen event list directly, aggregated per action: one
headline per card played, its resource deltas beneath it, draws merged
into a single line, and scandals set as the red lead story. Headlines
are the author's content, read from the card's headline variants (§13,
decisions 5 and 15). Pure typography, no
illustration.

The goals board (§8) holds the right rail from the stat strip to the
bottom of the stage, so it stays in view through every decision, in
narrative order with the "If the year ended today" marker (decision 22). The card
preview is not a rail panel: it floats beside the hovered card (§4,
decision 6), inside the play area on the left, and never covers the
goals. The masthead carries the seed, in an unobtrusive corner and still
available for bug reports (decision 14), with the deck and discard counts
and the button that opens the deck viewer (§8).

---

## 4. Preview — a first-class feature

Hovering (desktop) or long-pressing (touch) a card shows its outcome
before it is played, in a floating panel attached to the hovered card
(decision 6). The panel is display-only: it takes no pointer events, so a
click aimed at a card or END TURN beneath it always lands
(`npm run check:clicks`).

- first, the headline the card would print — the exact variant the feed
  will use, in the card's register (decision 21): the story at the moment
  of the decision, not after it
- the delta for each resource
- the resulting heat, in the integer display of §5
- whether it crosses the line — a light warning only (§5, decision 3):
  crossing sets up a scandal, which prints at month end only if heat is
  still over the line then
- for an unplayable card, the reason

Ending the month is the preview that matters most, and it is shown on
the END TURN button itself, e.g. "1 scandal will print" (decision 2).
It counts every scandal card month end will add, from any cause —
crystallised, or copied by a Copycat Story. Hovering it floats a preview
that names each one by the headline it would print, with its cause
(decision 21).

Implementation: run the reducer on the hypothetical action (PLAY_CARD or
END_TURN) and read the outcome from the events it returns. A card that
is not in hand — a draft offer — is previewed through /core's "as if this
card were in hand" query (decision 8); /ui never assembles hypothetical
state itself.

**The preview must match the real outcome exactly.** This is tested:
`npm run check:preview` replays a batch of seeded states and compares
every preview with the real outcome — its headline included, against
what the feed prints once the card is played.

The design principle is that failure is never random. Without a preview,
a scandal reads as a random penalty; with one, it reads as a consequence
the player saw and chose anyway. The principle is only perceptible
through this feature.

Gates get the same treatment: each requirement shown live as met or
unmet, plus pass and fail consequences.

---

## 5. Heat display

Follow the display rule frozen in AGENTS.md ("Displayed heat"). Integers
only, and it counts no scandals (decision 1):

- normally **"N TO GO"** — points of heat until the next line
- once heat is over a line: **"LINE CROSSED · N TO THE NEXT"**
- the scandal count lives in exactly one place, the END TURN preview
  (§4, decision 2)
- never show the effective threshold; a player must never see a
  fractional number — so no proportional bar
- the line can move: toward the player when held scandals lower the
  threshold or a new season tightens it, away from the player when a
  scandal is removed. That movement is itself information. "Next line" is the
  integer heat value at which the next scandal would crystallise; /core
  computes it and reports how far it moved, and /ui displays the
  movement it is given, never diffing state itself (decision 4). The
  frozen GameEvent list is not touched.
- the display always shows current state, whatever caused it. The
  explanation attaches to the event that caused the change: the season
  transition says the line tightened, the gate result says heat was
  added, the month-end resolution says what residue carried over — as
  part of the one month-end line, never a line of its own, and not at
  all in the year's last month, which has no next month (/core's
  monthsLeft). No
  separate warning panel (decision 18). The season transition also
  states how far the line moved this season (decision 13).
- before the numbers, a pressure tier word (decision 25): Quiet,
  Whispers, People are talking, They're circling from the points still
  to go; A story is breaking once one line is crossed, Out of control at
  two or more. /core reads it off heatOutlook — the distance to the line,
  never the threshold — and it states pressure only, never a scandal
  count. It and "LINE CROSSED" always agree (check:preview).

Crossing the line and crystallisation are two separate moments
(decision 3):

- **Crossing** happens when a card is played and pushes heat over a
  line. It gets a light warning only: nothing has printed yet.
- **Crystallisation** happens at month end, when the heat check prints
  the scandals. It is one of the key moments of a run and gets the major
  beat: the check → pause → the scandal card prints → it goes to the
  **discard pile**, not into the deck. The animation ends at the discard
  pile. Animating the beat is layer 3 (§10).

---

## 6. Scandal cards

- Instantly distinguishable: red ground, italic title, dashed border
- When drawn: occupies a hand slot, not clickable, hover explains its
  ongoing penalty
- Winter hand-clogging is the emotional peak of the design. The hand
  should visibly feel crowded.

---

## 7. Events → animation

- The reducer returns new state plus GameEvents.
- /ui keeps an animation queue, plays events in order, then settles on
  the new state.
- **Every animation is skippable and can be sped up.** Jam raters play
  dozens of entries; anything that makes them wait costs score.
- Do not lock input longer than necessary. A click during an animation
  only fast-forwards; it never executes an action. The player acts again
  against the settled state (decision 7).
- Layer 1 has no animation: apply events, settle on new state, keep the
  queue structure so animation slots in later without rewiring.

---

## 8. Draft, Gate, Goals, Deck, Ending

**Manager** — before month 1 (round 2b, decision 29): the choice screen,
kicker, title and subtitle over two cards side by side — each manager's
name, role, quote, description, tag, perk (its name and its rule, plain
like a card's) and a sample text — then the footer. Each card is one
button.

**Draft** — the offer (3 cards today, read from content), pick 1. Extra-pick and reroll are enabled per
legalActions, with cost shown on the button — Dex's free label while his
free reroll lasts (decision 29). Cards support preview,
through /core's "as if this card were in hand" query (decision 8).

**Gate** — 2 offered, pick 1. Each shows its flavour line (flavorKey)
and every requirement live as met / unmet.
The final gate is an informed choice (decision 11). When every option
gives the same ending, one plain line says so: "Either way, the year
ends as <major> · <minor>."; otherwise each option shows "This ends the
year as: <major> · <minor>" (decision 26). Awards are the ending screen's to reveal: they appear on the
options only when the options bring different awards, each option with
its own ("On the night: Critics' Choice" — awards night), because then
they bear on the choice (decision 23, revised).

**Goals board** — visible from the first turn, and through every
decision: it holds the right rail on its own (§3). The four major
endings, each with its name, its goal line (goalKey) and its side of the
two axes — "Hype 80+", "Scandals 5 or fewer" — live via /core's
`majorRequirements`. The two unknown-side majors list only their
reputation requirement (the fame axis marks "unknown" unlisted): "Hype 79
or fewer" read as if staying unknown were the goal, and the tier word and
goal line carry the fame side. When the player is known, those majors show
their fame line as a failing state, never a goal — "✗ Already known (hype
104)" — so no major looks achieved from the other side of the fame axis
(round 2b, decision 28). The player must always know what they are
steering toward (decision 10). Narrative order, aspirations first — The
Breakthrough, The Long Game, Overexposed, The Hard Way — the order of
`majors` in content/endings.json. A marker labelled "If the year ended
today" sits on the major the year would resolve to now and names the
minor too — "The Breakthrough · Leading Role" — from /core's
`endingIfYearEndedNow` (decisions 22 and 26). Minors are not on the
board: the marker is how a lane shows as a destination.

**Deck viewer** — read-only deck and discard lists, sorted by name, never
revealing draw order (decision 12).

**Ending** — the ending and the year's awards (decision 16;
docs/decisions.md). The ending decides the headline.
- the major as the night's category, then the minor as the ending: its
  name and text, from the minor's nameKey and textKey (decisions 9, 15
  and 26)
- below them, every award won this run with its citation: a plain list,
  no reveal, no ceremony presentation (2026-09-30). Every award whose
  conditions hold is won; the fallback (Most Promising Newcomer (Still))
  only when nothing else is, so every year wins at least one. Conditions
  live in `content/awards.json`; /core's `yearAwards` reads them against
  the final state and the run's event history
- run summary (peak hype, scandals held, milestone flags such as signed,
  ...)
- **the endings collection** — "Endings found: 3 of 13", grouped by
  major, found minors named, the rest "Undiscovered". Kept in this
  browser only (localStorage `overexposed.endingsFound`, every access in
  try/catch): with storage empty or unavailable it shows this run's
  ending alone and never fails. A completion record only; it changes
  nothing in play (decision 26)
- **"Play again" is the largest element on the screen and restarts in
  one click**; it sits below the awards and the rival's closing line, so
  the player reads the ending first (round 2b, decision 28) once the screen has settled; a click during an animation
  only fast-forwards (decision 7)

The Engagement rating criterion is literally "do you want another run?"
The ending screen exists to make that zero-friction.

---

## 9. Viewport

- The whole UI renders into one fixed 1280×720 logical stage
  (ui/Stage.tsx), scaled uniformly to fit the available viewport —
  contain, never crop — centred and letterboxed in the page background
  colour. The fit is recomputed on resize and on fullscreen change.
- Nothing inside the stage may overflow it at any viewport size. A
  screen that needs more room than 1280×720 gets a new layout, never a
  scrollbar. (Layer 1's feed, a log of the whole run, scrolls inside its
  own column.)
- itch embed: viewport dimensions 1280×720, fullscreen button on. At
  800×450 the stage runs at 62.5%.
- `/check/embed.html` on the dev server shows the game in an
  itch-style frame at the sizes that matter, with a fullscreen button.
- Desktop first — raters are overwhelmingly on desktop
- Mobile landscape must work; portrait may degrade (the stage letterboxes
  to a narrow band)

---

## 10. Layers

| Layer | Scope |
|---|---|
| **1 — Function** | A complete run playable in the browser. Every screen exists. Preview works. Ugly is fine. Built 2026-09-29. |
| **2 — Meaning and art** | The meaning layer first — goals board, feed headlines and headline fields, ending names, season openers, deck viewer. Visual craft alongside it, never ahead: type, palette, halftone, card layout, front-page setting, season transitions, per AGENTS.md §6 — not illustration, which is layer 4. Decisions in §13; the approved visual direction in §14. |
| 3 — Motion | Card flight, number roll-up, crystallisation hit-stop and shake, winter crowding. |
| 4 — Illustration | The four ending illustrations (public-domain collage). Not before 2026-10-26. |
| — Onboarding | After layer 2. Contextual hints, not a tutorial level. |

Build the current layer only. Painting a loop that has not been judged
by hand is the most common waste of time in a jam.

---

## 11. Layer 1 acceptance

Built 2026-09-29, commit dcf231e. Known issues from the layer 1
playtest are listed in docs/status.md.

- [x] A full run completes in the browser, start to ending, no blocker
- [x] Draft, play, gate, season transition, ending, play again all
      reachable
- [x] Preview matches the actual outcome — automated check across a
      batch of seeded states (`npm run check:preview`: 300 runs,
      18,931 states, 0 mismatches)
- [x] No rule logic in /ui (`npm run validate`, code boundaries)
- [ ] Production build deploys to an itch draft page and runs in Safari
      — deployed to a draft 2026-09-30, where the embed rendered at
      800×450 and clipped; the fixed stage (§9) fixes that. Safari not
      yet tested
- [x] Cold load under 10s — measured locally (83.6 KB of gzipped JS,
      DOMContentLoaded 35 ms); re-check on the itch draft

---

## 12. Not in scope yet

Onboarding · sound · illustration · save (a run is 10–15 minutes) ·
portrait layout · anything above the current layer

Target run length is 10–15 minutes. Do not lengthen it.

---

## 13. Layer 2 decisions

**Layer 2 priority.** The author's playtest found the loop has mechanical
tension but no meaning: choices read as arithmetic, not career
decisions. Build the meaning layer first — goals board (10), feed
headlines and headline fields (5, 15), ending names (9), season openers
(13), deck viewer (12). Visual craft proceeds alongside, never ahead of
it.

### Corrections

- §3 layout: remove the proportional heat bar. A bar needs a
  denominator, which is the effective threshold, which the frozen rules
  forbid displaying.
- §5: crossing the line and crystallisation are two separate moments.
  Crossing happens when a card is played; crystallisation happens at
  month end. Scandals go to the DISCARD PILE, not into the deck.
- §12: target run length is 10-15 minutes, not ~20. Do not lengthen it.

### Decisions

1. Heat display — integers only, and it counts no scandals. It shows
   only where heat sits against the line: "N TO GO", or once over,
   "N TO NEXT" beside the tier word — "Breaking" and "Frenzy" only ever
   appear once a line is crossed, so the word already says it and
   "LINE CROSSED" is dropped (phase 2a). The scandal count lives in
   exactly one place, the END TURN preview. Two surfaces cannot disagree
   if only one of them counts. (Amended 2026-09-30, twice.)
2. End-of-month preview is first-class, shown on the END TURN button
   (e.g. "1 scandal will print"). Remove the "If the month ended now"
   status line: two numbers that can disagree are worse than one.
   The END TURN preview reports every scandal card that will enter the
   deck at month end, from any cause, Copycat copies included — it
   answers "what will actually happen". Show each one's cause on hover.
   (Amended 2026-09-30.)
3. Two beats, not one. A card that crosses the line gets a light warning
   only. The major beat is month-end crystallisation, and its animation
   ends at the discard pile.
4. Line movement: "next line" is the integer heat value at which the
   next scandal would crystallise. /core computes it and also reports
   how far it moved since the previous turn, so /ui displays a movement
   it is given and never diffs state itself. The frozen GameEvent list
   is not touched. (Amended 2026-09-30.)
5. Feed: aggregate per action. One headline per card played, resource
   deltas beneath it, draws merged into a single line, scandals set as
   the lead story. Headlines are author-controlled content — see decision 15.
6. Preview is a floating panel attached to the hovered card, replacing
   the fixed right-rail panel, which truncates in winter and forces the
   eye to travel between hand and corner.
7. A click during an animation only fast-forwards; it never executes an
   action. The player acts again against the settled state.
8. Draft preview: /core provides an "as if this card were in hand"
   query. /ui never assembles hypothetical state itself.
9. Endings get a nameKey (content, i18n, validate). Real names and text
   replace placeholders. Locked endings show their name and a one-line
   hint.
10. Goals are visible from the first turn: a board showing the four
    endings and what each requires, via explainCondition. The player
    must always know what they are steering toward. This is the main
    remedy for the run feeling aimless.
11. The final gate is an informed choice: show which ending each option
    leads to.
12. Deck viewer: read-only deck and discard lists, sorted by name, never
    revealing draw order.
13. Season transition: a beat stating how far the line moved this
    season, plus a one-line season opener.
14. Move the seed off the main screen into an unobtrusive corner; keep
    it available for bug reports.
15. Player-facing prose — schema:
    - cards: headlineKeys (an array of variants) and register
      (loud | quiet | money), which drives feed typography; the register
      follows visibility, not resource (decision 24)
    - scandals: headlineKeys (printed on crystallisation) and inHandKeys
      (shown while in hand)
    - endings: nameKey, goalKey (goals-board line), textKeys
    - gates: flavorKeys; seasons: opener keys; the opening premise
      (rules.openingKeys)
    - awards: name and citation keys

    Variant choice must NOT consume the game RNG stream — that would
    change every sim result and break replays. Revised in phase 2a
    (core/variants.ts, core/lines.ts): within a run, a line group — a
    card's headlines, a scandal's crystallisation headlines, a scandal's
    in-hand lines, and from round 2b each manager trigger's lines — is a
    shuffle bag: the variant shown is a seeded permutation of the group,
    indexed by how many times the group has been shown this run; a used-
    up cycle reshuffles with the cycle number in the hash, and a new
    cycle never opens with the line that closed the last. Every variant
    appears once before any repeats, and never the same line twice in a
    row. The count comes from the run's history, never the game RNG, so
    the preview and the feed count alike and the preview still shows
    exactly what will print. Across runs, items shown once per run —
    season openers, ending texts, gate flavour, the opening premise —
    pick by a hash of the run seed and the item id. Why: the old hash of
    seed, month and card instance picked each showing independently, so
    one line could print three months running while another never
    appeared; with a bag, every variant written is seen, and how many a
    group needs follows how often the player sees it (validate's
    'variants' check, from npm run sim:variants).
    All player-facing prose is controlled by the human author. Agents
    build fields, keys and placeholders, import prose the author has
    approved, and never invent shipping prose. The public AI
    disclosure must accurately describe how the prose was produced.
16. The awards ceremony (see docs/decisions.md) is the form of the
    ending screen in layer 2. The comeback award needs the peak number
    of scandals held during the run — derive it from the run's event
    history rather than adding GameState fields where possible. Every
    run receives at least one award.
17. Stage: the UI renders into one fixed logical 1280x720 stage,
    scaled uniformly to fit the viewport (contain, letterboxed, never
    cropped). Nothing overflows the stage. Layer 2 designs for exactly
    this one canvas.
18. The heat display always shows current state, whatever caused it.
    The explanation attaches to the event that caused the change: the
    season transition says the line tightened, the gate result says heat
    was added, the month-end resolution says what residue carried over.
    No separate warning panel. (2026-09-30; the carry-over is part of the
    one month-end line, not a line of its own every month — amended
    2026-09-30.)
19. "No art before 10/26" means illustration only — the four ending
    illustrations. Layer 2 visual craft (type, palette, layout, texture)
    proceeds once the meaning layer is in; the loop is already tuned.
    (2026-09-30)
20. Awards do not count toward the 46-item cap. The cap bounds gameplay
    content because it bounds balance and scope. Awards present an
    outcome and change no play. They are a separate list, capped at 8.
    (2026-09-30)
21. The preview leads with the headline. Hovering a card, the preview's
    first line is the exact headline that card would print — the same
    variant the feed will use, computed from the same hash. Then the
    numbers, then any line crossing. For a quiet or Money card, show its
    line in that register. The END TURN preview names the scandals that
    would print by their crystallisation headlines, not only by count.
    check:preview asserts that the headline shown in the preview is
    identical to the one the feed prints after the card is played. With
    decision 6 pulled forward from part 2 — the preview floats beside the
    card, the goals board holds the right rail — the story and the goal
    are both in view when the player chooses. (2026-09-30)
22. The goals board is in narrative order — Headliner, The Musician's
    Musician, Cautionary Tale, Nobody Yet: aspirations first, not
    resolution order. A marker labelled "If the year ended today" shows
    which ending the year would resolve to now, from a new /core
    read-only query (`endingIfYearEndedNow`, like heatOutlook). The
    reducer resolves the real ending with the same query, so the marker
    cannot disagree with it. (2026-09-30)
23. The final gate's prediction. The "Either way" line shows the ENDING
    ONLY: "Either way, the year ends as <ending>." — whenever both
    options give the same ending. Awards are revealed on the ending
    screen, which keeps anticipation for the ceremony and removes the
    list problem. When the two options bring DIFFERENT awards, show each
    option's awards on that option, because then they bear on the
    choice. check:preview asserts each prediction's ending and awards
    are those of the real finished year. (2026-09-30; revised
    2026-09-30 — first version: "This ends the year as: <ending> ·
    <awards>" on each option, "Either way" only when ending and awards
    both matched.)
24. Register follows visibility, not resource. Public acts are LOUD,
    private work is quiet, transactions are Money. Resource is a guide.
    Signing, apologising on camera and reinventing an image are public;
    networking is private. The rule and its table live in
    docs/writing/voice.md. (2026-09-30)
25. Numbers recede. Ambient state is words; decisions are numbers. The
    stat bar tells the player how things stand; precise values appear
    where a choice depends on them.
    - Stat bar: each tier word prominent, the number small beside it
      and in full on hover. hype — fame tier; heat — pressure tier,
      keeping "N TO GO" beside it; craft — skill tier; capital stays a
      number, money is naturally numeric; slots are icons (●●○).
    - Numbers remain in full wherever a decision uses them: previews,
      gate requirements, goals-board conditions, hover.
    - Tiers come from /core as a read-only query (`statTiers`); /ui
      displays them and never computes a boundary. Boundaries live in
      content (`rules.tiers`) and are tuned so each tier is actually
      reached in play (`npm run sim:tiers`).
    - Heat tiers are computed from distance to the current line (via
      heatOutlook), never from the threshold, so the frozen heat display
      rule holds. "A story is breaking" = one line crossed; "Out of
      control" = two or more. The tier describes pressure only — it
      never states a scandal count, so decision 1 holds.
    - A tier word must never imply a requirement is met when it is not.
      Requirement lines keep their exact numbers; no requirement is ever
      written as a tier. Where it can, a boundary sits on a goal's own
      threshold (Known at the fame split, the "Hype 80+" of The
      Breakthrough and Overexposed; Accomplished at the 55 craft of The
      Musician's Musician and The Character Actor), so a word never runs
      ahead of a goal the player can see. Validate enforces the fame
      split on a hype tier boundary.
    - For visual craft, which rebuilds the stat bar: touch has no hover,
      so a long-press on a stat must show its full value. Until then the
      small numbers at 800×450 and on touch are accepted.
    (2026-09-30)
26. Two levels of ending on screen (phase 1 of the content expansion,
    docs/design/content-expansion.md §1.5). The goals board shows the
    four majors, never the minors; the marker, the final gate and the
    ending screen always name both, as "<major> · <minor>"
    (`ui.ending.pair`). The ending screen reads category, ending, text,
    awards, then the run summary and the endings collection, which
    replaces the list of locked endings; the old endings' goal lines are
    no longer shown (their keys are kept). (2026-09-30)
27. The press in the feed (phase 2a; design §3.1, §3.4). Every LOUD,
    Money and scandal line carries a small masthead label — The Daily
    Flash, B-Side, Marquee; a quiet line has none: it is the player's
    notebook. At each month's end the feed prints that month's front
    page: the lead paper's by default, a lead, two secondaries and a
    brief, world stories in muted type and the player's in ink, with a
    minimal switch to the other two papers — each month opens on its own
    lead paper. World stories are marked by type alone: no label word was
    drafted. The three-paper desk is the visual phase's (below). The
    ending screen closes the rival's year under the awards. (2026-09-30)
28. Round 2b's corrections on screen. The goals board never lets a major
    look achieved from the other side of the fame axis: an unknown-side
    major shows its fame line only when it fails, worded as the state the
    player is in ("✗ Already known (hype 104)"). The ending page reads
    top to bottom — category, ending, text, awards, the rival's closing
    line — and then "Play again", still the largest element. The lead
    paper follows the player's lane (design §3.4). (2026-09-30)
29. The managers on screen (round 2b; design §3.2). Before month 1, the
    choice screen shows both managers with their perks (§8). The month's
    messages print in the feed as the month opens — under its header,
    before its draft — labelled with the manager's name set in reverse:
    a private voice, never a masthead, apart from the press. A
    two-bubble message shows as two lines. Mags's relief prints at the
    month end with its delta beneath, before what carries over; the END
    TURN preview names it by the perk ("Calms things down: Heat −1") and
    counts it in the heat carried. The reroll button shows Dex's free
    label while his free reroll lasts; the feed records a free reroll as
    such. (2026-09-30)

### Still open

- First-run mechanic exposure (docs/decisions.md, 2026-09-29): a manual
  test for the author's next playtest.

---

## 14. Visual phase

The visual direction the author approved through mockups (2026-09-30,
round 2a). Recorded here so it survives until the visual phase; **none of
it is built yet.** The phase designs for the one 1280×720 stage
(decision 17) and keeps everything inside it.

- **The scene**: a dressing-room vanity with a lightbulb mirror, drawn in
  true CSS perspective. The mirror is the private self — the goals as
  sticky notes on the glass; the papers are the public self.
- **The papers are traditional newsprint, not magazines**: grain, a fold,
  yellowed edges, ears beside the masthead, a dateline, columns of body
  text, black-and-white halftone photographs with captions. They differ
  within the newspaper idiom: a red-top tabloid (The Daily Flash); a music
  weekly with one spot colour (B-Side); a trade paper, dense, with a
  box-office table (Marquee). A glossy magazine was considered and
  rejected for the jam: it would bring a second visual language, and a
  cover structure the fame meter does not fit. It stays a possible fourth
  outlet for the full version.
- **The desk**: three papers stand at the back of the desk — the month's
  lead paper in front, the other two behind with their mastheads
  showing; clicking one pulls it forward (the feed's paper switch today,
  decision 27).
- **The notebook**: private work — the quiet register — is a notebook
  lying on the desk.
- **Props by lane**, standing on the desk: a metronome (music), a
  clapperboard (screen), a makeup-brush cup (celebrity), a plain coffee
  mug while no lane is established (/core's `establishedLane`). The
  metronome swings slowly when calm and faster in a frenzy, close to the
  mirror bulbs' flicker. No mask: the white half mask is another work's
  signature image.
- **A frenzy**: the desk fills with red clippings and crumpled paper —
  faceted, a different shape each ball.
- **The manager's phone** (round 2b, C4): a phone lies on the desk; as
  each month opens, the manager's messages rise from it as bubbles, one
  at a time, with an optional sound. A two-bubble message rises as two.
  In the unstyled build they are the feed's labelled lines (decision 29).
- **Stat bar**: six cells of one equal width, narrower than now (tier words
  are single words of at most 10 characters, so they fit). Action slots
  are three small glowing bulbs, the same bulbs as the mirror; a used
  slot goes dark.
- **The hand**: a fanned hand held close to the camera, overlapping
  slightly, lifting gently on hover; every card's name and values on
  fixed lines.
