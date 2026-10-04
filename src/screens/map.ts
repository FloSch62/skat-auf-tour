// Etappenkarte (contract §4.2): the region's atlas sheet, roads and stations, place names, the camper marker driving
// calmly along the road, the top bar (fuel, Mark, what he carries, Menü), a preview card for a clicked station with
// "Hinfahren" (or the motorcycle detour), and the "Was jetzt?" line. `continueTour` resumes a saved tour exactly.
import type { App, Scene } from "../core/scene";
import type { MapNode } from "../game/types";
import type { RegionId } from "../game/ids";
import { Gfx } from "../core/gfx";
import { art, markHD } from "../core/assets";
import { music, sfx } from "../core/audio";
import { settings } from "../core/save";
import { C, P, rgba } from "../core/palette";
import { centerY, measure } from "../core/font";
import { hashString } from "../core/rng";
import { dialog, para, portrait, whatNow } from "./kit";
import { PAINTED, drawBackdrop } from "./paint/index";
import { CHARACTER_DEFS } from "../data/characters";
import { STATION_DEFS, STAKES_NAMES } from "../data/stations";
import { HOUSE_RULE_TEXTS } from "../content/help";
import { TUTORIAL } from "../content/texts";
import { FAVOURITES_BY_REGION } from "../game/ids";
import { canMove, mapView, moveTo, roadTargets, detourTargets, type NodeView } from "../tour/state";
import { isDuoInn, successors } from "../tour/map";
import { innPot } from "../tour/economy";
import { currentNode, findRegion, placeName } from "../tour/util";
import { createNewTour } from "./newtour";
import { SCREENS, go, persist, resume, route, type Session } from "./tour/session";
import { bottomY, luggageButtons, mapArt, openMenu, regionTint, soundLoop, stationIcon } from "./tour/common";
import { artFit, fuelGauge, marksChip, paintedVehicle } from "./kit";
import { menuButton } from "./menu";

/** Kitchen → "Tour fortsetzen": the saved tour at the right screen, else a new tour. */
export function continueTour(app: App): Scene {
  return resume(app) ?? createNewTour(app);
}

export const REGION_MUSIC: Record<RegionId, string> = {
  enztal: "enztal", muehlacker: "stromberg", schwarzwald: "schwarzwald", stuttgart: "stuttgart",
};

// ─── the static layer (sheet fallback + roads), cached in an HD canvas ───────────────────────────────────

function paperSheet(g: Gfx, region: RegionId, seed: number) {
  const tint = regionTint(region);
  g.rect(0, 0, 960, 540, P.paper3);
  for (let x = 0; x < 960; x += 80) g.rect(x, 0, 1, 540, P.paper2);
  for (let y = 0; y < 540; y += 80) g.rect(0, y, 960, 1, P.paper2);
  // forests and fields
  const h = (n: number) => (hashString(`${region}|${seed}|${n}`) % 1000) / 1000;
  for (let i = 0; i < 14; i++) {
    const cx = Math.round(h(i) * 900 + 30);
    const cy = Math.round(h(i + 50) * 380 + 90);
    const r = Math.round(18 + h(i + 99) * 34);
    for (let k = 0; k < 4; k++) g.circle(cx + (k - 1.5) * r * 0.5, cy + (k % 2) * 6, Math.round(r * 0.6), i % 3 ? P.forest5 : P.olive3, true);
  }
  // the river: a calm wave across the sheet
  let py = 0;
  for (let x = 0; x <= 960; x += 4) {
    const y = Math.round(300 + Math.sin(x / 120 + seed % 7) * 40 + Math.sin(x / 47) * 10);
    if (x > 0) g.line(x - 4, py, x, y, tint.light, 7);
    py = y;
  }
  g.box(0, 0, 960, 540, P.paper0, 3);
}

function roadColour(state: "travelled" | "next" | "open" | "behind") {
  return state === "travelled" ? P.road1 : state === "next" ? P.road2 : state === "open" ? P.road3 : P.paper1;
}

function drawRoads(g: Gfx, s: Session) {
  const t = s.tour;
  const map = t.map;
  const here = currentNode(t);
  const visited = t.visited;
  const pairTravelled = (a: string, b: string) => {
    const i = visited.indexOf(a);
    return i >= 0 && visited[i + 1] === b;
  };
  const segs: { a: MapNode; b: MapNode; st: "travelled" | "next" | "open" | "behind" }[] = [];
  for (const n of map.nodes) {
    for (const m of successors(map, n)) {
      let st: "travelled" | "next" | "open" | "behind" = "open";
      if (pairTravelled(n.id, m.id)) st = "travelled";
      else if (n.id === here.id) st = "next";
      else if (m.col <= here.col) st = "behind";
      segs.push({ a: n, b: m, st });
    }
  }
  // detours that really happened (consecutive visited nodes without a road)
  for (let i = 0; i + 1 < visited.length; i++) {
    const a = map.nodes.find((n) => n.id === visited[i]);
    const b = map.nodes.find((n) => n.id === visited[i + 1]);
    if (a && b && !a.next.includes(b.id)) {
      for (let k = 0; k < 20; k += 2) {
        const x0 = a.x + ((b.x - a.x) * k) / 20;
        const y0 = a.y + ((b.y - a.y) * k) / 20;
        const x1 = a.x + ((b.x - a.x) * (k + 1)) / 20;
        const y1 = a.y + ((b.y - a.y) * (k + 1)) / 20;
        g.line(x0, y0, x1, y1, P.road0, 4);
      }
    }
  }
  const order = ["behind", "open", "next", "travelled"] as const;
  for (const o of order) {
    for (const sg of segs) {
      if (sg.st !== o) continue;
      const w = o === "behind" ? 4 : 6;
      g.line(sg.a.x, sg.a.y, sg.b.x, sg.b.y, P.ink1, w + 3);
    }
    for (const sg of segs) {
      if (sg.st !== o) continue;
      const w = o === "behind" ? 4 : 6;
      g.line(sg.a.x, sg.a.y, sg.b.x, sg.b.y, roadColour(o), w);
    }
  }
}

interface Layer {
  key: string;
  canvas: HTMLCanvasElement;
}

function buildLayer(s: Session, withSheet: boolean): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 1920;
  c.height = 1080;
  const ctx = c.getContext("2d")!;
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const g = new Gfx(ctx);
  if (withSheet) paperSheet(g, s.tour.map.region, s.tour.map.seed);
  drawRoads(g, s);
  return markHD(c, 2);
}

// ─── the preview card ─────────────────────────────────────────────────────────────────────────────────────

function stakesLine(s: Session, n: MapNode): string {
  if (!n.inn) return "";
  const pot = innPot(s.tour, [0, 0, 0], n.inn.stakes, n.inn.houseRule, "inn");
  return `Einsatz ${STAKES_NAMES[n.inn.stakes]}: Pott ab ${pot} Mark`;
}

function drawPreview(g: Gfx, a: App, s: Session, v: NodeView, close: () => void, drive: (detour: boolean) => void) {
  const n = v.node;
  const def = STATION_DEFS[n.kind];
  const place = placeName(s.env.pack, n.place);
  const showPeople = (n.kind === "inn" && v.revealed && n.inn) || n.kind === "tournament" || n.kind === "bikers";
  const h = (showPeople ? 372 : 236) + (isDuoInn(n) && v.revealed ? 28 : 0);
  const { x, y, w } = dialog(g, 660, h, "paper");
  stationIcon(g, n.kind, v.state === "visited" || v.state === "here" ? "visited" : "reachable", x + 40, y + 36);
  const title = n.kind === "inn" && n.inn && v.revealed ? n.inn.name : def.name;
  g.text(title, x + 70, y + 14, { font: "big", color: P.ink1 });
  g.text(n.kind === "inn" && v.revealed ? `Wirtshaus in ${place}` : place, x + 70, y + 50, { font: "head", color: P.ink3 });
  let ty = y + 84;
  const line = (text: string, color: string = P.ink1, font: "head" | "body" = "head") => {
    ty += para(g, text, x + 24, ty, w - 48, { font, color, shadow: null }) + 4;
  };
  if (n.kind === "inn" && n.inn && v.revealed) {
    const rule = HOUSE_RULE_TEXTS[n.inn.houseRule];
    line(`Hausregel: ${rule.name}. ${rule.short}`);
    line(stakesLine(s, n), P.ink3);
    if (isDuoInn(n)) line("Heute sitzen der Schultes und sein Amtsbote am Stammtisch.", P.brick1);
  } else if (n.kind === "inn") {
    line(def.text);
    line("Hausregel und Stammgäste siehst du, sobald das Wirtshaus direkt vor dir liegt.", P.ink3);
  } else if (n.kind === "tournament") {
    line(`${def.text} ${s.tour.stage >= 2 ? "Hier geht es um den Wanderpokal: neun Spiele." : ""}`.trim());
  } else if (n.kind === "pitch") {
    line(`${def.text}`);
  } else line(def.text);

  if (showPeople) {
    const people = n.kind === "tournament" ? FAVOURITES_BY_REGION[s.tour.map.region] : n.kind === "bikers" ? (["biker-manne", "biker-uschi"] as const) : n.inn!.opponents;
    people.forEach((id, i) => {
      const px = x + 24 + i * 310;
      const py = Math.max(ty + 6, y + 168);
      portrait(g, id, px + 4, py + 4, 72);
      const ch = CHARACTER_DEFS[id];
      g.text(ch.name, px + 92, py, { font: "head", color: P.ink1 });
      g.text(ch.style, px + 92, py + 26, { font: "body", color: P.ink3, width: 200, maxLines: 3 });
    });
  }
  const by = y + h - 60;
  if (a.ui.button("pv-close", x + 24, by, 150, 44, "Zurück", { hotkey: "Escape" })) close();
  if (v.state === "road") {
    if (a.ui.button("pv-go", x + w - 274, by, 250, 44, "Hinfahren", { variant: "go", hotkey: "Enter" })) drive(false);
  } else if (v.state === "detour") {
    const c = canMove(s.tour, n.id);
    const sub = c.free === "rig" ? "frei mit dem Gespann" : c.free === "sidecar" ? "frei mit dem Beiwagen" : c.free === "wolfhound-a" ? "frei, der Wolfshund kennt den Weg" : "kostet 1 Strich Sprit";
    if (a.ui.button("pv-detour", x + w - 334, by - 6, 310, 52, "Mit dem Motorrad hin", { variant: "go", sub })) drive(true);
  } else if (v.state !== "here" && v.state !== "visited") {
    g.text("Dorthin führt von hier keine Straße.", x + w - 24, centerY("head", by, 44), { font: "head", align: "right", color: P.ink3 });
  }
}

// ─── the scene ────────────────────────────────────────────────────────────────────────────────────────────

export function createMapScene(app: App, s: Session): Scene {
  const t = s.tour;
  const region = t.map.region;
  let layer: Layer | null = null;
  let selected: string | null = null;
  let drive: { ax: number; ay: number; bx: number; by: number; t: number; dur: number; bike: boolean } | null = null;
  const engine = soundLoop("van-drive", 0.7);
  let clock = 0;

  const start = (id: string, detour: boolean) => {
    const from = currentNode(t);
    const to = t.map.nodes.find((n) => n.id === id)!;
    const r = moveTo(t, s.env, id);
    if (!r.ok) return;
    persist(s);
    selected = null;
    drive = { ax: from.x, ay: from.y, bx: to.x, by: to.y, t: 0, dur: detour ? 2.0 : 1.6, bike: detour };
    if (detour) sfx.play("bike-kick");
    else sfx.play("van-start");
    engine.start();
  };

  return {
    enter() {
      void music.play(REGION_MUSIC[region]);
    },
    exit() {
      engine.stop();
    },
    update(dt) {
      clock += dt;
      if (drive) {
        drive.t += dt;
        if (drive.t >= drive.dur) {
          drive = null;
          engine.stop();
          app.scenes.switchTo(route(app, s));
        }
      }
    },
    draw(g, a) {
      const ui = a.ui;
      const artId = mapArt(region);
      const hasArt = !!art(artId) || !!PAINTED[artId];
      if (hasArt) {
        // The atlas sheet shows the real roads and settlements; the stage map is schematic (columns left to right),
        // so the sheet is calmed under a paper veil and the tour roads and stations stand on top.
        drawBackdrop(g, artId);
        g.alpha(0.25, () => g.rect(0, 0, 960, 540, P.paper3));
      }
      const key = `${t.map.seed}|${t.at}|${t.visited.length}|${hasArt}`;
      if (!layer || layer.key !== key) layer = { key, canvas: buildLayer(s, !hasArt) };
      g.image(layer.canvas, 0, 0);

      const views = mapView(t);
      const here = currentNode(t);
      const moving = !!drive;
      // detour hints: dotted lines to stations without a road
      if (!moving) {
        for (const v of views) {
          if (v.state !== "detour") continue;
          for (let k = 0; k < 16; k += 2) {
            const x0 = here.x + ((v.node.x - here.x) * k) / 16;
            const y0 = here.y + ((v.node.y - here.y) * k) / 16;
            g.circle(Math.round(x0), Math.round(y0), 2, P.stone1, true);
          }
        }
      }
      // stations
      const pulse = settings.reducedMotion ? 0 : Math.round(Math.sin(clock * 3) * 2);
      for (const v of views) {
        const n = v.node;
        const big = n.kind === "tournament";
        const r = big ? 24 : 20;
        if (v.state === "road" && !moving) g.circle(n.x, n.y, r + 6 + pulse, P.beer2, false);
        if (v.state === "road" && !moving) g.circle(n.x, n.y, r + 7 + pulse, P.beer2, false);
        if (v.state === "detour" && !moving) g.ellipse(n.x, n.y, r + 6, r + 6, P.stone1, 2, 3);
        g.circle(n.x, n.y, r + 2, P.ink0, true);
        const fill = v.state === "road" ? P.beer4 : v.state === "passed" ? P.paper1 : v.state === "visited" || v.state === "here" ? P.paper2 : P.paper4;
        g.circle(n.x, n.y, r, fill, true);
        const iconState = v.state === "road" ? "reachable" : v.state === "visited" || v.state === "here" ? "visited" : v.state === "passed" ? "locked" : "normal";
        stationIcon(g, n.kind, iconState, n.x, n.y);
        const label = placeName(s.env.pack, n.place);
        const color = v.state === "passed" ? P.paper1 : v.state === "road" ? P.beer4 : P.paper4;
        const lw = measure(label, "body") / 2;
        const lx = Math.max(8 + lw, Math.min(952 - lw, n.x));
        g.text(label, lx, n.y + r + 4, { font: "body", align: "center", color, outline: P.ink0 });
        if (big) g.text("Preisskat", n.x, n.y - r - 22, { font: "head", align: "center", color: P.beer3, outline: P.ink0 });
        if (!moving && n.id !== here.id && ui.area(`node-${n.id}`, n.x - 28, n.y - 28, 56, 56, { sound: "ui-open" })) selected = n.id;
      }
      // the marker
      let mx = here.x;
      let my = here.y;
      let frame = t.vehicle === "sidecar-rig" ? "marker-rig" : "marker-camper";
      if (drive) {
        const k = Math.min(1, drive.t / drive.dur);
        const e = k * k * (3 - 2 * k);
        mx = drive.ax + (drive.bx - drive.ax) * e;
        my = drive.ay + (drive.by - drive.ay) * e;
        if (drive.bike) frame = "marker-bike";
      }
      const bob = drive && !settings.reducedMotion ? Math.round(Math.abs(Math.sin(clock * 9)) * 2) : 0;
      const ground = Math.round(my) - 18 - bob;
      const painted =
        frame === "marker-bike"
          ? artFit(g, "van/bike", Math.round(mx) - 20, ground - 22, 40, 22, { anchor: "bottom" })
          : paintedVehicle(g, frame === "marker-rig" ? "rig" : "camper", Math.round(mx), ground, 58);
      if (!painted && !g.sprite("van", frame, Math.round(mx), ground)) {
        g.rect(mx - 16, my - 36 - bob, 32, 16, P.ink0);
        g.rect(mx - 15, my - 35 - bob, 30, 14, P.paper3);
        g.rect(mx - 15, my - 29 - bob, 30, 3, P.brick2);
      }

      // top bar
      g.rect(0, 0, 960, 52, rgba(P.ink0, 0.6));
      const fw = fuelGauge(g, 14, 13, t.fuel, t.fuelMax);
      marksChip(g, 14 + fw + 22, 13, t.marks);
      luggageButtons(g, a, s, 548, 6);
      if (!moving && menuButton(a)) openMenu(a, s);

      // bottom: stage plate and the "Was jetzt?" line
      const reg = findRegion(s.env.pack, region);
      const stageText = t.tutorial ? `Probefahrt · ${reg?.title ?? ""}` : `Etappe ${t.stage + 1} von 3 · ${reg?.title ?? ""}`;
      const sw = measure(stageText, "head") + 28;
      g.panel(946 - sw, 488, sw, 40, "panel-hi");
      g.text(stageText, 946 - sw / 2, centerY("head", 488, 40), { font: "head", align: "center", color: C.title, shadow: P.ink0 });
      const detours = detourTargets(t).length;
      let now = "Was jetzt? Klicke auf eine leuchtende Station.";
      if (selected) now = "Was jetzt? „Hinfahren“, oder „Zurück“ zur Karte.";
      else if (t.tutorial) now = t.visited.length <= 1 ? TUTORIAL.steps.map[1] : "Was jetzt? Klicke auf die nächste Station, die leuchtet.";
      else if (drive) now = drive.bike ? "Die Maschine kommt vom Heckträger. RÖÖÖHR." : "Das Wohnmobil rollt zur nächsten Station.";
      else if (!roadTargets(t).length) now = "Was jetzt? Hier geht es nicht weiter.";
      else if (detours) now = "Was jetzt? Klicke auf eine leuchtende Station. Gestrichelt: ein Abstecher mit dem Motorrad.";
      whatNow(g, now, { x: 14, y: bottomY(now, 940 - sw - 30), w: 940 - sw - 30 });
      if (t.tutorial && t.visited.length <= 1) {
        g.panel(300, 64, 640, 64, "paper");
        para(g, `${TUTORIAL.steps.map[0]} ${TUTORIAL.steps.gauges[0]}`, 314, 70, 612, { color: P.ink1, shadow: null, font: "body" });
      }

      if (selected && !drive) {
        const v = views.find((x) => x.node.id === selected);
        if (v) drawPreview(g, a, s, v, () => (selected = null), (detour) => start(v.node.id, detour));
      }
    },
  };
}

SCREENS.map = createMapScene;

/** For dev routes: a session's map at once. */
export function showMap(app: App, s: Session) {
  go(app, s);
}

