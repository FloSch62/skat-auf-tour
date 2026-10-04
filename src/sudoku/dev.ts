// ?dev=sudoku&size=9&level=easy&seed=5 — the Sudoku station on its own. Without `size` the station asks first.
// More parameters: presolved=2 (pencil souvenir), free=1 (Airedale), errors=0 (no red marks), almost=1 (all but one
// open cell filled, to check the finish).
import type { DevFactory } from "../dev";
import type { App, Scene } from "../core/scene";
import { C, P } from "../core/palette";
import { heading, para, whatNow } from "../screens/kit";
import { createSudokuStation } from "./scene";
import type { SudokuLevel, SudokuSize } from "./sudoku";

function station(app: App, params: URLSearchParams, seed: number): Scene {
  const size = params.get("size");
  const level = (params.get("level") ?? "easy") as SudokuLevel;
  const almost = params.get("almost");
  return createSudokuStation(app, {
    seed,
    level: ["easy", "medium", "hard"].includes(level) ? level : "easy",
    size: size === "6" || size === "9" ? (Number(size) as SudokuSize) : undefined,
    presolved: Number(params.get("presolved") ?? 0),
    freeCells: Number(params.get("free") ?? 0),
    markErrors: params.get("errors") !== "0",
    devLeaveOpen: almost !== null ? Number(almost) : undefined,
    onDone(result) {
      app.scenes.switchTo(resultScene(app, params, seed, result));
    },
  });
}

function resultScene(app: App, params: URLSearchParams, seed: number, result: { solved: boolean; size: SudokuSize }): Scene {
  return {
    draw(g, a) {
      g.rect(0, 0, 960, 540, P.wood0);
      heading(g, "Sudoku-Station beendet", 480, 120);
      para(g, `onDone: solved = ${result.solved}, size = ${result.size}`, 180, 180, 600, { align: "center", color: C.text });
      if (a.ui.button("again", 300, 260, 170, 48, "Gleiches Rätsel")) app.scenes.switchTo(station(app, params, seed));
      if (a.ui.button("next", 490, 260, 170, 48, "Neues Rätsel", { variant: "go" })) app.scenes.switchTo(station(app, params, seed + 1));
      whatNow(g, "Nochmal dasselbe oder ein neues Rätsel?", { y: 494 });
    },
  };
}

export const dev: Record<string, DevFactory> = {
  sudoku: (app, params) => station(app, params, Number(params.get("seed") ?? 1)),
};
