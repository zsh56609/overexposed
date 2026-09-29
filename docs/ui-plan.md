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
Title → new run
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
│ HYPE 34  CRAFT 21  CAPITAL 6  HEAT 4 · 3 TO GO             │  stat strip
├─────────────────────────────┬──────────────┬───────────────┤
│ This turn's front page      │ THIS SEASON  │ GOALS         │
│ one headline per card       │  gates, live │  Headliner    │
│ scandal = red lead story    │              │  Musician's   │
├─────────────────────────────┴──────────────┤  Cautionary   │
│ [card] [card] [card] [dead] [card] SLOTS   │  Nobody Yet   │  hand
│       [ END TURN · 1 scandal will print ]  │  (in view     │
│                                            │   always)     │
└────────────────────────────────────────────┴───────────────┘
```

The stat strip shows heat as integers only (§5): the heat value, then
"N TO GO", or "LINE CROSSED · N TO THE NEXT" once heat is over a line.
It counts no scandals; the count lives only in the END TURN preview.
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
(decision 6):

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

**Draft** — the offer (3 cards today, read from content), pick 1. Extra-pick and reroll are enabled per
legalActions, with cost shown on the button. Cards support preview,
through /core's "as if this card were in hand" query (decision 8).

**Gate** — 2 offered, pick 1. Each shows its flavour line (flavorKey)
and every requirement live as met / unmet.
The final gate is an informed choice: each option shows which ending it
leads to (decision 11) and the awards it would bring — "This ends the
year as: Nobody Yet · Critics' Choice". When every option gives the same
ending and the same awards, one plain line replaces the identical
predictions: "Either way, the year ends as <ending>." (decision 23).

**Goals board** — visible from the first turn, and through every
decision: it holds the right rail on its own (§3). The four endings, each
with its name, its goal line (goalKey) and what it requires, live via
explainCondition. The player must always know what they are steering
toward (decision 10). Narrative order, aspirations first — Headliner, The
Musician's Musician, Cautionary Tale, Nobody Yet — from each ending's
`boardOrder`, never its resolution priority. A marker labelled "If the
year ended today" sits on the ending the year would resolve to now,
from /core's `endingIfYearEndedNow` (decision 22).

**Deck viewer** — read-only deck and discard lists, sorted by name, never
revealing draw order (decision 12).

**Ending** — the ending and the year's awards (decision 16;
docs/decisions.md). The ending decides the headline.
- ending name and text, from the ending's nameKey and textKey
  (decisions 9 and 15)
- below them, every award won this run with its citation: a plain list,
  no reveal, no ceremony presentation (2026-09-30). Every award whose
  conditions hold is won; the fallback (Most Promising Newcomer (Still))
  only when nothing else is, so every year wins at least one. Conditions
  live in `content/awards.json`; /core's `yearAwards` reads them against
  the final state and the run's event history
- run summary (peak hype, scandals held, milestone flags such as signed,
  ...)
- **the other endings shown as locked**, each with its name and a
  one-line hint (its goal line) — "3 other endings remain"
- **"Play again" is the largest element on the screen and restarts in
  one click** once the screen has settled; a click during an animation
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
| **2 — Meaning and art** | The meaning layer first — goals board, feed headlines and headline fields, ending names, season openers, deck viewer. Visual craft alongside it, never ahead: type, palette, halftone, card layout, front-page setting, season transitions, per AGENTS.md §6 — not illustration, which is layer 4. Decisions in §13. |
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
   "LINE CROSSED · N TO THE NEXT". The scandal count lives in exactly
   one place, the END TURN preview. Two surfaces cannot disagree if only
   one of them counts. (Amended 2026-09-30.)
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
    - scandals: headlineKey (printed on crystallisation) and textKey
      (shown while in hand)
    - endings: nameKey, goalKey (goals-board line), textKey
    - gates: flavorKey; seasons: an opener key; the opening premise
    - awards: name and citation keys

    Variant choice must NOT consume the game RNG stream — that would
    change every sim result and break replays. Use a separate
    deterministic choice, e.g. a hash of run seed, turn and card id.
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
23. The final gate's prediction names the ending and the awards each
    option would bring: "This ends the year as: Nobody Yet · Critics'
    Choice". Only when both options give the same ending AND the same
    awards, say so plainly instead of showing two identical predictions:
    "Either way, the year ends as <ending>." check:preview asserts each
    prediction's awards are those of the real finished year. (2026-09-30)
24. Register follows visibility, not resource. Public acts are LOUD,
    private work is quiet, transactions are Money. Resource is a guide.
    Signing, apologising on camera and reinventing an image are public;
    networking is private. The rule and its table live in
    docs/writing/voice.md. (2026-09-30)

### Still open

- First-run mechanic exposure (docs/decisions.md, 2026-09-29): a manual
  test for the author's next playtest.
