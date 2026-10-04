// Click-through smoke test of a whole tour in the browser (Tour workstream): starts at the kitchen with a name, clicks
// through "Neue Tour", the map and every station by the UI's own click targets (window.__sat.qa.targets()), reloads
// the page in the middle and resumes with "Tour fortsetzen", and stops after the first Preisskat (or --stages 3 for
// the whole tour). Screenshots of every new screen go to tools/shots/tour/play/. Fails on dead ends and page errors.
//   node tools/balance/tour-playtest.mjs [--stages 1|3] [--tutorial] [--steps 800] [--size 1366x768] [--out dir]
// Needs the dev server (npm run dev) or SAT_URL. Chromium runs without GPU.
import { chromium } from "@playwright/test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i < 0 ? d : args[i + 1];
};
const STAGES = Number(opt("stages", "1"));
const TUTORIAL = args.includes("--tutorial");
const [W, H] = opt("size", "1366x768").split("x").map(Number);
const base = process.env.SAT_URL ?? "http://127.0.0.1:5191";
const OUT = opt("out", "tools/shots/tour/play");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ["--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript((tutorial) => {
  if (sessionStorage.getItem("playtest")) return;
  localStorage.clear();
  localStorage.setItem("sat.settings", JSON.stringify({ name: "Gottlob", tutorialDone: !tutorial }));
  sessionStorage.setItem("playtest", "1");
}, TUTORIAL);
// ?autoplay=1: the Skat table plays the player's seat too (src/screens/tour/inn.ts), so the tour can be driven.
await page.goto(base + "/?autoplay=1");
await page.waitForTimeout(1800);

const targets = () => page.evaluate(() => window.__sat?.qa?.targets() ?? []);
const run = () => page.evaluate(() => JSON.parse(localStorage.getItem("sat.run") ?? "null"));
const book = () => page.evaluate(() => JSON.parse(localStorage.getItem("sat.book") ?? "null"));
async function click(t) {
  const box = await page.locator("canvas#game").boundingBox();
  await page.mouse.click(box.x + (t.x + t.w / 2) * (box.width / 960), box.y + (t.y + t.h / 2) * (box.height / 540));
}

// What to press, in order of preference (ids of ui.button / ui.area).
const PREFER = [
  ...(TUTORIAL ? ["nt-tut"] : []), "intro-go", "pv-go", "continue", "new", "nt-next", "nt-go", "sit", "pre-sit", "dice", "res-go", "pre-res-go", "pz-skip", "pz-go",
  "pz-none", "pzr-go", "pitch-go", "dogs-go", "market-go", "garage-go", "ev-next", "tow-go", "acc-home", "tut-home",
  // puzzle stations of the Rätsel area: give up / put away
  "quit-yes", "done", "chess-giveup", "size-6", "quit",
];
const log = [];
let shot = 0;
let lastSig = "";
let stuck = 0;
let reloaded = false;
let tried = new Map();
let nodeTry = 0;

const STEPS = Number(opt("steps", "800"));
for (let step = 0; step < STEPS; step++) {
  await page.waitForTimeout(450);
  const ts = await targets();
  const ids = ts.map((t) => t.id);
  const sig = ids.join(",");
  const r = await run();
  if (sig !== lastSig) {
    shot++;
    await page.screenshot({ path: `${OUT}/${String(shot).padStart(3, "0")}.png` });
    log.push(`${shot}: [${ids.join(" ")}] stage ${r?.stage ?? "-"} at ${r?.at ?? "-"} fuel ${r?.fuel ?? "-"} marks ${r?.marks ?? "-"}`);
    stuck = 0;
    tried = new Map();
  } else stuck++;
  lastSig = sig;
  // The Skat table plays by itself (?autoplay=1) and keeps its click targets while the AI thinks: wait longer there.
  if (stuck > (ids.includes("liste") ? 600 : ids.length === 0 ? 80 : 12)) {
    log.push(`DEAD END at screen ${shot}: ${sig}`);
    break;
  }
  // Done?
  const b = await book();
  if (!r && b && b.tours?.started > 0 && ids.includes("new") && step > 5) {
    log.push("back in the kitchen after the tour");
    break;
  }
  if (TUTORIAL && !r && ids.includes("new") && step > 5) {
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem("sat.settings") ?? "{}"));
    log.push(st.tutorialDone ? "tutorial done, back in the kitchen ✓" : "tutorial: back in the kitchen but not marked done");
    break;
  }
  if (r && r.stage >= STAGES && ids.some((i) => i.startsWith("node-"))) {
    log.push(`reached stage ${r.stage + 1} map: done`);
    break;
  }
  // Once, in the middle of a Skat round: reload and resume with "Tour fortsetzen".
  if (!reloaded && r?.round?.games?.length >= 1 && ids.includes("liste")) {
    reloaded = true;
    const games = r.round.games.length;
    const at = r.at;
    await page.reload();
    await page.waitForTimeout(1800);
    const home = await targets();
    const cont = home.find((t) => t.id === "continue");
    if (!cont) {
      log.push("RESUME FAILED: no „Tour fortsetzen“ after reload");
      break;
    }
    await page.screenshot({ path: `${OUT}/resume-kitchen.png` });
    await click(cont);
    await page.waitForTimeout(1200);
    const after = await targets();
    const r2 = await run();
    await page.screenshot({ path: `${OUT}/resume-table.png` });
    const ok = after.some((t) => t.id === "liste") && r2?.at === at && (r2?.round?.games?.length ?? 0) >= games;
    log.push(ok ? `resume mid-round: back at the table at ${at} after ${games} game(s) ✓` : `resume: DIFFERENT state after reload (${after.map((t) => t.id).join(",")})`);
    continue;
  }
  // chess dialogs first (give up → "yes", then on), else the preferred buttons
  let pick = ts.find((t) => t.id.startsWith("chess-box-") && t.id !== "chess-box-no");
  if (!pick) pick = PREFER.map((id) => ts.find((t) => t.id === id)).find(Boolean);
  if (!pick) pick = ts.find((t) => t.id.startsWith("mat-") && !t.id.startsWith("mat-out"));
  if (!pick) pick = ts.find((t) => t.id.startsWith("reg-") && t.id !== "reg-stop");
  if (!pick) {
    // event answers: try them in order until one works (disabled ones do nothing)
    const ev = ts.filter((t) => /^ev-\d$/.test(t.id));
    if (ev.length) pick = ev[Math.min(ev.length - 1, tried.get("ev") ?? 0)], tried.set("ev", (tried.get("ev") ?? 0) + 1);
  }
  if (!pick && r && ids.some((i) => i.startsWith("node-"))) {
    const here = r.map.nodes.find((n) => n.id === r.at);
    const next = here?.next?.[0];
    pick = ts.find((t) => t.id === `node-${next}`);
  }
  if (!pick && !r && ids.includes("pv-close")) pick = ts.find((t) => t.id === "pv-close"); // not reachable: close
  if (!pick && !r && ids.some((i) => i.startsWith("node-"))) {
    // the tutorial is not saved: open the station previews in order until one offers "Hinfahren"
    const nodes = ts.filter((t) => t.id.startsWith("node-")).sort((a, b) => a.x - b.x);
    pick = nodes[nodeTry++ % nodes.length];
  }
  if (!pick && ids.includes("liste")) continue; // the table is playing
  if (!pick) {
    log.push(`no idea what to click on screen ${shot}: ${sig}`);
    stuck++;
    continue;
  }
  await click(pick);
}

const r = await run();
const b = await book();
log.push(`end: run ${r ? `stage ${r.stage + 1}, fuel ${r.fuel}, marks ${r.marks}, ended ${r.ended ?? "no"}` : "none (ended or not started)"}`);
log.push(`book: tours ${JSON.stringify(b?.tours)}, stamps ${Object.keys(b?.stamps ?? {}).length}, trophies ${JSON.stringify(b?.trophies)}`);
if (errors.length) log.push(`PAGE ERRORS:\n  ${errors.join("\n  ")}`);
writeFileSync(`${OUT}/log.txt`, log.join("\n") + "\n");
console.log(log.join("\n"));
await browser.close();
// "no idea" on single frames is a fade or an animation between screens; only a stuck screen counts (DEAD END)
process.exit(errors.length || log.some((l) => /DEAD END|FAILED|DIFFERENT/.test(l)) ? 1 : 0);
