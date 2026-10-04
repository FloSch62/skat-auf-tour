// Readability check (contract §0.5, §12 `npm run test:readable`): every route in tools/qa-routes.json is opened at
// 1366×768 and 1920×1080; every click target must be at least 44×32 layout units and lie on screen; texts drawn in
// decoration-only fonts are listed for review. Areas add their screens to tools/qa-routes.json.
// Chromium runs without GPU. Needs the dev server (npm run dev) or SAT_URL.
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";

const base = process.env.SAT_URL ?? "http://127.0.0.1:5191";
const routes = JSON.parse(readFileSync(new URL("./qa-routes.json", import.meta.url), "utf8"));
const only = process.argv[2];
const sizes = [[1366, 768], [1920, 1080]];
const browser = await chromium.launch({ args: ["--disable-gpu"] });
const report = [];
let failures = 0;
mkdirSync("tools/shots/qa", { recursive: true });
for (const r of routes) {
  if (only && !r.name.includes(only)) continue;
  for (const [w, h] of sizes) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    if (r.storage) {
      await page.addInitScript((s) => {
        for (const [k, v] of Object.entries(s)) localStorage.setItem("sat." + k, JSON.stringify(v));
      }, r.storage);
    }
    await page.goto(base + r.path);
    await page.waitForTimeout(r.wait ?? 1500);
    const box = await page.locator("canvas#game").boundingBox();
    for (const a of r.actions ?? []) {
      if (a.click) await page.mouse.click(box.x + a.click[0] * (box.width / 960), box.y + a.click[1] * (box.height / 540));
      if (a.wait) await page.waitForTimeout(a.wait);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(300);
    const data = await page.evaluate(() => {
      const q = window.__sat?.qa;
      return q ? { targets: q.targets(), small: q.small.slice(), text: q.text.slice() } : null;
    });
    await page.screenshot({ path: `tools/shots/qa/${r.name}-${w}.png` });
    await page.close();
    const issues = [...errors.map((e) => `page error: ${e}`)];
    if (!data) issues.push("no QA hook (window.__sat.qa)");
    else {
      for (const t of data.targets) {
        if (t.w < 44 || t.h < 32) issues.push(`target ${t.id} is ${Math.round(t.w)}×${Math.round(t.h)} (< 44×32)`);
        if (t.x < 0 || t.y < 0 || t.x + t.w > 960 || t.y + t.h > 540) issues.push(`target ${t.id} off screen`);
      }
      // unresolved placeholders or broken values in anything drawn
      for (const tx of new Set(data.text)) {
        const plain = tx.replace(/\{(\/|br|icon:[^}]+|#[0-9a-f]{6}|[a-z]+[0-9]?)\}/gi, (m) => (/^\{[a-z]+\}$/i.test(m) && !/^\{(gold|beer|money|white|cream|dim|faint|good|green|bad|red|warn|blue|title|ink|inkdim|inkred|inkgreen|inkblue|wood)\}$/i.test(m) && !/^\{(ink|paper|wood|beer|brick|road|forest|felt|river|dusk|stone|olive)[0-9]\}$/i.test(m) ? m : ""));
        if (/\{[a-z]|undefined|NaN|\[object/i.test(plain)) issues.push(`text shows a placeholder or broken value: "${tx.slice(0, 80)}"`);
      }
    }
    failures += issues.length;
    report.push({ route: r.name, size: `${w}×${h}`, targets: data?.targets.length ?? 0, issues, decorText: [...new Set((data?.small ?? []).map((s) => `${s.font}: ${s.text}`))].slice(0, 20) });
    console.log(`${issues.length ? "✗" : "✓"} ${r.name} ${w}×${h}: ${data?.targets.length ?? 0} targets${issues.length ? "\n   " + issues.slice(0, 8).join("\n   ") : ""}`);
  }
}
await browser.close();
writeFileSync("tools/shots/qa/readable.json", JSON.stringify(report, null, 1));
console.log(failures ? `\n${failures} problems` : "\nall readable");
process.exit(failures ? 1 : 0);
