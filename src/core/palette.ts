// Leitpalette (contract §10): 62 colours in twelve ramps, each from dark (0) to light. Use these names in code
// instead of raw hex so cards, UI, figures and items stay on-palette. public/palette.json carries the same values.

export const P = {
  // tinte — outlines, text on paper, the darkest shadows
  ink0: "#15110e", ink1: "#221a15", ink2: "#33271e", ink3: "#47372b", ink4: "#5f4a39", ink5: "#7b6350",
  // papier — atlas paper, cards, the Liste
  paper0: "#a8956c", paper1: "#c9b88a", paper2: "#e2d3a8", paper3: "#f1e6c6", paper4: "#fbf3dc",
  // holz — panelling, frames, tables
  wood0: "#3d2716", wood1: "#5a3a20", wood2: "#7d522b", wood3: "#a26f3c", wood4: "#c48f55", wood5: "#e0b27a",
  // bier — lamps, highlights, money
  beer0: "#a8680f", beer1: "#d38d1c", beer2: "#f2b135", beer3: "#ffd66e", beer4: "#fff0b8",
  // ziegel — roofs, red suits, warnings
  brick0: "#6a1f1b", brick1: "#962f22", brick2: "#c24b30", brick3: "#e0714a", brick4: "#f4a27a",
  // strasse — atlas roads
  road0: "#b3261e", road1: "#e23b2b", road2: "#f6c443", road3: "#fff7e0",
  // wald — forests, vineyards, success
  forest0: "#1c3a2a", forest1: "#2d5631", forest2: "#47773a", forest3: "#6f9d48", forest4: "#a3c46c", forest5: "#cfe0a0",
  // filz — the card table
  felt0: "#123526", felt1: "#1c4d35", felt2: "#2a6a47", felt3: "#3d8a5c", felt4: "#5fae7c",
  // enz — the river, sky, cool accents
  river0: "#1d3f5e", river1: "#2a5f85", river2: "#3f86ad", river3: "#6fb0cf", river4: "#a9d6e6", river5: "#dff1f5",
  // abend — evening light, shadows outdoors
  dusk0: "#382a45", dusk1: "#5a4168", dusk2: "#86628f", dusk3: "#b98fb5", dusk4: "#e9cfe0",
  // stein — streets, metal, chrome
  stone0: "#4f4b47", stone1: "#77726b", stone2: "#a39d94", stone3: "#cfcac2", stone4: "#f0eeea",
  // oliv — loden, uniforms, vine leaves
  olive0: "#4a4a22", olive1: "#6f7030", olive2: "#9a9a45", olive3: "#c4c06a",
} as const;

export type PaletteName = keyof typeof P;

/** Semantic colours. Text on dark wood uses `text*`; text on paper uses `ink*`. */
export const C = {
  bg: P.ink0,
  panel: P.wood1,
  panelDeep: P.wood0,
  frame: P.wood3,
  frameHi: P.wood5,
  frameLo: P.ink1,
  text: P.paper4,
  textDim: P.paper2,
  textFaint: P.paper0,
  title: P.beer3,
  ink: P.ink1,
  inkDim: P.ink4,
  inkFaint: P.ink5,
  accent: P.beer2,
  good: P.forest4,
  goodInk: P.forest1,
  warn: P.beer2,
  bad: P.brick3,
  badInk: P.brick1,
  money: P.beer3,
  fuel: P.brick3,
  felt: P.felt1,
  red: P.brick1,
  black: P.ink0,
} as const;

/** Region accents (map frame, plates, trophies). */
export const REGION_TINT: Record<string, { main: string; light: string; dark: string }> = {
  enztal: { main: P.river2, light: P.river4, dark: P.river0 },
  muehlacker: { main: P.olive2, light: P.olive3, dark: P.olive0 },
  schwarzwald: { main: P.forest2, light: P.forest4, dark: P.forest0 },
  stuttgart: { main: P.brick2, light: P.brick4, dark: P.brick0 },
};

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
