// touch.js — two touch control schemes, feeding the same input sets the
// keyboard feeds (see input.js), so no scene code needs to know about touch.
//
//   "gestures" : tap = confirm, press-and-drag = hold a direction, 2 fingers = cancel
//   "dpad"     : a DOM overlay cross + Z/X buttons, anchored in the letterbox
//
// Tapping a menu row activates it directly in BOTH schemes (see hotspots.js) —
// dragging is for walking, not for moving menu cursors.
import { input } from "./input.js";
import { hotspots, NOOP } from "./hotspots.js";
import { loadSettings, updateSettings, TOUCH_SCHEMES } from "./settings.js";

const DEADZONE = 24;   // css px before a drag counts as a direction
const HOLD_MS = 250;   // stationary press becomes a held confirm
const TAP_MS = 300;    // released within this, without moving, is a tap
const REPEAT_DELAY = 380;
const REPEAT_RATE = 220;

const LABELS = { gestures: "Gestures", dpad: "D-pad" };

let scheme = "gestures";
let capable = false;
let root = null;          // #touchui element
let stage = null;
let canvas = null;

// current held direction (only one at a time — movement is 4-way grid)
let curDir = null;
let repeatAt = 0;

// gesture state machine. `moved` disqualifies a release from being a tap.
const g = { id: null, x0: 0, y0: 0, t0: 0, state: "idle", moved: false };

// hotspot callbacks queued by a tap, run at the top of the next frame so the
// scene update that follows sees the cursor move + injected confirm.
const pendingTaps = [];

const now = () => performance.now();

function toLogical(clientX, clientY) {
  if (!canvas) return null;
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const x = (clientX - r.left) * (960 / r.width);
  const y = (clientY - r.top) * (720 / r.height);
  if (x < 0 || y < 0 || x > 960 || y > 720) return null;
  return { x, y };
}

// A tap resolves against the on-screen UI first. If any hotspots are showing
// (a menu, a choice, a text box) then a tap that misses them all does nothing —
// otherwise tapping blank space would activate whatever the cursor happened to
// be on. With no hotspots at all (walking around) a tap is a plain confirm.
function handleTap(clientX, clientY) {
  const p = toLogical(clientX, clientY);
  const fn = p ? hotspots.hitTest(p.x, p.y) : null;
  if (fn) { pendingTaps.push(fn); return; }
  if (hotspots.count() === 0) input.tap("confirm");
}

function setDir(d) {
  if (curDir === d) return;
  if (curDir) input.release(curDir);
  curDir = d;
  if (d) {
    input.press(d);
    repeatAt = now() + REPEAT_DELAY;
  }
}

function resetGesture() {
  if (g.state === "move") setDir(null);
  if (g.state === "hold") input.release("confirm");
  g.state = "idle";
  g.id = null;
}

// ------------------------------------------------------------ gestures
function dirOf(dx, dy) {
  if (Math.hypot(dx, dy) < DEADZONE) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left")
                                     : (dy > 0 ? "down" : "up");
}

// Tap detection runs in BOTH schemes — tapping a menu row must work whether or
// not the d-pad is on screen. Only dragging and the two-finger cancel are
// exclusive to the gesture scheme.
function onTouchStart(e) {
  e.preventDefault();
  if (e.touches.length >= 2) {
    if (scheme === "gestures") input.tap("cancel");
    resetGesture();
    g.state = "dead"; // ignore until every finger lifts
    return;
  }
  if (g.state !== "idle") return;
  const t = e.touches[0];
  g.id = t.identifier;
  g.x0 = t.clientX;
  g.y0 = t.clientY;
  g.t0 = now();
  g.moved = false;
  g.state = "pending";
}

function onTouchMove(e) {
  e.preventDefault();
  if (g.state === "dead" || g.state === "idle") return;
  const t = [...e.touches].find((x) => x.identifier === g.id);
  if (!t) return;

  const dx = t.clientX - g.x0;
  const dy = t.clientY - g.y0;
  const dist = Math.hypot(dx, dy);
  if (dist >= DEADZONE) g.moved = true;

  if (scheme !== "gestures") return; // d-pad: taps only, no drag-to-walk

  if (dist < DEADZONE) {
    if (g.state === "move") setDir(null); // back inside the deadzone: stop
    return;
  }
  if (g.state === "hold") input.release("confirm"); // drag out of a hold
  g.state = "move";
  setDir(dirOf(dx, dy));

  // trail the origin behind the finger so reversing direction is responsive
  const k = (dist - DEADZONE) / dist;
  g.x0 += dx * k;
  g.y0 += dy * k;
}

function onTouchEnd(e) {
  e.preventDefault();
  if (e.touches.length > 0) return; // wait until every finger is up
  const t = e.changedTouches && e.changedTouches[0];
  const wasTap = g.state === "pending" && !g.moved && now() - g.t0 <= TAP_MS;

  if (g.state === "dead") { g.state = "idle"; g.id = null; return; }
  if (g.state === "move") setDir(null);
  else if (g.state === "hold") input.release("confirm");
  else if (wasTap && t) handleTap(t.clientX, t.clientY);

  g.state = "idle";
  g.id = null;
  g.moved = false;
}

// ------------------------------------------------------------ d-pad (DOM)
const BUTTONS = [
  ["up", "▲", "tui-up"], ["left", "◀", "tui-left"],
  ["right", "▶", "tui-right"], ["down", "▼", "tui-down"],
];

function makeButton(key, glyph, cls) {
  const b = document.createElement("button");
  b.className = `tui-btn ${cls}`;
  b.textContent = glyph;
  b.type = "button";
  b.dataset.k = key;
  b.setAttribute("aria-label", key);
  const isDir = key === "up" || key === "down" || key === "left" || key === "right";
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    try { b.setPointerCapture(e.pointerId); } catch (_) {}
    b.classList.add("tui-on");
    if (isDir) setDir(key); else input.press(key);
  });
  const up = (e) => {
    e.preventDefault();
    b.classList.remove("tui-on");
    if (isDir) { if (curDir === key) setDir(null); }
    else input.release(key);
  };
  b.addEventListener("pointerup", up);
  b.addEventListener("pointercancel", up);
  return b;
}

function buildDom() {
  root = document.createElement("div");
  root.id = "touchui";
  root.setAttribute("aria-hidden", "true");

  const pad = document.createElement("div");
  pad.className = "tui-pad";
  for (const [k, glyph, cls] of BUTTONS) pad.appendChild(makeButton(k, glyph, cls));

  const actions = document.createElement("div");
  actions.className = "tui-actions";
  actions.appendChild(makeButton("confirm", "Z", "tui-z"));
  actions.appendChild(makeButton("cancel", "X", "tui-x"));

  root.appendChild(pad);
  root.appendChild(actions);
  document.body.appendChild(root);
}

// Candidate d-pad sizes, largest first. We try to fit the controls into the
// side letterbox; if they don't fit (e.g. a 4:3 screen has no side bars) we
// reserve a strip below the canvas instead. Either way they never overlap the
// dialogue box, which spans the bottom of the 960x720 canvas.
const CELLS = [60, 54, 48, 44];
const MARGIN = 16;

function layout() {
  if (!root || root.style.display === "none") {
    document.body.classList.remove("tui-bottom");
    return;
  }
  const vw = window.innerWidth, vh = window.innerHeight;
  // canvas size if we reserve nothing (the worst case for side room)
  const canvasW = Math.min(vw, vh * 4 / 3);
  const sideRoom = (vw - canvasW) / 2;

  for (const c of CELLS) {
    const padW = c * 3 + MARGIN;
    const actW = c * 1.25 + 14 + c * 1.05 + MARGIN;
    if (sideRoom >= Math.max(padW, actW) && c * 3 + 20 <= vh) {
      root.style.setProperty("--tui-cell", `${c}px`);
      document.body.classList.remove("tui-bottom");
      return;
    }
  }
  // no side room: shrink the canvas and put the controls underneath it
  const c = vh < 520 ? 48 : 60;
  root.style.setProperty("--tui-cell", `${c}px`);
  document.body.style.setProperty("--tui-strip", `${c * 3 + 36}px`);
  document.body.classList.add("tui-bottom");
}

function applyScheme() {
  if (!root) return;
  root.style.display = (capable && scheme === "dpad") ? "block" : "none";
  layout();
}

// ------------------------------------------------------------ api
export const touch = {
  init(canvasEl) {
    canvas = canvasEl;
    scheme = loadSettings().touch;
    const forced = new URLSearchParams(location.search).has("touch");
    capable = forced || navigator.maxTouchPoints > 0 || "ontouchstart" in window;

    buildDom();
    applyScheme();

    stage = document.getElementById("stage") || document.body;
    stage.addEventListener("touchstart", onTouchStart, { passive: false });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("touchend", onTouchEnd, { passive: false });
    stage.addEventListener("touchcancel", onTouchEnd, { passive: false });

    // Mouse (and pen) support, always on — menus are clickable on desktop too.
    // A click routes through the same hotspot plumbing as a tap: a menu row
    // click selects and activates it; a click with nothing tappable showing is
    // a plain confirm (advances dialogue, interacts). Touches never get here:
    // they arrive via the touch events above, whose preventDefault() also
    // suppresses the browser's synthetic mouse events.
    stage.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      handleTap(e.clientX, e.clientY);
    });
    // right-click = X (open/close the menu, back out of submenus)
    stage.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      input.tap("cancel");
    });
    // pointer cursor over anything actually clickable
    stage.addEventListener("mousemove", (e) => {
      const p = toLogical(e.clientX, e.clientY);
      const fn = p ? hotspots.hitTest(p.x, p.y) : null;
      const hot = fn && fn !== NOOP;
      if (canvas) canvas.style.cursor = hot ? "pointer" : "";
    });

    window.addEventListener("blur", () => { resetGesture(); setDir(null); });
    window.addEventListener("resize", layout);
    window.addEventListener("orientationchange", layout);
  },

  // called once per frame from the main loop, BEFORE scene updates: runs queued
  // tap callbacks, promotes a stationary press to a held confirm, and repeats
  // held directions (menus read hit(), so they need fresh edges).
  update() {
    if (pendingTaps.length) {
      const fns = pendingTaps.splice(0, pendingTaps.length);
      for (const fn of fns) fn();
    }
    const t = now();
    // only promote to a held confirm if the touch is NOT over a tappable UI —
    // otherwise resting a finger on a menu row would fire the row underneath.
    if (scheme === "gestures" && g.state === "pending" && t - g.t0 > HOLD_MS
        && hotspots.count() === 0) {
      g.state = "hold";
      input.press("confirm"); // like holding Z: advances once, then speeds text
    }
    if (curDir && t >= repeatAt) {
      input.tap(curDir);
      repeatAt = t + REPEAT_RATE;
    }
  },

  get scheme() { return scheme; },
  get capable() { return capable; },
  label() { return LABELS[scheme]; },

  setScheme(s) {
    if (!TOUCH_SCHEMES.includes(s)) return;
    resetGesture();
    setDir(null);
    input.clearAll();
    scheme = s;
    updateSettings({ touch: scheme });
    applyScheme();
  },

  cycle() {
    const i = TOUCH_SCHEMES.indexOf(scheme);
    this.setScheme(TOUCH_SCHEMES[(i + 1) % TOUCH_SCHEMES.length]);
    return scheme;
  },
};
