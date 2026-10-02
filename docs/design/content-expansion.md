# Overexposed — Content Expansion Design

> **Status: approved by the author, 2026-09-30.** This is the reference for
> the content expansion phase, which runs until the internal feature freeze on
> 2026-10-15. The visual work runs alongside it, not after the freeze
> (2026-10-01): V1a (the desk, static) → V1b (the motion on the desk) →
> phase 3 (events) → V2 (the screens around the desk) → phase 4 (the year in
> review, the once-per-run variants, a full retune) → the freeze.
>
> Player-facing prose is not in this document. Names below define structure;
> the prose for each phase is drafted and imported with that phase.

---

## 0. Why, and the principles

The author's playtests found two things. The meaning layer worked: headlines,
the goals board and the awards made the run feel like a story. And the run is
thin — too little content, too short, and endings too coarse. The potential of
this genre is story, and story needs material.

Five principles govern everything below.

1. **Story at the moment of decision.** Already built (the headline-led
   preview). Every new system must also speak when the player is choosing,
   not only afterwards.
2. **Emergence over selection.** The player does not pick a career path; it
   grows out of what they play. The deck is the résumé.
3. **Depth before breadth.** For the jam, thicken the existing structure
   rather than widening it. Judges score Execution and Completion potential;
   a polished slice that visibly could grow beats a sprawling unfinished one.
4. **Reuse the systems.** Events, endings and awards use the existing effect
   ops, condition shape, read-only queries and event history wherever they can.
5. **No gaps by construction.** Every classification — ending, lane — must be
   exhaustive, so no player falls into a category that does not describe them.

---

## 1. Endings: two levels

### 1.1 Major endings: a 2×2 of fame and reputation

The four current endings are a patchwork of conditions with a fallback that
catches everything else. That is how the taxonomy gap appeared: a famous,
unsigned singer holding a few scandals missed every condition and fell to
Nobody Yet, whose text reads "No headlines, good or bad". A second gap exists
too: a player with many scandals and little fame also falls to Nobody Yet.

Major endings are instead a partition on two axes, which is exhaustive by
construction.

|  | **Clean** (scandals at year end ≤ split) | **Damaged** (scandals at year end > split) |
|---|---|---|
| **Known** (hype at year end ≥ split) | **The Breakthrough** | **Overexposed** |
| **Unknown** (hype at year end < split) | **The Long Game** | **The Hard Way** |

The two axes are the game's thesis: being seen has a cost. A major ending asks
only whether you were seen, and whether you paid for it.

| Major | Intent |
|---|---|
| The Breakthrough | You got famous, and it didn't cost you. |
| Overexposed | You got famous, and it cost you. The game's title, as a fate: the title is a warning, and this ending is the warning coming true. |
| The Long Game | You got good before you got famous. |
| The Hard Way | You took the shortcuts, and they didn't pay. |

Both splits are content values tuned by the sim (section 8).

**The fame split sits on the "Known" tier boundary.** The stat bar's tier word
then means exactly which side of the 2×2 the player is on: reading "Known" or
higher, they are heading for The Breakthrough or Overexposed. This extends the
existing rule that tier boundaries sit on goal thresholds, so a tier word never
runs ahead of a goal the player can see.

### 1.2 Minor endings

Each major refines into minors by lane (section 2), signing, craft, and the
shape of the year. Each major has a fallback minor, so the second level is
exhaustive too.

**Existing ids are kept.** The four current endings become minors and keep
their ids, so their text, award references and sim records survive.

| Major | Minor id | Name | Condition (intent) |
|---|---|---|---|
| The Breakthrough | leading_role | Leading Role | lane is screen |
|  | household_name | Household Name | lane is celebrity |
|  | star | Headliner | lane is music, signed |
|  | the_independent | The Independent | *fallback* — famous on your own, no label |
| Overexposed | redemption_arc | The Redemption Arc | peak scandals minus year-end scandals ≥ 2, as for Comeback of the Year, so this ending always carries that award |
|  | tabloid_royalty | Tabloid Royalty | lane is celebrity — scandal became the brand |
|  | meltdown | Cautionary Tale | *fallback* |
| The Long Game | character_actor | The Character Actor | high craft, lane is screen |
|  | the_one_to_watch | The One to Watch | lane is celebrity — seen everywhere, not yet known |
|  | craftsman | The Musician's Musician | high craft |
|  | nobody | Nobody Yet | *fallback* |
| The Hard Way | flash_in_the_pan | Flash in the Pan | peak hype high (75), year-end hype low. Tied to the fame split (80) it fell below 1.5%, so it keeps 75 |
|  | running_on_empty | Running on Empty | burnout held, or craft very low |
|  | starting_over | Starting Over | *fallback* |

Four majors, fourteen minors. The One to Watch (phase 2a) corrects a
narrative error the sim showed: celebrity-lane players landing in The Long
Game were called The Musician's Musician. Nobody Yet's text now describes its whole
population: unknown, clean, and without the craft to be respected — genuinely
"no headlines, good or bad".

The Redemption Arc uses the same "peak minus end" statistic as the Comeback of
the Year award. One statistic, two uses.

"There is no losing" still holds: every fallback keeps its dignity.

### 1.3 Resolution

```
major = partition(hypeAtYearEnd, scandalsAtYearEnd)      // exhaustive
minor = first minor of that major whose condition holds  // by priority
        otherwise that major's fallback                  // exhaustive
```

- endingIfYearEndedNow returns both major and minor. The reducer resolves the
  real ending through the same query, so the marker and the actual ending
  cannot disagree — the property built in round 6d165fe is preserved.
- Priority within a major runs top to bottom in the table above.

### 1.4 What this fixes

| Case | Before | After |
|---|---|---|
| Famous, unsigned, a few scandals | Nobody Yet — "no headlines" | The Breakthrough · The Independent |
| Famous, many scandals, cleaned up late | Cautionary Tale | Overexposed · The Redemption Arc |
| Unknown, many scandals | Nobody Yet — "no headlines" | The Hard Way |
| Famous through screen work | Headliner, which assumes a record deal | The Breakthrough · Leading Role |

### 1.5 On screen

- **Goals board** shows the four majors in narrative order: The
  Breakthrough, The Long Game, Overexposed, The Hard Way. Aspirations first.
  The two unknown-side majors list only their reputation requirement: "Hype
  79 or fewer" read as if staying unknown were the goal. The tier word and
  the goal line carry the fame side; the known-side majors keep "Hype 80+".
- **"If the year ended today"** shows major and minor. When it reads "The
  Breakthrough · Leading Role", it is telling the player they are becoming
  an actor. The marker is itself lane guidance (section 4).
- **Ending screen**: the major as the night's category, the minor as the
  ending with its text, then awards, then the year in review (section 6).
- **Collection**: "You have found 3 of 14 endings", grouped by major, found
  minors named and the rest shown as undiscovered. Stored in localStorage,
  wrapped in try/catch, renders correctly when empty. A completion record
  only — it changes nothing in play, so it is not meta-progression.

### 1.6 Awards

- Remap award conditions to the new ending ids.
- Consider one lane-specific award (e.g. a screen debut award), staying within
  the cap of 8.

---

## 2. Career lanes

Three lanes. The player never picks one.

| Lane | What it is |
|---|---|
| **music** | Respected as an artist: training, recording, the stage. Most current cards. |
| **screen** | Crossing over to film and television. |
| **celebrity** | Famous for being famous: stunts, endorsements, the feed. |

These are the three real directions a pop career can take, and the question
they pose — artist, actor, or star? — is the question the endings answer.

**Tagging.** Every card carries `lane: music | screen | celebrity | neutral`.
Utility cards (draws, heat relief, scandal removal) are neutral and never count.
Lane and register are independent axes: register is visibility, lane is
career direction (Reinvent Image is neutral and LOUD). Selling your image
(Brand Deal, Sellout Ad) is celebrity; selling your labour (Side Gig) is
neutral; promotion toward fame (Street Team, Press Junket) is celebrity;
television (Late Night Show) is screen.

**Determination.** The lane is decided by the cards the player *played*, not
held — the résumé is what you did. /core provides `currentLane(state)` and
`laneShares(state)` as read-only queries. Ties resolve to music, the base.
The starting deck does not count (`rules.laneStartingDeck`: false): it is the
premise — the player begins as a singer — not a choice, and the lane must
reflect choices.

**Lane depth** (round 2c). Once a lane is established, every draft offer
holds at least one card of that lane when the pool has one
(`rules.draft.laneCards`); the rest are drawn as before, so a pivot stays
possible. Three screen cards deepen the screen lane from summer on: Table
Read (quiet), Self-Tape (LOUD, Marquee) and Voice-Over (Money).

**The established lane** drives presentation and, since round 2c, the lane-weighted draft. A single play
should not change what the press calls the player, so a lane establishes
itself once it has at least two plays and leads the next lane by two
(`rules.laneEstablished`); before that the career is "early". Chosen with
the sim so a lane settles around mid-summer: half of player-like runs are
established by month 5–6. **With hysteresis** (round 2b): once established
it stays established while it still leads, by any margin; it changes only
when another lane takes the lead and meets the establishing threshold; a
lane that stops leading without another establishing itself falls back to
early. Hysteresis needs the path, so it is read from the run's history
(`establishedLanes`), and stays deterministic. It drives the press subject
and the lead paper, the managers' lines, the vanity's lane props and the draft; ending resolution keeps `currentLane`.

**Screen content.** Phase 1 added five screen cards to Film Cameo and Late Night Show; round 2c added Table Read, Self-Tape and Voice-Over. The lane now has ten cards.

---

## 3. Voices

The three voices below are implemented through rounds 2a–2c: the press, two managers and the rival’s press arc. Phase 3 adds their event choices.

| Voice | Register | Role |
|---|---|---|
| **Press** (exists) | Public, labels you, sometimes cruel | How the world sees you |
| **Manager** (new) | Private, candid, advisory | Where you actually stand |
| **Rival** (new, light) | A parallel career | The road you didn't take |

The press and the manager together state the thesis: what people see, and
what is true.

### 3.1 Press

Built in phase 2a as three papers (content/press.json):

| Paper | Kind | Voice |
|---|---|---|
| The Daily Flash | Mass-market tabloid | ALL CAPS. Loud, cruel, fond of a pun. |
| B-Side | Music weekly | Sentence case. Measured, critical, knowing. |
| Marquee | Showbiz trade paper | Title Case. Insider deal talk. |

- **Routing, by register first.** A LOUD line prints in the paper of its
  card's lane — music in B-Side, screen in Marquee, celebrity and neutral
  in The Daily Flash. Every scandal prints in The Daily Flash, whatever
  the lane. Money prints in The Daily Flash business section. A quiet line
  prints in no paper: private work is the player's own notebook, in diary
  voice. **The papers print the public acts; the notebook keeps the
  private work** — the mass press never sees the practice, which is the
  thesis.
- **The press subject.** Headlines that name the player carry a
  `{subject}` slot — `{subject}`, `{Subject}` or `{SUBJECT}`, rendered in
  the placeholder's case. The noun follows the fame tier and the
  established lane (§2): newcomer while Unknown or Noticed; singer while
  Rising, whatever the lane — until Known the press still calls a
  crossing-over singer a singer; then singer, actor or celebrity at Known,
  and pop star, film star or celebrity at Famous. Before a lane is
  established, the music column. This is where "newcomer" returns, now
  correct. It is computed at the moment the line prints — after the act
  resolves; at a month's end, at the turn's end — and the preview uses the
  same computation.
- Headlines are authored in their paper's case and voice and stored as
  authored; the interface never recases them.
- Subject and variant choice follow the existing rule: deterministic,
  never the game RNG.

### 3.2 Manager

Built as a **voice profile**: a fixed set of trigger points, each with a line.
Every profile uses the same triggers, so adding a second manager is writing,
not engineering.

Trigger points:
- the opening (replaces a tutorial: the situation, the tension, what to do)
- each season transition, three in all — the mid-run check-in
- big moments: first scandal, signing, a lane shift, a failed gate
- lines inside some events

Two archetypes the author wants:

| Profile | Voice | Effect on play |
|---|---|---|
| **The Veteran** | Shrewd, industry, unsentimental — "Nobody pays to see talent. They pay to see a story." | Pressure *toward* the shortcuts. Resisting reads as integrity. |
| **The Guardian** | Protective, family-like — "You don't owe them anything." | Pull *away* from the shortcuts. Taking one reads as guilt. |

They pull in opposite directions on the game's central tension, which is why
the pair has replay value.

- **Jam:** both profiles, chosen by the player at the opening. The author's
  call: the content is thin, and the pair adds character. Because the system
  is profile-based, the second profile costs lines, not engineering.
- **Full version:** an event-driven change of manager mid-year.

**Built in round 2b** (content/managers.json, core/manager.ts; draft v6):
Dex Holloway, the Veteran, and Marguerite Ashby — "call me Mags" — the
Guardian.
- **The choice**, before month 1, on a screen showing each manager's
  perk. The choice is state; no GameEvent records it.
- **One small perk each**, pulling toward the manager's philosophy — data
  the engine applies, never a special case. Neither may be strictly
  better than the other.
  - Dex, "Knows everyone" (round 2c, D2): every draft offers one more
    card, labelled "Dex knows someone", and the first reroll each season
    is free.
  - Mags, "Calms things down" (round 2c, M1): −1 heat at the end of each
    of the first three seasons (months 3, 6 and 9), after the month's
    check (the heat formula is untouched; docs/decisions.md).
  - Round 2b's perks — Dex's free reroll alone, Mags's −1 heat every
    month — left Mags strictly better.
- **Messages** are derived from the run's history each month, like the
  front pages. The triggers: the opening; a check-in at the first month
  of summer, autumn and winter, keyed by the major the year would end in
  now; the first scandal and a frenzy, each low or high by fame; two
  month ends running over the line (stuck); the signing; becoming known;
  going viral; the lane established or changed; a gate passed or failed;
  the rival leading a paper. At most two a month, by priority. A month's
  messages arrive as it opens, reacting to the month before; the year's
  last month end is left to the ending.
- Each manager's lines for each trigger case are a line group on the
  shuffle bag; a message may hold two bubbles.
- **Round 2c**: every message is two bubbles, a longer one and a short
  one. A one-bubble line takes a sign-off from the manager's pool for its
  mood — hard after bad news (the first scandal, a frenzy, stuck, a failed
  gate, a check-in on the Overexposed or Hard Way course), easy otherwise.
  A month nothing fired in, after a silent month, brings a quiet-month
  line for the player's fame band (low, mid, high). The winter gate gets
  no reaction; the manager has the last word on the ending screen instead,
  keyed by the major.

### 3.3 Rival

Light for the jam, and introduced through the press in phase 2a rather
than with the events of phase 3: **Juno Vale**, another singer who started
the same year. At the run's start the seed chooses one of four arcs —
breakthrough, crash, crossover, fade — and each season one month (seeded)
carries that season's beat as a world story in the paper named. The
ending screen shows the arc's closing line under the awards. Each arc ends
in a major (breakthrough and crossover in The Breakthrough, crash in
Overexposed, fade in The Long Game). The arc is fixed at the start, so it
cannot be chosen to contrast the player's outcome; with four arcs it often
does so by chance. The full life arc is full-version scope.

**The world has its own timeline** (round 2b). Beside the rival, each
paper follows two **sagas** — stories that develop across the year, a beat
a season: in The Daily Flash a reality star's whirlwind marriage and a TV
chef's hedge war; in B-Side The Static Saints' reunion and a basement
venue's fight to stay open; in Marquee a sequel nobody asked for and a
struggling streamer. Like the rival's, each season one month chosen by the
seed carries each saga's beat as a world story in its paper. For a slot,
the rival's beat outranks a saga's, and a saga's beat outranks the one-off
world stories. The sagas run whatever the player does: the world does not
wait for them.

### 3.4 The front page

The papers are not about the player alone. How much of a front page is
about them is how famous they are — the front page is itself a fame
meter, and at the top of the scale the player is literally overexposed:
in every paper at once.

- **Game feedback and press coverage are separate.** Every action still
  shows its effect in the feed; whether it makes a paper, and how
  prominently, depends on fame and lane.
- **Each month every paper composes a front page**: a lead, two secondary
  stories, a brief. The player's lines are placed by prominence, then the
  rest is filled from the paper's world pool.
- **Prominence of a LOUD line** in the established lane's paper: a brief
  while Unknown or Noticed, a secondary while Rising, it may lead once
  Known, and it leads — and may fill the page — once Famous. In another
  paper: at most a brief, whatever the fame; Famous, a secondary, as a
  crossover story. Early, a line's own paper stands for the lane's. A
  Money line is a business brief.
- **Fame amplifies scandal** (round 2b; a design principle). A scandal's
  prominence in The Daily Flash follows fame like every other story: a
  brief while Unknown or Noticed, a secondary while Rising, the lead once
  Known, and once Famous the lead of a page it overwhelms. An unknown's
  scandal still costs them in full — the card still enters the deck — but
  the world barely notices.
- **World stories**: at least two on every page while Unknown or Noticed,
  at least one after — unless the page is overwhelmed: The Daily Flash in
  a scandal's month once the player is Famous, the lane's paper once the
  player is Famous.
- **Frenzy spills over** only once the player is Known: in a month two or
  more scandals print, each other paper carries a spillover line as a
  brief.
- **World pools** are drawn with a shuffle bag, no repeats until the pool
  is used; a seasonal story appears at most once a run, in its season.
  Round 2b doubled them or more (The Daily Flash 20, B-Side 28, Marquee 24)
  and moved the stories that became saga beats out of them.
- **Fame filler** (round 2b): once the player is Known, the press writes
  about them even in a month they did nothing newsworthy. Known: if the
  player has fewer than two stories in their established lane's paper, it
  adds one filler line. Famous: filler fills the lane's paper — the
  world's due beats keep their slots — and The Daily Flash, whatever the
  lane, adds one. Filler ranks below the player's real stories: it claims
  a slot after them, and it may lead only a page with nothing real of
  theirs. It carries the press subject, and it does not decide the lead
  paper. With it, the player's share of the lead paper climbs clearly from
  Rising through Known to Famous.
- **The lead paper** — the one on the desk in the visual phase — holds the
  player's most prominent story: a lead, then a secondary, then a brief.
  Money lines do not count: a side gig is a business footnote, not the
  player's story. A scandal counts only as a lead story, so it takes the
  desk only when it is the month's biggest story — once the player is
  Known; an unknown's scandal month keeps the lane's paper in front, the
  tabloid behind carrying the scandal as a brief. Ties go to the
  established lane's paper, and so does a month with nothing of the
  player's (early: B-Side). The lead paper is usually the player's own
  lane's; The Daily Flash leads for celebrity careers and when a scandal
  becomes the biggest story. All three papers are readable every month;
  each month opens on its lead paper.

---

## 4. Weak guidance

The player should feel their direction forming without being told what to do.

| Channel | Form |
|---|---|
| Manager check-ins | At each season transition: where you stand, what people are starting to call you. The mid-run indirect judgment. |
| Press subject | The headlines start calling you ACTOR before you have decided you are one. |
| "If the year ended today" | Shows major and minor, so the lane is visible as a destination. |
| Rival | "Your rival just signed a film deal. Everyone's asking if you're next." |

When the lane shifts, the manager says it privately and the press says it
publicly, in the same month. The gap between the two versions is the point.

---

## 5. Events

The world currently never acts on the player. Every moment is a card they
chose to play. Events are things that happen *to* them.

### 5.1 What an event is

- A situation, told by one voice (manager, press, rival, or someone from
  the player's life).
- Two or three choices, each a genuine trade-off. An event with an obvious
  answer is flavour, not a decision.
- Choices use the existing effect ops: resources, heat, addCard, setFlag.
  An event can add heat, and so feed the scandal loop directly.
- A short outcome line.
- Eligibility by condition shape, like everything else: season, resources,
  flags, lane.

### 5.2 Categories

| Category | Example situations |
|---|---|
| Industry | a casting call, a festival offer, a label scout at a gig |
| Press | a journalist asking about your ex, a rumour surfacing, a photo |
| Personal | a call from home, a friend asking for money, exhaustion |
| Rival | a song that sounds like yours, an invitation to collaborate |
| Callback | a consequence of something from earlier in the year |

Events are weighted by lane: a player drifting into screen meets more casting
calls. This reinforces the lane and guides at the same time.

### 5.3 Callbacks

The satisfaction this genre is built on is the early choice that returns. Tell
a journalist about the breakup in spring, and in autumn the ex gives their
side. Ignore the calls from home, and by winter they have stopped coming.

Callbacks are events whose condition includes a flag set earlier. No new
mechanism is needed.

### 5.4 Frequency and run length

- Roughly one event every two months, drawn from the eligible pool, plus the
  three manager check-ins. About nine story beats a run.
- Different runs draw different events, which is replay value.
- At ~25 seconds each, a run grows from ~10 to ~14 minutes: inside the
  10–15-minute target. Prose adds meaning, not reading time.
- Placement: at the start of a month, before the draft and draw.

---

## 6. Year in review

The ending screen tells the year back to the player as a sequence of front
pages: three to five moments drawn from the event history, each shown as the
headline it printed, labelled by season.

Candidate moments: the first scandal, the biggest single month, signing,
each callback that fired, the final gate.

This reuses the headlines and the event history. It turns an ending label into
**the player's own year**.

---

## 7. Architecture changes

The core mechanical freeze stays. Two things unfreeze, deliberately.

| Area | Change | Kind |
|---|---|---|
| Endings | Flat four → four majors × fourteen minors, two-level resolution | **Unfreeze** |
| GameEvent list | New types for story events and voice lines | **Additive** — existing types unchanged, existing UI unaffected |
| Card schema | `lane` field | Content |
| /core | currentLane, laneShares, major/minor resolution, press subject, year-in-review moments | Read-only queries |
| Awards | Remapped to new ending ids | Content |
| Content budget | Raised; events have their own budget | Content |
| Resources, act structure, heat formula, starting deck, gates | **Unchanged** | — |

Rules that carry over unchanged: no rule logic in /ui; every choice a player
can make is previewed; prose is imported, never invented by an agent; every
display derives from /core.

---

## 8. Simulation bands

New or changed:

| Band | Target |
|---|---|
| Major concentration | Per player-like persona, no major above 70% |
| Minor reachability | Every minor reached in at least 1.0% of player-like runs: "reachable" — not effectively impossible — not "common". The Hard Way's minors and The Independent are meant to be rare; in a collection, rare endings are the achievements, and the axes are not bent to inflate them |
| Minor persona reach | Every minor reaches 3% of at least one player-like persona, under each manager |
| Lane reachability | Each lane reachable by a persona that pursues it — add lane-seeking personas |
| Event balance | No event choice dominant; every choice taken in a meaningful share of runs |
| Run length | Estimated story beats per run within the 10–15-minute target |

Kept: probe assertions, scandal median, gate met%, card play rate, skill
divergence, zero soft-locks, zero crashes. The artisan persona leans hard
toward The Long Game (~99%). Accepted (round a83fa88): a cautious, craft-led
player is playing the long game; artisan is exempt from major concentration
only, and variety belongs at the minor level.

---

## 9. Scope

Visual rounds run alongside this scope: V1a → V1b → phase 3 → V2 → phase 4 → the 10/15 freeze. Submit an early build in the week of 10/5.

| Jam — before the 10/15 freeze | Full version |
|---|---|
| Two-level endings (4 × 14) | More minors per major |
| Three emergent lanes, five new screen cards | More lane content throughout |
| Both manager profiles, chosen at the opening | Event-driven change of manager mid-year |
| Rival, light | The rival's full year |
| ~15 events, a few callbacks | A dense callback web |
| Year in review | Multi-year campaign, awards every year |
| Endings collection | — |

---

## 10. Build phases to the freeze

Phases 1 and 2 are complete. Execution order: V1a (static desk, done) → V1b (desk motion) → phase 3 (events) → V2 (surrounding screens) → phase 4 (year in review, once-per-run variants and retune) → freeze.

| Phase | Contents | Prose drafted with it |
|---|---|---|
| **1. Endings & lanes** | 2×2 majors, minors, resolution, lane tags on every card, lane queries, **five new screen cards**, goals board and marker, ending screen, endings collection, award remap, tier boundaries realigned to the new thresholds, new bands | Major goal lines; the nine new minor texts; screen-card names and headlines; collection labels |
| **2. Voices & guidance** | Manager profile system with **both profiles** and the opening choice, season check-ins, big-moment lines, press subject slot | Both managers' lines; press subjects |
| **3. Events** | Event engine (additive GameEvents), ~15 events, callbacks, lane weighting, rival appearances in events (her press arc landed in phase 2a) | Events; rival |
| **4. Review & freeze** | Year in review, full retuning across all new content | Year-in-review framing |

Endings and lanes come first because everything else refers to them. The
screen cards sit in phase 1 because two minor endings require the screen lane.

---

## 11. Writing workload

Roughly 4,500 new words across the four phases — events and manager lines are
most of it. Drafted by AI, reviewed and edited by the author in play, recorded
as drafts in docs/writing before import, as with v1–v3. The author's review
time, not implementation, is the real constraint of this phase.

---

## 12. Decisions taken by the author (2026-09-30)

1. **"Overexposed" is kept** as the name of the known-and-damaged major. The
   title becomes a fate.
2. **Both manager profiles ship in the jam**, chosen at the opening. The
   event-driven change of manager mid-year stays full-version scope.
3. **The endings collection ships in the jam.**
