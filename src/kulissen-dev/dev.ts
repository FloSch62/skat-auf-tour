// Dev gallery for the code-painted backdrops (Kulissen).
//   /?dev=scenes[&i=3]            one scene at a time, big « Zurück / Weiter » buttons, the id and the paint time
//   /?dev=scene&id=inns/village   a single scene
// Options: &mock=0 hides the table mock on inns, &ui=0 hides the gallery chrome, &places=1 shows the pack's place
// positions on maps, &veil=0.3 lays a paper veil over maps (as the stage map does). Arrow keys also page.
import type { DevFactory } from "../dev";
import type { Gfx } from "../core/gfx";
import type { Scene } from "../core/scene";
import { P, rgba } from "../core/palette";
import { whatNow } from "../screens/kit";
import { PAINTED } from "../screens/paint/index";
import { forgetPainted, paintedScene, Px } from "../screens/paint/painter";
import { MAP_PLACES } from "../screens/paint/mapdata";
import { paintCamperSheet, paintPropSheet } from "./sheet";

/** Dev-only paintings that are not backdrops (prop sheets). */
const EXTRA: Record<string, (p: Px) => void> = { _props: paintPropSheet, _camper: paintCamperSheet };
const painterOf = (id: string) => PAINTED[id] ?? EXTRA[id];

const timings = new Map<string, string>();

/** &prof=1: accumulate the time spent in the top-level Px methods and log it per scene. */
const prof = new Map<string, number>();
let profiling = false;
function installProfiler() {
  if (profiling) return;
  profiling = true;
  const proto = Px.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  let depth = 0;
  for (const name of ["rect", "relight", "poly", "grad", "hgrad", "speckle", "pat", "line", "ellipse", "dither", "shape", "texture", "path", "vignette", "spans"]) {
    const orig = proto[name];
    proto[name] = function (this: unknown, ...a: unknown[]) {
      if (depth > 0) return orig.apply(this, a);
      depth++;
      const t0 = performance.now();
      try {
        return orig.apply(this, a);
      } finally {
        depth--;
        prof.set(name, (prof.get(name) ?? 0) + performance.now() - t0);
      }
    };
  }
}

/** Paint once (cold) and, with &bench=1, five more times; the label shows cold / best warm milliseconds. */
function paintTimed(id: string, bench: boolean, profile = false): HTMLCanvasElement | null {
  if (!timings.has(id)) {
    if (profile) {
      installProfiler();
      prof.clear();
    }
    const runs: number[] = [];
    for (let k = 0; k < (bench ? 6 : 1); k++) {
      forgetPainted(id);
      const t0 = performance.now();
      paintedScene(id, painterOf(id));
      runs.push(performance.now() - t0);
    }
    const warm = runs.slice(1);
    timings.set(id, `${runs[0].toFixed(1)} ms${warm.length ? ` · warm ${Math.min(...warm).toFixed(1)} ms` : ""}`);
    if (profile) console.log(`prof ${id}: ` + [...prof].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(", "));
  }
  return paintedScene(id, painterOf(id));
}

/** Translucent mock of the Skat table layout (contract §4.3) to judge an inn's composition. */
function tableMock(g: Gfx) {
  const card = (x: number, y: number, k: number) => {
    g.rect(x + 2, y + 3, 72, 108, rgba(P.ink0, 0.35));
    g.rect(x, y, 72, 108, P.ink1);
    g.rect(x + 1, y + 1, 70, 106, P.paper4);
    const red = k % 2 === 0;
    g.rect(x + 6, y + 6, 10, 14, red ? P.brick1 : P.ink1);
    g.rect(x + 26, y + 40, 20, 28, red ? P.brick1 : P.ink1);
  };
  g.alpha(0.88, () => {
    // portraits with name and card count
    for (const x of [20, 760]) {
      g.panel(x, 10, 180, 140, "panel-dark");
      g.rect(x + 10, 20, 96, 96, P.wood1);
      g.rect(x + 40, 40, 36, 40, P.brick3);
      g.text("Stammgast", x + 112, 24, { font: "body", color: P.paper3 });
      g.text("10 Karten", x + 112, 44, { font: "body", color: P.paper1 });
      g.panel(x + 10, 120, 160, 24, "bubble");
    }
    // the board at the top
    g.panel(330, 8, 300, 60, "panel");
    g.text("Kreuz · Spieler: Erwin · 23", 480, 18, { font: "body", align: "center", color: P.paper3 });
    // trick and Skat
    card(400, 190, 1);
    card(446, 202, 2);
    card(492, 192, 3);
    card(600, 210, 0);
    card(612, 216, 1);
    // the hand
    for (let i = 0; i < 10; i++) card(165 + i * 62, i === 4 ? 404 : 420, i);
    // buttons bottom right
    g.panel(812, 448, 136, 34, "button-normal");
    g.panel(812, 490, 136, 34, "button-normal");
  });
  whatNow(g, "Was jetzt? Klick auf eine Karte, die du spielen willst.", { y: 374 });
}

function placesMock(g: Gfx, id: string) {
  const region = id.slice(5);
  const list = MAP_PLACES[region as keyof typeof MAP_PLACES];
  if (!list) return;
  for (const [pid, x, y] of list) {
    const sx = x * 960;
    const sy = y * 540;
    g.rect(sx - 4, sy - 4, 9, 9, P.ink0);
    g.rect(sx - 3, sy - 3, 7, 7, P.road2);
    g.text(pid, sx + 8, sy - 8, { font: "body", color: P.ink1 });
  }
}

function drawScene(g: Gfx, id: string, params: URLSearchParams) {
  const c = paintTimed(id, params.get("bench") === "1", params.get("prof") === "1");
  g.rect(0, 0, 960, 540, P.ink0);
  if (c) g.pixelScene(c);
  if (id.startsWith("inns/") && params.get("mock") !== "0") tableMock(g);
  const veil = Number(params.get("veil") ?? 0);
  if (id.startsWith("maps/") && veil > 0) g.alpha(veil, () => g.rect(0, 0, 960, 540, P.paper3));
  if (id.startsWith("maps/") && params.get("places") === "1") placesMock(g, id);
}

function label(g: Gfx, id: string, extra = "") {
  const ms = timings.get(id);
  const text = `${id}${ms !== undefined ? ` · ${ms}` : ""}${extra}`;
  g.rect(250, 500, 460, 32, rgba(P.ink0, 0.75));
  g.text(text, 480, 506, { font: "head", align: "center", color: P.beer3 });
}

export const dev: Record<string, DevFactory> = {
  scenes: (_app, params): Scene => {
    const ids = Object.keys(PAINTED);
    let i = Math.max(0, Math.min(ids.length - 1, Number(params.get("i") ?? 0) || 0));
    const start = params.get("id");
    if (start && ids.includes(start)) i = ids.indexOf(start);
    const chrome = params.get("ui") !== "0";
    return {
      draw(g, app) {
        const id = ids[i];
        drawScene(g, id, params);
        if (!chrome) return;
        label(g, id, ` · ${i + 1}/${ids.length}`);
        if (app.ui.button("prev", 16, 236, 140, 60, "« Zurück", { variant: "normal", font: "big" }) || app.input.keyPressed("ArrowLeft")) i = (i + ids.length - 1) % ids.length;
        if (app.ui.button("next", 804, 236, 140, 60, "Weiter »", { variant: "go", font: "big" }) || app.input.keyPressed("ArrowRight")) i = (i + 1) % ids.length;
      },
    };
  },
  scene: (_app, params): Scene => {
    const id = params.get("id") ?? "inns/village";
    const chrome = params.get("ui") !== "0";
    return {
      draw(g) {
        if (!painterOf(id)) {
          g.rect(0, 0, 960, 540, P.ink1);
          g.text(`Keine Kulisse „${id}“`, 480, 250, { font: "big", align: "center", color: P.brick3 });
          return;
        }
        drawScene(g, id, params);
        if (chrome) label(g, id);
      },
    };
  },
};
