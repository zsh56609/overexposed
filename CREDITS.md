# Credits

Every third-party asset Overexposed ships, for the itch.io page and the jam's
credits requirement (AGENTS.md §6, §10). The game shows these credits, shorter,
from its title screen.

## Fonts

| Font | Author | Source | Licence | Added |
|---|---|---|---|---|
| Playfair Display (regular and italic, variable) | Copyright 2017 The Playfair Display Project Authors, with Reserved Font Name "Playfair Display" | https://github.com/clauseggers/Playfair-Display | SIL Open Font License 1.1 | 2026-10-01 |
| Libre Franklin (variable) | Copyright 2020 The Libre Franklin Project Authors | https://github.com/googlefonts/Libre-Franklin | SIL Open Font License 1.1 | 2026-10-01 |

- The game self-hosts both: `ui/fonts/`, each file the complete original font
  in a WOFF2 wrapper that leaves the font data unchanged (`tools/woff2.ts`), so
  the fonts keep their names.
- The licence text and the notices ship beside them (`ui/fonts/OFL.txt`) and
  are linked from the in-game credits.

## Images

None. Every image in the game is drawn in code, with AI assistance: the
newspaper photographs (screened into halftone dots in the browser), the
headshot, the scenes and props. No image files, no image-generation models
and no public-domain or other third-party images.

## Sound

### Music

Six tracks by Holizna, dedicated to the public domain (CC0 1.0), from Holizna's
page on OpenGameArt: https://opengameart.org/user/120037 (added 2026-10-18).
They ship as given, never re-encoded, in `public/audio/music/`.

| File | Title | Author | Licence |
|---|---|---|---|
| `spring.mp3` | Poor but Happy | Holizna | CC0 1.0 |
| `summer.mp3` | Make Money | Holizna | CC0 1.0 |
| `autumn.mp3` | Autumn | Holizna | CC0 1.0 |
| `winter.mp3` | Everything You Ever Dreamed | Holizna | CC0 1.0 |
| `scandal.mp3` | All the Way Sad | Holizna | CC0 1.0 |
| `awards.mp3` | Lost in Your Eyes | Holizna | CC0 1.0 |

CC0 asks for no credit; the game gives it anyway, in its credits.

### Sound effects

None third-party. Every sound effect is synthesized in code, with AI
assistance (`docs/design/sound/overexposed-sound.js`, copied to
`ui/sound/oxsound.js`): no recordings and no audio-generation models.

## Development-only browser checks

Playwright 1.63.0 — Microsoft and contributors, Apache-2.0; https://github.com/microsoft/playwright (added 2026-10-02). Used only to drive the downloaded WebKit test browser. Neither Playwright nor its browsers ship in the game bundle. WebKit's component licences are included with its installed distribution.
