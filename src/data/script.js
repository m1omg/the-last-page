// script.js — every cutscene, interaction and story beat in the game.
//
// Command reference (executed by src/cutscene.js):
//   { t:"say", who, face, text }        dialogue line (who: mira|biscuit|wisp|ren|name string|null)
//   { t:"choice", options:[{label, then:[]}] }
//   { t:"if", flag, is, then:[], else:[] }
//   { t:"iflt", key, value, then:[], else:[] }   numeric state compare (state[key] < value)
//   { t:"flag", key, value }
//   { t:"give", item, n }  { t:"take", item, n }
//   { t:"sfx", name }  { t:"bgm", name }  { t:"stopbgm" }
//   { t:"fade", ms }  { t:"unfade", ms }  { t:"wait", ms }
//   { t:"tp", map, x, y, facing }
//   { t:"battle", troop, flagWin, onWin:[], onPeace:[], canFlee }
//   { t:"cg", img, lines:[] }
//   { t:"heal" }  { t:"join", member }  { t:"page", n }
//   { t:"save" }  { t:"ending", which }  { t:"shake", ms }

const n = (text) => ({ t: "say", who: null, text });
const mira = (face, text) => ({ t: "say", who: "mira", face, text });
const say = (who, text) => ({ t: "say", who, text });

export const SCRIPTS = {
  // ================================================================ INTRO
  s_intro: [
    { t: "fade", ms: 1 },
    { t: "bgm", name: "bgm_real" },
    { t: "unfade", ms: 2000 },
    n("Tuesday. Or Wednesday. The days have stopped introducing themselves."),
    n("Mira's room used to be the loudest place in the building.\nNow the loudest thing in it is the refrigerator downstairs."),
    mira("neutral", "...I'm going to bed."),
    n("(Move with ARROW KEYS or WASD. Press Z or ENTER to look at things.\nThe bed is the way out of today.)"),
  ],
  s_bed: [
    { t: "if", flag: "intro_done", is: true, then: [
      n("The blankets are still warm. The Sketchbook World is waiting on the other side."),
      { t: "choice", options: [
        { label: "Go to sleep", then: [
          { t: "sfx", name: "sfx_page" },
          { t: "fade", ms: 1200 },
          { t: "stopbgm" },
          { t: "wait", ms: 700 },
          { t: "tp", map: "blank_page", x: 9, y: 8, facing: "down" },
          { t: "unfade", ms: 1200 },
        ] },
        { label: "Not yet", then: [] },
      ] },
    ], else: [
      n("You crawl under the covers and squeeze your eyes shut.\nYou know the trick by now. You breathe in... and count backwards from the accident."),
      { t: "flag", key: "intro_done", value: true },
      { t: "sfx", name: "sfx_page" },
      { t: "fade", ms: 1500 },
      { t: "stopbgm" },
      { t: "wait", ms: 800 },
      { t: "tp", map: "blank_page", x: 9, y: 8, facing: "down" },
      { t: "unfade", ms: 1500 },
    ] },
  ],
  s_desk: [
    { t: "if", flag: "intro_done", is: true, then: [
      n("The real sketchbook. The one with two names on the cover.\nYou still can't open it. Not out here."),
    ], else: [
      n("Your desk. A sketchbook lies on it, closed.\nThere's a sticker on the cover: two stick figures holding one giant crayon.\nYou look away fast, like it's bright."),
    ] },
  ],
  s_window: [
    n("Three floors down, the street does street things.\nSomewhere past the rooftops is the hospital. You can't see it from here.\nYou've checked."),
  ],
  s_shelf: [
    n("Comics, a dried-out slime, a swimming trophy for 'participation'.\nAnd a gap where the walkie-talkie used to be. Ren has the other one."),
  ],
  s_picture: [
    { t: "if", flag: "interlude2", is: true, then: [
      n("The pencil drawing above the bed: a tree with a little house in its branches.\nRen drew the tree. You drew the house. You look at it properly for the\nfirst time in weeks, and it looks back, patient as ever."),
    ], else: [
      n("A drawing hangs above the bed - a tree with a tiny house in it.\nThe treehouse you two were absolutely, definitely going to build someday.\nYou keep meaning to take it down. You keep not doing it."),
    ] },
  ],
  s_chair_desk: [
    n("Your drawing chair. One leg is shorter than the others, so it rocks\nwhen you lean into a good line. Ren called it 'the metronome'."),
  ],
  s_bedroom_exit: [
    { t: "if", flag: "true_ending_walk", is: true, then: [
      { t: "fade", ms: 600 }, { t: "tp", map: "real_hall", x: 12, y: 2, facing: "down" }, { t: "unfade", ms: 600 },
    ], else: [
      { t: "if", flag: "intro_done", is: true, then: [
        { t: "fade", ms: 600 }, { t: "tp", map: "real_hall", x: 12, y: 2, facing: "down" }, { t: "unfade", ms: 600 },
      ], else: [
        n("It's late. There's nothing out there tonight except a hallway\nthat still has both your shoe prints by the door."),
      ] },
    ] },
  ],

  // ================================================================ REAL HALL
  s_hall_to_bedroom: [
    { t: "fade", ms: 600 }, { t: "tp", map: "real_bedroom", x: 9, y: 12, facing: "up" }, { t: "unfade", ms: 600 },
  ],
  s_mom_door: [
    n("Mom's door, closed soft as a held breath.\nYou can hear the radio murmuring inside - she leaves it on\nso the apartment won't sound so empty."),
  ],
  s_hall_leftpic: [
    n("A framed drawing of a house with too many windows.\nYou made it when you were six. Mom framed it like it was art.\nIt is art, she'd say. Don't argue with the curator."),
  ],
  s_halfwall_pic: [
    n("A tiny frame on the half-wall: a pressed four-leaf clover.\nRen found it. Ren gave it away, same second, no hesitation.\nThat's just how Ren is. ...Is. You make yourself think IS."),
  ],
  s_teatable: [
    n("Two cups and a teapot, set out from force of habit.\nNobody drank from either."),
  ],
  s_fridge: [
    n("The fridge hums its one long note. Inside: a casserole from a neighbour,\nlabelled with a date, untouched. Ren's chocolate milk, also untouched.\nNobody has been able to throw it out."),
  ],
  s_kitchen: [
    { t: "if", flag: "interlude2", is: true, then: [
      n("A plate under plastic wrap, with a note in Mom's fast handwriting:\n'Ate at work. There's soup. I love you. We're okay.'\nThe 'we're okay' is underlined twice, like she's convincing both of you."),
    ], else: [
      n("The kettle is cold. Mom's shift ends after midnight again.\nThe fridge hums its one long note."),
    ] },
  ],
  s_sofa: [
    { t: "if", flag: "interlude3", is: true, then: [
      n("Mom fell asleep on the sofa in her coat, phone still in her hand.\nYou put the blanket over her. She doesn't wake up.\nShe smells like hospitals. She was THERE. Visiting. Without you."),
      mira("gloomy", "...night, Mom."),
    ], else: [
      n("The sofa cushion still dips on the left, where two people used to\nfight over one bag of chips during movie night."),
    ] },
  ],
  s_photos: [
    { t: "if", flag: "interlude1", is: true, then: [
      n("You make yourself look this time.\nSchool fair. You and Ren, gap-toothed, holding a papier-mache volcano.\nSecond place. You both cried, then laughed about crying."),
      mira("gloomy", "...we were going to build a better one."),
    ], else: [
      n("Framed photos on the wall. Your eyes slide off them on purpose.\nLooking means remembering, and remembering has rules now."),
    ] },
  ],
  s_front_door: [
    { t: "if", flag: "true_ending_walk", is: true, then: [
      n("Your shoes. Your jacket. The door.\nIt's just a door. It was always just a door."),
      { t: "choice", options: [
        { label: "Go outside", then: [
          { t: "sfx", name: "sfx_door" },
          { t: "fade", ms: 1000 },
          { t: "tp", map: "real_street", x: 9, y: 11, facing: "up" },
          { t: "unfade", ms: 1400 },
        ] },
        { label: "Breathe first", then: [ mira("neutral", "One more breath. Okay.") ] },
      ] },
    ], else: [
      { t: "if", flag: "interlude3", is: true, then: [
        n("A letter sits by the door, opened and read many times. From Ren's parents.\n'...visitors help, the doctors say. He'd want it to be you, Mira.'"),
        mira("gloomy", "...I can't. What if he wakes up and remembers what I said?"),
        n("The letter doesn't answer. Letters never do."),
      ], else: [
        n("The front door. Outside is school, and pity-faces, and the corner where\nyou're not allowed to think about what happened.\nYou haven't gone out there without Mom in weeks."),
      ] },
    ] },
  ],

  // ================================================================ BLANK PAGE
  s_blank_first: [
    { t: "bgm", name: "bgm_blank" },
    n("You land softly, the way you only land in dreams."),
    n("THE BLANK PAGE.\nIt goes on forever in every direction. Paper-white. Quiet as held breath."),
    { t: "if", flag: "blank_intro_done", is: true, then: [], else: [
      mira("neutral", "Okay. Same as every night. Lamp's here, cushion's here...\nWorld's still here."),
      say("???", "MIIIIIRAAAA!!"),
      n("Something small and white barrels across the page and skids to a stop:\na tissue ghost, dripping everywhere."),
      { t: "battle", troop: "t_sniffle", tutorial: true, flagWin: "blank_tut",
        onPeace: [ n("Sniffle bounces away across the page, leaving little wet dots... but it looked back at you twice. Something is scaring the doodles.") ],
        onWin: [ n("The little ghost comes apart into clean tissue squares. You feel bad. It was only scared - something in this world is scaring everything.") ] },
      mira("neutral", "The doodles never used to fight. Something's wrong with the Page."),
      n("Far to the south, where the paper darkens, a door-shaped smudge has appeared.\nIt wasn't there last night."),
      mira("gloomy", "...and THAT'S new. And bad. Definitely bad."),
      mira("neutral", "The Meadow first. If anyone knows what's going on, it's Sir Biscuit."),
      { t: "flag", key: "blank_intro_done", value: true },
      { t: "save" },
      n("(The warm lamp is a SAVE POINT. Doors lead to the drawn worlds.\nPress X or ESC for your pocket menu.)"),
    ] },
  ],
  s_lantern_save: [
    n("The little lamp glows like it's pleased to see you."),
    { t: "choice", options: [
      { label: "Rest and save", then: [
        { t: "heal" }, { t: "sfx", name: "sfx_save" }, { t: "save" },
        n("Warmth soaks into everyone's paper bones. Saved."),
      ] },
      { label: "Just warm your hands", then: [ n("Toasty.") ] },
    ] },
  ],
  s_cushion: [ n("The cushion has one job and it does it magnificently.") ],
  s_crayons: [ n("Someone's crayons, dropped mid-drawing. The sun-yellow one is missing.") ],
  s_to_meadow: [
    { t: "fade", ms: 600 }, { t: "sfx", name: "sfx_door" },
    { t: "tp", map: "meadow_1", x: 9, y: 12, facing: "up" }, { t: "unfade", ms: 600 },
  ],
  s_to_woods: [
    { t: "iflt", key: "pages", value: 1, then: [
      n("The blue paper door is folded shut, tight as a secret.\nA note in crayon: 'STUCK. SMUDGE JAMMED THE FOLDS. - management'"),
      mira("neutral", "The Meadow first, then."),
    ], else: [
      { t: "fade", ms: 600 }, { t: "sfx", name: "sfx_door" },
      { t: "tp", map: "woods_1", x: 9, y: 12, facing: "up" }, { t: "unfade", ms: 600 },
    ] },
  ],
  s_to_bay: [
    { t: "iflt", key: "pages", value: 2, then: [
      n("The yellow door is swollen shut with ink. Through the keyhole you can\nhear the sea, going shhh, shhh, like it's comforting someone."),
    ], else: [
      { t: "fade", ms: 600 }, { t: "sfx", name: "sfx_door" },
      { t: "tp", map: "bay_1", x: 9, y: 12, facing: "up" }, { t: "unfade", ms: 600 },
    ] },
  ],
  s_to_depths: [
    { t: "iflt", key: "pages", value: 3, then: [
      n("The smudged door breathes cold on your face.\nIt isn't locked. It's just... more door than you can open yet."),
      mira("gloomy", "Not yet. I'm not... we're not ready. The pages. We need the pages."),
    ], else: [
      mira("neutral", "...Ready?"),
      say("biscuit", "Born ready. Baked ready, technically."),
      say("wisp", "I-I'll light the way. That's the one thing I know how to do."),
      { t: "fade", ms: 900 }, { t: "sfx", name: "sfx_static" },
      { t: "tp", map: "depths_1", x: 9, y: 12, facing: "up" }, { t: "unfade", ms: 900 },
    ] },
  ],

  // ================================================================ MEADOW
  s_meadow_to_blank: [
    { t: "fade", ms: 600 }, { t: "tp", map: "blank_page", x: 2, y: 7, facing: "right" }, { t: "unfade", ms: 600 },
  ],
  s_meadow_to_meadow2: [
    { t: "fade", ms: 600 }, { t: "tp", map: "meadow_2", x: 9, y: 12, facing: "up" }, { t: "unfade", ms: 600 },
  ],
  s_meadow2_to_meadow: [
    { t: "fade", ms: 600 }, { t: "tp", map: "meadow_1", x: 10, y: 1, facing: "down" }, { t: "unfade", ms: 600 },
  ],
  s_pond: [ n("The pond is one long blue spiral. The duck floats in the middle,\nsmiling the smile of someone who has never had a single problem.") ],
  s_smiley_flowers: [
    n("Three giant flowers grin down at you."),
    say("Flowers", "MIRA! MIRA! LOOK AT US! WE GREW!"),
    mira("giggly", "You grew SO much. Absolute units."),
    say("Flowers", "HEEHEE!!"),
    { t: "if", flag: "got_teacup", is: false, then: [
      say("Flowers", "OH! OH! ALSO! Something SHINY fell in the grass over by the big sun drawing! It goes ✨! We would fetch it but we are, you know. Planted."),
    ], else: [] },
  ],
  s_meadow_sign: [ n("The sign is blank. It's always been blank.\nRen said signs in dreams can't spell, so why embarrass them.") ],
  s_find_teacup: [
    { t: "sfx", name: "sfx_confirm" },
    n("Tucked in the tall grass: the CHIPPED TEACUP.\nDrawn with enormous care by someone whose hands were still learning."),
    { t: "give", item: "teacup" }, { t: "flag", key: "got_teacup", value: true },
  ],
  s_fight_sniffle: [
    { t: "battle", troop: "t_sniffle", flagWin: "meadow_en1" },
  ],
  s_fight_scribble: [
    { t: "battle", troop: "t_scribble", flagWin: "meadow_en2" },
  ],
  s_fight_meadow_pair: [
    { t: "battle", troop: "t_meadow_pair", flagWin: "meadow_en3" },
  ],
  s_cottage: [
    n("A cottage made of gingerbread, with icing gutters and a doorbell that\nplays a little fanfare. It smells like Christmas that never has to end."),
  ],
  s_picnic: [
    { t: "if", flag: "biscuit_joined", is: true, then: [
      { t: "if", flag: "meadow_boss_done", is: true, then: [
        n("The picnic blanket, saved. The teacups steam politely."),
      ], else: [
        { t: "ifhas", items: ["teacup", "cookieplate", "suncrayon"], then: [
          n("The tea party is set: teacup, cookies, and a freshly-drawn sun.\nAll that's missing is peace and quiet. The stain up north hisses."),
        ], else: [
          n("The great picnic blanket. Sir Biscuit's pride.\nIt looks wrong with the cups knocked over and the teapot hiding under a napkin."),
        ] },
      ] },
    ], else: [
      n("A picnic blanket with the cups knocked over.\nSomeone left in a hurry, or something arrived in one."),
    ] },
  ],
  s_meet_biscuit: [
    say("???", "HALT! Friend or... wait. WAIT. My eyes deceive me. MIRA OF THE TWO NAMES!"),
    n("A gingerbread knight thunders over, bottle-cap helmet askew, cape flapping."),
    say("biscuit", "You came BACK! The realm rejoices! I rejoice! The flowers already rejoiced, you probably heard them."),
    mira("giggly", "Hi, Sir Biscuit. You've got... jam? On your helmet?"),
    say("biscuit", "BATTLE JAM. Strawberry. Listen - dark tidings. A STAIN fell on the clearing three nights past, and it GROWS. It ate the gazebo. It ate the horseshoe pit. It growled at my cottage."),
    say("biscuit", "The doodles who touch it come back all wrong - crying, or scratching, or worse. I've been holding the line alone, but a knight without a party is just a cookie with anxiety."),
    mira("neutral", "Then let's fix it. Like we always fixed things."),
    say("biscuit", "THERE she is. Sir Biscuit of the Round Plate, at your service! Sword's a skewer, heart's a furnace, let's GO."),
    { t: "sfx", name: "sfx_victory" },
    { t: "join", member: "biscuit" },
    n("SIR BISCUIT joined the party!"),
    say("biscuit", "One thing first - the stain hates HAPPINESS. And nothing on this page is happier than a proper tea party. Fetch the old set, would you? The TEACUP is in the meadow grass. The COOKIE PLATE and the SUN CRAYON are around here somewhere."),
    { t: "flag", key: "biscuit_joined", value: true },
  ],
  s_find_plate: [
    { t: "sfx", name: "sfx_confirm" },
    n("Behind the daisies: the PLATE OF COOKIES. Drawn so lovingly\nyou can tell which cookie was meant to be whose."),
    { t: "give", item: "cookieplate" }, { t: "flag", key: "got_plate", value: true },
  ],
  s_find_crayon: [
    { t: "sfx", name: "sfx_confirm" },
    n("The SUN-YELLOW CRAYON, worn to a stub.\nEvery sun in this world came out of this crayon."),
    { t: "give", item: "suncrayon" }, { t: "flag", key: "got_crayon", value: true },
  ],
  s_meadow_stain: [
    { t: "if", flag: "biscuit_joined", is: false, then: [
      n("A blotch of gray ink spreads across the grass, hissing faintly.\nThe grass around it has gone colorless. You'd rather not touch it alone."),
    ], else: [
      { t: "ifhas", items: ["teacup", "cookieplate", "suncrayon"], then: [
        say("biscuit", "Tea's set! Sun's drawn! NOW, foul stain - behold what you're up against!"),
        n("You set the teacup, the plate, the little crayon sun.\nFor one second, the clearing remembers how to be warm."),
        n("The stain SCREAMS."),
        { t: "sfx", name: "sfx_static" }, { t: "shake", ms: 700 },
        n("It rears up off the grass, ink whirling into knots and knots into a shape -\nevery angry scribble ever scribbled, all at once."),
        { t: "battle", troop: "t_boss_tangle", boss: true, flagWin: "meadow_boss_done",
          onPeace: [
            say("biscuit", "...I'll be dipped in milk. You TALKED it down."),
            n("Where the stain was, a torn page lies in the clean grass."),
          ],
          onWin: [
            say("biscuit", "VICTORY! Sound the trumpets! ...I ate the trumpets. Sound the kazoo!"),
            n("Where the stain was, a torn page lies in the clean grass."),
          ] },
        { t: "page", n: 1 },
        { t: "cg", img: "cg_memory_1", lines: [
          "The page shows a blanket fort, drawn in crayon.",
          "Fairy lights. A flashlight. Two kids on their bellies, drawing one world into one sketchbook.",
          "You remember. It was raining that night. Ren invented Sir Biscuit and gave him YOUR laugh.",
          "\"When we're old,\" Ren said, \"like, twenty? We'll still do this.\"",
          "You pinky-swore. The fort held all night.",
        ] },
        mira("gloomy", "...I remember this. Why does remembering the GOOD one hurt?"),
        say("biscuit", "Because it's heavy, m'lady. Good memories are the heaviest things there are.\nThat's how you know they're real gold."),
        n("The world tilts. Morning is pulling on the edges of the dream..."),
        { t: "fade", ms: 1500 }, { t: "stopbgm" },
        { t: "flag", key: "interlude1", value: true },
        { t: "tp", map: "real_bedroom", x: 6, y: 6, facing: "down" },
        { t: "bgm", name: "bgm_real" },
        { t: "unfade", ms: 1500 },
        n("Wednesday. Or Thursday.\nBut for the first time in weeks, you look at the photos in the hall on purpose."),
        { t: "save" },
      ], else: [
        say("biscuit", "Steady! We charge AFTER tea is ready. Teacup, cookie plate, sun crayon - then we show this blot what it's dealing with."),
      ] },
    ] },
  ],

  // ================================================================ WOODS
  s_woods_to_blank: [
    { t: "fade", ms: 600 }, { t: "tp", map: "blank_page", x: 10, y: 2, facing: "down" }, { t: "unfade", ms: 600 },
  ],
  s_woods_to_woods2: [
    { t: "if", flag: "woods_candle_lit", is: true, then: [
      { t: "fade", ms: 600 }, { t: "tp", map: "woods_2", x: 9, y: 12, facing: "up" }, { t: "unfade", ms: 600 },
    ], else: [
      { t: "if", flag: "woods2_seen", is: true, then: [
        { t: "fade", ms: 600 }, { t: "tp", map: "woods_2", x: 9, y: 12, facing: "up" }, { t: "unfade", ms: 600 },
      ], else: [
        n("Past the trees the paper turns pitch dark - the deep woods.\nSomething big fell in there. The fireflies won't go near it."),
        { t: "flag", key: "woods2_seen", value: true },
        { t: "fade", ms: 600 }, { t: "tp", map: "woods_2", x: 9, y: 12, facing: "up" }, { t: "unfade", ms: 600 },
      ] },
    ] },
  ],
  s_creek: [ n("A creek of folded blue paper, going glug-glug in careful handwriting.\nThe stepping stones are flat and trustworthy.") ],
  s_fireflies: [
    n("Paper fireflies cluster in the dark like nervous punctuation."),
    say("Fireflies", "she won't sing... the swan won't sing... she folded her song away..."),
  ],
  s_fight_thornbud: [ { t: "battle", troop: "t_thornbud", flagWin: "woods_en1" } ],
  s_fight_woods_pair: [ { t: "battle", troop: "t_woods_pair", flagWin: "woods_en2" } ],
  s_woods2_to_woods: [
    { t: "fade", ms: 600 }, { t: "tp", map: "woods_1", x: 9, y: 1, facing: "down" }, { t: "unfade", ms: 600 },
  ],
  s_crane: [
    n("A giant origami crane lies on its side, creased where it fell.\nIt's breathing. Slowly. Cranes shouldn't have to breathe."),
  ],
  s_find_match: [
    { t: "sfx", name: "sfx_confirm" },
    n("Half-buried in paper leaves: the BRAVE MATCH.\nRen drew exactly one, 'for an emergency so big we'll know it when we see it.'"),
    { t: "give", item: "match" }, { t: "flag", key: "got_match", value: true },
  ],
  s_meet_wisp: [
    n("Behind the shrine, something small is trying very hard not to exist."),
    say("???", "eep. no. i'm not here. i'm a... a lamp. an off lamp."),
    mira("neutral", "Wisp. It's me."),
    say("wisp", "M-Mira?? Oh no. Oh good. Oh no. You can SEE me, that means the dark didn't eat the whole - I mean. Hello. Welcome to the woods. Everything is terrible."),
    say("wisp", "The big candle went out. I was SUPPOSED to keep it lit, it's the one thing I'm FOR, and the Smudge-wind came through and - and I hid. I hid, Mira."),
    mira("neutral", "Then we light it again. Together. That's allowed, you know - doing the scary thing WITH someone."),
    say("wisp", "...together counts? together counts. okay. okay!! I have exactly one flame and it's yours."),
    { t: "sfx", name: "sfx_victory" },
    { t: "join", member: "wisp" },
    n("WISP joined the party!"),
    say("wisp", "the big candle needs a real fire to start - my flame's too small alone. there's a match somewhere by the fallen crane. Ren drew it. for emergencies."),
    { t: "flag", key: "wisp_joined", value: true },
  ],
  s_shrine: [
    { t: "if", flag: "woods_boss_done", is: true, then: [
      n("The great candle burns steady. The tea-lights lean toward it like children\nat story time."),
    ], else: [
      { t: "if", flag: "wisp_joined", is: false, then: [
        n("A great white candle stands unlit in its paper alcove.\nSeven tiny tea-lights flicker around it, barely holding on.\nSomething whimpers behind the shrine."),
      ], else: [
        { t: "if", flag: "got_match", is: true, then: [
          say("wisp", "o-okay. the Brave Match. you strike it, I'll carry the flame up. together, right?"),
          { t: "choice", options: [
            { label: "Light the candle", then: [
              { t: "take", item: "match" },
              { t: "sfx", name: "sfx_emotion" },
              n("Scritch. The match flares. Wisp cups the flame like it's a baby bird,\nfloats up... and the great candle CATCHES."),
              { t: "flag", key: "woods_candle_lit", value: true },
              n("Light rolls through the woods like a warm tide. And on the tide's heels,\nsomething enormous and white descends into the clearing."),
              n("The Paper Swan. Queen of the Woods. She looks at the lit candle...\nand her creased eyes fill with something unbearable."),
              say("The Paper Swan", "WHO LIT IT? WHO DARES MAKE IT BRIGHT ENOUGH TO SEE WHAT I'VE BECOME?"),
              { t: "battle", troop: "t_boss_swan", boss: true, flagWin: "woods_boss_done",
                onPeace: [
                  say("wisp", "she's... flying. crooked-flying. that's still flying!!"),
                  n("A torn page flutters down from her wing as she rises."),
                ],
                onWin: [
                  say("wisp", "oh... oh, she's paper again. just paper. did we... was that saving her?"),
                  n("Among the drifting sheets, one torn page lands at your feet."),
                ] },
              { t: "page", n: 2 },
              { t: "cg", img: "cg_memory_2", lines: [
                "The page shows a playground, drawn in crayon.",
                "Two kids on swings, way too high, the chains almost slack at the top.",
                "Ren is STANDING on the seat, pointing at a cloud shaped exactly like a swan.",
                "\"THAT ONE'S GOING IN THE BOOK!\" - and it went in the book, that same day,",
                "as the Queen of the Woods. You drew the crown. Ren drew the wings.",
              ] },
              mira("gloomy", "She was ours. We made her brave and I... forgot her. I forgot the GOOD ones, Wisp."),
              say("wisp", "then... we're re-lighting those too. that's what remembering is. it's just re-lighting."),
              n("The woods blur. Morning is reaching in through the leaves..."),
              { t: "fade", ms: 1500 }, { t: "stopbgm" },
              { t: "flag", key: "interlude2", value: true },
              { t: "tp", map: "real_bedroom", x: 6, y: 6, facing: "down" },
              { t: "bgm", name: "bgm_real" },
              { t: "unfade", ms: 1500 },
              n("Thursday. Mom left a note under plastic wrap.\nYou read it twice, and put the second reading somewhere safe inside you."),
              { t: "save" },
            ] },
            { label: "Not yet", then: [ say("wisp", "o-okay. no rush. the dark's not going anywhere. that came out wrong.") ] },
          ] },
        ], else: [
          say("wisp", "the match! it's near the fallen crane, in the leaves. one match, one chance, zero pressure. AAAH."),
        ] },
      ] },
    ] },
  ],

  // ================================================================ BAY
  s_bay_to_blank: [
    { t: "fade", ms: 600 }, { t: "tp", map: "blank_page", x: 17, y: 7, facing: "left" }, { t: "unfade", ms: 600 },
  ],
  s_bay_to_bay2: [
    { t: "fade", ms: 600 }, { t: "tp", map: "bay_2", x: 9, y: 12, facing: "up" }, { t: "unfade", ms: 600 },
  ],
  s_bay2_to_bay: [
    { t: "fade", ms: 600 }, { t: "tp", map: "bay_1", x: 18, y: 9, facing: "left" }, { t: "unfade", ms: 600 },
  ],
  s_pier: [
    n("A little paper boat is tied to the pier, bobbing on the felt.\nIts name is painted on the side in nail polish: S.S. FRIEND SHIP.\nRen thought that was the funniest thing either of you had ever said."),
  ],
  s_stall: [
    say("Shell Stall", "shells! spools! sea-buttons! everything must go, on account of the sea being SCARED!"),
    n("The stall-keeper is a hermit crab in a knitted vest. It explains, in one\nlong sentence, that the lighthouse went dark, the Keeper went strange,\nand the waves have been whispering since."),
    { t: "if", flag: "bay_bulb_found", is: false, then: [
      say("Shell Stall", "the SPARE BULB? sold it! to the barrel! I mean it FELL in the barrel. the knitting barrel. by the bench. don't tell the needles."),
    ], else: [] },
  ],
  s_barrel: [
    { t: "if", flag: "bay_bulb_found", is: true, then: [
      n("The knitting needles rattle smugly. They have no further bulbs to declare."),
    ], else: [
      n("You reach carefully past the knitting needles..."),
      { t: "sfx", name: "sfx_confirm" },
      n("Got it! The BRIGHT BULB - big as your head, warm as a fresh bun."),
      { t: "give", item: "bulb" }, { t: "flag", key: "bay_bulb_found", value: true },
    ] },
  ],
  s_bench: [ n("The bench faces the sea. Two names are scratched under the armrest.\nYou don't need to look to know whose.") ],
  s_fight_crab: [ { t: "battle", troop: "t_crab", flagWin: "bay_en1" } ],
  s_fight_bay_pair: [ { t: "battle", troop: "t_bay_pair", flagWin: "bay_en2" } ],
  s_fight_bay_pair2: [ { t: "battle", troop: "t_bay_pair", flagWin: "bay_en3" } ],
  s_keeper_cottage: [
    n("A small round cottage with a felt roof, tucked in beside the lighthouse.\nSocks on the line. Firewood stacked in a painfully straight pile."),
    n("The little blue door is shut, but not locked.\nIt has the look of a door that is never locked, just in case."),
    mira("neutral", "...Somebody lives here. Or waits here. I can't tell which."),
  ],
  s_enter_keeper_home: [
    { t: "sfx", name: "sfx_door" },
    { t: "fade", ms: 600 },
    { t: "tp", map: "keeper_home", x: 9, y: 12, facing: "up" },
    { t: "unfade", ms: 700 },
  ],
  s_keeper_exit: [
    { t: "sfx", name: "sfx_door" },
    { t: "fade", ms: 600 },
    { t: "tp", map: "bay_2", x: 15, y: 9, facing: "down" },
    { t: "unfade", ms: 700 },
  ],
  s_keeper_home_enter: [
    { t: "if", flag: "keeper_home_seen", is: true, then: [], else: [
      n("Inside, everything is put away.\nNot tidy the way a home is tidy - tidy the way a room is tidy\nwhen someone has been cleaning it instead of sleeping."),
      { t: "flag", key: "keeper_home_seen", value: true },
    ] },
  ],
  s_keeper_stove: [
    n("A little iron stove, swept out and laid with fresh kindling,\nready to light. The kettle is filled. Everything is ready."),
    n("Nothing has been lit in a long, long time."),
  ],
  s_keeper_window: [
    n("A round window of button-glass. Through it: the lighthouse,\nand past the lighthouse, the whole grey sea."),
    n("Whoever sat here sat facing the water. Waiting for something to come back."),
  ],
  s_keeper_table: [
    n("On the table, laid out in a perfect row: a tin of polish,\nand a soft cloth folded into a neat little square."),
    n("The cloth is worn thin in one spot, about the size of a small bell."),
    { t: "if", flag: "bay_boss_done", is: true, then: [
      mira("gloomy", "He polished it every single day. Like if he kept it bright enough,\nthe sound would stop meaning what it means."),
    ], else: [
      mira("neutral", "Somebody polishes something here. Every day, by the look of it."),
    ] },
  ],
  s_keeper_photo: [
    n("A small framed photograph: the lighthouse, lit, on a blue afternoon.\nIt has been dusted so often the frame's corners have gone pale."),
    n("There's writing on the back, pressed against the glass, backwards\nand barely readable: 'IT WASN'T YOUR FAULT.'"),
    n("Written in someone else's handwriting. Kept where he'd have to turn it over\nto read it."),
    { t: "if", flag: "bay_boss_done", is: true, then: [
      mira("gloomy", "...somebody told him. He just never turned it over."),
      say("wisp", "s-some things you have to hear from inside, not outside."),
      mira("gloomy", "Yeah. ...Yeah, I know."),
    ], else: [] },
  ],
  s_keeper_chair: [
    n("One chair, pulled out just slightly, as if its owner meant to sit back down."),
  ],
  s_keeper_bed: [
    n("A narrow bed, made so tightly you could bounce a button off it.\nThe pillow has no dent in it at all."),
    { t: "if", flag: "bay_boss_done", is: true, then: [
      say("biscuit", "...He hasn't slept, m'lady. Not once. Not since."),
    ], else: [] },
  ],
  s_keeper_boots: [
    n("A pair of boots by the door, set side by side, toes pointing out.\nPointing at the door. Ready to go out."),
    n("They haven't moved in years."),
  ],
  s_telescope: [
    n("Through the telescope: felt waves to the horizon.\nAnd stitched into the horizon in tiny thread, almost invisible: 'come back'."),
  ],
  s_lighthouse: [
    { t: "if", flag: "bay_boss_done", is: true, then: [
      n("The lighthouse beam sweeps the felt sea, steady as a heartbeat.\nThe buttons below bob in it like they're dancing."),
    ], else: [
      { t: "if", flag: "bay_bulb_found", is: true, then: [
        n("You climb the spiral of thread to the lantern room and screw in\nthe Bright Bulb. It hums... and BLAZES."),
        { t: "sfx", name: "sfx_emotion" }, { t: "shake", ms: 500 },
        n("Light sweeps the bay - and catches, at the cliff's edge, a stiff figure\nin a navy coat, holding something small and silver."),
        say("???", "...ring... ring..."),
        n("The Bell Keeper turns. Its cracked porcelain face is wet."),
        say("The Bell Keeper", "I RANG IT. I RANG AND RANG AND NOBODY STOPPED. IF THE LIGHT COMES BACK, EVERYONE WILL SEE THAT IT WAS ME."),
        { t: "battle", troop: "t_boss_keeper", boss: true, flagWin: "bay_boss_done",
          onPeace: [
            n("The Keeper stands in the sweeping light, holding the bell OUT instead of UP,\nlike returning something borrowed too long."),
          ],
          onWin: [
            n("The light sweeps over white sand where the Keeper stood.\nThe little bell sits on top, finally quiet."),
          ] },
        n("On the lighthouse steps, pinned under the bell: a torn page."),
        { t: "page", n: 3 },
        { t: "cg", img: "cg_memory_3", lines: [
          "The page is ripped down the middle and taped back wrong, so the two kids",
          "face away from each other forever.",
          "You remember the fight. It was about NOTHING - a move across town,",
          "a canceled sleepover, a stupid Tuesday.",
          "You remember exactly what you said, because you aimed it:",
          "\"I wish it was YOU who was leaving.\"",
          "Ren grabbed the sketchbook and ran. Out the door. Down the stairs.",
          "Toward the crosswalk.",
        ] },
        mira("gloomy", "...it was me. The last thing Ren heard from me was THAT."),
        say("biscuit", "M'lady..."),
        mira("gloomy", "Don't. Please. Just... morning's coming. I can feel it."),
        { t: "fade", ms: 1800 }, { t: "stopbgm" },
        { t: "flag", key: "interlude3", value: true },
        { t: "tp", map: "real_bedroom", x: 6, y: 6, facing: "down" },
        { t: "bgm", name: "bgm_real" },
        { t: "unfade", ms: 1800 },
        n("Friday. There's a letter by the front door, read soft at the folds.\nMom is asleep on the sofa in her coat."),
        { t: "save" },
      ], else: [
        n("The lantern room is dark. The socket is empty - somebody took the bulb,\nor hid it. The whole bay squints without it."),
      ] },
    ] },
  ],

  // ================================================================ DEPTHS
  s_depths_to_blank: [
    { t: "fade", ms: 600 }, { t: "tp", map: "blank_page", x: 10, y: 12, facing: "up" }, { t: "unfade", ms: 600 },
  ],
  s_depths_to_depths2: [
    { t: "fade", ms: 900 }, { t: "sfx", name: "sfx_heartbeat" },
    { t: "tp", map: "depths_2", x: 10, y: 12, facing: "up" }, { t: "unfade", ms: 1200 },
  ],
  s_sunken_doodles: [
    n("Half-sunk in the ink: flowers, houses, a dog with three tails.\nEverything you two ever drew and forgot. It's all HERE, drowning quietly."),
    say("wisp", "...it keeps what we stop looking at. that's what the Smudge IS, maybe.\neverything left unfinished, all pooled up."),
  ],
  s_fight_inklet: [ { t: "battle", troop: "t_inklet", flagWin: "depths_en1" } ],
  s_fight_inklet_pair: [ { t: "battle", troop: "t_inklet_pair", flagWin: "depths_en2" } ],
  s_depths2_enter: [
    { t: "if", flag: "smudge_done", is: true, then: [], else: [
      { t: "stopbgm" },
      n("The ink here is perfectly still.\nUnder its surface, enormous and faint, someone half-drawn is waiting."),
      { t: "sfx", name: "sfx_heartbeat" },
      n("On the clean island in the center, one torn page lies alone.\nThe last one. You know it before you touch it."),
      { t: "page", n: 4 },
      { t: "cg", img: "cg_memory_4", lines: [
        "Rain. The crosswalk. The sketchbook open on the wet asphalt,",
        "its colors bleeding out like the day itself.",
        "You were half a block behind, yelling \"WAIT - I DIDN'T MEAN IT -\"",
        "Ren turned around in the middle of the road to yell something back.",
        "You never got to hear it.",
        "The bell. The brakes. The quiet after.",
        "The doctors say Ren is sleeping. That sleeping people sometimes hear us.",
        "You haven't gone. You haven't said anything for them to hear.",
      ] },
      mira("gloomy", "..."),
      say("biscuit", "Mira. Whatever rises out of that ink... we're standing with you. Both sides of you."),
      say("wisp", "l-lighting the way. together counts. together ALWAYS counts."),
      { t: "bgm", name: "bgm_depths" },
    ] },
  ],
  s_smudge_confront: [
    { t: "if", flag: "smudge_done", is: true, then: [
      n("The ink is drying into paper. The page is almost ready."),
    ], else: [
      n("You step onto the clean island. The ink rises around it, slow as a held sob,\ninto a wave that does not crash."),
      { t: "sfx", name: "sfx_static" }, { t: "shake", ms: 900 },
      { t: "battle", troop: "t_boss_smudge", boss: true, final: true, flagWin: "smudge_done",
        onPeace: [] },
      { t: "stopbgm" },
      n("The ink settles. Where the wave stood, the world is a single page:\nthe LAST PAGE, blank, with room for exactly one ending."),
      n("And on the page's far edge, drawn in gray pencil, unfinished,\nsomeone is sitting. Waiting. Like they've waited all along."),
      say("ren", "...hey, doofus. Took you long enough."),
      mira("gloomy", "REN?! You're - are you-"),
      say("ren", "I'm the you-half of Ren. The half you carry. The real one's doing the\nhard part somewhere brighter. Hospitals, beeping, gross jello. You know."),
      say("ren", "I heard it, by the way. The thing you yelled after me in the rain.\nThe 'I didn't mean it.' I was turning around to say I KNOW, YOU POTATO."),
      mira("gloomy", "...you turned around because of me. If I hadn't-"),
      say("ren", "If-hadn'ts drown pages, Mira. Look around. This whole sea is if-hadn'ts."),
      say("ren", "One page left. OUR book. So - how does the story end?"),
      { t: "choice", options: [
        { label: "Finish the story. Then go say it for real.", then: [
          say("ren", "...yeah. YEAH. Okay. You draw, I'll talk. Like always."),
          n("You draw until your hand aches. Sir Biscuit gets a statue. Wisp gets\na constellation. The Swan gets the whole sky."),
          n("And on the very last line, you write the ending you choose:\n'AND THEY FIXED WHAT THEY COULD, AND CARRIED WHAT THEY COULDN'T,\nAND THEY WERE FRIENDS FOREVER ANYWAY.'"),
          say("ren", "Go on, then. He's waiting. Tell him about the swan cloud - the real one\nnever heard that part."),
          say("biscuit", "Our lady of Two Names... it was the honor of my crust."),
          say("wisp", "we'll keep the lights on. for whenever you visit. dreams stay, you know."),
          mira("gloomy", "I'll visit. Both of you. All of you. I promise."),
          { t: "flag", key: "chose_true", value: true },
          { t: "fade", ms: 2500 },
          { t: "ending", which: "true" },
        ] },
        { label: "Stay here. Where it never happened.", then: [
          say("ren", "...you sure? It's nice here. It's ALWAYS nice here. That's kind of the problem."),
          mira("neutral", "Just for a while. Just until it stops hurting."),
          say("ren", "Mira. It stops hurting BY going. That's the trick nobody likes.\n...but okay. A while. I'll put the kettle on."),
          { t: "flag", key: "chose_page", value: true },
          { t: "fade", ms: 2500 },
          { t: "ending", which: "page" },
        ] },
      ] },
    ] },
  ],

  // ================================================================ ENDINGS
  s_ending_true: [
    { t: "bgm", name: "bgm_ending" },
    { t: "flag", key: "true_ending_walk", value: true },
    { t: "tp", map: "real_bedroom", x: 6, y: 6, facing: "down" },
    { t: "unfade", ms: 2000 },
    n("Saturday. Actual, confirmed Saturday - you checked.\nThe sketchbook is in your backpack. Your shoes are by the door."),
    n("(Walk to the front door.)"),
  ],
  s_enter_hospital: [
    { t: "fade", ms: 1000 },
    { t: "tp", map: "hospital_room", x: 10, y: 12, facing: "up" },
    { t: "unfade", ms: 1400 },
    n("Room 314. Paper cranes on the table - Mom's been folding them here,\nall these weeks, saying nothing."),
    n("(Go to the bed.)"),
  ],
  s_busstop: [ n("The bench where you both waited a thousand mornings.\nYou sit for exactly one breath, for old times' sake, then keep going.") ],
  s_traffic_light: [ n("The light blinks to green and back.\nIt's just a light. It was always just a light. You cross with it anyway,\nlooking both ways twice, the way you'll look both ways forever now.") ],
  s_crossing: [ n("The crosswalk. Your heart does one hard knock, like a bell...\nand then it passes. You keep walking.") ],
  s_flowers: [ n("Fresh flowers and thirty-one paper cranes. Mom's been counting days\nthe only way she knows how.") ],
  s_chair: [ n("The visitor chair, pulled close to the bed already.\nLike it's been waiting for you specifically.") ],
  s_ren_bed: [
    n("Ren is smaller than you remember, in all this white.\nEyelids flickering with some dream. Glasses folded on the table, one lens cracked."),
    mira("gloomy", "...hey, doofus. Took me long enough. I know."),
    n("You pull the sketchbook out of your backpack, open it to the first page,\nand start reading out loud. The fort. The swings. The swan."),
    n("You read the last page slowest - the ending you chose,\nthe apology you wrote in it, every word."),
    n("And when you finish -"),
    { t: "sfx", name: "sfx_heartbeat" },
    n("- a hand, resting outside the blanket, curls very slightly toward yours."),
    { t: "cg", img: "cg_ending_true", lines: [
      "The doctors said sleeping people sometimes hear us.",
      "You come back the next day, and the day after, and read it all again.",
      "Some endings take more than one telling. That's okay.",
      "You have time. You have SO much time.",
      "THE LAST PAGE - true ending",
      "Thank you for playing.",
    ] },
    { t: "ending", which: "credits" },
  ],
  s_ending_page: [
    { t: "cg", img: "cg_ending_page", lines: [
      "The tea is always warm. The sun never sets unless you want stars.",
      "Sir Biscuit tells the same joke every day, and it lands every time.",
      "Ren is here. Ren is always here. Ren says the thing you need,",
      "always, exactly, because the you-half of Ren knows exactly what you need.",
      "Somewhere very far away, morning keeps arriving at an empty bed.",
      "The edges of the picture are a little softer every day.",
      "It doesn't hurt. It doesn't anything.",
      "THE LAST PAGE - dream ending",
      "...the real Ren is still waiting. Perhaps another night, another choice.",
    ] },
    { t: "ending", which: "credits" },
  ],
};
