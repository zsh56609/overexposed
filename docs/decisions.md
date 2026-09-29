# Decisions

Design decisions, dated, newest first. A design decision made in
conversation is written here in the same session (AGENTS.md → Session
rules).

---

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
