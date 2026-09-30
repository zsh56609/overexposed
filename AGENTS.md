# AGENTS.md

**Overexposed** — Game Gauntlet SIM Jam entry. Read this at the start of every session.
**UI scope and layer plan:** [`docs/ui-plan.md`](docs/ui-plan.md) — build one layer at a time.
Visual design reference: [`docs/design/visual/README.md`](docs/design/visual/README.md) — read it before any visual-phase work.

**Jam window:** 2026-09-24 03:00 JST → **2026-11-05 04:00 JST** (submission).
**Ship language:** English. **Target:** browser build on itch.io.
**Started late — as of 2026-09-29 there are 36 days left. Schedule in §7 is already compressed.**

---

## Session rules — every agent, every tool

- **Session start:** read [`docs/status.md`](docs/status.md) before doing anything.
- **Session end:** update `docs/status.md`, commit, push.
- A design decision made in conversation is written to [`docs/decisions.md`](docs/decisions.md) in the same session.
- Every AI-assisted commit identifies the tool. Claude Code adds its Co-Authored-By trailer automatically; any other tool adds a Co-Authored-By trailer naming itself.
- Agents never invent player-facing prose: they build fields, keys and placeholders and import prose the author has approved (see [`docs/ui-plan.md`](docs/ui-plan.md) §13, decision 15).
- Keep this file under 24 KiB: some agents read only its first 32 KiB and drop the rest silently. It carries only rules, the frozen summary and pointers; reference material lives in `docs/` and is linked from here — content shapes and what validate checks ([`docs/content-schema.md`](docs/content-schema.md)), the sim's personas and bands ([`docs/sim.md`](docs/sim.md)), the GameEvent spec, the content expansion design.

---

## 0. HARD RULES — never violate

1. **`/core` imports nothing from React, the DOM, or any browser API.** No `window`, no `document`, no `localStorage`. If it can't run under bare Node, it doesn't belong in `/core`.
2. **Adding or changing a card, gate, or ending must never require a code change.** If it does, the engine is underspecified — extend the engine, never special-case content in code.
3. **`/core` and `/sim` never handle display strings.** IDs, keys and numbers only.
4. **Never `Math.random()`.** Seeded RNG lives in GameState; every run replays exactly from its seed.
5. **After 2026-11-05 04:00 JST: crash fixes only.** No balance changes, no new content, no polish. See §10.
6. **No new dependencies without asking.** Every dependency is a jam-day risk and a credits obligation.

---

## 1. Architecture

```
/core        pure TypeScript. Zero runtime dependencies.
  rng.ts       seeded PRNG; state lives in GameState
  state.ts     GameState type + createInitialState(seed, content)
  conditions.ts condition evaluation
  resolve.ts   effect application
  reducer.ts   (state, action) => state — pure, the only place state changes

/content     JSON. Cards, gates, endings, awards, the press, the managers. String KEYS only, never prose.
/i18n        en.json (ships), zh-CN.json (reserved, not a jam deliverable)
/sim         Node harness. Imports /core. Never imports /ui or /i18n.
/ui          React. Renders what /core returns. Holds no game rules.
/art         Source images and treatment notes. See §6.
```

UI dispatches actions; it never mutates state.

---

## 2. Game design

### FROZEN for UI (2026-09-29)

The UI is built around the items below. Changing any of them now means reworking layout, flow or animation, so they are fixed. Everything else — card, gate and ending numbers (requirements, effects, prices), draft prices and timing, `actMin`, card text — stays tunable through content, and the UI reads it from content, never hardcodes it.

| Frozen | As it stands |
|---|---|
| Run structure | 4 acts × 3 turns = 12 turns. The acts are seasons — spring, summer, autumn, winter — named through `rules.actNameKeys` |
| Gates | 8 gates, two per season. After each season's last turn, 2 are offered and the player picks 1 |
| Endings | **Unfrozen 2026-09-30** for the content expansion (docs/decisions.md): two levels, see "Endings" below. The four old ids live on as minors |
| Resources | `hype`, `craft`, `capital`, `heat`; 3 slots per turn; a hand of 5. No new resources |
| Starting deck | 11 cards: `vocal_coaching` ×2, `side_gig` ×2, `open_mic`, `cover_single`, `press_junket`, `viral_stunt`, `lay_low`, `networking`, `crisis_pr` |
| Heat formula | the formula in "The Heat → Scandal loop", with `heatThreshold` [7, 6, 6, 5], `thresholdFloor` [7, 6, 5, 4.5], `degradePerScandal` 0.5, `vent` 4. No further changes to any of the four |
| Heat display | whole numbers only: points until the next scandal (see "Displayed heat") — never the effective threshold |
| GameEvent list | the events and fields in [`docs/game-events.md`](docs/game-events.md) ("GameEvents" below); phase 3 of the content expansion adds new types only |

### Premise

A career simulation. One run compresses an entertainment career into 10–15 minutes — the target; do not lengthen it ([`docs/ui-plan.md`](docs/ui-plan.md) §12).
Your deck is your résumé.

**Primary engine: deck construction.** The player builds a set of moves and exploits their interactions.
**Secondary engine: resource cascade.** Fast growth accrues Heat; Heat crystallises into permanent Scandal cards; Scandals choke the hand in winter, the last act.

The player plants the seeds of their own collapse. Failure is never random.

### Run structure

- 4 acts × 3 turns = 12 turns. The acts are seasons — spring, summer, autumn, winter — and the UI names them by season, never by number. Act count, turns per act, the season name keys (`actNameKeys`) and the season opener keys (`actOpenerKeys`) live in `content/rules.json`, never as constants.
- Drafts, twice per act: at the start of the turns listed in `draft.atTurns` (turns 1 and 2 of every act, 8 per run — never the last turn of a season, whose pick would rarely be drawn), `offerSize` cards from the draftable pool (non-scandal cards whose `actMin` has been reached), at least `laneCards` of them from the established lane once there is one; pick 1, no skipping. Capital buys one extra pick from the same offer, or rerolls the offer. Prices and caps (per draft) live in `content/rules.json` → `draft`.
- Each turn: draw to hand size → spend Slots to play cards → end-of-turn resolution
- End of each act: a Gate — the player picks 1 of 2 offered
- After the last act (winter): ending resolution. **A run always completes.**
- Before month 1: the player chooses a manager (phase `manager`). Each has one perk — data in `content/managers.json`, applied by the engine — and messages /core derives from history ([`docs/design/content-expansion.md`](docs/design/content-expansion.md) §3.2).

Actions: `CHOOSE_MANAGER`, `DRAFT_PICK`, `DRAFT_EXTRA_PICK`, `DRAFT_REROLL`, `PLAY_CARD`, `END_TURN`, `CHOOSE_GATE`.

End-of-turn resolution, in order:
1. `onEndOfTurn` effects of every card still in hand, in hand order.
2. The Heat → Scandal check (below).
3. The whole hand, Scandals included, goes to the discard pile. The next turn draws back up to hand size.
4. The manager's month-end effects (`perk.monthEnd`), after the `turnEnd` record: the heat formula is untouched.

### GameEvents (frozen)

Every action returns the new state with `events`: what happened, in order, ids and numbers only. The UI animates from these and never diffs states. Defined in `core/state.ts`.

The per-event spec — every event, its fields, when it is emitted, and the typical sequences — is in [`docs/game-events.md`](docs/game-events.md), frozen with this section.

### Resources

| Key | Role |
|---|---|
| `hype` | Fast currency. Drives chart position and most Gates. |
| `craft` | Slow currency. Solves Gates hype can't. Resists Heat. |
| `capital` | Spent to remove Scandals, and in the draft to buy an extra pick or reroll the offer. |
| `heat` | Shadow of hype. Crystallises into Scandals. Never spent, only reduced. |

`slots` is per-turn energy, refreshed each turn. Not a resource.

### The Heat → Scandal loop (the core coupling)

At end of turn:

```
effectiveThreshold = max(thresholdFloor(act), heatThreshold(act) - scandalsHeld * degradePerScandal)
count = floor(heat / effectiveThreshold)      // add `count` Scandal cards to the discard pile
heat -= vent * count                          // vent < every thresholdFloor, so a residue always carries over
```

All four numbers live in `content/rules.json`; `heatThreshold` and `thresholdFloor` hold one entry per act. The floor tightens season by season, so degradation cannot exhaust itself early: late in the run the same pile of scandals drags the threshold lower than it could in spring. No per-turn cap: excess heat is never free. The residue is the cascade's transmission medium within and across turns, and the degrading threshold makes tolerance fall as scandals accumulate — so removing a scandal buys the threshold back, which is what makes "spike, then clean up" a real strategy.

**Displayed heat (frozen; amended 2026-09-30).** The effective threshold can be fractional (4.5); a player never sees it. The heat meter shows whole numbers from /core, for the state as it stands: points of heat to the next line ("N TO GO"), or once heat is over a line, "N TO NEXT" beside the tier word ("Breaking", "Frenzy") that already says a line is crossed. It counts no scandals. A pressure tier word leads it (decision 25). The count lives only in the END TURN preview, which runs the reducer and so includes onEndOfTurn effects such as a Copycat Story copying itself ([`docs/ui-plan.md`](docs/ui-plan.md) §13, decisions 1 and 2).

- Scandal cards have `playable: false`. They occupy a hand slot when drawn.
- Most carry an `onEndOfTurn` penalty.
- Removal is deliberately expensive: only a few cards exhaust a Scandal, and they cost `capital`.
- Which Scandal crystallises: the kind of trouble you courted. Each scandal is blamed on the card whose heat pushed the level over its line (k × effective threshold, found by replaying the turn's heat changes) and is one that shares a tag with that card — tags every scandal carries don't count; among several, the one held fewest of. Seeded random only when nothing matches (e.g. heat from a gate). Scandals therefore carry a kind tag matching the heat sources: `press`, `stunt`, `gig`, `recording`, `money`.

**This is the one mechanic the design bets on. Tune it before anything else.**

### Cards, effects, gates

Their shapes, and the engine rules content can rely on: [`docs/content-schema.md`](docs/content-schema.md).

- `kind`: `action` | `opportunity` | `scandal`. Opportunities are draft-only and one-shot: played, they are exhausted, so spending one is a decision.
- Every non-scandal card has a `lane` (one of `rules.lanes`, or `neutral`). The career lane is read from the cards played, never chosen: /core's `currentLane` for endings; the established lane (display, and the lane-weighted draft) has hysteresis ([`docs/design/content-expansion.md`](docs/design/content-expansion.md) §2).
- **Effect ops are a closed set** — `resource`, `draw`, `addCard`, `exhaustTag`, `slots`, `setFlag`, `conditional`: extend the set, never special-case a card. Conditions have one shape everywhere. Strict mode (dev and `/sim`) throws on bad content or an illegal action; lenient mode (shipped build) skips it and records a `warning` event.
- Gates: two offered per season, resolved after its last month. Failing one is a setback, never a run-ender. Prefer conditions on state at resolution over permanent flag locks (validate warns). From act 2 on, at least one gate a season requires `hype` (validate enforces).
- Player-facing prose is keys only: every line group is a list of variants shown through a shuffle bag counted from the run's history, never the game RNG.

### Endings (two levels)

Four **major** endings are a 2×2 of fame (hype at year end against a split that sits on the "Known" tier boundary) and reputation (scandals at year end against a split). Fourteen **minors** refine them by lane, signing, craft and the shape of the year: within its major, the first minor whose condition holds, else the major's fallback — exhaustive at both levels. /core's `endingIfYearEndedNow` returns major and minor, and the reducer resolves the real ending through it. The full table: [`docs/design/content-expansion.md`](docs/design/content-expansion.md) §1.

### Awards, the press, the managers, stat tiers

Read-only /core queries, never GameEvents, that change no play: `yearAwards` (every award whose conditions hold, a fallback only when none does; at most 8); `pressLines` and `frontPages` (the press — design §3.4); `managerMessages` (design §3.2); `statTiers` (the stat bar's words — /ui never computes a boundary).

### Content budget

28 action · 8 opportunity · 6 scandal · 8 gate (two per season) · 4 major and 14 minor endings = 68 pieces (raised for the content expansion, and for round 2c's three screen cards; its events get their own budget).
A ceiling, not a target; validate enforces it.

Card design rules: a card must create an interaction (tags, `conditional`, `requires`), not just add a resource. Keep cards that convert between axes (spend craft to cool heat, spend capital or hype to exhaust a scandal) so the two engines connect. Scandals vary in how they hurt: taking a hand slot, draining at end of turn, and worsening while left in the deck.

---

## 3. i18n

English ships. Chinese is scaffolded only.

- Every user-facing string lives in `/i18n/en.json`, keyed. Never hardcode prose in `.tsx` or `/content`.
- The key convention: [`docs/content-schema.md`](docs/content-schema.md#i18n-keys).
- Prose the author has not written yet is a value starting `TODO(prose)`: the game shows it as a placeholder and `npm run validate` warns. Agents never replace one with invented prose.
- A missing key renders as the key itself, loudly — never blank, never a crash.
- **Do not spend jam time on translation.**

Rationale: the store page must be English for judges and raters. Chinese is the commercial-release strategy, not the jam strategy.

---

## 4. Content & validation

`npm run validate` checks content against [`docs/content-schema.md`](docs/content-schema.md) and runs in CI: ids and references, i18n keys, reachability, exhaustive endings, lanes, the content budget, numeric ranges, awards, flag labels, tiers, the press, the managers, and the §0 code boundaries. Missing prose and too few variants per line group are warnings, not errors. The full list: [`docs/content-schema.md`](docs/content-schema.md#what-validate-checks).

Load failures are loud in dev, graceful in the shipped build.

---

## 5. `/sim` — the balance harness

The primary QA instrument, not an extra. Build it in week one.

- Runs N complete playthroughs headless, seeded, in Node
- Personas ([`docs/sim.md`](docs/sim.md#personas)): player-like `minmaxer`, `random`, `dealseeker`, `comeback`, `artisan`; control probes `crafter`, `hypechaser`; lane probes `screenseeker`, `celebseeker`. An instrument that shifts when you tune the system it measures is not an instrument: persona parameters (e.g. `COMEBACK_SWITCH_AT`) are fixed, never derived from content.
- Drafting (greedy personas): the draft-value heuristics are in [`docs/sim.md`](docs/sim.md#drafting-greedy-personas).
- The manager is the batch's to set, never the persona's: every band runs once per manager (`--manager=<id>`; without it, each in turn). `npm run sim:managers` sets the two side by side.
- Report: ending distribution per persona, per-card play and draft rates, resource curves by turn, scandals held and crystallised, the cascade by act (effective threshold, crystallisations per turn, scandal cards drawn), gate met/pick/pass rates, flags held, draft and capital, run length, soft-lock count
- Console table + JSON output
- Every run records its seed so any anomaly replays alone

**Any content change is followed by a sim run before it counts as done.**

### Tuning targets

Band population, persona classes, the band table and diagnostics: [`docs/sim.md`](docs/sim.md#tuning-targets).

---

## 6. Art direction

**Tabloid / editorial. No illustration on card faces — typography only.** Presentation is scored on clarity as well as art; card text density is high.

Illustration is concentrated at emotional beats:
- **4 endings — required.** These are what players screenshot and what drives "one more run".
- 4 season gates (one per season) — if time allows
- Meltdown trigger — nice to have

**Source: public-domain photo collage** (Library of Congress, Smithsonian Open Access, NYPL Digital Collections, Wikimedia Commons — PD only), recorded item by item in `CREDITS.md`: name / author / URL / licence / date. **Objects and scenes only — never recognisable faces**: PD photos of identifiable people still carry personality rights, and an unseen protagonist lets the player project themselves in. Newspaper photographs are drawn in code, never image files or generated images.

**Palette:** newsprint cream `#EDE6D6` · ink `#15120E` · tabloid red `#D92B1F`. **Type:** Playfair Display (mastheads, headlines, card titles) and Libre Franklin (UI, numbers, body), self-hosted — the game loads no web fonts. Everything else — the scene, components, colours, behaviour: [`docs/design/visual/README.md`](docs/design/visual/README.md).

**Motion is the art budget.** In this direction, juice is not decoration — without card flight, number roll-up, hit-stop and screen shake, the game reads as a spreadsheet. Budget real time for it.

**Do not start illustration before 2026-10-26** — the four ending illustrations. Layer 2 visual craft (type, palette, layout, texture) proceeds once the meaning layer is in; the loop is already tuned.

---

## 7. Schedule (compressed — 5 days lost)

| Dates | Phase |
|---|---|
| 9/29–10/2 | `/core` + `/sim` running. **No UI.** |
| 10/3–10/9 | Card pool draft + balance via sim |
| 10/10–10/15 | React UI |
| **10/15** | **Internal feature freeze — tuning and polish only after this** |
| 10/16–10/25 | Early build to jam Discord; iterate on feedback |
| **~10/18** | **Submit an early build to itch as insurance** (see §10) |
| 10/26–11/2 | Illustration + motion polish |
| 11/3–11/4 | Buffer, itch page, submission materials |
| **11/5 04:00 JST** | **Deadline — treat 11/4 as the real one** |

Progress runs ahead of this table: UI layer 1 was built on 2026-09-29. The current task is in [`docs/status.md`](docs/status.md).

### Scope control

The failure mode is not running out of time; it's spending week five adding a system instead of tuning the loop.

- Anything not required for a complete, tunable run goes to `BACKLOG.md`, not the build.
- After 10/15: tuning, polish, fixes only.

---

## 8. Definition of done

| Gate | Standard |
|---|---|
| Core loop | A full run completes headless in `/sim` with no crashes |
| Balance | Sim metrics inside the §5 bands; no dominant strategy |
| Playable | A stranger completes a run without verbal explanation |
| **Engagement** | **Playtesters start a second run unprompted** |
| Ship | Browser build loads cold in under 10s and runs in Safari |

"Do you want another run?" is a literal community rating criterion. Engagement is the primary gate.

---

## 9. Git & devlog

The repo is public and its history is evidence. The jam requires a signed attestation that core design, code and content were created within the jam window; false attestation forfeits placement and prizes, retroactively.

- Commit meaningfully and often.
- Devlog every 3–4 days. Short is fine.
- Devlogs score indirectly: judges rate **Execution — scope control, polish, and how complete it feels for six weeks.** A legible build history is direct evidence.

---

## 10. Jam compliance & submission

There is **no official repo** — itch.io does not host code. Build on itch as a project page, then submit that project from the jam page. Put the GitHub link in the project description.

**Submit an early build around 10/18 and keep replacing it.** itch allows unlimited build updates until submissions close, so an early submission is insurance against anything going wrong on 11/4.

**Submission must include:**
- [ ] Playable browser build (browser builds get the most plays and ratings)
- [ ] Title + description **in English**, stating the relation to the theme
- [ ] Controls and instructions
- [ ] One-line statement of intent — what it simulates and who it's for. Raters use it to judge the game on its own terms; write it deliberately.
- [ ] Discord username matching the account in the server (**required**)
- [ ] Credits for every third-party asset
- [ ] AI content disclosure: code written with AI assistance (Claude Code and OpenAI Codex); player-facing text drafted with AI assistance; art public-domain/CC0; no generated images or audio

**Content standard: ESRB Teen or lower.** Build consequence systems around reputation and public fallout, never explicit content.

**Rating obligation:** rate at least 5 other entries during 11/5–11/11 JST, or the entry is ineligible for prizes. Never solicit ratings or trade votes — disqualifying.

**Post-submission freeze (11/5–11/11 JST):** uploads only to fix crashes, soft-locks, launch failures, save corruption. Post a one-line devlog for any fix; timestamps are checked.

**If top 5:** 1–2 min video due 11/14 04:00 JST; **live demo 11/15 04:00 JST (Sunday)**. Live attendance is weighted heavily over the video fallback.

---

## 11. Commands

```
npm run dev            # Vite dev server
npm run build          # production browser build
npm run sim            # headless balance run
npm run validate       # content schema + i18n key check
npm run typecheck
npm run check:preview  # every UI preview against the real reducer outcome, then check:clicks
npm run check:clicks   # no click on a card or END TURN is swallowed (headless Chrome)
npm run sim:awards     # year-end award rates per persona (targets: docs/decisions.md)
npm run sim:tiers      # stat tiers reached in play, per persona
npm run sim:managers   # the two managers side by side, and the message triggers
npm run sim:variants   # appearances per line group → sim/appearances.json, and the variant gap list
npm run sim:press      # front pages: lead papers, the fame meter, the rival, world-pool repeats
```

Every `sim` script takes `--seed=` and `--manager=<id>` (without it, each manager in turn).

Vite must be configured with `base: './'` — itch.io serves HTML5 from a relative path. This is the single most common cause of a blank page on itch.
