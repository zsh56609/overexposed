# CLAUDE.md

**Overexposed** — Game Gauntlet SIM Jam entry. Read this at the start of every session.

**Jam window:** 2026-09-24 03:00 JST → **2026-11-05 04:00 JST** (submission).
**Ship language:** English. **Target:** browser build on itch.io.
**Started late — as of 2026-09-29 there are 36 days left. Schedule in §7 is already compressed.**

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

### Premise

A career simulation. One run compresses an entertainment career into ~20 minutes.
Your deck is your résumé.

**Primary engine: deck construction.** The player builds a set of moves and exploits their interactions.
**Secondary engine: resource cascade.** Fast growth accrues Heat; Heat crystallises into permanent Scandal cards; Scandals choke the hand in act 3.

The player plants the seeds of their own collapse. Failure is never random.

### Run structure

- 3 acts × 4 turns = 12 turns
- Start of each act: a Draft — `offerSize` cards from the draftable pool (non-scandal cards whose `actMin` has been reached); pick 1. Capital buys one extra pick from the same offer, or rerolls the offer. Prices and caps live in `content/rules.json` → `draft`.
- Each turn: draw to hand size → spend Slots to play cards → end-of-turn resolution
- End of each act: a Gate — the player picks 1 of 2 offered
- After act 3: ending resolution. **A run always completes.**

Actions: `DRAFT_PICK`, `DRAFT_EXTRA_PICK`, `DRAFT_REROLL`, `PLAY_CARD`, `END_TURN`, `CHOOSE_GATE`.

End-of-turn resolution, in order:
1. `onEndOfTurn` effects of every card still in hand, in hand order.
2. The Heat → Scandal check (below).
3. The whole hand, Scandals included, goes to the discard pile. The next turn draws back up to hand size.

### Resources

| Key | Role |
|---|---|
| `hype` | Fast currency. Drives chart position and most Gates. |
| `craft` | Slow currency. Solves Gates hype can't. Resists Heat. |
| `capital` | Spent to remove Scandals, and in the draft to buy an extra pick or reroll the offer. |
| `heat` | Shadow of hype. Crystallises into Scandals. Never spent, only reduced. |

`slots` is per-turn energy, refreshed each turn. Not a resource.

### The Heat → Scandal loop (the core coupling)

At end of turn: `count = floor(heat / heatThreshold(act))`; add `count` Scandal cards to the discard pile and reduce heat by `heatThreshold(act) × count`. No per-turn cap: excess heat is never free, so a huge hype turn costs more than a small one.

- Scandal cards have `playable: false`. They occupy a hand slot when drawn.
- Most carry an `onEndOfTurn` penalty.
- Removal is deliberately expensive: only a few cards exhaust a Scandal, and they cost `capital`.
- Which Scandal crystallises: a seeded-random pick among scandal cards whose `actMin` has been reached. A tuning knob, not a rule.

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

`kind`: `action` | `opportunity` | `scandal`. Opportunities are draft-only: never in the starting deck.
`actMin`: earliest act this card may be offered in a draft (for scandals: may crystallise). Omit for act 1.
`onDraw` and `onEndOfTurn` are optional effect arrays of the same shape.
`requires`: optional condition (the shape below) that must hold for the card to be played — e.g. a capital price, `"requires": { "capital": { "min": 4 } }`.

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
  "id": "gate_a1_audition",
  "act": 1,
  "nameKey": "gate.a1_audition.name",
  "requires": { "craft": { "min": 18 } },
  "onPass": [{ "op": "resource", "target": "capital", "value": 3 }],
  "onFail": [{ "op": "resource", "target": "hype", "value": -10 }]
}
```

Two gates offered per act. Failing a Gate is a setback, never a run-ender.

### Ending schema

```json
{
  "id": "craftsman",
  "priority": 100,
  "conditions": { "craft": { "min": 55 }, "hype": { "min": 25 }, "scandalCount": { "max": 2 } },
  "textKey": "ending.craftsman.text"
}
```

Resolved after turn 12 by descending `priority`; first match wins.
**`priority: 0` is an unconditional fallback. It must always exist.**
**No other ending may be a single-axis threshold:** at least two condition keys (validate enforces). A lone threshold makes one resource a dominant strategy. Star rewards surviving the spiral (hype + signed + a scandal ceiling); meltdown's scandal bar sits above star's ceiling so it never preempts a controlled hype run.

Target endings: `craftsman`, `star`, `meltdown`, `nobody`.

### Content budget

20 action · 6 opportunity · 6 scandal · 6 gate · 4 ending = 42 pieces.
A ceiling, not a target.

---

## 3. i18n

English ships. Chinese is scaffolded only.

- Every user-facing string lives in `/i18n/en.json`, keyed. Never hardcode prose in `.tsx` or `/content`.
- Key convention: `card.<id>.name` · `card.<id>.text` · `gate.<id>.name` · `ending.<id>.text` · `ui.<area>.<label>`
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

Load failures are loud in dev, graceful in the shipped build.

---

## 5. `/sim` — the balance harness

The primary QA instrument, not an extra. Build it in week one.

- Runs N complete playthroughs headless, seeded, in Node
- Personas: `minmaxer`, `random`, `crafter`, `hypechaser`, `dealseeker`. The greedy personas value flags: a flag some condition requires scores `flagUnlock`, one a condition forbids costs `flagLock` (per-flag overrides in `sim/personas.ts`); `dealseeker` weights flags heavily.
- Report: ending distribution, per-card play rate, resource curves by turn, scandals held at end, gate pass rates, run length, soft-lock count
- Console table + JSON output
- Every run records its seed so any anomaly replays alone

**Any content change is followed by a sim run before it counts as done.**

### Tuning targets

| Metric | Band |
|---|---|
| Each ending reached | ≥10%, none >45% |
| Scandals held at run end | median 2–5 |
| Gate pass rate | 40–80% per gate |
| Card play rate | every card >2% |
| minmaxer vs random ending distribution | significantly different |
| Soft-locks | 0 |

---

## 6. Art direction

**Tabloid / editorial. No illustration on card faces — typography only.** Presentation is scored on clarity as well as art; card text density is high.

Illustration is concentrated at emotional beats:
- **4 endings — required.** These are what players screenshot and what drives "one more run".
- 3 act gates — if time allows
- Meltdown trigger — nice to have

**Source: public-domain photo collage.** Cut out → halftone → one spot colour → layered into the layout. The craft is in cropping, screen and composition — design, not drawing.

Sources: Library of Congress, Smithsonian Open Access, NYPL Digital Collections, Wikimedia Commons (PD only). Record every item in `CREDITS.md`: name / author / URL / licence / date.

**Objects and scenes only — never recognisable faces.** Microphones, flashbulbs, stage lights, crowd silhouettes, newsprint stacks, spotlights. Two reasons: PD photos of identifiable people still carry personality rights, and an unseen protagonist lets the player project themselves in.

**Palette:** newsprint cream `#EDE6D6` · ink `#15120E` · tabloid red `#D92B1F`
**Type:** Anton (display/numerals) · Newsreader (card headlines) · Archivo (UI) — Google Fonts
**Texture:** halftone dot overlay, hard drop shadows, slight card rotation

**Motion is the art budget.** In this direction, juice is not decoration — without card flight, number roll-up, hit-stop and screen shake, the game reads as a spreadsheet. Budget real time for it.

**Do not start art before 2026-10-26.** Painting a loop that isn't tuned is wasted work.

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
| 10/26–11/2 | Art layer + motion polish |
| 11/3–11/4 | Buffer, itch page, submission materials |
| **11/5 04:00 JST** | **Deadline — treat 11/4 as the real one** |

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
- [ ] AI content disclosure

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
```

Vite must be configured with `base: './'` — itch.io serves HTML5 from a relative path. This is the single most common cause of a blank page on itch.
