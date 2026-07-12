// state.js — the mutable game state + save/load.
import { PARTY_DEFS } from "./data/party.js";
import { MAPS } from "./data/maps.js";

export function newMember(id) {
  const d = PARTY_DEFS[id];
  return {
    id, name: d.name, portrait: d.portrait,
    hp: d.hp, maxHp: d.hp, ink: d.ink, maxInk: d.ink,
    atk: d.atk, def: d.def, spd: d.spd,
    emotion: "neutral", guard: false, skills: [...d.skills],
  };
}

export function newGameState() {
  return {
    version: 1,
    map: "real_bedroom",
    x: 9, y: 6, facing: "down",
    flags: {},
    pages: 0,
    party: [newMember("mira")],
    inventory: { cookie: 2, juice: 1 },
    steps: 0,
    playMs: 0,
  };
}

const SAVE_KEY = "the-last-page-save";

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn("save failed", e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // same structural bar as import: a version-1 save with a broken shape
    // (unknown map, empty party) would otherwise crash enterMap
    if (!isValidSave(s)) return null;
    migrateSave(s);
    return s;
  } catch (e) {
    return null;
  }
}

export function hasSave() {
  return !!loadGame();
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

// Old saves stay loadable when the game grows: a member saved before a skill
// was added to their PARTY_DEFS entry learns it here, in saved order first.
function migrateSave(s) {
  for (const m of s.party) {
    const d = PARTY_DEFS[m.id];
    if (!d) continue;
    for (const sk of d.skills) if (!m.skills.includes(sk)) m.skills.push(sk);
  }
}

// A save is only structurally trusted if it matches our shape — deep enough
// that map/battle code can rely on it (flags/inventory objects, members with
// real numbers), not just "version 1 with a party array".
function isValidSave(s) {
  return !!s && s.version === 1 && typeof s.map === "string" && MAPS[s.map]
    && Number.isInteger(s.x) && Number.isInteger(s.y)
    && s.flags && typeof s.flags === "object"
    && s.inventory && typeof s.inventory === "object"
    && Array.isArray(s.party) && s.party.length > 0
    && s.party.every((m) => m && typeof m.id === "string"
        && Number.isFinite(m.hp) && Number.isFinite(m.maxHp)
        && Number.isFinite(m.ink) && Number.isFinite(m.maxInk)
        && Array.isArray(m.skills));
}

// Download the current save as a .json file the player can back up or move.
export function exportSave() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `the-last-page-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

// Prompt for a .json save file, validate it, and install it. onResult(ok, why).
export function importSave(onResult) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.style.display = "none";
  document.body.appendChild(input);
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) { input.remove(); onResult(false, "no file chosen"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      input.remove();
      let s;
      try { s = JSON.parse(String(reader.result)); }
      catch { onResult(false, "not a valid file"); return; }
      if (!isValidSave(s)) { onResult(false, "not a Last Page save"); return; }
      migrateSave(s);
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      onResult(true);
    };
    reader.onerror = () => { input.remove(); onResult(false, "could not read file"); };
    reader.readAsText(file);
  }, { once: true });
  input.click();
}
