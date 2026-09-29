# Overexposed — UI plan

Scope and structure for the browser UI. Read alongside CLAUDE.md.
This document does not redefine anything CLAUDE.md marks FROZEN — it
references it. Visual direction lives in CLAUDE.md §6.

**Build one layer at a time. Only the current layer is in scope.**

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
    [turn 1 or 2 of the season] → Draft
    → draw → play → end turn → resolution (heat check, crystallisation)
    [last turn of the season] → Gate → season transition
  after turn 12 → Ending → run summary → play again
```

---

## 3. Main screen layout

Reference resolution 1280×720, fluid.

```
┌────────────────────────────────────────────────────────────┐
│  OVEREXPOSED                          SPRING · MONTH 2 / 12│  masthead
├────────────────────────────────────────────────────────────┤
│  HYPE 34   CRAFT 21   CAPITAL 6     HEAT ▓▓▓▓▓░░  3 TO GO  │  stat strip
├───────────────────────────────────────────┬────────────────┤
│                                           │ THIS SEASON    │
│   This turn's front page                  │  gate preview  │
│   one headline per GameEvent              │                │
│   crystallised scandal = red lead story   │  deck 8        │
│                                           │  discard 4     │
│                                           │  scandals 2    │
├───────────────────────────────────────────┴────────────────┤
│  [card] [card] [card] [dead] [card]       SLOTS ●●○        │  hand
│                                           [ END TURN ]     │
└────────────────────────────────────────────────────────────┘
```

The centre panel is the event feed, set as this turn's front page. Each
GameEvent prints as a headline; a crystallised scandal prints as the red
lead story. Pure typography, no illustration, consumes the frozen event
list directly. Layer 1: plain text list. Layer 2: front-page setting.

---

## 4. Preview — a first-class feature

Hovering (desktop) or long-pressing (touch) a card shows its outcome
before it is played:

- the delta for each resource
- the resulting heat and the distance to the next scandal
- **whether it crosses the line, and how many scandals would
  crystallise** — crossing must be unmissable
- for an unplayable card, the reason

Implementation: run the reducer on a hypothetical PLAY_CARD and diff
against current state.

**The preview must match the real outcome exactly.** This is tested.

The design principle is that failure is never random. Without a preview,
a scandal reads as a random penalty; with one, it reads as a consequence
the player saw and chose anyway. The principle is only perceptible
through this feature.

Gates get the same treatment: each requirement shown live as met or
unmet, plus pass and fail consequences.

---

## 5. Heat display

Follow the display rule frozen in CLAUDE.md. In short:

- show **"N TO GO"** — points until the next scandal
- never show the effective threshold; a player must never see a
  fractional number
- as held scandals lower the threshold, the line visibly moves toward
  the player — that movement is itself information

Crossing the line is one of the key moments of a run and gets its own
beat: heat passes the line → pause → the scandal card prints → it
shuffles into the deck.

---

## 6. Scandal cards

- Instantly distinguishable: red ground, italic headline, dashed border
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
- Do not lock input longer than necessary; a click fast-forwards.
- Layer 1 has no animation: apply events, settle on new state, keep the
  queue structure so animation slots in later without rewiring.

---

## 8. Draft, Gate, Ending

**Draft** — 3 offered, pick 1. Extra-pick and reroll are enabled per
legalActions, with cost shown on the button. Cards support preview.

**Gate** — 2 offered, pick 1. Every requirement live as met / unmet.

**Ending**
- ending name and text
- run summary (peak hype, scandals held, signed or not, ...)
- **the other endings shown as locked** — "3 other endings remain"
- **"Play again" is the largest element on the screen and restarts in
  one click**

The Engagement rating criterion is literally "do you want another run?"
The ending screen exists to make that zero-friction.

---

## 9. Viewport

- Reference 1280×720, fluid layout
- itch embed around 1280×720 with the fullscreen button on
- Desktop first — raters are overwhelmingly on desktop
- Mobile landscape must work; portrait may degrade

---

## 10. Layers

| Layer | Scope |
|---|---|
| **1 — Function** | A complete run playable in the browser. Every screen exists. Preview works. Ugly is fine. |
| 2 — Art | Type, palette, halftone, card layout, front-page setting, season transitions. Per CLAUDE.md §6. |
| 3 — Motion | Card flight, number roll-up, crystallisation hit-stop and shake, winter crowding. |
| 4 — Illustration | The four ending illustrations (public-domain collage). Not before 2026-10-26. |
| — Onboarding | After layer 2. Contextual hints, not a tutorial level. |

Build the current layer only. Painting a loop that has not been judged
by hand is the most common waste of time in a jam.

---

## 11. Layer 1 acceptance

- [ ] A full run completes in the browser, start to ending, no blocker
- [ ] Draft, play, gate, season transition, ending, play again all
      reachable
- [ ] Preview matches the actual outcome — automated check across a
      batch of seeded states
- [ ] No rule logic in /ui
- [ ] Production build deploys to an itch draft page and runs in Safari
- [ ] Cold load under 10s

---

## 12. Not in scope yet

Onboarding · sound · illustration · save (a run is ~20 minutes) ·
portrait layout · anything above the current layer
