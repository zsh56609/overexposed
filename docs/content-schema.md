# Content schema

Reference for `/content`: the shapes of cards, effects, gates, endings,
awards, the press, the managers and stat tiers; the i18n key convention;
and what `npm run validate` checks — it enforces every shape here. Moved
out of AGENTS.md so that it carries only rules, the frozen summary and
pointers: endings to tiers in phase 2a, cards, effects, gates, keys and
checks in round 2c (2026-09-30).

## Cards — `content/cards.json`

```json
{
  "id": "vocal_coaching",
  "kind": "action",
  "cost": 1,
  "nameKey": "card.vocal_coaching.name",
  "textKey": "card.vocal_coaching.text",
  "playable": true,
  "tags": ["craft", "training"],
  "lane": "music",
  "actMin": 1,
  "effects": [
    { "op": "resource", "target": "craft", "value": 6 }
  ]
}
```

`kind`: `action` | `opportunity` | `scandal`. Opportunities are draft-only (never in the starting deck) and one-shot: played, they are exhausted instead of discarded, so spending one is a decision.
`actMin`: earliest act this card may be offered in a draft (for scandals: may crystallise). Omit for act 1.
`lane`: one of `rules.lanes` (`music`, `screen`, `celebrity`) or `neutral`: utility — draws, heat relief, scandal removal — plus Side Gig, as the author assigned. Every non-scandal card has one; scandals have none. The career lane is read, never chosen: /core's `currentLane` and `laneShares` count the cards played (`careerPlays`), neutral never counts, starting-deck cards only if `rules.laneStartingDeck`; a tie goes to the first lane, music. `establishedLanes` (display only: the press subject, the lead paper, the managers) reads the established lane from history — it has hysteresis: a lane establishes itself once `rules.laneEstablished` holds and stays while it still leads; "early" before ([`docs/design/content-expansion.md`](docs/design/content-expansion.md) §2).
`flavorKey` (round 2c): a non-scandal's flavour line, italic on its face; a
scandal's flavour line is its in-hand line.
`face` (round 2c, for the visual phase): the card's face — `flyer`, `score`,
`script`, `revision`, `callsheet`, `headshot`, `gloss`, `gold`, `pass`,
`notebook` or `scandal`. Without one, its lane's default in
`rules.cardFaces` (music flyer, screen script, celebrity gloss, neutral
notebook; scandals scandal). /core's `cardFace` resolves it; validate
requires every card to have a known face.
`textKey` is the card's rules text. A card without one (round 2c's new
screen cards, until the author writes theirs) shows the interface's words
for its requirement and effects.
`onDraw` and `onEndOfTurn` are optional effect arrays of the same shape.
`requires`: optional condition (the shape below) that must hold for the card to be played — e.g. a capital price, `"requires": { "capital": { "min": 4 } }`.
Player-facing prose, keys only ([`docs/ui-plan.md`](docs/ui-plan.md) §13, decision 15): every line group is a list of variants shown through a shuffle bag counted from the run's history, never the game RNG (`core/variants.ts`, `core/lines.ts`). `headlineKeys` are the headline variants — a card's for playing it, a scandal's for crystallising — and `register` (`loud` | `quiet` | `money`) is the voice a card's headline is printed in. A scandal's `inHandKeys` are the lines it shows in the hand; it has no `textKey`: the interface shows its rules from its effects.

## Effect ops and conditions

A closed set: extend the set, never special-case a card.

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

## Gates — `content/gates.json`

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

`flavorKeys`: the gate's flavour variants (prose), one per run. Two gates offered per act, resolved after the act's last turn. Gate ids carry no act number: `act` alone says when a gate comes up, so moving it is a one-field change. Failing a Gate is a setback, never a run-ender.
Requirements are evaluated at resolution. Prefer conditions on state at that moment (heat, scandal count, resources) over permanent flag locks (`flags.not` on a flag set early), which turn a gate into a dead end the player can't respond to — validate warns on them. From act 2 on, at least one gate per act must require `hype` (validate enforces), so a pure-craft deck can't pass everything.

## Endings — `content/endings.json`

Two levels ([`design/content-expansion.md`](design/content-expansion.md) §1).

- `axes`: `id`, `key` (a condition key), `from` (where the high side
  starts), `sides` (low, then high), optional `unlisted` — sides the goals
  board does not list as a requirement (the tier word and the goal line
  carry them).
- `majors`, in goals-board order: `id`, `on` (a side per axis),
  `nameKey`, `goalKey`. Every corner of the axes has exactly one major.
- `minors`, in resolution order within their major: `id`, `major`,
  `nameKey`, `textKeys` (the text's variants, one per run), optional
  `goalKey`, and either `conditions` or `fallback: true` — exactly one
  fallback per major, last.

Minor conditions are **year conditions**: the condition shape plus
`lane` (`any`/`not`), `holds` (card ids in the deck, `all`/`any`/`not`),
`anyOf` (alternatives), and the year stats `peakHype`, `peakScandals`,
`scandalDrop` (peak minus now), `bestMonthHype`, kept in `state.year` at
each month end.

## Awards — `content/awards.json`

`id`, `nameKey`, `citationKey`, and `conditions` — year conditions plus
`ending` (`any`/`not` major or minor ids; a major matches each of its
minors) — or `fallback: true`, won only when nothing else is. Every award
whose conditions hold is won. /core's `yearAwards` is a read-only query
on the final state, never a GameEvent. Awards change no play: outside the
content budget, capped at 8.

## The press — `content/press.json`

Phase 2a ([`design/content-expansion.md`](design/content-expansion.md)
§3.1; the voices in [`writing/voice.md`](writing/voice.md)).

- `papers`: `id`, `mastheadKey`.
- `route`: `loud` maps each card lane to a paper; `money` and `scandal`
  name one. A quiet line prints in no paper: the player's notebook.
- `subjects`: per lane, one i18n key per hype tier, lowest first — the
  noun `{subject}` becomes; `earlyLane` is the column read while no lane
  is established.
- A paper's `world`: its world news, `{ key, act? }` — any season, or
  only its own (once a run); `sagas` (round 2b): `{ id, beats }`, one
  beat key per season, each printed in a month of its season the seed
  chooses; `spilloverKeys`: the frenzy spilling over into it;
  `fillerKeys` (round 2b): its fame filler, a line group with the subject
  slot.
- `page`: the front page's `slots` (most prominent first); `worldMin`,
  world stories per page by fame tier; `loud.inLane` / `loud.offLane`,
  a LOUD line's prominence by fame tier in the established lane's paper
  and in another; `scandal`, a scandal's prominence by fame tier; `money`
  and `spillover` prominences; `frenzyAt`, the scandals in a month that
  make a frenzy; `spilloverFrom`, the fame tier from which a frenzy
  spills over; `overwhelmScandalFrom` and `overwhelmLaneFrom`, the fame
  tiers from which the scandal paper (in a scandal's month) and the lane's
  paper are overwhelmed; `filler` (round 2b): `laneFrom` and `laneBelow`
  — from this tier the lane's paper gets one filler line while the player
  has fewer stories there than this — `fillLaneFrom`, the tier from which
  filler fills the lane's paper, and `scandalPaperFrom`, the tier from
  which the scandal paper gets one filler line whatever the lane.
- `scenes` (round 2c, for the visual phase's photographs; only a lead story
  has one): `player` and `world`, a scene per paper; `scandal` and `rival`;
  `overrides` by line group id (`card:<id>`, `scandal:<id>`, `world:<paper>`,
  `filler:<paper>`, `spillover:<paper>`) or by i18n key. The scenes:
  `singer`, `rival`, `crowd`, `paparazzi`, `carpet`, `filmset`, `street`,
  `trophy`. /core's `sceneOf` gives each lead its scene in `frontPages`.
- `rival.arcs`: `id`, `major` (the major ending her year ends in), one
  `beats` entry per season (`paper`, `key`), `endingKey`.

/core's `pressLines` gives each printed line its variant, paper and
subject, fixed at the moment it prints; `frontPages` composes every
month's front pages from the run's history.

## The managers — `content/managers.json`

Round 2b ([`design/content-expansion.md`](design/content-expansion.md)
§3.2; the prose in [`writing/draft-v6.md`](writing/draft-v6.md)).

- `choice`: the choice screen's `kickerKey`, `titleKey`, `subtitleKey`,
  `footerKey`.
- `managers`: `id`, `nameKey`, `roleKey`, `quoteKey`, `descriptionKey`,
  `tagKey`; `sample` (`labelKey`, `key`), the choice screen's sample text;
  `perk`, and `lines`.
- `perk`: `nameKey`, `effectKey` (its rule, plain like a card's), and what
  it does — data the engine applies:
  - `extraOffer` (round 2c): N more cards on every draft offer, drawn
    after the rest from what the pool has left; `extraOfferKey` labels
    them on the offer;
  - `freeRerollsPerAct`: the first N draft rerolls each season cost
    nothing (`freeRerollKey`: the reroll button's label meanwhile);
  - `monthEnd`: effects applied at a month end after the `turnEnd`
    record — at every month end, or only at the ends of the months
    `monthEndTurns` lists (round 2c). `monthEndKeys`: the feed's line
    when they change something, a line group.
- `lines`: per trigger case, its variants (a line group); each variant is
  its bubbles' keys, one or two (round 2c). The cases: `opening`,
  `checkin.<major>`, `first_scandal.low|high`, `frenzy.low|high`, `stuck`,
  `signed`, `known`, `lane.<lane>`, `gate_passed`, `gate_failed`, `viral`,
  `rival`, `quiet.<fame band>`. Validate errors on a case no trigger reads,
  and warns on one without lines.
- `signoffs` (round 2c): `easy` and `hard`, the pools a one-bubble message
  takes its second, short bubble from, each a line group on the shuffle
  bag. `lastWord`: per major id, the two bubbles of the manager's last
  word on the ending screen.
- `messages`: `perMonth`, messages a month at most; `priority`, every
  trigger, highest first; `highFrom`, the fame tier from which the scandal
  triggers are `.high`; `knownAxis`, the ending axis whose split `known`
  fires on; `signedFlag`, `viralFlag`; `stuck` (`heatTierFrom`, the heat
  tier counted as over the line; `months`, how many month ends running);
  `hard`, the triggers or trigger line keys whose sign-off is from the hard
  pool; `quietAfter`, how many silent months before a month with no
  trigger brings a quiet-month line. The quiet line's case is the fame band
  (`rules.fameBands`) at the month's opening.

/core's `managerMessages` derives each month's messages from the run's
history; `monthEndLines` the perk's line at each month end.

## Stat tiers — `rules.tiers`

Decision 25: per stat, `nameKeys` lowest first plus boundaries — `from`
for hype and craft; for heat `toGoAtLeast` and `linesCrossed`, from the
distance to the line, never the threshold. /core's `statTiers` picks;
/ui never computes a boundary. A tier word is one word of at most 10
characters.

Round 2c adds the stat bar's tooltips and the countdown's levels:
- `tipKeys`: each tier's tooltip line, in order. Craft's `modeKey` names
  the set its lines speak in ("singing"); `laneTips` gives another set
  while a lane is established — `{ "screen": { modeKey, tipKeys } }`,
  acting. /core's `tierTip` picks the line.
- heat's `countdown`: the next-scandal countdown's level at each heat
  tier — `calm`, `amber`, `red` or `crossed`. /core's `countdownLevel`
  reads it.

## The stat bar and the calendar — `rules.statTips`, `rules.calendar`

- `statTips`: the tooltip lines of the stats without tiers — `capital`
  (money), `toGo` and `toNext` (the countdown before and after a line is
  crossed), `slots` (actions).
- `calendar`: `startMonth` (1–12) and `startYear`, the date of the first
  month of play. /core's `calendarDate` gives each month its calendar
  month and year, its place in its season, and the months left.

## Desk scripts — `content/scripts.json`

Round 2c, for the visual phase: the script on an actor's desk improves with
fame. `scripts`: `id`, `band` (a `rules.fameBands` id), `headingKey`, and
`lines`, each `{ key, kind }` — `you` (the player's line, highlighted like
an actor's copy), `other`, or `action`.

`rules.fameBands` (round 2c): `{ id, from }` — the fame tiers (0-based)
from which a band holds: low from Unknown, mid from Rising, high from
Known. The quiet-month trigger and the desk scripts read them.

## i18n keys

The key convention: `card.<id>.name` · `card.<id>.text` · `card.<id>.headline.<n>` · `card.<id>.inhand.<n>` (scandals) · `gate.<stem>.name` · `gate.<stem>.flavor.<n>` · `ending.<id>.name` · `ending.<id>.goal` (majors; a minor's optional) · `ending.<id>.text.<n>` (minors) · `act.<season>.name` · `act.<season>.opener.<n>` · `story.opening.<n>` — `<n>` numbers a group's variants from 1 · `award.<id>.name` · `award.<id>.citation` · `flag.<id>.positive` · `flag.<id>.negative` · `tier.<stat>.<n>` (lowest first) · `paper.<id>.masthead` · `press.subject.<noun>` · `ui.<area>.<label>`

## What validate checks

`npm run validate` checks, and runs in CI:

- unknown effect ops
- references to nonexistent card / gate / ending ids, and to lanes not in `rules.lanes`
- missing i18n keys
- cards unreachable in any act
- **endings not exhaustive**: every corner of the axes exactly one major, every major exactly one fallback minor, last; the fame split on a hype tier boundary
- a non-scandal card without a lane, a scandal with one
- the content budget
- numeric ranges
- opportunity cards in the starting deck; an act with an empty draft pool
- awards: fields, conditions, ending ids, a fallback award, at most 8
- every flag set or read has both labels, positive and negative (an error, never a template)
- `rules.tiers`: a word per tier, boundaries in order
- variants per line group — warnings: a group needs more the more often it is seen per run (4+ a run → 4, 2 to 4 → 3, under 2 → 2; once-per-run items → 2), from `sim/appearances.json` (`npm run sim:variants`)
- tier words: one word of at most 10 characters
- player-facing prose not yet written — warnings, not errors: a card without a headline, a scandal without its headline or in-hand line, a major without name or goal line, a minor without name or text, a gate without flavour, a season without an opener, the opening

Load failures are loud in dev, graceful in the shipped build.
