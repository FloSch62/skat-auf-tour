// Runs league jobs in at most 4 child processes (the PC is also used for gaming; the npm script runs under nice, and
// children inherit it). Seeds are split into chunks; results stream back as JSON lines.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { GameRec, LeagueJob } from "./skat-league-worker.ts";

const WORKER = fileURLToPath(new URL("./skat-league-worker.ts", import.meta.url));

/** Run one job split into `chunks` slices over at most `parallel` processes. */
export async function runParallel(job: LeagueJob, opts: { parallel?: number; chunks?: number; onGame?: (r: GameRec) => void } = {}): Promise<GameRec[]> {
  const parallel = Math.max(1, Math.min(4, opts.parallel ?? 4));
  const [first, count] = job.seeds;
  const chunks = Math.max(1, Math.min(count, opts.chunks ?? parallel * 4));
  const slices: LeagueJob[] = [];
  let at = first;
  for (let i = 0; i < chunks; i++) {
    const n = Math.floor(count / chunks) + (i < count % chunks ? 1 : 0);
    if (n > 0) slices.push({ ...job, seeds: [at, n] });
    at += n;
  }
  const out: GameRec[] = [];
  let next = 0;
  const runOne = (slice: LeagueJob) =>
    new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ["--experimental-strip-types", "--no-warnings", WORKER, JSON.stringify(slice)], {
        stdio: ["ignore", "pipe", "inherit"],
      });
      let buf = "";
      child.stdout.on("data", (d: Buffer) => {
        buf += d.toString();
        let i: number;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (!line.trim()) continue;
          const r = JSON.parse(line) as GameRec;
          out.push(r);
          opts.onGame?.(r);
        }
      });
      child.on("error", reject);
      child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`worker exited with ${code}`))));
    });
  const lane = async () => {
    while (next < slices.length) {
      const s = slices[next++];
      await runOne(s);
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, slices.length) }, lane));
  out.sort((a, b) => a.seed - b.seed || a.agents.join().localeCompare(b.agents.join()));
  return out;
}
