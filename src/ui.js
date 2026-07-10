// ui.js — shared drawing helpers: wobbly hand-drawn boxes, text, bars.
//
// Two font stacks. "Storybook" is the desktop look; "Clear" leads with Patrick
// Hand, which we bundle (assets/fonts, OFL) — Android has none of the others and
// used to fall through to bare `cursive`, a thin script that is near-illegible on
// a phone. Symbol glyphs (☞ ▼ ◆ ← →) aren't in Patrick Hand; canvas falls back
// per-glyph, which is why sans-serif stays pinned to the end of both stacks.
const STACK_STORY = '"Comic Sans MS", "Chalkboard SE", "Segoe Print", "Patrick Hand", cursive, sans-serif';
const STACK_CLEAR = '"Patrick Hand", "Comic Sans MS", "Chalkboard SE", "Segoe Print", cursive, sans-serif';

// `let` + a setter, not `const`: ES module live bindings mean every `${FONT}`
// call site picks the new value up with no plumbing.
export let FONT = STACK_STORY;
export let TEXT_SCALE = 1;

export function setMobileMode(on) {
  FONT = on ? STACK_CLEAR : STACK_STORY;
  TEXT_SCALE = on ? 1.1 : 1; // ~10% larger — dialogue and CG captions only
}

// Canvas silently falls back when a webfont hasn't loaded yet, so the first
// frame must wait for it. Never let a missing FontFace API block the boot.
export async function loadFonts() {
  try {
    if (!document.fonts) return;
    await Promise.race([
      Promise.all([
        document.fonts.load('22px "Patrick Hand"'),
        document.fonts.load('bold 22px "Patrick Hand"'),
      ]).then(() => document.fonts.ready),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (_) { /* ship it with whatever the device has */ }
}

// deterministic wobble so boxes don't shimmer every frame
function wob(seed, i, amp) {
  const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 2 * amp;
}

export function drawBox(ctx, x, y, w, h, { fill = "rgba(255,252,240,0.96)", stroke = "#2a2320", lw = 3, seed = 1 } = {}) {
  ctx.save();
  ctx.beginPath();
  const pts = [];
  const per = [[x, y, w, 0], [x + w, y, 0, h], [x + w, y + h, -w, 0], [x, y + h, 0, -h]];
  let i = 0;
  for (const [sx, sy, dx, dy] of per) {
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      pts.push([sx + dx * t + wob(seed, i, 2.2), sy + dy * t + wob(seed, i + 50, 2.2)]);
      i++;
    }
  }
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}

export function drawText(ctx, text, x, y, { size = 22, color = "#2a2320", align = "left", bold = false, maxW = 0 } = {}) {
  ctx.save();
  ctx.font = `${bold ? "bold " : ""}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  if (maxW > 0) {
    for (const line of wrapText(ctx, text, maxW)) {
      ctx.fillText(line, x, y);
      y += size * 1.32;
    }
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
  return y;
}

export function wrapText(ctx, text, maxW) {
  const out = [];
  for (const hard of String(text).split("\n")) {
    let line = "";
    for (const word of hard.split(" ")) {
      const probe = line ? line + " " + word : word;
      if (ctx.measureText(probe).width > maxW && line) {
        out.push(line);
        line = word;
      } else {
        line = probe;
      }
    }
    out.push(line);
  }
  return out;
}

export function drawBar(ctx, x, y, w, h, ratio, color, label) {
  ctx.save();
  ctx.fillStyle = "#3b332e";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, Math.max(0, (w - 4) * Math.max(0, Math.min(1, ratio))), h - 4);
  ctx.strokeStyle = "#2a2320";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  if (label) {
    ctx.font = `bold ${h - 6}px ${FONT}`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  }
  ctx.restore();
}

export const EMOTION_COLOR = {
  neutral: "#8d8478",
  giggly: "#e8a53a",
  grumpy: "#d4543a",
  gloomy: "#5a7fc4",
};

export function emotionTag(ctx, x, y, emotion) {
  if (!emotion || emotion === "neutral") return;
  const label = emotion.toUpperCase();
  ctx.save();
  ctx.font = `bold 14px ${FONT}`;
  const w = ctx.measureText(label).width + 12;
  drawBox(ctx, x - w / 2, y, w, 20, { fill: EMOTION_COLOR[emotion], seed: y });
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 11);
  ctx.restore();
}
