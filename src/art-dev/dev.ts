// Art style study (contract §9 "Vor der Serie steht eine Stilstudie"): the study background, portrait, dog and camper
// of one style variant behind a mock of the Skat table, so the look is judged in the game and not on a contact sheet.
//   /?dev=study&v=a            variant a | b | c (raster review copies in public/art/_study/<v>/), m = the mix
//                              (background a, figures b), hd = the production finals (HD painted, public/art/index.json),
//                              or v=code (code paintings)
//   &p=van                     the second page: camper and dog at their in-game scale on a code-painted roadside
//   &ui=0                      hides the study buttons
// Art pixels are drawn 3× (640×360 backgrounds; 96×96 portrait and dog; camper ≈ 180×100), cards stay sharp.
import type { DevFactory } from "../dev";
import type { Gfx } from "../core/gfx";
import type { Scene } from "../core/scene";
import type { RankId, SuitId } from "../game/ids";
import { art } from "../core/assets";
import { P, rgba } from "../core/palette";
import { bands, bubble, portrait, whatNow } from "../screens/kit";
import { drawCardBack, drawCardFace } from "../screens/cardface";
import { PAINTED } from "../screens/paint/index";
import { paintedScene, type Px } from "../screens/paint/painter";
import { paintPark } from "../chess/park";
import { paintKiosk } from "../sudoku/kiosk";

/** Every code painting by art id, including the Rätsel backdrops that are not in PAINTED (layout guides for Krea). */
const CODE_PAINTINGS: Record<string, (p: Px) => void> = { ...PAINTED, "bg/park": paintPark, "bg/kiosk": paintKiosk };

type Variant = "a" | "b" | "c" | "m" | "hd" | "code";
const VARIANTS: Variant[] = ["a", "b", "c", "m", "hd", "code"];
const NAMES: Record<Variant, string> = {
  a: "A · Adventure-Kulisse",
  b: "B · Comic-Album",
  c: "C · Zeichentrickfilm",
  m: "Mix · Kulisse A, Figuren B",
  hd: "HD gemalt · Produktion",
  code: "Code-Malerei",
};

const HAND: [SuitId, RankId][] = [
  ["clubs", "jack"], ["spades", "jack"], ["hearts", "ace"], ["hearts", "10"], ["hearts", "king"],
  ["hearts", "9"], ["spades", "ace"], ["spades", "7"], ["diamonds", "10"], ["diamonds", "queen"],
];
const TRICK: [SuitId, RankId][] = [["clubs", "ace"], ["clubs", "10"], ["hearts", "jack"]];

/** A study image (null until loaded or when missing; the caller draws a fallback). */
function study(v: Variant, name: string): HTMLImageElement | null {
  if (v === "code") return null;
  if (v === "m") return art(`_study/${name === "inns-village" ? "a" : "b"}/${name}`);
  if (v === "hd") return art(name.replace("-", "/")); // "inns-village" -> the final "inns/village"
  return art(`_study/${v}/${name}`);
}

/** Raster study art at 3 backing pixels per art pixel, HD art (2× density) at 1; top-left at (x, y). */
function art3(g: Gfx, img: HTMLImageElement, x: number, y: number) {
  const k = img.width > 180 || img.height > 180 ? 1 : 3;
  g.pixelFit(img, x, y, (img.width * k) / 2, (img.height * k) / 2);
}

/** Height in layout units of a study or HD image as art3 draws it. */
function h3(img: HTMLImageElement) {
  return (img.height * (img.width > 180 || img.height > 180 ? 1 : 3)) / 2;
}

function background(g: Gfx, v: Variant) {
  g.rect(0, 0, 960, 540, P.ink0);
  const img = study(v, "inns-village");
  if (img && g.pixelScene(img)) return;
  if (img) {
    g.cover(img);
    return;
  }
  const painted = PAINTED["inns/village"];
  if (painted) g.pixelScene(paintedScene("inns/village", painted));
}

/** One regular's panel: the portrait drawn 3× (96 art px = 144 layout units), name and card count. */
function guest(g: Gfx, v: Variant, x: number, right: boolean) {
  const pw = 300;
  g.panel(x, 8, pw, 160, "panel-dark");
  const px = right ? x + pw - 152 : x + 8;
  const img = study(v, "portraits-maurer");
  g.rect(px, 16, 144, 144, P.wood0);
  if (img) art3(g, img, px, 16);
  else portrait(g, "maurer", px, 16, 144, { frame: false });
  const tx = right ? x + 12 : x + 162;
  g.text("Maurer-Karle", tx, 22, { font: "head", color: P.paper3 });
  g.text("10 Karten", tx, 50, { font: "body", color: P.paper1 });
  g.text("Gegenspieler", tx, 72, { font: "body", color: P.paper1 });
}

function tableMock(g: Gfx, v: Variant) {
  guest(g, v, 8, false);
  guest(g, v, 652, true);
  // the board at the top
  g.panel(318, 8, 324, 64, "panel");
  g.text("Kreuz · Spieler: Erwin · 23", 480, 16, { font: "head", align: "center", color: P.paper3 });
  g.text(`Stilstudie ${NAMES[v]}`, 480, 44, { font: "body", align: "center", color: P.beer3 });
  bubble(g, "Achtzehn? Da sag i nix.", 30, 182, 120, 168, { maxW: 260 });
  // trick in the middle, Skat beside it
  TRICK.forEach(([s, r], i) => drawCardFace(g, "french", s, r, 380 + i * 50, 186 + (i === 1 ? 12 : 0)));
  drawCardBack(g, 600, 200);
  drawCardBack(g, 612, 206);
  // the hand
  HAND.forEach(([s, r], i) => drawCardFace(g, "french", s, r, 165 + i * 62, i === 4 ? 404 : 420));
  // the dog beside the hand (under the table, the head above the edge)
  const dog = study(v, "dogs-shepherd");
  if (dog) art3(g, dog, 8, 540 - h3(dog));
  whatNow(g, "Was jetzt? Klick auf eine Karte, die du spielen willst.", { y: 366 });
}

/** Page 2: the camper and the dog at their in-game scale on a quick code-painted roadside at dusk. */
function vanPage(g: Gfx, v: Variant) {
  bands(g, 0, 0, 960, 300, [P.dusk1, P.dusk2, P.dusk3, P.brick4, P.beer3, P.beer4]);
  g.rect(0, 250, 960, 60, P.forest1);
  for (let x = 0; x < 960; x += 6) g.rect(x, 240 + Math.round(10 * Math.sin(x / 70)), 6, 20, P.forest2);
  g.rect(0, 300, 960, 240, P.forest2);
  g.rect(0, 380, 960, 70, P.stone1);
  g.rect(0, 386, 960, 2, P.stone3);
  for (let x = 12; x < 960; x += 80) g.rect(x, 414, 40, 3, P.paper4);
  g.rect(0, 448, 960, 92, P.forest1);
  const van = study(v, "van-van");
  if (van) art3(g, van, 260, 432 - h3(van));
  else g.text("(kein Wohnmobil)", 360, 360, { font: "head", color: P.paper4, outline: P.ink0 });
  const dog = study(v, "dogs-shepherd");
  if (dog) art3(g, dog, 620, 440 - h3(dog));
  // the portrait as in a dialogue box
  g.panel(16, 16, 470, 160, "panel-dark");
  const img = study(v, "portraits-maurer");
  g.rect(24, 24, 144, 144, P.wood0);
  if (img) art3(g, img, 24, 24);
  else portrait(g, "maurer", 24, 24, 144, { frame: false });
  g.text("Maurer-Karle", 182, 32, { font: "big", color: P.beer3, outline: P.ink0 });
  g.text("„Des Wohnmobil hält mit Draht\nund gutem Zureden.“", 182, 76, { font: "head", color: P.paper3 });
  g.text(`Stilstudie ${NAMES[v]} · Wohnmobil etwa 180×100, Hund 96×96, je 3×`, 480, 512, {
    font: "body", align: "center", color: P.paper4, outline: P.ink0,
  });
}

function controls(g: Gfx, ui: { button: (id: string, x: number, y: number, w: number, h: number, label: string, o?: object) => boolean }, state: { v: Variant; page: "table" | "van" }) {
  // a column of 44-high buttons between the right portrait panel (ends at 168) and "Letzter Stich" (448)
  const top = 172;
  const step = 40;
  g.rect(806, top - 4, 148, 4 + (VARIANTS.length + 1) * step, rgba(P.ink0, 0.55));
  VARIANTS.forEach((v, i) => {
    const label = v === "code" ? "Code" : v === "m" ? "Mix A+B" : v === "hd" ? "HD (final)" : `Variante ${v.toUpperCase()}`;
    if (ui.button(`v-${v}`, 812, top + i * step, 136, 36, label, { variant: state.v === v ? "go" : "normal" })) state.v = v;
  });
  const y = top + VARIANTS.length * step;
  if (ui.button("page", 812, y, 136, 36, state.page === "table" ? "Wohnmobil »" : "« Tisch", { variant: "paper" })) {
    state.page = state.page === "table" ? "van" : "table";
  }
}

export const dev: Record<string, DevFactory> = {
  // /?dev=paint&id=bg/park — one code painting, bare (no art, no chrome): the source of the Krea layout inits
  paint: (_app, params): Scene => {
    const id = params.get("id") ?? "inns/village";
    return {
      draw(g) {
        g.rect(0, 0, 960, 540, P.ink0);
        const painter = CODE_PAINTINGS[id];
        if (painter) g.pixelScene(paintedScene(`layout:${id}`, painter));
        else g.text(`Keine Code-Malerei „${id}“`, 480, 250, { font: "big", align: "center", color: P.brick3 });
      },
    };
  },
  study: (_app, params): Scene => {
    const pv = params.get("v") as Variant | null;
    const state = { v: (pv && VARIANTS.includes(pv) ? pv : "a") as Variant, page: params.get("p") === "van" ? ("van" as const) : ("table" as const) };
    const chrome = params.get("ui") !== "0";
    return {
      draw(g, app) {
        if (state.page === "van") vanPage(g, state.v);
        else {
          background(g, state.v);
          tableMock(g, state.v);
          if (chrome) {
            g.panel(812, 448 + 0, 136, 34, "button-normal");
            g.text("Letzter Stich", 880, 455, { font: "body", align: "center", color: P.paper3 });
            g.panel(812, 490, 136, 34, "button-normal");
            g.text("Liste", 880, 497, { font: "body", align: "center", color: P.paper3 });
          }
        }
        if (chrome) controls(g, app.ui, state);
      },
    };
  },
};
