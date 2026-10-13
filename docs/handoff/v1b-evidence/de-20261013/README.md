# V1b acceptance continuation — 2026-10-13

Game source is unchanged from `2e6a3f8`; this continuation starts from audit/evidence commit `ea8e573`. Each browser and viewport runs serially. No performance benchmark runs alongside these checks.

| File | Result / provenance |
|---|---|
| `firefox-clicks-20261005.txt` | Earlier completed October 5 run, all three sizes; not rerun today. Each 233 states, 1,101 controls, 716 previews, 3,756 targets / 18,780 points, D7 passes. |
| `firefox-overflow.txt` | October 13, all three sizes pass; each 213 states, 544 opened previews, 973 opened tooltips, 106 paper switches and 36 reactions. |
| `firefox-full.txt` | October 13, all three sizes pass; each 549 states, 1,422 opened previews, 2,548 opened tooltips, plus 50 fixed replays / 42 cards. |
| `firefox-interactions.txt` | October 13, all three sizes 22/22; one headless keyboard-focus group explicitly skipped per size. Real held touch opens the tooltip; trace locations are in the log. |
| `firefox-motion.txt` | October 13 01:37–01:55 local time, all three sizes pass. Stationary/moving/held-touch preview suppression and restored access; five pile fixtures with static replay and real settled hit points; eight month fixtures and actual boundaries. Headless keyboard and OS-media emulation skips remain explicit. No Kernel-Power 42/88/506/507 event occurred during this run. |
| `webkit-clicks.txt` | October 13, all three sizes pass; same 233 / 1,101 / 716 / 3,756 / 18,780 counts and D7. |
| `webkit-overflow.txt` | October 13, all three sizes pass; same 213 / 544 / 973 / 106 / 36 counts. |
| `webkit-full.txt` | October 13, all three sizes pass; 549 / 1,422 / 2,548 and 50 fixed replays / 42 cards. |
| `webkit-interactions.txt` | October 13, all three sizes 21/21; unsupported trusted held-touch group explicitly skipped. |
| `webkit-motion.txt` | October 13, all three sizes pass; full/reduced/off, previews, pile parity, actual boundaries and OS-media changes. Trusted held touch remains a capability skip. |
| `zip-verification.json` | Candidate `014eab3`, root index and relative assets verified. This ZIP predates the new photo-worker repair. |

These are correctness observations, not performance acceptance. Windows entered Modern Standby during part of the overflow run; progress and final assertions completed, but its duration must not be used as a controlled speed benchmark. Old invalid/interrupted runs and input failures remain under `../de-20261005/` and the local ignored cache. Nothing here replaces the reviewed simulation or press baselines.
