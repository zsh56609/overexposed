# Voice rules

The living rules for every piece of player-facing prose. Draft v1 §1 set
them; this file supersedes that section and is where they change. The
drafts (`draft-v1.md`, `draft-v2.md`) are historical records; the prose
itself lives in `/i18n/en.json`. British spelling throughout.

## The player

A young singer, addressed in second person — unnamed, ungendered, never
shown (docs/decisions.md, 2026-09-29).

## Three registers

The game's thesis is that being seen has a cost, and that the work nobody
sees goes unrecorded. The feed's typography carries that thesis: craft is
nearly invisible on the front page, while a single stunt can fill it.

| Register | Used for | How it is written | Layer 2 typography |
|---|---|---|---|
| **LOUD** | hype / heat actions | Tabloid headline. All caps, third person, present tense, a little cruel. | Large serif headline |
| **quiet** | craft actions | Diary voice. Second person, restrained. | Small italic, like a margin note |
| **Money** | capital actions | Business-page voice. Plain, occasionally dry. | Business-section styling |

## Rules

- **Short.** LOUD headlines ≤ 10 words; quiet and Money lines ≤ 15.
- **Concrete nouns over adjectives.** "A coat that isn't warm enough", not "struggling".
- **No stat words in prose.** Never "hype", "craft", "+6". Numbers belong to the interface.
- **Prose carries meaning; the interface carries rules.** Never explain a mechanic in prose.
- **Every variant reads correctly in every branch.** A card's headline
  variant is chosen by a hash of run seed, month and card instance — not
  by which branch of the card fired. So when a card has a condition
  ("Craft 15+: …, otherwise …"), each of its variants must be true of
  every branch: a variant that only fits the strong branch will print
  over the weak one too.
- **Rating: ESRB Teen.** Scandals are breakups, feuds, bad reviews, old photos, rumours — nothing sexual, no drugs, no violence.

## Length budget (keeps a run under 20 minutes)

| Item | Maximum |
|---|---|
| Opening | 60 words, read once |
| Season opener | 25 words |
| LOUD headline | 10 words |
| quiet / Money line | 15 words |
| Ending text | 80 words |
| Award citation | 20 words |
| Gate flavour | 20 words |
