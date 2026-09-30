# Decisions

Design decisions, dated, newest first. A design decision made in
conversation is written here in the same session (AGENTS.md → Session
rules).

---

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
