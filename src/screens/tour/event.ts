// Unterwegs (contract §4.10): a comic panel (public/art/events/<art>.png or a code panel), title, text and two or
// three answers. Blue answers (unlocked by a dog, souvenir or upgrade) are framed and labelled by their requirement;
// unmet plain answers stay visible with the reason. After the choice: the outcome text, what changed, and on to the
// next event, a special Skat round, a puzzle, or the road.
import type { App, Scene } from "../../core/scene";
import type { Gfx } from "../../core/gfx";
import type { EventDef } from "../../game/types";
import { art } from "../../core/assets";
import { music, sfx } from "../../core/audio";
import { C, P } from "../../core/palette";
import { centerY } from "../../core/font";
import { bands, portrait, soundWord } from "../kit";
import { eventById, presentEvent, resolveChoice, type EventResult, type EventView } from "../../tour/events";
import { currentNode, currentRegion, placeName } from "../../tour/util";
import { SCREENS, go, leaveStation, persist, type Session } from "./session";
import { deltaChips, mainButton, nowLine, paperText, regionTint, scenery, topBar } from "./common";

const PANEL = { x: 24, y: 116, w: 384, h: 192 };

/** The 256×128 comic panel (drawn 3× = 384×192 layout units), or a code panel with the event's sound word. */
export function comicPanel(g: Gfx, def: EventDef, view: EventView, region: string) {
  const { x, y, w, h } = PANEL;
  g.rect(x - 4, y - 4, w + 8, h + 8, P.ink0);
  const img = def.art ? art(`events/${def.art}`) : null;
  if (!img || !g.pixelFit(img, x, y, w, h)) {
    // Code panel: an evening landscape of the region with the event's sound word, until the painted panel exists.
    const tint = regionTint(region as never);
    bands(g, x, y, w, Math.round(h * 0.62), [P.dusk1, P.dusk2, P.dusk3, P.brick4, P.beer3]);
    g.circle(x + Math.round(w * 0.72), y + Math.round(h * 0.5), 18, P.beer3, true);
    const seed = def.id.length * 7;
    for (let k = 0; k < w; k += 4) {
      const far = Math.round(h * 0.52 + Math.sin((k + seed) / 37) * 10 + Math.sin(k / 13) * 3);
      const near = Math.round(h * 0.7 + Math.sin((k + seed * 3) / 53) * 12);
      g.rect(x + k, y + far, 4, h - far, P.forest1);
      g.rect(x + k, y + near, 4, h - near, P.forest2);
    }
    g.rect(x, y + Math.round(h * 0.86), w, Math.round(h * 0.14), tint.main);
    const word = /\b[A-ZÄÖÜ]{4,}\b/.exec(`${view.text}`)?.[0];
    if (word) soundWord(g, word, x + Math.round(w * 0.36), y + Math.round(h * 0.42), 1);
  }
  g.box(x - 4, y - 4, w + 8, h + 8, P.paper4, 2);
  if (def.portrait) {
    portrait(g, def.portrait, x + w - 76, y + h - 76, 64);
    if (view.speaker) {
      const sw = Math.min(260, view.speaker.length * 9 + 20);
      g.panel(x + w - 84 - sw, y + h - 40, sw, 32, "paper");
      g.text(view.speaker, x + w - 84 - sw / 2, centerY("body", y + h - 40, 32), { font: "body", align: "center", color: P.ink1 });
    }
  }
}

function createEvent(app: App, s: Session): Scene {
  const t = s.tour;
  const id = t.station?.event ?? "";
  const def = eventById(s.env, id);
  if (!def) {
    // An unknown id (content changed between versions): drop it and go on.
    if (t.station) delete t.station.event;
    let gone = false;
    return {
      draw: () => {
        if (!gone) go(app, s);
        gone = true;
      },
    };
  }
  const region = currentRegion(t);
  const view = presentEvent(t, s.env, def);
  let result: EventResult | null = null;
  const place = placeName(s.env.pack, currentNode(t).place);
  return {
    enter() {
      if (def.music) void music.play(def.music);
    },
    draw(g, a) {
      scenery(g, currentNode(t).kind === "dogs" ? "bg/dogs" : `bg/pitch-${region}`);
      topBar(g, a, s);
      const title = view.title;
      g.panel(24, 62, 912, 44, "panel-hi");
      g.text(title, 480, centerY("big", 62, 44), { font: "big", align: "center", color: C.title, shadow: P.ink0 });
      g.text(place, 924, centerY("body", 62, 44), { font: "body", align: "right", color: P.paper3, shadow: P.ink0 });
      comicPanel(g, def, view, region);
      if (!result) {
        paperText(g, view.text, 424, PANEL.y - 4, 512, { minH: PANEL.h + 8 });
        const shown = view.choices.filter((c) => !c.hidden);
        shown.forEach((c, i) => {
          const y = 324 + i * 54;
          if (c.blue) {
            // a blue answer: unlocked by a dog, souvenir or upgrade, framed in river blue with its requirement
            g.rrect(22, y - 2, 916, 52, 6, P.ink0);
            g.rrect(24, y, 912, 48, 5, a.ui.hover(24, y, 912, 48) ? P.river2 : P.river1);
            g.rect(28, y + 4, 904, 2, P.river3);
          }
          const label = c.blue ? `${c.label} ${c.text}` : c.text;
          const sub = !c.enabled ? c.reason : undefined;
          if (a.ui.button(`ev-${i}`, 24, y, 912, 48, label, { align: "left", disabled: !c.enabled, sub, variant: c.blue ? "ghost" : "normal", color: c.blue ? P.paper4 : undefined })) {
            result = resolveChoice(t, s.env, def, c.index);
            sfx.play("page-turn");
            if (result.fuel > 0) sfx.play("fuel");
            if (result.marks > 0) sfx.play("coin");
            leaveIfDone(s, result);
            persist(s);
          }
        });
        nowLine(g, shown.length > 1 ? "Was jetzt? Wähle eine Antwort." : "Was jetzt? Klicke auf die Antwort.", 900);
      } else {
        let y = PANEL.y - 4;
        const text = result.text ?? "";
        if (text) y += paperText(g, text, 424, y, 512) + 8;
        const notes = result.notices.filter((n) => !n.startsWith("Tank leer"));
        if (notes.length) y += paperText(g, notes.join(" · "), 424, y, 512, { font: "body" }) + 8;
        deltaChips(g, 424, y + 2, result.fuel, result.marks);
        const next = result.next;
        const label = result.ended ? "Weiter" : next?.kind === "skat" ? "Zum Kartentisch" : next?.kind === "puzzle" ? "Zur Aufgabe" : next?.kind === "event" ? "Weiter" : "Weiterfahren";
        nowLine(g, result.ended ? "Was jetzt? Der Tank ist leer. Klicke auf „Weiter“." : `Was jetzt? Klicke auf „${label}“.`);
        if (mainButton(a, "ev-next", label)) go(app, s);
      }
    },
  };
}

/** After the last step of an event station, the station is done (the dog meadow and bikers keep their own flow). */
function leaveIfDone(s: Session, r: EventResult) {
  const kind = currentNode(s.tour).kind;
  if (!r.next && !r.ended && kind === "event") leaveStation(s);
}

SCREENS.event = createEvent;
