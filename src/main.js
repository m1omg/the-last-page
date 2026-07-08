// main.js — bootstrap, scene management, title screen, CG viewer, endings.
import { input } from "./input.js";
import { audio } from "./audio.js";
import { assets } from "./assets.js";
import { drawBox, drawText, wrapText, FONT } from "./ui.js";
import { newGameState, saveGame, loadGame, hasSave, importSave } from "./state.js";
import { Dialogue } from "./dialogue.js";
import { runScript } from "./cutscene.js";
import { MapScene } from "./map.js";
import { BattleScene } from "./battle.js";
import { Menu } from "./menu.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const game = {
  state: null,
  mode: "boot", // boot | title | map | battle | cg | credits | gameover
  dialogue: new Dialogue(),
  menu: null,
  mapScene: null,
  battle: null,
  cg: null, // { img, lines, lineIdx, shown }
  fade: 1,
  fadeTarget: 1,
  fadeMs: 600,
  cutsceneDepth: 0,
  abortCutscenes: false,
  debug: new URLSearchParams(location.search).has("debug"),
  title: { index: 0, t: 0 },
  credits: null,
  gameoverIndex: 0,

  busy() {
    return this.dialogue.active || this.cutsceneDepth > 0 || (this.menu && this.menu.open) || this.fading();
  },
  fading() { return Math.abs(this.fade - this.fadeTarget) > 0.01; },

  fadeOut(ms = 600) {
    this.fadeTarget = 0;
    this.fadeMs = ms;
    return this.waitFor(() => this.fade <= 0.01).then(() => { this.fade = 0; });
  },
  fadeIn(ms = 600) {
    this.fadeTarget = 1;
    this.fadeMs = ms;
    return this.waitFor(() => this.fade >= 0.99).then(() => { this.fade = 1; });
  },
  wait(ms) { return new Promise((r) => setTimeout(r, ms)); },
  waitFor(cond) {
    return new Promise((r) => {
      const tick = () => (cond() ? r() : requestAnimationFrame(tick));
      tick();
    });
  },
  shakeMsLeft: 0,
  shake(ms) { this.shakeMsLeft = ms; },

  runScript(s) {
    runScript(this, s).catch((e) => console.error("script error", e));
  },

  // defers until any current cutscene finishes (map onEnter during a tp)
  async queueScript(s) {
    await this.waitFor(() => this.cutsceneDepth === 0 && !this.dialogue.active);
    this.runScript(s);
  },

  teleport(map, x, y, facing) {
    this.state.map = map;
    this.state.x = x;
    this.state.y = y;
    this.state.facing = facing || "down";
    this.mode = "map";
    this.mapScene.enterMap();
  },

  startBattle(cfg) {
    return new Promise((resolve) => {
      this.mode = "battle";
      this.battle = new BattleScene(this, cfg, async (result) => {
        this.battle = null;
        this.mode = "map";
        const d = this.mapScene.def;
        if (d.bgm) audio.playBgm(d.bgm);
        if (result === "lose" && !cfg.final) {
          await this.gameOver();
          resolve("lose");
          return;
        }
        resolve(result);
      });
    });
  },

  showCG(img, lines) {
    return new Promise((resolve) => {
      this.cg = { img, lines, lineIdx: 0, shown: 0, resolve, prevMode: this.mode };
      this.mode = "cg";
    });
  },

  async gameOver() {
    this.mode = "gameover";
    this.gameoverIndex = 0;
    audio.stopBgm({ fade: 1.5 });
    audio.sfx("sfx_defeat");
    await this.waitFor(() => this.mode !== "gameover");
  },

  saveNow() {
    return saveGame(this.state);
  },

  openMenu() {
    this.menu.show();
  },

  async toTitle() {
    this.abortCutscenes = true;
    await this.fadeOut(800);
    audio.stopBgm();
    this.abortCutscenes = false;
    this.mode = "title";
    this.title = { index: 0, t: 0 };
    audio.playBgm("bgm_title");
    await this.fadeIn(800);
  },

  async newGame() {
    await this.fadeOut(700);
    this.state = newGameState();
    window.__game.state = this.state;
    this.mode = "map";
    this.mapScene.enterMap();
    await this.fadeIn(400);
    this.runScript("s_intro");
  },

  async continueGame() {
    const s = loadGame();
    if (!s) return;
    await this.fadeOut(700);
    this.state = s;
    window.__game.state = this.state;
    this.mode = "map";
    this.mapScene.enterMap();
    await this.fadeIn(700);
  },

  async playEnding(which) {
    if (which === "true") {
      this.state.flags.true_ending_walk = true;
      await runScript(this, "s_ending_true");
      return;
    }
    if (which === "page") {
      await runScript(this, "s_ending_page");
      return;
    }
    if (which === "credits") {
      this.mode = "credits";
      this.credits = { t: 0 };
      audio.playBgm("bgm_ending");
    }
  },
};
game.menu = new Menu(game);
game.mapScene = new MapScene(game);

// debug / smoke-test hooks
window.__game = {
  get game() { return game; },
  state: null,
  input,
  tp: (m, x, y) => game.teleport(m, x, y, "down"),
  setFlag: (k, v) => { game.state.flags[k] = v; },
  setPages: (n) => { game.state.pages = n; },
  give: (item, n = 1) => { game.state.inventory[item] = (game.state.inventory[item] || 0) + n; },
  mode: () => game.mode,
  busy: () => game.busy(),
};

// ------------------------------------------------------------ title screen
function titleOptions() {
  return hasSave()
    ? ["Continue", "New Game", "Import save"]
    : ["New Game", "Import save"];
}

function updateTitle(dt) {
  const t = game.title;
  t.t += dt;
  if (t.noticeT > 0) t.noticeT -= dt;
  const opts = titleOptions();
  if (t.index >= opts.length) t.index = 0;
  if (input.hit("up")) { t.index = (t.index + opts.length - 1) % opts.length; audio.sfx("sfx_blip", 0.6); }
  if (input.hit("down")) { t.index = (t.index + 1) % opts.length; audio.sfx("sfx_blip", 0.6); }
  if (input.hit("confirm")) {
    audio.unlock();
    const choice = opts[t.index];
    if (choice === "Import save") {
      audio.sfx("sfx_confirm");
      importSave((ok) => {
        if (ok) { audio.sfx("sfx_save"); game.continueGame(); }
        else { audio.sfx("sfx_cancel"); game.title.notice = "That wasn't a valid save file."; game.title.noticeT = 3; }
      });
      return;
    }
    audio.sfx("sfx_confirm");
    if (choice === "New Game") game.newGame();
    else game.continueGame();
  }
}

function drawTitle() {
  const img = assets.img("cg_title");
  if (img) {
    ctx.drawImage(img, 0, 0, 960, 720);
  } else {
    ctx.fillStyle = "#f4ecd8";
    ctx.fillRect(0, 0, 960, 720);
  }
  ctx.save();
  ctx.fillStyle = "rgba(30,20,15,0.25)";
  ctx.fillRect(0, 0, 960, 720);
  const wobble = Math.sin(game.title.t * 1.1) * 4;
  ctx.font = `bold 64px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineWidth = 9;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(58,40,28,0.9)";
  ctx.strokeText("The Last Page", 480, 90 + wobble);
  ctx.fillStyle = "#fff6e3";
  ctx.fillText("The Last Page", 480, 90 + wobble);
  ctx.font = `20px ${FONT}`;
  ctx.lineWidth = 5;
  ctx.strokeText("a small story about a shared sketchbook", 480, 176 + wobble);
  ctx.fillStyle = "#f4e0c0";
  ctx.fillText("a small story about a shared sketchbook", 480, 176 + wobble);

  const opts = titleOptions();
  ctx.textAlign = "left";
  opts.forEach((o, i) => {
    const sel = i === game.title.index;
    const y = 520 + i * 46;
    ctx.font = `${sel ? "bold " : ""}24px ${FONT}`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(58,40,28,0.85)";
    if (sel) { ctx.strokeText("☞", 400, y); ctx.fillStyle = "#ffd9a0"; ctx.fillText("☞", 400, y); }
    ctx.strokeText(o, 440, y);
    ctx.fillStyle = sel ? "#fff6e3" : "#d8c8b0";
    ctx.fillText(o, 440, y);
  });
  ctx.textAlign = "center";
  if (game.title.noticeT > 0) {
    ctx.font = `bold 18px ${FONT}`;
    ctx.lineWidth = 5;
    ctx.strokeText(game.title.notice, 480, 665);
    ctx.fillStyle = "#ffd9a0";
    ctx.fillText(game.title.notice, 480, 665);
  }
  ctx.font = `15px ${FONT}`;
  ctx.lineWidth = 4;
  ctx.strokeText("Z / Enter — choose · arrows — move · M — sound", 480, 690);
  ctx.fillStyle = "#e8d8ba";
  ctx.fillText("Z / Enter — choose · arrows — move · M — sound", 480, 690);
  ctx.restore();
}

// ------------------------------------------------------------ CG viewer
function updateCG(dt) {
  const cg = game.cg;
  if (!cg) return;
  const cur = cg.lines[cg.lineIdx];
  if (cur == null) { finishCG(); return; }
  const speed = input.held("confirm") ? 160 : 45;
  cg.shown = Math.min(cur.length, cg.shown + speed * dt);
  if (input.hit("confirm")) {
    if (cg.shown < cur.length && cg.shown > 3) cg.shown = cur.length;
    else {
      cg.lineIdx++;
      cg.shown = 0;
      audio.sfx("sfx_blip", 0.4);
      if (cg.lineIdx >= cg.lines.length) finishCG();
    }
  }
}
function finishCG() {
  const cg = game.cg;
  game.cg = null;
  game.mode = cg.prevMode === "cg" ? "map" : cg.prevMode;
  cg.resolve();
}
function drawCG() {
  const cg = game.cg;
  ctx.fillStyle = "#181410";
  ctx.fillRect(0, 0, 960, 720);
  const img = assets.img(cg.img);
  if (img) {
    const h = 560;
    const w = Math.min(920, img.width * (h / img.height));
    ctx.drawImage(img, 480 - w / 2, 20, w, h);
  } else {
    drawBox(ctx, 120, 60, 720, 480, { seed: 55, fill: "#efe6d0" });
    drawText(ctx, `[ ${cg.img} ]`, 480, 280, { size: 24, align: "center", color: "#8a7a68" });
  }
  const shownLines = cg.lines.slice(0, cg.lineIdx);
  const cur = cg.lines[cg.lineIdx];
  let text = shownLines.slice(-2).join("\n");
  if (cur != null) text += (text ? "\n" : "") + cur.slice(0, Math.floor(cg.shown));
  drawBox(ctx, 60, 596, 840, 106, { seed: 66, fill: "rgba(24,20,16,0.85)", stroke: "#d8c8b0" });
  ctx.font = `19px ${FONT}`;
  let y = 610;
  for (const line of text.split("\n").slice(-3)) {
    for (const l of wrapText(ctx, line, 790)) {
      drawText(ctx, l, 86, y, { size: 19, color: "#f4e8d0" });
      y += 26;
    }
  }
}

// ------------------------------------------------------------ credits
const CREDITS = [
  "THE LAST PAGE",
  "",
  "a game made with love, crayons and code",
  "",
  "story · code · music",
  "Claude (Fable 5)",
  "",
  "illustrations",
  "GPT Image 2, via a very patient Codex",
  "",
  "inspired by the feelings of",
  "OMORI · Undertale · End Roll · Ib · Re:Kinder",
  "with an original story and world",
  "",
  "and dedicated to everyone",
  "who still owes somebody a visit.",
  "",
  "Go on. They'd love to hear from you.",
  "",
  "♥",
  "",
  "press Z to return to the title",
];
function updateCredits(dt) {
  game.credits.t += dt;
  if (input.hit("confirm") && game.credits.t > 4) {
    game.credits = null;
    game.toTitle();
  }
}
function drawCredits() {
  ctx.fillStyle = "#141210";
  ctx.fillRect(0, 0, 960, 720);
  const scroll = Math.min(game.credits.t * 34, CREDITS.length * 40 - 200);
  CREDITS.forEach((line, i) => {
    const y = 720 - scroll + i * 40;
    if (y < -40 || y > 760) return;
    drawText(ctx, line, 480, y, {
      size: i === 0 ? 34 : 20, bold: i === 0, align: "center",
      color: i === 0 ? "#fff6e3" : "#d8c8b0",
    });
  });
}

// ------------------------------------------------------------ game over
function updateGameover(dt) {
  const opts = hasSave() ? ["Return to the last warm lamp", "Back to the title"] : ["Back to the title"];
  if (input.hit("up") || input.hit("down")) { game.gameoverIndex = (game.gameoverIndex + 1) % opts.length; audio.sfx("sfx_blip", 0.5); }
  if (input.hit("confirm")) {
    audio.sfx("sfx_confirm");
    if (opts[game.gameoverIndex].startsWith("Return")) {
      game.continueGame();
    } else {
      game.toTitle();
    }
  }
}
function drawGameover() {
  ctx.fillStyle = "#100e0c";
  ctx.fillRect(0, 0, 960, 720);
  drawText(ctx, "the page crumples...", 480, 240, { size: 36, align: "center", color: "#c8b8a0" });
  drawText(ctx, "but stories can be smoothed out and tried again.", 480, 300, { size: 20, align: "center", color: "#8a7a68" });
  const opts = hasSave() ? ["Return to the last warm lamp", "Back to the title"] : ["Back to the title"];
  opts.forEach((o, i) => {
    const sel = i === game.gameoverIndex;
    if (sel) drawText(ctx, "☞", 330, 420 + i * 48, { size: 22, color: "#ffd9a0" });
    drawText(ctx, o, 365, 420 + i * 48, { size: 22, bold: sel, color: sel ? "#fff6e3" : "#a89880" });
  });
}

// ------------------------------------------------------------ main loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // fade envelope
  const dir = Math.sign(game.fadeTarget - game.fade);
  if (dir !== 0) {
    game.fade += dir * dt / (game.fadeMs / 1000);
    if ((dir > 0 && game.fade >= game.fadeTarget) || (dir < 0 && game.fade <= game.fadeTarget)) {
      game.fade = game.fadeTarget;
    }
  }
  if (game.shakeMsLeft > 0) game.shakeMsLeft -= dt * 1000;

  if (input.hit("mute")) audio.toggleMute();

  // update
  if (game.mode === "title") updateTitle(dt);
  else if (game.mode === "map") {
    game.menu.update(dt);
    game.dialogue.update(dt);
    if (!game.menu.open) game.mapScene.update(dt);
  } else if (game.mode === "battle" && game.battle) {
    game.battle.update(dt);
    game.dialogue.update(dt);
  } else if (game.mode === "cg") updateCG(dt);
  else if (game.mode === "credits") updateCredits(dt);
  else if (game.mode === "gameover") updateGameover(dt);

  // draw
  ctx.save();
  if (game.shakeMsLeft > 0) ctx.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
  ctx.clearRect(-20, -20, 1000, 760);
  if (game.mode === "boot") {
    ctx.fillStyle = "#14121a";
    ctx.fillRect(0, 0, 960, 720);
    drawText(ctx, "loading the sketchbook...", 480, 340, { size: 24, align: "center", color: "#d8c8b0" });
  } else if (game.mode === "title") drawTitle();
  else if (game.mode === "map") {
    game.mapScene.draw(ctx);
    game.dialogue.draw(ctx);
    game.menu.draw(ctx);
  } else if (game.mode === "battle" && game.battle) {
    game.battle.draw(ctx);
    game.dialogue.draw(ctx);
  } else if (game.mode === "cg") drawCG();
  else if (game.mode === "credits") drawCredits();
  else if (game.mode === "gameover") drawGameover();
  ctx.restore();

  // fade overlay
  if (game.fade < 1) {
    ctx.fillStyle = `rgba(10,8,6,${1 - game.fade})`;
    ctx.fillRect(0, 0, 960, 720);
  }

  input.flush();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ boot
(async function boot() {
  const unlock = () => audio.unlock();
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("pointerdown", unlock, { once: true });
  await Promise.all([assets.init(), audio.init()]);
  game.mode = "title";
  game.fade = 0;
  game.fadeTarget = 1;
  game.fadeMs = 1500;
  audio.playBgm("bgm_title");
  window.__ready = true;
})();
requestAnimationFrame(frame);
