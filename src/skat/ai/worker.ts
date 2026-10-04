// Web Worker entry (contract §5.3: the computer opponent thinks in a worker so the table stays smooth). Messages:
//   in:  { id, req: AiRequest }            (the SeatView inside is plain JSON — no hidden cards ever cross this line)
//   out: { id, action, ms, note } | { id, error, ms }
// Vite bundles this file on its own: new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }).
import type { AiRequest } from "./api.ts";
import { decideWithNote } from "./decide.ts";
import type { Action } from "../rules/index.ts";

export interface WorkerRequest {
  id: number;
  req: AiRequest;
}

export interface WorkerResponse {
  id: number;
  action?: Action;
  error?: string;
  /** Thinking time inside the worker (for the dev overlay and measurements). */
  ms: number;
  note?: string;
  insight?: { declarerWins: number };
}

interface WorkerScope {
  onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(msg: WorkerResponse): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (e) => {
  const { id, req } = e.data;
  const t0 = performance.now();
  try {
    const d = decideWithNote(req);
    scope.postMessage({ id, action: d.action, note: d.note, insight: d.insight, ms: performance.now() - t0 });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err), ms: performance.now() - t0 });
  }
};
