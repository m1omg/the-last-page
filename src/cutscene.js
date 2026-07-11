// cutscene.js — executes script command arrays from data/script.js.
import { SCRIPTS } from "./data/script.js";
import { ITEMS } from "./data/items.js";
import { audio } from "./audio.js";
import { newMember } from "./state.js";

export async function runScript(game, script) {
  const cmds = typeof script === "string" ? SCRIPTS[script] : script;
  if (!cmds) { console.warn("missing script", script); return; }
  game.cutsceneDepth++;
  try {
    for (const c of cmds) {
      await runCmd(game, c);
      if (game.abortCutscenes) break;
    }
  } finally {
    game.cutsceneDepth--;
  }
}

async function runCmd(game, c) {
  const st = game.state;
  switch (c.t) {
    case "say":
      await game.dialogue.say(c.who, c.face, c.text);
      break;
    case "choice": {
      const idx = await game.dialogue.ask(c.options);
      await runScript(game, c.options[idx].then || []);
      break;
    }
    case "if": {
      const val = !!st.flags[c.flag];
      await runScript(game, val === c.is ? (c.then || []) : (c.else || []));
      break;
    }
    case "iflt": {
      const val = st[c.key] ?? 0;
      await runScript(game, val < c.value ? (c.then || []) : (c.else || []));
      break;
    }
    case "ifhas": {
      const all = c.items.every((it) => (st.inventory[it] || 0) > 0);
      await runScript(game, all ? (c.then || []) : (c.else || []));
      break;
    }
    case "flag":
      st.flags[c.key] = c.value;
      break;
    case "give": {
      st.inventory[c.item] = (st.inventory[c.item] || 0) + (c.n || 1);
      break;
    }
    case "take": {
      st.inventory[c.item] = Math.max(0, (st.inventory[c.item] || 0) - (c.n || 1));
      if (!st.inventory[c.item]) delete st.inventory[c.item];
      break;
    }
    case "sfx": audio.sfx(c.name); break;
    case "bgm": audio.playBgm(c.name); break;
    case "stopbgm": audio.stopBgm(); break;
    case "fade": await game.fadeOut(c.ms); break;
    case "unfade": await game.fadeIn(c.ms); break;
    case "wait": await game.wait(c.ms); break;
    case "shake": game.shake(c.ms); break;
    case "tp": game.teleport(c.map, c.x, c.y, c.facing); break;
    case "battle": {
      const result = await game.startBattle(c);
      // fleeing must not clear the encounter — only a real resolution does
      if (c.flagWin && (result === "win" || result === "peace")) st.flags[c.flagWin] = true;
      if (result === "peace") await runScript(game, c.onPeace || []);
      else if (result === "win") await runScript(game, c.onWin || []);
      break;
    }
    case "cg":
      await game.showCG(c.img, c.lines || []);
      break;
    case "heal":
      for (const m of st.party) { m.hp = m.maxHp; m.ink = m.maxInk; m.emotion = "neutral"; }
      break;
    case "join": {
      if (!st.party.find((m) => m.id === c.member)) st.party.push(newMember(c.member));
      break;
    }
    case "page": {
      // idempotent: a replayed grant (e.g. re-entering a map whose onEnter
      // hands out a page) must not stack the stat bonus again
      if (st.inventory[`page${c.n}`]) break;
      audio.sfx("sfx_page");
      st.pages = Math.max(st.pages, c.n);
      st.inventory[`page${c.n}`] = 1;
      for (const m of st.party) {
        m.maxHp += 8; m.maxInk += 4; m.hp = m.maxHp; m.ink = m.maxInk; m.emotion = "neutral";
      }
      await game.dialogue.say(null, null,
        `You picked up TORN PAGE ${c.n} of 4.\nWarmth spreads through the party. Max HP +8, Max Ink +4, everyone fully rested.`);
      break;
    }
    case "save":
      game.saveNow();
      break;
    case "ending":
      await game.playEnding(c.which);
      break;
    default:
      console.warn("unknown cmd", c);
  }
}

export function itemName(id) {
  return ITEMS[id] ? ITEMS[id].name : id;
}
