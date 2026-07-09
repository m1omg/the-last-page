// input.js — keyboard state with edge detection.
const down = new Set();
const pressed = new Set();

const KEYMAP = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  KeyZ: "confirm", Enter: "confirm", Space: "confirm",
  KeyX: "cancel", Escape: "cancel",
  ShiftLeft: "cancel", ShiftRight: "cancel",
  KeyM: "mute",
};

window.addEventListener("keydown", (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  e.preventDefault();
  if (!down.has(k)) pressed.add(k);
  down.add(k);
});
window.addEventListener("keyup", (e) => {
  const k = KEYMAP[e.code];
  if (!k) return;
  down.delete(k);
});
window.addEventListener("blur", () => down.clear());

export const input = {
  held(k) { return down.has(k); },
  hit(k) { return pressed.has(k); },
  // called once at the end of every frame
  flush() { pressed.clear(); },
  // eat a press mid-frame so a later scene in the same frame doesn't see it
  consume(k) { pressed.delete(k); },
  // simulate a key press (used by the debug/smoke harness)
  inject(k) { pressed.add(k); },

  // ---- synthetic input, used by touch.js. These feed the SAME sets the
  // keyboard feeds, so every scene works unchanged.
  // keydown-equivalent: an edge on the transition, then held.
  press(k) { if (!down.has(k)) pressed.add(k); down.add(k); },
  // keyup-equivalent.
  release(k) { down.delete(k); },
  // a one-frame edge with no hold (a tap). Auto-repeat must use this, since
  // press() on an already-held key produces no new edge.
  tap(k) { pressed.add(k); },
  clearAll() { down.clear(); pressed.clear(); },
};
