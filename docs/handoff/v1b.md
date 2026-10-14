# Round V1b handoff — acceptance incomplete (2026-10-15)

Read AGENTS.md and docs/status.md first. D/E and A–C carry-over repairs are implemented; **V1b is incomplete and phase 3/V2 must not start**. Game source is `508fb2b`; audit-only commits through `a47a21c` are pushed. No change in core, content numbers, persona parameters or existing GameEvents. The author authorised normal pulls from a clean checkout, coherent commits/pushes, and Playwright/WebKit; no other dependency is approved.

## Current acceptance and remaining work

1. Chromium's new-source clicks, ordinary/full overflow, interactions and full/reduced real-input motion pass at all three sizes. Firefox also passes all five checks at all three sizes, with explicit keyboard-focus/OS-media capability skips. WebKit is running serially. Preserve `.npm-cache/v1b-508fb2b-<browser>-<check>.log`; archive completed logs in [de-508fb2b](v1b-evidence/de-508fb2b/). Do not rerun completed work just because an old report lists it as pending.
2. Production performance for the worker source is already measured across 40 scenes plus an isolated 20-scene Firefox/WebKit rerun. Correctness must stop before any further timing run. Chromium 4× retains some long tasks. Firefox headless explicitly uses software compositing; native Windows Playwright WebKit disables accelerated compositing by default. This does not establish real hardware smoothness or eliminate possible game costs.
3. Next performance diagnostic: headed Firefox in a separate temporary profile, verifying its actual compositor before timing. Set `OVEREXPOSED_FIREFOX_HEADED=1` only in that process and run `tools/perf-observed.ps1 -Name <fresh-name> -Browsers 'firefox'`. The tool records about:support evidence and refuses a hardware pass for a missing/software/basic compositor. Normal checks remain headless. Never remove WebKit's default driver argument to manufacture a pass.
4. Add new-source stationary-pointer continuous evidence with `node tools/motion-record.ts --cases=loud --evidence=docs/handoff/v1b-compare/continuous-508fb2b`, after other browser work stops. The tool records actual Git HEAD in its manifest; audit-only HEAD changes do not change game source. Preserve the older ten-video gallery.
5. Final report/status must distinguish reproduced passes, inherited completion-round evidence, capability skips and unverified performance. Real Safari/iPad still needs actual-device evidence. Update/commit/push before ending; do not call V1b complete on the basis of headless correctness alone.

Firefox headless keyboard focus and OS-media emulation, Firefox BiDi CPU 4×, and WebKit trusted held-touch are explicit capability limits, not passes. The old reviewed 1200s overflow timeout did not reproduce in isolation; its original cause remains unknown. Phase progress/last-state logging and bounded waits now preserve actionable failure evidence. A prior thermal hibernation was recorded; the author confirmed cooling recovery. Run browsers serially and do not change thermal protection or power settings. No wake request is enabled.

## Implementation and commands

- `ui/queue.ts` holds one actual reducer result; `ui/timeline.ts` derives ordered month/gate/draft beats. `ui/desk/presentation.ts` projects the outgoing snapshot, resources, hand, bulbs and messages without changing rules. `MonthMotion.tsx` performs exit/stamp/UID-based scandal flip/sweep/date/season/deal/message effects. Actual choices pause; actual draw events alone deal cards.
- `Pile.tsx` reads recorded play events, including exhausted opportunities and repeated plays of one UID. `ui/motion.ts` unifies OS and explicit full/reduced/off preferences. Changing mode settles cleanly; reduced effects are in-place, <=150ms. Busy previews and tail holds remain in force. `Motion.tsx` retains v18 landing at about 0.95s, separate from about 2.1s loud / 3.3s quiet busy time.
- For each browser `chrome, firefox, webkit` and size `1280x720, 800x450, 844x390m`, run each separately: `node check/clicks.ts --browsers=chrome --sizes=1280x720`, then `node check/overflow.ts` with the same flags, then overflow with `--runs=10 --replays`, `node check/interactions.ts`, and `node check/motion-run.ts`. Never run a performance measurement concurrently. Motion includes first entry, D7, previews, pile parity, actual boundaries, OS preference and month/season/ending parity. Narrow options listed in the prior checkpoint are diagnostics, not substitutes for full acceptance.
- `node sim/compare.ts sim/out/baseline-v1b-after sim/out/baseline-v1b-de-20261004` gives 18 identical normalized files. Neither that reference nor `v1b-evidence/press-after.txt` changes. Run `node check/preview.ts` and `node check/press-contract.ts` for reducer/preview and cooling contracts; `npm run check:queue` for queue/timeline.


- Photo preparation: `ui/desk/photo-preload.ts` starts `photo-worker.ts` for the same finite atlas; `halftone.ts` keeps the shared pixel algorithm. Pass only the approved director label. Missing capability/error/15s deadline falls back to the original guarded idle/lazy path. `node check/photo-worker.ts` compares all 34 worker images exactly and tests the fallback. Chromium/Firefox pass pixels and fallback; this WebKit lacks OffscreenCanvas, so its pixel comparison is a capability skip and its fallback passes.

## Performance, recordings and build

The current Chinese report is [2026-10-14-v1b-acceptance.md](../reports/2026-10-14-v1b-acceptance.md). Raw production evidence: [40-scene run](v1b-compare/de-worker-final-508fb2b.json), [isolated Firefox/WebKit](v1b-compare/de-worker-ff-wk-isolated-508fb2b.json), matching `-power.json` read-only records. Active frames exclude the trailing 1,500ms idle sample. Landing and total busy are separate. No prose truncation, reading-speed or skip-contract change.

The publication CPU profile located synchronous photo rendering/PNG encoding in React publication; the worker removes that first-use work from the presentation thread. Current complete measurements still retain 4× long tasks. [Renderer evidence](v1b-compare/render-environment-detail-20261014.json) identifies Firefox's headless software compositor; [WebKit launch source evidence](v1b-compare/webkit-windows-launch-20261014.json) records the native Windows default. WebGL renderer strings do not identify the page compositor. Stopping the existing metronome was a diagnostic contrast only, not full-motion acceptance; no CSS diagnostic probe was adopted.

`node tools/motion-active-perf.ts --name=<fresh-name>` measures production dist with real pointer input. Build first and stop correctness audits. `--case=reviewed-frenzy-end --browsers=chrome --rates=4 --profile` is a separate CPU diagnostic, not acceptance timing. Profiles remain in ignored `.npm-cache/profiles/`. `tools/render-environment.ts --name=<fresh-name>` verifies renderer evidence and production resources under `/itch-preview/`. Preserve original failed/intermediate output names.

Prior continuous game/v18 evidence: [gallery](v1b-compare/continuous/index.html), [manifest](v1b-compare/continuous/manifest.json), ten videos and 160 ordered frames from game source `2e6a3f8`. Full videos are outside Git at `C:\Users\91205\Documents\overexposed\.npm-cache\v1b-recordings-2e6a3f8-1791115338409\`. Pointer remains at card-local (40,120). Burned-in base beat `idle` may coexist with a busy visual tail; use measured total busy for unlock. These are visual recordings, not production performance measurements. Already installed Playwright FFmpeg extracts PNG; native canvas encodes selected JPEG frames. No new dependency.

Candidate itch ZIP: `C:\Users\91205\Documents\overexposed\.npm-cache\overexposed-v1b-508fb2b.zip`, 466,173 bytes. Root index, relative assets, fonts and worker are verified; the same production build loads under a subdirectory in all three engines. [ZIP verification](v1b-evidence/de-508fb2b/zip-verification.json). Main JS 474.69 kB / gzip 145.62, worker 15.137 / 5.083, CSS 52.46 / 11.74; fonts unchanged. ZIP is outside Git and has not been uploaded to itch. A candidate does not imply final acceptance.

## Provenance and earlier reports

[A–C report](../reports/2026-10-03-v1b.md) remains intact. [D/E implementation](../reports/2026-10-04-v1b-de.md), [October 5 acceptance](../reports/2026-10-05-v1b-acceptance.md) and [October 13 repair](../reports/2026-10-13-v1b-acceptance.md) preserve earlier checkpoints and limits. Their pending lists are historical, not today's remaining work. Older performance runs crossed Modern Standby; retain them as diagnostic observations rather than controlled before/after proof. New read-only power observations record actual run/case/input times without requesting wakefulness.

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
node tools/motion-active-perf.ts --name=<fresh-name>  # production, correctness stopped
npm run desk:motion-shots
npm run desk:reference
```

On another machine, Firefox's normal install is discovered, or set FIREFOX_PATH. WebKit's standard Playwright cache works without the local browser-path override. `.npm-cache/` is in .git/info/exclude, never .gitignore. Browser tools need local server/process permission. Vite ignores docs and generated/cache directories to prevent a regenerated comparison HTML from reloading the game during an audit. Chrome closes over CDP before its launcher is stopped (Edge can relaunch under another PID).
