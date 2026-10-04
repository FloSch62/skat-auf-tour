// Screenshots of the screens that show the ui atlas, at 1366×768 and 1920×1080, with the theme's code panels
// switched off (?atlasui=1), into tools/shots/sprites/ui/. Needs the dev server (npm run dev) or SAT_URL.
//   node tools/sprites/ui-shots.mjs [filter] [extra-query]
// Chromium runs without GPU.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.env.SAT_URL ?? "http://127.0.0.1:5191";
const only = process.argv[2] && process.argv[2] !== "all" ? process.argv[2] : null;
const extra = process.argv[3] ?? "atlasui=1";
const named = { settings: { name: "Gottlob" } };
const routes = [
  { name: "home", path: "/", storage: named, move: [790, 200] },
  { name: "settings", path: "/", storage: named, actions: [[790, 255]], move: [400, 140] },
  { name: "newtour", path: "/?dev=newtour", storage: named },
  { name: "map", path: "/?dev=map&seed=3&stage=0" },
  { name: "table", path: "/?dev=table-declare&seed=42", storage: named },
  { name: "market", path: "/?dev=station&kind=market" },
  { name: "kit", path: "/?dev=kit", move: [200, 210] },
];
const out = "tools/shots/sprites/ui";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--disable-gpu"] });
for (const r of routes) {
  if (only && !r.name.includes(only)) continue;
  for (const [w, h] of [[1366, 768], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (r.storage) {
      await page.addInitScript((s) => {
        for (const [k, v] of Object.entries(s)) localStorage.setItem("sat." + k, JSON.stringify(v));
      }, r.storage);
    }
    const sep = r.path.includes("?") ? "&" : "?";
    await page.goto(base + r.path + (extra ? sep + extra : ""));
    await page.waitForTimeout(1800);
    const box = await page.locator("canvas#game").boundingBox();
    const at = ([x, y]) => [box.x + x * (box.width / 960), box.y + y * (box.height / 540)];
    for (const a of r.actions ?? []) {
      await page.mouse.click(...at(a));
      await page.waitForTimeout(500);
    }
    if (r.move) await page.mouse.move(...at(r.move));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${r.name}-${w}.png` });
    await page.close();
    console.log(`${r.name} ${w}×${h}${errors.length ? "  errors: " + errors.join(" | ") : ""}`);
  }
}
await browser.close();
