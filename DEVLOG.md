# Overexposed — devlog

## 2026-09-29 — Rules engine, balance sim, first tuning pass

No UI yet, on purpose: the rules engine and a headless balance simulator come first, so the loop is tuned before anything gets drawn.

- **Engine.** A pure TypeScript reducer with a seeded RNG, so every run replays exactly from its seed. Cards, gates and endings are JSON with ids and text keys only.
- **Simulator.** Five scripted players (minmaxer, random, crafter, hypechaser, dealseeker) play 1000 seeded runs each. The report checks our balance targets: every ending reached 10–45% of the time, 2–5 scandals held at the end, gates passed 40–80% of the time, no dead cards, no soft-locks.
- **The baseline failed 3 of 6 targets.** The causes were structural, so they were fixed in order, one commit each:
  - the simulated players ignored flags, which made the "star" ending look unreachable;
  - there was no way to acquire cards, so each act now opens with a draft, and capital buys an extra pick or a reroll;
  - heat crystallised at most one scandal per turn, and now crystallises one per full threshold;
  - single-threshold endings made pure craft the dominant strategy, so every ending now needs two axes;
  - one gate was locked forever by a single early card, and is now checked when you reach it.
- **Content to budget:** 20 actions, 6 opportunities, 6 scandals, 6 gates, 4 endings. The new cards trade between axes: spend craft to cool heat, spend hype or capital to bury a scandal. Scandals now hurt in different ways, and one of them copies itself while you stay hot.
- **One tuning pass**, one variable per run, 9 runs. All targets pass on three different seeds. Full log: `sim/out/tuning-log.md`.
- **Surprise of the day:** making heat "cascade" produced *fewer* scandals, not more, because each scandal now soaks up a full threshold of heat. That is now an open design question rather than a number to fudge.

Next: settle the open design questions, then card-pool balance, then the UI from 10/10.
