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
  after the winter gate → Ending (the awards ceremony, §8) → play again
```

---

## 3. Main screen layout

A fixed 1280×720 logical stage, scaled to fit the viewport (§9).

```
┌────────────────────────────────────────────────────────────┐
│  OVEREXPOSED                          SPRING · MONTH 2 / 12│  masthead
├────────────────────────────────────────────────────────────┤
│  HYPE 34   CRAFT 21   CAPITAL 6          HEAT 4 · 3 TO GO  │  stat strip
├───────────────────────────────────────────┬────────────────┤
│                                           │ THIS SEASON    │
│   This turn's front page                  │  gates (live)  │
│   one headline per card played            │                │
│   scandal = red lead story                │  deck 8        │
│                                           │  discard 4     │
│                                           │  scandals 2    │
├───────────────────────────────────────────┴────────────────┤
│  [card] [card] [card] [dead] [card]       SLOTS ●●○        │  hand
│                         [ END TURN · 1 scandal will print ]│
└────────────────────────────────────────────────────────────┘
```

The stat strip shows heat as integers only (§5): the heat value, then
"N TO GO", or "1 SCANDAL DUE · N TO THE NEXT" once a scandal is due. There is no
proportional heat bar: a bar needs a denominator, which is the effective
threshold, which the frozen rules forbid displaying.

The END TURN button carries the end-of-month preview (§4). There is no
separate "if the month ended now" status line.

The centre panel is the event feed, set as this turn's front page. It
consumes the frozen event list directly, aggregated per action: one
headline per card played, its resource deltas beneath it, draws merged
into a single line, and scandals set as the red lead story. Headlines are hand-written content, read from the card's
headline field (§13, decisions 5 and 15). Pure typography, no
illustration.

The card preview is not a rail panel: it floats beside the hovered card
(§4). Layer 2 also adds the goals board (§8), the deck viewer (§8), and
moves the seed off the main screen into an unobtrusive corner, still
available for bug reports (decision 14). Where the goals board and the
deck viewer sit is a layer 2 layout call.

---

## 4. Preview — a first-class feature

Hovering (desktop) or long-pressing (touch) a card shows its outcome
before it is played, in a floating panel attached to the hovered card
(decision 6):

- the delta for each resource
- the resulting heat, in the integer display of §5
- whether it crosses the line — a light warning only (§5, decision 3):
  crossing sets up a scandal, which prints at month end only if heat is
  still over the line then
- for an unplayable card, the reason

Ending the month is the preview that matters most, and it is shown on
the END TURN button itself, e.g. "1 scandal will print" (decision 2).

Implementation: run the reducer on the hypothetical action (PLAY_CARD or
END_TURN) and read the outcome from the events it returns. A card that
is not in hand — a draft offer — is previewed through /core's "as if this
card were in hand" query (decision 8); /ui never assembles hypothetical
state itself.

**The preview must match the real outcome exactly.** This is tested:
`npm run check:preview` replays a batch of seeded states and compares
every preview with the real outcome.

The design principle is that failure is never random. Without a preview,
a scandal reads as a random penalty; with one, it reads as a consequence
the player saw and chose anyway. The principle is only perceptible
through this feature.

Gates get the same treatment: each requirement shown live as met or
unmet, plus pass and fail consequences.

---

## 5. Heat display

Follow the display rule frozen in AGENTS.md ("Displayed heat"). Integers
only (decision 1):

- normally **"N TO GO"** — points of heat until the next scandal
- once a scandal is already due: **"1 SCANDAL DUE"** (the number due),
  then **"N TO THE NEXT"**
- never show the effective threshold; a player must never see a
  fractional number — so no proportional bar
- the line can move: toward the player when held scandals lower the
  threshold or a new season tightens it, away from the player when a
  scandal is removed. That movement is itself information. /core provides a
  read-only query returning the integer position of the next line; /ui
  diffs it before and after (decision 4). The frozen GameEvent list is
  not touched. The season transition states how far the line moved this
  season (decision 13).

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

**Gate** — 2 offered, pick 1. Every requirement live as met / unmet.
The final gate is an informed choice: each option shows which ending it
leads to (decision 11).

**Goals board** — visible from the first turn: the four endings and what
each requires, live via explainCondition. The player must always know
what they are steering toward (decision 10).

**Deck viewer** — read-only deck and discard lists, sorted by name, never
revealing draw order (decision 12).

**Ending** — in layer 2, the year-end awards ceremony (decision 16;
docs/decisions.md). The ending decides the headline; below it, the
categories the player was nominated in, won, or lost.
- ending name and text, from the ending's nameKey and textKey
  (decision 9), written by hand by the author (decision 15)
- run summary (peak hype, scandals held, milestone flags such as signed,
  ...)
- **the other endings shown as locked**, each with its name and a
  one-line hint — "3 other endings remain"
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

1. Heat display — integers only. When a scandal is already due, show
   "1 SCANDAL DUE", then "N TO THE NEXT". Otherwise "N TO GO".
2. End-of-month preview is first-class, shown on the END TURN button
   (e.g. "1 scandal will print"). Remove the "If the month ended now"
   status line: two numbers that can disagree are worse than one.
3. Two beats, not one. A card that crosses the line gets a light warning
   only. The major beat is month-end crystallisation, and its animation
   ends at the discard pile.
4. Line movement: /core adds a read-only query returning the integer
   position of the next line. /ui diffs before and after. The frozen
   GameEvent list is not touched.
5. Feed: aggregate per action. One headline per card played, resource
   deltas beneath it, draws merged into a single line, scandals set as
   the lead story. Headlines are hand-written content — see decision 15.
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
15. Card schema gains a headline field (e.g. headlineKey) for the feed.
    All player-facing prose — card headlines, ending names and text,
    season openers, the opening premise — is written BY HAND by the
    human author. Agents build the fields, keys and placeholders; they
    do not write the shipping prose. The public AI disclosure states
    that all text is hand-written, and it must stay true.
16. The awards ceremony (see docs/decisions.md) is the form of the
    ending screen in layer 2.
