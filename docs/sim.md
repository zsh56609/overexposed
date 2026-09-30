# The sim: drafting heuristics and tuning targets

Reference for `/sim` (AGENTS.md §5). Moved here verbatim from AGENTS.md on
2026-09-30, so that AGENTS.md carries only rules, the frozen summary and
pointers (docs/decisions.md).

## Drafting (greedy personas)

a card's draft value = the odds its `requires` holds when it comes up × its value per slot of one play. A one-shot (opportunity) is used up by its first play, so the repeatable part of its value counts min(1, 1 ÷ expected draws), where expected draws = remaining turns × hand size ÷ (cards owned + 1); setting a flag is permanent and counts in full either way. Odds, per clause, multiplied: a requirement met now = 1; an unmet minimum is projected at the run's growth so far and counts the share of the remaining turns in which it will hold (0 if it won't be reached in time, 0.5 on turn 1 with no history); a maximum exceeded now = 0.5; an act/turn window = the share of remaining turns inside it; a forbidden flag already held = 0 (flags are never unset); a required flag not held yet = 0.5. Reroll when the best card is worth less than the reroll's capital price; buy an extra pick when the best card left behind is worth more than its price.

## Tuning targets

**Band population:** the player-like personas in `sim/personas.ts`, 1000 runs each on the same run seeds (`npm run sim -- --runs=1000`). Per-persona bands are checked on each persona separately; pooled bands pool the player-like personas with equal weight (equal runs each). Probes run on the same seeds but never count towards a pooled band: their draws must not set gate difficulty. A pass counts only after it also holds on two alternate batch seeds (`--seed=`).

**Two persona classes**, derived from weights, never from ids. A persona that gives an axis zero weight in every mode ignores that axis entirely and is a **control probe**: ignoring heat = heat, scandal and risk weights all 0 (today `hypechaser`); ignoring hype = hype weight 0 (today `crafter`). Every other persona is **player-like** (`minmaxer`, `dealseeker`, `comeback`, `artisan`, and `random`, which weighs nothing). Probes are not player models but experiments on the design thesis: a deterministic outcome means the experiment worked, so they are exempt from the concentration band and carry inverted assertions that fail if the thesis breaks. The endings those assertions name are derived from content too: the collapse ending sets a scandal floor; the top-hype ending demands the most hype among the endings that don't.

| Metric | Population | Band |
|---|---|---|
| Ending concentration | each player-like persona separately | no single ending above 70% of that persona's runs |
| Thesis: ignoring heat collapses | each probe that ignores heat | the collapse ending (meltdown) in more than 80% of its runs |
| Thesis: ignoring hype never makes a star | each probe that ignores hype | the top-hype ending (star) in fewer than 5% of its runs |
| Clogging: dead cards (scandals) drawn per turn, averaged per act | player-like runs, pooled | rising act by act — lowest in spring, highest in winter |
| Scandals held at run end | player-like runs, pooled | median 2–5 |
| Gate difficulty: met% (requirement already satisfied when offered) | offers to player-like personas, pooled | 35–65% per gate |
| Card play rate (played ÷ drawn) | player-like runs, pooled | every playable card > 2% |
| minmaxer vs random ending distribution | those two personas | significantly different (χ² p < 0.01 and total variation ≥ 0.2) |
| Soft-locks | all runs | 0 |
| Crashes | all runs | 0 |

"The spiral lands in winter" means clogging: the player never sees a crystallisation rate, they see how many of their five cards are dead this turn. Where crystallisation peaks is not a target.

Diagnostics, reported but not bands: the pooled ending distribution and gate pass% (passed when chosen), which measure the persona mix as much as the game — an aggregate can pass while every persona is locked into one ending; and the pooled aggregates recomputed with probes included (scandal median, gate met%, lowest play rate), for comparison only. Probe results beyond their two assertions are diagnostics.
