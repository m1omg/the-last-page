// skills.js — battle skills. target: enemy | ally | allies | self
export const SKILLS = {
  doodle_dash: {
    name: "Doodle Dash", ink: 3, target: "enemy",
    desc: "Scribble past an enemy at full speed. 130% damage.",
    kind: "attack", mult: 1.3,
  },
  cheer: {
    name: "Cheer", ink: 4, target: "ally",
    desc: "A goofy face and a thumbs up. Ally becomes GIGGLY.",
    kind: "emotion", emotion: "giggly",
  },
  grump_face: {
    name: "Grump Face", ink: 4, target: "enemy",
    desc: "So annoying it works. Enemy becomes GRUMPY.",
    kind: "emotion", emotion: "grumpy",
  },
  silly_story: {
    name: "Silly Story", ink: 5, target: "enemy",
    desc: "The one about the trumpets. Enemy becomes GIGGLY - it listens double, but giggly doodles dodge and swing wild.",
    kind: "emotion", emotion: "giggly",
  },
  valiant_chomp: {
    name: "Valiant Chomp", ink: 4, target: "enemy",
    desc: "A knight bites back. 160% damage, but Sir Biscuit gets GRUMPY.",
    kind: "attack", mult: 1.6, selfEmotion: "grumpy",
  },
  crumb_wall: {
    name: "Crumb Wall", ink: 3, target: "allies",
    desc: "Stand behind me! Party takes half damage this turn.",
    kind: "wall",
  },
  warm_glow: {
    name: "Warm Glow", ink: 5, target: "ally",
    desc: "A gentle warmth. Heals an ally 25 HP.",
    kind: "heal", amount: 25,
  },
  candlelight: {
    name: "Candlelight", ink: 9, target: "allies",
    desc: "Everyone gathers close. Heals the party 15 HP.",
    kind: "heal", amount: 15,
  },
  soft_song: {
    name: "Soft Song", ink: 4, target: "enemy",
    desc: "A lullaby hummed off-key. Enemy becomes GLOOMY.",
    kind: "emotion", emotion: "gloomy",
  },
};
