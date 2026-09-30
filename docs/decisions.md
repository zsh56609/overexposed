# Decisions

Design decisions, dated, newest first. A design decision made in
conversation is written here in the same session (AGENTS.md → Session
rules).

---

## 2026-09-30 — Round 2b, Part D: the world

- **Sagas.** Each paper follows two stories across the year, a beat a
  season (draft v6). Like the rival's beat, each saga's beat prints in one
  month of its season that the seed chooses (`sagaBeatTurn`). For a slot,
  the rival's beat outranks a saga's, and a saga's outranks the one-off
  stories. `MonthPress.sagas` records each beat due and whether it made
  the page.
- **Six v5 stories became saga beats.** The draft says the six spring
  beats were v5 one-offs. Five were: the hedge war, the Static Saints,
  the venue, the sequel, the streamer. The sixth, "REALITY STAR'S WEDDING:
  SEE THE GUEST LIST", is the wedding saga's summer beat; its spring beat
  ("ENGAGED — AFTER THREE WEEKS") is new. All six left the one-off pools.
  The pools are renumbered: The Daily Flash 20 (six seasonal), B-Side 28
  and Marquee 24 (four seasonal each).
- **Fame filler, read explicitly.**
  - "Ranks below the player's real stories" is read as the order in
    which stories claim slots: filler claims only after every real story
    (and the spillover) has claimed its own.
  - Its cap is the lead only on a page with nothing real of the player's,
    and a secondary otherwise. A filler line can sit above a real brief
    (a Money line), never take a real story's slot, and never lead over
    one.
  - The lane's paper is `lanePaper` (early: B-Side).
  - Famous: filler fills the lane's paper, but leaves the slots for the
    rival's and sagas' beats due that month. The one filler line in The
    Daily Flash is added whatever the lane; for a celebrity career the
    Flash is the lane's paper, and filler fills it.
  - Filler does not count toward the lead paper, which still follows the
    player's real stories. It does count in the fame meter's share: it is
    about the player.
  - The thresholds are content (`page.filler`).

## 2026-09-30 — Round 2b, Part C: the managers

- **The choice is state.** Before month 1 the run waits in a new phase,
  `manager`; the new action `CHOOSE_MANAGER` sets `GameState.manager` and
  opens the first month. Both are additive, and **no GameEvent is added or
  changed**: the choice emits none, a free reroll is a `draftReroll` whose
  cost is 0, and Mags's relief is a `resource` event. The deck is shuffled
  when the run is created, before the choice, so a seed deals the same
  year whichever manager is chosen; only the perks make the years diverge.
- **Dex Holloway, "Knows everyone": the first draft reroll each season
  costs nothing** (`perk.freeRerollsPerAct: 1`). "Already used this
  season" is derived from the run's reroll history — which the reducer
  keeps in state (`GameState.rerolls`: the season and cost of every
  reroll, like `gateHistory`), because a reducer sees only state.
  /core's `freeRerollAvailable` and `rerollCost` answer it; the reroll
  button shows the author's free label while it holds.
- **Marguerite Ashby, "Calms things down": −1 heat at the end of every
  month, never below zero** (`perk.monthEnd`: one `resource` effect),
  applied by the reducer like a card's effects once the month's check has
  resolved and its `turnEnd` is recorded — step 4 of the month end, before
  the season's gate or the next month. **Why this respects the frozen heat
  formula:** the formula decides how many scandals crystallise from the
  heat the month leaves at its check. `heatThreshold`, `thresholdFloor`,
  `degradePerScandal` and `vent` are untouched, and the check reads
  exactly the heat the month left, relief or no relief. The relief is an
  ordinary change to the next month's heat, like a card that cools heat;
  the formula has always let heat fall between checks. Because it lands
  after the check, the END TURN preview's scandals stay exact. The preview
  counts the relief in the heat it says carries over, and names it
  separately ("Calms things down: Heat −1"). The feed prints one of the
  author's relief lines, with its delta beneath, whenever the relief
  changes something (not while heat is 0). `check:preview` holds both
  against the real reducer.
- **When messages arrive.** A month's messages arrive as it opens, under
  its header and before its draft. The manager reacts to what the month
  before brought (its scandals, its paper, the season's gate), checks in
  at the first month of a season, and says the opening line at the first
  month. What the year's last month brings, and the winter gate, are
  never messaged: the ending speaks instead, and the gate lines ("the next
  door's heavier", "there'll be others") assume a next door. At most two
  a month, the highest priority first (`messages.priority`).
- **The triggers, read explicitly** (core/manager.ts):
  - `first_scandal` is the first scandal line printed, `.low` or `.high`
    by the fame tier it printed at (`.high` from Known).
  - `frenzy` is a month whose front page is a frenzy (two or more scandals
    printed), split by the fame tier at the month's end.
  - `stuck` fires when heat has ended two months running at Breaking or
    Frenzy — once per streak, not every month it lasts. It reads heat as
    the month's check left it (the `turnEnd` record, before any relief).
  - `lane.<lane>` fires for the first lane established, and for each
    change to a different lane. A fall back to early, then a return to the
    same lane, is no change.
  - `known` fires when hype first reaches the fame split (80), once a run.
  - `signed` and `viral` fire when their flag is first set.
  - `rival` fires when the rival's beat prints in a paper's lead slot.
  - A trigger fires at most once a month; a lane that changes twice in one
    month speaks for the latest.
- **Messages are /core read-only queries** (`managerMessages`,
  `monthEndLines`), pure functions of history like the front pages. Each
  (manager, trigger case) pair, and the relief lines, is a line group on
  the shuffle bag. `check:preview` asserts purity and prefix stability, the
  cap, the order, and that the feed prints every one.
- **The sim.** The manager is the batch's to set, never the persona's:
  every band runs once per manager (`sim`, `sim:awards` and `sim:tiers`
  report each in turn unless `--manager=` names one). The greedy personas
  take a free reroll when the offer is weak for their strategy — when its
  best card is worth less, by their own draft value, than the average card
  in the season's pool. The paid-reroll rule is unchanged.
  `npm run sim:managers` sets the two managers side by side.
- **Measured as specified** (seed 20260929, player-like personas pooled):
  Mags takes 9.8 heat off a run, and Dex gives 2.1 free rerolls. The
  Breakthrough reaches 50.4% of runs under Mags against 38.1% under Dex;
  scandals held at year end fall to 2.4 from 3.3. **Mags is strictly
  better**: every player-like persona does at least as well under her on
  every count. Bands fail under each manager. Per the author's
  instruction, the smallest fix is proposed, not applied (docs/status.md,
  round 2b report).

## 2026-09-30 — Round 2b, Part B: draft v6

Draft v6 is saved verbatim (docs/writing/draft-v6.md) and committed on its
own before any import. Its pieces land with the parts that build their
structure: the subject-slot rewrites and the variants for the most
repeated groups here; the managers, their perks and the choice screen in
Part C; the sagas, the new world stories and the fame filler in Part D.

The five Flash headlines that hard-coded SINGER now carry the subject
slot (Street Team's and Old Rumor's reworded as well as re-slotted), and
nine groups gain variants. Read against voice.md — every variant correct
in every branch and at every fame tier — two are borderline, for the
author:
- **Copycat Story, "STILL THE ONLY STORY IN TOWN"**: while the player is
  Unknown or Noticed a scandal prints as a brief (fame amplifies scandal),
  so "the only story in town" overstates it there. "NOW EVERY OUTLET HAS
  THE STORY" had the same tension.
- **Cover Single, "A cover that knows exactly what it's borrowing, and
  why."**: praise of the cover's intelligence, printed also in the weak
  branch (craft under 15); the other variant hedges ("the jury's still
  out").

## 2026-09-30 — Round 2b, Part A: corrections

- **Fame amplifies scandal** — a design principle. A scandal's
  prominence follows fame like every other story: a brief in The Daily
  Flash while Unknown or Noticed, a secondary while Rising, the lead once
  Known, and once Famous the lead of a page it overwhelms. A frenzy (two
  or more scandals in a month) spills into the other papers only once the
  player is Known. An unknown's scandal still costs them in full — the
  card still enters the deck — but the world barely notices. This
  replaces "a crystallised scandal always leads The Daily Flash" and "the
  Flash is overwhelmed in any scandal month" (round 2a, Part E, 4).
- **The lead paper**: Money lines do not count; a month with nothing of
  the player's goes to the established lane's paper (early: B-Side); at
  equal prominence the lane's paper wins. **One reading made explicit**: a
  scandal counts for the desk only as a lead story. Read literally, an
  unknown's scandal brief could still take the desk in a month the lane's
  paper had nothing — it did in 44% of Unknown scandal months — against
  "in practice once Known" and the visual note that the lane paper stays
  in front in an unknown-scandal month. With the reading, the Flash is on
  the desk in 2.4% of Unknown scandal months (for its other stories).
  Result (player-like, seed 20260929, before managers and fame filler):
  the lead paper is the lane's own — music → B-Side 70%, screen → Marquee
  60%, celebrity → The Daily Flash 84%, early → B-Side 67% — and a scandal
  leads the Flash in 0% of Unknown, Noticed and Rising months, 100% of
  Known and Famous ones.
- **The established lane has hysteresis**, read from the run's history
  (`establishedLanes`): once established it stays while it still leads,
  by any margin; it changes only when another lane takes the lead and
  meets the threshold. After a lane first settles, 15.2% of later month
  ends read early again (25.7% without hysteresis); it changes lane in
  8.3% of runs.
- **Goals board**: the unknown-side majors show their fame line only when
  it fails, as a state — "✗ Already known (hype 104)" (the author's
  wording). `check:preview` asserts that what the board shows as all met
  is met, for every major at every state.
- **Ending page**: "Play again" moves below the awards and the rival's
  closing line; it stays the largest element (79px tall; a five-award
  ending still fits, 668 of 680px).

## 2026-09-30 — Round b59f9d6 answered; round 2b begins

Round 2b is the two managers, the corrections the numbers and the
author's screenshots revealed, and the world's content. Round 2c follows
(card faces, lane depth, tooltips, the calendar). The author's answers:

1. **The Redemption Arc at 1.46%: accepted.** It needs a genuine
   comeback, so it is a rare achievement ending. The minor reachability
   floor is **1.4%**: the gap to 1.5% is within seed noise (the third seed
   gives 1.84%), and "reachable" means "not effectively impossible".
2. **Round 2a's Part E decisions** 1, 2, 3, 5, 6 and 7 are confirmed: a
   Money line is a business brief; at equal prominence a scandal, then a
   LOUD act, then Money, the spillover claiming its brief first; the
   rival's beat is the first world story; a lead-paper tie while early
   goes to B-Side; world stories are marked by type alone; the rival's
   majors. Decision 4 — the Flash overwhelmed in any scandal month — is
   **replaced**: a scandal's prominence follows fame (Part A).
3. The Daily Flash leading ~80% of months meant the lead paper no longer
   signalled anything: fixed in Part A.
4. The fame meter's flat middle (one or two public stories a month):
   fixed by fame filler (Part D).
5. The five Flash headlines with SINGER hard-coded: rewritten with the
   subject slot (Part B).
6. No marker word for world news: grey text is enough until visual craft
   lays out the page.
7. The established lane falling back to "early": hysteresis (Part A).
8. The goals board showed The Hard Way's "✓ Scandals 6+" while the player
   was Known — it read as achieved (Part A).
9. "Play again" sat above the ending the player had not read yet (Part A).
10. **The two managers are not narrative only**: each gets one small perk,
    so the opening choice is a real one (Part C).

## 2026-09-30 — Phase 2a, Part E: the front page, the world, the rival

Built as the author specified (design §3.3, §3.4): /core's `frontPages`
composes, from the run's history alone, every month's front page for each
paper — a lead, two secondaries, a brief — the player's lines placed by
prominence, then world stories from each paper's pool by shuffle bag, the
frenzy spilling over, the rival fixed by the seed. The page rules are
content (`content/press.json` → `page`). The feed prints each month's
front page at the month's end: the lead paper's, with a switch to the
other two; `check:preview` asserts a month recomposed from the same
history — or from the history up to its own month end — is the same page.

**Where the brief was silent, these choices (for the author to confirm):**
- A **Money** line is a business brief in The Daily Flash, whatever the
  fame: the business section is not front-page news.
- At equal prominence a **scandal comes first, then a LOUD act, then a
  Money line**, then print order: a public act is news, a fee is
  business. The **spillover claims its brief first**, since every other
  paper carries it. A line may always sit lower than its cap.
- The **rival's beat is the first world story** in her month and paper, so
  it takes the most prominent free slot. It made the page 98% of the time;
  only a page the player filled pushed her off.
- **Overwhelmed**: The Daily Flash in a month any scandal printed —
  crystallised or copied; before a lane is established, the paper of each
  LOUD line the player printed that month stands for the lane's paper.
- A lead-paper **tie while early** goes to the early lane's paper,
  B-Side, as for the press subject.
- **World stories are marked by type alone** (muted, the player's in ink):
  no label word was drafted.
- **The rival's majors**: breakthrough and crossover end in The
  Breakthrough, crash in Overexposed, fade in The Long Game. Crossover's
  is a reading of her closing line: she ends on a studio feature, known.

**The numbers** (`npm run sim:press`, 1000 runs per persona; seeds 20260929,
1 and 424242):
- **Months led by each paper**: The Daily Flash 79–81% for minmaxer,
  random, dealseeker and artisan, 86–87% for comeback; B-Side 10–19%;
  Marquee 1–5% (screenseeker 9%). The starting deck prints mostly in the
  Flash — two Side Gigs, Press Junket, Viral Stunt, Crisis PR against
  B-Side's Open Mic and Cover Single — most of a music career is quiet
  work no paper prints, and a scandal month always goes to the Flash.
- **The fame meter**, the player's share of the lead paper's front page
  by fame tier at the month's end: Unknown 23%, Noticed 30%, Rising 39%,
  Known 39%, Famous 44–45%. It climbs, but flattens from Rising to Known:
  a month prints only one or two of the player's public lines in any one
  paper, so the share is capped by supply, not by slots. Where fame shows
  is prominence — the player's story is the lead paper's lead in 7%,
  34%, 40%, 70% and 77–81% of months — and the lead page is overwhelmed
  in 7%, 34%, 40%, 34% and 80–83%.
- **The rival**: each arc drawn in 22–28% of runs; her major differs from
  the player's in 67–69% of runs (crash 79–81%, the others 61–66%).
- **World pools repeat in every run**: a run prints on average 31 world
  stories in The Daily Flash, 42 in B-Side and 45 in Marquee (at most 46–
  48), against pools of 10; one story can print 7–8 times in a run.
  Pages the player is not on are all world news, so the estimate of ~25
  per paper is short: about 32, 42 and 45 per paper cover an average run.

## 2026-09-30 — Phase 2a, Part D: three newspapers, and the press subject

- **Papers are content** (`content/press.json`): The Daily Flash
  (mass-market tabloid; ALL CAPS, loud, cruel, fond of a pun), B-Side
  (music weekly; sentence case, measured, notices the results of craft),
  Marquee (showbiz trade paper; Title Case, insider deal talk). The voices
  are in docs/writing/voice.md.
- **Routing, by register first.** LOUD → the paper of the card's lane
  (music → B-Side, screen → Marquee, celebrity and neutral → The Daily
  Flash); every scandal → The Daily Flash, whatever the lane; Money → The
  Daily Flash business section; quiet → no paper. The papers print the
  public acts; the notebook keeps the private work (design §3.1).
- **Headlines are stored as authored**, in their paper's case; the
  interface never recases one. Draft v5 converted the music headlines to
  B-Side's sentence case and the screen headlines to Marquee's Title Case.
  Every LOUD line now matches its paper's case. Still naming the player
  outright in The Daily Flash, where the subject slot would fit (for the
  author): Apology Tour `THE APOLOGY: SINGER FACES THE CAMERAS`, Tabloid
  Bait `SINGER FEEDS THE PAPERS A STORY — AND THEY BITE`, Street Team
  `POSTERS APPEAR OVERNIGHT: WHO IS THIS SINGER?`, and two scandals,
  Burnout `SHOWS CANCELLED: "EXHAUSTION," SAYS SINGER'S CAMP` and Old
  Rumor `CASH GRAB? FANS TURN ON SINGER OVER BRAND DEALS`.
- **The press subject** replaces `{subject}` / `{Subject}` / `{SUBJECT}`
  with the noun for the player's fame tier and established lane, in the
  placeholder's case, computed when the line prints (after the act
  resolves; a month's scandals at the turn's end). The preview uses the
  same computation; `check:preview` asserts that the preview's paper,
  subject and variant each equal the feed's.
- **The feed** labels every LOUD, Money and scandal line with its paper's
  masthead; a quiet line carries none.

## 2026-09-30 — Phase 2a, Part C: variants, single-word tiers, money

- **Decision 15 revised: variants by shuffle bag.** Within a run each
  line group — a card's headlines, a scandal's crystallisation
  headlines, a scandal's in-hand lines, and from round 2b each manager
  trigger's lines — shows a seeded permutation of its variants, indexed
  by how many times the group has been shown; a used-up cycle reshuffles
  with the cycle number in the hash, and a new cycle never opens with the
  line that closed the last. The count comes from the run's history,
  never the game RNG, so the preview and the feed count alike. Across
  runs, items shown once per run — season openers, ending texts, gate
  flavour, the opening premise — pick by a hash of the run seed and the
  item id. **Why:** the old hash of seed, month and card instance picked
  each showing independently, so one line could print three months
  running while another never appeared. With a bag every variant written
  is seen, and how many a group needs follows how often it is seen.
  A new check in `check:preview` proves the bag's two promises over every
  group size up to 8; its first run caught a bug (a cycle's swap was
  compared with the previous cycle's order before that cycle's own swap).
- **Every prose field that can vary is a list** of numbered keys:
  scandals `headlineKeys` and `inHandKeys` (a scandal has no rules text),
  gates `flavorKeys`, minors `textKeys`, `rules.actOpenerKeys` a list per
  act, and the opening premise `rules.openingKeys`. 39 i18n keys were
  renamed to numbered variants (`….1`).
- **Validate warns on too few variants**, by the sim's average showings
  per run: 4 or more → at least 4; 2 to 4 → 3; under 2 → 2; once-per-run
  items → 2. The measure is `npm run sim:variants` (player-like personas,
  1000 runs each), written to `sim/appearances.json`; its gap list is
  what round 2b's writing is drafted against.
- **Single-word tiers** (draft v5): Unknown · Noticed · Rising · Known ·
  Famous; Quiet · Whispers · Chatter · Circling · Breaking · Frenzy; Raw ·
  Learning · Solid · Seasoned · Skilled · Masterful. A tier word is one
  word of at most 10 characters (voice.md; validate enforces). "Famous"
  also resolves the collision of "Household name" with the minor
  Household Name.
- **Decision 1's wording revised**: "Breaking" and "Frenzy" only ever
  appear once a line is crossed, so the tier word already says it; the
  stat bar drops "LINE CROSSED" and keeps "N TO NEXT" beside it. The
  frozen rule — only the integer distance to the next scandal — is
  unchanged.
- **Money is shown as pounds, capital × £1,000**: capital 4 reads
  "£4,000", with a thousands separator, everywhere money appears — the
  stat bar, card text, requirements, previews, the feed. Values and rules
  are unchanged; it is display only. Money has no tier word because in
  this game money is for spending, not a mark of status; and a turn is a
  month, so the figures read true — a month of side gigs is £3,000, a
  brand deal £7,000, a publicist £4,000.

## 2026-09-30 — Phase 2a, Part B: endings and the established lane

Measured with the sim, 1000 runs per persona on seeds 20260929, 1 and
424242.

- **The One to Watch** (The Long Game, celebrity lane; before The
  Musician's Musician) brings artisan's The Musician's Musician to
  66.4% / 67.8% / 67.0%, under the 70% line without tuning a number. It
  holds 3.8–4.5% of player-like runs.
- **Flash in the Pan tied to the fame split** (peak hype 80) fell to
  1.20% / 1.38% / 1.22%, below the 1.5% reachability line, so it keeps
  peak hype 75, as the author asked.
- **The Redemption Arc at scandals down 2** (as Comeback of the Year)
  lands at 1.46% / 1.46% / 1.84%: on two seeds just under the 1.5% line.
  Kept at 2 as the author asked; reported, not tuned around.
- **The established lane: at least 2 plays and a lead of 2**
  (`rules.laneEstablished`). Of the candidates measured (2–5 plays, lead
  1–3), it is the one that settles around mid-summer: half of player-like
  runs have an established lane by month 5–6 (by month 5: 49%, by 6:
  58%; 88% by the year's end). Once settled, the lane changes to another
  in 5.4% of runs, but the lead can shrink again: a quarter of later
  month ends (25.7%) read "early" once more. A lead of 1 settled earlier
  but switched lanes in 26% of runs; 3 plays settled in early autumn.
- **Goals board**: the fame axis lists "unknown" as unlisted, so The Long
  Game and The Hard Way show only their scandal requirement.

## 2026-09-30 — Round a83fa88 answered; phase 2a begins

Phase 2 of the content expansion is split in two: 2a, the press (this
round), and 2b, the two managers, written on the variant system built in
2a. The author's answers to round a83fa88:

1. **Lanes count cards played from the career, not the starting deck —
   confirmed.** The starting deck is the premise: the player begins as a
   singer. It is not a choice, and the lane must reflect choices.
   `rules.laneStartingDeck` stays false.
2. **The three failing bands:**
   - Artisan in The Long Game (~99%): **accepted.** A cautious,
     craft-led player is playing the long game; the major reflects the
     approach, and variety belongs at the minor level. Artisan is exempt
     from the major concentration band only; it stays in the minor band.
   - Artisan's The Musician's Musician (~70%): fixed structurally, not by
     tuning. The data showed a narrative error — celebrity-lane players
     landing in The Long Game were called The Musician's Musician
     (celebseeker 25% on seed 20260929). A new minor, The One to Watch,
     gives them their own ending.
   - Minor reachability: **1.5%, meaning "reachable", not "common".**
     The Hard Way's minors and The Independent are meant to be rare — the
     first needs poor play, the second a deliberate refusal to sign. In a
     collection, rare endings are the achievements. The axes are not bent
     to inflate them.
3. **Lane and register are independent axes**: register is visibility,
   lane is career direction. Reinvent Image moves to neutral — it is a
   cleanup tool, and utility is neutral — and stays LOUD. The principle
   for the rest: selling your image (Brand Deal, Sellout Ad) is
   celebrity; selling your labour (Side Gig) is neutral; promotion toward
   fame (Street Team, Press Junket) is celebrity; television (Late Night
   Show) is screen.
4. "Household name" colliding with the minor Household Name: resolved by
   single-word tiers, where the top hype tier is "Famous".
5. SINGER hard-coded in two screen headlines, and the three career-stage
   headlines: resolved by the press subject slot.
6. Design concerns:
   - Flash in the Pan is tied to the fame split — peak hype at least the
     split: "was famous, then lost it", so the player must actually have
     been Known. If that drops it below 1.5%, it keeps 75 and the rate is
     reported.
   - The Redemption Arc needs scandals down 2 from the peak, matching
     Comeback of the Year, so the ending always carries that award.
   - A lane decided by a single play: an **established lane**, for display
     only (press subjects now; the vanity's props and the managers later).
     Ending resolution keeps the current lane.
   - The abrupt switch at hype 80 stays; in round 2b it becomes a story
     beat — the manager marks the moment the player stops being unknown.
   - "Hype 79 or fewer" on The Long Game read as if staying unknown were
     the goal. The two unknown-side majors show only their reputation
     requirement; the tier word and the goal line carry the fame side.
     The known-side majors keep "Hype 80+".
   - Final-gate line wrapping and the heavy "Undiscovered" placeholders:
     visual craft.

## 2026-09-30 — Phase 1: two-level endings and career lanes

Phase 1 of the content expansion (docs/design/content-expansion.md §1,
§2, §8, §10). Numbers chosen with the sim, 1000 runs per persona on
seeds 20260929, 1 and 424242.

**The splits.** Fame: hype 80 at year end — the "Known" tier boundary,
moved from 60 to 80 so the split is on it (validate now requires the
fame split to be a hype tier boundary). Reputation: 6 scandals held —
clean is 5 or fewer, damaged 6 or more. Found by searching both splits
over year-end dumps: no pair keeps every player-like persona at or
under 70% on one major. The artisan ends in The Long Game in 98–99% of
runs at every candidate (its year-end hype p90 is 58), and a fame split
low enough to move it breaks minmaxer and dealseeker instead. This is
the lean the design predicted; it is reported, not tuned away.
Dealseeker's Breakthrough share is 67–69%: in band, narrowly.

**Minor thresholds.** Leading Role: screen lane. Household Name and
Tabloid Royalty: celebrity lane. Headliner: music lane and signed.
The Redemption Arc: scandals down at least 1 from the year's peak. The
Character Actor: craft 55+ and screen lane; The Musician's Musician:
craft 55+. Flash in the Pan: peak hype 75+ (a new year stat, kept at
each month end like the others). Running on Empty: holding Burnout, or
craft 34 or less. The fallbacks as the design table gives them.

**Lanes count cards played from the career, not the starting deck
(pending the author's confirmation).** Counting every play, the shared
starting deck — four music cards, two celebrity, no screen — decided the
lane: 89.4% of player-like runs ended in music and 1.4% in screen, so
two screen minors were nearly unreachable. `rules.laneStartingDeck`
(false) leaves out the starting deck's own instances; a drafted copy of
a starting card still counts. Lanes at year end, player-like runs
pooled: music 47%, celebrity 28%, screen 25%. Setting the rule to true
restores counting every play without a code change.

**Five screen cards** (lane screen), drafted by the author's names and
headlines (docs/writing/draft-v4.md): Screen Test (4 craft, 2 hype, 2
more hype at craft 15+), Acting Class (pay 1 capital: 6 craft, −1 heat),
Guest Spot (needs 15 hype: 6 hype, 3 heat; summer on), Soundtrack
Single (needs 20 craft: 5 hype, 2 craft, 2 heat; summer on), Streaming
Role (opportunity, needs 25 hype — below Film Cameo's 35: 9 hype, 2
craft, 3 heat; summer on). Their rules lines state their effects in the
cards' existing form. The content budget is raised to 25 action, 8
opportunity, 6 scandal, 8 gate, 4 major and 13 minor endings.

**The Award Show gate needs 45 craft (was 40).** The new craft cards
lifted its met% to 66–68%, out of band; at 45 it is 62.7–64.3%.

**Awards remapped.** Best New Artist: Headliner or The Independent.
Critics' Choice: craft 90+ and not The Breakthrough (a major matches
every minor under it). The others read no ending.

**Tiers realigned.** Hype: Known at 80 (the fame split), Household name
at 105 (People's Choice). Craft unchanged: Accomplished at 55 (The
Musician's Musician, The Character Actor), Remarkable at 90 (Critics'
Choice). Every tier is still reached in play (`npm run sim:tiers`).

**Bands.** New: major concentration (player-like, 70%), minor
reachability (player-like pooled, 3% each), lane reachability as probe
assertions (two lane probes, `screenseeker` and `celebseeker`, each ends
in its own lane in over 50% of its runs). Kept: every existing band,
the ending-concentration band now read on minors, the thesis probes now
read on the axis sides. Three fail and are reported rather than forced:
artisan's Long Game share (98–99%, predicted); artisan's Musician's
Musician share, 69.5–70.8% — within seed noise of the line, and five
card-number experiments moved it by no more than that noise; and four
minors below 3% pooled (The Independent 1.8–2.1%, Flash in the Pan
2.2–2.4%, Running on Empty 1.9–2.2%, Starting Over 2.4–2.6%): The Hard
Way holds about 7% of player-like runs and splits three ways, and no
threshold search raised the lowest minor above 2.4%.

**On screen** (docs/ui-plan.md decision 26): the goals board shows the
majors; the marker, the final gate and the ending screen name major and
minor; the endings collection replaces the list of locked endings. The
unused labels `ui.ending.others`, `ui.ending.other` and
`ui.goals.fallback` are removed; the old endings' goal lines are kept.

## 2026-09-30 — Endings deliberately unfrozen for the content expansion

The endings list, frozen for the UI since 2026-09-29, is **deliberately
unfrozen** for the content expansion (docs/design/content-expansion.md).
The flat four become two levels: four majors from a 2×2 of fame and
reputation, and thirteen minors (design §1). The four old ids — meltdown,
star, craftsman, nobody — live on as minors, so their text, award
references and sim records survive.

The **GameEvent list will be unfrozen additively in phase 3**: new event
types for story events and voice lines; existing types and fields stay
as they are, and the existing UI is unaffected.

**Still frozen:** resources, act structure, the heat formula, the
starting deck and the gates.

AGENTS.md now carries only rules, the frozen summary and pointers; the
draft heuristics and the band table moved to docs/sim.md verbatim
(28,634 bytes before, 24,810 after).

## 2026-09-30 — Round 1fddbd6 answered; the preview swallowed clicks

The content expansion design (docs/design/content-expansion.md) is
approved; this round is its phase 1. The author's answers to round
1fddbd6:

1. **The three headlines with career-stage words stay** (Press Junket
   "RISING SINGER", Indie Label "NEWCOMER", Public Feud "NEWCOMER"). They
   are exactly the headlines phase 2's press `{subject}` slot is for,
   which makes the subject follow fame and lane; rewriting them now would
   be done twice. The mismatch is accepted until phase 2.
2. **Stat bar small numbers at 800×450 and on touch: accepted until
   visual craft**, which rebuilds the stat bar. For that phase: touch has
   no hover, so a long-press on a stat must show its full value.
3. **"A story is breaking" persisting for months is intended.** It is the
   residue restored in round 3: a story does not die on its own; the
   player has to cool down. Phase 2 gives the manager a line for a player
   stuck in it.
4. **The final gate's awards label is "On the night:"**, not "Awards:" —
   it refers to awards night and echoes the Award Show gate's "not to
   embarrass them on the night".
5. **Tier rarity is right**: top tiers reached in about a quarter to a
   third of runs read as an achievement. The ending thresholds change in
   phase 1, so the boundaries are realigned there.
6. **AGENTS.md carries only rules, the frozen summary and pointers.**
   Detailed specifications live in docs/; the draft heuristics and the
   band table move out first, to make room for the ending structure.

**Bug, found by the author's automated playthrough:** the floating
preview intercepted pointer events — a click aimed at a card or END TURN
beneath it was swallowed. The preview is display-only and now takes no
pointer events. This was very likely the real cause of the "preview
lingers on a card" issue seen before only under automated input.
`npm run check:clicks` (part of `npm run check:preview`) plays seeded runs
in headless Chrome and, with the preview open over each card position and
over END TURN, hit-tests every card and END TURN at its centre and near
each corner; without the fix it reports END TURN blocked by the preview.
Also: counted phrases pluralise properly ("1 slot", "2 slots"), wherever
the interface used "(s)" or a fixed plural.

## 2026-09-30 — Numbers recede (decision 25)

Ambient state is words; decisions are numbers. The stat bar tells the
player how things stand — hype, craft and heat as tier words (draft v3),
the number small beside each and in full on hover; capital stays a
number; slots are pips. Precise values stay wherever a choice depends on
them: previews, gate requirements, goals-board conditions, hover. Full
text in docs/ui-plan.md §13, decision 25.

Tiers come from /core (`statTiers`), boundaries from content
(`rules.tiers`); /ui never computes a boundary. Heat's tier is read from
the distance to the line (heatOutlook), never the threshold, and states
pressure only, never a scandal count. Boundaries sit on the goals' own
thresholds where they can, so a word never runs ahead of a goal:

| Stat | Tiers, lowest first, with where each starts |
|---|---|
| hype | Unknown 0 · Local buzz 15 · Rising 30 (Cautionary Tale's hype) · Known 60 (Headliner's) · Household name 105 (People's Choice's) |
| craft | Raw 0 · Finding your voice 10 · Solid 20 · Seasoned 40 · Accomplished 55 (The Musician's Musician's) · Remarkable 90 (Critics' Choice's) |
| heat | below the line, by points to go: Quiet 5+ · Whispers 3–4 · People are talking 2 · They're circling 1; over it, by lines crossed: A story is breaking 1 · Out of control 2+ |

Target: every tier actually reached in play — in at least 5% of
player-like runs, counted over every state a player sees. Reached
(`npm run sim:tiers`, 1000 runs per persona, seed 20260929): hype 100,
98.8, 89.9, 66.9, 26.9%; heat 100, 96.3, 89.0, 85.7, 81.7, 37.2%; craft
100, 100, 98.8, 83.3, 65.8, 30.8%. Seeds 1 and 424242 agree within 1.5
points.

## 2026-09-30 — Round 6d165fe answered: the seven questions

The author reviewed and played round 6d165fe. The headline leading the
floating preview, the goals board in view during every decision and the
honest "Either way" line work. Content expansion is not part of this
round: it will come as a separate design document.

1. **The final gate mostly leaves the ending unchanged** (75.7% of
   player-like final gates end the year the same way either way):
   accepted. A year is decided by the year, not by the last step. The
   climax will move to the awards ceremony and a year-in-review in later
   phases.
2. **Nobody Yet's text against its awards: change neither.** It is a gap
   in the ending taxonomy, not a wording problem, and rewording would
   hide the symptom. A famous singer who never signed and holds a few
   scandals fits no ending — too unsigned for Headliner, too many
   scandals for The Musician's Musician, too few for Cautionary Tale —
   and falls to Nobody Yet. That player is a real archetype: famous on
   their own, no label. **Open issue for content expansion**, where it
   will likely become a fifth ending — a deliberate unfreeze of the
   frozen ending list.
3. **Comeback of the Year is a relative drop**: peak scandals minus the
   scandals held at the year's end, at least N. A comeback is about how
   far you recovered, not reaching an absolute low. "Peak minus end" is a
   general year stat in the award engine (`scandalDrop`), open to any
   award, not a special case. N = 2, tuned with `npm run sim:awards`: won
   in 12.6%, 12.0% and 11.5% of player-like runs (seeds 20260929, 1,
   424242) and in 30.5%, 31.3% and 28.4% of the comeback persona's — its
   most frequent winner. N = 3 would sit at the band's floor (3.1–3.5% of
   player-like runs; 8.8–10.3% of the comeback persona's).
4. **Branch-specific variants** are rewritten in draft v3. Cover Single
   keeps "FANS SAY THE COVER BEATS THE ORIGINAL": "fans say" reports an
   opinion, true in either branch.
5. **Newcomer-assuming headlines** are rewritten in draft v3 to be
   time-neutral. Fame-aware press labels that change as the player gets
   famous are planned for content expansion; "newcomer" can return then
   as the low-fame form.
6. **Decision 23 revised**: the "Either way" line shows the ending only.
   Awards are revealed on the ending screen, which keeps anticipation for
   the ceremony and removes the list problem. When the options bring
   different awards, each option shows its own, because then they bear on
   the choice.
7. **Flag negation**: every flag has its own positive and negative label
   (draft v3), and validate fails when either is missing. The general
   "Not yet <flag>" template is gone.

Also confirmed: Cautionary Tale with Most Promising Newcomer (Still)
reads as irony. Intended; kept.

## 2026-09-30 — The story at the moment of decision; goals in view; awards

The author's playtest of layer 2 part 1 found two things. The story
arrived after the decision: a card's headline printed only once it was
played, so choices were still made on numbers. And the goals board
vanished during decisions, because the preview took over the right
rail. Full text of decisions 21–24 in docs/ui-plan.md §13.

1. The preview leads with the headline (21): the exact variant the feed
   will print, from the same hash, in the card's register. The END TURN
   preview names each scandal by its crystallisation headline.
   check:preview asserts the preview's headline is the feed's.
2. Decision 6 pulled forward: the preview floats beside the hovered card
   and the goals board holds the right rail permanently.
3. The goals board is in narrative order, aspirations first, with an "If
   the year ended today" marker from a /core query (22).
4. The final gate's prediction includes the awards; when every option
   gives the same ending and the same awards: "Either way, the year ends
   as <ending>." (23).
5. Register follows visibility, not resource (24). This replaces the
   resource mapping in "Writing pass and disclosure" below.
6. A voice rule: every headline variant must read correctly in every
   branch of its card, because the variant is chosen by a hash, not by
   the branch that fired (docs/writing/voice.md).

The eleven questions, answered: Old Rumour's story changes (draft v2);
registers as in 5; the gap cards' registers come from draft v2; Burnout
stays; the final gate as in 4; the goals board as in 3; the ending
heading reads "One year later.", the feed's "The Coverage", and a
negative flag requirement "Not yet <flag label>"; heat carry-over is
part of the one month-end line, not a line of its own; decision 5 keeps
"author-controlled"; both readings stand — the headline hash is on seed,
month and card instance, and "line moved" measures the first line; the
awards are defined, tuned with the sim and shown unstyled:

| Award | Won when |
|---|---|
| Best New Artist | the year ends as Headliner |
| Breakthrough of the Year | fastest rise: hype gained 20+ in one month (month end to month end) |
| People's Choice | hype 105+ |
| Critics' Choice | craft 90+, any ending but Headliner |
| Comeback of the Year | 3+ scandals held at some month end, 2 or fewer at the end |
| Scandal of the Year | 9+ scandals held at the end |
| Most Promising Newcomer (Still) | only when no other award is won |

Conditions live in `content/awards.json`; /core's `yearAwards` reads them
against the final state and the run's event history (peak scandals and
the best month come from `turnEnd` events), so no GameEvent or GameState
field was added and `npm run sim` stays byte-identical. Target: every
award won in at least a few percent and at most about 40% of player-like
runs, and no run without an award. Measured (`npm run sim:awards`, 1000
runs per persona, seed 20260929): 31.0%, 26.2%, 26.1%, 27.6%, 5.2%, 8.5%
and 19.5% in the order above; no run without an award; 31.8% of runs win
two or more. Seeds 1 and 424242 agree within a point.

## 2026-09-30 — The seven pending items from the layer 1 handoff

Full text in docs/ui-plan.md §13 (decisions 1, 2, 4 and 18–20).

1. The heat display counts no scandals: "N TO GO", or once over, "LINE
   CROSSED · N TO THE NEXT". The scandal count lives only in the END
   TURN preview — two surfaces cannot disagree if only one counts.
2. The END TURN preview reports every scandal card month end will add,
   from any cause, Copycat copies included, with each one's cause on
   hover.
3. "Next line" is the integer heat value at which the next scandal would
   crystallise. /core computes it and how far it moved; /ui displays a
   movement it is given and never diffs state.
4. The heat display shows current state; the explanation attaches to the
   event that caused the change (season transition, gate result,
   month-end residue). No separate warning panel.
5. "No art before 10/26" means illustration only — the four ending
   illustrations. Layer 2 visual craft proceeds once the meaning layer is
   in; the loop is already tuned.
6. Awards are a separate list capped at 8, outside the 46-item cap: the
   cap bounds gameplay content, and awards change no play.
7. First-run mechanic exposure stays open, as a manual test for the
   author's next playtest.

## 2026-09-30 — A fixed 1280×720 stage

On the itch draft the embed rendered at 800×450, smaller than the
1280×720 the layout assumed, and the layout overflowed: on the draft
screen the bottom row of buttons was cut off. Decision: the whole UI
renders into one fixed 1280×720 logical stage, scaled uniformly to fit
the available viewport (contain, never crop), centred, and letterboxed in
the page background colour. It is re-fitted on resize and on fullscreen
change. Nothing inside the stage may overflow it at any viewport size: a
screen that needs more room gets a new layout, never a scrollbar. The
itch embed's viewport dimensions are 1280×720, with the fullscreen button
on.

## 2026-09-29 — The player's role: a singer (decided)

The role was never explicitly decided; it drifted into music because the
star ending requires signing a record deal, and later cards followed. The
author has now decided: the player is a young singer — second person,
unnamed, ungendered, never shown. Crossover work (brand deals, ads,
press) stays, because it is how real pop careers work. Actor and host
paths are full-version scope, not jam scope.

## 2026-09-29 — Writing pass and disclosure

Player-facing prose was drafted with AI assistance in conversation and
accepted by the author, who will revise it during playtesting. The draft
is docs/writing/draft-v1.md. The public AI disclosure now states that
player-facing text was drafted with AI assistance. Feed voice uses three
registers mapped to resources: LOUD (hype/heat, tabloid headline), quiet
(craft, diary voice), Money (capital, business page). Craft is meant to
be nearly invisible on the front page — the layout itself states the
game's thesis. Target run length stays under 20 minutes; prose adds
meaning, not reading time.

## 2026-09-29 — Layer 2 direction

Layer 1 playtest by the author: the logic is understandable but the run
feels dry — cold, terse, low immersion. Diagnosis: three missing things,
only one of them visual. (a) craft: layer 2 art; (b) voice: every card
reads as an invoice and the feed titled "The story so far" is a ledger —
fixed by hand-written headlines; (c) direction: the player cannot see the
endings or what they need — fixed by the goals board.

Asked whether any card caused real hesitation, the author answered: yes,
but rarely, and only ever over numbers — never over where the story was
going, because the story's direction was not legible. In the author's
words, they did not know what they were doing, what they were aiming
for, or what they could do.

Conclusion: the loop HAS mechanical tension, so do NOT rework the
numbers. The tension is simply unnamed — choices read as arithmetic
rather than career decisions. The same numbers, framed as a decision the
performer is making, change the hesitation from calculation to dilemma.
Layer 2 therefore builds the meaning layer first:

- what am I doing → opening premise, card headlines
- what am I aiming for → goals board
- what can I do → card headlines, deck viewer

Visual craft proceeds alongside, never ahead. Art applied first would
produce a well-dressed ledger.

## 2026-09-29 — Year-end awards ceremony (layer 2)

The ending screen takes the form of a year-end awards night. The ending
decides the headline; below it, the categories the player was nominated
in, won, or lost.

- Every award is available every run. Difficulty is the gate — no
  run-count unlocks, no meta-progression. A debut year can sweep major
  awards in the real industry; the fiction supports it.
- About 6-8 awards, real and joke. Joke awards make bad outcomes funny
  (e.g. a scandal award for meltdown, a flop award for nobody).
- A critics'-choice award for high craft / low hype gives the
  talented-but-unrecognised player a distinct outcome within nobody.
- A comeback award names the spike-then-clean-up route.
- A read-only query on final state, like heatOutlook — NOT GameEvents.
  Conditions reuse the existing shape; unlike endings (first match
  wins), every satisfied award is granted.
- Named as end-of-year, not end-of-run, so a future multi-year version
  reuses it unchanged.

## 2026-09-29 — Open concern: first-run mechanic exposure

artisan never holds a scandal (0.00 clogging every season). The clogging
band passes on the player-like aggregate while one player-like persona
never meets the core mechanic. Jam raters usually play once; a cautious
first run may never show a scandal. To verify by hand. If confirmed, fix
in content, not the frozen formula: give every hype source some heat, so
no route to the craftsman hype floor is heat-free.
