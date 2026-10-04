// Entry for the table: `import "../ai/index.ts"` once installs the real computer opponent — in the browser the
// Web Worker player (client.ts), in node (tests, tools) the same decisions in-thread. Afterwards `getAiPlayer()` from
// api.ts returns it. Everything the AI ever receives is a SeatView (contract §0.3).
import { getAiPlayer, setAiPlayer } from "./api.ts";
import type { AiPlayer } from "./api.ts";
import { installWorkerAi } from "./client.ts";
import { decide } from "./decide.ts";

/** In-thread player (node, tests, fallback). */
export const localAi: AiPlayer = {
  async decide(req) {
    return decide(req);
  },
};

/** Install the best player for this environment and return it. */
export function installAi(): AiPlayer {
  const browser = typeof window !== "undefined" && typeof Worker !== "undefined";
  if (browser) return installWorkerAi();
  setAiPlayer(localAi);
  return localAi;
}

installAi();

export { getAiPlayer, setAiPlayer, decide, installWorkerAi };
export type { AiPlayer, AiRequest } from "./api.ts";
export { decideWithNote } from "./decide.ts";
export { personaFor, PERSONAS } from "./persona.ts";
export { baselineDecide } from "./baseline.ts";
