# V1b acceptance continuation — 2026-10-13

Game source is unchanged from `2e6a3f8`; this continuation starts from audit/evidence commit `ea8e573`. Each browser and viewport runs serially. No performance benchmark runs alongside these checks.

| File | Result / provenance |
|---|---|
| `firefox-clicks-20261005.txt` | Earlier completed October 5 run, all three sizes; not rerun today. Each 233 states, 1,101 controls, 716 previews, 3,756 targets / 18,780 points, D7 passes. |
| `firefox-overflow.txt` | October 13, all three sizes pass; each 213 states, 544 opened previews, 973 opened tooltips, 106 paper switches and 36 reactions. |
| `firefox-full.txt` | October 13, all three sizes pass; each 549 states, 1,422 opened previews, 2,548 opened tooltips, plus 50 fixed replays / 42 cards. |
| `firefox-interactions.txt` | October 13, all three sizes 22/22; one headless keyboard-focus group explicitly skipped per size. Real held touch opens the tooltip; trace locations are in the log. |

These are correctness observations, not performance acceptance. Windows entered Modern Standby during part of the overflow run; progress and final assertions completed, but its duration must not be used as a controlled speed benchmark. Old invalid/interrupted runs and input failures remain under `../de-20261005/` and the local ignored cache. Nothing here replaces the reviewed simulation or press baselines.
