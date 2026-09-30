# Content schema: endings, awards, the press, stat tiers

Reference for `/content` beyond the card, effect and gate schemas in
AGENTS.md §2. Moved out of AGENTS.md on 2026-09-30 (phase 2a) so that it
carries only rules, the frozen summary and pointers. `npm run validate`
enforces every shape here.

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

/core's `pressLines` gives each printed line its variant, paper and
subject, fixed at the moment it prints.

## Stat tiers — `rules.tiers`

Decision 25: per stat, `nameKeys` lowest first plus boundaries — `from`
for hype and craft; for heat `toGoAtLeast` and `linesCrossed`, from the
distance to the line, never the threshold. /core's `statTiers` picks;
/ui never computes a boundary. A tier word is one word of at most 10
characters.
