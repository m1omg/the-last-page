# The Last Page

**▶ Play it now: https://m1omg.github.io/the-last-page/** (no install needed)

A small, complete emotional JRPG for the browser, in the spirit of RPG Maker
dream games — an original story about a shared sketchbook, a spreading ink
stain, and an unfinished ending.

Mira and her best friend Ren drew a whole world into one sketchbook. Ren is in
the hospital now, and every night Mira escapes into the Sketchbook World —
where something dark is eating the pages. Recover the four Torn Pages, calm
the sad doodles (or fight them — your choice), and decide how the story ends.

## Run

```bash
npm run start        # serves on http://localhost:4321
```

or any static file server (`python3 -m http.server`) from this folder, then
open it in a browser. Opening `index.html` directly won't work — the game
loads assets with `fetch`, which needs http.

## Controls

### Keyboard

- **Move** — arrow keys / WASD
- **Confirm / interact** — Z, Enter or Space
- **Menu / cancel** — X, Esc or Shift
- **Sound on/off** — M, or **Sound** on the title screen / **Options → Sound**
  (remembered between sessions)

### Text

**Text** on the title screen / **Options → Text** switches the lettering:

- **Clear** — the bundled *Patrick Hand* face and slightly larger dialogue.
  Turned on automatically on touch devices, where it's much easier to read.
- **Storybook** — the original chunkier handwriting.

It starts on *auto* (Clear on phones and tablets, Storybook on desktop) and,
like every other setting, is remembered between sessions.

### Mouse

- **Click** a menu option to choose it directly; clicking with no menu open
  confirms / advances dialogue, like Z.
- **Right-click** is X — opens or closes the menu, backs out of submenus.
  The whole game is playable with just the mouse.

### Touch (phones & tablets)

Two schemes, toggled with **Touch** on the title screen or **Options → Touch
controls** in the pocket menu. The setting is remembered between sessions.

- **Gestures** (default) — **tap** to confirm; **press and drag** to walk (keep
  holding to keep walking, drag the other way to turn around); **two fingers**
  to cancel / open the menu. Holding still fast-forwards text, like holding Z.
- **D-pad** — an on-screen cross plus **Z** and **X** buttons. They sit in the
  letterbox beside or below the game, so they never cover the dialogue box.

In **both** schemes you can **tap a menu option to select it directly** — no
swiping to move a cursor. Tapping outside the pocket menu closes it. Dragging
is only ever for walking.

Touch controls only appear on touch-capable devices, so desktop is unaffected.

Saving happens at warm **lantern lamps**: resting saves *and* fully heals the
party. The story also saves itself at big checkpoints (after bosses and
mornings), so a closed tab never costs much.

Progress persists in your browser (localStorage). From Options you can also
**Export save to a file** (downloads a `.json` backup) and **Import save from
a file** — handy for moving a playthrough between browsers or machines. Import
is also available on the title screen.

## What's inside

- ~30–45 minutes: a prologue, three drawn worlds (Crayon Meadow, Origami
  Woods, Button Bay), a final descent, and **two endings**
- Omori-style battles with an **emotion triangle** (GIGGLY > GRUMPY >
  GLOOMY > GIGGLY) and Undertale-style **Reach Out** — every enemy, including
  every boss, can be resolved without violence. A doodle deep in a bad feeling
  can't hear you: break the storm (or shift its mood with a skill) and *then*
  your words land, one heart a round — or two, if you cheer it GIGGLY first.
  Risky, though: a giggly doodle dodges and swings wild if your words fail.
  There's a guide book in the Blank Page.
- 3 party members, skills, items, snacks, a boss that cannot be fought at all

## Content note

Themes of grief, guilt, and hope: a friend in a coma after a road accident,
and a child learning to visit. No graphic content, no violence beyond cartoon
doodle-battles, no self-harm. It aims for a soft landing.

## How it was made

The original brief, scoping decisions, and the full story bible are preserved
in [docs/ORIGIN.md](docs/ORIGIN.md). A detailed development log — process,
tooling, engineering decisions, and the bugs worth remembering (covering both
this game and the Full Edition) — is in [docs/DEVLOG.md](docs/DEVLOG.md).

- **Code, story, music** — Claude (Fable 5), via Claude Code
- **Illustrations** — GPT Image 2, generated through the Codex CLI
  (`tools/prompts.json` + `tools/gen_images.sh`, post-processed by
  `tools/post_images.py`: chroma-key alpha extraction, sheet slicing, crops)
- **Audio** — all BGM and SFX synthesized from scratch by
  `tools/make_audio.py` (pure Python, no dependencies): music-box, felt piano,
  kalimba, soft square leads; original melodies around one recurring
  friendship theme
- **Engine** — vanilla JS + Canvas 2D, no build step, no runtime dependencies
- **Font** — [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand) by
  Patrick Wagesreiter, under the SIL Open Font License 1.1
  (`assets/fonts/OFL.txt`). Bundled, not fetched from a CDN.

## Dev / tests

```bash
node tools/validate.mjs     # static integrity: maps, scripts, assets, data
node tools/smoke.mjs        # headless full playthrough (true ending)
SMOKE_ENDING=page node tools/smoke.mjs   # dream ending path
node tools/touch_smoke.mjs  # both touch schemes, via real multi-touch (CDP)
node tools/collision_audit.mjs && python3 tools/collision_audit.py  # art vs collision overlays
```

Debug mode: add `?debug` to the URL (collision overlay + `window.__game`
hooks).
