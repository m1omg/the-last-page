// smoke.mjs — headless end-to-end playthrough of the whole game.
// Serves the project, boots Chromium, drives keys through: title → intro →
// dream hub → all three areas (items, recruits, bosses via Reach Out) →
// depths → both endings. Fails on any console error or stall.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shots = join(root, "tools", "_shots");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".wav": "audio/wav", ".json": "application/json", ".woff2": "font/woff2" };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/") p = "/index.html";
    const data = await readFile(join(root, p));
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("nope");
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 980, height: 740 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

const g = (expr) => page.evaluate(expr);
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await page.waitForTimeout(90); } };
const shot = (name) => page.screenshot({ path: join(shots, `${name}.png`) });
let step = "boot";
const fail = async (msg) => {
  console.error(`FAIL at [${step}]: ${msg}`);
  if (errors.length) console.error("console errors:\n" + errors.join("\n"));
  try { await shot("FAIL"); } catch {}
  process.exit(1);
};

async function waitIdle(timeout = 15000, { chooseIdx = 0 } = {}) {
  // drive through anything (dialogue, choices, battles, CGs) until idle on map
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const m = await mode();
    if (m === "battle") { await runBattlePeace(); continue; }
    if (m === "cg") { await page.keyboard.press("KeyZ"); await page.waitForTimeout(120); continue; }
    const busy = await g("window.__game.busy()");
    if (!busy && m === "map") return;
    const dlgActive = await g("window.__game.game.dialogue.active");
    if (dlgActive) {
      const choice = await g("!!window.__game.game.dialogue.choice");
      if (choice) await chooseOption(chooseIdx);
      else await page.keyboard.press("KeyZ");
    }
    await page.waitForTimeout(120);
  }
  await fail(`still busy after ${timeout}ms (mode=${await mode()})`);
}
async function chooseOption(index) {
  // dialogue choice: set index deterministically, confirm
  await g(`(() => { const c = window.__game.game.dialogue.choice; if (c) c.index = ${index}; })()`);
  await page.waitForTimeout(60);
  await page.keyboard.press("KeyZ");
  await page.waitForTimeout(150);
}
async function waitChoice(timeout = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await g("!!window.__game.game.dialogue.choice")) return;
    const dlgActive = await g("window.__game.game.dialogue.active");
    if (dlgActive) await page.keyboard.press("KeyZ");
    await page.waitForTimeout(110);
  }
  fail("no choice appeared");
}
async function walkTo(x, y, timeout = 12000) {
  // naive greedy walker good enough for our open maps; uses debug teleport
  await g(`window.__game.game.state.x = ${x}; window.__game.game.state.y = ${y}; window.__game.game.mapScene.moving = null;`);
  await page.waitForTimeout(80);
}
async function pressToward(dir, n = 1) {
  const keys = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
  for (let i = 0; i < n; i++) {
    await page.keyboard.down(keys[dir]);
    await page.waitForTimeout(200);
    await page.keyboard.up(keys[dir]);
    await page.waitForTimeout(60);
  }
}
const mode = () => g("window.__game.game.mode");
// walk into a touch zone; chasing enemies may interrupt with a battle — retry
async function goThrough(x, y, dir, expectedMap, tries = 4) {
  for (let i = 0; i < tries; i++) {
    await walkTo(x, y);
    await pressToward(dir, 1);
    await waitIdle(60000);
    if ((await g("window.__game.game.state.map")) === expectedMap) return;
  }
  await fail(`could not reach ${expectedMap} from (${x},${y}) ${dir}`);
}
const flag = (f) => g(`!!window.__game.game.state.flags[${JSON.stringify(f)}]`);

async function runBattlePeace(timeout = 90000) {
  // generic battle driver: prefer Reach Out good options; falls back to Fight
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if ((await mode()) !== "battle") return;
    const st = await g(`(() => {
      const b = window.__game.game.battle;
      if (!b) return null;
      return { msgs: b.msgQ.length, phase: b.phase, menu: b.menu.kind, idx: b.menu.index,
               items: b.menuItems ? b.menuItems().map(o => ({label: o.label, disabled: !!o.disabled})) : [] };
    })()`);
    if (!st) { await page.waitForTimeout(150); continue; }
    if (st.msgs > 0) { await page.keyboard.press("KeyZ"); await page.waitForTimeout(100); continue; }
    if (st.phase !== "command") { await page.waitForTimeout(120); continue; }
    if (st.menu === "main") {
      // select Reach Out (index 2)
      await g(`window.__game.game.battle.menu.index = 2`);
      await page.keyboard.press("KeyZ");
    } else if (st.menu === "reach_target") {
      await page.keyboard.press("KeyZ");
    } else if (st.menu === "reach") {
      // choose first enabled good option: they're ordered good,good,bad — try index 0/1
      const pick = st.items.findIndex((o) => !o.disabled);
      if (pick < 0) { await page.keyboard.press("KeyX"); await g(`window.__game.game.battle.menu.index = 0`); await page.keyboard.press("KeyZ"); }
      else { await g(`window.__game.game.battle.menu.index = ${pick}`); await page.keyboard.press("KeyZ"); }
    } else {
      await page.keyboard.press("KeyZ");
    }
    await page.waitForTimeout(120);
  }
  fail("battle did not finish");
}

// ------------------------------------------------------------ run
await import("node:fs").then((fs) => fs.promises.mkdir(shots, { recursive: true }));
await page.goto(`http://localhost:${port}/?debug`);
await page.waitForFunction("window.__ready === true", null, { timeout: 30000 });
await page.waitForTimeout(600);

// fast path: SMOKE_ENDING=page → jump to the final choice and take the dream ending
if (process.env.SMOKE_ENDING === "page") {
  step = "dream ending (fast path)";
  await key("KeyZ");
  await page.waitForTimeout(1600);
  await waitIdle(25000);
  await g(`(() => {
    const s = window.__game.game.state;
    s.pages = 4;
    ["blank_intro_done","biscuit_joined","wisp_joined","meadow_boss_done","woods_boss_done","bay_boss_done"].forEach(f => s.flags[f] = true);
    window.__game.game.state.party.push(...[]);
  })()`);
  await g(`window.__game.game.runScript([{ t: "join", member: "biscuit" }, { t: "join", member: "wisp" }])`);
  await page.waitForTimeout(200);
  await g(`window.__game.tp("depths_2", 10, 12)`);
  await page.waitForTimeout(400);
  await waitIdle(60000); // s_depths2_enter: page 4 + CG
  await walkTo(10, 10); await pressToward("up", 1);
  {
    const t = Date.now();
    while ((await mode()) !== "battle") {
      if (Date.now() - t > 25000) await fail("smudge battle never started");
      const choice = await g("!!window.__game.game.dialogue.choice");
      if (choice) await chooseOption(0); else await page.keyboard.press("KeyZ");
      await page.waitForTimeout(150);
    }
  }
  await runBattlePeace(120000);
  await waitChoice(40000);
  await chooseOption(1); // stay on the page
  {
    const t = Date.now();
    while ((await mode()) !== "credits") {
      if (Date.now() - t > 60000) await fail("dream ending credits never rolled (mode=" + (await mode()) + ")");
      await page.keyboard.press("KeyZ");
      await page.waitForTimeout(200);
    }
  }
  await shot("ending_page");
  if (errors.length) await fail("console errors during run");
  console.log("SMOKE OK — dream ending path, zero console errors");
  await browser.close(); server.close(); process.exit(0);
}
await shot("01_title");
if ((await mode()) !== "title") fail("not on title");

step = "new game";
await key("KeyZ"); // possibly Continue/New Game — pick last option = New Game
const hasSave = await g("!!localStorage.getItem('the-last-page-save')");
await page.waitForTimeout(1600);
if ((await mode()) !== "map") fail("did not enter map");
await waitIdle();
await shot("02_bedroom");

step = "menu open/close";
await key("KeyX");
await page.waitForTimeout(250);
if (!(await g("window.__game.game.menu.open"))) await fail("menu didn't open on X");
await key("KeyX");
await page.waitForTimeout(250);
if (await g("window.__game.game.menu.open")) await fail("menu didn't close on X");
if ((await mode()) !== "map") await fail("not back on map after closing menu");

step = "picture above the bed";
// (5,4) is the only walkable tile beside the picture. Pressing UP there used to
// describe the WINDOW; the picture was only reachable by facing left into the
// bed, which no player would ever try.
await walkTo(5, 4);
await g(`window.__game.game.state.facing = "up"`);
await key("KeyZ");
await page.waitForTimeout(400);
const picText = await g("window.__game.game.dialogue.text || ''");
if (!/drawing/i.test(picText)) await fail(`Z at (5,4) facing up should describe the picture, got: ${JSON.stringify(picText)}`);
await waitIdle();

step = "intro bed";
await walkTo(5, 6);
await g(`window.__game.game.state.facing = "left"`);
await key("KeyZ");
await page.waitForTimeout(400);
await waitIdle(20000); // includes tp to blank page + s_blank_first with tutorial battle
if ((await mode()) === "battle") { step = "tutorial battle"; await runBattlePeace(); await waitIdle(20000); }
if ((await g("window.__game.game.state.map")) !== "blank_page") fail("not in blank_page");
await shot("03_blank_page");

step = "meadow";
// starts at (2,7), one tile OUTSIDE the doorway: stepping onto the painted door
// at column 1 must transfer. Starting at (1,7) would only prove column 0 works.
await goThrough(2, 7, "left", "meadow_1");
await shot("04_meadow");
// grab teacup
await walkTo(3, 4); await g(`window.__game.game.state.facing="up"`); await key("KeyZ"); await waitIdle();
await walkTo(3, 3); await key("KeyZ"); await waitIdle();
if (!(await g("!!window.__game.game.state.inventory.teacup"))) fail("no teacup");
// to meadow_2
await goThrough(10, 1, "up", "meadow_2");
step = "biscuit";
await walkTo(10, 9); await g(`window.__game.game.state.facing="up"`); await key("KeyZ"); await waitIdle(20000);
if (!(await flag("biscuit_joined"))) fail("biscuit didn't join");
await shot("05_biscuit");
// plate + crayon
await walkTo(2, 4); await g(`window.__game.game.state.facing="down"`); await walkTo(2, 3); await key("KeyZ"); await waitIdle();
await walkTo(16, 9); await key("KeyZ"); await waitIdle();
const inv = await g("JSON.stringify(window.__game.game.state.inventory)");
if (!JSON.parse(inv).cookieplate || !JSON.parse(inv).suncrayon) fail(`missing picnic items: ${inv}`);
step = "tangle boss";
await walkTo(9, 7); await g(`window.__game.game.state.facing="up"`); await key("KeyZ");
await page.waitForTimeout(600);
// s_meadow_stain runs: dialogue → battle
const t0 = Date.now();
while ((await mode()) !== "battle") {
  if (Date.now() - t0 > 25000) fail("tangle battle never started");
  const choice = await g("!!window.__game.game.dialogue.choice");
  if (choice) await chooseOption(0); else await page.keyboard.press("KeyZ");
  await page.waitForTimeout(150);
}
await shot("06_tangle");
await runBattlePeace();
step = "after tangle (cg + interlude)";
await waitIdle(40000);
if ((await g("window.__game.game.state.pages")) < 1) fail("no page 1");
if ((await g("window.__game.game.state.map")) !== "real_bedroom") fail("no interlude 1");
await shot("07_interlude1");

step = "woods";
await g(`window.__game.tp("blank_page", 9, 3)`);
await page.waitForTimeout(300); await waitIdle();
await goThrough(9, 2, "up", "woods_1");
await goThrough(9, 1, "up", "woods_2");
step = "wisp";
await walkTo(13, 6); await g(`window.__game.game.state.facing="up"`); await key("KeyZ"); await waitIdle(20000);
if (!(await flag("wisp_joined"))) fail("wisp didn't join");
await walkTo(3, 10); await key("KeyZ"); await waitIdle();
if (!(await g("!!window.__game.game.state.inventory.match"))) fail("no match");
step = "swan boss";
await walkTo(9, 5); await g(`window.__game.game.state.facing="up"`); await key("KeyZ");
{
  const t1 = Date.now();
  while ((await mode()) !== "battle") {
    if (Date.now() - t1 > 25000) fail("swan battle never started");
    const choice = await g("!!window.__game.game.dialogue.choice");
    if (choice) await chooseOption(0); else await page.keyboard.press("KeyZ");
    await page.waitForTimeout(150);
  }
}
await shot("08_swan");
await runBattlePeace();
await waitIdle(40000);
if ((await g("window.__game.game.state.pages")) < 2) fail("no page 2");
await shot("09_interlude2");

step = "bay";
await g(`window.__game.tp("blank_page", 17, 7)`);
await page.waitForTimeout(300); await waitIdle();
await goThrough(17, 7, "right", "bay_1"); // step onto the painted door at col 18
await walkTo(17, 8); await g(`window.__game.game.state.facing="down"`); await key("KeyZ"); await waitIdle(); // barrel → bulb
if (!(await g("!!window.__game.game.state.inventory.bulb"))) {
  await walkTo(15, 8); await g(`window.__game.game.state.facing="right"`); await key("KeyZ"); await waitIdle();
}
if (!(await g("!!window.__game.game.state.inventory.bulb"))) fail("no bulb");
await goThrough(18, 9, "right", "bay_2");

step = "keeper cottage interior";
await goThrough(15, 9, "up", "keeper_home");
await shot("10a_keeper_home");
await walkTo(16, 5); await g(`window.__game.game.state.facing="up"`); await key("KeyZ"); await waitIdle(20000); // photo
await walkTo(4, 6); await g(`window.__game.game.state.facing="left"`); await key("KeyZ"); await waitIdle(20000); // bed
await goThrough(9, 12, "down", "bay_2");

step = "keeper boss";
await walkTo(10, 6); await g(`window.__game.game.state.facing="up"`); await key("KeyZ");
{
  const t2 = Date.now();
  while ((await mode()) !== "battle") {
    if (Date.now() - t2 > 25000) fail("keeper battle never started");
    const choice = await g("!!window.__game.game.dialogue.choice");
    if (choice) await chooseOption(0); else await page.keyboard.press("KeyZ");
    await page.waitForTimeout(150);
  }
}
await shot("10_keeper");
await runBattlePeace();
await waitIdle(40000);
if ((await g("window.__game.game.state.pages")) < 3) fail("no page 3");

step = "depths";
await g(`window.__game.tp("blank_page", 9, 11)`);
await page.waitForTimeout(300); await waitIdle();
await walkTo(9, 12); await pressToward("down", 1);
// choice: Ready? no — s_to_depths has dialogue then tp
await waitIdle(25000);
if ((await g("window.__game.game.state.map")) !== "depths_1") fail("no depths");
await shot("11_depths");
await goThrough(10, 1, "up", "depths_2"); // s_depths2_enter: page 4 + CG
if ((await g("window.__game.game.state.pages")) < 4) fail("no page 4");
step = "smudge";
await walkTo(10, 10); await pressToward("up", 1);
{
  const t3 = Date.now();
  while ((await mode()) !== "battle") {
    if (Date.now() - t3 > 25000) fail("smudge battle never started");
    const choice = await g("!!window.__game.game.dialogue.choice");
    if (choice) await chooseOption(0); else await page.keyboard.press("KeyZ");
    await page.waitForTimeout(150);
  }
}
await shot("12_smudge");
await runBattlePeace(120000);
step = "final choice";
await waitChoice(40000);
await shot("13_choice");
await chooseOption(0); // true ending
step = "true ending walk";
await waitIdle(40000);
if ((await g("window.__game.game.state.map")) !== "real_bedroom") fail("no ending walk");
await walkTo(9, 12); await pressToward("down", 1); await waitIdle(20000); // hall
if ((await g("window.__game.game.state.map")) !== "real_hall") fail("no hall in ending");
// Mom's door is painted across the alcove (cols 4-5); standing in it and
// pressing Z must listen at her door, not describe bare hallway.
await walkTo(4, 2);
await g(`window.__game.game.state.facing = "up"`);
await key("KeyZ");
await page.waitForTimeout(400);
const momText = await g("window.__game.game.dialogue.text || ''");
if (!/Mom's door/i.test(momText)) await fail(`Z inside Mom's alcove gave: ${JSON.stringify(momText)}`);
await waitIdle();
await shot("13b_mom_door");
await walkTo(9, 12); await pressToward("down", 1);
await waitChoice(20000); await chooseOption(0); // go outside
await waitIdle(20000);
if ((await g("window.__game.game.state.map")) !== "real_street") fail("no street");
await shot("14_street");
await walkTo(9, 1); await pressToward("up", 1); await waitIdle(20000);
if ((await g("window.__game.game.state.map")) !== "hospital_room") fail("no hospital");
await walkTo(9, 8); await g(`window.__game.game.state.facing="up"`); await key("KeyZ");
step = "true ending";
{
  const t4 = Date.now();
  while ((await mode()) !== "credits") {
    if (Date.now() - t4 > 60000) fail("credits never rolled (mode=" + (await mode()) + ")");
    await page.keyboard.press("KeyZ");
    await page.waitForTimeout(200);
  }
}
await shot("15_credits");

if (errors.length) fail("console errors during run");
console.log("SMOKE OK — full true-ending playthrough, zero console errors");
if (hasSave) console.log("(note: pre-existing save was present)");
await browser.close();
server.close();
process.exit(0);
