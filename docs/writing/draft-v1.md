# Overexposed — Writing draft v1

> **Status: draft.** Player-facing prose for the meaning layer, drafted with AI
> assistance and accepted by the author, who revises it during playtesting.
>
> After import, `/i18n/en.json` is the canonical home of every line here, and
> this file becomes a historical record. **Edit `en.json`, not this file.**
>
> British spelling throughout.

---

## 1. Voice

The player is a young singer, addressed in second person — unnamed,
ungendered, never shown.

### Three registers, three resources

The game's thesis is that being seen has a cost, and that the work nobody
sees goes unrecorded. The feed's typography carries that thesis: craft is
nearly invisible on the front page, while a single stunt can fill it.

| Register | Used for | How it is written | Layer 2 typography |
|---|---|---|---|
| **LOUD** | hype / heat actions | Tabloid headline. All caps, third person, present tense, a little cruel. | Large serif headline |
| **quiet** | craft actions | Diary voice. Second person, restrained. | Small italic, like a margin note |
| **Money** | capital actions | Business-page voice. Plain, occasionally dry. | Business-section styling |

### Rules

- **Short.** LOUD headlines ≤ 10 words; quiet and Money lines ≤ 15.
- **Concrete nouns over adjectives.** "A coat that isn't warm enough", not "struggling".
- **No stat words in prose.** Never "hype", "craft", "+6". Numbers belong to the interface.
- **Prose carries meaning; the interface carries rules.** Never explain a mechanic in prose.
- **Rating: ESRB Teen.** Scandals are breakups, feuds, bad reviews, old photos, rumours — nothing sexual, no drugs, no violence.

### Length budget (keeps a run under 20 minutes)

| Item | Maximum |
|---|---|
| Opening | 60 words, read once |
| Season opener | 25 words |
| LOUD headline | 10 words |
| quiet / Money line | 15 words |
| Ending text | 80 words |
| Award citation | 20 words |
| Gate flavour | 20 words |

---

## 2. Opening

> Spring.
>
> You have a demo recorded in a friend's bedroom, a coat that isn't quite warm enough, and a phone that doesn't ring.
>
> Everyone in this city wants to be seen. That's the easy part. The trouble is, once people start looking, they don't stop.
>
> You have one year.

*Intent: who you are, your situation, your time limit — and, in one line,
the core mechanic planted in the fiction: being seen has a cost.*

---

## 3. Season openers

The four lines follow the mechanical arc: summer is when the most scandals
crystallise; winter is when the hand is most clogged.

| Season | Text |
|---|---|
| Spring | Nobody knows your name yet. Enjoy it. It's the last time you'll have nothing to lose. |
| Summer | Things are moving fast now. The choices you make this season have a way of following you. |
| Autumn | The weather turns. So does the coverage. Whatever you did in summer, someone wrote it down. |
| Winter | Awards season. The industry sits down to decide what you are. You'll carry everything you've done into that room. |

---

## 4. Endings

### Names and goal lines

The goals board is visible from the first turn. The goal line is the
in-fiction framing; the interface lists the exact requirements via
`explainCondition`.

| id | Name | Goal line |
|---|---|---|
| star | **Headliner** | Get famous, get signed, and keep your past from catching up with you. |
| craftsman | **The Musician's Musician** | Be genuinely great, and known just enough to be taken seriously. |
| meltdown | **Cautionary Tale** | Be everywhere, for all the wrong reasons. |
| nobody | **Nobody Yet** | What happens if the year gets away from you. |

*"The Musician's Musician" is a real industry phrase for an artist respected
by peers but little known to the public — exactly what craftsman means.*

### Ending text

**Headliner**
> Your name is on the poster now, big enough to read from across the street. Strangers sing your chorus back at you — slightly wrong — and you let them. There were nights this year you'd rather not explain, and some of them are still out there, filed away somewhere, waiting. But tonight the room is full, and everyone in it came for you. Nobody gets to keep this. You get to have it.

**The Musician's Musician**
> You won't be recognised in the supermarket. You'll be recognised in studios, by people who know exactly how hard the thing you just did was. Session players ask how you phrased that bridge. A producer you've admired for years sends a message that says only: again? It isn't fame, and some nights you wonder if it's enough. But it's the kind of reputation that outlasts fame.

**Cautionary Tale**
> By winter the story had stopped being about the music. It was about the feud, the photos, the apology, the apology for the apology. You were everywhere — that was the problem. Somewhere, a younger singer is being told about you as a warning, and the worst part is that most of what they're hearing is true. Still. You got what you wanted. Everyone knows your name.

**Nobody Yet**
> The year ends quietly. No headlines, good or bad. You're still singing, mostly to rooms that aren't paying attention, and some mornings that feels like failure and some mornings it feels like the most honest thing you've done. Most people who come to this city don't last a year. You did. There's no rule that says it has to happen now.

*Intent: "There is no losing" made literal — all four endings keep their
dignity, meltdown and nobody included.*

---

## 5. Awards

Every ending maps to at least one possible award, so every run receives
something on the night. The intent column describes the condition; the sim
sets the thresholds.

| Award | Intent | Citation |
|---|---|---|
| **Best New Artist** | The top prize: Headliner, or both hype and craft very high | For a debut year that made the rest of the industry feel slow. |
| **Breakthrough of the Year** | The fastest rise | From nowhere to everywhere in twelve months. |
| **People's Choice** | Very high hype | Voted for by the fans. All of them, apparently. |
| **Critics' Choice** | High craft, hype short of Headliner — talented but unseen | The year's most overlooked voice. You may not have heard them. You should have. |
| **Comeback of the Year** | Held many scandals mid-run, cleared them by the end | For proving the second act can outshine the first — and that the first can be survived. |
| **Scandal of the Year** *(joke)* | Most scandals held | For services to the gossip pages. We couldn't have filled them without you. |
| **Most Promising Newcomer (Still)** *(fallback)* | Awarded when no other award is won | Promising. Newcomer. Next year, surely. |

---

## 6. Gates

| id | Flavour |
|---|---|
| audition | A real panel, a real audition. They don't care how many followers you have. |
| showcase | An industry showcase. Half the room came to be seen. You need to be seen more. |
| label_deal | A label wants a meeting. What they really want is proof you're a sure thing. |
| residency | A weekly slot at a serious venue. They'll check your reputation before your setlist. |
| arena_tour | A support slot on an arena tour — only for acts with a label behind them. |
| award_show | A nomination, if the committee trusts you not to embarrass them on the night. |
| session_work | Backing vocals on a major record. Pure craft. Nobody will ever know it was you. |
| *(8th gate)* | *Pending — to be written against the content export.* |

---

## 7. Scandals

Each scandal has three pieces of text: its card name, the headline printed
when it crystallises, and a line shown while it sits in the hand.

| id | Card name | Crystallisation headline (LOUD) | In hand |
|---|---|---|---|
| tabloid_story | The Breakup Story | EXCLUSIVE: THE SPLIT THEY TRIED TO KEEP QUIET | Every interview now starts with the same question. |
| public_feud | The Feud | WAR OF WORDS: NEWCOMER FIRES BACK AT RIVAL | Someone always wants a comment. |
| copycat_story | Everyone's Running It | NOW EVERY OUTLET HAS THE STORY | It keeps getting repeated. It keeps getting worse. |
| bad_press | The Review | CRITICS: OVERHYPED AND UNDERCOOKED | Someone quotes it at you. Again. |
| old_rumor | The Old Rumour | BEFORE THE FAME: THE SCHOOL STORY THAT WON'T GO AWAY | It isn't even true. It doesn't matter. |
| *(6th scandal)* | *Suggested: Lip-Sync Claims* | *WAS IT EVEN LIVE? FANS DEMAND ANSWERS* | *You'll be singing live for a while now.* |

*copycat_story copies itself — "every outlet is running it" is that
mechanic told as a story.*

---

## 8. Card headlines

The line printed on the front page when a card is played. High-frequency
cards get two or three variants so the same line does not repeat a dozen
times in one run. **Variants are separated by ` · `.**

These are the 21 cards confirmed in reports and screenshots. The rest await
the content export (section 9).

### LOUD

| id | Variants |
|---|---|
| viral_stunt | THE CLIP EVERYONE'S SHARING · OVERNIGHT SENSATION — OR OVERNIGHT STUNT? |
| open_mic | LOCAL CROWD FALLS SILENT FOR NEWCOMER · OPEN MIC REGULARS: "WE SAW THEM FIRST" |
| press_junket | ON THE RECORD: RISING SINGER TALKS FAME AND FAMILY |
| cover_single | FANS SAY THE COVER BEATS THE ORIGINAL |
| fan_meetup | FANS QUEUE FOR HOURS TO MEET NEW FAVOURITE |
| collab_single | SURPRISE COLLAB DROPS AT MIDNIGHT |
| world_tour | WORLD TOUR ANNOUNCED — FIRST DATES ALREADY GONE |
| reinvent_image | NEW LOOK, NEW SOUND: THE BIG REINVENTION |
| apology_tour | THE APOLOGY: SINGER FACES THE CAMERAS |
| indie_label | SIGNED: SMALL LABEL BETS ON NEWCOMER |

### quiet

| id | Variants |
|---|---|
| vocal_coaching | Another early session. The high notes are coming back. · Scales again. Nobody photographs this part. · Your coach doesn't praise you. That's how you know it's working. |
| studio_session | Eleven takes of the same line. The eleventh was the one. · A long night in the studio, with nothing to show for it yet. |
| mentorship | An older singer takes you aside and tells you what no one else will. |
| meditation_retreat | You switch your phone off for a weekend. The world keeps turning. |
| lay_low | A quiet week, on purpose. The phone buzzes; you let it. · You stay in. Let someone else be the story. |
| networking | A party you weren't quite invited to. You leave with six new numbers. · Drinks with people who know people. |

### Money

| id | Variants |
|---|---|
| side_gig | A wedding band, Saturday. It covers the rent. · Backing vocals on someone else's song. Cash, no credit. |
| brand_deal | The contract's signed. Your face is on the side of a bus. |
| sellout_ad | You sing about yoghurt for thirty seconds. The money is extremely real. |
| crisis_pr | A publicist makes some calls. By morning, a different story is trending. |
| legal_team | The lawyers send letters. Two stories quietly disappear. |

---

## 9. Import notes (for agents)

- **Schema, the RNG rule, and the awards rules** are defined in
  `docs/ui-plan.md`, decisions 15 and 16. This file does not repeat them.
- Import sections 2–8. Sections 1 and 9 are guidance, not prose.
- Card ids here come from reports and screenshots, not from the content
  files. Map by id; where an id differs from the real one, fall back to the
  display name, and report every mapping that was uncertain.
- Rows marked *pending* or *suggested* are not approved text. Leave a
  placeholder; do not invent prose to fill them.
- Cards missing from section 8 are listed in the gap report after import;
  the author writes them against the real content.
