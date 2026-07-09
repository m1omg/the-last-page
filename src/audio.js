// audio.js — WAV loading, looping BGM with crossfade, one-shot SFX.
import { loadSettings, updateSettings } from "./settings.js";

const ctx = new (window.AudioContext || window.webkitAudioContext)();
const master = ctx.createGain();
master.connect(ctx.destination);

const buffers = new Map();
// restored from settings, so muting survives a reload
let muted = loadSettings().muted;
master.gain.value = muted ? 0 : 1;
let current = null; // { name, source, gain }

const BGM = ["bgm_title", "bgm_blank", "bgm_real", "bgm_meadow", "bgm_woods",
  "bgm_bay", "bgm_depths", "bgm_battle", "bgm_boss", "bgm_ending"];
const SFX = ["sfx_blip", "sfx_confirm", "sfx_cancel", "sfx_step", "sfx_hit",
  "sfx_heal", "sfx_emotion", "sfx_save", "sfx_door", "sfx_page",
  "sfx_heartbeat", "sfx_static", "sfx_tear", "sfx_soothe", "sfx_victory",
  "sfx_defeat"];

async function load(name) {
  try {
    const res = await fetch(`assets/audio/${name}.wav`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.arrayBuffer();
    buffers.set(name, await ctx.decodeAudioData(data));
  } catch (err) {
    console.warn(`audio missing: ${name}`, err);
  }
}

export const audio = {
  async init() {
    await Promise.all([...BGM, ...SFX].map(load));
  },
  // browsers block audio until a user gesture
  unlock() {
    if (ctx.state === "suspended") ctx.resume();
  },
  playBgm(name, { fade = 0.8 } = {}) {
    if (current && current.name === name) return;
    const buf = buffers.get(name);
    const t = ctx.currentTime;
    if (current) {
      current.gain.gain.setValueAtTime(current.gain.gain.value, t);
      current.gain.gain.linearRampToValueAtTime(0, t + fade);
      const old = current.source;
      setTimeout(() => { try { old.stop(); } catch (e) {} }, fade * 1000 + 60);
      current = null;
    }
    if (!buf) return;
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.85, t + fade);
    source.connect(gain).connect(master);
    source.start();
    current = { name, source, gain };
  },
  stopBgm({ fade = 0.8 } = {}) {
    if (!current) return;
    const t = ctx.currentTime;
    current.gain.gain.setValueAtTime(current.gain.gain.value, t);
    current.gain.gain.linearRampToValueAtTime(0, t + fade);
    const old = current.source;
    setTimeout(() => { try { old.stop(); } catch (e) {} }, fade * 1000 + 60);
    current = null;
  },
  get bgmName() { return current ? current.name : null; },
  sfx(name, vol = 1) {
    const buf = buffers.get(name);
    if (!buf) return;
    const source = ctx.createBufferSource();
    source.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    source.connect(gain).connect(master);
    source.start();
  },
  toggleMute() {
    muted = !muted;
    master.gain.value = muted ? 0 : 1;
    updateSettings({ muted });
    return muted;
  },
  isMuted() { return muted; },
};
