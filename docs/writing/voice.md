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

**Register follows visibility, not resource** (docs/ui-plan.md §13,
decision 24). Ask who sees the act, not what it earns. Public acts are
LOUD, private work is quiet, transactions are Money. The resource a card
moves is a guide, never the rule: signing, apologising on camera and
reinventing an image are public, so LOUD, whatever they cost or earn;
networking is private, so quiet, even though it builds a career.

| Register | Used for | How it is written | Layer 2 typography |
|---|---|---|---|
| **LOUD** | public acts — anything done where the press, a crowd or a camera can see it | Tabloid headline. All caps, third person, present tense, a little cruel. | Large serif headline |
| **quiet** | private work — practice, recovery, the favours and rooms nobody reports on | Diary voice. Second person, restrained. | Small italic, like a margin note |
| **Money** | transactions — fees, deals, hires and purchases | Business-page voice. Plain, occasionally dry. | Business-section styling |

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
  over the weak one too. Reporting an opinion ("fans say …") is true in
  either branch.
- **Time-neutral headlines.** A card can be played in any month and at
  any fame, so its headlines assume neither: no "newcomer", no "debut".
  Fame-aware press labels are planned for content expansion, where
  "newcomer" can return as the low-fame form (draft v3).
- **Every flag reads two ways.** A flag has a positive label (once set)
  and a negative label (while it is not), both written as prose; the
  interface never builds one from a template (draft v3).
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
