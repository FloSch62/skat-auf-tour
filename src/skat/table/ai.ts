// The table's door to the computer opponents (contract §5.3). The table only ever hands a SeatView to the AI
// (contract §0.3). The AI workstream provides src/skat/ai/index.ts with `installWorkerAi()`; when that file exists it
// is loaded once and installs the real player, otherwise the stand-in from api.ts plays.
import { getAiPlayer, standInAi } from "../ai/api";
import type { AiRequest } from "../ai/api";
import type { Action } from "../rules/index";

const aiModules = import.meta.glob<{ installWorkerAi?: () => unknown }>("../ai/index.ts");

let installing: Promise<void> | null = null;

/** Load and install the real AI once (no-op when the AI workstream has not delivered it yet). */
export function ensureAi(): Promise<void> {
  installing ??= (async () => {
    for (const load of Object.values(aiModules)) {
      try {
        const m = await load();
        await m.installWorkerAi?.();
      } catch (e) {
        console.warn("[table] AI could not be installed, the stand-in plays", e);
      }
    }
  })();
  return installing;
}

/** Wall-clock decision times seen by the table, per game phase (for the soak report and a dev look). */
export interface DecisionStats {
  /** true once the real AI (src/skat/ai/index.ts) answered, false while the stand-in plays. */
  realAi: boolean;
  byPhase: Record<string, { n: number; sumMs: number; maxMs: number; over1500: number; samples: number[] }>;
}

export const decisionStats: DecisionStats = { realAi: false, byPhase: {} };
if (typeof window !== "undefined") (window as unknown as { __aiStats?: DecisionStats }).__aiStats = decisionStats;

function record(phase: string, ms: number) {
  const b = (decisionStats.byPhase[phase] ??= { n: 0, sumMs: 0, maxMs: 0, over1500: 0, samples: [] });
  b.n++;
  b.sumMs += ms;
  if (ms > b.maxMs) b.maxMs = ms;
  if (ms > 1500) b.over1500++;
  // a bounded reservoir for percentiles
  if (b.samples.length < 4000) b.samples.push(Math.round(ms * 10) / 10);
  else b.samples[Math.floor(Math.random() * 4000)] = Math.round(ms * 10) / 10;
}

/** Ask the AI for a decision. Never throws: on an AI error the stand-in decides (and the error is logged). */
export async function decide(req: AiRequest): Promise<Action> {
  await ensureAi();
  const player = getAiPlayer();
  decisionStats.realAi = player !== standInAi;
  const t0 = performance.now();
  try {
    const a = await player.decide(req);
    record(req.view.phase, performance.now() - t0);
    return a;
  } catch (e) {
    console.warn("[table] AI decision failed, stand-in decides", e);
    return standInAi.decide(req);
  }
}
