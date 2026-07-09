// menu.js — the pocket menu: party, items, pages, options.
import { ITEMS } from "./data/items.js";
import { audio } from "./audio.js";
import { input } from "./input.js";
import { drawBox, drawText, drawBar, EMOTION_COLOR } from "./ui.js";
import { exportSave, importSave } from "./state.js";
import { touch } from "./touch.js";

export class Menu {
  constructor(game) {
    this.game = game;
    this.open = false;
    this.tab = 0; // 0 items, 1 party info, 2 options
    this.index = 0;
    this.sub = null; // { item, index } choosing member for item
    this.notice = "";   // transient confirmation line (e.g. "Progress saved.")
    this.noticeT = 0;
  }

  toast(msg) { this.notice = msg; this.noticeT = 3.0; }

  // Options tab entries — label + action, kept in one place so update & draw agree.
  optionItems() {
    const g = this.game;
    return [
      { label: "Save game", run: () => {
          const ok = g.saveNow();
          audio.sfx(ok ? "sfx_save" : "sfx_cancel");
          this.toast(ok ? "Progress saved." : "Save failed.");
        } },
      { label: "Export save to a file", run: () => {
          const ok = exportSave();
          audio.sfx(ok ? "sfx_confirm" : "sfx_cancel");
          this.toast(ok ? "Save downloaded." : "Nothing to export yet - save first.");
        } },
      { label: "Import save from a file", run: () => {
          importSave((ok, why) => {
            if (ok) {
              audio.sfx("sfx_save");
              this.open = false;
              this.sub = null;
              g.continueGame();
            } else {
              audio.sfx("sfx_cancel");
              this.toast("Import failed: " + (why || "unknown"));
            }
          });
        } },
      { label: `Sound: ${audio.isMuted() ? "OFF" : "ON"}`, run: () => {
          audio.toggleMute();
          audio.sfx("sfx_confirm");
        } },
      { label: `Touch controls: ${touch.label()}`, run: () => {
          const s = touch.cycle();
          audio.sfx("sfx_confirm");
          this.toast(s === "off" ? "Touch controls off." : `Touch: ${touch.label()}.`);
        } },
      { label: "Return to the title", run: () => {
          this.open = false;
          g.toTitle();
        } },
    ];
  }

  show() {
    this.open = true;
    this.tab = 0;
    this.index = 0;
    this.sub = null;
    audio.sfx("sfx_confirm", 0.7);
  }

  itemList() {
    const inv = this.game.state.inventory;
    return Object.keys(inv).filter((id) => ITEMS[id] && inv[id] > 0)
      .sort((a, b) => (ITEMS[a].key ? 1 : 0) - (ITEMS[b].key ? 1 : 0));
  }

  update(dt) {
    if (!this.open) return;
    const st = this.game.state;
    if (this.noticeT > 0) this.noticeT -= dt;
    if (this.sub) {
      if (input.hit("up")) { this.sub.index = (this.sub.index + st.party.length - 1) % st.party.length; audio.sfx("sfx_blip", 0.5); }
      if (input.hit("down")) { this.sub.index = (this.sub.index + 1) % st.party.length; audio.sfx("sfx_blip", 0.5); }
      if (input.hit("cancel")) { this.sub = null; audio.sfx("sfx_cancel"); }
      if (input.hit("confirm")) {
        const m = st.party[this.sub.index];
        const item = ITEMS[this.sub.item];
        if (m.hp <= 0 || (item.effect.hp && m.hp >= m.maxHp) || (item.effect.ink && m.ink >= m.maxInk)) {
          audio.sfx("sfx_cancel");
        } else {
          st.inventory[this.sub.item]--;
          if (!st.inventory[this.sub.item]) delete st.inventory[this.sub.item];
          if (item.effect.hp) m.hp = Math.min(m.maxHp, m.hp + item.effect.hp);
          if (item.effect.ink) m.ink = Math.min(m.maxInk, m.ink + item.effect.ink);
          audio.sfx("sfx_heal");
          this.sub = null;
        }
      }
      return;
    }
    if (input.hit("cancel")) {
      this.open = false;
      // the map scene runs later this same frame and must not see this press,
      // or it would instantly reopen the menu
      input.consume("cancel");
      audio.sfx("sfx_cancel");
      return;
    }
    if (input.hit("left")) { this.tab = (this.tab + 2) % 3; this.index = 0; audio.sfx("sfx_blip", 0.5); }
    if (input.hit("right")) { this.tab = (this.tab + 1) % 3; this.index = 0; audio.sfx("sfx_blip", 0.5); }
    if (this.tab === 0) {
      const list = this.itemList();
      if (list.length) {
        if (input.hit("up")) { this.index = (this.index + list.length - 1) % list.length; audio.sfx("sfx_blip", 0.5); }
        if (input.hit("down")) { this.index = (this.index + 1) % list.length; audio.sfx("sfx_blip", 0.5); }
        if (input.hit("confirm")) {
          const id = list[this.index];
          if (ITEMS[id].field && !ITEMS[id].key) { this.sub = { item: id, index: 0 }; audio.sfx("sfx_confirm"); }
          else audio.sfx("sfx_cancel");
        }
      }
    } else if (this.tab === 2) {
      const list = this.optionItems();
      if (input.hit("up")) { this.index = (this.index + list.length - 1) % list.length; audio.sfx("sfx_blip", 0.5); }
      if (input.hit("down")) { this.index = (this.index + 1) % list.length; audio.sfx("sfx_blip", 0.5); }
      if (input.hit("confirm")) {
        list[this.index].run();
        // this press was ours; don't let the map scene act on it if we closed
        input.consume("confirm");
      }
    }
  }

  draw(ctx) {
    if (!this.open) return;
    const st = this.game.state;
    ctx.fillStyle = "rgba(30,24,20,0.55)";
    ctx.fillRect(0, 0, 960, 720);
    drawBox(ctx, 90, 60, 780, 600, { seed: 77 });
    const tabs = ["Pockets", "Friends", "Options"];
    tabs.forEach((tName, i) => {
      const sel = i === this.tab;
      drawBox(ctx, 120 + i * 180, 80, 160, 44, { seed: 80 + i, fill: sel ? "#f4d8a8" : "rgba(255,252,240,0.9)" });
      drawText(ctx, tName, 200 + i * 180, 90, { size: 20, bold: sel, align: "center", color: sel ? "#8a4a2a" : "#6a5a4a" });
    });
    drawText(ctx, `Torn pages: ${st.pages}/4`, 700, 92, { size: 18, color: "#7a4a2a" });

    if (this.tab === 0) {
      const list = this.itemList();
      if (!list.length) {
        drawText(ctx, "Your pockets are empty. (Sad crumb noise.)", 480, 300, { size: 20, align: "center", color: "#8a7a68" });
      }
      list.forEach((id, i) => {
        const item = ITEMS[id];
        const sel = i === this.index;
        if (sel) drawText(ctx, "☞", 140, 160 + i * 40, { size: 20, color: "#b8452e" });
        drawText(ctx, `${item.name}${item.key ? "  ◆" : `  ×${st.inventory[id]}`}`, 175, 160 + i * 40,
          { size: 20, bold: sel, color: item.key ? "#7a5a8a" : "#2a2320" });
      });
      const cur = list[this.index];
      if (cur) drawText(ctx, ITEMS[cur].desc, 140, 590, { size: 18, color: "#5a4634" });
      if (this.sub) {
        drawBox(ctx, 560, 200, 260, st.party.length * 44 + 30, { seed: 99 });
        st.party.forEach((m, i) => {
          const sel = i === this.sub.index;
          if (sel) drawText(ctx, "☞", 575, 216 + i * 44, { size: 20, color: "#b8452e" });
          drawText(ctx, `${m.name}  ${m.hp}/${m.maxHp}`, 605, 216 + i * 44, { size: 19, bold: sel });
        });
      }
    } else if (this.tab === 1) {
      st.party.forEach((m, i) => {
        const by = 150 + i * 160;
        drawBox(ctx, 130, by, 700, 140, { seed: 90 + i });
        drawText(ctx, m.name, 160, by + 14, { size: 22, bold: true, color: "#5a4634" });
        drawBar(ctx, 160, by + 55, 240, 20, m.hp / m.maxHp, "#c25a4a", `HP ${m.hp}/${m.maxHp}`);
        drawBar(ctx, 160, by + 85, 240, 20, m.ink / m.maxInk, "#5a7fc4", `INK ${m.ink}/${m.maxInk}`);
        drawText(ctx, `Attack ${m.atk}   Defense ${m.def}   Speed ${m.spd}`, 440, by + 55, { size: 18, color: "#5a4634" });
        drawText(ctx, FLAVOR[m.id] || "", 440, by + 88, { size: 16, color: "#8a7a68" });
      });
    } else {
      const list = this.optionItems();
      list.forEach((o, i) => {
        const sel = i === this.index;
        if (sel) drawText(ctx, "☞", 200, 180 + i * 50, { size: 20, color: "#b8452e" });
        drawText(ctx, o.label, 235, 180 + i * 50, { size: 20, bold: sel });
      });
      drawText(ctx, "Save anywhere here. Warm lamps save AND fully heal the party.", 200, 470, { size: 17, color: "#8a7a68" });
      drawText(ctx, "Export downloads a backup file; Import loads one back in.", 200, 496, { size: 17, color: "#8a7a68" });
      if (this.noticeT > 0) {
        const a = Math.min(1, this.noticeT);
        ctx.save();
        ctx.globalAlpha = a;
        drawBox(ctx, 200, 540, 460, 46, { seed: 61, fill: "#f4d8a8" });
        drawText(ctx, this.notice, 220, 553, { size: 19, bold: true, color: "#8a4a2a" });
        ctx.restore();
      }
    }
    drawText(ctx, "←/→ switch tabs · Z choose · X close", 480, 630, { size: 16, align: "center", color: "#8a7a68" });
  }
}

const FLAVOR = {
  mira: "Keeper of the sketchbook. Braver than she believes.",
  biscuit: "Knight of the Round Plate. 34% icing, 100% loyal.",
  wisp: "A small light that stayed on. That counts for everything.",
};
