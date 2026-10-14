# Status

**Current — 2026-10-14:** game source `508fb2b` is committed/pushed; remote main matches, with no intervening work. D/E and carry-over repairs remain implemented. The photo worker has exact pixel/fallback checks and complete production timing, with Firefox/WebKit separately rerun in isolation. New-source browser correctness is running serially; the earlier full matrix passed on `2e6a3f8`. Firefox hardware compositing is explicitly blocked by headless mode; WebKit slow frames and some Chromium 4× long tasks remain unresolved. **V1b is incomplete; no phase 3/V2.** [October 14 report](reports/2026-10-14-v1b-acceptance.md) includes source/evidence separation, candidate ZIP, bundle and current blockers. No power setting changes.

**Later evidence:** audit/report commit `24f1003` is pushed; game source is still `508fb2b`. New-source Chromium clicks, ordinary/full overflow, interactions and full motion pass all three sizes. Firefox/WebKit continue serially. Installed Playwright's native Windows WebKit launch explicitly disables accelerated compositing. Together with Firefox's headless software compositor, this means real hardware/Safari smoothness remains unverified; do not remove driver defaults or visual effects to claim acceptance. A temporary headed Firefox diagnostic is prepared, with explicit compositor verification, to run only after correctness audits stop.

## Prior checkpoints — historical, superseded by the current paragraph

As of **2026-10-13**, V1b D/E and the A–C carry-over repairs are implemented; continuous game/v18 recordings are available. **V1b remains incomplete: performance acceptance is unresolved, and the new photo-worker repair needs final production/motion checks. Phase 3 is not next yet.** The complete browser correctness matrix for game source `2e6a3f8` now passes, with capability skips explicit. Read this first; update it at session end.

**Photo publication repair:** a separate Chromium 4× CPU profile found synchronous photo drawing/PNG encoding inside publication (about 32.66ms inclusive in the sampled interval). Native worker preparation now fills the same finite cache; unsupported browsers retain the original guarded idle/lazy path. Exact RGBA parity passes for all 34 images in Chromium and Firefox; this WebKit lacks OffscreenCanvas and its original fallback passes. Build/typecheck pass. Main JS is 474.69 kB / gzip 145.62; the worker is 15.13 kB; CSS is unchanged. The preliminary frenzy/season measurements removed the previously observed Chromium Long Tasks, but Firefox/WebKit performance is not accepted. No new dependency, prose, game rule or animation duration. The checkpoint below predates this repair.

**Current continuation:** Firefox's final matrix now passes at all three sizes, with headless keyboard/OS-media capability skips explicit. WebKit clicks and ordinary overflow pass; its full replays/interactions/motion are running serially. New isolated production measurements include absolute run/case/input times and read-only power-event records: all were awake without changing power settings. Chromium normal is stable, but 4× publication long tasks and Firefox/WebKit sustained slow frames remain. Five CSS probes were diagnostic only and were not applied to the game. Older measurements crossed Modern Standby and remain diagnostic evidence, not controlled optimization proof. [October 13 report](reports/2026-10-13-v1b-acceptance.md), [new performance comparison](handoff/v1b-compare/observed-20261013.md).

**October 13 resume:** HEAD `1e15ebe`, remote main `51125f9`; no intervening remote work. The previous commit/push attempt never ran because automatic approval review exhausted its usage allowance. Existing uncommitted diagnostics/evidence are retained. Chromium's final three-size matrix and Firefox's three-size clicks had completed; Firefox overflow/full/interactions/motion and the final WebKit matrix remain to run. Typecheck passes again; Node is unchanged. New logs: `.npm-cache/v1b-1013-*`; [current report](reports/2026-10-13-v1b-acceptance.md). Earlier measurements/passes below are historical evidence, not a claim of today's rerun.

**Latest checkpoint:** build/typecheck, validate 0/27 and queue 690 actions / 13,976 skips pass again. The press run matches its approved baseline except elapsed time. Final Chromium 1280×720 five-check suite plus added single-scandal/Mags/static-replay/settled-hit coverage pass. At 800×450, clicks and both overflow suites pass; interactions first failed a two-endpoint metronome sample (23/24), then passed 24/24 with intermediate angle samples in the same window. Full motion is running, followed by the remaining sequential configurations. Logs: `.npm-cache/v1b-final-*.log`, preserving failures. Production normal Chromium active p95 is 8.5–8.6ms, but a 4× 895.3ms outlier and sustained Firefox/WebKit slow frames remain unresolved. [Current report](reports/2026-10-05-v1b-acceptance.md), [continuous frames](handoff/v1b-compare/continuous/index.html), [performance](handoff/v1b-compare/de-optimized-final.json). Bundle: JS 473.61 kB / gzip 145.14, CSS 52.46 / 11.74; fonts unchanged. Normal push succeeded through `51125f9`. Candidate `.npm-cache/overexposed-v1b-2e6a3f8.zip` has root index and relative assets; it does not imply complete acceptance.

**Machine recovery:** implementation `4bd2938` is pushed. At 01:16:31 Shanghai time Windows recorded Kernel-Power 88 (critical thermal hibernation), recovering at 01:40:11. The author confirmed cooling was restored; checks now run one browser/size at a time. WebKit phone clicks passed on recovery (30.9s), completing this round's nine click configurations with unchanged counts. Isolated Chromium phone overflow passed again (41.8s), as did 1280×720 (41.5s). Full/interactions/motion final matrix is still running. Prior interrupted logs remain; this does not establish the cause of the independent review's 1200s failure. Do not bypass thermal or sleep protection. Details: [reports/2026-10-04-v1b-de.md](reports/2026-10-04-v1b-de.md).

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
| D/E implementation in progress | Month-end event timeline, outgoing snapshot, actual scandal UID/press identity, sweep/date/season/deal/messages; history-derived pile; shared reduced/off switch. PRINTED imports the author's literal instruction. A real-input test found and fixed StrictMode cancelling the first hand-exit beat. OS media switching and winter restart-boundary tests pass in Chromium; final cross-browser/performance acceptance remains incomplete |

The frozen run, resources, starting deck and heat formula are unchanged. Minor reachability is 1.0% pooled plus 3% for at least one player-like persona, under each manager. Prose is authored/approved, never invented by implementers.

The visual README wins over older prose: [design/visual/README.md](design/visual/README.md). The rule contract is [../AGENTS.md](../AGENTS.md), meaning-layer scope [ui-plan.md](ui-plan.md), content plan [design/content-expansion.md](design/content-expansion.md). Decisions are in [decisions.md](decisions.md).

## Verified baseline and checks

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

Node 24.16.0 satisfies `>=22.18` (no .nvmrc). Dev browser dependency: Playwright 1.63.0 / WebKit 26.6. The local cache is excluded only via .git/info/exclude. Game bundle: JS **458.54 kB / gzip 140.45**, CSS **49.65 kB / gzip 11.20**; fonts unchanged.

Historical A–C production measurements: cards land in 942–950ms; loud tails finish in 2106–2142ms and quiet handwriting in 3274–3304ms. Chromium p95 is 8.5–8.6ms, CPU 4× had one 124.9ms frame, and Firefox month-end p95 reached 83.34ms. Original data remains [handoff/v1b-compare/performance.json](handoff/v1b-compare/performance.json); current D/E measurements and unresolved issues are linked in the latest checkpoint above. Performance acceptance is still incomplete.

## Next work, in order

1. Finish V1b acceptance: D/E and carry-over implementation is present; complete the final browser matrix, resolve or explicitly bound performance and intermittent-input findings, and record real-device limits. Continuous game/v18 frames are available. See [handoff/v1b.md](handoff/v1b.md). V1b remains incomplete.
2. Phase 3: event engine/content, additive GameEvents only, approved prose imported from its draft.
3. V2: the surrounding screens in the dressing room.
4. Phase 4: year in review, once-per-run variants, full retune; then 10/15 feature freeze.

Submit an early itch build in the **week of 10/5**. Hand-painted illustration, if any, waits until 10/26; code-drawn scenes belong to the visual rounds. Deadline **2026-11-05 04:00 JST**; treat 11/4 as the real deadline.

## Author/playtest work

- V1a's desk questions and film titles were answered by the V1b prompt; no new prose decision is required for A–C.
- Playtest whether Dex's fourth card competes with Mags's calm, whether the stat bar reads at a glance, whether players begin a second run unprompted, and time a first run against 10–15 minutes.
- Test the itch embed (1280×720, fullscreen enabled) in real Safari and iPad landscape. WebKit headless is useful evidence, not a claim that real Safari has been tested.

## Tools and handoff

All old npm commands remain. Added `check:queue`, `desk:reference`, `desk:motion-shots`, `desk:motion-perf`. Build before motion-perf; it uses production dist. Check preview also runs the cooling contract and browser clicks. Browser selection and size flags narrow checks.

Local setup, exact commands, baseline provenance and remaining limitations: [handoff/v1b.md](handoff/v1b.md). Motion comparison: [handoff/v1b-compare/index.html](handoff/v1b-compare/index.html). Numeric evidence: [handoff/v1b-evidence/](handoff/v1b-evidence/). No build zip is committed.
