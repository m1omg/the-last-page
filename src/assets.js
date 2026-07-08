// assets.js — image loading with graceful placeholders while art bakes.
const images = new Map();

// opaque art ships as JPEG; anything needing alpha stays PNG
const JPG = [
  "cg_title",
  "bg_real_bedroom", "bg_real_hall", "bg_real_street", "bg_hospital_room",
  "bg_blank_page", "bg_meadow_1", "bg_meadow_2", "bg_meadow_2_clean", "bg_woods_1", "bg_woods_2",
  "bg_bay_1", "bg_bay_2", "bg_depths_1", "bg_depths_2",
  "pt_mira_neutral", "pt_mira_giggly", "pt_mira_gloomy", "pt_mira_grumpy",
  "pt_biscuit", "pt_wisp", "pt_ren",
  "cg_memory_1", "cg_memory_2", "cg_memory_3", "cg_memory_4",
  "cg_ending_true", "cg_ending_page",
];
const PNG = [
  "en_sniffle", "en_scribble", "en_thornbud", "en_buttoncrab", "en_inklet",
  "boss_tangle", "boss_swan", "boss_keeper", "boss_smudge",
  "sp_biscuit", "sp_wisp",
  "sp_mira_d0", "sp_mira_d1", "sp_mira_l0", "sp_mira_l1",
  "sp_mira_r0", "sp_mira_r1", "sp_mira_u0", "sp_mira_u1",
];
const MANIFEST = [
  ...JPG.map((n) => [n, "jpg"]),
  ...PNG.map((n) => [n, "png"]),
];

function loadOne(name, ext) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images.set(name, img); resolve(true); };
    img.onerror = () => { resolve(false); };
    img.src = `assets/img/${name}.${ext}`;
  });
}

export const assets = {
  missing: [],
  async init() {
    const results = await Promise.all(MANIFEST.map(async ([n, ext]) => [n, await loadOne(n, ext)]));
    this.missing = results.filter(([, ok]) => !ok).map(([n]) => n);
    if (this.missing.length) console.warn("missing images:", this.missing.join(", "));
  },
  img(name) { return images.get(name) || null; },
  has(name) { return images.has(name); },
};
