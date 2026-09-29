# Overexposed

A deck-building career sim: one run compresses an entertainment career into about 20 minutes, and your deck is your résumé. Fast fame builds Heat, Heat crystallises into Scandal cards, and Scandals choke your hand.

Entry for the Game Gauntlet SIM Jam (2026-09-24 → 2026-11-05). Browser build for itch.io. Work in progress: the rules engine and balance simulator run headless; there is no UI yet.

```
npm install
npm run validate    # content, i18n keys and code-boundary checks
npm run sim         # headless balance run: npm run sim -- --runs=1000
npm run typecheck
npm run dev         # Vite dev server
npm run build       # production browser build
```

Built with AI assistance (Claude); commits made with it carry a `Co-Authored-By` trailer.
