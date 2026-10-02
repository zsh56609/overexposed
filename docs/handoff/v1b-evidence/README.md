# V1b A–C acceptance evidence

Collected on 2026-10-03. Console-log trailing spaces are trimmed; results are unchanged. The Chinese report is [2026-10-03-v1b.md](../../reports/2026-10-03-v1b.md); setup and limitations are in [v1b.md](../v1b.md).

- `baseline-manifest.json`: normalized SHA-256 comparison of the reconstructed old `e839f83` simulations with starting commit `3be87b4`. The earlier agent's original ignored outputs were unavailable; these are reconstructed results.
- `sim-compare.txt`: post-change vs starting-commit comparison. All four simulations, seeds 20260929/1/424242, both managers; 18 normalized files identical.
- `preview.txt` and `press-contract.txt`: the Node preview suite and additional pending-label/cooling trajectory assertions. These were run separately from the browser click portion of `check:preview`.
- `clicks.txt`: nine browser/viewport configurations, including real-input D7 at 60ms and 1100ms. Deterministic restarts give identical counts.
- `<browser>-check-overflow.txt`, `<browser>-check-overflow-full.txt`, `<browser>-check-interactions.txt`: final browser logs. Each covers 1280×720, 800×450 and 844×390 phone landscape. Capability skips are preserved in the logs and are not passes.
- `webkit-interactions-initial.txt`: retained initial failure from the old fixed 2.8s metronome wait. Final interaction logs wait for a stable centre with a 7s deadline and record elapsed time; no game animation was changed to pass this check.
- `webkit-metronome-phases.txt`: five diagnostic runs at different swing phases, recording the hit element, trusted clicks, angles, stable stop and restart. This diagnosis ran alongside correctness checks; its frame intervals are not the isolated production performance measurement.
- `press-before.txt` / `press-after.txt`: the read-only front-page rule changes paper-selection counts, not simulation outcomes. The latter is the new press baseline.
- `build.txt`, `validate.txt`, `queue.txt`: final build size, schema warnings and queue lifecycle checks.

Production performance was measured before the parallel browser audits; see [performance.json](../v1b-compare/performance.json). Motion reference frames are in [the comparison page](../v1b-compare/index.html). D/E, real Safari/iPad acceptance and Firefox frame-time investigation remain; no monthly flip/season sequence is claimed complete.
