// Dev scene of the Stammtisch problems: /?dev=problem&seed=1[&attempts=4][&hints=1][&type=endgame|discard|bid][&id=…]
// [&start=1] skips the intro panel (readability check).
import type { DevFactory } from "../../dev";
import type { Scene } from "../../core/scene";
import { createProblemStation } from "./scene";
import type { SkatProblemData } from "./format";

export const dev: Record<string, DevFactory> = {
  problem: (app, params): Scene => {
    const attempts = Number(params.get("attempts") ?? 3) || 3;
    const hints = Number(params.get("hints") ?? 0) || 0;
    const rawType = params.get("type");
    const type = rawType === "endgame" || rawType === "discard" || rawType === "bid" ? (rawType as SkatProblemData["type"]) : undefined;
    const make = (seed: number, problemId?: string): Scene =>
      createProblemStation(app, {
        seed,
        attempts,
        hints,
        type,
        problemId,
        devStart: params.get("start") === "1",
        onDone(r) {
          console.info(`[problem] done: ${JSON.stringify(r)}`);
          app.scenes.switchTo(make(seed + 1));
        },
      });
    return make(Number(params.get("seed") ?? 1) || 0, params.get("id") ?? undefined);
  },
};
