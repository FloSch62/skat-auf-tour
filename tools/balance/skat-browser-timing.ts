// Decision times of the computer opponent in a real browser (contract §5.4: 95 % of decisions under 1.5 s).
//   nice -n 15 node --experimental-strip-types --no-warnings tools/balance/skat-browser-timing.ts [--games 12] [--out f.json]
// 1. Plays seeded games in node and records every AiRequest (SeatView + persona + seed) with its node time.
// 2. Builds a tiny page around src/skat/ai/client.ts with Vite (so the real module Web Worker is used).
// 3. Replays the requests in headless Chromium (--disable-gpu) one by one and measures the round trip.
// Writes a JSON summary that tools/balance/skat-league.ts --browser puts into docs/balance-skat.md.
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hashString } from "../../src/core/rng.ts";
import type { CharacterId } from "../../src/game/ids.ts";
import { applyAction, currentSeat, newGame, viewFor } from "../../src/skat/rules/index.ts";
import type { Seat } from "../../src/skat/rules/index.ts";
import type { AiRequest } from "../../src/skat/ai/api.ts";
import { decide } from "../../src/skat/ai/decide.ts";

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : def;
}

const games = Number(arg("games", "12"));
const out = arg("out", "");
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TABLES: [CharacterId, CharacterId, CharacterId][] = [
  ["wirtin", "maurer", "zocker"],
  ["altmeister", "rechnerin", "grandspieler"],
  ["nullfuchs", "lehrer", "kommandant"],
];

// ─── 1. Record ────────────────────────────────────────────────────────────────────────────────────────────
const reqs: AiRequest[] = [];
const nodeMs: number[] = [];
const warm: AiRequest[] = [];
for (let g = -1; g < games; g++) {
  // Game -1 only warms up the JIT (node here, the worker below) and is not measured.
  const seed = 900_000 + g;
  const k = g + 3; // g = -1 is the warm-up game
  const table = TABLES[k % TABLES.length];
  let s = newGame({ seed, dealer: (k % 3) as Seat });
  while (s.phase !== "done") {
    const seat = currentSeat(s)!;
    const req: AiRequest = { view: viewFor(s, seat), character: table[seat], depth: 1, seed: hashString(`${seed}/${s.history.length}`), tournament: false };
    const t0 = performance.now();
    const a = decide(req);
    if (g >= 0) {
      nodeMs.push(performance.now() - t0);
      reqs.push(req);
    } else warm.push(req);
    s = applyAction(s, a);
  }
}
console.error(`recorded ${reqs.length} decisions from ${games} games`);

// ─── 2. Build the page ────────────────────────────────────────────────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), "skat-ai-bench-"));
writeFileSync(join(dir, "index.html"), `<!doctype html><meta charset="utf-8"><title>AI bench</title><script type="module" src="./bench.ts"></script>`);
writeFileSync(
  join(dir, "bench.ts"),
  `import { WorkerAi } from ${JSON.stringify(join(ROOT, "src/skat/ai/client.ts"))};
const ai = new WorkerAi();
(globalThis as any).runBench = async (reqs: any[]) => {
  const out: { rt: number; worker: number }[] = [];
  for (const r of reqs) {
    const t0 = performance.now();
    await ai.decide(r);
    out.push({ rt: performance.now() - t0, worker: ai.lastMs });
  }
  return out;
};
(globalThis as any).benchReady = true;
`,
);
const { build } = await import("vite");
await build({ root: dir, logLevel: "warn", build: { outDir: join(dir, "dist"), target: "es2022", emptyOutDir: true }, configFile: false });

// ─── 3. Serve and replay in Chromium ──────────────────────────────────────────────────────────────────────
const TYPES: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const server = createServer((req, res) => {
  const path = join(dir, "dist", decodeURIComponent((req.url ?? "/").split("?")[0]).replace(/^\/$/, "/index.html"));
  if (!existsSync(path)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream" });
  res.end(readFileSync(path));
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
const port = (server.address() as { port: number }).port;
const { chromium } = await import("@playwright/test");
const browser = await chromium.launch({ args: ["--disable-gpu"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("pageerror", e.message));
await page.goto(`http://127.0.0.1:${port}/`);
await page.waitForFunction(() => (globalThis as { benchReady?: boolean }).benchReady === true);
// Warm up the worker (JIT) with the unmeasured game, then measure all.
await page.evaluate((r) => (globalThis as unknown as { runBench(x: unknown[]): Promise<unknown> }).runBench(r), warm);
const times: { rt: number; worker: number }[] = [];
for (let i = 0; i < reqs.length; i += 50) {
  const part = await page.evaluate((r) => (globalThis as unknown as { runBench(x: unknown[]): Promise<{ rt: number; worker: number }[]> }).runBench(r), reqs.slice(i, i + 50));
  times.push(...part);
}
await browser.close();
server.close();
rmSync(dir, { recursive: true, force: true });

const q = (a: number[], p: number) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};
const rt = times.map((t) => t.rt);
const sumB = rt.reduce((a, b) => a + b, 0);
const sumN = nodeMs.reduce((a, b) => a + b, 0);
const summary = { n: rt.length, p50: q(rt, 0.5), p95: q(rt, 0.95), p99: q(rt, 0.99), max: Math.max(...rt), ratio: sumB / sumN, nodeP95: q(nodeMs, 0.95), nodeMax: Math.max(...nodeMs) };
console.log(JSON.stringify(summary));
if (out) writeFileSync(out, JSON.stringify(summary, null, 2) + "\n");
