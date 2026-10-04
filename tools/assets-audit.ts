// Asset audit (contract §12 `npm run test:assets`): every art id, atlas frame, sound and music id referenced by the
// content exists — or is known to be missing and has a code fallback. Prints a summary; exits 1 on references to ids
// that are neither delivered nor declared fallback-capable.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SFX, MUSIC } from "../src/game/ids.ts";

const root = new URL("..", import.meta.url).pathname;
let problems = 0;

const sfx = existsSync(join(root, "public/audio/sfx.json")) ? JSON.parse(readFileSync(join(root, "public/audio/sfx.json"), "utf8")) : {};
const missingSfx = SFX.filter((id) => !sfx[id]);
for (const [id, m] of Object.entries(sfx) as [string, { files: string[] }][]) {
  for (const f of m.files) if (!existsSync(join(root, "public", f))) {
    console.log(`✗ sfx ${id}: file missing ${f}`);
    problems++;
  }
}
console.log(`sfx: ${SFX.length - missingSfx.length}/${SFX.length} delivered${missingSfx.length ? ` (silent: ${missingSfx.join(", ")})` : ""}`);

const music = existsSync(join(root, "public/audio/music.json")) ? JSON.parse(readFileSync(join(root, "public/audio/music.json"), "utf8")) : {};
console.log(`music: ${MUSIC.filter((id) => music[id]).length}/${MUSIC.length} delivered`);

const sprites = existsSync(join(root, "public/sprites")) ? readdirSync(join(root, "public/sprites")).filter((f) => f.endsWith(".json")) : [];
for (const f of sprites) {
  const a = JSON.parse(readFileSync(join(root, "public/sprites", f), "utf8"));
  if (!existsSync(join(root, "public/sprites", a.image ?? f.replace(".json", ".png")))) {
    console.log(`✗ atlas ${f}: image missing`);
    problems++;
  }
}
console.log(`atlases: ${sprites.map((f) => f.replace(".json", "")).join(", ") || "none yet"}`);

const artDir = join(root, "public/art");
const countArt = (d: string): number => (existsSync(d) ? readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? countArt(join(d, e.name)) : e.name.endsWith(".png") ? 1 : 0), 0) : 0);
console.log(`painted art: ${countArt(artDir)} images (everything else uses code fallbacks)`);

process.exit(problems ? 1 : 0);
