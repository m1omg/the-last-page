// battle.js — turn-based battles with the emotion triangle and Reach Out.
//
// Emotion triangle: GIGGLY > GRUMPY > GLOOMY > GIGGLY (advantage = 1.4x dmg,
// disadvantage = 0.75x). Emotions also give passive quirks:
//   GIGGLY: 12% chance to dodge     GRUMPY: +20% dmg dealt, +15% dmg taken
//   GLOOMY: -15% dmg taken, +1 ink/round
// A GIGGLY doodle is also overexcited: its swings hit 15% harder, and it can
// take TWO hearts a round instead of one — cheering an enemy up speeds peace,
// but if the reach breaks down you're left fighting a dodgy, wild thing.
import { ENEMIES, TROOPS } from "./data/enemies.js";
import { SKILLS } from "./data/skills.js";
import { ITEMS } from "./data/items.js";
import { assets } from "./assets.js";
import { audio } from "./audio.js";
import { input } from "./input.js";
import { drawBox, drawText, drawBar, wrapText, FONT, EMOTION_COLOR, emotionTag } from "./ui.js";
import { hotspots } from "./hotspots.js";

const ADV = { giggly: "grumpy", grumpy: "gloomy", gloomy: "giggly" };

function advMult(att, dfn) {
  if (ADV[att] === dfn) return 1.4;
  if (ADV[dfn] === att) return 0.75;
  return 1.0;
}

export class BattleScene {
  constructor(game, cfg, resolve) {
    this.game = game;
    this.cfg = cfg;
    this.resolve = resolve;
    this.party = game.state.party;
    this.enemies = TROOPS[cfg.troop].map((id, i) => {
      const d = ENEMIES[id];
      return {
        id, i, name: d.name, img: d.img, def: d,
        hp: d.hp, maxHp: d.hp, atk: d.atk, defs: d.def, spd: d.spd,
        emotion: d.emotion || "neutral", calm: 0,
        lastReach: null,   // the option that landed last — repeats fizzle
        settled: 0,        // calm gains this round (cap 1, or 2 while GIGGLY)
        rallied: false,    // boss second wind, triggered below half HP
        wobble: 0,
      };
    });
    this.phase = "intro";      // intro | command | anim | end
    this.msgQ = [];
    this.msgShown = 0;
    this.msgDone = false;
    this.cmdIndex = 0;         // which party member is choosing
    this.menu = { kind: "main", index: 0, items: [] };
    this.pendingActs = [];
    this.wall = false;
    this.floaters = [];
    this.shakeT = 0;
    this.result = null;
    this.storyReachStep = 0;
    this.rounds = 0; // read by the smoke tests to guard against re-trivializing

    audio.playBgm(cfg.boss ? "bgm_boss" : "bgm_battle", { fade: 0.4 });
    const intro = this.enemies.map((e) => e.def.intro).join("\n");
    this.queueMsg(intro);
    if (cfg.tutorial) {
      this.queueMsg("(Battle basics: FIGHT deals damage. REACH OUT is how you talk to sad doodles - fill their hearts and the fight ends peacefully. Emotions beat each other in a circle: GIGGLY beats GRUMPY beats GLOOMY beats GIGGLY.)");
      this.queueMsg("(A doodle deep in a bad feeling CAN'T HEAR YOU. Reach out once to break the storm - or shift its mood with a skill - and THEN your words land. There's a little book about this lying in the Blank Page - once you pick it up, it stays in your POCKETS.)");
    }
  }

  queueMsg(text) {
    if (text) this.msgQ.push(text);
  }

  aliveParty() { return this.party.filter((m) => m.hp > 0); }
  aliveEnemies() { return this.enemies.filter((e) => e.hp > 0 && !e.soothed); }

  // ------------------------------------------------------------ update
  update(dt) {
    this.floaters = this.floaters.filter((f) => (f.t += dt) < 1.0);
    if (this.shakeT > 0) this.shakeT -= dt;
    for (const e of this.enemies) if (e.wobble > 0) e.wobble -= dt;

    if (this.msgQ.length) {
      const cur = this.msgQ[0];
      const speed = input.held("confirm") ? 200 : 70;
      this.msgShown = Math.min(cur.length, this.msgShown + speed * dt);
      this.msgDone = this.msgShown >= cur.length;
      if (input.hit("confirm")) {
        if (!this.msgDone && this.msgShown > 3) {
          this.msgShown = cur.length;
        } else if (this.msgDone) {
          this.msgQ.shift();
          this.msgShown = 0;
          this.msgDone = false;
        }
      }
      return;
    }

    if (this.phase === "intro") {
      this.phase = "command";
      this.cmdIndex = 0;
      this.pendingActs = [];
      this.menu = { kind: "main", index: 0 };
      this.skipDead();
      return;
    }

    if (this.phase === "command") this.updateCommand();
    else if (this.phase === "anim") this.advanceTurn();
    else if (this.phase === "end") this.finish();
  }

  skipDead() {
    while (this.cmdIndex < this.party.length && this.party[this.cmdIndex].hp <= 0) this.cmdIndex++;
    if (this.cmdIndex >= this.party.length) this.beginRound();
  }

  updateCommand() {
    const m = this.party[this.cmdIndex];
    if (!m) { this.beginRound(); return; }
    const menu = this.menu;
    const list = this.menuItems();
    if (input.hit("up")) { menu.index = (menu.index + list.length - 1) % list.length; audio.sfx("sfx_blip", 0.5); }
    if (input.hit("down")) { menu.index = (menu.index + 1) % list.length; audio.sfx("sfx_blip", 0.5); }
    if (input.hit("cancel")) {
      audio.sfx("sfx_cancel");
      if (menu.kind !== "main") this.menu = { kind: "main", index: 0 };
      else if (this.cmdIndex > 0) { this.cmdIndex--; this.pendingActs.pop(); this.skipBack(); }
      return;
    }
    if (!input.hit("confirm")) return;
    audio.sfx("sfx_confirm");
    const sel = list[menu.index];
    if (sel.disabled) { audio.sfx("sfx_cancel"); return; }

    if (menu.kind === "main") {
      if (sel.id === "fight") this.menu = { kind: "target", index: 0, act: { kind: "attack" } };
      else if (sel.id === "skill") this.menu = { kind: "skill", index: 0 };
      else if (sel.id === "reach") this.menu = { kind: "reach_target", index: 0 };
      else if (sel.id === "item") this.menu = { kind: "item", index: 0 };
      else if (sel.id === "guard") this.commit({ kind: "guard" });
      else if (sel.id === "run") this.commit({ kind: "run" });
    } else if (menu.kind === "skill") {
      const sk = SKILLS[sel.id];
      if (m.ink < sk.ink) { audio.sfx("sfx_cancel"); return; }
      if (sk.target === "enemy") this.menu = { kind: "target", index: 0, act: { kind: "skill", skill: sel.id } };
      else if (sk.target === "ally") this.menu = { kind: "ally", index: 0, act: { kind: "skill", skill: sel.id } };
      else this.commit({ kind: "skill", skill: sel.id });
    } else if (menu.kind === "target") {
      this.commit({ ...menu.act, target: sel.ref });
    } else if (menu.kind === "ally") {
      this.commit({ ...menu.act, target: sel.ref });
    } else if (menu.kind === "reach_target") {
      this.menu = { kind: "reach", index: 0, enemy: sel.ref };
    } else if (menu.kind === "reach") {
      this.commit({ kind: "reach", target: this.menu.enemy, option: sel.ref });
    } else if (menu.kind === "item") {
      this.menu = { kind: "ally", index: 0, act: { kind: "item", item: sel.id } };
    }
  }

  skipBack() {
    while (this.cmdIndex > 0 && this.party[this.cmdIndex].hp <= 0) { this.cmdIndex--; this.pendingActs.pop(); }
    this.menu = { kind: "main", index: 0 };
  }

  menuItems() {
    const m = this.party[this.cmdIndex];
    const menu = this.menu;
    if (menu.kind === "main") {
      return [
        { id: "fight", label: "Fight" },
        { id: "skill", label: "Skills" },
        { id: "reach", label: "Reach Out" },
        { id: "item", label: "Items" },
        { id: "guard", label: "Steady" },
        { id: "run", label: "Run", disabled: !!this.cfg.boss },
      ];
    }
    if (menu.kind === "skill") {
      return m.skills.map((id) => {
        const sk = SKILLS[id];
        return { id, label: `${sk.name}  (${sk.ink}✒)`, desc: sk.desc, disabled: m.ink < sk.ink };
      });
    }
    if (menu.kind === "target" || menu.kind === "reach_target") {
      return this.aliveEnemies().map((e) => ({ ref: e, label: e.name }));
    }
    if (menu.kind === "ally") {
      // preview the stat the act actually touches — a Juice Box should show ink
      const it = menu.act && menu.act.kind === "item" && ITEMS[menu.act.item];
      const inkOnly = it && it.effect && it.effect.ink && !it.effect.hp;
      return this.party.map((p) => ({
        ref: p,
        label: inkOnly ? `${p.name}  ${p.ink}/${p.maxInk}✒` : `${p.name}  ${p.hp}/${p.maxHp}`,
      }));
    }
    if (menu.kind === "reach") {
      const e = menu.enemy;
      let opts = e.def.reach;
      if (e.def.reachStory) {
        opts = e.def.reach.filter((o) => this.game.state.pages >= o.page);
        opts = opts.slice(0, this.storyReachStep + 1).slice(-1); // one unlocked step at a time
        if (!opts.length) opts = [{ label: "...", good: false, text: "You reach out, but you don't have the words yet." }];
      }
      // the option that just landed is greyed out — it needs to hear something
      // new (two members can still race the same option; resolution fizzles it)
      return opts.map((o) => ({ ref: o, label: o.label, disabled: !e.def.reachStory && o.good && o.label === e.lastReach }));
    }
    if (menu.kind === "item") {
      const inv = this.game.state.inventory;
      const usable = Object.keys(inv).filter((id) => ITEMS[id] && ITEMS[id].battle && inv[id] > 0);
      if (!usable.length) return [{ id: null, label: "(no snacks left)", disabled: true }];
      return usable.map((id) => ({ id, label: `${ITEMS[id].name} ×${inv[id]}`, desc: ITEMS[id].desc }));
    }
    return [];
  }

  commit(act) {
    act.actor = this.party[this.cmdIndex];
    this.pendingActs.push(act);
    this.cmdIndex++;
    this.menu = { kind: "main", index: 0 };
    this.skipDead();
  }

  beginRound() {
    this.rounds++;
    // build full turn queue: party acts + enemy acts, by speed
    const acts = [...this.pendingActs];
    for (const e of this.aliveEnemies()) {
      e.settled = 0; // hearts can land again this round
      // second wind: a boss below half HP fights twice per round, announced once
      if (e.def.boss && !e.def.immune && !e.rallied && e.hp <= e.maxHp / 2) {
        e.rallied = true;
        this.queueMsg(e.def.rallyText || `${e.name} steadies itself. It is not done yet.`);
      }
      acts.push({ kind: "enemyact", actor: e });
      if (e.rallied) acts.push({ kind: "enemyact", actor: e });
    }
    // Steady and Crumb Wall promise protection "this round", so they must
    // resolve before enemy actions regardless of speed — otherwise a slow
    // defender (Biscuit, spd 5) raises the wall after the hits already landed
    const pri = (a) => (a.kind === "guard" || (a.kind === "skill" && SKILLS[a.skill] && SKILLS[a.skill].kind === "wall")) ? 1000 : 0;
    acts.sort((a, b) => (pri(b) + (b.actor.spd || 0)) - (pri(a) + (a.actor.spd || 0)));
    this.turnQ = acts;
    this.wall = false;
    this.phase = "anim";
  }

  advanceTurn() {
    if (this.checkEnd()) return;
    const act = this.turnQ.shift();
    if (!act) { this.endRound(); return; }
    const a = act.actor;
    if (a.hp <= 0 || a.soothed) { return; }
    switch (act.kind) {
      case "attack": this.doAttack(a, act.target, 1.0, null); break;
      case "skill": this.doSkill(a, act); break;
      case "guard":
        a.guard = true;
        a.ink = Math.min(a.maxInk, a.ink + 2);
        this.queueMsg(`${a.name} plants their feet and breathes. (+2 Ink, halved damage this round.)`);
        break;
      case "run": {
        if (Math.random() < 0.7) {
          this.queueMsg("You grab everyone's hands and RUN. The doodle doesn't chase.");
          this.result = "flee";
          this.phase = "end";
        } else {
          this.queueMsg(`${a.name} tries to run, but the page curls up at the edges!`);
        }
        break;
      }
      case "item": this.doItem(a, act); break;
      case "reach": this.doReach(a, act); break;
      case "enemyact": this.doEnemyAct(a); break;
    }
    this.checkEnd();
  }

  dmgTo(target, raw) {
    let dmg = raw;
    if (target.emotion === "grumpy") dmg *= 1.15;
    if (target.emotion === "gloomy") dmg *= 0.85;
    if (target.guard) dmg *= 0.5;
    if (this.wall && this.party.includes(target)) dmg *= 0.5;
    dmg = Math.max(1, Math.round(dmg * (0.85 + Math.random() * 0.3)));
    if (target.emotion === "giggly" && Math.random() < 0.12) return { miss: true, dmg: 0 };
    return { miss: false, dmg };
  }

  doAttack(a, target, mult, skillName) {
    if (!target || target.hp <= 0 || target.soothed) target = this.aliveEnemies()[0] || this.aliveParty()[0];
    if (!target) return;
    const isEnemyTarget = this.enemies.includes(target);
    if (isEnemyTarget && target.def.immune) {
      audio.sfx("sfx_static", 0.7);
      this.queueMsg(`${a.name} strikes with everything they have... and the ink just SOAKS IT IN. Violence is a language it doesn't speak.`);
      return;
    }
    let raw = a.atk * mult;
    if (a.emotion === "grumpy") raw *= 1.2;
    raw *= advMult(a.emotion, target.emotion);
    raw -= (isEnemyTarget ? target.defs : target.def) * 0.55;
    const { miss, dmg } = this.dmgTo(target, Math.max(1, raw));
    if (miss) {
      this.queueMsg(`${target.name} giggles and skips out of the way!`);
      return;
    }
    target.hp = Math.max(0, target.hp - dmg);
    if (isEnemyTarget) target.wobble = 0.4; else this.shakeT = 0.3;
    audio.sfx("sfx_hit");
    this.addFloater(target, `-${dmg}`, "#d4543a");
    this.queueMsg(`${a.name}${skillName ? ` uses ${skillName} and` : ""} hits ${target.name} for ${dmg}!` +
      (advMult(a.emotion, target.emotion) > 1 ? " It strikes right at the heart of the mood!" : ""));
    if (isEnemyTarget && target.hp <= 0) {
      audio.sfx("sfx_tear");
      this.queueMsg(target.def.winText || `${target.name} crumples away like scrap paper... you feel a little heavy about it.`);
    } else if (!isEnemyTarget && target.hp <= 0) {
      this.queueMsg(`${target.name} is TORN and can't go on! (Glitter can mend them.)`);
    }
  }

  doSkill(a, act) {
    const sk = SKILLS[act.skill];
    if (a.ink < sk.ink) return;
    a.ink -= sk.ink;
    if (sk.kind === "attack") {
      this.doAttack(a, act.target, sk.mult, sk.name);
      if (sk.selfEmotion) { a.emotion = sk.selfEmotion; audio.sfx("sfx_emotion", 0.6); this.queueMsg(`${a.name} got ${sk.selfEmotion.toUpperCase()} doing it!`); }
    } else if (sk.kind === "emotion") {
      const t = act.target || this.aliveEnemies()[0];
      if (!t) return;
      t.emotion = sk.emotion;
      audio.sfx("sfx_emotion");
      this.addFloater(t, sk.emotion.toUpperCase(), EMOTION_COLOR[sk.emotion]);
      this.queueMsg(`${a.name} uses ${sk.name}! ${t.name} becomes ${sk.emotion.toUpperCase()}!`);
    } else if (sk.kind === "heal") {
      const targets = sk.target === "allies" ? this.aliveParty() : [act.target || a];
      audio.sfx("sfx_heal");
      for (const t of targets) {
        if (t.hp <= 0) continue;
        const healed = Math.min(t.maxHp - t.hp, sk.amount);
        t.hp += healed;
        this.addFloater(t, `+${healed}`, "#5aa85a");
      }
      this.queueMsg(`${a.name} uses ${sk.name}! Warm light stitches everyone up a little.`);
    } else if (sk.kind === "wall") {
      this.wall = true;
      this.queueMsg(`${a.name} uses ${sk.name}! "NOBODY TOUCHES MY FRIENDS." The party is shielded this round!`);
    }
  }

  doItem(a, act) {
    const inv = this.game.state.inventory;
    const item = ITEMS[act.item];
    if (!item || !inv[act.item]) return;
    const t = act.target || a;
    if (item.effect.revive) {
      if (t.hp > 0) { this.queueMsg(`${t.name} doesn't need mending right now.`); return; }
      inv[act.item]--;
      t.hp = item.effect.revive;
      audio.sfx("sfx_heal");
      this.queueMsg(`${a.name} sprinkles the Glitter Vial! ${t.name} is taped back together, sparkling slightly!`);
      return;
    }
    if (t.hp <= 0) { this.queueMsg(`${t.name} is torn - snacks won't fix that. Glitter might.`); return; }
    inv[act.item]--;
    if (item.effect.hp) { t.hp = Math.min(t.maxHp, t.hp + item.effect.hp); this.addFloater(t, `+${item.effect.hp}`, "#5aa85a"); }
    if (item.effect.ink) { t.ink = Math.min(t.maxInk, t.ink + item.effect.ink); this.addFloater(t, `+${item.effect.ink}✒`, "#5a7fc4"); }
    audio.sfx("sfx_heal");
    this.queueMsg(`${a.name} shares a ${item.name} with ${t.name}. Small comforts count double in here.`);
  }

  // Reach Out rules:
  //  - an enemy sitting in its distressed default emotion can't hear you: the
  //    first good option breaks the storm (emotion -> neutral) but gives no calm
  //  - a listening enemy (any emotion but its default) takes +1 calm...
  //  - ...at most once per round (settled) — twice while GIGGLY — and never
  //    from the same option twice in a row (lastReach)
  //  - a bad option costs a heart and brings the storm back; on a GIGGLY
  //    doodle the storm doesn't return — the giggle turns wild instead, and
  //    you're facing an enemy with the full cheerful buff (dodge, hard swings)
  doReach(a, act) {
    const e = act.target;
    if (!e || e.hp <= 0 || e.soothed) return;
    const o = act.option;
    audio.sfx(o.good ? "sfx_soothe" : "sfx_cancel");
    this.queueMsg(`${a.name} reaches out: ${o.label}\n${o.text}`);

    if (e.def.reachStory) {
      // the final boss: story beats land one per round, in order
      if (o.good) {
        if (e.settled) { this.queueMsg("The ink is still holding those words. Give them a moment to sink."); return; }
        e.calm++;
        e.settled++;
        this.storyReachStep++;
        this.addFloater(e, "♥", "#e88aa0");
      }
    } else if (!o.good) {
      const had = e.calm;
      e.calm = Math.max(0, e.calm - 1);
      e.lastReach = null;
      if (had > 0) this.addFloater(e, "-♥", "#8a6a7a");
      if (e.emotion === "giggly") {
        this.queueMsg(`${e.name}'s giggle sharpens into something WILDER...${had > 0 ? " A heart flickers out." : ""} (A giggly doodle dodges and swings hard!)`);
      } else {
        e.emotion = e.def.emotion; // the storm comes back
        this.queueMsg(`${e.name} shrinks back into the bad feeling...${had > 0 ? " A heart flickers out." : ""}`);
      }
    } else if (o.label === e.lastReach) {
      this.queueMsg(`${e.name} nods along... but it just heard that one. It needs something NEW.`);
    } else if (e.emotion === e.def.emotion) {
      // the storm gate: this reach breaks through, but the words don't land yet
      e.emotion = "neutral";
      e.lastReach = o.label;
      this.addFloater(e, "listening...", "#e8d8a0");
      this.queueMsg(`${e.name} goes quiet mid-feeling. It's LISTENING now.`);
    } else if (e.settled >= (e.emotion === "giggly" ? 2 : 1)) {
      this.queueMsg(`${e.name} is still holding your words. Let them settle.`);
    } else {
      e.calm++;
      e.settled++;
      e.lastReach = o.label;
      this.addFloater(e, "♥", "#e88aa0");
      if (e.emotion === "giggly" && e.settled === 1) {
        this.queueMsg(`${e.name} is giggling too much to be sad - it could take one more kind thing this round!`);
      }
    }

    if (e.calm >= e.def.calmNeed) {
      e.soothed = true;
      audio.sfx("sfx_soothe");
      this.queueMsg(e.def.peaceText);
    }
  }

  doEnemyAct(e) {
    const acts = e.def.acts;
    const act = acts[Math.floor(Math.random() * acts.length)];
    const targets = this.aliveParty();
    if (!targets.length) return;
    // every heart softens the swings — kindness is armor, even mid-fight
    const soften = Math.max(0.6, 1 - 0.06 * e.calm);
    const msg = (act.msg || "").replace("{e}", e.name);
    if (act.kind === "attack") {
      const list = act.targets === "all" ? targets : [targets[Math.floor(Math.random() * targets.length)]];
      let text = msg;
      for (const t of list) {
        let raw = e.atk * (act.mult || 1) * soften;
        if (e.emotion === "grumpy") raw *= 1.2;
        if (e.emotion === "giggly") raw *= 1.15; // overexcited — swings wild
        raw *= advMult(e.emotion, t.emotion);
        raw -= t.def * 0.55;
        const { miss, dmg } = this.dmgTo(t, Math.max(1, raw));
        if (miss) { text += `\n${t.name} giggles and dodges!`; continue; }
        t.hp = Math.max(0, t.hp - dmg);
        this.addFloater(t, `-${dmg}`, "#d4543a");
        text += `\n${t.name} takes ${dmg}!` + (t.hp <= 0 ? ` ${t.name} is TORN!` : "");
      }
      audio.sfx("sfx_hit");
      this.shakeT = 0.3;
      this.queueMsg(text);
    } else if (act.kind === "emotion") {
      if (act.target === "self") {
        e.emotion = act.emotion;
        this.addFloater(e, act.emotion.toUpperCase(), EMOTION_COLOR[act.emotion]);
      } else {
        const t = targets[Math.floor(Math.random() * targets.length)];
        t.emotion = act.emotion;
        this.addFloater(t, act.emotion.toUpperCase(), EMOTION_COLOR[act.emotion]);
      }
      audio.sfx("sfx_emotion", 0.7);
      this.queueMsg(msg);
    } else if (act.kind === "defend") {
      e.guard = true;
      this.queueMsg(msg);
    } else if (act.kind === "bell") {
      audio.sfx("sfx_heartbeat");
      let text = msg;
      for (const t of targets) {
        t.emotion = "gloomy";
        const dmg = Math.max(1, Math.round((5 + Math.floor(Math.random() * 4)) * soften));
        t.hp = Math.max(0, t.hp - dmg);
        this.addFloater(t, `-${dmg}`, "#5a7fc4");
        text += `\n${t.name} takes ${dmg} and turns GLOOMY.`;
      }
      this.queueMsg(text);
    } else {
      this.queueMsg(msg);
    }
  }

  endRound() {
    for (const m of this.party) {
      m.guard = false;
      if (m.emotion === "gloomy" && m.hp > 0) m.ink = Math.min(m.maxInk, m.ink + 1);
    }
    for (const e of this.enemies) e.guard = false;
    this.phase = "command";
    this.cmdIndex = 0;
    this.pendingActs = [];
    this.menu = { kind: "main", index: 0 };
    this.skipDead();
  }

  checkEnd() {
    if (this.result) { this.phase = "end"; return true; }
    if (!this.aliveParty().length) {
      this.result = "lose";
      this.phase = "end";
      return true;
    }
    const foes = this.aliveEnemies();
    if (!foes.length) {
      const anySoothed = this.enemies.some((e) => e.soothed);
      const allSoothed = this.enemies.every((e) => e.soothed || e.hp <= 0) && anySoothed;
      this.result = this.enemies.every((e) => e.soothed) ? "peace"
        : allSoothed ? "peace" : "win";
      this.phase = "end";
      // rewards
      if (this.result !== "lose") {
        const items = [];
        for (const e of this.enemies) {
          if (e.def.reward && e.def.reward.item) {
            const inv = this.game.state.inventory;
            inv[e.def.reward.item] = (inv[e.def.reward.item] || 0) + 1;
            items.push(ITEMS[e.def.reward.item].name);
          }
        }
        if (this.result === "peace") {
          for (const m of this.aliveParty()) m.hp = Math.min(m.maxHp, m.hp + 8);
          audio.sfx("sfx_victory");
          this.queueMsg(`Peace! Everyone feels a little lighter. (+8 HP to the party${items.length ? `, found: ${items.join(", ")}` : ""})`);
        } else if (this.result === "win") {
          audio.sfx("sfx_victory");
          this.queueMsg(`The battle is over.${items.length ? ` Left behind: ${items.join(", ")}.` : ""}`);
        }
      }
      return true;
    }
    return false;
  }

  finish() {
    if (this.msgQ.length) return;
    if (this.result === "lose" && this.cfg.final) {
      // the final battle cannot truly be lost — the party is caught by memory
      for (const m of this.party) { m.hp = Math.max(1, Math.floor(m.maxHp / 2)); m.emotion = "neutral"; }
      this.queueMsg("Everything goes white... and then warm. Two doodle hands and one gloved one pull you back to your feet. \"AGAIN,\" says Sir Biscuit. \"Stories don't end in the middle.\"");
      this.result = null;
      this.phase = "command";
      this.cmdIndex = 0;
      this.pendingActs = [];
      this.skipDead();
      return;
    }
    for (const m of this.party) { m.guard = false; m.emotion = "neutral"; }
    this.resolve(this.result);
  }

  addFloater(target, text, color) {
    this.floaters.push({ target, text, color, t: 0 });
  }

  // ------------------------------------------------------------ draw
  draw(ctx) {
    const g = this.game;
    // backdrop: blurred map bg + vignette
    const mapDef = g.mapScene.def;
    const bgName = mapDef.bgSwap && g.state.flags[mapDef.bgSwap.flag] ? mapDef.bgSwap.bg : mapDef.bg;
    const bg = assets.img(bgName);
    ctx.save();
    if (this.shakeT > 0) ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    if (bg) {
      ctx.filter = "blur(6px) saturate(0.85)";
      ctx.drawImage(bg, -20, -20, 1000, 760);
      ctx.filter = "none";
    } else {
      ctx.fillStyle = "#e8dfc8";
      ctx.fillRect(0, 0, 960, 720);
    }
    ctx.fillStyle = "rgba(40,30,25,0.25)";
    ctx.fillRect(0, 0, 960, 720);

    // enemies
    const foes = this.enemies.filter((e) => !e.soothed);
    const n = foes.length;
    foes.forEach((e, i) => {
      const cx = 480 + (i - (n - 1) / 2) * 300;
      const cy = e.def.boss ? 230 : 210;
      const size = e.def.boss ? 300 : 200;
      const bob = Math.sin(performance.now() / 500 + i * 2) * 6;
      const wob = e.wobble > 0 ? Math.sin(e.wobble * 60) * 8 : 0;
      const img = assets.img(e.img);
      ctx.save();
      if (e.hp <= 0) ctx.globalAlpha = 0.25;
      if (img) {
        // fit inside the size box at native aspect ratio
        const sc = Math.min(size / img.width, size / img.height);
        const w = img.width * sc, h = img.height * sc;
        ctx.drawImage(img, cx - w / 2 + wob, cy - h / 2 + bob, w, h);
      } else {
        ctx.fillStyle = "#6a6a7e";
        ctx.strokeStyle = "#2a2320";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx + wob, cy + bob, size / 3, size / 2.6, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        drawText(ctx, e.name, cx, cy + bob - 10, { size: 18, align: "center", color: "#fff" });
      }
      ctx.restore();
      if (e.hp > 0) {
        drawBar(ctx, cx - 70, cy + size / 2 + 8, 140, 14, e.hp / e.maxHp, "#c25a4a");
        if (e.emotion === "neutral" && !e.def.reachStory && e.def.calmNeed) {
          // the storm is broken — show that it can hear you now
          drawText(ctx, "( listening )", cx, cy + size / 2 + 28, { size: 15, align: "center", color: "#f0e8d8" });
        } else {
          emotionTag(ctx, cx, cy + size / 2 + 26, e.emotion);
        }
        if (e.calm > 0 && e.def.calmNeed) {
          drawText(ctx, "♥".repeat(e.calm) + "♡".repeat(Math.max(0, e.def.calmNeed - e.calm)),
            cx, cy - size / 2 - 26, { size: 20, align: "center", color: "#e88aa0" });
        }
      }
    });

    // floaters
    for (const f of this.floaters) {
      const e = f.target;
      let fx, fy;
      if (this.enemies.includes(e)) {
        const i = foes.indexOf(e);
        fx = 480 + (i - (n - 1) / 2) * 300;
        fy = 180 - f.t * 50;
      } else {
        const i = this.party.indexOf(e);
        fx = 190 + i * 290;
        fy = 560 - f.t * 40;
      }
      ctx.save();
      ctx.globalAlpha = 1 - f.t;
      drawText(ctx, f.text, fx, fy, { size: 26, bold: true, align: "center", color: f.color });
      ctx.restore();
    }

    // party status panel
    const py = 590;
    this.party.forEach((m, i) => {
      const bx = 50 + i * 290;
      drawBox(ctx, bx, py, 270, 100, { seed: i + 20, fill: m.hp > 0 ? "rgba(255,252,240,0.95)" : "rgba(220,200,200,0.9)" });
      drawText(ctx, m.name, bx + 14, py + 8, { size: 19, bold: true, color: "#5a4634" });
      emotionTag(ctx, bx + 220, py + 12, m.emotion);
      drawBar(ctx, bx + 14, py + 40, 160, 16, m.hp / m.maxHp, "#c25a4a", `${m.hp}/${m.maxHp}`);
      drawBar(ctx, bx + 14, py + 62, 160, 16, m.ink / m.maxInk, "#5a7fc4", `${m.ink}/${m.maxInk}`);
      drawText(ctx, "HP", bx + 182, py + 40, { size: 14, color: "#7a6a5a" });
      drawText(ctx, "INK", bx + 182, py + 62, { size: 14, color: "#7a6a5a" });
      if (this.phase === "command" && i === this.cmdIndex && !this.msgQ.length) {
        const t = performance.now() / 250;
        drawText(ctx, "▶", bx - 24 + Math.sin(t) * 3, py + 40, { size: 22, color: "#b8452e" });
      }
    });

    // message box
    if (this.msgQ.length) {
      const text = this.msgQ[0].slice(0, Math.floor(this.msgShown));
      drawBox(ctx, 60, 430, 840, 140, { seed: 31 });
      ctx.font = `20px ${FONT}`;
      let y = 448;
      for (const line of wrapText(ctx, text, 790)) {
        drawText(ctx, line, 86, y, { size: 20 });
        y += 26;
      }
      if (this.msgDone) {
        const t = performance.now() / 300;
        drawText(ctx, "▼", 870, 540 + Math.sin(t) * 3, { size: 16, color: "#7a4a2a" });
      }
    } else if (this.phase === "command") {
      // command menu
      const list = this.menuItems();
      const menu = this.menu;
      const w = menu.kind === "main" ? 220 : 430;
      const h = Math.min(6, list.length) * 38 + 28;
      const bx = menu.kind === "main" ? 60 : 300, by = 560 - h;
      drawBox(ctx, bx, by, w, h, { seed: 41 });
      hotspots.rows(bx, by + 8, w, 38, list.length, (i) => {
        this.menu.index = i;
        input.tap("confirm");
      });
      list.forEach((o, i) => {
        const sel = i === menu.index;
        if (sel) drawText(ctx, "☞", bx + 14, by + 14 + i * 38, { size: 20, color: "#b8452e" });
        drawText(ctx, o.label, bx + 46, by + 14 + i * 38, {
          size: 20, bold: sel,
          color: o.disabled ? "#b0a595" : sel ? "#b8452e" : "#2a2320",
        });
      });
      const cur = list[menu.index];
      if (cur && cur.desc) {
        drawBox(ctx, 60, by - 62, 840, 50, { seed: 43, fill: "rgba(255,252,240,0.92)" });
        drawText(ctx, cur.desc, 80, by - 48, { size: 17, color: "#5a4634" });
      }
      if (this.cfg.boss && this.enemies[0] && this.enemies[0].def.reachStory) {
        drawText(ctx, "Its defense is absolute. But something in there is LISTENING.",
          480, 400, { size: 18, align: "center", color: "#fff" });
      }
    }
    ctx.restore();
  }
}
