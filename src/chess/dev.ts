// Dev scenes of the Rätsel area (chess): /?dev=chess&level=easy&seed=3[&attempts=4][&hints=1][&id=<puzzle id>], /?dev=chess-park
import type { DevFactory } from "../dev";
import type { App, Scene } from "../core/scene";
import { createChessStation, drawPark } from "./scene";
import type { ChessLevel } from "./puzzle";

export const dev: Record<string, DevFactory> = {
  chess: (app: App, params: URLSearchParams): Scene => {
    const lv = params.get("level");
    const level: ChessLevel = lv === "medium" || lv === "hard" ? lv : "easy";
    const attempts = Number(params.get("attempts") ?? 3) || 3;
    const id = params.get("id") ?? undefined;
    const hints = Number(params.get("hints") ?? 0) || 0;
    const make = (seed: number, puzzleId?: string): Scene =>
      createChessStation(app, {
        level,
        seed,
        attempts,
        hints,
        puzzleId,
        onDone(result) {
          console.info(`chess done: ${JSON.stringify(result)}`);
          app.scenes.switchTo(make(seed + 1));
        },
      });
    return make(Number(params.get("seed") ?? 1) || 0, id);
  },
  /** The park backdrop alone (painted art or code painting). */
  "chess-park": (): Scene => ({ draw: (g) => drawPark(g) }),
};
