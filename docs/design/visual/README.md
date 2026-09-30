# Overexposed — visual design reference

**Status:** approved by the author through mockup rounds v1–v15 (2026-09-29 → 09-30). v13 added the screens around the desk (§9); v14 refined their motion; v15 replaced the card-play animation and added the scandal flip; v16 put the pile in the desk's own plane and simplified stat changes; v17 made the notebook a real one and took the number off the phone; v18 gave the phone the player's own time and tied reactions to messages, not words.
This folder is the source of truth for the **visual phase**. `docs/ui-plan.md` §14
records the same decisions in prose; where the two differ, **this README is newer and wins**.

The visual work runs alongside the content, not after the feature freeze (2026-10-01):
V1a the desk, static (§1–§7) → V1b the motion on the desk → phase 3 (events) →
V2 the screens around the desk (§8–§9) → phase 4 → the freeze. The current round is
in `docs/status.md`.

## Files

| Path | What it is |
|---|---|
| `mockups/vanity.html` | The main game screen on the 1280×720 stage, and the screens around it. Open it in a browser. The first bar switches **fame**, **state** (calm / frenzy), **lane** and **season**. The second bar opens each **screen** (offers, season door, last door, text event, letter event, deck, endings, settings) and has **Play month end**. On the desk: hover the stat cells for tooltips; click a back paper to pull it forward; click the metronome; click a manager message to react; **click a card to play it**. |
| `mockups/screens.html` | Title screen, manager choice (with perks), awards night. Tabs at the top. |
| `cover/` | itch.io cover: `cover.html` (source), 630×500 and 1260×1000 renders, the three OFL font files it uses. |
| `shots/` | PNG captures of the key states, for agents that cannot run a browser. |

## Decided vs sample

**Decided:** layout, components, behaviour, colour, typography and every rule below.
**Sample only:** every headline, name, number, box-office title and manager line inside
the mockups is placeholder text. The game reads real prose from `/i18n/en.json` and real
state from `/core` queries.

The mockups contain small sketches of game rules (`compose()`, `boxOffice()`,
`HANDS`, the hard-coded state object `st`). **Do not port those.** `/core` already owns
the rules (`frontPages`, lanes, endings…). Port the **presentation**.

## Architecture rules (unchanged, repeated here because they matter)

- `/ui` displays only. Every value on screen comes from a `/core` read-only query. No rule is computed in the UI.
- One fixed logical 1280×720 stage, scaled to fit, never cropped, nothing overflows it.
- The stage and its container use `overflow: clip`: nothing may ever scroll the stage (a card's lower edge sits outside it, and `overflow: hidden` alone lets focus or scroll-into-view shift the whole scene).
- Fonts are **self-hosted** (Playfair Display, Playfair Display Italic, Libre Franklin — all SIL OFL; the files are in `cover/`). The mockups load Google Fonts; the game must not.
- No image files for the newspaper photographs and no image-generation models: they are drawn in code and screened into halftone dots in the browser (see Porting).

## The scene

A dressing-room vanity seen from the chair. Back left: three newspapers standing on the
desk. Back right: the mirror with a bulb frame. The desk runs across the middle in CSS
perspective (`perspective:1100px`, origin `640px 140px`). The hand fans across the
bottom. Season changes the light (colour temperature and `--dim`).

### 1. Stat bar (top, 46px)

- **Order:** hype · craft · heat · next scandal · money · actions. Then, at the right: season marks and the date.
- **Geometry:** five equal cells of **114px** from x=16 to x=586. The **actions cell is fixed at 586–694**, so the three action bulbs are centred exactly on **x=640**; it has dividers on both sides. Keep these fixed.
- **Cell content:** icon · tier word (bold) · small number. Money shows `£` amounts (display ×1000). Values are centred in their cell.
- **Icon colours never change:** hype star `#ffd84a`, craft `#8fc7ff`, heat flame `#ff7a4a`, money `#b9e38a`, scandal newspaper `#e0584a`.
- **Craft icon** is a music note; it becomes a **clapperboard** when the established lane is screen. The celebrity lane keeps the note.
- **Next-scandal countdown** (pill with the newspaper icon):
  ≥5 to go neutral · 3–4 amber · ≤2 red · crossed ("N TO NEXT") filled red with a slow pulse.
  The newspaper icon stays scandal-red in every state except the filled one, where it turns white.
- **Actions:** three bulbs; a used action goes dark.
- **Season marks:** only the current season, as **three of its icons** (spring sprout `#8fd98a`, summer sun `#ffd84a`, autumn leaf `#ff8a3d`, winter snowflake `#d4e9ff`). Months passed: filled at 55%; this month: full colour with a glow; months to come: dim.
- **Date:** month name + year. The year starts in **March 2027**; January and February are **2028** (awards season). All three papers always show the same date.
- **Optical alignment:** icons and text are aligned by their ink, not their boxes. The offsets in `vanity.html` (search `translateY` near `.cell`) were measured: text +0.75px, numbers +1px, flame +1.25px, craft/money icons +0.25px, clapperboard −0.5px, date −1px, season marks +0.85px, pill contents +0.75px.
- **Tooltips** on every cell (hover; long-press on touch): a header with the stat, tier and value, then one short line in the game's voice. Craft lines differ for singing and acting. Copy: the `TIP` object in `vanity.html` (draft; imported by round 2c).

### 2. The papers (back left)

- The Daily Flash (red banner masthead, ALL CAPS), B-Side (music weekly, sentence case), Marquee (trade paper, Title Case). Mastheads with ears; datelines show the month and year and an issue number; **no founding years**.
- **Lead paper** stands in front; the other two stand behind with their mastheads visible. Clicking a back paper pulls it forward. **Switching papers re-renders only the papers — never the hand.**
- **Mark my stories** (a setting, on by default): the player's stories carry a red rule in the left margin; the rival's carry a purple one.
- **Photographs:** only the lead story has one. Halftone, drawn in code (see Porting). Eight scenes: singer at a microphone · the rival with a guitar · festival crowd · paparazzi (red duotone, only when a scandal leads) · red carpet · film set · street in each season (sun, rain, wind, snow) · award under a spotlight. Rule learned: a silhouette needs light behind it, and a picture is recognised by one iconic object.
- **Photo selection:** every line group carries a scene tag (defined in round 2c); each scene has several variants generated from the same drawing code with different seeds; choose with the shuffle bag; never the same picture on the same paper two months running.
- **Marquee's box office** changes every month; when the player is Famous on the screen lane, their film, *One Year*, tops it.

### 3. The mirror (back right)

- Bulb frame. In a frenzy some bulbs flicker or go dark and a red clipping is stuck to the glass.
- **Black card** (taped, slight tilt): "If the year ended today" · major · minor.
- **Three sticky notes** for the other three majors: Breakthrough yellow, Long Game green, Overexposed blue, Hard Way pink. Each shows its goal line and its requirements **in the stat bar's language**: `✓/✗` + icon + tier word + number — "★ Known · 80+", "📰 5 or fewer scandals", "📰 6 or more scandals". The unknown-side majors show "✗ ★ Already known" when the player is Known, so no note ever looks achieved when it is not. Requirement lines have an integer line height (11px) so icons and text stay aligned.
- Notes and the black card scale up slightly on hover (×1.05, ×1.04).

### 4. The desk

- **Notebook** (centre): quiet, private work. It never reaches the press. A spiral-bound pad — metal coil along the top, stacked page edges and a card back beneath, a pencil beside it. When quiet work lands **the page stays**: the old line fades and the new one is written word by word, left to right.
- **Lane props:** music — a **metronome** (standing) and two **different** sheets of music; screen — a **script** and a **clapperboard lying flat** between the notebook and the phone, its arm open (draw the arm inside the SVG's viewBox — it was clipped once); celebrity — a brush cup; no lane yet — a plain mug.
- **Metronome:** swings by default (full period 2.4s calm, 1.3s in a frenzy). Click to stop: it finishes the current stroke, then eases to the centre and stops. Click again: it starts from the centre with a growing swing. Engine: `metroFrame` in `vanity.html`.
- **The script's content improves with fame** — three tiers (unknown: bad soap, cheap horror, an advert; rising: competent TV; famous: prestige scenes in homage to classic scene types, all lines original). The player's lines are highlighted like an actor's copy. Copy: `SCRIPTS` in `vanity.html` (draft; imported by round 2c).
- **Frenzy:** red clippings on the desk; two faceted crumpled paper balls, different sizes, staggered, centre-left between the lane props and the clippings. Each ball is a different random shape (`crumple()`); its contact shadow is small and tucked under the ball so it never looks as if it floats.

### 5. The phone and the manager

- The phone lies flat on the desk at the right, under the chat bubbles. **No number badge**: its lock screen shows the notifications, and the count is the number of bars. Calm: a dark blue screen and a couple of blue notifications (the manager). Frenzy: the screen glows red, notifications pile up — red press alerts among the blue — and it buzzes every few seconds. Each manager message that arrives adds a notification, lights the screen and buzzes the phone. The lock screen shows **the player's own local time**, formatted the way their phone would (24-hour regions 15:52, 12-hour regions 3:52, no AM/PM), refreshed every few seconds — the browser knows the time zone; no permission, no network. Messages rise above it in screen space, labelled with the manager's name.
- **Each message is two bubbles: a longer one, then a short one.**
- **A reaction belongs to one message** — its month and its place in that month — never to its words. A line that recurs later is a new message and starts with no reaction. (Lines come from the shuffle bags, so a repeat only happens once a pool is used up; 2c adds variants to the busiest groups.)
- Bubbles scale up slightly on hover. **Tapback reactions:** clicking a bubble opens a row of three below it — calm ❤️ 😂 👍, frenzy 💔 😭 👍 (the thumbs-up never turns down). Choosing one leaves it as a badge on the bubble's corner; choosing it again removes it; choosing another replaces it. UI state only — no rule reads it. The bubble with the open row is raised above its neighbours.

### 6. The hand

- Fanned, overlapping, near the camera. **Hover:** lift 13px, straighten to 60% of its tilt, scale 1.012, 0.42s ease-out, 70ms delay. The hand re-renders only when its cards change.
- **Card anatomy — fixed anchors on every face:** name at 18px, values at 70px, italic flavour line at 108px (Playfair italic). Text stays inside the visible strip of a fanned card (~118px). **No cost circle and no paper label**; a card costing more than one action shows that many small bulbs, top right.
- **Values:** icon + number in the resource's colour — hype `#8a6a00`, craft `#1b4f8a`, heat `#c2410c`, money **green `#1d7a33` when earned, red `#b3261e` when spent**; drawing cards is a **card icon + "Draw N"** in plain ink. Dark faces (headshot, VIP pass), pink gloss and gold foil use lighter or deeper shades of the same colours (tables in `vanity.html`, search `.r-hype`).
- **Card faces — the paper tells the lane** (each card needs a face field; round 2c):
  - music: gig flyer (yellow, dashed top) · score paper (cream, staff lines)
  - screen: script page (white, black spine, Courier name) · revision pages (blue, "REVISED · BLUE PAGES") · call sheet (green, dark header band) · 8×10 headshot (halftone profile photo, white print border)
  - celebrity: pink gloss · gold foil · all-access pass (black, gold type, lanyard slot)
  - neutral: spiral notebook page
  - scandal: red, dashed white border, ✕, and its in-hand line as flavour
- **END TURN** (bottom right): "no scandal" / "N scandals will print"; red in a frenzy.

### 7. Scandals follow fame

The press composition is `/core`'s job, but the look depends on it: an unknown player's
scandal month keeps **their lane's paper in front**; the tabloid behind carries the scandal
as a two-line brief and its lead is usually world news or the rival. Once the player is
Known the scandal leads the tabloid (with the paparazzi photo) and the tabloid takes the
desk; Famous overwhelms the page. See `shots/08-…tabloid-pulled-forward.jpg` and `shots/09-…frenzy….jpg`.

### 8. Other screens (`screens.html`)

- **Title**, **manager choice** (two business cards; each shows its **perk** — Dex "Knows everyone: your first reroll each season is free", Mags "Calms things down: you lose 1 heat at the end of every month"), **awards night** (curtains, spotlight, plaques revealed in sequence, rival's closing line). "Play again" sits at the bottom, after the reveal.

### 9. The screens around the desk

Every screen happens *in the dressing room*: the scene dims behind it and the stat
bar stays visible, so the player always sees what they have while they choose.
Header pattern: amber small-caps kicker (usually the date), a Playfair title, an
italic line.

- **Offers (the draft).** "<Month Year> · offers" / "Take one." / "The rest go to
  someone else." The offered cards at 1.1× in a row. Hovering a card shows the line it
  would print, in its paper's voice — or the notebook, for quiet work. The preview
  sits above the card and rises with it: same distance, same curve, same delay. Dex's extra card
  wears a paper-clipped tag, "Dex knows someone". Clicking takes it (a TAKEN stamp; the
  others fade). Below, ticket-shaped buttons: "Take one more £4,000", "Reroll the offer
  £2,000" — greyed out when the player cannot afford them — and "You have £N".
- **Season doors (gates).** Two invitations — cream card, a double gold rule, slight
  opposite tilts: "You're invited", the name, the flavour, **Requires** (✓/✗ + icon +
  threshold + "(you have N)"), **If you pass · if you fail** as effect chips, and a
  Likely / Unlikely stamp. A requirement shows only the stat's icon and the
  threshold, the number in the icon's colour — "★ 64+ (you have 104)" — never the
  stat's name; a condition without a stat ("Signed to a label") is plain text. The last door adds **On the night** (the awards that choice
  wins) and the header states the ending either way. Clicking accepts (ACCEPTED stamp).
- **Events (phase 3) — two presentations, chosen by the voice.**
  - *People who text* — the manager, friends, family, the rival: the phone comes up
    and their messages arrive **one at a time**, each after a few typing dots; the
    replies appear only once they have finished. The choices are **reply bubbles**, each showing its effects;
    "↺ remembered" marks a choice that sets a flag a later event may call back. After
    replying: typing dots, then their answer — the outcome line.
  - *The press and institutions*: a **letter** — the paper's letterhead, a typed body,
    the choices as tick boxes with effect chips. After choosing: a SENT stamp and the
    outcome line.
- **Playing a card — objects move like objects.** Lift, carry, set down; nothing ever
  shrinks into a point. The card lifts out of the fan and straightens (0.2s), holds for a
  beat so the player registers what they played, is carried to **this month's pile**,
  on the desk just left of the phone — tilting back as it goes — and is set down with a
  small settle (≈0.9s in all; a click fast-forwards). The card must lie **exactly in the
  desk's plane**: it uses the desk's own perspective (1100px, vanishing point 640,140)
  and tilts about the desk's own hinge (its front edge, 640,556) to the desk's 64°, so it
  converges with the phone and the desk. Once down it sits beneath the hand, and the
  nearest hand cards may hide part of it. As it lands its
  line is **printed**: on the front paper a new item, "Just in", appears left to right
  as if under a press roller, with a brief warm flash and the red margin rule; a paper
  standing behind lifts for a moment; quiet work is written into the **notebook**.
  One action bulb goes dark and the hand closes the gap. **Stat changes are quiet**: a
  small signed figure ("+4", "−£1,000") appears just above the value in its resource's
  colour and fades; the value itself rolls to its new number, briefly tinted — no icons,
  nothing floating in from elsewhere. The pile shows the month's plays at a glance. The
  phone stays at the right, under the chat bubbles. Crossing the line: the countdown turns to "N TO
  NEXT" and END TURN reads "1 scandal will print". A scandal card cannot be played — it
  shakes and says so. No actions left: "No actions left this month."
- **Month end, in beats.** END TURN presses → the rest of the hand slides off the desk →
  the front page is stamped PRINTED → in a frenzy, **news becomes a card**: each
  scandal's headline lifts off the tabloid and holds so it can be read, turns over (a 3D
  flip) into its scandal card, holds, then drops onto this month's pile, the stage
  shaking as each lands — the mirror image of playing a card → the hand and the pile are
  swept off the desk → the date flips → a new season gets a card (season name and its
  opener) while the light changes → the papers show the new issue → a new hand is dealt
  one card at a time and the bulbs relight → the manager's messages arrive as a chat
  does: each new bubble grows in at the bottom and pushes the earlier ones up, and the
  phone on the desk buzzes.
- **Deck.** A panel: "Still to draw — sorted by name, not in the order you'll draw
  them" and "Played — back into the deck when it runs out", as mini card faces;
  scandals in red. Never reveal draw order.
- **Endings.** A scrapbook: four columns for the majors with their goal lines; found
  minors as taped newspaper clippings; undiscovered ones as dashed "?" outlines.
  "Endings found · N of 14".
- **Settings — "House rules".** Mark my stories (on), Sound (on), Reduce motion (off).

## Porting notes

Reusable code in `mockups/vanity.html`:

| Search for | What it gives you |
|---|---|
| `function halftone(` and `const SCENES` | The photograph generator: draw a greyscale scene on a canvas, blur it, sample it on a 45° grid, draw dots whose area follows darkness. Generate each scene variant once at load and cache the data URL (≈11 images, well under 100ms). |
| `function crumple(` | Faceted paper balls, seeded. |
| `function metroFrame` | The metronome engine (run → finish stroke → settle → stopped). |
| `.card`, `.score`, `.callsheet`, `.headshot`, `.gold`, `.vip` … | Card faces. |
| `.stats`, `.cell`, `.pill`, `.strip`, `.slotcell` | Stat bar, including the measured optical offsets. |
| `const TIP` | Tooltip copy (draft). |
| `const SCRIPTS` | Desk script copy (draft). |
| `function paintRx` | Tapback reactions. |
| `planeCard`, `setPlane`, `layDown`, `nextSlot`, `playCard`, `land`, `sweepDesk` | Playing a card: lift, carry, set down flat in the desk's plane; the printed line; the month-end sweep. |
| `delta`, `roll`, `applyFx` | Stat changes: the small figure above the value, the value rolling. |
| `writeNotebook` | Quiet work written into the notebook, word by word. |
| `phoneNotes`, `phonePing` | The phone's lock screen, and a message arriving. |
| `function scandalFlip` | News becomes a card: the month-end scandal flip. |
| `function monthEnd`, `dealIn`, `riseBubbles` | The month-end beats. |
| `buildDraft`, `buildGate`, `buildPhone`, `buildLetter`, `buildDeck`, `buildEndings` | The screens in §9. |

Replace the mockups' hard-coded state (`st`, `F`, `X`, `HANDS`, `compose`, the `lines`
object for manager messages) with the real `/core` queries and `/i18n` keys.

## Where each decision lands

- **Already in the game or in round 2b:** three papers and routing, prominence by fame, the rival, world sagas, managers and perks, scandals scaling with fame, the lead-paper rule, the goals-board fix.
- **Round 2c (content and information display):** tooltips; card flavour lines; cost only above one; lane-weighted draft; new screen cards; craft icon by lane; month names and calendar; season marks; countdown icon and colours; stat bar order; the card face field; desk scripts; two-bubble manager messages and a quiet-month trigger; tier words on the goals board; scene tags.
- **Visual phase:** everything else in this README — V1a the desk, static (§1–§7); V1b its motion (§9's "Playing a card" and "Month end"); V2 the screens around it (§8–§9).
- **Phase 3:** the event presentations in §9 are the target look for events.
