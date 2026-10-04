// Browser check of the delivered music (after TIME TO LIVE check-music-deliveries): headless Chromium, GPU disabled.
//   node audio-src/music/check-browser.mjs            (needs the dev server: npm run dev, http://127.0.0.1:5191)
// 1. Every file in public/audio/music.json decodes in Chromium (decodeAudioData); its length matches music.json
//    (per layer for unsynced layers); loopStart < loopEnd <= duration.
// 2. Each loop seam is rendered offline exactly as the game plays it (AudioBufferSourceNode, loop=true, loopStart,
//    loopEnd; start 1.5 s before loopEnd) and compared with the take's own natural transition into loopStart: the
//    largest sample step within +-5 ms of the jump must not stand out from the music and from the natural
//    transition (click check), and the level change across the jump must match the natural one within 6 dB.
// 3. The game's own engine (src/core/audio.ts, the module instance the game uses) plays every id: music.play(id)
//    starts the right number of sources with loop flags and loop points from music.json; setLayer("tense") moves
//    the gains. Writes audio-src/music/work/browser-check.json and exits 1 on a failure.
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";

const base = process.env.SAT_URL ?? "http://127.0.0.1:5191";
const browser = await chromium.launch({ args: ["--disable-gpu", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
const logs = [];
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(base + "/");
await page.waitForTimeout(2500);

const files = await page.evaluate(async () => {
  const meta = await (await fetch("/audio/music.json", { cache: "no-store" })).json();
  const out = [];
  for (const [id, m] of Object.entries(meta)) {
    for (const [layer, path] of Object.entries(m.files)) {
      const lp = (m.layers && m.layers[layer]) || m;
      const r = { id, layer, path, ok: true, problems: [] };
      try {
        const data = await (await fetch("/" + path, { cache: "no-store" })).arrayBuffer();
        const ctx = new OfflineAudioContext(2, 48000, 48000);
        const buf = await ctx.decodeAudioData(data);
        r.bytes = data.byteLength;
        r.decoded = { duration: buf.duration, sampleRate: buf.sampleRate, channels: buf.numberOfChannels };
        if (Math.abs(buf.duration - lp.duration) > 0.05) r.problems.push(`duration ${buf.duration} vs ${lp.duration}`);
        if (!(lp.loopEnd > lp.loopStart && lp.loopEnd <= buf.duration + 1e-3)) r.problems.push("loop points");
        if (m.loop !== false) {
          // render the seam as the game plays it, and the take's own natural transition into loopStart
          const pre = 1.5, post = 1.5, sr = buf.sampleRate;
          const render = async (loop) => {
            const oc = new OfflineAudioContext(buf.numberOfChannels, Math.round((pre + post) * sr), sr);
            const src = oc.createBufferSource();
            src.buffer = buf;
            if (loop) { src.loop = true; src.loopStart = lp.loopStart; src.loopEnd = lp.loopEnd; }
            src.connect(oc.destination);
            src.start(0, (loop ? lp.loopEnd : lp.loopStart) - pre);
            return (await oc.startRendering()).getChannelData(0);
          };
          const measure = (x) => {
            const j = Math.round(pre * sr);
            const steps = [];
            for (let i = 1; i < x.length; i++) steps.push(Math.abs(x[i] - x[i - 1]));
            const near = Math.max(...steps.slice(j - 240, j + 240));
            const away = steps.slice(0, j - 2400).concat(steps.slice(j + 2400)).sort((a, b) => a - b);
            const rms = (a, b) => Math.sqrt(x.slice(a, b).reduce((s, v) => s + v * v, 0) / (b - a));
            return { ratio: near / (away[Math.floor(away.length * 0.999)] || 1e-9),
                     before: 20 * Math.log10(rms(j - sr / 2, j) + 1e-9), after: 20 * Math.log10(rms(j, j + sr / 2) + 1e-9) };
          };
          const seam = measure(await render(true)), nat = measure(await render(false));
          r.seam = { ratio: seam.ratio, naturalRatio: nat.ratio, levelBeforeDb: seam.before, levelAfterDb: seam.after,
                     naturalBeforeDb: nat.before, naturalAfterDb: nat.after };
          // a click: the jump's largest sample step stands out from the music AND from the natural transition
          if (seam.ratio > 1.5 && seam.ratio > 1.3 * nat.ratio) r.problems.push(`possible click (step x${seam.ratio.toFixed(2)}, natural x${nat.ratio.toFixed(2)})`);
          // level: the change across the jump differs from the natural change at loopStart by more than 6 dB
          const dSeam = seam.after - seam.before, dNat = nat.after - nat.before;
          if (Math.abs(dSeam - dNat) > 6) r.problems.push(`level step ${dSeam.toFixed(1)} dB vs natural ${dNat.toFixed(1)} dB`);
        }
      } catch (e) {
        r.problems.push(String(e));
      }
      r.ok = r.problems.length === 0;
      out.push(r);
    }
  }
  return out;
});

const engine = await page.evaluate(async () => {
  const mod = await import("/src/core/audio.ts");
  const { audio, music } = mod;
  const meta = await (await fetch("/audio/music.json", { cache: "no-store" })).json();
  await audio.init();
  audio.unlock();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = [];
  for (const [id, m] of Object.entries(meta)) {
    const r = { id, problems: [] };
    await music.play(id, "calm", 0.2);
    for (let i = 0; i < 100 && !music["current"]; i++) await wait(50);
    const cur = music["current"];
    if (!cur || cur.id !== id) { r.problems.push("not playing"); out.push(r); continue; }
    r.state = audio.ctx.state;
    r.sources = cur.sources.map((s, i) => {
      const name = Object.keys(cur.layerGains)[i];
      const lp = (m.layers && m.layers[name]) || m;
      const okLoop = m.loop === false ? !s.loop
        : s.loop && Math.abs(s.loopStart - lp.loopStart) < 1e-3 && Math.abs(s.loopEnd - lp.loopEnd) < 1e-3;
      if (!okLoop) r.problems.push(`${name}: engine loop ${s.loop} ${s.loopStart.toFixed(3)}-${s.loopEnd.toFixed(3)}, ` +
                                   `music.json ${lp.loopStart}-${lp.loopEnd}`);
      return { name, duration: s.buffer.duration, loop: s.loop, loopStart: s.loopStart, loopEnd: s.loopEnd };
    });
    if (cur.sources.length !== Object.keys(m.files).length) r.problems.push("missing sources");
    if (m.files.tense) {
      music.setLayer("tense", 0.3);
      await wait(Math.max(400, (m.synced === false ? 3 : 0.3) * 1000 + 200));
      r.gains = Object.fromEntries(Object.entries(cur.layerGains).map(([k, g]) => [k, +g.gain.value.toFixed(3)]));
      if (!(r.gains.tense > 0.9 && r.gains.calm < 0.1)) r.problems.push(`setLayer tense: gains ${JSON.stringify(r.gains)}`);
      music.setLayer("calm", 0);
    }
    out.push(r);
  }
  music.stop(0.1);
  return out;
});
await browser.close();

mkdirSync("audio-src/music/work", { recursive: true });
const report = { checked: new Date().toISOString(), chromium: "headless, --disable-gpu", files, engine, logs };
writeFileSync("audio-src/music/work/browser-check.json", JSON.stringify(report, null, 1));
let bad = 0;
for (const f of files) {
  const s = f.seam ? ` seam step x${f.seam.ratio.toFixed(2)} (natural x${f.seam.naturalRatio.toFixed(2)}), level ` +
    `${f.seam.levelBeforeDb.toFixed(1)} -> ${f.seam.levelAfterDb.toFixed(1)} dB (natural ${f.seam.naturalBeforeDb.toFixed(1)} -> ` +
    `${f.seam.naturalAfterDb.toFixed(1)})` : "";
  console.log(`${f.ok ? "ok  " : "FAIL"} ${f.id}/${f.layer}: ${f.decoded ? f.decoded.duration.toFixed(2) + " s" : "no decode"}${s}` +
              (f.problems.length ? "  " + f.problems.join("; ") : ""));
  bad += f.ok ? 0 : 1;
}
for (const e of engine) {
  console.log(`${e.problems.length ? "FAIL" : "ok  "} engine ${e.id}: ${e.sources ? e.sources.length + " source(s)" : ""}` +
              `${e.gains ? " gains after setLayer(tense) " + JSON.stringify(e.gains) : ""}` +
              (e.problems.length ? "  " + e.problems.join("; ") : ""));
  bad += e.problems.length ? 1 : 0;
}
if (logs.length) console.log(logs.join("\n"));
process.exit(bad ? 1 : 0);
