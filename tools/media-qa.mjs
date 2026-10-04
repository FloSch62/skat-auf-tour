// Media check (contract §12 `npm run test:media`): decode every delivered image (art index, sprite atlases, fonts)
// and every sound (sfx.json, music.json) in Chromium. Exits 1 on any file that fails to load or decode.
import { chromium } from "@playwright/test";

const base = process.env.SAT_URL ?? "http://127.0.0.1:5191";
const browser = await chromium.launch({ args: ["--disable-gpu", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
await page.goto(base + "/?dev=kit");
await page.waitForTimeout(800);
const result = await page.evaluate(async () => {
  const get = async (p) => {
    try {
      const r = await fetch(p);
      return r.ok ? await r.json() : null;
    } catch {
      return null; // missing file (the dev server answers with index.html)
    }
  };
  const images = [];
  const art = (await get("art/index.json")) ?? {};
  for (const f of Object.values(art)) images.push(`art/${f}`);
  for (const a of ["ui", "icons", "cards", "fx", "drinks", "words", "chess", "sudoku", "van", "items"]) {
    const j = await get(`sprites/${a}.json`);
    if (j) images.push(`sprites/${j.image ?? `${a}.png`}`);
  }
  for (const f of ["body", "head", "big", "huge", "label", "labelb", "small", "caps", "capsb", "note"]) images.push(`fonts/${f}.png`);
  const sounds = [];
  for (const file of ["audio/sfx.json", "audio/music.json"]) {
    const j = (await get(file)) ?? {};
    for (const m of Object.values(j)) for (const f of [...(m.files?.length ? m.files : Object.values(m.files ?? {}))]) sounds.push(f.startsWith("audio/") ? f : `audio/${file.includes("music") ? "music" : "sfx"}/${f}`);
  }
  const bad = [];
  let bytes = 0;
  for (const p of images) {
    try {
      const blob = await (await fetch(p)).blob();
      bytes += blob.size;
      await createImageBitmap(blob);
    } catch (e) {
      bad.push(`${p}: ${e}`);
    }
  }
  const ctx = new OfflineAudioContext(1, 44100, 44100);
  for (const p of sounds) {
    try {
      const buf = await (await fetch(p)).arrayBuffer();
      bytes += buf.byteLength;
      await ctx.decodeAudioData(buf);
    } catch (e) {
      bad.push(`${p}: ${e}`);
    }
  }
  return { images: images.length, sounds: sounds.length, bad, mb: (bytes / 1048576).toFixed(1) };
});
await browser.close();
console.log(`${result.images} images, ${result.sounds} sounds, ${result.mb} MB decoded`);
for (const b of result.bad) console.log(`✗ ${b}`);
process.exit(result.bad.length ? 1 : 0);
