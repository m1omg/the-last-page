# The Last Page — origin & story bible

This file preserves where the game came from: the original request, the
scoping decisions made before the first line of code, and the story bible the
game was written against. The living technical docs are in `README.md`.

## The original brief (verbatim)

> "Please create a JRPG-like RPG Maker-style game similar to Omori with cute,
> drawing-style graphics you can generate with GPT Image 2, emotional themes
> and engaging Omori-style gameplay. Take inspiration from Undertale, Omori,
> End Roll, Ib and Re:Kinder but don't make a ripoff of them. Include similar
> music and sounds to Omori. Take as much time as you need, but doublecheck
> after yourself, don't become stuck in useless, token wasting overthinking
> loops though. Thank you in advance."
>
> — Michal, 2026-07-08, to Claude (Opus 4.8) in Claude Code

Scoping decisions made up front:

- **Graphics** — GPT Image 2, generated through the Codex CLI (the same
  pipeline documented in `README.md`), post-processed by `tools/post_images.py`.
- **Platform** — a web browser game; vanilla JS + Canvas 2D, no build step.
- **Scope** — "compact & complete": a finished ~30–45 minute story with two
  endings, not an open-ended demo.
- **Fair contest** — the same brief was given independently to another agent
  tool (Codex). Neither implementation was allowed to look at the other.
- **Audio** — no sampled assets; every track and sound effect synthesized from
  scratch in pure Python (`tools/make_audio.py`), aiming for Omori's palette:
  music box, felt piano, kalimba, soft square leads.

## Design pillars

1. **Emotional, not edgy.** Themes of grief, guilt, and hope with a soft
   landing. No graphic content; the accident is never shown, only remembered.
2. **Kindness is a mechanic.** Every enemy — every boss — can be resolved
   without violence ("Reach Out", the Undertale inheritance). The emotion
   triangle (GIGGLY > GRUMPY > GLOOMY > GIGGLY, the Omori inheritance) is not
   decoration: a doodle deep in its bad feeling can't hear you until you break
   the storm or shift its mood, hearts land one per round, and every heart
   softens its attacks. Kindness is armor.
3. **Original story.** Inspired by Omori (dream world as avoidance), Undertale
   (pacifism as the true route), End Roll (guilt made playable), Ib and
   Re:Kinder (a child navigating a wrong-feeling world) — but the sketchbook,
   the Smudge, and the ending belong to this game.

## Story bible

**Premise.** Mira (11) and her best friend Ren drew a whole world into one
shared sketchbook — two names on the cover, two kinds of handwriting in the
margins. There was a fight ("it should've been you who moved away"), and then
the accident: Ren turned around in the middle of the road to yell something
back, and never got to finish. Ren is in a coma. Mira hasn't visited once.

**The Sketchbook World.** Every night Mira escapes into the world they drew.
Since the accident, a gray ink stain — **the Smudge** — has been spreading
across the pages, and the friendly doodles it touches come back "all wrong":
crying, bristling, coming unsewn. The Smudge is not a villain. It doesn't hate
her. It's the unfinished feeling itself, wearing ink.

**The hub.** The Blank Page — a warm empty page with four doors (green to the
Crayon Meadow, blue paper to the Origami Woods, button-yellow to Button Bay,
and a dark smudged arch down to the Depths), a lantern, a cushion, and the
battle guide book Mira and Ren wrote together.

**The party.**
- **Mira** — keeper of the sketchbook. Braver than she believes.
- **Sir Biscuit** — gingerbread knight of the Round Plate, bottle-cap helmet,
  battle jam (strawberry). Invented by Ren, given Mira's laugh. Comic courage.
- **Wisp** — a small flame that hid when the big candle went out and is
  learning that "together counts". Anxious kindness.

**The four Torn Pages** (each a memory, each a max-HP/ink bump — the game's
only "leveling"): the blanket fort, the swings, the fight, the rain.

**The bosses are stages of grief wearing doodle shapes.**
- **TANGLE** (meadow) — every angry word left unsaid, wadded into one scribble.
- **THE PAPER SWAN** (woods) — sorrow guarding its crumpled wing the way you
  guard a memory that hurts; it still flies, differently.
- **THE BELL KEEPER** (bay) — the flinch itself: a porcelain figure whose
  little bell sounds like the moment before the brakes. "It wasn't the bell's
  fault."
- **THE SMUDGE** (depths) — immune to violence by definition. Only the three
  recovered memories, said out loud, in order, can still it. Its final form
  settles into the shape of the last page: blank, waiting for an ending.

**The endings.** After the Smudge stills, the half-drawn Ren on the last page
offers the choice the whole game is about:
- **The true ending** — wake up, walk through the apartment, past Mom asleep in
  her coat, down the street the accident happened on, into the hospital, and
  say the unfinished thing to the real, sleeping Ren. The sketchbook goes on
  the bedside table. *"When you wake up, we'll finish it together."*
- **The page ending** — stay. Draw the ending where nobody crossed the road.
  The dream world is warm and complete and the last page fills with a drawing
  of two kids who never grow up. It is gentle, and it is quieter than it
  should be, and the game does not scold you for choosing it.

**Tone rules.** Doodle-world humor is allowed to be silly (Sir Biscuit ate the
trumpets); real-world scenes are never played for laughs. Mom is kind and
exhausted, not neglectful. Ren is missed, not idealized — the fight was real.
The guide book, the walkie-talkie gap on the shelf, and the treehouse drawing
above the bed carry the friendship without flashbacks.
