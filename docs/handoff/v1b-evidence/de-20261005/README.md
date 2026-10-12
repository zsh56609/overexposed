# V1b completion acceptance evidence — 2026-10-05

Game source: `2e6a3f8`; subsequent commits change checks/evidence/docs only. Reports separate game source from harness revisions. The final matrix is still incomplete; presence of a log does not mean pass.

- `v1b-de-final-*`: repeated build/typecheck, validate 0/27, queue 690/13,976, and press. Press matches the approved `../press-after.txt` after normalizing elapsed seconds only; the reference is untouched.
- `v1b-de-sim-compare.txt`: completion round versus reviewed post-Part0 baseline, 18 normalized files identical. The reconstructed original baseline's provenance remains in the A–C report.
- Chromium 1280×720: all five main checks pass; `coverage` adds actual single-scandal/Mags-relief months and static-replay/settled-hit parity. The first main motion log predates these added assertions, so both logs are required.
- Chromium 800×450: clicks, both overflow suites and expanded motion pass. Initial interactions is a **23/24 failure**, preserved; `interactions-retry` passes 24/24 and records intermediate metronome angles within the unchanged observation window. Do not hide the initial failure.
- Chromium phone: clicks/ordinary overflow pass; the first full overflow was invalidated by a 296,535ms host scheduling gap, interaction then timed out, and motion was interrupted. `full-recovery`, `interactions-recovery` and `motion-recovery` all pass after wake. Preserve all three interrupted logs and the power-event record as failures/invalid runs, not layout-overflow findings.
- Desktop `interactions-samples` is a separate long-press failure (23/24), followed by a 24/24 `interactions-trace` rerun; its intermittent cause remains unverified. Further runs and interruptions are described in [the dated report](../../../reports/2026-10-05-v1b-acceptance.md). Large raw browser diagnostics stay in `check/out/`.

All browser checks use fixed seeds/replays. Full overflow retains 50 recorded states / 42 cards. Motion compares exact settled state across full/reduced/off/skips and tests real pointer/key/touch input where supported. Capability skips remain skips, not passes. Videos and timing data live in `../../v1b-compare/`; large videos and the itch ZIP remain outside Git.
