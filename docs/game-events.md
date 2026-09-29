# GameEvents (frozen)

The per-event spec, moved out of [AGENTS.md](../AGENTS.md) §2 to keep that file under ~28 KiB. It is frozen with the rest of AGENTS.md §2 ("FROZEN for UI"): the UI is built on these events and fields. Defined in `core/state.ts`.

Every action returns the new state with `events`: what happened, in order, ids and numbers only. The UI animates from these and never diffs states.

| Event | Fields | Emitted when |
|---|---|---|
| `turnStart` | `act`, `turn` | A turn opens, after its draft if it has one: slots refresh (no `slots` event), then the draw |
| `shuffle` | `count` | The deck ran out: the discard pile (`count` cards) is shuffled into it |
| `draw` | `uid`, `cardId` | A card moves from the deck to the hand — the turn's draw or a `draw` effect. Its `onDraw` events follow |
| `play` | `uid`, `cardId`, `cost` | A card is played and `cost` slots are spent (no `slots` event). Its effect events follow; then `exhaust` if it was an opportunity, otherwise it silently goes to the discard pile |
| `resource` | `target`, `delta`, `value` | A resource changed: `delta` is the real change after flooring at 0, `value` the new total. Never emitted for a change of 0 |
| `slots` | `delta`, `value` | A `slots` effect changed this turn's slots |
| `flag` | `flag`, `source` | A flag is set for the first time. `source`: the card whose effect set it; null = a gate or the engine |
| `addCard` | `uid`, `cardId`, `to` | A new card instance enters `deck`, `discard` or `hand`: a draft pick, an effect, a gate reward, or a crystallised scandal |
| `exhaust` | `uid`, `cardId` | A card leaves the run for good: `exhaustTag` removal, or a played opportunity |
| `scandal` | `uid`, `cardId`, `cause`, `byTag` | A scandal crystallised at end of turn; follows the `addCard` of the same `uid`. `cause`: the card blamed for pushing heat over the line (null = nothing to blame); `byTag`: it matched the cause's kind tag (false = seeded fallback) |
| `turnEnd` | `act`, `turn`, `resources`, `scandalCount`, `threshold`, `crystallised` | End-of-turn resolution finished and the hand is discarded (no event of its own). `resources` after the vent; `threshold`: the effective threshold the check used — for tools, never shown; `crystallised`: scandals made |
| `draftOffer` | `act`, `cardIds` | A draft opens with these cards, or a reroll replaced them |
| `draftPick` | `uid`, `cardId` | A card is taken from the offer; follows its `addCard` (to the deck) |
| `draftExtraPick` | `cost` | An extra pick was bought; follows the capital `resource` event |
| `draftReroll` | `cost` | The offer was rerolled; follows the capital `resource` event, followed by a new `draftOffer` |
| `gateOffer` | `gateIds` | The season is over: its gates are offered |
| `gate` | `gateId`, `passed` | A gate was chosen and resolved; its onPass / onFail events follow |
| `ending` | `endingId` | The run is over |
| `warning` | `code`, `ref` | Shipped (lenient) build only: bad content or an illegal action was skipped instead of thrown |

Typical sequences: **END_TURN** → onEndOfTurn effect events → per scandal `addCard` + `scandal` → heat `resource` (the vent) → `turnEnd` → the next turn (`draftOffer`, or `turnStart` + `draw`s) or `gateOffer`. **CHOOSE_GATE** → `gate` → its effect events → the next season's first turn, or `ending`. **DRAFT_PICK** → `addCard` + `draftPick` → `turnStart` + `draw`s once no picks are left.
