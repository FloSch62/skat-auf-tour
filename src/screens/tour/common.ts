// Shared pieces of the tour screens: backdrops with a calm code fallback, the station frame (title plate, fuel, Mark,
// Menü, "Was jetzt?" and the main button), item icons, the luggage panel (dogs, souvenirs, beer mats, upgrades with
// what each does), sound loops and stable line picks.
import type { App, Scene } from "../../core/scene";
import type { Gfx } from "../../core/gfx";
import type { LoopHandle } from "../../core/audio";
import type { DogId, RegionId, StationKind } from "../../game/ids";
import { art } from "../../core/assets";
import { sfx } from "../../core/audio";
import { C, P, REGION_TINT, rgba } from "../../core/palette";
import { centerY, lineHeight, measure, wrap, type FontId } from "../../core/font";
import { hashString } from "../../core/rng";
import { artFit, bands, dialog, fuelGauge, marksChip, para, plate, whatNow, W } from "../kit";
import { DOGS } from "../../game/ids";
import { drawBackdrop, painterFor } from "../paint/index";
import { createGameMenu, menuButton } from "../menu";
import { DOG_DEFS, dogName } from "../../data/dogs";
import { SOUVENIR_DEFS } from "../../data/souvenirs";
import { BEER_MAT_DEFS } from "../../data/beerMats";
import { UPGRADE_DEFS } from "../../data/upgrades";
import { persist, type Session } from "./session";
import { signed } from "../../tour/util";

// ─── lines ────────────────────────────────────────────────────────────────────────────────────────────────

/** A line picked stably for this tour and spot (does not change between frames or reloads). */
export function pickFor(s: Session, lines: readonly string[], salt: string): string {
  if (!lines.length) return "";
  return lines[hashString(`${s.tour.seed}|${s.tour.stage}|${s.tour.at}|${salt}`) % lines.length];
}

/** Fill {name} {title} {place} … in text tables (unknown keys stay). */
export function fillLine(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{([a-z]+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

// ─── backdrops ────────────────────────────────────────────────────────────────────────────────────────────

/** A backdrop by art id; when neither art nor a painting exists, a calm evening gradient instead of a blank wall. */
export function scenery(g: Gfx, artId: string, tint: "evening" | "room" | "night" = "evening") {
  if (art(artId) || painterFor(artId)) {
    drawBackdrop(g, artId);
    return;
  }
  if (tint === "room") bands(g, 0, 0, 960, 540, [P.wood0, P.wood1, P.wood1, P.wood2, P.wood1, P.wood0]);
  else if (tint === "night") bands(g, 0, 0, 960, 540, [P.ink0, P.dusk0, P.dusk0, P.dusk1, P.ink2, P.ink1]);
  else bands(g, 0, 0, 960, 540, [P.dusk1, P.dusk2, P.dusk3, P.brick4, P.forest2, P.forest1, P.forest0]);
}

/** The region's map art id. */
export function mapArt(region: RegionId): string {
  return `maps/${region}`;
}

export function regionTint(region: RegionId) {
  return REGION_TINT[region] ?? REGION_TINT.enztal;
}

// ─── the station frame ────────────────────────────────────────────────────────────────────────────────────

export const FRAME = {
  /** Content area between the top bar and the bottom line. */
  top: 60,
  bottom: 476,
  /** Bottom row: "Was jetzt?" on the left, the main button on the right. */
  rowY: 486,
  buttonX: 744,
  buttonW: 200,
  buttonH: 46,
} as const;

/** Fuel and Mark at the top left (with labels), the menu at the top right. */
export function topBar(g: Gfx, a: App, s: Session, opts: { menu?: boolean; title?: string } = {}) {
  g.rect(0, 0, W, 54, rgba(P.ink0, 0.55));
  const fw = fuelGauge(g, 14, 14, s.tour.fuel, s.tour.fuelMax);
  marksChip(g, 14 + fw + 22, 14, s.tour.marks);
  if (opts.title) g.text(opts.title, 600, centerY("head", 0, 54), { font: "head", align: "center", color: C.title, outline: P.ink0 });
  if (opts.menu !== false && menuButton(a)) openMenu(a, s);
}

export function openMenu(a: App, s: Session) {
  a.scenes.push(createGameMenu(a, { onQuit: () => persist(s) }));
}

/** The title plate of a station, centred under the top bar. */
export function stationPlate(g: Gfx, title: string, sub?: string) {
  const r = plate(g, title, 480, 58, { minW: 300 });
  if (sub) g.text(sub, 480, r.y + r.h + 2, { font: "head", align: "center", color: P.paper4, outline: P.ink0 });
  return r;
}

/** "Was jetzt?" bottom left; a second line grows upwards, never off the screen. */
export function nowLine(g: Gfx, text: string, w = 716, x = 14) {
  return whatNow(g, text, { x, y: bottomY(text, w), w });
}

/** The y of a "Was jetzt?" strip of width w so that it ends at 526 however many lines it needs. */
export function bottomY(text: string, w: number): number {
  const lines = wrap(text, w - 32, "head").length;
  return 526 - (34 + (lines - 1) * lineHeight("head"));
}

/** The main button bottom right. */
export function mainButton(a: App, id: string, label: string, opts: { variant?: "go" | "normal"; disabled?: boolean; y?: number; sub?: string } = {}): boolean {
  return a.ui.button(id, FRAME.buttonX, opts.y ?? FRAME.rowY, FRAME.buttonW, FRAME.buttonH, label, {
    variant: opts.variant ?? "go", disabled: opts.disabled, sub: opts.sub, hotkey: opts.variant === "normal" ? undefined : "Enter",
  });
}

/** A paper card with wrapped text; returns the text height. */
export function paperText(g: Gfx, text: string, x: number, y: number, w: number, opts: { font?: FontId; pad?: number; minH?: number } = {}) {
  const font = opts.font ?? "head";
  const pad = opts.pad ?? 14;
  const h = Math.max(opts.minH ?? 0, wrap(text, w - pad * 2, font).length * lineHeight(font) + pad * 2 - 4);
  g.panel(x, y, w, h, "paper");
  para(g, text, x + pad, y + pad - 2, w - pad * 2, { font, color: P.ink1, shadow: null });
  return h;
}

/** "+2 Sprit", "–1 Mark" chips in a row; returns the width used. */
export function deltaChips(g: Gfx, x: number, y: number, fuel: number, marks: number): number {
  let cx = x;
  const chip = (text: string, color: string) => {
    const w = measure(text, "head") + 20;
    g.rrect(cx, y, w, 30, 4, P.ink0);
    g.rrect(cx + 1, y + 1, w - 2, 28, 4, color);
    g.text(text, cx + w / 2, centerY("head", y, 30), { font: "head", align: "center", color: P.paper4, shadow: P.ink0 });
    cx += w + 8;
  };
  if (fuel) chip(`${signed(fuel)} Sprit`, fuel > 0 ? P.forest2 : P.brick1);
  if (marks) chip(`${signed(marks)} Mark`, marks > 0 ? P.beer0 : P.brick1);
  return cx - x;
}

// ─── item icons ───────────────────────────────────────────────────────────────────────────────────────────

/** A 48×48 item (souvenir, beer mat, upgrade, dog, trophy) from the items atlas, or a code fallback, centred at (cx, cy). */
export function itemIcon(g: Gfx, id: string, cx: number, cy: number, opts: { dim?: boolean; label?: string } = {}) {
  const alpha = opts.dim ? 0.35 : 1;
  // painted cut-outs first (public/art, 2× density): items/<id>, dogs/<id>, trophies/<region>
  const artId = id.startsWith("trophy-") ? `trophies/${id.slice(7)}` : (DOGS as readonly string[]).includes(id) ? `dogs/${id}` : `items/${id}`;
  if (artFit(g, artId, cx - 26, cy - 26, 52, 52, { anchor: artId.startsWith("items/") ? "center" : "bottom", alpha })) return;
  const ok = g.sprite("items", id, cx, cy, { alpha });
  if (ok) return;
  g.alpha(opts.dim ? 0.4 : 1, () => {
    g.rrect(cx - 22, cy - 22, 44, 44, 6, P.ink0);
    g.rrect(cx - 20, cy - 20, 40, 40, 5, P.wood3);
    const t = (opts.label ?? id).slice(0, 2).toUpperCase();
    g.text(t, cx, centerY("head", cy - 20, 40), { font: "head", align: "center", color: P.paper4, shadow: P.ink0 });
  });
}

/** A station kind icon (icons atlas `station-<kind>-<state>`) or a code fallback, centred. */
export function stationIcon(g: Gfx, kind: StationKind, state: "locked" | "normal" | "reachable" | "visited", cx: number, cy: number) {
  if (g.sprite("icons", `station-${kind}-${state}`, cx, cy)) return;
  const col = state === "locked" ? P.stone1 : state === "visited" ? P.paper1 : state === "reachable" ? P.beer3 : P.paper3;
  g.circle(cx, cy, 15, P.ink0, true);
  g.circle(cx, cy, 13, col, true);
  g.text(kind.slice(0, 1).toUpperCase(), cx, centerY("head", cy - 13, 26), { font: "head", align: "center", color: P.ink1 });
}

export interface LuggageItem {
  icon: string;
  name: string;
  text: string;
}

export type LuggageKind = "dogs" | "souvenirs" | "mats" | "upgrades";

export const LUGGAGE_TITLE: Record<LuggageKind, string> = {
  dogs: "Hunde an Bord",
  souvenirs: "Andenken",
  mats: "Bierdeckel",
  upgrades: "Ausbau",
};

export function luggage(s: Session, kind: LuggageKind): LuggageItem[] {
  const t = s.tour;
  const p = s.env.profile;
  if (kind === "dogs") return t.dogs.map((d) => ({ icon: d, name: `${dogName(p, d)}, ${DOG_DEFS[d].breed}`, text: DOG_DEFS[d].ability }));
  if (kind === "souvenirs") return t.souvenirs.map((id) => ({ icon: id, name: SOUVENIR_DEFS[id].name, text: SOUVENIR_DEFS[id].text }));
  if (kind === "mats") return t.beerMats.map((id) => ({ icon: id, name: BEER_MAT_DEFS[id].name, text: BEER_MAT_DEFS[id].text }));
  return t.upgrades.map((id) => ({ icon: id, name: UPGRADE_DEFS[id].name, text: UPGRADE_DEFS[id].text }));
}

/** An overlay listing what he carries of one kind and what each thing does. */
export function luggageScene(s: Session, kind: LuggageKind): Scene {
  const items = luggage(s, kind);
  const scene: Scene = {
    overlay: true,
    draw(g, a) {
      const rows = Math.max(1, items.length);
      const h = Math.min(500, 120 + rows * 64);
      const { x, y, w } = dialog(g, 640, h, "paper");
      g.text(LUGGAGE_TITLE[kind], x + 24, y + 14, { font: "big", color: P.ink1 });
      if (!items.length) {
        para(g, kind === "dogs" ? "Diesmal fährt kein Hund mit." : "Noch nichts dabei.", x + 24, y + 62, w - 48, { color: P.ink2, shadow: null });
      }
      items.slice(0, 6).forEach((it, i) => {
        const ry = y + 58 + i * 64;
        itemIcon(g, it.icon, x + 46, ry + 26, { label: it.name });
        g.text(it.name, x + 84, ry + 2, { font: "head", color: P.ink1 });
        g.text(it.text, x + 84, ry + 26, { font: "body", color: P.ink2, width: w - 110, maxLines: 2 });
      });
      if (a.ui.button("lug-close", x + w - 164, y + h - 58, 140, 44, "Schließen", { variant: "go", hotkey: "Escape" })) a.scenes.remove(scene);
    },
  };
  return scene;
}

/** Small item buttons (dogs, souvenirs, beer mats, upgrades) with counts; a click opens the luggage list. */
export function luggageButtons(g: Gfx, a: App, s: Session, x: number, y: number): number {
  const kinds: { kind: LuggageKind; icon: string; n: number }[] = [
    { kind: "dogs", icon: "dog", n: s.tour.dogs.length },
    { kind: "souvenirs", icon: "souvenir", n: s.tour.souvenirs.length },
    { kind: "mats", icon: "beer-mat", n: s.tour.beerMats.length },
    { kind: "upgrades", icon: "upgrade", n: s.tour.upgrades.length },
  ];
  let cx = x;
  for (const k of kinds) {
    const w = 64;
    const tip = `${LUGGAGE_TITLE[k.kind]}: ${k.n}`;
    if (a.ui.button(`lug-${k.kind}`, cx, y, w, 40, "", { tooltip: tip })) a.scenes.push(luggageScene(s, k.kind));
    if (!g.sprite("icons", k.icon, cx + 20, y + 20)) g.text(LUGGAGE_TITLE[k.kind].slice(0, 1), cx + 20, centerY("head", y, 40), { font: "head", align: "center", color: C.text });
    g.text(String(k.n), cx + 46, centerY("head", y, 40), { font: "head", align: "center", color: k.n ? P.beer3 : P.paper1, shadow: P.ink0 });
    cx += w + 6;
  }
  return cx - x;
}

// ─── dogs ─────────────────────────────────────────────────────────────────────────────────────────────────

export function dogLabel(s: Session, id: DogId): string {
  return `${dogName(s.env.profile, id)}, ${DOG_DEFS[id].breed}`;
}

// ─── sound loops ──────────────────────────────────────────────────────────────────────────────────────────

/** A scene-bound sound loop: start in enter, stop in exit. */
export function soundLoop(id: string, volume = 0.8) {
  let h: LoopHandle | null = null;
  return {
    start() {
      h?.stop(0.1);
      h = sfx.loop(id, { volume });
    },
    stop() {
      h?.stop(0.5);
      h = null;
    },
  };
}
