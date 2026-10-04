// End-to-end browser checks (contract §12 `npm run test:e2e`): builds the game into .work/qa-dist, serves it with
// `vite preview` (steady, unlike the dev server that reloads on every edit) and clicks through the guided first trip
// and the first stage up to the Preisskat at 1366×768 and 1920×1080 (tools/balance/tour-playtest.mjs), then decodes
// every image and sound (tools/media-qa.mjs). Chromium runs without GPU.
//   node tools/qa.mjs [--quick]   (--quick: only the first trip at 1366×768)
import { spawn, spawnSync } from "node:child_process";

const quick = process.argv.includes("--quick");
const PORT = 4299;
const url = `http://127.0.0.1:${PORT}`;
const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
  return r.status ?? 1;
};

if (run("npx", ["vite", "build", "--outDir", ".work/qa-dist", "--emptyOutDir", "--logLevel", "warn"]) !== 0) process.exit(1);
const server = spawn("npx", ["vite", "preview", "--outDir", ".work/qa-dist", "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 2500));
const env = { SAT_URL: url };
const jobs = quick
  ? [["tools/balance/tour-playtest.mjs", "--tutorial", "--size", "1366x768", "--out", "tools/shots/qa/e2e-tutorial"]]
  : [
      ["tools/balance/tour-playtest.mjs", "--tutorial", "--size", "1366x768", "--out", "tools/shots/qa/e2e-tutorial"],
      ["tools/balance/tour-playtest.mjs", "--stages", "1", "--size", "1366x768", "--out", "tools/shots/qa/e2e-stage-1366"],
      ["tools/balance/tour-playtest.mjs", "--stages", "1", "--size", "1920x1080", "--out", "tools/shots/qa/e2e-stage-1920"],
      ["tools/media-qa.mjs"],
    ];
let failed = 0;
for (const j of jobs) {
  console.log(`\n── ${j.join(" ")}`);
  if (run("node", j, env) !== 0) failed++;
}
server.kill();
console.log(failed ? `\n${failed} of ${jobs.length} checks failed` : `\nall ${jobs.length} checks passed`);
process.exit(failed ? 1 : 0);
