// The browser side of the computer opponent: an AiPlayer that sends each AiRequest to the Web Worker (worker.ts) and
// resolves with its Action. Requests carry ids, so answers can arrive in any order. If the worker cannot start or
// fails, the same decision is computed in the main thread (identical result: decisions are deterministic).
import type { Action } from "../rules/index.ts";
import { setAiPlayer } from "./api.ts";
import type { AiPlayer, AiRequest } from "./api.ts";
import { decide, decideWithNote } from "./decide.ts";
import type { WorkerRequest, WorkerResponse } from "./worker.ts";

interface Pending {
  req: AiRequest;
  resolve(a: Action): void;
  reject(e: Error): void;
}

export class WorkerAi implements AiPlayer {
  private worker: Worker | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  /** Thinking time of the last answered request (ms, measured in the worker). */
  lastMs = 0;
  lastNote: string | undefined;
  /**
   * The declarer's win chance as the deciding seat saw it in the last answered request (undefined when that decision
   * computed none, e.g. bidding). For table talk: a declarer who lost after seeing ≥ 0.9 "was robbed" or blundered.
   */
  lastInsight: { declarerWins: number } | undefined;

  constructor() {
    try {
      this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "skat-ai" });
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => this.answer(e.data);
      this.worker.onerror = (e) => {
        e.preventDefault?.();
        this.fallBack();
      };
    } catch {
      this.worker = null;
    }
  }

  decide(req: AiRequest): Promise<Action> {
    if (!this.worker)
      return Promise.resolve().then(() => {
        const d = decideWithNote(req);
        this.lastNote = d.note;
        this.lastInsight = d.insight;
        return d.action;
      });
    const id = this.nextId++;
    return new Promise<Action>((resolve, reject) => {
      this.pending.set(id, { req, resolve, reject });
      const msg: WorkerRequest = { id, req };
      try {
        this.worker!.postMessage(msg);
      } catch {
        this.pending.delete(id);
        resolve(decide(req));
      }
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const [, p] of this.pending) p.reject(new Error("AI disposed"));
    this.pending.clear();
  }

  private answer(r: WorkerResponse): void {
    const p = this.pending.get(r.id);
    if (!p) return;
    this.pending.delete(r.id);
    this.lastMs = r.ms;
    this.lastNote = r.note;
    this.lastInsight = r.insight;
    if (r.action) p.resolve(r.action);
    else {
      // The worker threw: decide in the main thread instead (and surface real bugs in the console).
      console.warn(`skat ai worker: ${r.error}`);
      try {
        p.resolve(decide(p.req));
      } catch (e) {
        p.reject(e instanceof Error ? e : new Error(String(e)));
      }
    }
  }

  /** The worker died: answer everything still open in the main thread and stop using it. */
  private fallBack(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const [id, p] of this.pending) {
      this.pending.delete(id);
      try {
        p.resolve(decide(p.req));
      } catch (e) {
        p.reject(e instanceof Error ? e : new Error(String(e)));
      }
    }
  }
}

let installed: WorkerAi | null = null;

/** Create the worker-backed AI (once) and register it with `setAiPlayer`. */
export function installWorkerAi(): WorkerAi {
  if (!installed) installed = new WorkerAi();
  setAiPlayer(installed);
  return installed;
}
