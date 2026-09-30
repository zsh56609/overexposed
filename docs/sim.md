# The sim: drafting heuristics and tuning targets

Reference for `/sim` (AGENTS.md §5). Moved here verbatim from AGENTS.md on
2026-09-30, so that AGENTS.md carries only rules, the frozen summary and
pointers (docs/decisions.md). Updated for the two-level endings and career
lanes (phase 1 of the content expansion, docs/design/content-expansion.md §8).

## Personas

Moved from AGENTS.md §5 (round 2c).

The personas: `minmaxer`, `random`, `crafter`, `hypechaser`, `dealseeker`, `comeback`, `artisan`. The greedy personas value flags by what they unlock: a flag some condition requires scores `flagUnlock`, one a condition forbids costs `flagLock`, each weighted by what reads it — ending 1.0 > gate 0.4 > card condition 0.1, summed over distinct tiers (per-flag overrides in `sim/personas.ts`); `dealseeker` weights flags heavily. `artisan` is the craft-leaning player (high craft, moderate hype, risk-averse; no weight is zero, so it stays player-like). `comeback` tests the design thesis — spike hype, then pay to clean up: it plays hype-heavy while holding fewer than N scandals and removal-heavy from N on. N is a fixed persona parameter (`COMEBACK_SWITCH_AT` in `sim/personas.ts`, 5), deliberately not derived from content: an instrument that shifts when you tune the system it measures is not an instrument. The lane probes `screenseeker` and `celebseeker` pursue one career lane each (Tuning targets, below).

## Drafting (greedy personas)

a card's draft value = the odds its `requires` holds when it comes up × its value per slot of one play. A one-shot (opportunity) is used up by its first play, so the repeatable part of its value counts min(1, 1 ÷ expected draws), where expected draws = remaining turns × hand size ÷ (cards owned + 1); setting a flag is permanent and counts in full either way. Odds, per clause, multiplied: a requirement met now = 1; an unmet minimum is projected at the run's growth so far and counts the share of the remaining turns in which it will hold (0 if it won't be reached in time, 0.5 on turn 1 with no history); a maximum exceeded now = 0.5; an act/turn window = the share of remaining turns inside it; a forbidden flag already held = 0 (flags are never unset); a required flag not held yet = 0.5. Reroll when the best card is worth less than the reroll's capital price; buy an extra pick when the best card left behind is worth more than its price. A free reroll (Dex's, round 2b) is taken when the offer is weak for the persona's strategy: its best card is worth less than the average draft value of the season's pool (the draftable cards whose `actMin` has been reached).

## Tuning targets

**Band population:** the player-like personas in `sim/personas.ts`, 1000 runs each on the same run seeds (`npm run sim -- --runs=1000`), **once per manager** (round 2b): the manager is the batch's to set, and every band must hold under each. Per-persona bands are checked on each persona separately; pooled bands pool the player-like personas with equal weight (equal runs each). Probes run on the same seeds but never count towards a pooled band: their draws must not set gate difficulty. A pass counts only after it also holds on two alternate batch seeds (`--seed=`).

**Two persona classes**, derived from weights, never from ids. A persona that gives an axis zero weight in every mode ignores that axis entirely and is a **control probe**: ignoring heat = heat, scandal and risk weights all 0 (today `hypechaser`); ignoring hype = hype weight 0 (today `crafter`). A persona that pursues one career lane in every mode (`lane` set, `lanePull` > 0) is a **lane probe** (today `screenseeker` and `celebseeker`: balanced weights, plus `LANE_PULL` = 6 per play of lead their lane holds over the next, and per play of one of their lane's cards — an instrument setting like `COMEBACK_SWITCH_AT`, fixed, not derived from content). Every other persona is **player-like** (`minmaxer`, `dealseeker`, `comeback`, `artisan`, and `random`, which weighs nothing). Probes are not player models but experiments on the design: a deterministic outcome means the experiment worked, so they are exempt from the concentration bands and carry assertions that fail if the design breaks. The majors those assertions name are derived from content too: collapse = the majors on the high ("damaged") side of the axis on `scandalCount`; top hype = the majors on the high ("known") side of the axis on `hype`. Music, the base lane, needs no probe; every other lane in `rules.lanes` must have one, or the lane band fails.

| Metric | Population | Band |
|---|---|---|
| Major concentration | each player-like persona separately, artisan exempt | no single major ending above 70% of that persona's runs |
| Ending concentration | each player-like persona separately | no single minor ending above 70% of that persona's runs |
| Minor reachability | player-like runs, pooled | every minor ending in at least 1.4% of runs |
| Thesis: ignoring heat collapses | each probe that ignores heat | the collapse majors (Overexposed, The Hard Way) in more than 80% of its runs |
| Thesis: ignoring hype never makes it big | each probe that ignores hype | the top-hype majors (The Breakthrough, Overexposed) in fewer than 5% of its runs |
| Lane reachability | each lane probe | ends the year in its own lane (`currentLane`) in more than 50% of its runs |
| Clogging: dead cards (scandals) drawn per turn, averaged per act | player-like runs, pooled | rising act by act — lowest in spring, highest in winter |
| Scandals held at run end | player-like runs, pooled | median 2–5 |
| Gate difficulty: met% (requirement already satisfied when offered) | offers to player-like personas, pooled | 35–65% per gate |
| Card play rate (played ÷ drawn) | player-like runs, pooled | every playable card > 2% |
| minmaxer vs random ending distribution | those two personas | significantly different (χ² p < 0.01 and total variation ≥ 0.2) |
| Soft-locks | all runs | 0 |
| Crashes | all runs | 0 |

"The spiral lands in winter" means clogging: the player never sees a crystallisation rate, they see how many of their five cards are dead this turn. Where crystallisation peaks is not a target.

The artisan persona leans hard toward The Long Game by design (docs/design/content-expansion.md §8). The author accepted it (round a83fa88): a cautious, craft-led player is playing the long game, so artisan is exempt from the major concentration band — and only that band; variety belongs at the minor level, where it is held to 70% like everyone. Minor reachability means "reachable" — not effectively impossible — not "common": the rare minors are the collection's achievements, and the axes are not bent to inflate them. The floor is 1.4% (round b59f9d6): The Redemption Arc, which needs a genuine comeback, sits at 1.46–1.84% across seeds, and a gap within seed noise is no reason to call an ending unreachable.

Diagnostics, reported but not bands: the pooled major, minor and lane distributions and gate pass% (passed when chosen), which measure the persona mix as much as the game — an aggregate can pass while every persona is locked into one ending; and the pooled aggregates recomputed with probes included (scandal median, gate met%, lowest play rate), for comparison only. Probe results beyond their two assertions are diagnostics.
