# Round V1b handoff — final acceptance in progress (2026-10-13)

**October 14 continuation:** current game source/remote main `508fb2b`; no intervening commit. [New report](../reports/2026-10-14-v1b-acceptance.md). Full production data for the worker repair is saved; Firefox/WebKit have a separate isolated rerun. `tools/render-environment.ts --name=<fresh-name>` reads renderer support and tests production resources under `/itch-preview/`; stopping the existing metronome is diagnostic only. Firefox explicitly reports software compositing because headless mode blocks acceleration. WebKit remains unresolved. The new-source nine-configuration correctness matrix is running serially. `tools/motion-record.ts --evidence=<new-folder> --cases=loud` can add fresh continuous pointer evidence without replacing the old gallery. Candidate ZIP is `.npm-cache/overexposed-v1b-508fb2b.zip`. No V1b completion or phase 3 yet; earlier pending lists below are historical.

**Hardware follow-up:** the installed Playwright also disables accelerated compositing on native Windows WebKit by default; see `v1b-compare/webkit-windows-launch-20261014.json`. Do not silently remove that driver argument. For an isolated Firefox hardware diagnostic, set `OVEREXPOSED_FIREFOX_HEADED=1` only in the diagnostic process, then run the production tool with `--browsers=firefox --name=<fresh-name>`. It opens a separate temporary profile/window, records `about:support` compositing evidence before timing, and refuses a hardware pass if the compositor is absent/software/basic. Normal checks remain headless. Stop correctness audits first; restore the process environment afterward. Real Safari/iPad still needs actual device evidence.

Read AGENTS.md and docs/status.md first. The author authorised main pulls, code/content/docs, Playwright WebKit, per-part commits/pushes and a committed report. The latest completion prompt supersedes the former permission to stop after C: **finish D/E and acceptance before phase 3; do not mark all V1b done yet.** The A–C report stays intact. The older implementation/remaining-work sections below describe the A–C checkpoint; the completion checkpoint immediately below supersedes them where noted.

## Current checkpoint — 2026-10-13

**Latest:** `014eab3` is pushed. WebKit full overflow/interactions/motion now pass all three sizes, completing the correctness matrix for game source `2e6a3f8`. A later photo-worker repair is pending final acceptance: `photo-preload.ts` prepares the finite atlas with `photo-worker.ts`, using the original pixel renderer and approved director label; unsupported/error/15s-deadline paths retain idle/lazy rendering. `node check/photo-worker.ts` verifies exact pixels in Chromium/Firefox and fallback in all three engines; WebKit OffscreenCanvas is a capability skip. Set the existing `FIREFOX_PATH` and `PLAYWRIGHT_BROWSERS_PATH` first. Full new-source production and real-input checks remain. No dependency or timing change. The remaining paragraphs are earlier checkpoints, not the current pending list.

**Later checkpoint:** `b1e7770` is pushed; Firefox all three final configurations now pass, with keyboard-focus/OS-media capability skips retained. WebKit clicks and ordinary overflow pass; full/interactions/motion follow serially. New [isolated production measurements](v1b-compare/observed-20261013.md) have absolute timestamps and matching power records, with no standby in their intervals and no wake request used. The older files remain diagnostic evidence. Performance is still not accepted: 4× publication has JS long tasks, Firefox/WebKit retain slow frames. Five temporary CSS probes were not adopted. `tools/perf-observed.ps1` is a read-only Windows wrapper; it never changes power settings. Run it only with correctness audits stopped.

`ea8e573` is now pushed. Firefox ordinary/full overflow and interactions pass at all three sizes; full overflow retains 50 recorded states / 42 cards, interactions are 22/22 plus the explicit headless-focus capability skip. Firefox full motion is running. Logs are being archived in `v1b-evidence/de-20261013/`; its Firefox clicks log is the completed October 5 run, not a new run.

**Performance evidence correction:** Windows power events show that the old reviewed/before/after files crossed Modern Standby in different wake conditions. Their numerical differences are diagnostic observations, not controlled proof of an improvement. Preserve them. The new tool records absolute run/case/input timestamps; repeat production measurements in confirmed awake intervals with correctness checks stopped. A temporary per-process wake request has been proposed, but is not enabled pending the author's reply. No power plan or thermal protection is changed. See the October 13 report for the correlation and its limits.

Resume source `1e15ebe` (game source `2e6a3f8`), remote still `51125f9`; no intervening remote changes. Previous automatic approval review failed due to its usage allowance before the pending commit/push executed. Typecheck and read-only remote verification pass now. Chromium all three final configurations and Firefox all three clicks completed in the previous run; Firefox's remaining checks and the final WebKit matrix are next, sequentially. See [October 13 report](../reports/2026-10-13-v1b-acceptance.md) and `.npm-cache/v1b-1013-*` logs. Do not rerun passed work merely because the earlier status paragraph was stale. No phase 3/V2; unresolved performance and intermittent long-press findings remain.

## Prior checkpoint — 2026-10-05

**V1b remains incomplete.** Measured game source is `2e6a3f8`. See [the current Chinese report](../reports/2026-10-05-v1b-acceptance.md). D/E, preview suppression, history-derived pile, the StrictMode first-beat fix and winter restart-boundary protection are implemented. Build/typecheck, validate 0/27, queue 690 actions / 13,976 skips pass again. The new press run is identical to the approved baseline except elapsed time. The full nine-config matrix is running sequentially; logs are `.npm-cache/v1b-final-<browser>-<size>-<check>.log`. Do not infer a final pass from earlier checkpoints below.

### Structure and reproducible checks

- `ui/queue.ts` holds one actual reducer result; `ui/timeline.ts` derives ordered month/gate/draft beats. `ui/desk/presentation.ts` projects the outgoing snapshot, resources, hand, bulbs and messages without changing rules. `MonthMotion.tsx` performs exit/stamp/UID-based scandal flip/sweep/date/season/deal/message effects. Actual choices pause; actual draw events alone deal cards.
- `Pile.tsx` reads recorded play events, including exhausted opportunities and repeated plays of one UID. `ui/motion.ts` unifies OS and explicit full/reduced/off preferences. Changing mode settles cleanly; reduced effects are in-place, <=150ms. Busy previews and tail holds remain in force. `Motion.tsx` retains v18 landing at about 0.95s, separate from about 2.1s loud / 3.3s quiet busy time.
- For each browser `chrome, firefox, webkit` and size `1280x720, 800x450, 844x390m`, run each separately: `node check/clicks.ts --browsers=chrome --sizes=1280x720`, then `node check/overflow.ts` with the same flags, then overflow with `--runs=10 --replays`, `node check/interactions.ts`, and `node check/motion-run.ts`. Never run a performance measurement concurrently. Motion includes first entry, D7, previews, pile parity, actual boundaries, OS preference and month/season/ending parity. Narrow options listed in the prior checkpoint are diagnostics, not substitutes for full acceptance.
- `node sim/compare.ts sim/out/baseline-v1b-after sim/out/baseline-v1b-de-20261004` gives 18 identical normalized files. Neither that reference nor `v1b-evidence/press-after.txt` changes. Run `node check/preview.ts` and `node check/press-contract.ts` for reducer/preview and cooling contracts; `npm run check:queue` for queue/timeline.

### Performance and visual evidence

Both prepared tools have now run. `node tools/motion-active-perf.ts --name=<fresh-name>` uses production dist, real pointer input, active frames and a separate 1500ms idle window. Build first; stop correctness checks. `--root=.npm-cache/v1b-review-ace1c41` uses the exported reviewed source. `--profile` is a separate diagnostic, not acceptance timing; `--case=reviewed-frenzy-end --browsers=chrome --rates=4` isolates the slow-frame case. Preserve previous output names.

[Reviewed source](v1b-compare/reviewed-active.json), [D/E before optimization](v1b-compare/de-active.json), [after](v1b-compare/de-optimized-final.json). Idle photo preparation and removing choice-screen backdrop blur improved measured costs, but one 895.3ms Chromium 4x interval, sustained Firefox/WebKit slow frames and idle cache long tasks remain unresolved. Three `de-outlier-repeat-*.json` runs did not reproduce the 895ms event; they do not replace it. `firstFrameMs` is a rAF/pointer timestamp difference, not input latency.

`node tools/motion-record.ts` produced ten continuous videos and 160 ordered extracted frames: [gallery](v1b-compare/continuous/index.html), [manifest](v1b-compare/continuous/manifest.json). Full videos are outside Git at `C:\Users\91205\Documents\overexposed\.npm-cache\v1b-recordings-2e6a3f8-1791115338409\`. The pointer stays at card-local (40,120). The burned-in `idle` is the base beat name and may coexist with busy visual tails; use the production `totalBusyMs` for unlock. Bundled FFmpeg decodes PNG (`-r 4 -c:v png`); browser canvas encodes selected JPEG frames because MJPEG/fps filter are absent. No new dependency. Recordings are visual evidence, not production frame benchmarks.

### Remaining work and publication

Complete the nine-config matrix, retain all capability skips, investigate unresolved performance, and commit/push final report/status. Firefox 4x/media emulation/headless focus and WebKit held-touch limits remain explicit; real Safari/iPad requires actual device evidence. **No smoothness acceptance and no phase 3 yet.** Normal push succeeded through `51125f9` on October 5 after earlier GitHub failures. Candidate itch ZIP: `.npm-cache/overexposed-v1b-2e6a3f8.zip` (root index and relative JS/CSS/font paths verified, outside Git); checksum and exact absolute path are in the current report. It is not a claim of complete acceptance.

## Prior completion checkpoint — historical 2026-10-04

**Recovery:** `4bd2938` is pushed. Windows reported critical thermal hibernation at 2026-10-04 01:16:31 and recovery at 01:40:11 (Shanghai). The author confirmed cooling is restored. Use one browser and one size per run; do not change thermal protection. WebKit phone clicks passed (30.9s), Chromium phone ordinary overflow passed (41.8s), and the remaining serial matrix is in progress. The latest report preserves the exact pass/failure split. `clicks` now has bounded progress, and Firefox diagnostics filter out info/timeStamp performance traces; recovery runs exercise this harness.

- Reviewed source `ace1c41`; clean normal pull found no intervening changes. `e75ea96` fixes busy previews and adds bounded overflow progress/diagnostics. The 1200s failure did not reproduce in isolation; its cause remains unverified.
- `ui/timeline.ts`, `ui/desk/presentation.ts` and `MonthMotion.tsx` now implement month-end presentation from actual events. `Pile.tsx` reconstructs this month's plays and keys repeated UID plays by event. Shared motion preferences settle the queue and cover ambient effects. No core, content-number or persona change.
- `npm run check:queue` includes 690 real recorded actions and before/after-beat virtual-clock skips. `npm run check:motion -- --browsers=chrome --sizes=1280x720` adds pointer previews, pile parity and month boundaries. Narrow with `--month-only`, `--pile-only`, `--boundaries-only`; `--big-hand-only` narrows the pile test. Full/reduced/off and early/late skip are compared after identical real inputs; runtime errors fail, known favicon 404 stays explicit.
- Checkpoint logs are `.npm-cache/v1b-de-*.log`; raw browser diagnostics are `check/out/motion-*-diagnostics.json`. The 300-run preview suite matched all A–C counts. Four sims completed on 20260929/1/424242 under both managers; `node sim/compare.ts sim/out/baseline-v1b-after sim/out/baseline-v1b-de-20261004` reports 18 identical files. Never replace either reference baseline.
- PRINTED now imports the author's literal word; no mockup prose was copied. A real-input first-beat assertion caught development StrictMode cancelling the hand exit; cleanup now resets its presentation cursor. Chromium entry, OS preference/mid-sequence change, and winter publication click/Enter/Space checks pass. `--entry-only` and `--os-only` narrow these tests. Replay startup waits for the actual document/title/fonts with a bound rather than a fixed 2.5s delay.
- Still required: finish all nine browser/viewport correctness and real-input configurations, continuous game/v18 recordings, active-only production frame measurements/diagnosis and final report/ZIP. D/E implementation is not final acceptance. No phase 3 or V2 work has started. Commit `ae74998` is local; its push failed twice because GitHub port 443 was unreachable, so verify push status rather than assuming it is on origin.
- Prepared tools (typechecked, **not yet executed**): `node tools/motion-active-perf.ts --name=de-active` uses production dist and a real stationary pointer, separating first-frame delay, landing, busy, active frame intervals and 1500ms idle observation. It selects the longest actual quiet play from the fixed replay corpus without changing prose. `--root=.npm-cache/v1b-review-ace1c41 --name=reviewed-active` targets the exported reviewed source (its old 458.54/49.65 kB bundle was rebuilt locally). A separate `--profile --browsers=chrome --case=frenzy-end` diagnostic run saves CPU profiles in ignored `.npm-cache/profiles/`; profiling timings are not acceptance measurements. `node tools/motion-record.ts` records continuous WebKit videos into ignored `.npm-cache/v1b-recordings-<commit>/`, extracts ordered frames with the already installed Playwright FFmpeg, and writes a manifest/gallery under `docs/handoff/v1b-compare/continuous/`. Actual execution and visual verification remain required.

## Baseline and evidence

Start: `3be87b43cd747964a33a54db425c61b647c30bb3`, 2026-10-01T11:37:22+09:00. Only one initial pull was needed. The original old sim output was ignored and absent; the old `e839f83` source was exported locally and its four sims reconstructed with the new baseline recorder. Its 18 normalized files matched the checked-out baseline. All post-change four-sim outputs match that baseline too (three seeds, both managers). This is not a claim to possess the earlier agent's original raw files.

Local baselines: `sim/out/baseline-v1b-3be87b4`, `sim/out/baseline-v1b-after`; reconstructed source/output: `.npm-cache/v1a-reference`. They are intentionally ignored. Small evidence files and the Chinese report are committed separately. Reference frames: [v1b-compare/index.html](v1b-compare/index.html); performance: [performance.json](v1b-compare/performance.json).

## Environment and commands

Node 24.16.0 / npm 11.13.0; package requires Node >=22.18 and has no .nvmrc. Edge 154, Firefox 142, Playwright 1.63.0 / WebKit 26.6 (build 2359). Playwright is development-only; no browser code ships.

On this Windows machine:

```powershell
$env:FIREFOX_PATH = Join-Path (Get-Location) '.npm-cache/firefox-142/app/firefox.exe'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.npm-cache/pw-browsers'
npm ci --cache .npm-cache --loglevel verbose
npx playwright install webkit
npm run build
npm run validate
npm run check:queue
npm run check:preview
npm run check:overflow
npm run check:overflow:full
npm run check:interactions
npm run desk:motion-perf   # build first; production dist, actual card and month end
npm run desk:motion-shots
npm run desk:reference
```

On another machine, Firefox's normal install is discovered, or set FIREFOX_PATH. WebKit's standard Playwright cache works without the local browser-path override. `.npm-cache/` is in .git/info/exclude, never .gitignore. Browser tools need local server/process permission. Vite ignores docs and generated/cache directories to prevent a regenerated comparison HTML from reloading the game during an audit. Chrome closes over CDP before its launcher is stopped (Edge can relaunch under another PID).

## Historical A–C implementation (superseded by current structure above)

- `ui/queue.ts`: pure timed presentation queue, mode callback, lift/land active snapshot, 740 ms publication, 930 ms card settle; visual tails register a hold so a click still only skips while printing, handwriting or deltas remain. Other actions have immediate structural resolution for now. `skip()` applies the pending result once and cancels timers; `dispose()` cancels on unmount. `latest` includes pending actions. `check/queue.ts` covers skip on either side of land, pending actions and stale timers.
- `ui/App.tsx`: document capture-phase click and Enter/Space consume a busy input as skip only. The reducer action guard also returns after skipping. Seeded URLs restart with base + run index; ordinary starts remain crypto-seeded.
- `ui/desk/Motion.tsx`: clones the actual card face for lift/carry/settle, 1100px perspective and 640,556 hinge, 64° final plane. The flight host is above the hand; the settled pile below it. Remaining cards close their gap. Motion CSS must load **after** hand/desk CSS.
- The new story is found through its press-line step/event identity, not an arbitrary row; it prints at its actual composed position. A back paper's ping keeps its transform. Quiet writing uses an overlay, leaving React's text node intact, with a 220 ms erase and per-word timing.
- Resource events supply signed deltas and roll endpoints. They are aggregated per resource, not inferred by diffing state. Roll 560 ms, tint 820 ms including decay, delta fade 1350 ms. The signed figures use stage coordinates above their own values, escaping the stat cells' clipping.
- Existing live previews remain entirely reducer-based. Pending scandal labels and cooling are asserted; `release` is presentation data. B-Side stars freeze at release-time Craft. See decisions.md for approved cards.
- Static browser audits set `document.documentElement.dataset.motion='off'`. Real D7 checks explicitly re-enable motion. This is a shared mode switch, not a game-rule shortcut.
- Interaction checks await three stable zero-angle samples for the metronome, then verify it stays stopped and can restart (7s deadline). The old fixed 2.8s wait failed in headless WebKit: v18 and the game cap each frame's progress at 50ms, so slow frame delivery can take over 4s in wall time. Real clicks were confirmed; the game animation was unchanged. The initial failure remains in the evidence folder.

## Historical A–C remaining work (not the current implementation state)

1. Part D: END TURN press, hand exit, PRINTED stamp, each actual pending story lifting/flipping to its scandal card, stagger/drop/shake, sweep, date/season/opener/light, deal, bulbs, per-bubble manager arrivals and phone notifications. Present month-end/frame measurements describe **instant resolution**, not this sequence. Add calm/frenzy/season skip tests and reference frames.
2. Part E: the OS motion preference already selects the short in-place path for A–C, but full reduced-motion final-layout parity, pile rendering and all D beats still need acceptance. Do not call E complete.
3. WebKit trusted long-press is unavailable in Playwright's Touchscreen API; the check reports a skip. Firefox headless keyboard focus is skipped when document.hasFocus() is false. Firefox 4× CPU throttling is unavailable through this BiDi driver. Test these cases on real Safari/iPad/Firefox as applicable; synthetic events are not equivalent.
4. The pile is presentation-local and built by animated plays. Static replay/motion-off currently omits earlier pile faces; the next round should reconstruct pile faces from the same play events for reduced/off final-layout parity.
5. No new narrative text was invented. The append-only draft-v8 addendum is commit `5fe1654`; later implementation imports it. No build zip is committed.
6. Production performance is measured separately from parallel correctness audits. Chromium normal p95 is 8.5–8.6ms; CPU 4× still has a 124.9ms worst frame. Firefox normal month-end p95 reaches 83.34ms. Profile this during D/E; do not claim smoothness acceptance from passing correctness checks. Flight settles around 0.95s, while skip-only input holds through loud printing/deltas (~2.1s) or quiet writing (~3.3s).
