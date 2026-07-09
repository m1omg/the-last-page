// settings.js — device/player preferences, kept separate from the save file.
//
// These must survive "New Game" and must exist when there is no save at all
// (the title screen shows the touch toggle), so they never live in the save.

const SETTINGS_KEY = "the-last-page-settings";

export const TOUCH_SCHEMES = ["gestures", "dpad", "off"];

const DEFAULTS = { touch: "gestures" };

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object") return { ...DEFAULTS };
    return {
      touch: TOUCH_SCHEMES.includes(s.touch) ? s.touch : DEFAULTS.touch,
    };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    return true;
  } catch (e) {
    console.warn("settings save failed", e);
    return false;
  }
}
