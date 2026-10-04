// Screenshot helper: node tools/shot.mjs "<url path+query>" out.png [waitMs] [width] [height] [actions-json]
// actions-json: [{"click":[x,y]} (layout coords) | {"key":"Space"} | {"type":"Gottlob"} | {"wait":ms} | {"move":[x,y]} | {"shot":"file.png"}]
// SAT_STORAGE='{"settings":{"name":"Gottlob"}}' pre-fills localStorage (keys without the "sat." prefix) before load.
// Chromium runs with the GPU disabled (software canvas) so screenshots never compete with other GPU work.
import { chromium } from "@playwright/test";
const [, , path = "/", out = "tools/shots/shot.png", wait = "1500", w = "1920", h = "1080", actions = "[]"] = process.argv;
const base = process.env.SAT_URL ?? "http://127.0.0.1:5191";
const browser = await chromium.launch({ args: ["--disable-gpu", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
if (process.env.SAT_STORAGE) {
  const store = JSON.parse(process.env.SAT_STORAGE);
  await page.addInitScript((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem("sat." + k, JSON.stringify(v));
  }, store);
}
await page.goto(base + path);
await page.waitForTimeout(+wait);
const toClient = async (x, y) => {
  const box = await page.locator("canvas#game").boundingBox();
  return [box.x + x * (box.width / 960), box.y + y * (box.height / 540)];
};
for (const a of JSON.parse(actions)) {
  if (a.click) { const [cx, cy] = await toClient(...a.click); await page.mouse.click(cx, cy); }
  if (a.move) { const [cx, cy] = await toClient(...a.move); await page.mouse.move(cx, cy); }
  if (a.key) await page.keyboard.press(a.key);
  if (a.type) await page.keyboard.type(a.type);
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.shot) await page.screenshot({ path: a.shot });
  if (a.eval) console.log(JSON.stringify(await page.evaluate(a.eval)));
}
await page.screenshot({ path: out });
if (logs.length) console.log(logs.slice(-30).join("\n"));
await browser.close();
