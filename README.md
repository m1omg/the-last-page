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

- **Move** — arrow keys / WASD
- **Confirm / interact** — Z, Enter or Space
- **Menu / cancel** — X, Esc or Shift
- **Sound on/off** — M

Saving works two ways:

- **Open the menu → Options → Save game** to save anywhere.
- Rest at a warm **lantern lamp** to save *and* fully heal the party.

Progress persists in your browser (localStorage). From Options you can also
**Export save to a file** (downloads a `.json` backup) and **Import save from
a file** — handy for moving a playthrough between browsers or machines. Import
is also available on the title screen.

## What's inside

- ~30–45 minutes: a prologue, three drawn worlds (Crayon Meadow, Origami
  Woods, Button Bay), a final descent, and **two endings**
- Omori-style battles with an **emotion triangle** (GIGGLY > GRUMPY >
  GLOOMY > GIGGLY) and Undertale-style **Reach Out** — every enemy, including
  every boss, can be resolved without violence
- 3 party members, skills, items, snacks, a boss that cannot be fought at all

## Content note

Themes of grief, guilt, and hope: a friend in a coma after a road accident,
and a child learning to visit. No graphic content, no violence beyond cartoon
doodle-battles, no self-harm. It aims for a soft landing.

## How it was made

- **Code, story, music** — Claude (Fable 5), via Claude Code
- **Illustrations** — GPT Image 2, generated through the Codex CLI
  (`tools/prompts.json` + `tools/gen_images.sh`, post-processed by
  `tools/post_images.py`: chroma-key alpha extraction, sheet slicing, crops)
- **Audio** — all BGM and SFX synthesized from scratch by
  `tools/make_audio.py` (pure Python, no dependencies): music-box, felt piano,
  kalimba, soft square leads; original melodies around one recurring
  friendship theme
- **Engine** — vanilla JS + Canvas 2D, no build step, no runtime dependencies

## Dev / tests

```bash
node tools/validate.mjs     # static integrity: maps, scripts, assets, data
node tools/smoke.mjs        # headless full playthrough (true ending)
SMOKE_ENDING=page node tools/smoke.mjs   # dream ending path
```

Debug mode: add `?debug` to the URL (collision overlay + `window.__game`
hooks).
