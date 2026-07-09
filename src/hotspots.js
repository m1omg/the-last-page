// hotspots.js — tappable rectangles in canvas logical coords (960x720).
//
// Scenes register their menu rows while drawing; touch.js hit-tests a tap
// against them. A hit runs the row's callback, which typically moves the
// cursor to that row and injects a confirm, so all the existing keyboard
// selection logic runs untouched.
//
// Cleared once per frame, before drawing. A tap arriving between frames
// resolves against the last frame's layout, which is what the player saw.

let list = [];

export const hotspots = {
  clear() { list = []; },
  count() { return list.length; },

  add(x, y, w, h, fn) { list.push({ x, y, w, h, fn }); },

  // a rect that swallows taps without doing anything (e.g. a menu panel, so a
  // tap on its background doesn't fall through to "close menu" underneath)
  block(x, y, w, h) { list.push({ x, y, w, h, fn: null }); },

  // vertical list of evenly spaced rows
  rows(x, y, w, rowH, count, fn) {
    for (let i = 0; i < count; i++) list.push({ x, y: y + i * rowH, w, h: rowH, fn: () => fn(i) });
  },

  // topmost (last registered) wins
  hitTest(x, y) {
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i];
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r.fn ? r.fn : NOOP;
    }
    return null;
  },
};

// distinct from null: "a hotspot was hit, but it does nothing"
export const NOOP = () => {};
