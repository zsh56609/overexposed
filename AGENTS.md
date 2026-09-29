# AGENTS.md

**Overexposed** — Game Gauntlet SIM Jam entry. Read this at the start of every session.
**UI scope and layer plan:** [`docs/ui-plan.md`](docs/ui-plan.md) — build one layer at a time.

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
- Keep this file under ~28 KiB: some agents read only its first 32 KiB and drop the rest silently. Past that, move reference material (the per-event GameEvent spec, band definitions) to `docs/` and link to it; hard rules and FROZEN items stay near the top.

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

/content     JSON. Cards, gates, endings. String KEYS only, never prose.
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
| Endings | 4, ids fixed: `meltdown`, `star`, `craftsman`, `nobody`. Their condition numbers stay tunable |
| Resources | `hype`, `craft`, `capital`, `heat`; 3 slots per turn; a hand of 5. No new resources |
| Starting deck | 11 cards: `vocal_coaching` ×2, `side_gig` ×2, `open_mic`, `cover_single`, `press_junket`, `viral_stunt`, `lay_low`, `networking`, `crisis_pr` |
| Heat formula | the formula in "The Heat → Scandal loop", with `heatThreshold` [7, 6, 6, 5], `thresholdFloor` [7, 6, 5, 4.5], `degradePerScandal` 0.5, `vent` 4. No further changes to any of the four |
| Heat display | whole numbers only: points until the next scandal (see "Displayed heat") — never the effective threshold |
| GameEvent list | the events and fields in [`docs/game-events.md`](docs/game-events.md) ("GameEvents" below) |

### Premise

A career simulation. One run compresses an entertainment career into 10–15 minutes — the target; do not lengthen it ([`docs/ui-plan.md`](docs/ui-plan.md) §12).
Your deck is your résumé.

**Primary engine: deck construction.** The player builds a set of moves and exploits their interactions.
**Secondary engine: resource cascade.** Fast growth accrues Heat; Heat crystallises into permanent Scandal cards; Scandals choke the hand in winter, the last act.

The player plants the seeds of their own collapse. Failure is never random.

### Run structure

- 4 acts × 3 turns = 12 turns. The acts are seasons — spring, summer, autumn, winter — and the UI names them by season, never by number. Act count, turns per act, the season name keys (`actNameKeys`) and the season opener keys (`actOpenerKeys`) live in `content/rules.json`, never as constants.
- Drafts, twice per act: at the start of the turns listed in `draft.atTurns` (turns 1 and 2 of every act, 8 per run — never the last turn of a season, whose pick would rarely be drawn), `offerSize` cards from the draftable pool (non-scandal cards whose `actMin` has been reached); pick 1, no skipping. Capital buys one extra pick from the same offer, or rerolls the offer. Prices and caps (per draft) live in `content/rules.json` → `draft`.
- Each turn: draw to hand size → spend Slots to play cards → end-of-turn resolution
- End of each act: a Gate — the player picks 1 of 2 offered
- After the last act (winter): ending resolution. **A run always completes.**

Actions: `DRAFT_PICK`, `DRAFT_EXTRA_PICK`, `DRAFT_REROLL`, `PLAY_CARD`, `END_TURN`, `CHOOSE_GATE`.

End-of-turn resolution, in order:
1. `onEndOfTurn` effects of every card still in hand, in hand order.
2. The Heat → Scandal check (below).
3. The whole hand, Scandals included, goes to the discard pile. The next turn draws back up to hand size.

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

**Displayed heat (frozen; amended 2026-09-30).** The effective threshold can be fractional (4.5); a player never sees it. The heat meter shows whole numbers from /core, for the state as it stands: points of heat to the next line ("N TO GO"), or once heat is over a line, "LINE CROSSED · N TO THE NEXT". It counts no scandals. The count lives only in the END TURN preview, which runs the reducer and so includes onEndOfTurn effects such as a Copycat Story copying itself ([`docs/ui-plan.md`](docs/ui-plan.md) §13, decisions 1 and 2).

- Scandal cards have `playable: false`. They occupy a hand slot when drawn.
- Most carry an `onEndOfTurn` penalty.
- Removal is deliberately expensive: only a few cards exhaust a Scandal, and they cost `capital`.
- Which Scandal crystallises: the kind of trouble you courted. Each scandal is blamed on the card whose heat pushed the level over its line (k × effective threshold, found by replaying the turn's heat changes) and is one that shares a tag with that card — tags every scandal carries don't count; among several, the one held fewest of. Seeded random only when nothing matches (e.g. heat from a gate). Scandals therefore carry a kind tag matching the heat sources: `press`, `stunt`, `gig`, `recording`, `money`.

**This is the one mechanic the design bets on. Tune it before anything else.**

### Card schema

```json
{
  "id": "vocal_coaching",
  "kind": "action",
  "cost": 1,
  "nameKey": "card.vocal_coaching.name",
  "textKey": "card.vocal_coaching.text",
  "playable": true,
  "tags": ["craft", "training"],
  "actMin": 1,
  "effects": [
    { "op": "resource", "target": "craft", "value": 6 }
  ]
}
```

`kind`: `action` | `opportunity` | `scandal`. Opportunities are draft-only (never in the starting deck) and one-shot: played, they are exhausted instead of discarded, so spending one is a decision.
`actMin`: earliest act this card may be offered in a draft (for scandals: may crystallise). Omit for act 1.
`onDraw` and `onEndOfTurn` are optional effect arrays of the same shape.
`requires`: optional condition (the shape below) that must hold for the card to be played — e.g. a capital price, `"requires": { "capital": { "min": 4 } }`.
Player-facing prose, keys only ([`docs/ui-plan.md`](docs/ui-plan.md) §13, decision 15): `headlineKeys` (non-scandals) are the feed headline variants for playing the card — the UI picks one by a hash of run seed, month and card instance, never the game RNG — and `register` (`loud` | `quiet` | `money`) is the voice it is printed in. A scandal has `headlineKey`, printed when it crystallises, and its `textKey` is its in-hand line: the interface shows its rules from its effects.

### Effect ops (closed set — extend the set, never special-case a card)

| op | fields |
|---|---|
| `resource` | `target`, `value` |
| `draw` | `count` |
| `addCard` | `cardId`, `to` (`deck`\|`discard`\|`hand`), `count` |
| `exhaustTag` | `tag`, `count` — permanently removes matching cards |
| `slots` | `value` — this turn only |
| `setFlag` | `flag` |
| `conditional` | `if` (condition), `then` (effects), `else` (effects) |

Engine rules content can rely on:
- Resources and slots floor at 0.
- `exhaustTag` searches hand → discard → deck.
- `addCard` with `to: "deck"` shuffles the card in at a seeded random position.
- Strict mode (dev and `/sim`): an unknown op, bad content or an illegal action throws. Lenient mode (shipped build): it is skipped and recorded as a `warning` event.

Conditions use one shape everywhere:
`{ "craft": { "min": 20 }, "flags": { "not": ["went_tabloid"] } }`

### Gate schema

```json
{
  "id": "gate_audition",
  "act": 1,
  "nameKey": "gate.audition.name",
  "requires": { "craft": { "min": 18 } },
  "onPass": [{ "op": "resource", "target": "capital", "value": 3 }],
  "onFail": [{ "op": "resource", "target": "hype", "value": -10 }]
}
```

`flavorKey`: the gate's flavour line (prose). Two gates offered per act, resolved after the act's last turn. Gate ids carry no act number: `act` alone says when a gate comes up, so moving it is a one-field change. Failing a Gate is a setback, never a run-ender.
Requirements are evaluated at resolution. Prefer conditions on state at that moment (heat, scandal count, resources) over permanent flag locks (`flags.not` on a flag set early), which turn a gate into a dead end the player can't respond to — validate warns on them. From act 2 on, at least one gate per act must require `hype` (validate enforces), so a pure-craft deck can't pass everything.

### Ending schema

```json
{
  "id": "craftsman",
  "priority": 100,
  "conditions": { "craft": { "min": 55 }, "hype": { "min": 25 }, "scandalCount": { "max": 2 } },
  "textKey": "ending.craftsman.text"
}
```

Prose keys: `nameKey`, `goalKey` (its goals-board line, also the hint for a locked ending), `textKey`. `boardOrder`: its place on the goals board (narrative order, aspirations first), never its `priority`.
Resolved after turn 12 by descending `priority`; first match wins.
**`priority: 0` is an unconditional fallback. It must always exist.**
**No other ending may be a single-axis threshold:** at least two condition keys (validate enforces). A lone threshold makes one resource a dominant strategy. Star rewards surviving the spiral (hype + signed + a scandal ceiling); meltdown's scandal bar sits above star's ceiling so it never preempts a controlled hype run.

Target endings: `craftsman`, `star`, `meltdown`, `nobody`.

### Awards

`content/awards.json`: `id`, `nameKey`, `citationKey`, and `conditions` — the condition shape plus `ending` (`any`/`not` ending ids), `peakScandals` and `bestMonthHype` (read off `turnEnd` events) — or `fallback: true`, won only when nothing else is. Every award whose conditions hold is won. /core's `yearAwards` is a read-only query on the final state and the event history, never a GameEvent. Awards change no play: outside the content budget, capped at 8.

### Content budget

21 action · 7 opportunity · 6 scandal · 8 gate (two per season) · 4 ending = 46 pieces.
A ceiling, not a target.

Card design rules: a card must create an interaction (tags, `conditional`, `requires`), not just add a resource. Keep cards that convert between axes (spend craft to cool heat, spend capital or hype to exhaust a scandal) so the two engines connect. Scandals vary in how they hurt: taking a hand slot, draining at end of turn, and worsening while left in the deck.

---

## 3. i18n

English ships. Chinese is scaffolded only.

- Every user-facing string lives in `/i18n/en.json`, keyed. Never hardcode prose in `.tsx` or `/content`.
- Key convention: `card.<id>.name` · `card.<id>.text` · `card.<id>.headline.<n>` (variants) · `card.<id>.headline` (scandals) · `gate.<stem>.name` · `gate.<stem>.flavor` · `ending.<id>.name` · `ending.<id>.goal` · `ending.<id>.text` · `act.<season>.name` · `act.<season>.opener` · `story.opening` · `award.<id>.name` · `award.<id>.citation` · `flag.<id>.positive` · `flag.<id>.negative` · `tier.<stat>.<n>` (lowest first) · `ui.<area>.<label>`
- Prose the author has not written yet is a value starting `TODO(prose)`: the game shows it as a placeholder and `npm run validate` warns. Agents never replace one with invented prose.
- A missing key renders as the key itself, loudly — never blank, never a crash.
- **Do not spend jam time on translation.**

Rationale: the store page must be English for judges and raters. Chinese is the commercial-release strategy, not the jam strategy.

---

## 4. Content & validation

`npm run validate` checks, and runs in CI:

- unknown effect ops
- references to nonexistent card / gate / ending ids
- missing i18n keys
- cards unreachable in any act
- **missing `priority: 0` fallback ending**
- numeric ranges
- opportunity cards in the starting deck; an act with an empty draft pool
- awards: fields, conditions, ending ids, a fallback award, at most 8
- every flag set or read has both labels, positive and negative (an error, never a template)
- player-facing prose not yet written — warnings, not errors: a card without a headline, a scandal without its headline or in-hand line, an ending without name, goal line or text, a gate without flavour, a season without an opener, the opening

Load failures are loud in dev, graceful in the shipped build.

---

## 5. `/sim` — the balance harness

The primary QA instrument, not an extra. Build it in week one.

- Runs N complete playthroughs headless, seeded, in Node
- Personas: `minmaxer`, `random`, `crafter`, `hypechaser`, `dealseeker`, `comeback`, `artisan`. The greedy personas value flags by what they unlock: a flag some condition requires scores `flagUnlock`, one a condition forbids costs `flagLock`, each weighted by what reads it — ending 1.0 > gate 0.4 > card condition 0.1, summed over distinct tiers (per-flag overrides in `sim/personas.ts`); `dealseeker` weights flags heavily. `artisan` is the craft-leaning player (high craft, moderate hype, risk-averse; no weight is zero, so it stays player-like). `comeback` tests the design thesis — spike hype, then pay to clean up: it plays hype-heavy while holding fewer than N scandals and removal-heavy from N on. N is a fixed persona parameter (`COMEBACK_SWITCH_AT` in `sim/personas.ts`, 5), deliberately not derived from content: an instrument that shifts when you tune the system it measures is not an instrument.
- Drafting (greedy personas): a card's draft value = the odds its `requires` holds when it comes up × its value per slot of one play. A one-shot (opportunity) is used up by its first play, so the repeatable part of its value counts min(1, 1 ÷ expected draws), where expected draws = remaining turns × hand size ÷ (cards owned + 1); setting a flag is permanent and counts in full either way. Odds, per clause, multiplied: a requirement met now = 1; an unmet minimum is projected at the run's growth so far and counts the share of the remaining turns in which it will hold (0 if it won't be reached in time, 0.5 on turn 1 with no history); a maximum exceeded now = 0.5; an act/turn window = the share of remaining turns inside it; a forbidden flag already held = 0 (flags are never unset); a required flag not held yet = 0.5. Reroll when the best card is worth less than the reroll's capital price; buy an extra pick when the best card left behind is worth more than its price.
- Report: ending distribution per persona, per-card play and draft rates, resource curves by turn, scandals held and crystallised, the cascade by act (effective threshold, crystallisations per turn, scandal cards drawn), gate met/pick/pass rates, flags held, draft and capital, run length, soft-lock count
- Console table + JSON output
- Every run records its seed so any anomaly replays alone

**Any content change is followed by a sim run before it counts as done.**

### Tuning targets

**Band population:** the player-like personas in `sim/personas.ts`, 1000 runs each on the same run seeds (`npm run sim -- --runs=1000`). Per-persona bands are checked on each persona separately; pooled bands pool the player-like personas with equal weight (equal runs each). Probes run on the same seeds but never count towards a pooled band: their draws must not set gate difficulty. A pass counts only after it also holds on two alternate batch seeds (`--seed=`).

**Two persona classes**, derived from weights, never from ids. A persona that gives an axis zero weight in every mode ignores that axis entirely and is a **control probe**: ignoring heat = heat, scandal and risk weights all 0 (today `hypechaser`); ignoring hype = hype weight 0 (today `crafter`). Every other persona is **player-like** (`minmaxer`, `dealseeker`, `comeback`, `artisan`, and `random`, which weighs nothing). Probes are not player models but experiments on the design thesis: a deterministic outcome means the experiment worked, so they are exempt from the concentration band and carry inverted assertions that fail if the thesis breaks. The endings those assertions name are derived from content too: the collapse ending sets a scandal floor; the top-hype ending demands the most hype among the endings that don't.

| Metric | Population | Band |
|---|---|---|
| Ending concentration | each player-like persona separately | no single ending above 70% of that persona's runs |
| Thesis: ignoring heat collapses | each probe that ignores heat | the collapse ending (meltdown) in more than 80% of its runs |
| Thesis: ignoring hype never makes a star | each probe that ignores hype | the top-hype ending (star) in fewer than 5% of its runs |
| Clogging: dead cards (scandals) drawn per turn, averaged per act | player-like runs, pooled | rising act by act — lowest in spring, highest in winter |
| Scandals held at run end | player-like runs, pooled | median 2–5 |
| Gate difficulty: met% (requirement already satisfied when offered) | offers to player-like personas, pooled | 35–65% per gate |
| Card play rate (played ÷ drawn) | player-like runs, pooled | every playable card > 2% |
| minmaxer vs random ending distribution | those two personas | significantly different (χ² p < 0.01 and total variation ≥ 0.2) |
| Soft-locks | all runs | 0 |
| Crashes | all runs | 0 |

"The spiral lands in winter" means clogging: the player never sees a crystallisation rate, they see how many of their five cards are dead this turn. Where crystallisation peaks is not a target.

Diagnostics, reported but not bands: the pooled ending distribution and gate pass% (passed when chosen), which measure the persona mix as much as the game — an aggregate can pass while every persona is locked into one ending; and the pooled aggregates recomputed with probes included (scandal median, gate met%, lowest play rate), for comparison only. Probe results beyond their two assertions are diagnostics.

---

## 6. Art direction

**Tabloid / editorial. No illustration on card faces — typography only.** Presentation is scored on clarity as well as art; card text density is high.

Illustration is concentrated at emotional beats:
- **4 endings — required.** These are what players screenshot and what drives "one more run".
- 4 season gates (one per season) — if time allows
- Meltdown trigger — nice to have

**Source: public-domain photo collage.** Cut out → halftone → one spot colour → layered into the layout. The craft is in cropping, screen and composition — design, not drawing.

Sources: Library of Congress, Smithsonian Open Access, NYPL Digital Collections, Wikimedia Commons (PD only). Record every item in `CREDITS.md`: name / author / URL / licence / date.

**Objects and scenes only — never recognisable faces.** Microphones, flashbulbs, stage lights, crowd silhouettes, newsprint stacks, spotlights. Two reasons: PD photos of identifiable people still carry personality rights, and an unseen protagonist lets the player project themselves in.

**Palette:** newsprint cream `#EDE6D6` · ink `#15120E` · tabloid red `#D92B1F`
**Type:** two families only, Google Fonts — the cover is set in Playfair Display and the game matches it; fewer font files also serves the cold-load budget.
- Playfair Display — masthead, headlines, card titles
- Libre Franklin — UI, numbers, body

**Texture:** halftone dot overlay, hard drop shadows, slight card rotation

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
npm run check:preview  # every UI preview against the real reducer outcome
npm run sim:awards     # year-end award rates per persona (targets: docs/decisions.md)
```

Vite must be configured with `base: './'` — itch.io serves HTML5 from a relative path. This is the single most common cause of a blank page on itch.
