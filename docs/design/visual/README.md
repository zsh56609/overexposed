# Overexposed — visual design reference

**Status:** approved by the author through mockup rounds v1–v18 (2026-09-29 → 09-30). v13 added the screens around the desk (§9); v14 refined their motion; v15 replaced the card-play animation and added the scandal flip; v16 put the pile in the desk's own plane and simplified stat changes; v17 made the notebook a real one and took the number off the phone; v18 gave the phone the player's own time and tied reactions to messages, not words.
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

- **Order:** hype · craft · heat · next scandal · money · actions, then Deck & discard, Settings and the date — since round R9b the last three are cells of the bar too.
- **Geometry:** five equal cells of **114px** from x=16 to x=586. The **actions cell is fixed at 586–694**, so the three action bulbs are centred exactly on **x=640**. Deck & discard 694–874, Settings 874–988, the date 988–1266. A 1px divider (`rgba(255,220,170,.16)`) between every two. Keep these fixed.
- **Cell content** (round R9b): every cell two rows, 34px high at top 6, 3px apart, centred in it. A label row — the icon (10px, in its colour) and 4px on, the label (Libre Franklin 800 8.5px, letter-spacing .15em, uppercase, `rgba(237,230,214,.58)`) — over a value row: a big value (Playfair Display 900 18px `#EDE6D6`) and a small word (Playfair italic 12px `#bfb3a0`), 5px apart on one baseline. Hype, Craft, Heat: the number big, the tier word small (Heat's amber, red in a frenzy). Next scandal: the count big, "to go" / "to next" small. Money: the money big — `$` amounts, display ×1000 — and no word. Deck & discard: "7 to draw · 0 played", each count big, a 3px dot 3px from either, the scandals held after them; the whole cell is its button, as Settings' is, whose value is the gear (15px). The date: the season's marks (11px) over the month (Playfair 700 18px). A clickable cell lights (`rgba(255,220,170,.07)`) under the pointer. A cell clips across, never down: Playfair's descenders reach below its 18px line. At 844×390 the labels are 4.6px on screen.
- **Icon colours never change:** hype star `#ffd84a`, craft `#8fc7ff`, heat flame `#ff7a4a`, money `#b9e38a`, scandal `#e0584a`. Since round R9b the scandal's icon is the scandal card itself, tilted, its ✕ cut out (`i-paper`, one even-odd path, no mask), wherever a scandal is drawn: the bar, the held chip, card faces, effect chips, the mirror's notes, the doors card, the numbers panel.
- **Craft icon** is a music note; it becomes a **clapperboard** when the established lane is screen. The celebrity lane keeps the note.
- **Next-scandal countdown** (its levels on the cell since round R9b; the scandal icon in its red throughout):
  ≥5 to go as it is · 3–4 the count and its words amber `#ffcf85` · ≤2 red `#ff6b55` with a soft glow · crossed ("N to next") the count in a red tag (`#c3261a`, white, lining figures) with a slow pulse — none under reduced motion.
- **Actions:** three bulbs; a used action goes dark.
- **Season marks:** only the current season, as **three of its icons** (spring sprout `#8fd98a`, summer sun `#ffd84a`, autumn leaf `#ff8a3d`, winter snowflake `#d4e9ff`). Months passed: filled at 55%; this month: full colour with a glow; months to come: dim.
- **Date:** month name + year. The year starts in **March 2027**; January and February are **2028** (awards season). All three papers always show the same date.
- **Alignment:** the two rows centre in their cell; a label's trailing letter-spacing is taken back, so it centres by its ink. The mockup's measured offsets (`vanity.html`, `translateY` near `.cell`) went with its one-row cells (round R9b).
- **Tooltips** on every cell (hover, keyboard focus and long-press on touch; never a short tap; above choice overlays): a header with the stat, tier and value, then one short line in the game's voice. Craft lines differ for singing and acting. Copy: the `TIP` object in `vanity.html` (draft; imported by round 2c).

### 2. The papers (back left)

- The Daily Flash (red banner masthead, ALL CAPS), B-Side (music weekly, sentence case), Marquee (trade paper, Title Case). Mastheads with ears; datelines show the month and year and an issue number; **no founding years**.
- **Lead paper** stands in front; the other two stand behind with their mastheads visible. Clicking a back paper pulls it forward. **Switching papers re-renders only the papers — never the hand.**
- **The paper comes to you** (round R1): when a play prints a story in a paper behind, that paper comes forward — the same motion as a click — while the card is carried, so the story prints in front of the player. It stays in front until another play brings a different paper forward, the player picks one, or the month ends (the new issue's lead paper takes the desk). A play that changes more than one paper brings forward the one whose lead changed; if both or neither did, the one with the played card's own story; a play that changes no visible story moves nothing. It never lengthens the play's input hold. Reduced motion: the papers swap under a short crossfade.
- **Mark my stories** (a setting, on by default): the player's stories carry a red rule in the left margin; the rival's carry a purple one.
- **Photographs:** only the lead story has one. Halftone, drawn in code (see Porting; `ui/desk/halftone.ts`). Thirteen scenes: singer at a microphone · the rival with a guitar · festival crowd · paparazzi (red duotone, only when a scandal leads) · red carpet · film set · the street, a reporter's vox pop outside a row of shops, in each season (spring rain, summer sun, autumn leaves, winter snow) · award under a spotlight — and since round R8a (R7b's drawings) a talk-show set (the host at the desk, the guest in an armchair, a studio camera) · a recording studio seen from the control room · an arena seen from the stage · a press conference (lectern, microphones, flashes) — and since round R8d the room (`docs/design/visual/ref/r8d-room.ts`): the singer from behind on the edge of the bed, playing, at the window with the city outside, a lamp on the left, a coat on its hook on the right; spring's card shows it, and no paper prints it yet. Rule learned: a silhouette needs light behind it, and a picture is recognised by one iconic object.
- **The halftones in colour** (round R8d; the author's choices, `docs/design/visual/ref/r8d-colour.ts`, drawn in `docs/design/visual/ref/r8d-colour.png`): every halftone that is not a newspaper prints in colour, muted and dark enough to suit the dots — a middle ground between the photographs and faces and the papers. Light on ink, each dot's size follows the light, as before, and its colour the look's ramp at that light — dark and muted in the shadows, a warm cream in the highlights — tinted near the picture's own lights (a lamp, a beam, the flashes, a red carpet): the title's photograph in oxblood and amber, the photographers' flashes cool (`TITLE_LOOK`); the season cards' ovals a hue a season, a shade darker (`SEASON_LOOKS`); the awards night's backdrop warm, all four (`BACKDROP_LOOKS`). Ink on paper, each dot's size follows the dark, as the papers' do, and its colour the door's ink — a light tint in the small dots, the full ink in the large: the doors' photographs, an ink for each door's scene (`DOOR_INKS`). The looks go by scene and use, so one scene can have two: winter's card and Overexposed's night are both the red carpet, navy on the card and warm on the night. A scene with no look prints in the old cream on ink (`PLAIN`). The papers' photographs, the night's front-page pictures and the headshot stay black and white, their pixels unchanged (`halftone`, `INK`, `RED`, `HEADSHOT`). Each dot's colour is rounded to a step of 6 a channel, so a picture has a few hundred colours; the dots are filled a dot at a time, a colour's dots together (round R9a: one path of many circles loses a GPU canvas's fast path for a single circle).
- **Photo selection:** a lead story's scene is content's (`content/press.json` → `scenes`, /core's `sceneOf`): an override for the story's own i18n key first, then for its line group — a card's lines (`card:<id>`, a scandal's `scandal:<id>`), a paper's world stories, filler or spillover — so a talk show's story shows the talk-show set and a tour the arena; else its kind's default: a scandal the paparazzi, the rival her own, a world story or a saga's beat its paper's (Flash the street, B-Side the crowd, Marquee the film set), the player's own its paper's (Flash the red carpet, B-Side the singer, Marquee the film set). Each scene has three drawings — as drawn, mirrored, closer — its patterns shifted by the seed; a shuffle bag picks one, never the same picture on the same paper two months running.
- **B-Side reviews:** stars only for the player’s own releases, using the craft tier at release: Raw ★, Learning ★★, Solid ★★★, Seasoned ★★★½, Skilled ★★★★, Masterful ★★★★★. Coming scandal stories carry “Going to press” and disappear if cooling prevents them.
- **Marquee's box office** changes every month; when the player is Famous on the screen lane, their film, *One Year*, tops it.

### 3. The mirror (back right)

- Bulb frame. In a frenzy some bulbs flicker or go dark and a red clipping of the month’s latest scandal headline is stuck to the glass.
- **Black card** (taped, slight tilt): "If the year ended today" · major · minor.
- **Three sticky notes** for the other three majors: Breakthrough yellow, Long Game green, Overexposed blue, Hard Way pink. Each shows the ending's name and what it takes — its requirements **in the stat bar's language** (no goal line on it since round R8a: fewer words on screen; since round R8b it is the note's tooltip): `✓/✗` + icon + tier word + number — "★ Known · 80+" — and a scandal clause the doors' way, the icon and the threshold: "📰 5 or fewer", "📰 6+" (round R5). The words stay in ink: the icons carry the stat's colour, ✓/✗ the met state. The unknown-side majors show "✗ ★ Already known" when the player is Known, so no note ever looks achieved when it is not. Requirement lines have an integer line height (11px) so icons and text stay aligned.
- **The season's doors** (round R9b): a white index card taped to the glass below the notes (`#fbf8f0`, its top rule red `#c0261c`, a strip of tape): "End of spring · one door" — in winter "Winter · the last door" — and a row for each of the act's two doors: ✓ or ✗ (every requirement met now: the test the door makes, its Likely), its name (Playfair 700 11.5px), and its requirements right-aligned as the door states them — the stat's icon and "18+", "4 or fewer", "$4,000+", or "Signed to a label" — in Libre Franklin 800 9.5px and the value colours; they take a line of their own under the name when they don't fit beside it. Left 734, top 286, 206 wide, turned 1.6°; at most 82.5 tall, inside the glass (winter's, both rows wrapped). Above the glass, below the manager's bubbles; not focusable, no tooltip. The pair is the act's and needs no draw.
- Notes and the black card scale up slightly on hover (×1.05, ×1.04).
- **The goals as tooltips** (round R8b): hovering (mouse), a long-press (touch, 450 ms) or keyboard focus on the black card shows its major's goal, on a sticky note its own — the stat bar's tooltip (§1), the major's name as its header and the goal line under it, under the card or note (above it if there is no room), kept on the stage. It closes as the stat bar's do: leaving, a press elsewhere, blur. The black card and the notes take focus (tabIndex 0).

### 4. The desk

- **Notebook** (centre): quiet, private work. It never reaches the press. A spiral-bound pad — metal coil along the top, stacked page edges and a card back beneath, a pencil beside it. When quiet work lands **the page stays**: the old line fades and the new one is written word by word, left to right.
- **Lane props:** music — a **metronome** (standing) and two **different** sheets of music; screen — a **script** and a **clapperboard lying flat** between the notebook and the phone, its arm open (draw the arm inside the SVG's viewBox — it was clipped once); celebrity — a magazine and brush cup; no lane yet — a plain mug.
- **Where the magazine and the script lie** (round R8a): turned a little clockwise and set in toward the middle — the magazine at left 210, `rotate(4deg)`; the script at left 158, `rotate(3deg)`; their tops as before — so they lie with the desk's own lines. The projection was right; their placing was not: turned counter-clockwise at the desk's far left, they sat across its lines.
- **The standing objects** (round R8a; `docs/design/visual/ref/r8a-mug.svg`, `r8a-brushcup.svg`, `r8a-metronome.svg`): the mug, a diner mug in three flat tones with two red stripes (74×74 at 715, 399; its steam keeps its classes and animation); the brush cup, a rose-glazed cup with a gold rim and five brushes (72×112 at 718, 363, its base where the old cup's was); the metronome as it was. Each carries its own contact shadow, drawn in its SVG: a small dark ellipse tight under its base, reaching a little to the right, as the pencil's shadow falls (the metronome's svg shows its overflow for it). No blurred shadow apart from the object: `.cshadow` is gone. Their ids carry a prefix each (`mug-`, `bc-`, `metro-`).
- **Metronome:** swings by default (full period 2.4s calm, 1.3s in a frenzy). Click to stop: it finishes the current stroke, then eases to the centre and stops. Click again: it starts from the centre with a growing swing. Engine: `metroFrame` in `vanity.html`.
- **The script's content improves with fame** — three tiers (unknown: bad soap, cheap horror, an advert; rising: competent TV; famous: prestige scenes in homage to classic scene types, all lines original). The player's lines are highlighted like an actor's copy. Copy: `SCRIPTS` in `vanity.html` (draft; imported by round 2c).
- **Frenzy:** red clippings on the desk; two faceted crumpled paper balls, different sizes, staggered, centre-left between the lane props and the clippings. Each ball is a different random shape (`crumple()`); its contact shadow is small and tucked under the ball so it never looks as if it floats.

### 5. The phone and the manager

- The phone lies flat on the desk at the right, under the chat bubbles. Since round R8a it is the texts' phone (`.phone-big`) scaled: 104×191, bezel 4, corners 12 and 9, its body `#0b0d10` and a 1 px ring `#2a2d33`, lying further back — left 947, top 24 in the desk's plane, its front edge 25 px in from the desk's (flush with it, it did not look real). It has depth and no stray shadow: its side shows below its front edge and to its left, in three steps each 1.7 px left and 2.5 px down (`#50555f`, `#30333a`, `#17181c`), as the notebook shows its pages — since round R8d the side a slab lying there can show: the desk is seen from above its middle (perspective 1100, origin 640 140, the plane tilted 64°), so a slab right of the middle shows its near edge and the side toward the middle, its left, never its right; the true left side is about 1 px wide on screen and the steps draw it about half again as wide, so it shows; the first step a shade lighter, that side facing the light. A tight contact shadow falls a little to the right (`2px 11px 8px`, `7px 16px 16px`), as the standing objects' do (the old 26 px drop shadow left a dark patch on the desk); a 1 px inner light rims its frame; the glass has a sheen across the screen's upper left, over the lock screen. The bubbles stand above it at bottom 306 px. **No number badge**: its lock screen shows the notifications, and the count is the number of bars (seven at most) — **one manager bar for each bubble on screen**, arriving with its bubble, the newest on top (round R8a: it used to be one a message, and the two rarely matched); a bubble the month's end drops never gets one. Calm: a dark blue screen and the manager's blue bars. Frenzy: the screen glows red, and the press's red bars stand below the manager's from the month's start, filling what the month's bubbles leave of seven — counted from the start, so none goes as a bubble comes — and it buzzes every few seconds. Reduced motion: all at once, as the bubbles are. A message that arrives lights the screen and buzzes the phone. The lock screen shows **the player's own local time**, formatted the way their phone would (24-hour regions 15:52, 12-hour regions 3:52, no AM/PM), refreshed every few seconds — the browser knows the time zone; no permission, no network. Messages rise above it in screen space, labelled with the manager's first name.
- **Each message is two bubbles: a longer one, then a short one.**
- **A reaction belongs to one bubble of one message** — its month, message position and bubble position — never to its words. A line that recurs later is a new message and starts with no reaction. (Lines come from the shuffle bags, so a repeat only happens once a pool is used up; 2c adds variants to the busiest groups.)
- **People's colours** (round R8c; `docs/design/visual/ref/r8c-awards.html`): every person's name stands out in their
  own colour, close to their portrait's — lit on dark grounds, ink on paper (`ui/people.ts`): Mom `#ffcf4a`/`#a86f00`,
  Grandma `#f2655f`/`#b0302a`, Sam `#ffa36e`/`#b8501f`, Alex `#b7a6f0`/`#5f4ea8`, Juno `#ff78b0`/`#c42d6c`, Lio
  `#5cd6ec`/`#1f7d93`, Priya `#4fd3b6`/`#1f7f6c`, Dana `#87a0ff`/`#2f4fc0`, the unknown number (the photographer)
  `#b9bfcb`/`#5d6574`, Dex `#dcb46c`/`#8a6420`, Mags `#a9cf8e`/`#4f7a3a`. A name is found as a whole word,
  case-sensitive, the longest first (`ui/names.ts`), and drawn as `.pn`: 700 in running text, the line's own weight in
  a heavier line (b, small, the bubbles' who line); an `.ink` ancestor (paper) takes the ink colour. Only in: a text's
  title, its header's name (coloured whole by the speaker's face; the unknown number grey), the incoming messages and
  their answer; the desk's manager bubbles (the who line — the name keeps its colour in a frenzy — and the messages);
  the night's line for Juno and the two last words; the manager cards' names (Dex's dark card lit, Mags's cream one
  ink, each name's weight kept); the numbers panel's milestones; the manager's notes' signature (in ink). Papers, front
  pages, captions, letters, doors, cards, tooltips, the replies and the player's own bubble stay as they were.
- **Faces** (round R8a): the people who text the player and the managers have portraits — in colour, never newsprint grey, with brows and a nose but no eyes or mouth (the author's, `docs/design/visual/ref/r8a-avatars/`, held as strings in `ui/avatars.ts` and shown from data URIs, never image files). Mom's is a sunflower: her own photo is her garden, and the player's family stays unpictured. The photographer's is the phone's grey placeholder: the number was never saved. Alex's is his profile against a dusk sky, violet to rose and amber (redrawn in round R8d: from afar the sun behind his head read as part of it; the sky is an SVG gradient, `alex-sky`). Dex and Mags wear their business cards' colours. Each sits in a circle with a 1 px ring, its alt empty — a name is always printed beside it: a text's phone header (40 px, ring `rgba(255,255,255,.1)`), the bubbles' name row (22 px, 7 px before the name; the row right-aligned; in a frenzy only the name changes colour), each business card's top right (56 px, inside the card at right 22, top 20; ring `rgba(214,180,110,.7)` on Dex's, `rgba(154,106,58,.5)` on Mags's; the name, the role and the quote wrap beside it, never under it) and the awards night's last word (22 px, as on the desk). A letter has none: its letterhead is its face.
- **Liquid glass** (round R9b): every bubble is glass — the desk's (red-tinted in a frenzy; the name row stays clear), the manager choice's samples, the night's last words, the phone's: a light gradient over a little warm tint, what is behind blurred (14px; the phone's 12px) and saturated, a bright 1px top edge and a faint white ring, cream type with a soft shadow. The phone's screen is warm and dark; your own bubbles amber; the replies amber outlines, the one you can't afford grey-brown; the photograph's bubble as it was; no blue anywhere. Where backdrop-filter is not supported, the same in solid colours.
- Bubbles scale up slightly on hover. **Tapback reactions:** clicking a bubble opens a row of three below it — calm ❤️ 😂 👍, frenzy 💔 😭 👍 (the thumbs-up never turns down). Choosing one leaves it as a badge on the bubble's corner; choosing it again removes it; choosing another replaces it. UI state only — no rule reads it. The bubble with the open row is raised above its neighbours.

### 6. The hand

- Fanned, overlapping, near the camera. Above five cards the spacing contracts; eight or more remain on stage and clear of END TURN. **Hover:** lift 13px, straighten to 60% of its tilt, scale 1.012, 0.42s ease-out, 70ms delay. The hand re-renders only when its cards change.
- **Card anatomy — fixed anchors on every face:** name at 18px, values at 70px, italic flavour line at 108px (Playfair italic). Text stays inside the visible strip of a fanned card (~118px). **No cost circle and no paper label**; a card costing more than one action shows that many small bulbs, top right.
- **The flavour line is in the preview** (round R8a; a tester found "a lot to read" and clicked through it): a card in the hand — and so in flight and on the pile — has no flavour line on its face; its preview (hover, long-press) shows it instead, last, in the face's italic, whether or not the card can be played. The offers and the deck & discard panel keep it on their faces: there a card is met, or looked through. A scandal is not trimmed: its italic line is its in-hand line, not a flavour line, and stays on every face — in the hand, in the month end's flip, on the pile; its preview is as it was.
- **Card-face extras:** requirement line, labelled flag effects, true minus sign, action and money wording; a screen career uses the clapperboard for craft.
- **Values:** icon + number in the resource's colour — hype `#8a6a00`, craft `#1b4f8a`, heat `#c2410c`, money **green `#1d7a33` when earned, red `#b3261e` when spent**; drawing cards is a **card icon + "Draw N"** in plain ink. Dark faces (headshot, VIP pass), pink gloss and gold foil use lighter or deeper shades of the same colours (tables in `vanity.html`, search `.r-hype`).
- **Card faces — the paper tells the lane** (each card needs a face field; round 2c):
  - music: gig flyer (yellow, dashed top) · score paper (cream, staff lines)
  - screen: script page (white, black spine, Courier name) · revision pages (blue, "REVISED · BLUE PAGES") · call sheet (green, dark header band) · 8×10 headshot (halftone profile photo, white print border)
  - celebrity: pink gloss · gold foil · all-access pass (black, gold type, lanyard slot)
  - neutral: spiral notebook page
  - scandal: red, dashed white border, ✕, and its in-hand line as flavour
- **END TURN** (bottom right): "no scandal" / "N scandals will print"; a ticket (round R9b, §9), red in a frenzy, its second line Playfair italic 12.5px `#5a5046` (`#ffd9d2` on red).

### 7. Scandals follow fame

The press composition is `/core`'s job, but the look depends on it: an unknown player's
scandal month keeps **their lane's paper in front**; the tabloid behind carries the scandal
as a two-line brief and its lead is usually world news or the rival. Once the player is
Known the scandal leads the tabloid (with the paparazzi photo) and the tabloid takes the
desk even when tied with the lane paper; Famous overwhelms the page. See `shots/08-…tabloid-pulled-forward.jpg` and `shots/09-…frenzy….jpg`.

### 8. Other screens (`screens.html`)

- **Title**, **manager choice** (two business cards; each shows its **perk** — Dex D2 (one extra card in each draft offer and the first reroll each season free), Mags M1 (season-end relief; see content/managers.json and draft-v7)), **awards night** (curtains, spotlight, plaques revealed in sequence, rival's closing line). "Play again" sits at the bottom, after the reveal.
- **The night's awards** (round R8c; `docs/design/visual/ref/r8c-awards.html`). Every award has a **trophy**, the
  author's drawing (`r8c-trophies/`: a gold record, a gramophone, a microphone, a star, a film reel, a laurel, a press
  camera — the camera is Villain of the Year's), held as strings in `ui/trophies.ts`, a chunk of its own fetched once
  the title has painted; until it comes a trophy's box stands empty at its size, and nothing moves when it does. A
  **plaque** has its trophy at its left (56×70 on the night, 60×75 on the shelf, a drop shadow) and its words at its
  right, a size smaller beside it: the name 15 px, the citation 10 px (line height 1.3), padding 9 12 9 8; Winner and
  the New chip as before. By how many the year won, in content order: one to three plaques, centred; four, on the
  front pages' columns (164, 406, 648, 890; 226 wide); five or six, three plaques and the fourth box, "And n more",
  an entry per award (a 24×30 trophy, the name 12 px, its short line 10 px italic, each on one line); seven or eight
  (the most a year wins), two plaques and a wide box over the third and fourth columns (468), its entries in two
  columns filled row by row (22×27, 12 px, 9.5 px). A fresh award in a box has no chip but a 6 px `#ffcf85` dot at
  its trophy's upper right. A box comes as a plaque does (2.45 s + 0.3 s a box), its entries 0.12 s apart after it;
  applause once a box; a click, reduced motion or motion off show it all at once.
- **The night's backdrop** (round R8c): the major's scene printed light on ink, as the season cards' ovals are —
  The Breakthrough the arena, The Long Game the studio, Overexposed the red carpet, The Hard Way the street, all in
  winter, in a warm look whatever the scene, as the night's curtains and trophies are (round R8d, `BACKDROP_LOOKS`) —
  behind the night's top: an image, the night's first child, at 90, 8, 1100×393 on the stage, over the
  night's ground and under the spotlight and the curtains, opacity .26, feathered by a radial mask (`ellipse 56% 50%
  at 50% 40%`, solid to 34%, gone at 80%). Drawn at the stage's factor (its dot cell 4.4 times it) by the photo worker
  when the night mounts; it fades in over 600 ms when it comes (reduced motion or motion off: no fade) and never holds
  the reveal. Without a worker it is drawn on the page when the page is idle after the reveal. Its own cache, by scene
  and size, for the page's life.
- **Juno on the night** (round R8c): her line under the minor's text says what she won — or that you took it from her —
  and answers what passed between you (one line, so the top ends above the awards' label). Under the second front
  page, when you answered her at all, her last word: a block like the manager's (left 406, top 568, one front page
  wide), its small line her face (22 px) and her name, one bubble in the manager's bubble look; it comes at 4.75 s,
  between the manager's word (4.6) and the bottom block (4.9). The manager's block narrows to the first front page
  (226 wide, its bubbles too), at left 164 as before.
- **Hover on the night** (round R9a, as in the scrapbook: pointer devices only, 0.16 s ease-out, silent; `translate`
  and `scale`, which add to the reveal's held transform): a plaque as an award won; the rest's box as a plaque, the row
  under the pointer its name amber (`#ffcf85`); a front page lifts 4 px and grows 3 % (shadow
  `0 18px 28px rgba(0,0,0,.7)`); the manager's and Juno's bubbles grow 3 %, as the desk's do, from their tail's corner.
  Reduced motion or off: the light and the colours, no lift or growth.
- **PLAY AGAIN in brass** (round R8c): `linear-gradient(180deg, #e9c87a, #c9a04a)`, ink `#1a120a`, a warm glow and
  an inner highlight; hovered, `#f6dc98` → `#dcb45a`. Its size and place as before, the last front page's width.

### 9. The screens around the desk

Every screen happens *in the dressing room*: the scene dims behind it and the stat
bar stays visible, so the player always sees what they have while they choose.
The action bulbs remain visible during choices. Deck & discard and House rules' gear sit in the stat bar (round R1; since round R9b, cells of it). Photographs are drawn and cached on first need.
**Tickets** (round R9b): BEGIN, the title's three links, CONTINUE, the offers' two buttons, END TURN, the panels'
close buttons, PLAY AGAIN and the night's two links are tickets with depth — one shape (its ends pointed, 11px in; 7px
for the small ones), a cream body lit from above and darker at its foot, a light inner top edge and a dark inner foot,
a hard edge under it and a soft shadow; red for BEGIN, and for END TURN in a frenzy; small (10px, uppercase) for the
links. Hover lifts it 1px and a press sinks it 2px, 0.12s ease-out; disabled, at .45; under reduced motion or none
the shadows change and nothing moves. Each kept its size, place and hit area. Not tickets: cards, doors, the events'
replies, a letter's options, the scrapbook's tabs, House rules' switches, the credits' links, a note's ✕.
Header pattern: amber small-caps kicker (usually the date), a Playfair title, an
italic line.

- **Offers (the draft).** "<Month Year> · offers" / "Take one." / "The rest go to
  someone else." The offered cards at 1.1× in a row. Hovering a card shows the line it
  would print, in its paper's voice — or the notebook, for quiet work. The preview
  sits above the card and rises with it: same distance, same curve, same delay. Dex's extra card
  wears a paper-clipped tag, "Dex knows someone". Clicking takes it (a TAKEN stamp; the
  others fade). Below, two tickets: "Take one more $4,000", "New offers $2,000" — "New offers ·
  free" while Dex's free reroll stands — greyed out when the player cannot afford them; the money itself is the stat
  bar's (round R9b).
- **Season doors (gates).** Two invitations — cream card, a double gold rule, slight
  opposite tilts: "You're invited", the name, the flavour, **Requires** (✓/✗ + icon +
  threshold + "(you have N)"), **If you pass · if you fail** as effect chips, and a
  Likely / Unlikely stamp. A requirement shows only the stat's icon and the
  threshold, the number in the icon's colour — "★ 64+ (you have 104)" — never the
  stat's name; a condition without a stat ("Signed to a label") is plain text. The last door adds **On the night** (the awards that choice
  wins) and the header states the ending either way. Clicking accepts (ACCEPTED stamp).
  - **Every door has a photograph** (round R8a): an oval of 164×96 above "You're invited", its scene drawn as the
    papers draw it, with the papers' cell, filling the oval at 300 px wide (50% across, 46% down), framed as the
    invitation is — 1 px of gold `#b8924a`, 3 px of the card's cream, 1 px of gold. Since round R8d it prints in its
    scene's ink on the invitation's paper (`doorUrl`, `DOOR_INKS`: the singer oxblood, the crowd indigo, the arena
    plum, the studio teal, the press conference slate blue, the trophy bronze), drawn ahead by the warm-up, in a cache
    of its own beside the papers' (the same drawing prints black in a paper). Content names it: each
    gate's `photo`, a scene and one of its three drawings (the audition the singer, the showcase the crowd, the
    festival and the arena tour the arena, session work the studio, the label deal the press conference, the
    residency the singer mirrored, the award show the trophy). The Likely / Unlikely stamp stays where it was, clear
    of the oval (about 18 px at its nearest).
  - **The two doors are always the same height**: the row stretches the shorter to the taller, and each has a floor
    of 350 px — about the height of one with two lines of flavour, one requirement and one line of branches — so most
    doors of the year are one size; only the year's last, with their ending and awards lines, grow (on the stage at
    their longest, at 1280×720 and 844×390).
  - **A card a door adds is a short chip**, not a sentence: "+", the cards icon, the card's name ("+2×" for more) —
    the same chip on the faces, the replies and the previews; a scandal added keeps its newspaper chip.
- **Season cards** (round R8a; spring's since round R8d): the season's scene above the date, printed light on ink as
  the title's photograph is (`renderLightCanvas`): an oval of 400×200 showing the middle 400 of a drawing at 560×200
  — both times the stage's own factor, its scale on the screen × the device pixel ratio, as the title's is reckoned,
  the dot cell 3.6 times it — ringed, from the inside, 1.5 px of cream at .55, 5 px of ink, 1 px of cream at .25.
  Content names the scenes (`rules.seasonScenes`): spring the room (summer's arena is the same back at the far end of
  the year), summer the arena, autumn the street in autumn, winter the red carpet — since round R8d a hue each, a
  shade darker (`SEASON_LOOKS`): spring's slate and its lamp, summer's violet and rose under the beams, autumn's amber,
  winter's navy over the red carpet. Spring's card is the opening, over the title's photograph right after BEGIN, so
  its oval is drawn first: in the worker after the title's, the warm-up draws spring's oval, then the papers'
  photographs, then the doors', then the other ovals — a card never waits for its photograph.
  The opening only looks spring's up and never draws it on the page: if the card comes first, the oval stands empty,
  its rings shown, and the picture fades in over 300 ms when it comes (reduced motion or motion off: at once);
  nothing moves.
- **Events (phase 3) — two presentations, chosen by the voice.**
  - *People who text* — the manager, friends, family, the rival: the phone comes up
    and their messages arrive **one at a time**, each after a few typing dots; the
    replies appear only once they have finished. The choices are **reply bubbles**, each showing its effects;
    "↺ remembered" marks a choice that sets a flag a later event may call back. After
    replying: typing dots, then their answer — the outcome line.
  - *A photo in a thread* (round R8b): some send a photograph with their text — Mom the Sunday table and Grandma in her
    coat, Lio the desk, Sam his band's poster, the photographer last night's shot of you, Priya the panel show's set,
    and Juno (round R8c, `r8c-photos/`) the premiere's carpet and the small room she plays now.
    It arrives as one more message, in its place: typing dots, then the photo, on the messages' rhythm and with the
    bubble's sound. Its bubble is the photograph itself — 200×150, an incoming message's alignment, radius 15 with the
    sender's corner (bottom left) 4, no padding, a 1 px ring `rgba(255,255,255,.06)`; its alt is empty, the words
    beside it carry its meaning. A click during the arrival shows it with the rest; motion off or reduced, all at
    once. The seven photos are the author's drawings (`docs/design/visual/ref/r8b-photos/`, their words outlined from
    the repo's fonts), held as strings in `ui/photos.ts` — a chunk of its own, fetched when the year begins (BEGIN),
    so the main bundle does not grow by it; if it has not arrived when a photo is due, the photo waits, the thread
    does not break.
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
  nearest hand cards may hide part of it — so it never jumps behind them (round R7): it rises
  out of the fan in front of the hand, and from the moment it overlaps none of the cards left
  in it, it goes under the hand and the season's dim and comes down there; where its path
  would cross the fan all the way to its slot, the carry arcs higher to clear the fan first.
  As it lands its
  line is **printed**: on the front paper a new item, "Just in", appears left to right
  as if under a press roller, with a brief warm flash and the red margin rule; the paper it prints in has
  come forward while the card was carried (§2); quiet work is written into the **notebook**.
  One action bulb goes dark and the hand closes the gap. **Stat changes are quiet**: a
  small signed figure ("+4", "−£1,000") appears just above the value in its resource's
  colour and fades; the value itself rolls to its new number, briefly tinted — no icons,
  nothing floating in from elsewhere. The pile shows the month's plays at a glance. The
  phone stays at the right, under the chat bubbles. Crossing the line: the countdown turns to "N TO
  NEXT" and END TURN reads "1 scandal will print". A scandal card cannot be played — it
  shakes and says so. No actions left: "No actions left this month."
- **Month end, in beats.** END TURN presses → the rest of the hand slides off the desk →
  the front page is stamped PRINTED (the stamp fades as the date turns, round R9a: it leaves with its issue) → in a
  frenzy, **news becomes a card**: each
  scandal's headline lifts off the tabloid and holds so it can be read, turns over (a 3D
  flip) into its scandal card, holds, then drops onto this month's pile, the stage
  shaking as each lands — the mirror image of playing a card → the hand and the pile are
  swept off the desk → the date flips → a new season gets a card (season name and its
  opener) while the light changes → the papers show the new issue → a new hand is dealt
  one card at a time and the bulbs relight → the manager's messages arrive as a chat
  does: each new bubble grows in at the bottom and pushes the earlier ones up, and the
  phone on the desk buzzes. Once the first has come, the rest keep their pace whatever the
  player does; a month that ends before they have all come shows no more (round R7).
- **Deck.** A panel: "Still to draw — sorted by name, not in the order you'll draw
  them" and "Played — back into the deck when it runs out", as mini card faces;
  scandals in red. Never reveal draw order.
- **Endings.** A scrapbook: four columns for the majors with their goal lines; found
  minors as taped newspaper clippings; undiscovered ones as dashed "?" outlines.
  "Endings found · N of 14". Its awards page is a shelf (round R8c): the twelve as the
  night's plaques with their trophies, in rows of four; one not yet won dimmed, its
  trophy a silhouette (`grayscale(1) brightness(.42) contrast(.9) opacity(.75)`), its
  how-line 10 px. Since round R9a the book is one size on both pages, 580 tall, and since
  round R9b both pages have the same room round their contents: each starts 26 px under the
  heading, with room left under it — the plaques 124 high, as on the night, the shelf's rows 22
  apart, a clipping's padding 11 12 12 and 21 between clippings, a gap's 17 12. And the page
  turns: the page going slides
  out and the next slides in, overlapping — 28 px, 240 ms, `cubic-bezier(.2, .7, .2, 1)`,
  each fading; Endings → Awards the old page leaves to the left and the awards come in from
  the right, back mirrored; the title changes at the click; the sound of a panel opening,
  once a turn (none for the tab already open); a click during a turn ends it and starts the
  next; the page going holds no input and leaves when its slide ends. Reduced motion: a
  150 ms crossfade, no travel; motion off: at once, the sound still played. **Hover**
  (pointer devices only, 0.16 s ease-out, silent): a clipping found lifts 3 px and grows
  2 % (shadow `0 12px 18px rgba(0,0,0,.5)`); a gap brightens — dashes `rgba(237,230,214,.55)`
  on a faint fill (`.04`), its small line `.6`, its ? amber `rgba(255,207,133,.85)`; an award
  won rises 3 px, its border `#a3804a`, its light to 1, its shadow `0 18px 26px rgba(0,0,0,.65)`
  with the inner line at `.28`; one not yet won rises 2 px, its border `#6e5c3c`, its
  silhouette a shade brighter (brightness .62, opacity .85). The lift and growth are the
  `translate` and `scale` properties, never `transform`, so a clipping keeps its tilt;
  reduced motion or off: the light and the colours, no lift or growth.
- **Settings — "House rules".** Mark my stories (on), Sound effects (on), Music (on), Reduce motion
  (off), Manager's notes (on; round R8b, §11). Sound effects carries the effects; Music the six tracks — switched back on, the game's current
  track comes back (round R4). Credits share this panel's style (round R7; laid out again in round
  R8b): one row per credit, its role over its name on one left edge (the role a deck section's head,
  4 px above; the name 12 px, `#e2d8c6`), a hairline over each row and no gap between them — the
  game's maker, the music ("Holizna · six tracks · CC0 1.0 · OpenGameArt", the last linked to
  Holizna's page), the typefaces ("Playfair Display and Libre Franklin · SIL Open Font License 1.1",
  the licence linked), the art and sound, the AI assistance — and a foot row under the same rule,
  the jam left and the version right.

### 10. Sound (round R4)

Every effect is the author's module (`docs/design/sound/overexposed-sound.js`, copied to
`ui/sound/oxsound.js` with one added export line; validate holds the two equal): synthesized in code from a
fixed seed, nothing recorded. The music is six tracks by Holizna (CC0 1.0) in `public/audio/music/`.

- **Effects play with their beat.** The queue's beats are heard by `ui/sound/director.ts`, so a D7
  fast-forward plays none of the skipped beats' sounds. A card: pick as it leaves the hand, land as it lands,
  its paper as it comes forward, print as its headline sets or a pencil as it goes into the notebook, clear
  when it exhausts a scandal. A number: a tick per step it rolls (at most every 50 ms); cash or spend for
  money, heat as heat rises, a low line when the heat tier rises into Breaking or Frenzy. The month end: a
  button at END TURN, a stamp for PRINTED, paper and scandal for a scandal's headline and its card, one deal
  as the month's pile slides off the desk (R5), the month as the date turns, the season as its card arrives, paper as
  the papers drop, a deal for each card dealt (a shuffle first after the deck is shuffled). Signing: two
  picks, the cards leaving. An answer: send and a bubble on the phone; a letter's SENT stamp.
- **The screens' own sounds.** A hand card under the mouse (mouse only, at most every 60 ms); the stamps
  (TAKEN, SIGNED, ACCEPTED); the offers rising (three deals, 70 ms apart) and the offer taken flying to the
  deck (a deal); the doors laid out; a panel opening and closing (and the scrapbook's page turn, as a panel opening,
  round R9a); the phone's buzz and each bubble; a letter
  landing; BEGIN's flash; Continue, the tickets and PLAY AGAIN (a button); on the awards night an ovation
  as it names The Breakthrough or Overexposed, and applause for each plaque, 0.3 s apart.
- **No ambience** (round R6). R4 put the room's tone under the desk, with the season's weather; on ordinary
  speakers it read as hum rather than a room, and the music carries the mood. The weather stays where it is
  seen, in the Flash's ear; the module's ambience API is unused.
- **Music.** One track at a time, at one gain (`MUSIC_GAIN`). BEGIN fades spring in (2 s). The scandal
  track comes at the first impact (2.5 s), plays through the next month, and the season's track comes back
  at the date of the next month end that prints none — never at months 3, 6 and 9, whose season card
  brings the new season's track (3 s) unless that month end printed a scandal. The last door fades the
  music as the lights go out (1.2 s); the night has its own track (1.5 s); PLAY AGAIN fades out with the
  ink, and the title is silent. Tracks load only when needed or soon to be: the next season's in a season's
  last month, the scandal track once a scandal is held, the awards track in winter.
- Nothing sounds before the first BEGIN click; a play the browser refuses leaves the game silent. A hidden
  page suspends the sound and pauses the music. `?cues` logs every cue for the checks.

### 11. The manager's notes (round R8b)

In a new player's first year, seven short notes in the manager's hand (the seventh, the doors', since round R9b), each once, each at the moment it matters
(`ui/screens/Notes.tsx`; the look from `docs/design/visual/ref/r8b-notes.html`). Every moment is read from the steps'
GameEvents and the desk's model, never by comparing state in /ui, and needs the desk idle.

| Note | Comes | Points at · lit | Goes | Stands (stage px) |
|---|---|---|---|---|
| stats | a hand dealt, no card played this month — the first desk (round R9b) | Craft's cell · Hype, Craft, Heat | the month's first play, END TURN | 44, 66 · 286 wide · −1.2° |
| actions | a hand dealt, no card played this month — once the stats note has gone | the bulbs | the month's first play, END TURN | 318, 66 · 280 · 0.9° |
| heat | a play has landed whose step raised heat | the countdown | the next play, END TURN | 300, 70 · 284 · −0.8° |
| doors | a play has landed, actions left, the doors card on the mirror (round R9b) | the doors card's left edge · the doors card | the next play, END TURN | 404, 214 · 276 · −0.8° |
| end | no actions left | END TURN's left side · END TURN | END TURN | left 994, bottom 626 · 262 · 1.1° |
| mirror | a hand dealt, no card played, a month ended since the switch came on | the black card's left edge · the black card | the first play, END TURN | 398, 84 · 268 · −1° |
| scandal | a Scandal in the hand | the leftmost Scandal's top · the card | END TURN, or the card leaves the hand | top 204 · 284 · 0.8° |

- **END TURN's** stands on its bottom (four lines: top ≈ 486) and moves up if a wide hand would meet it. **The
  scandal's** stands by its card, from fan.ts: a card right of the centre (640), 330 px left of the card's left;
  otherwise 30 px left of its centre; kept on the stage, and following the card as the hand fans again. A preview over
  it fades it.
- **A new player's first month has no offers** (round R9b): a run made with the notes on, unseeded or with
  ?notes=1, opens March on its hand — the signing deals it — so the stat bar's note and the bulbs' come on the first
  desk, one after the other. Every later month's offers are as ever.
- **One at a time**, in the table's order: the other waits, and comes when the first goes if its moment still holds,
  else at its next. **Never in the way**: the layer takes no click but the note's; no note covers a hand card, END
  TURN, the bulbs, the doors card, or an offer's cards and buttons. A card's or END TURN's preview over a note fades it and lets clicks through;
  a panel hides it (it comes back if its moment holds). A click, Enter or Space puts it away. The note is a button
  whose accessible name is its words; the ✕ is drawn (aria-hidden); the layer is aria-live polite.
- **The look**: cream paper (`#f7f1e1` → `#f1e9d4`, padding 15 16 11 17, the reference's two shadows), a strip of
  tape, a folded corner; Playfair Display italic 500, 17 px, line height 1.32, ink `#2b2520`; a line's marks
  `[hype]` `[craft]` `[heat]` are the stat bar's own icons, 15 px, in the ink's colour (Craft's the lane's); game
  terms capitalised as the cards are. The signature right, 14.5 px, `#75654f` ("— Dex", "— Mags"); the ✕ Libre
  Franklin 600 13 px `#a08f78`. The arrow: a hand-drawn curve and a two-stroke head, `#f4ead2`, 2.6 px, round caps,
  a dark drop shadow. In: down 8 px and up from transparent, 260 ms; out: a fade, 200 ms; reduced, fades only;
  motion off, at once. The layer is over the desk and its screens (the offers too), under the panels.
- **The first time** each note ever shows, the eye is drawn to it: a veil (`rgba(6,4,2,.46)`) with two holes — the
  target's, 6 px round it, radius 10, and the note's — and the target's glow (`0 0 0 2.5px #ffcf85, 0 0 22px 6px
  rgba(255,207,133,.55)`) on its own outline: a box for the stat cells, the bulbs, the countdown, the doors card,
  the black card and END TURN; a card's own outline, tilting with it. The veil in 160 ms, the glow on, off, on, off over 900 ms, the
  veil out 340 ms (about 1.4 s); reduced, no flashes: the veil fades in, holds 600 ms and fades out; motion off,
  none. The veil takes no click; any click ends it. A note is highlighted once, ever — never again, even after the
  switch comes back on.
- **Words**: `notes.<note>.<manager>`, signed `notes.sign.<manager>`; the actions and mirror notes say "hold" where
  a mouse would hover (`.touch`, when the last pointer put down was touch or a pen).
- **The switch** — House rules' "Manager's notes", on by default (a v0.7 player, with no such setting stored, has it
  on). A note comes only while it is on and has not come before; it joins `seen` as it comes, and stays until it
  goes or is clicked (a preview or a panel only hides it). Once all seven are seen and none is up, the switch turns
  itself off; turning it on empties `seen` (the highlights stay had). `seen` and `lit` are kept under
  `overexposed.notes`, guarded as the settings are. A run with `?seed=` shows none unless `?notes=1`; the dev pages
  never. `npm run check:notes` checks it all by real input.

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
- **Round R4:** the sound (§10) and its two House rules switches.
