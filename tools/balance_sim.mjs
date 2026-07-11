// balance_sim.mjs — Monte-Carlo battle pacing check (dev tool, not CI).
//
// Mirrors the combat formulas in src/battle.js (damage, emotion triangle,
// storm gate / settle / repeat rules, second wind, calm softening) against the
// REAL data files, and prints median rounds + party survival per encounter for
// both routes. If battle.js formulas change, keep this in sync.
//
//   node tools/balance_sim.mjs
import { ENEMIES, TROOPS } from "../src/data/enemies.js";
import { PARTY_DEFS } from "../src/data/party.js";
import { SKILLS } from "../src/data/skills.js";

const ADV = { giggly: "grumpy", grumpy: "gloomy", gloomy: "giggly" };
const advMult = (a, d) => (ADV[a] === d ? 1.4 : ADV[d] === a ? 0.75 : 1.0);
const RUNS = 400;

// pages = torn pages collected before this fight: each grants +8 maxHp/+4 maxInk
// (see the "page" command in src/cutscene.js) — the party's only growth
function mkParty(ids, pages = 0) {
  return ids.map((id) => {
    const d = structuredClone(PARTY_DEFS[id]);
    const hp = d.hp + pages * 8, ink = d.ink + pages * 4;
    return { id, ...d, hp, ink, maxHp: hp, maxInk: ink, emotion: "neutral", guard: false };
  });
}
function mkFoes(troop) {
  return TROOPS[troop].map((id) => {
    const d = ENEMIES[id];
    return { id, def: d, hp: d.hp, maxHp: d.hp, atk: d.atk, defs: d.def, spd: d.spd,
             emotion: d.emotion || "neutral", calm: 0, lastReach: null, settled: false, rallied: false, guard: false, soothed: false };
  });
}

function dmgTo(t, raw, wall, isParty) {
  let dmg = raw;
  if (t.emotion === "grumpy") dmg *= 1.15;
  if (t.emotion === "gloomy") dmg *= 0.85;
  if (t.guard) dmg *= 0.5;
  if (wall && isParty) dmg *= 0.5;
  dmg = Math.max(1, Math.round(dmg * (0.85 + Math.random() * 0.3)));
  if (t.emotion === "giggly" && Math.random() < 0.12) return 0;
  return dmg;
}

function playerHit(a, t, mult) {
  if (t.def.immune) return 0;
  let raw = a.atk * mult;
  if (a.emotion === "grumpy") raw *= 1.2;
  raw *= advMult(a.emotion, t.emotion);
  raw -= t.defs * 0.55;
  return dmgTo(t, Math.max(1, raw), false, false);
}

function enemyAct(e, party, wall) {
  const act = e.def.acts[Math.floor(Math.random() * e.def.acts.length)];
  const alive = party.filter((m) => m.hp > 0);
  if (!alive.length) return;
  const soften = Math.max(0.6, 1 - 0.06 * e.calm);
  if (act.kind === "attack") {
    const list = act.targets === "all" ? alive : [alive[Math.floor(Math.random() * alive.length)]];
    for (const t of list) {
      let raw = e.atk * (act.mult || 1) * soften;
      if (e.emotion === "grumpy") raw *= 1.2;
      raw *= advMult(e.emotion, t.emotion);
      raw -= t.def * 0.55;
      t.hp = Math.max(0, t.hp - dmgTo(t, Math.max(1, raw), wall, true));
    }
  } else if (act.kind === "emotion") {
    if (act.target === "self") e.emotion = act.emotion;
    else alive[Math.floor(Math.random() * alive.length)].emotion = act.emotion;
  } else if (act.kind === "defend") {
    e.guard = true;
  } else if (act.kind === "bell") {
    for (const t of alive) {
      t.emotion = "gloomy";
      t.hp = Math.max(0, t.hp - Math.max(1, Math.round((5 + Math.floor(Math.random() * 4)) * soften)));
    }
  }
}

function reach(e, o) {
  if (!o.good) { e.calm = Math.max(0, e.calm - 1); e.emotion = e.def.emotion; e.lastReach = null; return; }
  if (o.label === e.lastReach) return;
  if (e.emotion === e.def.emotion) { e.emotion = "neutral"; e.lastReach = o.label; return; }
  if (e.settled) return;
  e.calm++; e.settled = true; e.lastReach = o.label;
  if (e.calm >= e.def.calmNeed) e.soothed = true;
}

// one battle; policy = "peace" | "fight". Returns { rounds, survived, partyHpLeft }
function sim(partyIds, troop, policy, pages) {
  const party = mkParty(partyIds, pages);
  const foes = mkFoes(troop);
  const aliveFoes = () => foes.filter((f) => f.hp > 0 && !f.soothed);
  let wall = false;

  for (let round = 1; round <= 40; round++) {
    wall = false;
    for (const f of foes) f.settled = false;
    const acts = [];
    // --- party decisions (simple competent play) ---
    for (const m of party.filter((p) => p.hp > 0)) {
      const foesNow = aliveFoes();
      if (!foesNow.length) break;
      const e = foesNow[0];
      const hurt = party.find((p) => p.hp > 0 && p.hp < p.maxHp * 0.4);
      if (hurt && m.id === "wisp" && m.ink >= 5) { acts.push({ t: "heal", m, tgt: hurt }); continue; }
      if (hurt && m.id !== "wisp" && Math.random() < 0.5) { acts.push({ t: "snack", m, tgt: hurt }); continue; }
      // any real player walls once the boss rallies
      if (m.id === "biscuit" && e.rallied && m.ink >= 3 && !wall) { m.ink -= 3; wall = true; continue; }
      if (policy === "peace") {
        // shift the storm with the right skill when available, else reach
        if (e.emotion === e.def.emotion) {
          const sk = m.skills.map((s) => SKILLS[s]).find((s) => s.kind === "emotion" && s.target === "enemy" && s.emotion !== e.def.emotion);
          if (sk && m.ink >= sk.ink) { acts.push({ t: "shift", m, tgt: e, sk }); continue; }
        }
        const good = e.def.reach.filter((o) => o.good && o.label !== e.lastReach);
        acts.push({ t: "reach", m, tgt: e, o: good[Math.floor(Math.random() * good.length)] || e.def.reach.find((o) => o.good) });
      } else {
        const atkSk = m.skills.map((s) => [s, SKILLS[s]]).find(([, s]) => s.kind === "attack");
        if (atkSk && m.ink >= atkSk[1].ink) { m.ink -= atkSk[1].ink; acts.push({ t: "hit", m, tgt: e, mult: atkSk[1].mult, selfEmotion: atkSk[1].selfEmotion }); }
        else acts.push({ t: "hit", m, tgt: e, mult: 1.0 });
      }
    }
    // --- enemies queue (with second wind) ---
    for (const e of aliveFoes()) {
      if (e.def.boss && !e.def.immune && !e.rallied && e.hp <= e.maxHp / 2) e.rallied = true;
      acts.push({ t: "enemy", e });
      if (e.rallied) acts.push({ t: "enemy", e });
    }
    acts.sort((a, b) => ((b.m || b.e).spd || 0) - ((a.m || a.e).spd || 0));
    // --- resolve ---
    for (const a of acts) {
      if (a.m && a.m.hp <= 0) continue;
      if (a.e && (a.e.hp <= 0 || a.e.soothed)) continue;
      if (a.t === "hit") {
        const tgt = a.tgt.hp > 0 && !a.tgt.soothed ? a.tgt : aliveFoes()[0];
        if (!tgt) continue;
        tgt.hp = Math.max(0, tgt.hp - playerHit(a.m, tgt, a.mult));
        if (a.selfEmotion) a.m.emotion = a.selfEmotion;
      } else if (a.t === "shift") {
        if (a.m.ink >= a.sk.ink && a.tgt.hp > 0 && !a.tgt.soothed) { a.m.ink -= a.sk.ink; a.tgt.emotion = a.sk.emotion; }
      } else if (a.t === "reach") {
        if (a.tgt.hp > 0 && !a.tgt.soothed && a.o) reach(a.tgt, a.o);
      } else if (a.t === "heal") {
        if (a.m.ink >= 5) { a.m.ink -= 5; a.tgt.hp = Math.min(a.tgt.maxHp, a.tgt.hp + 25); }
      } else if (a.t === "snack") {
        a.tgt.hp = Math.min(a.tgt.maxHp, a.tgt.hp + 20); // cookie
      } else if (a.t === "enemy") {
        enemyAct(a.e, party, wall);
      }
      if (!party.some((p) => p.hp > 0)) return { rounds: round, survived: false };
      if (!aliveFoes().length) return { rounds: round, survived: true };
    }
    for (const m of party) { m.guard = false; if (m.emotion === "gloomy" && m.hp > 0) m.ink = Math.min(m.maxInk, m.ink + 1); }
    for (const e of foes) e.guard = false;
  }
  return { rounds: 40, survived: party.some((p) => p.hp > 0) };
}

function report(label, partyIds, troop, pages = 0) {
  for (const policy of ["fight", "peace"]) {
    if (policy === "fight" && ENEMIES[TROOPS[troop][0]].immune) continue;
    const rs = [], deaths = { n: 0 };
    for (let i = 0; i < RUNS; i++) {
      const r = sim(partyIds, troop, policy, pages);
      rs.push(r.rounds);
      if (!r.survived) deaths.n++;
    }
    rs.sort((a, b) => a - b);
    const med = rs[Math.floor(rs.length / 2)];
    const p90 = rs[Math.floor(rs.length * 0.9)];
    console.log(`${label.padEnd(26)} ${policy.padEnd(6)} median ${String(med).padStart(2)}  p90 ${String(p90).padStart(2)}  losses ${(deaths.n / RUNS * 100).toFixed(0)}%`);
  }
}

console.log("encounter                  route  rounds");
report("tutorial (Mira solo)", ["mira"], "t_sniffle");
report("meadow scribble (duo)", ["mira", "biscuit"], "t_scribble");
report("meadow pair (duo)", ["mira", "biscuit"], "t_meadow_pair");
report("TANGLE (duo)", ["mira", "biscuit"], "t_boss_tangle");
report("woods thornbud (trio)", ["mira", "biscuit", "wisp"], "t_thornbud", 1);
report("SWAN (trio)", ["mira", "biscuit", "wisp"], "t_boss_swan", 1);
report("bay clasp (trio)", ["mira", "biscuit", "wisp"], "t_crab", 2);
report("KEEPER (trio)", ["mira", "biscuit", "wisp"], "t_boss_keeper", 2);
report("depths inklet pair (trio)", ["mira", "biscuit", "wisp"], "t_inklet_pair", 3);
