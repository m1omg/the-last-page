// collision_audit.mjs — dump every map's grid + entities as JSON so
// tools/collision_audit.py can render art-vs-collision overlays.
import { MAPS } from "../src/data/maps.js";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = {};
for (const [name, d] of Object.entries(MAPS)) {
  out[name] = { bg: d.bg, grid: d.grid, entities: d.entities };
}
writeFileSync(join(root, "tools", "_maps.json"), JSON.stringify(out, null, 1));
console.log(`dumped ${Object.keys(out).length} maps`);
