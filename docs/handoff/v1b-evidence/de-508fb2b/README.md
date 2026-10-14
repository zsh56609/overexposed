# Acceptance evidence for game source 508fb2b

The photo-worker implementation is committed and pushed. No later game-source change is included in these checks. Browser checks run serially, independently of production performance measurement.

- `chrome-clicks.txt`: October 14, all three sizes pass, each 233 states / 1,101 controls / 716 opened previews / 3,756 targets / 18,780 points; real-input D7 passes.
- `chrome-overflow.txt`: all three sizes pass, each 213 states / 544 opened previews / 973 tooltips / 106 paper pulls / 36 reactions.
- `chrome-full.txt`: all three sizes pass, each 549 states / 1,422 previews / 2,548 tooltips and 50 fixed replays / all 42 cards.
- `chrome-interactions.txt`: all three sizes 24/24, including held touch and metronome stop/restart.
- `chrome-motion.txt`: all three sizes pass, including stationary/moving/keyboard/touch preview suppression and recovery, six-path pile parity plus static replay, eight month cases, actual choice boundaries, OS media changes and stale callbacks.
- `zip-verification.json`: candidate ZIP named for this source, root index and relative JS/CSS/fonts checked; worker is included. Runtime subdirectory loading is independently verified by the renderer diagnostic.
- `render-initial-failure.txt`: first subdirectory diagnostic failed on Firefox's automatic optional root favicon request. Preserve this failure. The corrected diagnostic reports that favicon separately and still rejects game assets outside the prefix.
- Build, pixel parity, fallback, validate 0/27 and queue 690 / 13,976 logs are in `../de-20261013/photo-worker*.txt`, from this implementation's pre-commit checks.

Chromium's new-source matrix is complete. Firefox and WebKit are in progress, serially. The previous complete three-browser matrix belongs to game source 2e6a3f8, not to this commit. All capability skips stay explicit.
