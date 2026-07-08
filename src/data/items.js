// items.js — usable items and key items.
export const ITEMS = {
  cookie: {
    name: "Sugar Cookie", desc: "Ren's favorite. Heals 20 HP.",
    battle: true, field: true, effect: { hp: 20 },
  },
  juice: {
    name: "Juice Box", desc: "Sunshine in a carton. Restores 10 Ink.",
    battle: true, field: true, effect: { ink: 10 },
  },
  sandwich: {
    name: "Jam Sandwich", desc: "Cut into triangles, obviously. Heals 45 HP.",
    battle: true, field: true, effect: { hp: 45 },
  },
  glitter: {
    name: "Glitter Vial", desc: "Emergency sparkles. Revives a torn friend with 20 HP.",
    battle: true, field: false, effect: { revive: 20 },
  },
  // key items
  teacup: { name: "Chipped Teacup", desc: "A tiny teacup drawn with great care.", key: true },
  cookieplate: { name: "Plate of Cookies", desc: "Crayon cookies. Zero calories.", key: true },
  suncrayon: { name: "Sun-Yellow Crayon", desc: "Worn down to a stub from drawing suns.", key: true },
  match: { name: "Brave Match", desc: "One match, saved for something important.", key: true },
  bulb: { name: "Bright Bulb", desc: "A lighthouse bulb, warm even when off.", key: true },
  page1: { name: "Torn Page: The Fort", desc: "A drawing of a blanket fort.", key: true },
  page2: { name: "Torn Page: The Swings", desc: "A drawing of two kids flying.", key: true },
  page3: { name: "Torn Page: The Fight", desc: "A drawing torn down the middle.", key: true },
  page4: { name: "Torn Page: The Rain", desc: "A drawing that hurts to hold.", key: true },
};
