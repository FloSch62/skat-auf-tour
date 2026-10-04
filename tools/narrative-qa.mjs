// Narrative check (contract §12 `npm run test:narrative`): every event is opened in the game (?dev=event&id=…), and
// every enabled answer is clicked once; the screen must show no page error, no unresolved placeholder, no
// "undefined"/"NaN", and every text must use the bitmap fonts' glyphs. Screenshots of the question and each outcome
// go to tools/shots/narrative/ for reading. Chromium without GPU; needs the dev server or SAT_URL (a static
// `vite preview` is steadier while other areas edit files).
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const base = process.env.SAT_URL ?? "http://127.0.0.1:5191";
const only = process.argv[2];
const glyphs = new Set(Object.keys(JSON.parse(readFileSync("public/fonts/head.json", "utf8")).glyphs));
mkdirSync("tools/shots/narrative", { recursive: true });

const browser = await chromium.launch({ args: ["--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.addInitScript(() => localStorage.setItem("sat.settings", JSON.stringify({ name: "Gottlob" })));
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

// event ids from the content module, read through the game itself
await page.goto(base + "/?dev=kit");
await page.waitForTimeout(1500);
const ids = await page.evaluate(async () => {
  const m = await import("/src/content/events/index.ts");
  return m.ALL_EVENTS.map((e) => e.id);
});

const PLACEHOLDER = /\{[a-z]+(:[a-z0-9-]+)?\}/i;
const COLOR_TAG = /\{(\/|br|icon:[^}]+|#[0-9a-f]{6}|[a-z]+[0-9]?)\}/gi;
const check = (texts, where) => {
  const issues = [];
  for (const tx of new Set(texts)) {
    const plain = tx.replace(COLOR_TAG, (m) => (/^\{(name|title|partner|child|van|bike|dog|place|home|note|suit|hint|price|d)\}$/i.test(m) ? m : ""));
    if (PLACEHOLDER.test(plain) || /undefined|NaN|\[object/.test(plain)) issues.push(`${where}: "${tx.slice(0, 90)}"`);
    for (const ch of plain) if (ch !== "\n" && !glyphs.has(ch)) { issues.push(`${where}: glyph ${JSON.stringify(ch)} missing in "${tx.slice(0, 50)}"`); break; }
  }
  return issues;
};
const state = () => page.evaluate(() => ({ text: window.__sat.qa.text.slice(), targets: window.__sat.qa.targets() }));
const click = async (t) => {
  const box = await page.locator("canvas#game").boundingBox();
  await page.mouse.click(box.x + (t.x + t.w / 2) * (box.width / 960), box.y + (t.y + t.h / 2) * (box.height / 540));
};

const report = [];
let problems = 0;
for (const id of ids) {
  if (only && !id.includes(only)) continue;
  errors.length = 0;
  await page.goto(`${base}/?dev=event&id=${id}`);
  await page.waitForTimeout(900);
  let s = await state();
  const issues = check(s.text, "question");
  await page.screenshot({ path: `tools/shots/narrative/${id}.png` });
  const choices = s.targets.filter((t) => /^ev-\d+$/.test(t.id));
  for (const c of choices) {
    await page.goto(`${base}/?dev=event&id=${id}`);
    await page.waitForTimeout(700);
    s = await state();
    const t = s.targets.find((x) => x.id === c.id);
    if (!t) continue;
    await click(t);
    await page.waitForTimeout(500);
    s = await state();
    issues.push(...check(s.text, `answer ${c.id}`));
    await page.screenshot({ path: `tools/shots/narrative/${id}-${c.id}.png` });
  }
  issues.push(...errors.map((e) => `page error: ${e}`));
  problems += issues.length;
  report.push({ id, choices: choices.length, issues });
  console.log(`${issues.length ? "✗" : "✓"} ${id} (${choices.length} answers)${issues.length ? "\n   " + issues.slice(0, 6).join("\n   ") : ""}`);
}
await browser.close();
writeFileSync("tools/shots/narrative/report.json", JSON.stringify(report, null, 1));
console.log(problems ? `\n${problems} problems in ${report.filter((r) => r.issues.length).length} events` : `\nall ${report.length} events fine`);
process.exit(problems ? 1 : 0);
