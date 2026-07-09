// settings.js — device/player preferences, kept separate from the save file.
//
// These must survive "New Game" and must exist when there is no save at all
// (the title screen shows the touch toggle), so they never live in the save.

const SETTINGS_KEY = "the-last-page-settings";

// Only two schemes. There used to be an "off" state, but on a touch device it
// hid the d-pad AND disabled gestures, leaving no way to reach the toggle
// again — a total lockout. Any stored "off" self-heals to "gestures" below.
export const TOUCH_SCHEMES = ["gestures", "dpad"];

const DEFAULTS = { touch: "gestures", muted: false };

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object") return { ...DEFAULTS };
    return {
      touch: TOUCH_SCHEMES.includes(s.touch) ? s.touch : DEFAULTS.touch,
      muted: typeof s.muted === "boolean" ? s.muted : DEFAULTS.muted,
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

// merge a partial change into the stored settings — callers must never clobber
// the keys they don't own (mute vs touch scheme).
export function updateSettings(patch) {
  return saveSettings({ ...loadSettings(), ...patch });
}
