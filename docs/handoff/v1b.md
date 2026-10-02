# Round V1b handoff — A–C (2026-10-03)

Read AGENTS.md and docs/status.md first. The author authorised main pulls, code/content/docs, Playwright WebKit, per-part commits/pushes and a committed report. The prompt explicitly permits stopping after C: **D/E remain before phase 3. Do not mark all V1b done.**

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

## Implementation

- `ui/queue.ts`: pure timed presentation queue, mode callback, lift/land active snapshot, 740 ms publication, 930 ms card settle; visual tails register a hold so a click still only skips while printing, handwriting or deltas remain. Other actions have immediate structural resolution for now. `skip()` applies the pending result once and cancels timers; `dispose()` cancels on unmount. `latest` includes pending actions. `check/queue.ts` covers skip on either side of land, pending actions and stale timers.
- `ui/App.tsx`: document capture-phase click and Enter/Space consume a busy input as skip only. The reducer action guard also returns after skipping. Seeded URLs restart with base + run index; ordinary starts remain crypto-seeded.
- `ui/desk/Motion.tsx`: clones the actual card face for lift/carry/settle, 1100px perspective and 640,556 hinge, 64° final plane. The flight host is above the hand; the settled pile below it. Remaining cards close their gap. Motion CSS must load **after** hand/desk CSS.
- The new story is found through its press-line step/event identity, not an arbitrary row; it prints at its actual composed position. A back paper's ping keeps its transform. Quiet writing uses an overlay, leaving React's text node intact, with a 220 ms erase and per-word timing.
- Resource events supply signed deltas and roll endpoints. They are aggregated per resource, not inferred by diffing state. Roll 560 ms, tint 820 ms including decay, delta fade 1350 ms. The signed figures use stage coordinates above their own values, escaping the stat cells' clipping.
- Existing live previews remain entirely reducer-based. Pending scandal labels and cooling are asserted; `release` is presentation data. B-Side stars freeze at release-time Craft. See decisions.md for approved cards.
- Static browser audits set `document.documentElement.dataset.motion='off'`. Real D7 checks explicitly re-enable motion. This is a shared mode switch, not a game-rule shortcut.
- Interaction checks await three stable zero-angle samples for the metronome, then verify it stays stopped and can restart (7s deadline). The old fixed 2.8s wait failed in headless WebKit: v18 and the game cap each frame's progress at 50ms, so slow frame delivery can take over 4s in wall time. Real clicks were confirmed; the game animation was unchanged. The initial failure remains in the evidence folder.

## Remaining D/E work and limitations

1. Part D: END TURN press, hand exit, PRINTED stamp, each actual pending story lifting/flipping to its scandal card, stagger/drop/shake, sweep, date/season/opener/light, deal, bulbs, per-bubble manager arrivals and phone notifications. Present month-end/frame measurements describe **instant resolution**, not this sequence. Add calm/frenzy/season skip tests and reference frames.
2. Part E: the OS motion preference already selects the short in-place path for A–C, but full reduced-motion final-layout parity, pile rendering and all D beats still need acceptance. Do not call E complete.
3. WebKit trusted long-press is unavailable in Playwright's Touchscreen API; the check reports a skip. Firefox headless keyboard focus is skipped when document.hasFocus() is false. Firefox 4× CPU throttling is unavailable through this BiDi driver. Test these cases on real Safari/iPad/Firefox as applicable; synthetic events are not equivalent.
4. The pile is presentation-local and built by animated plays. Static replay/motion-off currently omits earlier pile faces; the next round should reconstruct pile faces from the same play events for reduced/off final-layout parity.
5. No new narrative text was invented. The append-only draft-v8 addendum is commit `5fe1654`; later implementation imports it. No build zip is committed.
6. Production performance is measured separately from parallel correctness audits. Chromium normal p95 is 8.5–8.6ms; CPU 4× still has a 124.9ms worst frame. Firefox normal month-end p95 reaches 83.34ms. Profile this during D/E; do not claim smoothness acceptance from passing correctness checks. Flight settles around 0.95s, while skip-only input holds through loud printing/deltas (~2.1s) or quiet writing (~3.3s).
