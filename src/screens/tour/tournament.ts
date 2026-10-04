// Der Preisskat (contract §4.6) after the table: the ceremony (the region's trophy, the Wanderpokal in the final),
// the beer mat out of three, and the choice of the next region. The table itself is in inn.ts.
import type { App, Scene } from "../../core/scene";
import type { Gfx } from "../../core/gfx";
import type { RoundConfig, RoundResult } from "../../game/types";
import type { BeerMatId, RegionId } from "../../game/ids";
import { music, sfx } from "../../core/audio";
import { settings } from "../../core/save";
import { P } from "../../core/palette";
import { dialog, para, textHeight } from "../kit";
import { goHome } from "../home";
import { PAINTED, paintedBackdrop } from "../paint/index";
import { CHARACTER_DEFS } from "../../data/characters";
import { BEER_MAT_DEFS } from "../../data/beerMats";
import { DOG_DEFS, dogName } from "../../data/dogs";
import { FINAL_LINES, REGION_BLURBS, REGION_CHOICE, TOURNAMENT_LINES } from "../../content/texts";
import { enterStage, regionChoices } from "../../tour/state";
import { chooseBeerMat, type StationOutcome } from "../../tour/economy";
import { isFinalStage } from "../../tour/perks";
import { currentNode, currentRegion, findRegion, placeName } from "../../tour/util";
import { HOOKS, SCREENS, go, persist, type Session } from "./session";
import { drawListe } from "./inn";
import { deltaChips, itemIcon, mainButton, mapArt, nowLine, paperText, pickFor, regionTint, scenery, stationPlate, topBar } from "./common";

// ─── the ceremony ─────────────────────────────────────────────────────────────────────────────────────────

function createTournamentResult(app: App, s: Session, out: StationOutcome, cfg: RoundConfig, r: RoundResult): Scene {
  const t = s.tour;
  const region = currentRegion(t);
  const final = !!out.wanderpokal || (isFinalStage(t) && !out.trophy);
  const won = out.place === 1;
  const lines = TOURNAMENT_LINES[region];
  const line = final
    ? pickFor(s, won ? FINAL_LINES.win : FINAL_LINES.lose, "final")
    : pickFor(s, won ? lines.win : out.place === 2 ? lines.second : lines.third, "pre-res");
  const names = [settings.name || "Du", CHARACTER_DEFS[cfg.opponents[0]].name, CHARACTER_DEFS[cfg.opponents[1]].name];
  const extra = out.lines.filter((l) => !l.startsWith("Tank leer") && !l.startsWith("Der Wanderpokal") && !l.startsWith("Kein Wanderpokal"));
  const unlocked = out.unlocked.map((d) => `${dogName(s.env.profile, d)}, der ${DOG_DEFS[d].breed}, darf jetzt mitfahren.`);
  let clock = 0;
  return {
    enter() {
      if (won) {
        void music.play("pokal");
        sfx.play("trophy-fanfare");
      } else sfx.play("lose-sting");
    },
    update(dt) {
      clock += dt;
    },
    draw(g, a) {
      scenery(g, won ? "bg/trophy" : "inns/clubhouse", won ? "evening" : "room");
      topBar(g, a, s);
      stationPlate(g, won ? (final ? "Der Wanderpokal!" : "Tischsieg!") : out.place === 2 ? "Zweiter beim Preisskat" : "Dritter beim Preisskat", placeName(s.env.pack, currentNode(t).place));
      drawListe(g, 24, 140, 440, names, r.list, final ? "Liste des Finales" : "Liste des Preisskats");
      let y = 140;
      y += paperText(g, line, 490, y, 446) + 10;
      for (const l of [...extra, ...unlocked]) y += paperText(g, l, 490, y, 446, { font: "body" }) + 8;
      deltaChips(g, 490, y + 4, out.fuel, out.marks);
      if (won) {
        const bob = settings.reducedMotion ? 0 : Math.round(Math.sin(clock * 2) * 3);
        const cx = 244;
        const cy = 400 + bob;
        g.circle(cx, cy, 40, P.beer2, false);
        itemIcon(g, final ? "trophy-wander" : `trophy-${region}`, cx, cy, { label: "Pokal" });
        if (final) itemIcon(g, `trophy-${region}`, cx + 90, cy + 10);
      }
      const ended = !!out.ended;
      const label = ended ? "Heimkehr" : won && !final ? "Bierdeckel wählen" : "Weiter";
      nowLine(g, `Was jetzt? Klicke auf „${label}“.`);
      if (mainButton(a, "pre-res-go", label)) go(app, s);
    },
  };
}

// ─── beer mats ────────────────────────────────────────────────────────────────────────────────────────────

function createBeerMats(app: App, s: Session): Scene {
  const t = s.tour;
  const offer = (t.station?.offer ?? []) as BeerMatId[];
  let pickReplace: BeerMatId | null = null;
  const take = (id: BeerMatId, replace?: BeerMatId) => {
    const r = chooseBeerMat(t, id, replace);
    if (r.ok) {
      sfx.play("card-play");
      go(app, s);
    } else if (t.beerMats.length >= 3) pickReplace = id;
  };
  return {
    draw(g, a) {
      scenery(g, "bg/trophy");
      topBar(g, a, s);
      stationPlate(g, "Ein Bierdeckel nach Wahl");
      paperText(g, "Ein Bierdeckel gilt als Sonderregel für den Rest der Tour. Drei haben Platz im Geldbeutel.", 150, 140, 660);
      offer.forEach((id, i) => {
        const x = 40 + i * 300;
        const def = BEER_MAT_DEFS[id];
        g.panel(x, 200, 280, 240, "paper");
        itemIcon(g, id, x + 140, 244, { label: def.name });
        g.text(def.name, x + 140, 278, { font: "head", align: "center", color: P.ink1 });
        para(g, def.text, x + 14, 306, 252, { font: textHeight(def.text, 252, "head") <= 76 ? "head" : "body", color: P.ink2, shadow: null, align: "center" });
        if (a.ui.button(`mat-${id}`, x + 14, 384, 252, 44, "Diesen nehmen", { variant: "go" })) take(id);
      });
      nowLine(g, "Was jetzt? Wähle einen Bierdeckel.");
      if (pickReplace) {
        const { x, y, w } = dialog(g, 640, 240, "paper");
        g.text("Welcher Bierdeckel geht?", x + 24, y + 14, { font: "big", color: P.ink1 });
        t.beerMats.forEach((m, i) => {
          if (a.ui.button(`mat-out-${m}`, x + 24 + i * 200, y + 80, 190, 52, BEER_MAT_DEFS[m].name)) {
            const id = pickReplace!;
            pickReplace = null;
            take(id, m);
          }
        });
        if (a.ui.button("mat-out-cancel", x + w - 164, y + 172, 140, 44, "Doch nicht")) pickReplace = null;
      }
    },
  };
}

// ─── region choice ────────────────────────────────────────────────────────────────────────────────────────

/** A small atlas view of a region: the painted sheet (scaled down) or paper with the places as dots. */
function mapThumb(g: Gfx, s: Session, region: RegionId, x: number, y: number, w: number, h: number) {
  const tint = regionTint(region);
  g.rect(x - 3, y - 3, w + 6, h + 6, P.ink0);
  const c = PAINTED[mapArt(region)] ? paintedBackdrop(mapArt(region)) : null;
  if (c) {
    const ctx = g.ctx;
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(c, x, y, w, h);
    ctx.imageSmoothingEnabled = smooth;
  } else {
    g.rect(x, y, w, h, P.paper3);
    for (let k = 0; k < w; k += 3) g.rect(x + k, y + Math.round(h * 0.55 + Math.sin(k / 23) * 8), 3, 3, tint.light);
  }
  const reg = findRegion(s.env.pack, region);
  for (const p of reg?.places ?? []) {
    const px = Math.round(x + p.x * w);
    const py = Math.round(y + p.y * h);
    const big = p.id === reg!.tournament;
    g.rect(px - (big ? 3 : 2), py - (big ? 3 : 2), big ? 7 : 5, big ? 7 : 5, P.ink0);
    g.rect(px - (big ? 2 : 1), py - (big ? 2 : 1), big ? 5 : 3, big ? 5 : 3, big ? P.road1 : P.paper4);
  }
  g.box(x - 3, y - 3, w + 6, h + 6, tint.main, 3);
}

function createRegionChoice(app: App, s: Session): Scene {
  const t = s.tour;
  const choices = regionChoices(t, s.env.pack);
  return {
    enter() {
      void music.play("stellplatz");
    },
    draw(g, a) {
      scenery(g, `bg/pitch-${currentRegion(t)}`, "night");
      topBar(g, a, s);
      stationPlate(g, REGION_CHOICE.heading, `Etappe ${t.stage + 2} von 3`);
      paperText(g, REGION_CHOICE.text, 150, 140, 660);
      choices.forEach((id, i) => {
        const x = choices.length === 1 ? 260 : 40 + i * 450;
        const reg = findRegion(s.env.pack, id);
        g.panel(x, 200, 430, 272, "paper");
        mapThumb(g, s, id, x + 16, 214, 192, 108);
        g.text(reg?.title ?? id, x + 222, 214, { font: "head", color: P.ink1, width: 196 });
        para(g, REGION_BLURBS[id], x + 16, 330, 398, { font: textHeight(REGION_BLURBS[id], 398, "head") <= 76 ? "head" : "body", color: P.ink2, shadow: null });
        if (a.ui.button(`reg-${id}`, x + 16, 414, 398, 46, `Nach ${reg?.title ?? id}`, { variant: "go" })) {
          const r = enterStage(t, s.env, id);
          if (r.ok) {
            sfx.play("van-start");
            go(app, s);
          }
        }
      });
      nowLine(g, "Was jetzt? Wähle eine Region, oder hör für heute auf.", 700);
      if (a.ui.button("reg-stop", 744, 486, 200, 46, "Für heute aufhören")) {
        persist(s);
        goHome(app);
      }
    },
  };
}

SCREENS.beerMats = createBeerMats;
SCREENS.region = createRegionChoice;
HOOKS.tournamentResult = createTournamentResult;
