// validate.mjs — static integrity checks for maps, scripts, data and assets.
import { MAPS, COLS, ROWS } from "../src/data/maps.js";
import { SCRIPTS } from "../src/data/script.js";
import { ENEMIES, TROOPS } from "../src/data/enemies.js";
import { SKILLS } from "../src/data/skills.js";
import { ITEMS } from "../src/data/items.js";
import { PARTY_DEFS } from "../src/data/party.js";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let errors = 0;
const err = (m) => { console.error("ERR ", m); errors++; };
const warn = (m) => console.warn("warn", m);

// ---- maps
for (const [name, d] of Object.entries(MAPS)) {
  if (d.grid.length !== ROWS) err(`${name}: ${d.grid.length} rows (want ${ROWS})`);
  d.grid.forEach((row, y) => {
    if (row.length !== COLS) err(`${name} row ${y}: ${row.length} cols (want ${COLS})`);
    if (/[^#.]/.test(row)) err(`${name} row ${y}: bad chars`);
  });
  const walk = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && d.grid[y][x] === ".";
  // flood fill from first walkable tile: every walkable tile reachable
  let start = null;
  for (let y = 0; y < ROWS && !start; y++) for (let x = 0; x < COLS; x++) if (walk(x, y)) { start = [x, y]; break; }
  if (!start) { err(`${name}: no walkable tiles`); continue; }
  const seen = new Set([start.join(",")]);
  const q = [start];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const k = `${x + dx},${y + dy}`;
      if (!seen.has(k) && walk(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); }
    }
  }
  let total = 0;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (walk(x, y)) total++;
  if (seen.size !== total) err(`${name}: ${total - seen.size} walkable tiles unreachable from ${start}`);
  for (const e of d.entities) {
    for (const k of ["interact", "touch"]) {
      if (e[k] && !SCRIPTS[e[k]]) err(`${name}/${e.id}: missing script ${e[k]}`);
    }
    if (e.touch) {
      // touch zones must overlap walkable tiles
      let any = false;
      for (let y = e.y; y < e.y + (e.h || 1); y++) for (let x = e.x; x < e.x + (e.w || 1); x++) if (walk(x, y)) any = true;
      if (!any) err(`${name}/${e.id}: touch zone entirely solid`);
    }
    if (e.sprite && e.sprite !== "sparkle" && e.sprite !== "lantern" && e.sprite !== "book" && !e.sprite.startsWith("enemy:") && !e.sprite.startsWith("sp_"))
      warn(`${name}/${e.id}: odd sprite ${e.sprite}`);
    if (e.sprite && !walkOrSolid(d, e)) err(`${name}/${e.id}: sprite tile solid (unreachable/invisible blocker ok?)`);
  }
  if (d.onEnter && !SCRIPTS[d.onEnter]) err(`${name}: missing onEnter script ${d.onEnter}`);

  // Every interact entity must actually be examinable. Simulates map.js:
  //   entityAt(player) || entityAt(player + facing)
  // including the "first match in entity order wins" rule, so a big entity
  // listed earlier can shadow a smaller one and that shows up as an error.
  const inRect = (e, x, y) =>
    x >= e.x && x < e.x + (e.w || 1) && y >= e.y && y < e.y + (e.h || 1);
  const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const passes = [
    ["start", d.entities],                                  // hidden entities present
    ["late", d.entities.filter((e) => !e.hidden)],          // after their flags fire
  ];
  for (const [label, ents] of passes) {
    const hit = (x, y) => ents.find((e) => e.interact && inRect(e, x, y));
    // mirror map.js solid(): sprite entities (except sparkles) block their tile,
    // so the player can never stand on a lantern/NPC to examine it from within.
    const spriteBlocks = (x, y) => ents.some((e) =>
      e.sprite && e.sprite !== "sparkle" && !e.walkable && inRect(e, x, y));
    const found = new Set();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (!walk(x, y) || spriteBlocks(x, y)) continue; // player can't stand here
      for (const [dx, dy] of DIRS) {
        const e = hit(x, y) || hit(x + dx, y + dy);
        if (e) found.add(e.id);
      }
    }
    for (const e of ents) {
      if (e.interact && !found.has(e.id)) {
        err(`${name}/${e.id} (${label}): interact is unreachable — no walkable tile faces it (shadowed or walled off)`);
      }
    }
  }
}
function walkOrSolid(d, e) {
  return d.grid[e.y] && d.grid[e.y][e.x] === ".";
}

// ---- scripts: walk all commands
const walkCmds = (cmds, path) => {
  for (const c of cmds) {
    if (!c || !c.t) { err(`${path}: bad cmd ${JSON.stringify(c)}`); continue; }
    if (c.t === "tp") {
      const m = MAPS[c.map];
      if (!m) { err(`${path}: tp to missing map ${c.map}`); continue; }
      if (m.grid[c.y]?.[c.x] !== ".") err(`${path}: tp ${c.map} (${c.x},${c.y}) is solid`);
    }
    if (c.t === "battle" && !TROOPS[c.troop]) err(`${path}: missing troop ${c.troop}`);
    if ((c.t === "give" || c.t === "take") && !ITEMS[c.item]) err(`${path}: missing item ${c.item}`);
    if (c.t === "join" && !PARTY_DEFS[c.member]) err(`${path}: missing member ${c.member}`);
    if (c.t === "cg" && !c.img) err(`${path}: cg without img`);
    for (const sub of ["then", "else"]) if (c[sub]) walkCmds(c[sub], `${path}.${sub}`);
    if (c.options) c.options.forEach((o, i) => o.then && walkCmds(o.then, `${path}.opt${i}`));
    if (c.onWin) walkCmds(c.onWin, `${path}.onWin`);
    if (c.onPeace) walkCmds(c.onPeace, `${path}.onPeace`);
  }
};
for (const [name, cmds] of Object.entries(SCRIPTS)) walkCmds(cmds, name);

// ---- troops/enemies/skills
for (const [t, list] of Object.entries(TROOPS)) for (const id of list) if (!ENEMIES[id]) err(`troop ${t}: missing enemy ${id}`);
for (const [id, p] of Object.entries(PARTY_DEFS)) for (const s of p.skills) if (!SKILLS[s]) err(`party ${id}: missing skill ${s}`);
for (const [id, e] of Object.entries(ENEMIES)) {
  if (!e.reach || !e.reach.length) err(`enemy ${id}: no reach options`);
  const good = e.reach.filter((r) => r.good).length;
  if (e.reachStory) {
    // story enemies land steps in order, one per round; need enough beats
    if (good < e.calmNeed) err(`enemy ${id}: story enemy has ${good} good steps < calmNeed ${e.calmNeed}`);
  } else if (good < 2 && e.calmNeed >= 2) {
    // options are reusable but can't land twice in a row (lastReach), so any
    // calmNeed >= 2 requires at least two good options to rotate between
    err(`enemy ${id}: calmNeed ${e.calmNeed} unreachable with ${good} good option(s) — rotation needs >= 2`);
  }
}

// ---- assets on disk vs manifest
const files = readdirSync(join(root, "assets/img"));
const imgs = new Set(files.map((f) => f.replace(/\.(png|jpg)$/, "")));
// alpha-bearing sprites must be PNG; opaque art must be JPEG
for (const f of files) {
  const isSprite = /^(en_|boss_|sp_)/.test(f);
  if (isSprite && !f.endsWith(".png")) err(`sprite not png: ${f}`);
  if (!isSprite && !f.endsWith(".jpg")) err(`opaque art not jpg: ${f}`);
}
const auds = new Set(readdirSync(join(root, "assets/audio")).map((f) => f.replace(".wav", "")));
const wantImgs = new Set();
for (const d of Object.values(MAPS)) {
  wantImgs.add(d.bg);
  if (d.bgSwap) wantImgs.add(d.bgSwap.bg); // alternate painting (e.g. healed meadow)
}
for (const e of Object.values(ENEMIES)) wantImgs.add(e.img);
["cg_title", "cg_memory_1", "cg_memory_2", "cg_memory_3", "cg_memory_4", "cg_ending_true", "cg_ending_page",
  "pt_mira_neutral", "pt_mira_giggly", "pt_mira_gloomy", "pt_mira_grumpy", "pt_biscuit", "pt_wisp", "pt_ren",
  "sp_biscuit", "sp_wisp",
  ...["d0", "d1", "l0", "l1", "r0", "r1", "u0", "u1"].map((s) => `sp_mira_${s}`)].forEach((k) => wantImgs.add(k));
for (const k of wantImgs) if (!imgs.has(k)) err(`missing image asset: ${k}.png`);
const wantAuds = ["bgm_title", "bgm_blank", "bgm_real", "bgm_meadow", "bgm_woods", "bgm_bay", "bgm_depths",
  "bgm_battle", "bgm_boss", "bgm_ending", "sfx_blip", "sfx_confirm", "sfx_cancel", "sfx_step", "sfx_hit",
  "sfx_heal", "sfx_emotion", "sfx_save", "sfx_door", "sfx_page", "sfx_heartbeat", "sfx_static", "sfx_tear",
  "sfx_soothe", "sfx_victory", "sfx_defeat"];
for (const k of wantAuds) if (!auds.has(k)) err(`missing audio asset: ${k}.wav`);

console.log(errors ? `\n${errors} error(s)` : "\nall checks passed");
process.exit(errors ? 1 : 0);
