# Status

**Current — 2026-10-16: stage closed for handback; V1b is incomplete; no phase 3/V2.** D/E and A–C carry-over repairs are implemented. Current game source `2964ef8` is committed/pushed. At the author's request, finish this stage and prepare a possible handback to Claude Code rather than start another long matrix. No audit remains running. [Whole-round Chinese report](reports/2026-10-15-v1b-acceptance.md), [handoff and exact resume commands](handoff/v1b.md).

The prior `508fb2b` source completed all 45 correctness configurations. New `2964ef8` source: interactions complete **9/9 configurations** (Chrome 24/24, Firefox 22/22, WebKit 21/21 per size, capability skips separate); full/reduced motion has passing results in **7/9 configurations** (Chrome/Firefox all sizes, WebKit 1280×720). **Two WebKit full-order continuous-input failures remain unexplained; WebKit 800×450 and 844×390 motion is unfinished.** A passing rerun does not erase failures. Small logs and traces: [de-2964ef8](handoff/v1b-evidence/de-2964ef8/).

**Phone repair:** headed Firefox exposed a cold arrival stall (158.32ms once, ~58.32ms in two repeats). Replace the whole-phone filter with v18-style screen glow, preserving vibration and the existing 450ms beat. Latest forty-scene production run is complete: hardware Firefox active p95 8.34ms, max 41.66ms (Copycat publication); calm arrival max 25ms. Chromium normal p95 8.50–8.60ms / max 25ms, 4× max 100ms; WebKit p95 86–132ms / max 170ms. Remaining publication stalls and real Safari/iPad acceptance are unresolved. Continuous new-source four-video/64-frame evidence and a verified ZIP are complete.

Exact photo-worker pixel/fallback checks for `508fb2b` are complete. Chromium 4× retains some long tasks; Firefox headless explicitly uses software compositing, and native Windows Playwright WebKit disables accelerated compositing by default. Hardware Firefox now has measured evidence. Neither production run crossed standby. No power or thermal-protection settings changed.

The WebKit failure is `s02 / open_mic+lay_low / skip-early`: after skipping Open Mic with Space, the next real pointer events did not target a card; desk stayed idle at step 21. Isolated checks, the final complete 1280 rerun and eight coordinate probes passed. Moving fan coordinates are a hypothesis, not a proven sole cause. Diagnostic `--trace-input` and validated `--pile-case=` preserve original default coverage, waits and D7. No game fix is claimed for this issue.

`2964ef8` and evidence `c9b217e` pushed normally after transient network failures; no force-push or pull. Handoff commit `5c50a1a` is pushed and records diagnostics and the whole-round report. Final audit changes pass typecheck and diff whitespace checks. The first follow-up Chromium launch failed at its existing `Runtime.enable` 120s deadline before game assertions; its permission-enabled retry worked. Later standby was after the failure, not proof of its cause. The old reviewed 1200s overflow timeout has not reproduced in isolation; its original cause remains unknown.

The final two-case CPU diagnostic identifies remaining publication work in `Run → deskModel`, `managerMessages/thisMonth`, and `composeYear/frontPages/worldStories`. These overlapping inclusive samples are diagnostic, not acceptance timing; no further caching change was made. Actual Safari/iPad remains unverified: the author explicitly has no device and asks to retain that item. No new dependency or player-facing prose was added during this handoff.

Earlier checkpoints are historical: [A–C](reports/2026-10-03-v1b.md), [D/E implementation](reports/2026-10-04-v1b-de.md), [October 5 acceptance](reports/2026-10-05-v1b-acceptance.md), [October 13 performance repair](reports/2026-10-13-v1b-acceptance.md). Their pending lists and older performance numbers are not the current state.

Overexposed is the browser deckbuilder for the Game Gauntlet SIM Jam. One career year is 12 turns, four seasons, March 2027 to February 2028. Fast hype creates heat; heat becomes scandal cards. A run always completes with one of four major and fourteen minor endings. Target play time: 10–15 minutes. English ships; Chinese remains scaffolding.

## Current implementation

| Area | State |
|---|---|
| Engine | Pure TypeScript, seeded, 19 existing GameEvents; content-driven cards, gates, endings, managers, draft and read-only queries. No new rule or balance number in V1b |
| Content | 42 cards (28 action, 8 opportunity, 6 scandal), 8 gates, 4 majors / 14 minors, 7 awards, 2 managers, 3 newspapers, 9 desk scripts |
| Expansion | Phase 1 and phase 2 rounds 2a/2b/2c done: endings, lanes, the press/rival, managers, lane-weighted draft, tiers and calendar |
| V1a | Complete static desk: stat bar/tooltips, newspaper compositions and code-drawn photographs, mirror, props, phone/bubbles, fanned hand, previews. Surrounding screens remain plain until V2 |
| V1b Part 0 | Approved draft-v8 addendum imported; Known+ scandal lead wins ties; pending scandal labelled Going to press and retractable; B-Side release reviews; Safari-compatible built-ins; Playwright WebKit; current docs and v18 reference shots |
| V1b A | Timed queue, 740ms print / 930ms card settle; visual tails retain a skip-only hold; busy click/Enter/Space fast-forwards only; stale timers cancelled. URL-seeded restarts use base + run index |
| V1b B | Card lift/carry/settle in the desk plane, gap closure, persistent played pile, actual composed story prints, back-paper ping, quiet notebook writing |
| V1b C | Resource GameEvents drive signed figures and number rolls; countdown bump and spent bulbs |
| D/E implemented; acceptance incomplete | Month-end event timeline, outgoing snapshot, actual scandal UID/press identity, sweep/date/season/deal/messages; history-derived pile; shared reduced/off switch. PRINTED imports the author's literal instruction. A real-input test found and fixed StrictMode cancelling the first hand-exit beat. OS media switching and winter restart-boundary tests pass in Chromium; final cross-browser/performance acceptance remains incomplete |

The frozen run, resources, starting deck and heat formula are unchanged. Minor reachability is 1.0% pooled plus 3% for at least one player-like persona, under each manager. Prose is authored/approved, never invented by implementers.

The visual README wins over older prose: [design/visual/README.md](design/visual/README.md). The rule contract is [../AGENTS.md](../AGENTS.md), meaning-layer scope [ui-plan.md](ui-plan.md), content plan [design/content-expansion.md](design/content-expansion.md). Decisions are in [decisions.md](decisions.md).

## Verified baseline and checks

The full browser matrix summarized below was rerun on game source `508fb2b`; subsequent `2964ef8` partial dynamic regression and failures are listed above. Core/sim results belong to this completion round and are unchanged; they are not claimed as freshly rerun every day.

Completion-round checkpoint (2026-10-04; working implementation after `e75ea96`): build/typecheck and validate pass (0 errors/27 deferred warnings); the full 300-run preview suite matches every count below (2451.3s on this machine); cooling remains 601/152. Four sims on all three seeds and both managers compare **IDENTICAL: 18 files** against `baseline-v1b-after`, which is unchanged. A virtual-clock test passed 690 recorded reducer actions and **13,976** skips immediately before/after phase beats after adding draft-month message arrivals (earlier checkpoint: 12,706). Chromium 1280×720's first 30 month-end final-state comparisons passed. The large-hand replay exposed repeated plays of the same UID: pile identity now uses the play event, and the six final-state paths match. Real click/Enter/Space skips pass at flip, carry, sweep, season, publication, deal and message arrival. Browser logs also contain an optional favicon 404; preserve it separately from JavaScript errors. These are checkpoint results, not the final nine-configuration acceptance. Local logs: `.npm-cache/v1b-de-*.log`; runtime diagnostics: `check/out/motion-*-diagnostics.json`.

Starting commit: `3be87b43cd747964a33a54db425c61b647c30bb3` (2026-10-01T11:37:22+09:00). The prior agent's original sim outputs were not handed off; old `e839f83` source was reconstructed and compared. Both that comparison and the post-V1b comparison are **IDENTICAL: 18 normalized files**. Three seeds 20260929/1/424242, both managers: four sims pass, 14/14 bands, 0 crash/soft-lock. Full provenance and differences: [reports/2026-10-03-v1b.md](reports/2026-10-03-v1b.md).

- Build and typecheck pass. Validate: **0 errors, 27 warnings** (before: 28; approved film placeholders removed).
- Preview: **300 runs, 19,238 states, 36,630 card plays, 14,034 month ends, 2,400 gate choices**, zero mismatches. All old deterministic counts match. Added assertions for release stars and pending labels.
- Cooling contract: **601 pending labels and 152 real cooling plays**, all pass. Queue skip/disposal tests pass.
- Clicks: Chromium, Firefox and WebKit at 1280×720, 800×450, 844×390 phone; **each configuration 4 runs, 233 states, 1,101 controls, 716 previews, 3,756 targets / 18,780 points**. Zero blocks; real-input D7 passes in all nine. Old counts varied because restarts were not seeded.
- Ordinary overflow: all nine configurations pass, each **213 states, 544 previews, 973 tooltips, 106 paper switches, 36 reaction rows**, zero overflow. Preview/tooltips must visibly open before measurement.
- Full overflow: all nine configurations pass, each **10 runs, 549 states, 1,422 previews, 2,548 tooltips**, plus **50 fixed replays covering all 42 cards**; zero overflow or failed replay.
- Interactions: Chromium each size **24/24**, Firefox each size **22/22** plus one headless keyboard-focus skip, WebKit each size **21/21** plus one unsupported long-press group. The initial WebKit metronome failure was a fixed 2.8s wait; final checks wait for a stable centre with a 7s deadline and verify restart. The game animation was unchanged; initial failure and final logs are retained.
- Tool limitations: WebKit trusted long-press unavailable via Playwright; Firefox headless keyboard focus skipped when the window has no focus; Firefox BiDi CPU 4× unsupported. Real Safari/iPad acceptance remains.
- `sim:press` only changes front-page selection-dependent counts: Known scandal months Flash-on-desk **75.2→100%**, Famous **73.1→100%**; lower tiers unchanged. New recorded press baseline: [handoff/v1b-evidence/press-after.txt](handoff/v1b-evidence/press-after.txt).

Node 24.16.0 satisfies `>=22.18` (no .nvmrc). Dev browser dependency: Playwright 1.63.0 / WebKit 26.6. The local cache is excluded only via .git/info/exclude. Game source `2964ef8` bundle: main JS **474.86 kB / gzip 145.71**, worker **15.137 / 5.083**, CSS **52.46 / 11.74**; fonts unchanged. The earlier A–C bundle was 458.54/140.45 JS and 49.65/11.20 CSS.

Historical A–C production measurements: cards land in 942–950ms; loud tails finish in 2106–2142ms and quiet handwriting in 3274–3304ms. Chromium p95 is 8.5–8.6ms, CPU 4× had one 124.9ms frame, and Firefox month-end p95 reached 83.34ms. Original data remains [handoff/v1b-compare/performance.json](handoff/v1b-compare/performance.json); current D/E measurements and unresolved issues are linked in the latest checkpoint above. Performance acceptance is still incomplete.

## Next work, in order

1. Finish V1b acceptance: reproduce and explain the WebKit continuous-input failure, finish WebKit 800×450 and 844×390 motion, resolve remaining 4× publication stalls, and obtain real Safari/iPad evidence when a device is available. Latest production/continuous-video/ZIP artifacts are ready. Keep source attribution, fixed coverage, capability skips and failure evidence. See [handoff/v1b.md](handoff/v1b.md). V1b remains incomplete.
2. Phase 3: event engine/content, additive GameEvents only, approved prose imported from its draft.
3. V2: the surrounding screens in the dressing room.
4. Phase 4: year in review, once-per-run variants, full retune; then 10/15 feature freeze.

The planned **week-of-10/5** early itch submission window has passed; actual publication is not verified by this task. A candidate ZIP is available outside Git. Hand-painted illustration, if any, waits until 10/26; code-drawn scenes belong to the visual rounds. Deadline **2026-11-05 04:00 JST**; treat 11/4 as the real deadline.

## Author/playtest work

- V1a's desk questions and film titles were answered by the V1b prompt; no new prose decision is required for A–C.
- Playtest whether Dex's fourth card competes with Mags's calm, whether the stat bar reads at a glance, whether players begin a second run unprompted, and time a first run against 10–15 minutes.
- Test the itch embed (1280×720, fullscreen enabled) in real Safari and iPad landscape. WebKit headless is useful evidence, not a claim that real Safari has been tested.

## Tools and handoff

All old npm commands remain. Added `check:queue`, `desk:reference`, `desk:motion-shots`, `desk:motion-perf`. Build before motion-perf; it uses production dist. Check preview also runs the cooling contract and browser clicks. Browser selection and size flags narrow checks.

Local setup, exact commands, baseline provenance and remaining limitations: [handoff/v1b.md](handoff/v1b.md). Motion comparison: [handoff/v1b-compare/index.html](handoff/v1b-compare/index.html). Numeric evidence: [handoff/v1b-evidence/](handoff/v1b-evidence/). No build zip is committed.
