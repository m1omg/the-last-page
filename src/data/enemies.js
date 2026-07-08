// enemies.js — enemy definitions, Reach Out tables, and troops.
//
// Every regular enemy is a sad little doodle warped by the Smudge; each can be
// resolved peacefully via Reach Out. calmNeed = good options required.
// reach option: { label, good, text } — text is what happens.

export const ENEMIES = {
  sniffle: {
    name: "Sniffle", img: "en_sniffle",
    hp: 30, atk: 9, def: 3, spd: 6, emotion: "gloomy",
    intro: "Sniffle drips quietly. It looks like it's been crying for days.",
    acts: [
      { kind: "attack", mult: 1.0, msg: "{e} sneezes a storm of soggy confetti!" },
      { kind: "emotion", target: "player", emotion: "gloomy", msg: "{e} sobs. The sadness is contagious..." },
      { kind: "idle", msg: "{e} hiccups and wobbles in place." },
    ],
    calmNeed: 2,
    reach: [
      { label: "Offer a tissue", good: true, text: "Sniffle takes the tissue with both nubs. It blows its button nose. HONK." },
      { label: "Pat gently", good: true, text: "You pat the soggy little ghost. It leans into your hand." },
      { label: "Stare", good: false, text: "You stare. Sniffle cries harder. Oh no." },
    ],
    peaceText: "Sniffle smiles a tiny wet smile, folds itself into a neat square, and drifts away.",
    reward: { item: "cookie" },
  },
  scribble: {
    name: "Scribbles", img: "en_scribble",
    hp: 38, atk: 12, def: 4, spd: 12, emotion: "grumpy",
    intro: "Scribbles bristles like static. Something in its tangle hurts.",
    acts: [
      { kind: "attack", mult: 1.1, msg: "{e} ricochets off your head!" },
      { kind: "attack", mult: 0.8, msg: "{e} swats with a frazzled tail!" },
      { kind: "emotion", target: "self", emotion: "grumpy", msg: "{e} gets itself even more worked up!" },
    ],
    calmNeed: 2,
    reach: [
      { label: "Untangle a line", good: true, text: "You gently pull one loose line free. Scribbles untenses, just a little." },
      { label: "Hum softly", good: true, text: "You hum. The tangle slows its vibrating to listen." },
      { label: "Poke it", good: false, text: "You poke the tangle. Your finger gets stuck. Everyone is upset." },
    ],
    peaceText: "Scribbles unravels into one long, relieved line, then curls up into a tidy ball of yarn and rolls off, purring.",
    reward: { item: "juice" },
  },
  thornbud: {
    name: "Thornbud", img: "en_thornbud",
    hp: 44, atk: 13, def: 8, spd: 4, emotion: "grumpy",
    intro: "Thornbud refuses to bloom. It glares at you, arms crossed.",
    acts: [
      { kind: "attack", mult: 1.2, msg: "{e} flings a fistful of thorns!" },
      { kind: "defend", msg: "{e} curls its petals tighter." },
      { kind: "emotion", target: "player", emotion: "grumpy", msg: "{e} grumbles something so rude you can't help getting mad." },
    ],
    calmNeed: 2,
    reach: [
      { label: "Compliment its thorns", good: true, text: "\"Those are excellent thorns,\" you say. Thornbud pretends not to care. Its petals loosen slightly." },
      { label: "Water it", good: true, text: "You share your juice box. Thornbud drinks angrily. Then less angrily." },
      { label: "Yank a petal", good: false, text: "You yank. OW. Bad idea for everyone involved." },
    ],
    peaceText: "Thornbud hmphs, turns away... and blooms when it thinks you can't see. It's a magnificent flower.",
    reward: { item: "cookie" },
  },
  buttoncrab: {
    name: "Clasp", img: "en_buttoncrab",
    hp: 40, atk: 12, def: 9, spd: 7, emotion: "gloomy",
    intro: "Clasp scuttles sideways, trailing loose threads. It's coming unsewn.",
    acts: [
      { kind: "attack", mult: 1.0, msg: "{e} pinches with a safety-pin claw!" },
      { kind: "defend", msg: "{e} hides under its button." },
      { kind: "attack", mult: 1.3, msg: "{e} panics and does a spinning pinch attack!" },
    ],
    calmNeed: 2,
    reach: [
      { label: "Sew the loose thread", good: true, text: "You tuck the loose thread back through a buttonhole. Clasp sighs with its whole shell." },
      { label: "Wave hello", good: true, text: "You wave. Clasp waves back with both claws, then gets embarrassed." },
      { label: "Snip the thread", good: false, text: "NO. WRONG. Clasp clutches its unraveling side, horrified." },
    ],
    peaceText: "Clasp, freshly mended, does a happy sideways dance and burrows into the felt sand.",
    reward: { item: "juice" },
  },
  inklet: {
    name: "Inklet", img: "en_inklet",
    hp: 34, atk: 11, def: 4, spd: 8, emotion: "gloomy",
    intro: "A little blob of the Smudge... but it's reaching up at you. It just wants to be held.",
    acts: [
      { kind: "attack", mult: 1.0, msg: "{e} splashes cold ink on you!" },
      { kind: "emotion", target: "player", emotion: "gloomy", msg: "{e} looks up at you. Its eyes are so empty it makes your chest hurt." },
      { kind: "idle", msg: "{e} wobbles. A single drop rolls down its side." },
    ],
    calmNeed: 2,
    reach: [
      { label: "Pick it up", good: true, text: "It's freezing cold. You hold it anyway. It gets a little warmer." },
      { label: "Show it a doodle", good: true, text: "You draw a tiny sun and show it. The Inklet presses against the drawing." },
      { label: "Shoo it", good: false, text: "It doesn't leave. It just droops." },
    ],
    peaceText: "The Inklet glows faintly from inside, turns a deep friendly blue, and hops away leaving tiny flower-shaped ink prints.",
    reward: { item: "cookie" },
  },

  // ------------------------------------------------------------- bosses
  tangle: {
    name: "TANGLE", img: "boss_tangle", boss: true,
    hp: 105, atk: 15, def: 6, spd: 9, emotion: "grumpy",
    intro: "TANGLE roars like a scribbled-out sentence. Every angry word ever left unsaid, wadded into one.",
    acts: [
      { kind: "attack", mult: 1.2, msg: "{e} lashes out with a whip of jagged lines!" },
      { kind: "attack", mult: 0.9, targets: "all", msg: "{e} rains snapped pencil points on everyone!" },
      { kind: "emotion", target: "player", emotion: "grumpy", msg: "{e} shrieks words that aren't words. Your ears burn. Your fists clench." },
      { kind: "emotion", target: "self", emotion: "grumpy", msg: "{e} winds itself tighter and TIGHTER." },
    ],
    calmNeed: 3,
    reach: [
      { label: "\"I'm listening.\"", good: true, text: "The scribbles slow. Somewhere inside, something is trying to talk." },
      { label: "Find the loose end", good: true, text: "You spot one trembling line sticking out, and hold it steady." },
      { label: "Breathe with it", good: true, text: "You breathe in... and out. Slow. The scribbles start to match your rhythm without meaning to." },
      { label: "Yell back", good: false, text: "You yell. It yells LOUDER. This is going nowhere." },
    ],
    peaceText: "The scribbles loosen, breathe out, and settle into a page of neat, calm handwriting. It almost looks like an apology.",
    winText: "TANGLE frays apart into drifting pencil shavings. The angry words are quiet now, one way or another.",
  },
  swan: {
    name: "THE PAPER SWAN", img: "boss_swan", boss: true,
    hp: 125, atk: 17, def: 9, spd: 7, emotion: "gloomy",
    intro: "The Paper Swan bows its creased neck. It guards its crumpled wing the way you guard a memory that hurts.",
    acts: [
      { kind: "attack", mult: 1.1, msg: "{e} slices the air with a razor-fold wing!" },
      { kind: "emotion", target: "player", emotion: "gloomy", msg: "{e} sings one low paper note. It sounds like missing someone." },
      { kind: "attack", mult: 1.4, msg: "{e} dives in a rush of torn feathers!" },
      { kind: "defend", msg: "{e} folds itself smaller, hiding the crumpled wing." },
    ],
    calmNeed: 3,
    reach: [
      { label: "Smooth a crease", good: true, text: "You smooth one crease with your thumb. The Swan shivers but lets you." },
      { label: "\"It still flies?\"", good: true, text: "You ask about the crumpled wing. The Swan lifts it, trembling. It does. Differently, but it does." },
      { label: "Sing to her", good: true, text: "You sing the fireflies' little tune, off-key. The Swan's folded neck lifts, remembering the words." },
      { label: "Look away", good: false, text: "You can't look at the broken part. The Swan folds it out of sight. Nothing gets better." },
    ],
    peaceText: "The Swan unfolds - all the way, fearlessly - and refolds itself around its dents. It flies. Crooked and beautiful.",
    winText: "The Swan comes apart into clean white sheets that drift down like snow. On one of them, a child has drawn two kids on swings.",
  },
  keeper: {
    name: "THE BELL KEEPER", img: "boss_keeper", boss: true,
    hp: 150, atk: 18, def: 10, spd: 6, emotion: "neutral",
    intro: "The Bell Keeper holds up a small silver bell. When it rings, you flinch before you even know why.",
    acts: [
      { kind: "attack", mult: 1.2, msg: "{e} strikes with a stiff porcelain hand!" },
      { kind: "bell", msg: "{e} rings the little bell. RING-RING. The sound goes through you like cold water." },
      { kind: "attack", mult: 1.0, targets: "all", msg: "{e} sweeps its lantern beam across everyone!" },
      { kind: "emotion", target: "player", emotion: "gloomy", msg: "{e} looks at you with painted eyes full of sorry." },
    ],
    calmNeed: 3,
    reach: [
      { label: "Listen to the bell", good: true, text: "You make yourself listen, all the way to the end of the ring. It's just a bell. It was always just a bell." },
      { label: "\"It wasn't the bell's fault.\"", good: true, text: "The Keeper's cracked face tilts. Its grip on the bell softens." },
      { label: "Hold its gloved hand", good: true, text: "You take the stiff porcelain hand. It's cold, then a little less cold. Nobody blames a hand for ringing a warning." },
      { label: "Cover your ears", good: false, text: "You cover your ears. The ringing gets louder INSIDE." },
    ],
    peaceText: "The Bell Keeper kneels and offers you the bell. It's tiny in your hand. It rings once, clear and harmless, like a bicycle passing safely by.",
    winText: "The Keeper bows, cracks spreading, and comes apart into white sand. The little bell lands softly on top. It doesn't ring.",
  },
  smudge: {
    name: "THE SMUDGE", img: "boss_smudge", boss: true, final: true,
    hp: 999, atk: 16, def: 99, spd: 1, emotion: "neutral",
    immune: true, // attacks are soaked; only Reach Out works
    intro: "The Smudge rises like a wave that never crashes. Deep inside it, someone unfinished is reaching out.",
    acts: [
      { kind: "attack", mult: 0.9, targets: "all", msg: "Cold ink washes over everyone. It doesn't hate you. That's the worst part." },
      { kind: "emotion", target: "player", emotion: "gloomy", msg: "The ink whispers with your own voice: \"It was your fault.\"" },
      { kind: "idle", msg: "The Smudge waits. It has all the time you refuse to spend." },
    ],
    calmNeed: 3,
    reachStory: true, // options unlock from collected pages, in order
    reach: [
      { label: "Remember the fort", good: true, page: 1, text: "The fairy lights. The flashlight. Two kids drawing one world. The ink flinches from the warmth of it." },
      { label: "Remember the swings", good: true, page: 2, text: "The sky. The swan-shaped cloud. Ren yelling \"WE'RE FLYING!\" The ink thins. The outline inside is clearer now." },
      { label: "Say the true thing", good: true, page: 3, text: "\"I said it should've been you who moved away. I didn't mean it. I'm sorry. I'M SORRY.\" The ink goes still." },
    ],
    peaceText: "The Smudge doesn't shatter. It settles - like ink finally drying - into the shape of the last page. Waiting for an ending.",
    winText: "",
  },
};

export const TROOPS = {
  t_sniffle: ["sniffle"],
  t_scribble: ["scribble"],
  t_meadow_pair: ["sniffle", "scribble"],
  t_thornbud: ["thornbud"],
  t_woods_pair: ["thornbud", "sniffle"],
  t_crab: ["buttoncrab"],
  t_bay_pair: ["buttoncrab", "scribble"],
  t_inklet: ["inklet"],
  t_inklet_pair: ["inklet", "inklet"],
  t_boss_tangle: ["tangle"],
  t_boss_swan: ["swan"],
  t_boss_keeper: ["keeper"],
  t_boss_smudge: ["smudge"],
};
