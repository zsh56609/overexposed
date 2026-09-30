# Status

As of 2026-09-30. **Read this first; update it at the end of every
session** (AGENTS.md → Session rules).

Overexposed is a deck-building career sim for the Game Gauntlet SIM Jam,
played in the browser. You are a young singer with one year: 12 months
(4 seasons × 3). Fast hype builds heat, heat crystallises into scandal
cards, and scandals clog the hand by winter. The year ends on one of four
major endings, refined into thirteen minors by the career lane you drifted
into (music, screen, celebrity) and the shape of the year. Rules and
architecture: [AGENTS.md](../AGENTS.md). UI scope:
[ui-plan.md](ui-plan.md). Design decisions: [decisions.md](decisions.md).
The content expansion, approved by the author and the reference for this
phase: [design/content-expansion.md](design/content-expansion.md); phase 1
of its four is done.

## Done

| Area | State | Where |
|---|---|---|
| Engine | Pure TypeScript reducer, seeded RNG, 19 frozen GameEvents; strict mode in dev and sim, lenient in the shipped build. Two-level endings resolved through the same query the goals board reads. Read-only queries for the UI: heatLine, lineMoved, endingIfYearEndedNow (major and minor), majorOf, majorRequirements, currentLane, laneShares, monthsLeft, yearAwards, yearStats, statTiers | `/core` |
| Content | 39 cards (25 action, 8 opportunity, 6 scandal), every non-scandal card in a lane; 8 gates; 4 major and 13 minor endings; 7 awards; stat tiers; JSON with i18n keys only | `/content`, `i18n/en.json` |
| Validation | Schema, ids, i18n keys, reachability, exhaustive endings (a major per corner, a fallback per major, the fame split on a tier boundary), lanes, the content budget, awards, tiers, both labels for every flag, code boundaries (including no rule logic in /ui); missing prose as warnings | `npm run validate` |
| Sim | 9 personas, headless, seeded: 5 player-like, 2 control probes, 2 lane probes; 13 bands. Award rates and stat tier reach per persona | `npm run sim`, `npm run sim:awards`, `npm run sim:tiers` |
| Balance | Phase 1 retune (decisions.md, 2026-09-30): 10 of 13 bands pass on seeds 20260929, 1 and 424242; the three that fail are reported, not forced (Known issues) | `docs/sim.md` |
| Frozen | Run structure, gates, resources, starting deck, heat formula, heat display, GameEvent list (additive in phase 3). Endings deliberately unfrozen for the expansion | AGENTS.md §2 |
| UI layer 1 | A complete run in the browser; previews checked against the reducer (dcf231e). A fixed 1280×720 stage scaled to fit any viewport | `/ui`, `/check` |
| UI layer 2, part 1 | The meaning layer, unstyled: writing drafts v1–v3 imported (no prose gaps), goals board, deck viewer, heat display and END TURN preview; the story at the moment of decision (D21, D6); goals order and marker (D22); year-end awards and the final gate's predictions (D16, D23 revised); numbers recede — tier words in the stat bar (D25) | `/ui`, `i18n/en.json` |
| Expansion phase 1 | Endings and lanes: draft v4 imported; two-level endings on the goals board, the final gate and the ending screen (D26); lanes on every card; five screen cards; the endings collection; awards remapped; tiers realigned; new bands and lane probes | `/core`, `/content`, `/ui`, `/sim` |

## The UI as it stands

Legibility only: system fonts, no palette, no animation. The screen comes
from `state.phase`, what is clickable from `legalActions`, every number
from /core. Everything sits on the fixed 1280×720 stage (`ui/Stage.tsx`,
decision 17), scaled to fit any viewport. The play area (feed, this
season's gates, hand, draft or gate) is on the left; the goals board holds
the right rail in every phase.

What each screen answers (ui-plan §13 priority):
- **What am I doing.** The title screen shows the opening premise.
  Hovering a card (long-press on touch) opens a preview floating beside
  it (D6) that leads with the headline the card would print — the same
  variant, from the same hash of seed, month and card instance, that the
  feed prints once it is played (D21) — then its numbers and any line it
  crosses. Hovering END TURN lists the scandals that would print by their
  headlines, each with its cause. The feed aggregates per action (D5): one
  headline per card played, set in its register (LOUD bold, quiet italic,
  Money plain), its deltas beneath; draws merged into one line; each
  scandal as a red lead line with who is blamed; a season opener when a
  season starts; one month-end line with the month's deltas and the heat
  that carries over (none in the last month). The line's movement (a
  number from /core) is told where it happened (D18).
- **What am I aiming for.** The goals board (D10, D22, D26), always in
  view: the four majors — The Breakthrough, The Long Game, Overexposed,
  The Hard Way — aspirations first, each with its goal line and its side
  of the two axes, live ("Hype 80+", "Scandals 5 or fewer"). The "If the
  year ended today" marker sits on the major the year would resolve to now
  and names the minor too ("The Breakthrough · Leading Role"), so the lane
  shows as a destination. The final gate (D23, revised) names major and
  minor once — "Either way, the year ends as …" — when every option gives
  the same one, otherwise on each option; each option shows its awards only
  when the options bring different ones. The ending screen ("One year
  later.") shows the major as the night's category, the minor's name and
  text, every award won with its citation, the run summary, and the
  endings collection: found minors named under their majors, the rest
  "Undiscovered", kept in this browser only.
- **What can I do.** The deck viewer (D12): deck and discard pile, grouped
  and sorted by name, never in draw order. Opened from the masthead in
  every phase.
- **How things stand.** The stat bar (D25) is words first: hype, craft and
  heat as tier words (fame, skill, pressure) with the number small beside
  each and in full on hover; capital as a number; slots as pips (●●○).
  Heat keeps "N TO GO", or "LINE CROSSED · N TO THE NEXT" (D1); its tier
  is read from the distance to the line and never states a scandal count.
  Requirement lines everywhere keep their exact numbers. The END TURN
  button carries the month-end count (D2), Copycat copies included.

Checks (2026-09-30, end of phase 1):
- `npm run sim`: a new baseline (content changed; not byte-identical to
  the last). 9,000 runs per seed, 0 crashes, 0 soft-locks, replay check
  identical. Endings, lanes and bands per persona: decisions.md,
  2026-09-30 (phase 1).
- `npm run check:preview`: 0 mismatches over 18,936 states — 36,198 card
  previews, each headline identical to the feed's; 5,778 month-end
  scandal cards (1,105 copies); 300 final gates (600 options), each
  prediction's major, minor and awards identical to the real finished
  year's (222 said "either way", 26 showed each option's awards); at every
  state the tiers bracket their values and the goals board's marker sits
  on the one major whose requirements all show met. Then the click-through
  check: with the preview open over every card position and END TURN, a
  click on every other card and on END TURN reaches its target — 0
  blocked at 1280×720 (196 states, 3,919 targets, 19,595 points), 800×450
  and 667×375.
- `npm run validate`: 0 errors, 0 warnings (39 cards, 4 major and 13
  minor endings, 399 i18n keys; no prose gaps).
- `npm run sim:awards`: every award inside its target on seeds 20260929,
  1 and 424242; no run without an award.
- `npm run sim:tiers`: every tier reached in play on all three seeds.
- Stage: overflow audits in headless Chrome with the floating preview
  opened over every card position and END TURN at every state. Random
  runs: 8 per size — 1280×720 on the dev server (442 states, 1,324 card
  hovers), 800×450 and 667×375 phone landscape on the production build.
  Recorded runs: one per minor ending, the most awards (4), a final gate
  whose options differ in awards, a hand of 8 — 16 runs at each size,
  3,000 states, 8,163 card hovers. Every ending screen again with the
  collection empty, full (13 of 13) and storage blocked — 135 screens.
  Zero overflows everywhere.

## Gap list: prose still to write

None. Drafts v1–v4 (`docs/writing/`) filled every gap; `npm run
validate` reports no prose warnings. The voice rules live in
`docs/writing/voice.md`.

## Known issues

Bands that fail and are reported rather than forced (decisions.md,
2026-09-30, phase 1):
- **Artisan ends in The Long Game in 98–99% of runs** — the lean the
  design predicted; no fame split fixes it without breaking minmaxer and
  dealseeker.
- **Artisan's The Musician's Musician share is 69.5–70.8%**, within seed
  noise of the 70% line; downstream of the above.
- **Four minors are reached in under 3% of player-like runs**: The
  Independent, Flash in the Pan, Running on Empty, Starting Over
  (1.8–2.6%). The Hard Way holds about 7% of runs and splits three ways.

Also found this round:
- The hype tier word "Household name" (105+) shares its words with the
  minor ending Household Name, which needs the celebrity lane: a music
  star at 105 hype reads "Household name" and ends as Headliner.
- Guest Spot's first variant and Streaming Role say "SINGER": right for
  this game's premise, but they are candidates for phase 2's press
  subject slot, like the three career-stage headlines below.

Still open:
- The season transition beat itself (D13) is not built; the line's
  movement is told in the feed.
- The draft preview from /core (D8) is not built: a draft card shows its
  requirement, not its outcome.
- A hover preview once stayed on a card while the pointer was on END TURN.
  Seen under automated input only; confirm with a real mouse.
- `act()` in `ui/App.tsx` fast-forwards the queue and then executes the
  click. Harmless while nothing animates; it must change to D7 (a click
  only fast-forwards) before any animation lands.
- Code comments still cite "CLAUDE.md §N" in 11 places. They resolve,
  because CLAUDE.md imports AGENTS.md.
- AGENTS.md is at 26,268 bytes (limit ~28 KiB).
- Tooling: the Vite dev server on Windows sometimes misses the last of
  several writes to one file within a second and then serves a stale
  module. After a scripted multi-edit, touch the file (or restart the
  server) before checking in the browser.

## Next task

**Content expansion phase 2: voices and guidance**
(docs/design/content-expansion.md §3, §4, §10): the manager profile
system with both profiles and the choice at the opening, season
check-ins, big-moment lines, and the press subject slot (which also
settles the career-stage headlines). Its prose — both managers' lines and
the press subjects — is drafted with it and imported only once the author
has accepted it. Then phase 3 (events, additive GameEvents) and phase 4
(year in review, full retune) before the 10/15 freeze; visual craft
follows the expansion.

## Waiting on the author

- **Confirm the lane rule**: lanes count cards played from the career,
  not the starting deck (`rules.laneStartingDeck`: false). Counting every
  play put 89% of runs in music and made the screen minors near
  unreachable (decisions.md, phase 1).
- **The three failing bands** (Known issues): accept the artisan's lean;
  say whether "a few percent" for minor reachability means 3% or 2%, or
  whether The Hard Way should be reachable more often.
- **Lane assignments to confirm**: Reinvent Image (celebrity) is heat
  relief plus scandal removal, which the design's own rule calls neutral;
  borderline: Late Night Show (screen, though it is a music performance on
  TV), Street Team and Press Junket (celebrity, though promotion and
  interviews come with any career), Brand Deal and Sellout Ad (celebrity,
  though they are money).
- **"Household name"**: the tier word and the minor ending share a name.
- **Three headlines still name a career stage** (Press Junket "RISING
  SINGER", Indie Label "NEWCOMER", Public Feud "NEWCOMER"): kept for phase
  2's press subject slot (decisions.md, round 1fddbd6).
- **Playtest this build**: does the marker's "major · minor" tell you
  where your year is heading, and does the collection make you want the
  next run?
- **itch and Safari/iPad.** Set the embed's viewport dimensions to
  1280×720 with the fullscreen button on, upload a new build, and play it
  in Safari on a Mac and, if possible, an iPad in landscape. To build:
  `npm run build`, then from `dist/`:
  `C:/Windows/System32/tar.exe -a -cf ../overexposed.zip index.html assets`.
- **A hand-timed first run.** The target is 10–15 minutes (ui-plan §12).
- **First-run mechanic exposure** (decisions.md, 2026-09-29): in the next
  playtest, play a cautious first run and note whether a scandal ever
  appears.

## Open questions for the author

None beyond the items above.

## Schedule

| Date | Milestone |
|---|---|
| 2026-10-15 | Internal feature freeze: tuning, polish and fixes only after this |
| ~2026-10-18 | Early build submitted to itch as insurance |
| 2026-10-26 | Illustration may start (the four ending illustrations; AGENTS.md §6) |
| 2026-11-05 04:00 JST | Deadline. Treat 2026-11-04 as the real one |

## Commands

```
npm run dev              # Vite dev server
npm run build            # typecheck + production build into dist/
npm run sim              # headless balance run (bands in docs/sim.md)
npm run sim:awards       # year-end award rates per persona
npm run sim:tiers        # stat tiers reached in play, per persona
npm run validate         # content, i18n keys, prose gaps, code boundaries
npm run typecheck
npm run check:preview    # every UI preview against the real reducer outcome, then check:clicks
npm run check:clicks     # clicks reach their card or END TURN with the preview open
```

With `npm run dev` running, `/check/embed.html` shows the game in an
itch-style frame at 1280×720, 1024×576, 800×450 and two phone sizes, with
a fullscreen button and the stage scale and text size read out.
