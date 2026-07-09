// touch_smoke.mjs — headless verification of both touch schemes.
//
// Uses a CDP session (Input.dispatchTouchEvent) so we get REAL multi-touch,
// which page.touchscreen cannot do. Covers gestures, d-pad, off, persistence,
// and that desktop (no touch) is completely unaffected.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".wav": "audio/wav" };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p === "/") p = "/index.html";
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(await readFile(join(root, p)));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

let failures = 0;
const ok = (name, cond, extra = "") => {
  console.log(`${cond ? "  ok  " : " FAIL "} ${name}${extra ? "  — " + extra : ""}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({ args: ["--disable-dev-shm-usage"] });

// a save that drops us straight onto a walkable map with no cutscene
const SAVE = JSON.stringify({
  version: 1, map: "blank_page", x: 9, y: 8, facing: "down",
  flags: { intro_done: true, blank_intro_done: true }, pages: 1,
  party: [{ id: "mira", name: "Mira", portrait: "mira", hp: 45, maxHp: 45, ink: 20, maxInk: 20, atk: 10, def: 6, spd: 8, emotion: "neutral", guard: false, skills: ["doodle_dash"] }],
  inventory: { cookie: 1 }, steps: 0, playMs: 0,
});

async function newPage(ctx, { settings = null, query = "" } = {}) {
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  // seed ONLY if absent — addInitScript re-runs on reload, and we must not
  // clobber what the game itself wrote (that's what we're testing).
  await page.addInitScript(([save, st]) => {
    if (!localStorage.getItem("the-last-page-save")) localStorage.setItem("the-last-page-save", save);
    if (st && !localStorage.getItem("the-last-page-settings")) localStorage.setItem("the-last-page-settings", st);
  }, [SAVE, settings]);
  await page.goto(base + "/" + query);
  await page.waitForFunction("window.__ready === true", null, { timeout: 20000 });
  page.__errs = errs;
  return page;
}

async function intoGame(page) {
  await page.waitForTimeout(400);
  await page.keyboard.press("KeyZ"); // Continue
  await page.waitForFunction("window.__game.game.mode==='map' && !window.__game.busy()", null, { timeout: 20000 });
  await page.waitForTimeout(300);
}

// ---- raw touch dispatch
async function cdpFor(page) { return await page.context().newCDPSession(page); }
const pt = (x, y, id) => ({ x, y, id, radiusX: 12, radiusY: 12, force: 1 });
async function touchEvent(cdp, type, points) {
  await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
}

const pos = (page) => page.evaluate(() => {
  const s = window.__game.game.state; return `${s.x},${s.y}`;
});

// ============================================================ GESTURES
{
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 800, height: 600 } });
  const page = await newPage(ctx, { settings: JSON.stringify({ touch: "gestures" }) });
  const cdp = await cdpFor(page);
  await intoGame(page);
  console.log("\n[gestures]");

  ok("scheme is gestures", (await page.evaluate("window.__game.touch.scheme")) === "gestures");
  ok("d-pad hidden", (await page.evaluate(`getComputedStyle(document.getElementById("touchui")).display`)) === "none");

  // tap → confirm. Face the lamp and tap; a dialogue should open.
  await page.evaluate(() => { const s = window.__game.game.state; s.x = 9; s.y = 7; s.facing = "left"; });
  await page.waitForTimeout(150);
  await touchEvent(cdp, "touchStart", [pt(400, 300, 1)]);
  await page.waitForTimeout(60);
  await touchEvent(cdp, "touchEnd", []);
  await page.waitForTimeout(400);
  ok("tap = confirm (opened dialogue)", await page.evaluate("window.__game.game.dialogue.active"));

  // dismiss
  for (let i = 0; i < 10 && await page.evaluate("window.__game.busy()"); i++) {
    await page.keyboard.press("KeyZ"); await page.waitForTimeout(180);
  }

  // swipe-and-hold right → keeps walking
  const before = await pos(page);
  await touchEvent(cdp, "touchStart", [pt(300, 300, 1)]);
  await page.waitForTimeout(50);
  await touchEvent(cdp, "touchMove", [pt(400, 300, 1)]); // >DEADZONE right
  await page.waitForTimeout(120);
  const held = await page.evaluate(`window.__game.input.held("right")`);
  ok("drag right holds 'right'", held);
  await page.waitForTimeout(700); // let it walk a few tiles
  const during = await pos(page);
  ok("player kept moving while held", before !== during, `${before} → ${during}`);
  await touchEvent(cdp, "touchEnd", []);
  await page.waitForTimeout(350);
  ok("direction released on lift", !(await page.evaluate(`window.__game.input.held("right")`)));
  const afterLift = await pos(page);
  await page.waitForTimeout(400);
  ok("player stops after lift", afterLift === (await pos(page)));

  // reversal: drag right then far left should flip direction
  await touchEvent(cdp, "touchStart", [pt(300, 300, 1)]);
  await touchEvent(cdp, "touchMove", [pt(400, 300, 1)]);
  await page.waitForTimeout(80);
  await touchEvent(cdp, "touchMove", [pt(300, 300, 1)]);
  await touchEvent(cdp, "touchMove", [pt(250, 300, 1)]);
  await page.waitForTimeout(80);
  ok("reversing flips to 'left'", await page.evaluate(`window.__game.input.held("left")`));
  await touchEvent(cdp, "touchEnd", []);
  await page.waitForTimeout(200);

  // two fingers → cancel → opens the menu
  ok("menu closed before", !(await page.evaluate("window.__game.game.menu.open")));
  await touchEvent(cdp, "touchStart", [pt(300, 300, 1)]);
  await page.waitForTimeout(30);
  await touchEvent(cdp, "touchStart", [pt(300, 300, 1), pt(500, 300, 2)]);
  await page.waitForTimeout(300);
  await touchEvent(cdp, "touchEnd", []);
  await page.waitForTimeout(300);
  ok("two fingers = cancel (menu opened)", await page.evaluate("window.__game.game.menu.open"));

  // two fingers again → closes it
  await touchEvent(cdp, "touchStart", [pt(300, 300, 1)]);
  await page.waitForTimeout(30);
  await touchEvent(cdp, "touchStart", [pt(300, 300, 1), pt(500, 300, 2)]);
  await page.waitForTimeout(300);
  await touchEvent(cdp, "touchEnd", []);
  await page.waitForTimeout(400);
  ok("two fingers again closes menu", !(await page.evaluate("window.__game.game.menu.open")));
  ok("no stuck keys after gestures", (await page.evaluate(`["up","down","left","right","confirm","cancel"].filter(k=>window.__game.input.held(k)).length`)) === 0);

  ok("no console errors", page.__errs.length === 0, page.__errs[0] || "");
  await ctx.close();
}

// ============================================================ D-PAD
{
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 800, height: 600 } });
  const page = await newPage(ctx, { settings: JSON.stringify({ touch: "dpad" }) });
  await intoGame(page);
  console.log("\n[d-pad]");

  ok("d-pad visible", (await page.evaluate(`getComputedStyle(document.getElementById("touchui")).display`)) === "block");

  const before = await pos(page);
  await page.locator(".tui-right").dispatchEvent("pointerdown", { pointerId: 1, isPrimary: true });
  await page.waitForTimeout(600);
  ok("holding ▶ walks", before !== (await pos(page)), `${before} → ${await pos(page)}`);
  await page.locator(".tui-right").dispatchEvent("pointerup", { pointerId: 1, isPrimary: true });
  await page.waitForTimeout(300);
  const stopped = await pos(page);
  await page.waitForTimeout(400);
  ok("releasing ▶ stops", stopped === (await pos(page)));

  // X button opens the menu
  await page.locator(".tui-x").dispatchEvent("pointerdown", { pointerId: 2, isPrimary: true });
  await page.waitForTimeout(120);
  await page.locator(".tui-x").dispatchEvent("pointerup", { pointerId: 2, isPrimary: true });
  await page.waitForTimeout(300);
  ok("X opens the menu", await page.evaluate("window.__game.game.menu.open"));

  // Z button confirms inside the menu (selects an item -> plays a sound, stays open)
  await page.locator(".tui-x").dispatchEvent("pointerdown", { pointerId: 3, isPrimary: true });
  await page.waitForTimeout(100);
  await page.locator(".tui-x").dispatchEvent("pointerup", { pointerId: 3, isPrimary: true });
  await page.waitForTimeout(300);
  ok("X closes the menu", !(await page.evaluate("window.__game.game.menu.open")));

  // Z = confirm: face lamp, press Z button
  await page.evaluate(() => { const s = window.__game.game.state; s.x = 9; s.y = 7; s.facing = "left"; });
  await page.waitForTimeout(150);
  await page.locator(".tui-z").dispatchEvent("pointerdown", { pointerId: 4, isPrimary: true });
  await page.waitForTimeout(100);
  await page.locator(".tui-z").dispatchEvent("pointerup", { pointerId: 4, isPrimary: true });
  await page.waitForTimeout(400);
  ok("Z = confirm (opened dialogue)", await page.evaluate("window.__game.game.dialogue.active"));

  ok("4:3 screen → no overlap with dialogue box", (await dialogueOverlap(page)).length === 0);
  ok("4:3 screen reserves a bottom strip", await page.evaluate(`document.body.classList.contains("tui-bottom")`));

  ok("no console errors", page.__errs.length === 0, page.__errs[0] || "");
  await ctx.close();
}

// the dialogue box spans y 524..692 of the 960x720 canvas, nearly full width
async function dialogueOverlap(page) {
  return page.evaluate(() => {
    const c = document.getElementById("game").getBoundingClientRect();
    const sx = c.width / 960, sy = c.height / 720;
    const dlg = { l: c.left + 40 * sx, r: c.left + 920 * sx, t: c.top + 524 * sy, b: c.top + 692 * sy };
    const hits = [];
    for (const b of document.querySelectorAll(".tui-btn")) {
      const r = b.getBoundingClientRect();
      if (r.right > dlg.l && r.left < dlg.r && r.bottom > dlg.t && r.top < dlg.b) hits.push(b.className);
    }
    return hits;
  });
}

// ============================================================ PHONE LANDSCAPE
{
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 844, height: 390 } });
  const page = await newPage(ctx, { settings: JSON.stringify({ touch: "dpad" }) });
  await intoGame(page);
  console.log("\n[phone landscape 844x390]");
  ok("d-pad visible", (await page.evaluate(`getComputedStyle(document.getElementById("touchui")).display`)) === "block");
  ok("uses the side letterbox (no bottom strip)", !(await page.evaluate(`document.body.classList.contains("tui-bottom")`)));
  ok("no overlap with dialogue box", (await dialogueOverlap(page)).length === 0);
  ok("buttons are big enough to thumb (>=44px)", await page.evaluate(() =>
    [...document.querySelectorAll(".tui-btn")].every((b) => b.getBoundingClientRect().width >= 44)));
  await page.screenshot({ path: "tools/_shots/touch_landscape.png" });
  ok("no console errors", page.__errs.length === 0, page.__errs[0] || "");
  await ctx.close();
}

// ============================================================ PHONE PORTRAIT
{
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await newPage(ctx, { settings: JSON.stringify({ touch: "dpad" }) });
  await intoGame(page);
  console.log("\n[phone portrait 390x844]");
  ok("no overlap with dialogue box", (await dialogueOverlap(page)).length === 0);
  await page.screenshot({ path: "tools/_shots/touch_portrait.png" });
  ok("no console errors", page.__errs.length === 0, page.__errs[0] || "");
  await ctx.close();
}

// ============================================================ NO LOCKOUT
{
  // a save left behind by the old 3-state build, where "off" bricked the game
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 800, height: 600 } });
  const page = await newPage(ctx, { settings: JSON.stringify({ touch: "off" }) });
  await intoGame(page);
  console.log("\n[no lockout]");

  ok("stored 'off' self-heals to gestures", (await page.evaluate("window.__game.touch.scheme")) === "gestures");
  ok("only two schemes exist", (await page.evaluate("window.__game.touch.cycle()")) === "dpad");
  ok("d-pad always cycles back to gestures", (await page.evaluate("window.__game.touch.cycle()")) === "gestures");

  // persistence round-trip
  await page.evaluate("window.__game.touch.setScheme('dpad')");
  await page.reload();
  await page.waitForFunction("window.__ready === true", null, { timeout: 20000 });
  ok("scheme persisted across reload", (await page.evaluate("window.__game.touch.scheme")) === "dpad");
  ok("persisted to localStorage", (await page.evaluate(`JSON.parse(localStorage.getItem("the-last-page-settings")).touch`)) === "dpad");

  ok("no console errors", page.__errs.length === 0, page.__errs[0] || "");
  await ctx.close();
}

// ============================================================ TAP TO SELECT
// tap a canvas point given in 960x720 logical coords
async function tapLogical(page, cdp, lx, ly) {
  const p = await page.evaluate(([lx, ly]) => {
    const r = document.getElementById("game").getBoundingClientRect();
    return { x: r.left + lx * (r.width / 960), y: r.top + ly * (r.height / 720) };
  }, [lx, ly]);
  await touchEvent(cdp, "touchStart", [pt(p.x, p.y, 1)]);
  await page.waitForTimeout(60);
  await touchEvent(cdp, "touchEnd", []);
  await page.waitForTimeout(350);
}

for (const schemeUnderTest of ["gestures", "dpad"]) {
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 900, height: 700 } });
  const page = await newPage(ctx, { settings: JSON.stringify({ touch: schemeUnderTest }) });
  const cdp = await cdpFor(page);
  await intoGame(page);
  console.log(`\n[tap to select — ${schemeUnderTest}]`);

  // open the menu without any swiping
  await page.evaluate("window.__game.game.openMenu()");
  await page.waitForTimeout(250);
  ok("menu open", await page.evaluate("window.__game.game.menu.open"));

  // tap the "Options" tab directly (third tab, drawn at x 480..640, y 80..124)
  await tapLogical(page, cdp, 560, 100);
  ok("tapping a tab switches to it", (await page.evaluate("window.__game.game.menu.tab")) === 2);

  // tap the 5th option row ("Touch controls"), rows at y = 180 + i*50
  const before = await page.evaluate("window.__game.touch.scheme");
  await tapLogical(page, cdp, 400, 180 + 4 * 50 + 10);
  const after = await page.evaluate("window.__game.touch.scheme");
  ok("tapping a row activates it (no swipe needed)", before !== after, `${before} → ${after}`);
  ok("cursor moved to the tapped row", (await page.evaluate("window.__game.game.menu.index")) === 4);

  // tapping outside the panel closes the menu
  await tapLogical(page, cdp, 480, 700);
  ok("tap outside closes the menu", !(await page.evaluate("window.__game.game.menu.open")));

  ok("no console errors", page.__errs.length === 0, page.__errs[0] || "");
  await ctx.close();
}

// ============================================================ TITLE TAP + ESCAPE FROM D-PAD
{
  const ctx = await browser.newContext({ hasTouch: true, viewport: { width: 900, height: 700 } });
  const page = await newPage(ctx, { settings: JSON.stringify({ touch: "dpad" }) });
  const cdp = await cdpFor(page);
  await page.waitForTimeout(600);
  console.log("\n[title tap / escape from d-pad]");
  ok("on title", (await page.evaluate("window.__game.game.mode")) === "title");
  ok("starts in dpad", (await page.evaluate("window.__game.touch.scheme")) === "dpad");

  // options: Continue, New Game, Import save, Sound, Touch  (rows at 492 + i*40)
  await tapLogical(page, cdp, 500, 492 + 4 * 40 + 8);
  ok("tapping 'Touch:' on the title escapes d-pad → gestures",
     (await page.evaluate("window.__game.touch.scheme")) === "gestures");
  ok("still on the title", (await page.evaluate("window.__game.game.mode")) === "title");

  // and tapping "New Game" starts the game, no swiping at all
  await tapLogical(page, cdp, 500, 492 + 1 * 40 + 8);
  await page.waitForTimeout(2500);
  ok("tapping 'New Game' starts the game", (await page.evaluate("window.__game.game.mode")) === "map");

  ok("no console errors", page.__errs.length === 0, page.__errs[0] || "");
  await ctx.close();
}

// ============================================================ SOUND toggle
{
  const ctx = await browser.newContext({ viewport: { width: 980, height: 740 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(base + "/");            // fresh browser: no save, no settings
  await page.waitForFunction("window.__ready === true", null, { timeout: 20000 });
  await page.waitForTimeout(400);
  console.log("\n[sound]");

  ok("starts unmuted", (await page.evaluate("window.__game.audio.isMuted()")) === false);

  // no save → [New Game, Import save, Sound, Touch]. One press per frame:
  // `pressed` is a Set, so two keydowns inside one frame collapse to one hit().
  const settings = () => page.evaluate(`JSON.parse(localStorage.getItem("the-last-page-settings") || "null")`);
  await page.keyboard.press("ArrowDown"); await page.waitForTimeout(140);
  await page.keyboard.press("ArrowDown"); await page.waitForTimeout(140);
  ok("cursor is on the Sound option", (await page.evaluate("window.__game.game.title.index")) === 2);
  await page.keyboard.press("KeyZ");
  await page.waitForTimeout(300);
  ok("title Sound option mutes", (await page.evaluate("window.__game.audio.isMuted()")) === true);
  ok("stays on the title (does not start a game)", (await page.evaluate("window.__game.game.mode")) === "title");
  ok("mute written to settings", (await settings())?.muted === true);

  // cycling touch must NOT clobber the mute flag (shared settings object)
  await page.evaluate("window.__game.touch.cycle()");
  await page.waitForTimeout(100);
  const both = await settings();
  ok("touch cycle preserves muted", both?.muted === true, JSON.stringify(both));
  ok("touch cycle still saves scheme", both?.touch === "dpad", JSON.stringify(both));

  await page.reload();
  await page.waitForFunction("window.__ready === true", null, { timeout: 20000 });
  await page.waitForTimeout(300);
  ok("mute survives reload", (await page.evaluate("window.__game.audio.isMuted()")) === true);
  ok("scheme survives reload too", (await page.evaluate("window.__game.touch.scheme")) === "dpad");

  // M key still toggles, and unmuting persists as well
  await page.keyboard.press("KeyM");
  await page.waitForTimeout(250);
  ok("M unmutes", (await page.evaluate("window.__game.audio.isMuted()")) === false);
  ok("unmute persisted", (await settings())?.muted === false);

  ok("no console errors", errs.length === 0, errs[0] || "");
  await ctx.close();
}

// ============================================================ DESKTOP untouched
{
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 } }); // no hasTouch
  const page = await newPage(ctx);
  await intoGame(page);
  console.log("\n[desktop]");

  ok("not touch-capable", (await page.evaluate("window.__game.touch.capable")) === false);
  ok("d-pad hidden on desktop", (await page.evaluate(`getComputedStyle(document.getElementById("touchui")).display`)) === "none");

  const before = await pos(page);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(500);
  await page.keyboard.up("ArrowRight");
  await page.waitForTimeout(300);
  ok("keyboard still moves the player", before !== (await pos(page)), `${before} → ${await pos(page)}`);
  ok("no console errors", page.__errs.length === 0, page.__errs[0] || "");
  await ctx.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} FAILURE(S)` : "\nTOUCH SMOKE OK — all schemes verified");
process.exit(failures ? 1 : 0);
