// Soak test (contract §12 `npm run test:soak`): one page plays a hundred Skat games at the table with the AI in every
// seat (/?dev=table&auto=1), and we watch the JS heap and the frame times. A leak shows as heap growth between the
// early and the late games (measured after a forced GC); a slow frame as a long requestAnimationFrame gap.
//
//   node tools/soak.mjs [--games 100] [--speed 20] [--seed 7] [--rule ramsch] [--timeout 3600]
//
// Chromium runs without GPU; this process lowers its own priority first, so the browser it starts runs niced too
// (the PC is used for gaming meanwhile). Needs the dev server (npm run dev) or SAT_URL (e.g. a `vite preview` build,
// which also avoids reloads when other files change during the run).
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : def;
};
const games = Number(arg("games", 100));
const speed = Number(arg("speed", 20));
const seed = Number(arg("seed", 7));
const rule = arg("rule", "standard");
const timeoutS = Number(arg("timeout", 3600));
const base = process.env.SAT_URL ?? "http://127.0.0.1:5191";
try {
  os.setPriority(0, 15);
} catch {
  /* not permitted: run at normal priority */
}

const browser = await chromium.launch({ args: ["--disable-gpu", "--js-flags=--expose-gc"] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
// frame-time sampler: rAF gaps in ms, kept as a histogram plus the worst values
await page.addInitScript(() => {
  const s = { n: 0, sum: 0, max: 0, over50: 0, over100: 0, buckets: new Array(41).fill(0), last: 0 };
  window.__soakFrames = s;
  const tick = (t) => {
    if (s.last) {
      const d = t - s.last;
      s.n++;
      s.sum += d;
      if (d > s.max) s.max = d;
      if (d > 50) s.over50++;
      if (d > 100) s.over100++;
      s.buckets[Math.min(40, Math.floor(d / 2))]++;
    }
    s.last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const url = `${base}/?dev=table&auto=1&games=${games}&speed=${speed}&seed=${seed}&rule=${rule}&pace=fast`;
console.log(`soak: ${url}`);
await page.goto(url);
await page.waitForFunction(() => !!window.__table, null, { timeout: 60000 });
const cdp = await page.context().newCDPSession(page);
await cdp.send("Performance.enable");
const heap = async () => {
  await cdp.send("HeapProfiler.collectGarbage").catch(() => {});
  const { metrics } = await cdp.send("Performance.getMetrics");
  return (metrics.find((m) => m.name === "JSHeapUsedSize")?.value ?? 0) / 1048576;
};
const state = () => page.evaluate(() => ({ games: window.__table?.games ?? -1, done: !!window.__table?.done, stage: window.__table?.stage, phase: window.__table?.phase, history: window.__table?.history ?? 0 }));
const percentile = (s, p) => {
  const target = s.n * p;
  let acc = 0;
  for (let i = 0; i < s.buckets.length; i++) {
    acc += s.buckets[i];
    if (acc >= target) return i * 2 + 1;
  }
  return 80;
};

const t0 = Date.now();
const samples = [];
let firstHeap = null;
let lastGames = 0;
let lastProgress = Date.now();
let lastKey = "";
let reloads = 0;
let stuck = false;
for (;;) {
  await page.waitForTimeout(2000);
  const st = await state();
  if (st.games < lastGames) {
    reloads++;
    console.log(`  page reloaded at game ${lastGames} (dev server); measuring on`);
    firstHeap = null;
  }
  const key = `${st.games}/${st.stage}/${st.phase}/${st.history}`;
  if (key !== lastKey) {
    lastKey = key;
    lastProgress = Date.now();
  }
  if (st.games !== lastGames) {
    lastGames = st.games;
    if (st.games >= 2 && firstHeap === null) {
      firstHeap = await heap();
      samples.push({ games: st.games, heapMB: +firstHeap.toFixed(2) });
    } else if (st.games % 10 === 0 && st.games > 0) {
      const h = await heap();
      samples.push({ games: st.games, heapMB: +h.toFixed(2) });
      console.log(`  ${st.games} games · heap ${h.toFixed(1)} MB · ${Math.round((Date.now() - t0) / 1000)} s`);
    }
  }
  if (st.done || st.games >= games) break;
  if (Date.now() - lastProgress > 120000) {
    stuck = true;
    console.log(`  STUCK at ${key}`);
    break;
  }
  if (Date.now() - t0 > timeoutS * 1000) {
    console.log("  timeout");
    break;
  }
}
const endHeap = await heap();
const frames = await page.evaluate(() => window.__soakFrames);
// decision times of the computer opponents as the table saw them (wall clock in the browser, src/skat/table/ai.ts)
const ai = await page.evaluate(() => {
  const s = window.__aiStats;
  if (!s) return null;
  const pct = (xs, p) => {
    if (!xs.length) return 0;
    const v = [...xs].sort((a, b) => a - b);
    return v[Math.min(v.length - 1, Math.floor(v.length * p))];
  };
  const byPhase = {};
  let n = 0;
  let over = 0;
  let max = 0;
  const all = [];
  for (const [phase, b] of Object.entries(s.byPhase)) {
    byPhase[phase] = { n: b.n, meanMs: +(b.sumMs / b.n).toFixed(1), p50Ms: pct(b.samples, 0.5), p95Ms: pct(b.samples, 0.95), maxMs: +b.maxMs.toFixed(1), over1500ms: b.over1500 };
    n += b.n;
    over += b.over1500;
    max = Math.max(max, b.maxMs);
    all.push(...b.samples);
  }
  return { realAi: s.realAi, decisions: n, p95Ms: pct(all, 0.95), maxMs: +max.toFixed(1), over1500ms: over, byPhase };
});
mkdirSync("tools/shots", { recursive: true });
await page.screenshot({ path: "tools/shots/soak-end.png" });
await browser.close();

const growth = firstHeap === null ? 0 : endHeap - firstHeap;
const report = {
  url,
  games: lastGames,
  seconds: Math.round((Date.now() - t0) / 1000),
  heap: { afterGame2MB: firstHeap === null ? null : +firstHeap.toFixed(2), endMB: +endHeap.toFixed(2), growthMB: +growth.toFixed(2), samples },
  frames: {
    count: frames.n,
    meanMs: +(frames.sum / Math.max(1, frames.n)).toFixed(2),
    p50Ms: percentile(frames, 0.5),
    p95Ms: percentile(frames, 0.95),
    p99Ms: percentile(frames, 0.99),
    maxMs: +frames.max.toFixed(1),
    over50ms: frames.over50,
    over100ms: frames.over100,
  },
  ai,
  reloads,
  stuck,
  errors: errors.slice(0, 20),
};
writeFileSync("tools/shots/soak.json", JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
// contract §5.4: 95 % of the decisions in the browser under 1.5 s
const aiOk = !ai || ai.decisions === 0 || ai.p95Ms < 1500;
const ok = !stuck && errors.length === 0 && growth < 25 && lastGames >= games && aiOk;
console.log(ok ? "\nsoak ok" : "\nsoak FAILED");
process.exit(ok ? 0 : 1);
