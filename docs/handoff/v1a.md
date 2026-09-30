# Handoff: round V1a → V1b

Round V1a built the desk, static: the main screen as `docs/design/visual/README.md` §1–§7 describes it,
every state, hover, tooltips and the simple interactions. Round V1b adds the motion on the desk — README §9
"Playing a card" and "Month end". This note is what the V1b agent needs; the decisions behind each part are in
`docs/decisions.md` (the round's entries of 2026-10-01: "Round 308e7bb answered", then "Round V1a" Parts A–F and its acceptance).

## Where things are

| File | What it is |
|---|---|
| `ui/desk/model.ts` | The one adapter from /core: `deskModel({ state, steps, lines })` → `DeskModel`, every word and number on the desk. Pure and DOM-free; `check:preview` holds it to /core at every state. `deskIssue(state, steps)` gives the issue on the desk and the history it was composed from. |
| `ui/desk/Desk.tsx` | The scene's layers, back to front; `DeskActions` (`deck`, `play`, `end`, `focus`); the toast (`useToast`). Children draw over the scene (the plain screens until V2, the hover previews). |
| `ui/desk/StatBar.tsx`, `Icons.tsx` | §1. The icon symbols are drawn once (`IconDefs`) and used by reference. |
| `ui/desk/Mirror.tsx` | §3. |
| `ui/desk/Papers.tsx`, `halftone.ts` | §2, §7. `photoUrl(scene, season, variant)` draws and caches the halftone photographs (and the headshot). |
| `ui/desk/DeskItems.tsx`, `drawings.ts` | §4–§5: the desk's plane (`DeskPlane`: props, notebook, clippings, `Phone`), the standing props (`Uprights`: metronome, brush cup, mug, paper balls), the manager's `Bubbles`. |
| `ui/desk/Hand.tsx` | §6: `fan(n)`, `fanSpacing(n)`, the cards, END TURN. |
| `ui/desk/css/*.css`, `tokens.css`, `fonts.css` | Every rule scoped under `.desk`; colours are tokens (`tokens.css`). |

The run's state flows as before: `App` → `EventQueue` (`ui/queue.ts`) → `snap.state` and `snap.steps` →
`deskModel` (memoised on them) → `<Desk>`. The queue is still layer 1: `play()` drains a step at once and
`skip()` (called on every click) fast-forwards. **V1b's player goes there**: replace `play()` with a timed player
over each step's `events` (the frozen GameEvents, `docs/game-events.md`) and keep `skip()` as the fast-forward.
Nothing upstream changes.

## The hooks

Every element V1b animates carries a `data-hook` (or a stable class) and stays mounted across actions:

| Hook | Element | For |
|---|---|---|
| `stats` | the stat bar | — |
| `value-hype`, `value-craft`, `value-heat`, `value-money` | each cell's word or money (`.w`) | the value that rolls to its new number, briefly tinted |
| `number-hype`, `number-craft`, `number-heat` | the small number (`.n`) | the small signed figure appears just above it ("+4", "−£1,000") |
| `countdown` | the countdown pill (`.pill`, level classes `warn`, `close`, `over`) | `bump` when it changes |
| `bulbs` | the three action bulbs (`i`, `.used` from the left) | one goes dark per play; they relight on the deal |
| `date` | the date (`.when b`) | the date flips at the month's end |
| `mirror`, `today`, `clipping` | the mirror, the black card, the frenzy's clipping | — |
| `papers` | the three papers (`.news`, `data-front`); each page `.pp[data-paper]` with `pos0`–`pos2` | "Just in" printing, the paper behind lifting (`ping`), PRINTED stamp |
| — | each story: `.lead` or `.it`, `data-kind` (`player`, `scandal` lines are `player` with `.red`), `data-coming="1"` | the stories the month's end will print (the scandals): **news becomes a card** lifts exactly these |
| `notebook` | the notebook page (`.nb-txt`) | quiet work written word by word; the old line fades |
| `script`, `metronome` | the script prop, the metronome (its engine is in `Metronome`) | — |
| `phone` | the phone on the desk (bars `.nt.mgr` / `.nt.press`) | a message arriving adds a bar, lights the screen, buzzes |
| `bubbles` | the manager's messages; each bubble `.bub[data-k="<month>.<index>.<bubble>"]` | bubbles grow in at the bottom and push the others up |
| `hand` | the fan (`--strip` on it); each card `.card[data-uid][data-card]` | lift, carry, set down |
| `pile` | `.scene3d.pile`: this month's pile, in the desk's own perspective (1100px, vanishing point 640,140) | cards laid flat: give each a `.plane` (origin 640,556, the desk's hinge) and tilt it to 64° |
| `endturn` | END TURN (`.endbtn.end`) | the press at the month's end |
| `toast` | the note in the middle of the desk | — |

## What V1a left to V1b on purpose

- **Stat changes are plain**: the values change at once. V1b adds the rolling value and the small figure above
  it (README §9). Signed figures already use a true minus (U+2212) through `signed()` and `signedMoney()`.
- **Playing a card is plain**: the card leaves the fan and the fan re-lays at once. The mockup's `left .45s`
  transition on `.card` (the hand closing the gap) was left out; the cards only transition their hover.
  `fan(n)` gives each card's `left`, tilt and lift; the fan never reaches END TURN (at most 960px wide) and
  narrows its text to `--strip`.
- **The papers already show the month's end**: in the play phase the issue on the desk is the month as it would
  print if the player ended it now — `check:preview` asserts it equals the printed month, so the month-end beats
  can run from the desk as it stands. The stories the end adds carry `data-coming`.
- **The papers stand by transform**, not `left`/`top`: `.pp.pos0` is `translate(0, 56px) rotate(-.8deg)`,
  `.pos1` `translate(-8px, 0) rotate(-2deg)`, `.pos2` `translate(12px, 28px) rotate(1.6deg)`; a back paper's
  shade is a veil (`::before`, opacity `--shade`), not `filter` (a filter transition dropped frames in Firefox).
  **A `ping` keyframe must compose the paper's own translate and tilt**, or it will jump.
- **Crisis props fade by class**: the clippings and paper balls are always mounted; `.desk.crisis` shows them.
- **Reduced motion**: the bulbs' flicker, the steam, the phone's buzz and the scandal shake stop under the
  system's `prefers-reduced-motion`, and the metronome starts stopped. V2's "Reduce motion" setting should drive
  the same switches; V1b's beats should honour both.
- **The pile layer is empty**; `.scene3d` and `.plane` are in `css/scene.css`.

## Checks that cover the desk

- `npm run check:preview` — every number and word on the desk against /core, at every state of 300 runs; the
  issue before END TURN equals the month printed.
- `npm run check:clicks` — nothing covers a card (hit-tested across the strip its neighbour leaves, in its own
  tilted frame) or END TURN; transitions are switched off while it measures.
- `npm run check:overflow` (new) — every desk text at its longest variant, at 1280×720, 800×450 and a phone held
  landscape. Raise `--runs=` for more coverage.

A motion round should keep all three green: the checks switch transitions off, so a V1b animation must settle
into the same layout.

## Open questions left for the author (not V1b's to decide)

- README §7 and /core's lead-paper rule disagree when a Known player's scandal month also has a lead story in
  the lane's paper (Part D entry). Shot 09 is the case.
- The B-Side's ★★★★☆ under the player's single is left out: the game has no review score.
- The ten film titles are the mockup's sample list, kept `TODO(prose)`.
- The deck opens from a button in the stat bar until V2 places it.
