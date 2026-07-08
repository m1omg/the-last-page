// dialogue.js — dialogue box with typewriter text, portraits and choices.
import { drawBox, drawText, wrapText, FONT } from "./ui.js";
import { assets } from "./assets.js";
import { audio } from "./audio.js";
import { input } from "./input.js";

const NAMES = {
  mira: "Mira", biscuit: "Sir Biscuit", wisp: "Wisp", ren: "Ren",
};
const PORTRAITS = {
  mira: (face) => `pt_mira_${face || "neutral"}`,
  biscuit: () => "pt_biscuit",
  wisp: () => "pt_wisp",
  ren: () => "pt_ren",
};

export class Dialogue {
  constructor() {
    this.active = false;
    this.queue = null; // resolve fn
    this.text = "";
    this.shown = 0;
    this.who = null;
    this.face = null;
    this.choice = null; // { options, index, resolve }
    this.blipT = 0;
    this.done = false;
  }

  say(who, face, text) {
    return new Promise((resolve) => {
      this.active = true;
      this.who = who;
      this.face = face;
      this.text = String(text);
      this.shown = 0;
      this.done = false;
      this.queue = resolve;
    });
  }

  ask(options) {
    return new Promise((resolve) => {
      this.active = true;
      this.choice = { options, index: 0, resolve };
    });
  }

  update(dt) {
    if (!this.active) return;
    if (this.choice) {
      const c = this.choice;
      if (input.hit("up")) { c.index = (c.index + c.options.length - 1) % c.options.length; audio.sfx("sfx_blip", 0.6); }
      if (input.hit("down")) { c.index = (c.index + 1) % c.options.length; audio.sfx("sfx_blip", 0.6); }
      if (input.hit("confirm")) {
        audio.sfx("sfx_confirm");
        const idx = c.index;
        this.choice = null;
        this.active = false;
        c.resolve(idx);
      }
      return;
    }
    if (this.queue == null) return;
    if (!this.done) {
      const speed = input.held("confirm") || input.held("cancel") ? 160 : 55; // chars/s
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.text.length, this.shown + speed * dt);
      if (Math.floor(this.shown) > before) {
        this.blipT -= dt;
        if (this.blipT <= 0) { audio.sfx("sfx_blip", 0.35); this.blipT = 0.055; }
      }
      if (this.shown >= this.text.length) this.done = true;
      if (input.hit("confirm") && this.shown > 2) {
        this.shown = this.text.length;
        this.done = true;
        input.flushKey?.("confirm");
      }
      return;
    }
    if (input.hit("confirm")) {
      const resolve = this.queue;
      this.queue = null;
      this.active = false;
      resolve();
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const W = 960, H = 720;
    if (this.queue != null || (!this.choice && this.active)) {
      const bx = 40, bw = W - 80;
      const portraitKey = this.who && PORTRAITS[this.who] ? PORTRAITS[this.who](this.face) : null;
      const img = portraitKey ? assets.img(portraitKey) : null;
      // size the box to fit the full text so long lines never overflow
      ctx.font = `21px ${FONT}`;
      const tx0 = img ? bx + 16 + 128 + 20 : bx + 26;
      const lineCount = wrapText(ctx, this.text, bx + bw - tx0 - 26).length;
      const textH = (this.who ? 30 : 0) + lineCount * 28;
      const bh = Math.max(168, textH + 44, img ? 168 : 0);
      const by = H - bh - 28;
      drawBox(ctx, bx, by, bw, bh, { seed: 7 });
      let tx = bx + 26;
      if (img) {
        const ps = 128;
        drawBox(ctx, bx + 16, by + 20, ps, ps, { seed: 3, fill: "#fff" });
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx + 18, by + 22, ps - 4, ps - 4);
        ctx.clip();
        ctx.drawImage(img, bx + 18, by + 22, ps - 4, ps - 4);
        ctx.restore();
        tx = bx + 16 + ps + 20;
      }
      let ty = by + 18;
      if (this.who) {
        const nm = NAMES[this.who] || this.who;
        drawText(ctx, nm, tx, ty, { size: 20, bold: true, color: "#7a4a2a" });
        ty += 30;
      }
      const visible = this.text.slice(0, Math.floor(this.shown));
      ctx.font = `21px ${FONT}`;
      const maxW = bx + bw - tx - 26;
      let y = ty;
      for (const line of wrapText(ctx, visible, maxW)) {
        drawText(ctx, line, tx, y, { size: 21 });
        y += 28;
      }
      if (this.done && this.queue) {
        const t = performance.now() / 300;
        drawText(ctx, "▼", bx + bw - 34, by + bh - 34 + Math.sin(t) * 3, { size: 18, color: "#7a4a2a" });
      }
    }
    if (this.choice) {
      const c = this.choice;
      ctx.font = `21px ${FONT}`;
      const w = Math.max(...c.options.map(o => ctx.measureText(o.label).width)) + 90;
      const h = c.options.length * 40 + 30;
      const bx = 960 - w - 60, by = 720 - 196 - h - 40;
      drawBox(ctx, bx, by, w, h, { seed: 11 });
      c.options.forEach((o, i) => {
        if (i === c.index) {
          drawText(ctx, "☞", bx + 18, by + 18 + i * 40, { size: 22, color: "#b8452e" });
        }
        drawText(ctx, o.label, bx + 52, by + 18 + i * 40, {
          size: 21, bold: i === c.index,
          color: i === c.index ? "#b8452e" : "#2a2320",
        });
      });
    }
  }
}
