# Acceptance evidence for game source 508fb2b

The photo-worker implementation is committed and pushed. No later game-source change is included in these checks. Browser checks run serially, independently of production performance measurement.

- `chrome-clicks.txt`: October 14, all three sizes pass, each 233 states / 1,101 controls / 716 opened previews / 3,756 targets / 18,780 points; real-input D7 passes.
- `zip-verification.json`: candidate ZIP named for this source, root index and relative JS/CSS/fonts checked; worker is included. Runtime subdirectory loading is independently verified by the renderer diagnostic.
- `render-initial-failure.txt`: first subdirectory diagnostic failed on Firefox's automatic optional root favicon request. Preserve this failure. The corrected diagnostic reports that favicon separately and still rejects game assets outside the prefix.
- Build, pixel parity, fallback, validate 0/27 and queue 690 / 13,976 logs are in `../de-20261013/photo-worker*.txt`, from this implementation's pre-commit checks.

The remaining new-source matrix is in progress. The previous complete correctness matrix belongs to game source 2e6a3f8, not to this commit. All capability skips stay explicit.
