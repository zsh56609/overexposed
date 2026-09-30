# Overexposed — visual design reference

**Status:** approved by the author through mockup rounds v1–v12 (2026-09-29 → 09-30).
This folder is the source of truth for the **visual phase**. `docs/ui-plan.md` §14
records the same decisions in prose; where the two differ, **this README is newer and wins**.

Build nothing from this folder until the visual phase begins (after the content
feature freeze, see `docs/status.md`). Content rounds may read it for context.

## Files

| Path | What it is |
|---|---|
| `mockups/vanity.html` | The main game screen on the 1280×720 stage. Open it in a browser. The bar above the stage switches **fame** (unknown / rising / famous), **state** (calm / frenzy), **lane** (music / screen / celebrity) and **season**. Hover the stat cells for tooltips; click a back paper to pull it forward; click the metronome; click a manager message to react. |
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

- **Notebook** (centre): quiet, private work. It never reaches the press.
- **Lane props:** music — a **metronome** (standing) and two **different** sheets of music; screen — a **script** and a **clapperboard lying flat** between the notebook and the phone, its arm open (draw the arm inside the SVG's viewBox — it was clipped once); celebrity — a brush cup; no lane yet — a plain mug.
- **Metronome:** swings by default (full period 2.4s calm, 1.3s in a frenzy). Click to stop: it finishes the current stroke, then eases to the centre and stops. Click again: it starts from the centre with a growing swing. Engine: `metroFrame` in `vanity.html`.
- **The script's content improves with fame** — three tiers (unknown: bad soap, cheap horror, an advert; rising: competent TV; famous: prestige scenes in homage to classic scene types, all lines original). The player's lines are highlighted like an actor's copy. Copy: `SCRIPTS` in `vanity.html` (draft; imported by round 2c).
- **Frenzy:** red clippings on the desk; two faceted crumpled paper balls, different sizes, staggered, centre-left between the lane props and the clippings. Each ball is a different random shape (`crumple()`); its contact shadow is small and tucked under the ball so it never looks as if it floats.

### 5. The phone and the manager

- The phone lies flat on the desk with an unread badge. Messages rise above it in screen space, labelled with the manager's name. (Later: one bubble at a time, with an optional sound.)
- **Each message is two bubbles: a longer one, then a short one.**
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

Replace the mockups' hard-coded state (`st`, `F`, `X`, `HANDS`, `compose`, the `lines`
object for manager messages) with the real `/core` queries and `/i18n` keys.

## Where each decision lands

- **Already in the game or in round 2b:** three papers and routing, prominence by fame, the rival, world sagas, managers and perks, scandals scaling with fame, the lead-paper rule, the goals-board fix.
- **Round 2c (content and information display):** tooltips; card flavour lines; cost only above one; lane-weighted draft; new screen cards; craft icon by lane; month names and calendar; season marks; countdown icon and colours; stat bar order; the card face field; desk scripts; two-bubble manager messages and a quiet-month trigger; tier words on the goals board; scene tags.
- **Visual phase:** everything else in this README.
