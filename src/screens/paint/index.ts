// Registry of the code-painted backdrops (Kulissen), keyed by the art id they stand in for. Until the painted
// Krea art exists (public/art/<id>.png), `drawBackdrop` paints these in the 640×360 adventure raster instead.
import type { Gfx } from "../../core/gfx";
import { P } from "../../core/palette";
import { backdrop } from "../kit";
import { paintedScene, type Px } from "./painter";
import { paintKitchen } from "./kitchen";
import { paintVillageInn } from "./inn-village";
import { paintBesen } from "./inn-besen";
import { paintClubhouse } from "./inn-clubhouse";
import { paintStation } from "./inn-station";
import { paintBeergarden } from "./inn-beergarden";
import { paintCampsite } from "./inn-campsite";
import { paintCanteen } from "./inn-canteen";
import { paintTent } from "./inn-tent";
import { paintBikersInn } from "./inn-bikers";
import { paintPitchEnztal } from "./pitch-enztal";
import { paintPitchMuehlacker } from "./pitch-muehlacker";
import { paintPitchSchwarzwald } from "./pitch-schwarzwald";
import { paintPitchStuttgart } from "./pitch-stuttgart";
import { paintDogs } from "./dogs";
import { paintMarket } from "./market";
import { paintGarage } from "./garage";
import { paintBikers } from "./bikers";
import { paintHomecoming } from "./homecoming";
import { paintTrophy } from "./trophy";
import { paintTitle } from "./title";
import { paintMapEnztal } from "./map-enztal";
import { paintMapMuehlacker } from "./map-muehlacker";
import { paintMapSchwarzwald } from "./map-schwarzwald";
import { paintMapStuttgart } from "./map-stuttgart";

export type Painter = (p: Px) => void;

/** Code-painted fallbacks by art id (inns/<room>, bg/<id>, maps/<region>). */
export const PAINTED: Record<string, Painter> = {
  "inns/village": paintVillageInn,
  "inns/besen": paintBesen,
  "inns/clubhouse": paintClubhouse,
  "inns/station": paintStation,
  "inns/beergarden": paintBeergarden,
  "inns/campsite": paintCampsite,
  "inns/canteen": paintCanteen,
  "inns/tent": paintTent,
  "inns/bikers": paintBikersInn,
  "bg/kitchen": paintKitchen,
  "bg/pitch-enztal": paintPitchEnztal,
  "bg/pitch-muehlacker": paintPitchMuehlacker,
  "bg/pitch-schwarzwald": paintPitchSchwarzwald,
  "bg/pitch-stuttgart": paintPitchStuttgart,
  "bg/dogs": paintDogs,
  "bg/market": paintMarket,
  "bg/garage": paintGarage,
  "bg/bikers": paintBikers,
  "bg/homecoming": paintHomecoming,
  "bg/trophy": paintTrophy,
  "bg/title": paintTitle,
  "maps/enztal": paintMapEnztal,
  "maps/muehlacker": paintMapMuehlacker,
  "maps/schwarzwald": paintMapSchwarzwald,
  "maps/stuttgart": paintMapStuttgart,
};

/** Other names the screens may use for the same picture. */
const ALIASES: Record<string, string> = {
  "bg/motorradtreff": "bg/bikers",
  "inns/camping": "inns/campsite",
  "inns/festtent": "inns/tent",
  "bg/stellplatz": "bg/pitch-enztal",
};

/** Unknown ids of a known family borrow a sibling, so nothing ever shows a blank screen. */
const FAMILY_FALLBACK: [string, string][] = [
  ["inns/", "inns/village"],
  ["bg/pitch", "bg/pitch-enztal"],
  ["maps/", "maps/enztal"],
  ["bg/", "bg/title"],
];

/** The painter that stands in for `artId` (exact, else a sibling of the same family), or null. */
export function painterFor(artId: string): { id: string; paint: Painter } | null {
  if (PAINTED[artId]) return { id: artId, paint: PAINTED[artId] };
  const alias = ALIASES[artId];
  if (alias && PAINTED[alias]) return { id: alias, paint: PAINTED[alias] };
  for (const [prefix, id] of FAMILY_FALLBACK) if (artId.startsWith(prefix) && PAINTED[id]) return { id, paint: PAINTED[id] };
  return null;
}

/** The cached 640×360 code painting for an art id (or a sibling), e.g. to draw a map into a frame with pixelFit. */
export function paintedBackdrop(artId: string): HTMLCanvasElement | null {
  const f = painterFor(artId);
  return f ? paintedScene(f.id, f.paint) : null;
}

/**
 * Draw the backdrop for `artId` over the whole 960×540 screen: the painted art from public/art/<artId>.png when it
 * has loaded, otherwise the code painting from PAINTED (or a dark wall if there is none). Returns true when the
 * real art was drawn.
 */
export function drawBackdrop(g: Gfx, artId: string, offsetX = 0, offsetY = 0): boolean {
  return backdrop(
    g,
    artId,
    (gg) => {
      const c = paintedBackdrop(artId);
      if (!c || !gg.pixelScene(c, offsetX, offsetY)) gg.rect(0, 0, 960, 540, P.ink1);
    },
    offsetX,
    offsetY,
  );
}
