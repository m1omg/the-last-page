// map.js — overworld scene: painted background, collision grid, entities,
// grid movement with smooth interpolation, party followers.
import { MAPS, TILE, COLS, ROWS } from "./data/maps.js";
import { assets } from "./assets.js";
import { audio } from "./audio.js";
import { input } from "./input.js";
import { drawBox, drawText, FONT } from "./ui.js";
import { runScript } from "./cutscene.js";

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export class MapScene {
  constructor(game) {
    this.game = game;
    this.moving = null; // { fx, fy, tx, ty, t }
    this.walkT = 0;
    this.trail = []; // recent tile positions for followers
    this.followPos = []; // smoothed follower pixel positions
    this.enemyRt = {};
    this.fleeGraceT = 0; // chase pause after fleeing a battle
    this.bannerT = 0;
    this.stepBlip = 0;
  }

  get def() { return MAPS[this.game.state.map]; }

  enterMap() {
    const d = this.def;
    this.moving = null;
    this.trail = [];
    this.followPos = [];
    this.enemyRt = {}; // runtime positions for chasing enemies
    this.fleeGraceT = 0;
    this.bannerT = 2.2;
    this.rescuePlayer();
    if (d.bgm) audio.playBgm(d.bgm);
    if (d.onEnter) this.game.queueScript(d.onEnter);
    // special case: first arrival in the dream hub
    if (this.game.state.map === "blank_page" && !this.game.state.flags.blank_intro_done) {
      this.game.queueScript("s_blank_first");
    }
  }

  // Safety net for loaded saves and re-traced grids: if the player would spawn
  // on a solid tile (e.g. an old save whose position is now inside furniture),
  // BFS out to the nearest walkable tile so they can never be trapped in a wall.
  rescuePlayer() {
    const st = this.game.state;
    const g = this.def.grid;
    const ok = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && g[y][x] === ".";
    if (ok(st.x, st.y)) return;
    const seen = new Set([`${st.x},${st.y}`]);
    const q = [[st.x, st.y]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx, ny = y + dy;
        const k = `${nx},${ny}`;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || seen.has(k)) continue;
        seen.add(k);
        if (ok(nx, ny)) { st.x = nx; st.y = ny; this.moving = null; return; }
        q.push([nx, ny]);
      }
    }
  }

  solid(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
    const d = this.def;
    if (d.grid[y][x] === "#") return true;
    for (const e of this.entitiesAlive()) {
      if (e.sprite && e.sprite !== "sparkle" && !e.walkable) {
        const [ex, ey] = this.entPos(e);
        if (x >= ex && x < ex + (e.w || 1) && y >= ey && y < ey + (e.h || 1)) return true;
      }
    }
    return false;
  }

  entitiesAlive() {
    const st = this.game.state;
    return this.def.entities.filter((e) => {
      if (!e.hidden) return true;
      return !!st.flags[e.hidden.flag] !== e.hidden.is;
    });
  }

  // chasing enemies live at a runtime position, everything else at its def
  entPos(e) {
    const rt = this.enemyRt && this.enemyRt[e.id];
    return rt ? [rt.x, rt.y] : [e.x, e.y];
  }

  entityAt(x, y, kind) {
    for (const e of this.entitiesAlive()) {
      if (!e[kind]) continue;
      const [ex, ey] = this.entPos(e);
      if (x >= ex && x < ex + (e.w || 1) && y >= ey && y < ey + (e.h || 1)) return e;
    }
    return null;
  }

  updateChase(dt) {
    // just fled a battle: every doodle loses track of the party for a moment,
    // or the still-adjacent one would re-trigger the fight before you can move
    if (this.fleeGraceT > 0) { this.fleeGraceT -= dt; return; }
    const st = this.game.state;
    for (const e of this.entitiesAlive()) {
      if (!e.sprite || !e.sprite.startsWith("enemy:") || !e.touch) continue;
      const rt = this.enemyRt[e.id] || (this.enemyRt[e.id] = { x: e.x, y: e.y, cool: Math.random() * 0.3 });
      const dx = st.x - rt.x, dy = st.y - rt.y;
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist <= 1) { this.game.runScript(e.touch); return; }
      if (dist > 5) continue;
      rt.cool -= dt;
      if (rt.cool > 0) continue;
      rt.cool = 0.34; // slower than the player, so escape is possible
      // step along the dominant axis, sidestep along the other if blocked
      const tries = Math.abs(dx) >= Math.abs(dy)
        ? [[Math.sign(dx), 0], [0, Math.sign(dy)]]
        : [[0, Math.sign(dy)], [Math.sign(dx), 0]];
      for (const [sx, sy] of tries) {
        if (!sx && !sy) continue;
        const nx = rt.x + sx, ny = rt.y + sy;
        if (nx === st.x && ny === st.y) { this.game.runScript(e.touch); return; }
        const grid = this.def.grid;
        if (grid[ny]?.[nx] !== ".") continue;
        if (this.entitiesAlive().some((o) => o !== e && o.sprite && this.entPos(o)[0] === nx && this.entPos(o)[1] === ny)) continue;
        rt.x = nx; rt.y = ny;
        break;
      }
    }
  }

  update(dt) {
    const g = this.game;
    const st = g.state;
    this.bannerT -= dt;
    if (g.busy()) return;

    this.updateChase(dt);
    if (g.busy()) return; // chase may have started a battle

    if (this.moving) {
      this.moving.t += dt / 0.17;
      this.walkT += dt;
      if (this.moving.t >= 1) {
        st.x = this.moving.tx;
        st.y = this.moving.ty;
        st.steps++;
        this.trail.unshift([st.x, st.y]);
        if (this.trail.length > 8) this.trail.pop();
        this.moving = null;
        this.stepBlip++;
        if (this.stepBlip % 2 === 0) audio.sfx("sfx_step", 0.5);
        const e = this.entityAt(st.x, st.y, "touch");
        if (e) { g.runScript(e.touch); return; }
      } else {
        return;
      }
    }

    if (input.hit("cancel")) { g.openMenu(); return; }
    if (input.hit("confirm")) {
      const [dx, dy] = DIRS[st.facing];
      const e = this.entityAt(st.x, st.y, "interact") || this.entityAt(st.x + dx, st.y + dy, "interact");
      if (e) { g.runScript(e.interact); return; }
    }

    for (const dir of ["up", "down", "left", "right"]) {
      if (input.held(dir)) {
        st.facing = dir;
        const [dx, dy] = DIRS[dir];
        const nx = st.x + dx, ny = st.y + dy;
        if (!this.solid(nx, ny)) {
          this.moving = { fx: st.x, fy: st.y, tx: nx, ty: ny, t: 0 };
        } else {
          // bumping into a solid entity (like a wild doodle) triggers it
          const e = this.entityAt(nx, ny, "touch");
          if (e && e.sprite) { g.runScript(e.touch); }
        }
        break;
      }
    }
  }

  playerPixelPos() {
    const st = this.game.state;
    let x = st.x, y = st.y;
    if (this.moving) {
      const m = this.moving;
      x = m.fx + (m.tx - m.fx) * Math.min(1, m.t);
      y = m.fy + (m.ty - m.fy) * Math.min(1, m.t);
    }
    return [x * TILE + TILE / 2, y * TILE + TILE / 2];
  }

  draw(ctx) {
    const g = this.game;
    const st = g.state;
    const d = this.def;
    const bgName = d.bgSwap && st.flags[d.bgSwap.flag] ? d.bgSwap.bg : d.bg;
    const bg = assets.img(bgName);
    if (bg) {
      ctx.drawImage(bg, 0, 0, 960, 720);
    } else {
      ctx.fillStyle = d.dark ? "#3c4048" : "#f4ecd8";
      ctx.fillRect(0, 0, 960, 720);
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (d.grid[y][x] === "#") {
          ctx.fillStyle = d.dark ? "#282b31" : "#cbbf9f";
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
      drawText(ctx, `[${st.map}]`, 12, 8, { size: 16, color: d.dark ? "#889" : "#987" });
    }

    // entity sprites
    for (const e of this.entitiesAlive()) {
      if (!e.sprite) continue;
      let [ex, ey] = this.entPos(e);
      // smooth chasing enemies between tiles
      if (this.enemyRt[e.id]) {
        const rt = this.enemyRt[e.id];
        if (rt.px == null) { rt.px = rt.x; rt.py = rt.y; }
        rt.px += (rt.x - rt.px) * 0.15;
        rt.py += (rt.y - rt.py) * 0.15;
        ex = rt.px; ey = rt.py;
      }
      const cx = (ex + (e.w || 1) / 2) * TILE;
      const cy = (ey + (e.h || 1) / 2) * TILE;
      if (e.sprite === "sparkle") {
        const t = performance.now() / 400 + e.x;
        // pulsing glow ring so hidden items read clearly against busy art
        const r = 26 + Math.sin(t * 1.3) * 6;
        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
        grad.addColorStop(0, "rgba(255,255,220,0.9)");
        grad.addColorStop(0.6, "rgba(255,240,160,0.45)");
        grad.addColorStop(1, "rgba(255,240,160,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(t) * 0.3);
        ctx.font = "34px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.8 + Math.sin(t * 2) * 0.2;
        ctx.fillText("✨", 0, Math.sin(t * 1.7) * 3);
        ctx.restore();
      } else if (e.sprite === "lantern") {
        const t = performance.now() / 600;
        const r = 30 + Math.sin(t) * 4;
        const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
        grad.addColorStop(0, "rgba(255,214,120,0.85)");
        grad.addColorStop(1, "rgba(255,214,120,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.font = "22px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🏮", cx, cy);
      } else if (e.sprite === "book") {
        // the battle guide in the hub — soft paper-white glow so it reads as
        // "you can read me" against the busy crayon art, like the lantern does
        const t = performance.now() / 800;
        const r = 26 + Math.sin(t) * 3;
        const grad = ctx.createRadialGradient(cx, cy, 3, cx, cy, r);
        grad.addColorStop(0, "rgba(255,250,230,0.75)");
        grad.addColorStop(1, "rgba(255,250,230,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        const img = assets.img("sp_guidebook");
        const bob = Math.sin(t * 1.4) * 2;
        if (img) {
          drawSprite(ctx, img, cx, cy + bob, TILE * 1.15, "center");
        } else {
          ctx.font = "26px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("📖", cx, cy + bob);
        }
      } else if (e.sprite.startsWith("enemy:")) {
        const img = assets.img(e.sprite.slice(6));
        const bob = Math.sin(performance.now() / 350 + e.x) * 3;
        if (img) {
          drawSprite(ctx, img, cx, cy + bob - 6, TILE * 1.35, "center");
        } else {
          drawBlobFallback(ctx, cx, cy + bob, "#5a5a6e");
        }
      } else {
        const img = assets.img(e.sprite);
        const bob = Math.sin(performance.now() / 500 + e.y) * 2;
        if (img) {
          drawSprite(ctx, img, cx, cy + 14 + bob, TILE * 1.3, "feet");
        } else {
          drawBlobFallback(ctx, cx, cy + bob, e.sprite === "sp_wisp" ? "#e8a53a" : "#b07b3f");
        }
      }
    }

    // followers chase the trail with smooth interpolation + a walk bounce
    const now = performance.now();
    const fdt = Math.min(0.05, (now - (this._followT || now)) / 1000);
    this._followT = now;
    const followers = st.party.slice(1);
    followers.forEach((m, i) => {
      const pos = this.trail[Math.min(this.trail.length - 1, i * 2 + 1)];
      if (!pos) return;
      const tx = pos[0] * TILE + TILE / 2;
      const ty = pos[1] * TILE + TILE / 2;
      if (!this.followPos[i]) this.followPos[i] = { x: tx, y: ty };
      const f = this.followPos[i];
      const k = Math.min(1, fdt * 9);
      f.x += (tx - f.x) * k;
      f.y += (ty - f.y) * k;
      const speed = Math.hypot(tx - f.x, ty - f.y);
      // little hops while moving, gentle idle sway when standing
      const hop = speed > 2 ? Math.abs(Math.sin(now / 90 + i * 2)) * 5 : Math.sin(now / 400 + i * 2) * 1.5;
      const img = assets.img(m.id === "biscuit" ? "sp_biscuit" : "sp_wisp");
      if (img) {
        drawSprite(ctx, img, f.x, f.y + 12 - hop, TILE * 1.2, "feet");
      } else {
        drawBlobFallback(ctx, f.x, f.y - hop, m.id === "biscuit" ? "#b07b3f" : "#e8a53a");
      }
    });

    // player
    const [px, py] = this.playerPixelPos();
    this.drawMira(ctx, px, py);

    if (g.debug) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (d.grid[y][x] === "#") {
          ctx.fillStyle = "#f00";
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, 720); ctx.stroke(); }
      for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * TILE); ctx.lineTo(960, y * TILE); ctx.stroke(); }
      ctx.restore();
    }

    if (this.bannerT > 0 && MAP_NAMES[st.map]) {
      const a = Math.min(1, this.bannerT);
      ctx.save();
      ctx.globalAlpha = a;
      drawBox(ctx, 330, 30, 300, 48, { seed: 5 });
      drawText(ctx, MAP_NAMES[st.map], 480, 40, { size: 22, bold: true, align: "center", color: "#5a4634" });
      ctx.restore();
    }
  }

  drawMira(ctx, px, py) {
    const st = this.game.state;
    const frame = this.moving ? (Math.floor(this.walkT / 0.14) % 2) : 0;
    const key = `sp_mira_${st.facing[0]}${frame}`;
    const img = assets.img(key);
    if (img) {
      drawSprite(ctx, img, px, py + 14, TILE * 1.45, "feet");
      return;
    }
    // fallback: hand-drawn vector chibi Mira
    const bob = this.moving ? Math.sin(this.walkT * 18) * 2 : 0;
    ctx.save();
    ctx.translate(px, py + bob - 6);
    if (st.facing === "left") ctx.scale(-1, 1);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#3a2c22";
    // body (coat)
    ctx.fillStyle = "#7d9bc0";
    ctx.beginPath();
    ctx.moveTo(-9, -8); ctx.lineTo(9, -8); ctx.lineTo(11, 12); ctx.lineTo(-11, 12);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // feet
    ctx.fillStyle = "#5a4634";
    ctx.fillRect(-8 + (frame === 1 ? 2 : 0), 12, 6, 4);
    ctx.fillRect(2 - (frame === 1 ? 2 : 0), 12, 6, 4);
    // scarf
    ctx.fillStyle = "#e0b64a";
    ctx.fillRect(-9, -10, 18, 6);
    // head
    ctx.fillStyle = "#f7dfc8";
    ctx.beginPath(); ctx.arc(0, -22, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // hair
    ctx.fillStyle = "#4a352a";
    ctx.beginPath(); ctx.arc(0, -25, 13, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    if (st.facing === "up") { ctx.beginPath(); ctx.arc(0, -22, 13, 0, Math.PI * 2); ctx.fill(); }
    // ribbon
    ctx.fillStyle = "#c94f3d";
    ctx.beginPath(); ctx.arc(-9, -30, 4, 0, Math.PI * 2); ctx.fill();
    // face
    if (st.facing !== "up") {
      ctx.fillStyle = "#3a2c22";
      const dx = st.facing === "down" ? 0 : 4;
      ctx.beginPath(); ctx.arc(-4 + dx, -21, 1.6, 0, Math.PI * 2); ctx.fill();
      if (st.facing === "down") { ctx.beginPath(); ctx.arc(4, -21, 1.6, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
}

// draw an image at its native aspect ratio, `size` = target height.
// anchor "feet": (cx, cy) is bottom-center; "center": image center.
function drawSprite(ctx, img, cx, cy, size, anchor) {
  const h = size;
  const w = h * (img.width / img.height);
  if (anchor === "feet") ctx.drawImage(img, cx - w / 2, cy - h, w, h);
  else ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function drawBlobFallback(ctx, cx, cy, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#2a2320";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10, 14, 16, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(cx - 5, cy - 14, 3, 0, Math.PI * 2); ctx.arc(cx + 5, cy - 14, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export const MAP_NAMES = {
  real_bedroom: "Mira's Room",
  real_hall: "Home",
  real_street: "Morning Street",
  hospital_room: "Room 314",
  blank_page: "The Blank Page",
  meadow_1: "Crayon Meadow",
  meadow_2: "Picnic Clearing",
  woods_1: "Origami Woods",
  woods_2: "Candle Shrine",
  bay_1: "Button Bay",
  bay_2: "Lighthouse Cliff",
  keeper_home: "The Keeper's Cottage",
  depths_1: "The Smudge Depths",
  depths_2: "The Last Page",
};
