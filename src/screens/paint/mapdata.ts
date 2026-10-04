// Place positions of the Enztal pack (public/packs/enztal/pack.json, x/y 0…1 on the map sheet), copied as constants
// so the map painter needs no fetch. mapdata.test.ts checks they still match the pack. Pure module (no DOM).

export type PlaceXY = readonly [id: string, x: number, y: number];

export const MAP_PLACES = {
  enztal: [
    ["vaihingen", 0.226, 0.617],
    ["enzweihingen", 0.463, 0.678],
    ["rosswag", 0.08, 0.436],
    ["aurich", 0.226, 0.822],
    ["riet", 0.35, 0.92],
    ["kleinglattbach", 0.316, 0.519],
    ["ensingen", 0.286, 0.36],
    ["horrheim", 0.35, 0.186],
    ["guendelbach", 0.185, 0.095],
    ["oberriexingen", 0.5, 0.67],
    ["unterriexingen", 0.628, 0.655],
    ["sersheim", 0.448, 0.398],
    ["sachsenheim", 0.635, 0.405],
    ["hohenhaslach", 0.511, 0.08],
    ["markgroeningen", 0.691, 0.829],
    ["bissingen", 0.819, 0.398],
    ["besigheim", 0.92, 0.11],
  ],
  muehlacker: [
    ["muehlacker", 0.529, 0.547],
    ["duerrmenz", 0.49, 0.584],
    ["lomersheim", 0.654, 0.447],
    ["muehlhausen-enz", 0.785, 0.447],
    ["enzberg", 0.336, 0.64],
    ["lienzingen", 0.442, 0.341],
    ["grossglattbach", 0.708, 0.727],
    ["illingen", 0.92, 0.516],
    ["oetisheim", 0.336, 0.435],
    ["maulbronn", 0.389, 0.236],
    ["schmie", 0.553, 0.298],
    ["zaisersweiher", 0.529, 0.173],
    ["schuetzingen", 0.722, 0.099],
    ["wiernsheim", 0.587, 0.92],
    ["knittlingen", 0.128, 0.08],
    ["oelbronn", 0.08, 0.435],
  ],
  schwarzwald: [
    ["neuenbuerg", 0.408, 0.352],
    ["waldrennach", 0.52, 0.423],
    ["arnbach", 0.464, 0.257],
    ["dennach", 0.29, 0.459],
    ["birkenfeld", 0.623, 0.21],
    ["hoefen", 0.346, 0.624],
    ["bad-wildbad", 0.188, 0.92],
    ["engelsbrand", 0.73, 0.423],
    ["pforzheim", 0.92, 0.08],
    ["calmbach", 0.326, 0.772],
    ["conweiler", 0.08, 0.494],
    ["schwann", 0.198, 0.47],
    ["graefenhausen", 0.654, 0.37],
    ["feldrennach", 0.188, 0.323],
    ["langenbrand", 0.602, 0.606],
    ["salmbach", 0.474, 0.559],
  ],
  stuttgart: [
    ["bad-cannstatt", 0.624, 0.382],
    ["feuerbach", 0.339, 0.335],
    ["zuffenhausen", 0.391, 0.201],
    ["weilimdorf", 0.08, 0.295],
    ["botnang", 0.173, 0.53],
    ["killesberg", 0.391, 0.416],
    ["degerloch", 0.391, 0.786],
    ["untertuerkheim", 0.821, 0.55],
    ["stuttgart-vaihingen", 0.08, 0.886],
    ["stammheim", 0.313, 0.08],
    ["wangen", 0.78, 0.584],
    ["heslach", 0.339, 0.685],
    ["moehringen", 0.287, 0.92],
    ["sillenbuch", 0.599, 0.752],
    ["rotenberg", 0.92, 0.51],
    ["muenster", 0.65, 0.295],
  ],
} as const satisfies Record<string, readonly PlaceXY[]>;

export type MapRegion = keyof typeof MAP_PLACES;

/** Raster position (640×360) of a place, assuming the pack coordinates span the whole sheet. */
export function placePx(region: MapRegion, id: string, w = 640, h = 360): [number, number] | null {
  const e = (MAP_PLACES[region] as readonly PlaceXY[]).find((q) => q[0] === id);
  return e ? [Math.round(e[1] * w), Math.round(e[2] * h)] : null;
}
