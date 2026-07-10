// textmode.js — the "mobile mode" toggle: which font stack the game draws with,
// and whether dialogue runs ~10% larger. Defaults to on for touch devices.
//
// Kept out of ui.js so ui.js stays a pure drawing module with no settings or
// touch dependency (menu.js and main.js both import from here instead).
import { loadSettings, updateSettings, resolveMobile, MOBILE_MODES } from "./settings.js";
import { setMobileMode } from "./ui.js";
import { touch } from "./touch.js";

const LABELS = { auto: "Clear (auto)", on: "Clear", off: "Storybook" };

let mode = "auto";

function apply() {
  setMobileMode(resolveMobile({ mobile: mode }, touch.capable));
}

export const textmode = {
  // call after touch.init(), so `capable` is known
  init() {
    mode = loadSettings().mobile;
    apply();
  },

  get mode() { return mode; },
  // "auto" reads as e.g. "Clear (auto)" so it's obvious which one auto picked
  label() {
    if (mode !== "auto") return LABELS[mode];
    return touch.capable ? "Clear (auto)" : "Storybook (auto)";
  },

  cycle() {
    mode = MOBILE_MODES[(MOBILE_MODES.indexOf(mode) + 1) % MOBILE_MODES.length];
    updateSettings({ mobile: mode }); // merge — never clobber touch/muted
    apply();
    return mode;
  },
};
