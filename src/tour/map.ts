// Stage map generator (contract §4.2). Seven columns: 0 the start, 6 the Preisskat, 1–5 with two or three stations.
// Roads only lead forward to neighbouring rows (no crossings). Guarantees, checked by validateStage and by tests over
// thousands of seeds:
//   · every road path has at least two inns and at most three (two in stage 3, which ends with the nine-game final):
//     session length, contract §1: 35–50 minutes;
//   · from every road path a pitch is one step away in column 3 or 4;
//   · at most one dog meadow and one bikers' meeting per stage;
//   · never the same puzzle kind (problem, chess, sudoku) twice in a row on a road;
//   · column 1 is always an inn without house rule ("standard");
//   · no character sits in inns of two different columns (so the player never meets anyone twice in a stage);
//   · real places of the region, sorted along the travel direction, each at most once per stage when possible;
//   · `event` stations carry pre-rolled, distinct events;
//   · the Schultes and his Amtsbote sit together at one inn in one stage of most tours (never column 1).
// Pure module.
import { Rng, hashString } from "../core/rng.ts";
import type { EventDef, InnSetup, MapNode, PlaceDef, PlacePack, Profile, RegionDef, StageMap } from "../game/types.ts";
import type { CharacterId, DifficultyId, DogId, HouseRuleId, RegionId, StakesId, StationKind, VehicleId } from "../game/ids.ts";
import { FAVOURITES_BY_REGION, REGULARS } from "../game/ids.ts";
import { CHARACTER_DEFS } from "../data/characters.ts";
import { DIFFICULTY_DEFS } from "../data/difficulty.ts";
import { HOUSE_RULE_WEIGHTS } from "../data/houseRules.ts";
import { INN_ROOM_IDS, INN_ROOM_WEIGHTS, RATHAUS_NAMES, rollInnName, type InnRoomId } from "../data/inns.ts";
import { prerollEvent } from "./events.ts";
import { findRegion } from "./util.ts";

// ─── layout (960×540 map screen: top HUD above MAP_TOP, the "Was jetzt?" bar below MAP_BOTTOM) ──────────────

export const MAP_LAYOUT = {
  w: 960,
  h: 540,
  left: 72,
  right: 888,
  /** Node centres stay between top and bottom (icons ~56 high plus a name line below; HUD above 64, bar below 476). */
  top: 110,
  bottom: 400,
  jitterX: 12,
  jitterY: 14,
} as const;

export const COLUMNS = 7;
export const FINAL_COL = 6;
export const PUZZLE_KINDS: readonly StationKind[] = ["problem", "chess", "sudoku"];

// ─── tunables (balance runs may change them) ──────────────────────────────────────────────────────────────

export const MAP_CONFIG = {
  /** Chance that a column 1–5 has three stations instead of two. */
  threeChance: 0.55,
  /** Kind weights for columns 2–5 (dog meadow and bikers are placed separately). */
  kindWeights: { inn: 30, event: 16, problem: 9, chess: 8, sudoku: 9, market: 9, garage: 7, pitch: 9 } as Partial<Record<StationKind, number>>,
  /** A kind next to a predecessor of the same shop/pitch kind gets this weight factor (puzzles: 0). */
  repeatFactor: 0.15,
  /** A kind already in the same column gets this factor (variety). */
  sameColumnFactor: 0.5,
  /** At most this many inns on any road path, by stage (keeps a stage inside 35–50 minutes). */
  maxInnsPerPath: [3, 3, 2] as readonly number[],
  dogsChance: 0.7,
  bikersChance: 0.55,
  /** Columns allowed for the dog meadow and the bikers' meeting. */
  dogsCols: [2, 3, 4] as readonly number[],
  bikersCols: [3, 4, 5] as readonly number[],
  /** Stakes by column (col 1 is always small). */
  stakes: {
    2: { small: 60, medium: 40, high: 0 },
    3: { small: 40, medium: 45, high: 15 },
    4: { small: 30, medium: 45, high: 25 },
    5: { small: 30, medium: 40, high: 30 },
  } as Record<number, Record<StakesId, number>>,
  /** Later stages raise the stakes: an inn in column c of stage s uses the stakes row of column c + s × this. */
  stakesStageShift: 1,
  /** Share of tours in which the Schultes and his Amtsbote sit together at one inn (in one stage, not column 1). */
  duoChance: 0.85,
  /** Diagonal (straight-on) step weight against branching steps when building the roads. */
  diagonal: 0.8,
};

/** Who can sit at an inn table: the twelve regulars and the two village policemen (contract §4.5). */
export const INN_POOL: readonly CharacterId[] = [...REGULARS, "wachtmeister", "anwaerter"];
/** Fills in when the pool is used up ("springt ein, wenn einer fehlt"). */
export const STAND_IN: CharacterId = "wirtin";
/** The vain mayor and his sly clerk always sit together (contract §4.5). */
export const DUO: [CharacterId, CharacterId] = ["schultes", "amtsbote"];

/** Does this stage of the tour seat the duo? One stage per tour at most, chosen by the tour seed. */
export function duoStage(seed: number, stage: number): boolean {
  const h = hashString(`${seed}|duo`);
  return h % 3 === stage && (h >>> 8) % 1000 < MAP_CONFIG.duoChance * 1000;
}

export function isDuoInn(n: Pick<MapNode, "inn">): boolean {
  return !!n.inn && n.inn.opponents.includes("schultes");
}

// ─── options ──────────────────────────────────────────────────────────────────────────────────────────────

export interface StageOptions {
  pack: PlacePack;
  region: RegionId;
  /** 0, 1, 2 */
  stage: number;
  /** The tour seed (the stage seed is derived). */
  seed: number;
  difficulty: DifficultyId;
  /** Place id of the start (stage 0: home). Default: the first place along the travel direction. */
  startPlace?: string;
  /** For pre-rolling `event` stations; without events the station picks on arrival. */
  events?: readonly EventDef[];
  profile?: Profile;
  vehicle?: VehicleId;
  dogs?: readonly DogId[];
  /** Events seen in this tour, and `once` events seen in earlier tours. */
  seenEvents?: readonly string[];
  onceEvents?: readonly string[];
  /** Dogs unlocked in the Tourenbuch (events with `dogLocked` skip unlocked dogs). */
  unlockedDogs?: readonly DogId[];
}

// ─── graph helpers ────────────────────────────────────────────────────────────────────────────────────────

export function column(map: Pick<StageMap, "nodes">, col: number): MapNode[] {
  return map.nodes.filter((n) => n.col === col).sort((a, b) => a.row - b.row);
}

export function successors(map: Pick<StageMap, "nodes">, n: MapNode): MapNode[] {
  return n.next.map((id) => map.nodes.find((m) => m.id === id)!).filter(Boolean);
}

export function predecessors(map: Pick<StageMap, "nodes">, n: MapNode): MapNode[] {
  return map.nodes.filter((m) => m.next.includes(n.id));
}

export function startNode(map: Pick<StageMap, "nodes">): MapNode {
  return map.nodes.find((n) => n.col === 0)!;
}

export function finalNode(map: Pick<StageMap, "nodes">): MapNode {
  return map.nodes.reduce((a, b) => (b.col > a.col ? b : a));
}

/** Relative vertical position of a row in a column of n stations. */
function rowPos(row: number, n: number): number {
  return (row + 0.5) / n;
}

/** Roads between two columns: a random monotone staircase (never crossing), only to neighbouring rows. */
function connect(n1: number, n2: number, rng: Rng): [number, number][] {
  const ok = (i: number, j: number) => Math.abs(rowPos(i, n1) - rowPos(j, n2)) <= 0.5 + 1e-9;
  for (let attempt = 0; attempt < 40; attempt++) {
    let i = 0;
    let j = 0;
    const out: [number, number][] = [[0, 0]];
    while (i < n1 - 1 || j < n2 - 1) {
      const moves: [number, number, number][] = [];
      if (i < n1 - 1 && j < n2 - 1 && ok(i + 1, j + 1)) moves.push([1, 1, MAP_CONFIG.diagonal]);
      if (i < n1 - 1 && ok(i + 1, j)) moves.push([1, 0, 1]);
      if (j < n2 - 1 && ok(i, j + 1)) moves.push([0, 1, 1]);
      if (!moves.length) break;
      const m = rng.weighted(moves, (x) => x[2]);
      i += m[0];
      j += m[1];
      out.push([i, j]);
    }
    if (i === n1 - 1 && j === n2 - 1) return out;
  }
  // Fallback (never needed in practice): straight lines plus the last row.
  const out: [number, number][] = [];
  for (let i = 0; i < Math.max(n1, n2); i++) out.push([Math.min(i, n1 - 1), Math.min(i, n2 - 1)]);
  return out;
}

/** The fewest inns on any road path from each node to the Preisskat (inclusive). */
export function minInnsToEnd(map: Pick<StageMap, "nodes">): Map<string, number> {
  const memo = new Map<string, number>();
  const cols = [...new Set(map.nodes.map((n) => n.col))].sort((a, b) => b - a);
  for (const c of cols) {
    for (const n of column(map, c)) {
      const own = n.kind === "inn" ? 1 : 0;
      const nexts = n.next.map((id) => memo.get(id) ?? 0);
      memo.set(n.id, own + (nexts.length ? Math.min(...nexts) : 0));
    }
  }
  return memo;
}

/** The most inns on any road path from each node to the Preisskat (inclusive). */
export function maxInnsToEnd(map: Pick<StageMap, "nodes">): Map<string, number> {
  const memo = new Map<string, number>();
  const cols = [...new Set(map.nodes.map((n) => n.col))].sort((a, b) => b - a);
  for (const c of cols) {
    for (const n of column(map, c)) {
      const own = n.kind === "inn" ? 1 : 0;
      const nexts = n.next.map((id) => memo.get(id) ?? 0);
      memo.set(n.id, own + (nexts.length ? Math.max(...nexts) : 0));
    }
  }
  return memo;
}

/** Road edges col 2 → col 3 from which no pitch is one step away at column 3 or 4 (the pitch guarantee). */
export function pitchFailures(map: Pick<StageMap, "nodes">): [MapNode, MapNode][] {
  const out: [MapNode, MapNode][] = [];
  for (const u of column(map, 2)) {
    const s3 = successors(map, u);
    const uOk = s3.some((w) => w.kind === "pitch");
    for (const w of s3) {
      if (uOk) continue;
      if (!successors(map, w).some((x) => x.col === 4 && x.kind === "pitch")) out.push([u, w]);
    }
  }
  return out;
}

// ─── validation ───────────────────────────────────────────────────────────────────────────────────────────

/** Every violated guarantee as a short English line (empty = valid). */
export function validateStage(map: StageMap, opts: { tutorial?: boolean; region?: RegionDef } = {}): string[] {
  const errs: string[] = [];
  const nodes = map.nodes;
  const ids = new Set(nodes.map((n) => n.id));
  if (ids.size !== nodes.length) errs.push("duplicate node ids");
  const last = Math.max(...nodes.map((n) => n.col));
  for (const n of nodes) {
    for (const id of n.next) {
      const m = nodes.find((x) => x.id === id);
      if (!m) errs.push(`${n.id}: road to unknown ${id}`);
      else if (m.col !== n.col + 1) errs.push(`${n.id}: road skips columns`);
      else {
        const a = column(map, n.col).length;
        const b = column(map, m.col).length;
        if (Math.abs(rowPos(n.row, a) - rowPos(m.row, b)) > 0.5 + 1e-9) errs.push(`${n.id}→${m.id}: not neighbouring rows`);
      }
    }
    if (n.col < last && !n.next.length) errs.push(`${n.id}: dead end`);
    if (n.col > 0 && !predecessors(map, n).length) errs.push(`${n.id}: unreachable`);
    if (n.x < 0 || n.x > MAP_LAYOUT.w || n.y < MAP_LAYOUT.top - MAP_LAYOUT.jitterY - 30 || n.y > MAP_LAYOUT.bottom + MAP_LAYOUT.jitterY + 30) {
      errs.push(`${n.id}: position out of the map area`);
    }
    if ((n.kind === "inn") !== !!n.inn) errs.push(`${n.id}: inn setup mismatch`);
    if (n.inn && n.inn.opponents[0] === n.inn.opponents[1]) errs.push(`${n.id}: same opponent twice`);
  }
  // Crossing roads between two columns.
  for (let c = 0; c < last; c++) {
    const edges: [number, number][] = [];
    for (const n of column(map, c)) for (const m of successors(map, n)) edges.push([n.row, m.row]);
    for (const [a, b] of edges) for (const [c2, d] of edges) if (a < c2 && b > d) errs.push(`column ${c}: roads cross`);
  }
  if (opts.tutorial) return errs;

  if (last !== FINAL_COL) errs.push("not seven columns");
  if (column(map, 0).length !== 1 || column(map, 0)[0].kind !== "start") errs.push("column 0 is not one start");
  const fin = column(map, FINAL_COL);
  if (fin.length !== 1 || fin[0].kind !== "tournament") errs.push("column 6 is not one Preisskat");
  for (let c = 1; c <= 5; c++) {
    const k = column(map, c).length;
    if (k < 2 || k > 3) errs.push(`column ${c} has ${k} stations`);
  }
  for (const n of column(map, 1)) {
    if (n.kind !== "inn") errs.push(`${n.id}: column 1 is not an inn`);
    else if (n.inn?.houseRule !== "standard") errs.push(`${n.id}: column 1 inn has a house rule`);
  }
  const minInns = minInnsToEnd(map).get(startNode(map).id) ?? 0;
  if (minInns < 2) errs.push(`a path has only ${minInns} inns`);
  const maxInns = maxInnsToEnd(map).get(startNode(map).id) ?? 0;
  if (maxInns > maxInnsFor(stageOf(map))) errs.push(`a path has ${maxInns} inns`);
  if (pitchFailures(map).length) errs.push("a path has no pitch in reach at column 3 or 4");
  if (nodes.filter((n) => n.kind === "dogs").length > 1) errs.push("more than one dog meadow");
  if (nodes.filter((n) => n.kind === "bikers").length > 1) errs.push("more than one bikers' meeting");
  for (const n of nodes) {
    if (PUZZLE_KINDS.includes(n.kind)) for (const m of successors(map, n)) if (m.kind === n.kind) errs.push(`${n.id}→${m.id}: ${n.kind} twice in a row`);
    if (["start", "tournament"].includes(n.kind) !== (n.col === 0 || n.col === FINAL_COL)) errs.push(`${n.id}: misplaced ${n.kind}`);
  }
  // No character in inns of two different columns.
  const seenIn = new Map<CharacterId, number>();
  for (const n of nodes) if (n.inn) for (const ch of n.inn.opponents) {
    const c = seenIn.get(ch);
    if (c !== undefined && c !== n.col) errs.push(`${ch} sits in columns ${c} and ${n.col}`);
    seenIn.set(ch, n.col);
  }
  const events = nodes.filter((n) => n.event).map((n) => n.event!);
  if (new Set(events).size !== events.length) errs.push("an event is pre-rolled twice");
  if (opts.region) {
    const placeIds = new Set(opts.region.places.map((p) => p.id));
    for (const n of nodes) if (!placeIds.has(n.place)) errs.push(`${n.id}: place ${n.place} not in region`);
    if (fin[0] && fin[0].place !== opts.region.tournament) errs.push("Preisskat not at the region's tournament place");
    const mid = nodes.filter((n) => n.col >= 1 && n.col <= 5).map((n) => n.place);
    const avail = opts.region.places.length - 2;
    if (mid.length <= avail && new Set(mid).size !== mid.length) errs.push("a place is used twice although enough places exist");
  }
  return errs;
}

// ─── places ───────────────────────────────────────────────────────────────────────────────────────────────

function along(region: RegionDef, p: PlaceDef): number {
  switch (region.direction) {
    case "east": return p.x;
    case "west": return -p.x;
    case "south": return p.y;
    case "north": return -p.y;
  }
}

/** Screen top-to-bottom order inside a column. */
function across(region: RegionDef, p: PlaceDef): number {
  return region.direction === "east" || region.direction === "west" ? p.y : p.x;
}

/** The first place along the travel direction (start of stages 2 and 3), never the Preisskat place. */
export function entryPlace(region: RegionDef): string {
  const cands = region.places.filter((p) => p.id !== region.tournament);
  if (!cands.length) return region.tournament;
  return cands.reduce((a, b) => (along(region, b) < along(region, a) ? b : a)).id;
}

/** Places for the stations of columns 1–5, sorted along the travel direction (one list per column). */
function placesForColumns(region: RegionDef, start: string, counts: number[], rng: Rng): string[][] {
  const total = counts.reduce((a, b) => a + b, 0);
  let cands = region.places.filter((p) => p.id !== start && p.id !== region.tournament);
  if (!cands.length) cands = region.places.slice();
  cands = cands.slice().sort((a, b) => along(region, a) - along(region, b));
  // Too many places: drop random ones (order stays). Too few: repeat random ones next to themselves.
  while (cands.length > total) cands.splice(rng.int(0, cands.length - 1), 1);
  while (cands.length < total) {
    const i = rng.int(0, cands.length - 1);
    cands.splice(i, 0, cands[i]);
  }
  const out: string[][] = [];
  let k = 0;
  for (const n of counts) {
    const col = cands.slice(k, k + n).sort((a, b) => across(region, a) - across(region, b));
    out.push(col.map((p) => p.id));
    k += n;
  }
  return out;
}

// ─── inns ─────────────────────────────────────────────────────────────────────────────────────────────────

function drawCharacter(rng: Rng, mix: readonly number[], excluded: (id: CharacterId) => boolean): CharacterId | null {
  const tiers = [1, 2, 3, 4].map((s) => INN_POOL.filter((id) => CHARACTER_DEFS[id].strength === s && !excluded(id)));
  const weights = tiers.map((t, i) => (t.length ? mix[i] : 0));
  if (weights.every((w) => w <= 0)) {
    const all = tiers.flat();
    return all.length ? rng.pick(all) : null;
  }
  const tier = rng.weighted([0, 1, 2, 3], (i) => weights[i]);
  return rng.pick(tiers[tier]);
}

/**
 * Two opponents by the difficulty's strength mix. Nobody sits in inns of two different columns; inside one column a
 * repeat is allowed only when the pool is used up (those inns are never on the same road path).
 */
function drawOpponents(rng: Rng, mix: readonly number[], col: number, colOf: Map<CharacterId, number>): [CharacterId, CharacterId] {
  const pair: CharacterId[] = [];
  for (let k = 0; k < 2; k++) {
    const inPair = (id: CharacterId) => pair.includes(id);
    const otherCol = (id: CharacterId) => colOf.has(id) && colOf.get(id) !== col;
    let ch =
      drawCharacter(rng, mix, (id) => inPair(id) || colOf.has(id)) ??
      drawCharacter(rng, mix, (id) => inPair(id) || otherCol(id));
    if (!ch) ch = !inPair(STAND_IN) && !otherCol(STAND_IN) ? STAND_IN : null;
    if (!ch) ch = INN_POOL.find((id) => !inPair(id) && !otherCol(id)) ?? INN_POOL.find((id) => !inPair(id))!;
    pair.push(ch);
  }
  for (const id of pair) if (!colOf.has(id)) colOf.set(id, col);
  return [pair[0], pair[1]];
}

function rollInn(rng: Rng, col: number, stage: number, names: Set<string>, colOf: Map<CharacterId, number>, difficulty: DifficultyId): InnSetup {
  const room: InnRoomId = rng.weighted(INN_ROOM_IDS, (r) => INN_ROOM_WEIGHTS[r]);
  const name = rollInnName(rng, room, names);
  const rules = Object.keys(HOUSE_RULE_WEIGHTS) as HouseRuleId[];
  const houseRule: HouseRuleId = col === 1 ? "standard" : rng.weighted(rules, (r) => HOUSE_RULE_WEIGHTS[r]);
  const sw = MAP_CONFIG.stakes[Math.min(5, col + Math.round(stage * MAP_CONFIG.stakesStageShift))];
  const stakes: StakesId = col === 1 || !sw ? "small" : rng.weighted(["small", "medium", "high"] as StakesId[], (s) => sw[s]);
  const opponents = drawOpponents(rng, DIFFICULTY_DEFS[difficulty].mix, col, colOf);
  return { name, houseRule, opponents, stakes, room };
}

// ─── kinds ────────────────────────────────────────────────────────────────────────────────────────────────

/** The stage a map belongs to (from its node ids "<stage>-<col>-<row>"). */
export function stageOf(map: Pick<StageMap, "nodes">): number {
  const s = Number(map.nodes[0]?.id.split("-")[0]);
  return Number.isFinite(s) ? s : 0;
}

export function maxInnsFor(stage: number): number {
  const m = MAP_CONFIG.maxInnsPerPath;
  return m[Math.min(stage, m.length - 1)];
}

function assignKinds(map: StageMap, rng: Rng): boolean {
  const maxInns = maxInnsFor(stageOf(map));
  for (const n of map.nodes) {
    if (n.col === 0) n.kind = "start";
    else if (n.col === FINAL_COL) n.kind = "tournament";
    else if (n.col === 1) n.kind = "inn";
  }
  const base = MAP_CONFIG.kindWeights;
  for (let c = 2; c <= 5; c++) {
    const inCol: StationKind[] = [];
    for (const n of column(map, c)) {
      const w: Partial<Record<StationKind, number>> = { ...base };
      for (const p of predecessors(map, n)) {
        if (PUZZLE_KINDS.includes(p.kind)) w[p.kind] = 0;
        else if (p.kind === "pitch" || p.kind === "market" || p.kind === "garage") w[p.kind] = (w[p.kind] ?? 0) * MAP_CONFIG.repeatFactor;
      }
      for (const k of inCol) if (k !== "inn") w[k] = (w[k] ?? 0) * MAP_CONFIG.sameColumnFactor;
      const kinds = (Object.keys(w) as StationKind[]).filter((k) => (w[k] ?? 0) > 0);
      n.kind = rng.weighted(kinds, (k) => w[k] ?? 0);
      inCol.push(n.kind);
    }
  }
  // Pitch guarantee: turn a station next to a failing road into a pitch (prefer non-inns).
  for (let guard = 0; guard < 12; guard++) {
    const fails = pitchFailures(map);
    if (!fails.length) break;
    const [u, w] = rng.pick(fails);
    const cands = [...successors(map, u), ...successors(map, w)].filter((x) => x.col === 3 || x.col === 4);
    const nonInn = cands.filter((x) => x.kind !== "inn");
    const pick = rng.pick(nonInn.length ? nonInn : cands);
    pick.kind = "pitch";
  }
  if (pitchFailures(map).length) return false;
  // Inn guarantee: on the path with the fewest inns, turn a non-inn (never a pitch) into an inn.
  for (let guard = 0; guard < 12; guard++) {
    const memo = minInnsToEnd(map);
    const start = startNode(map);
    if ((memo.get(start.id) ?? 0) >= 2) break;
    const path: MapNode[] = [];
    let cur = start;
    while (cur.next.length) {
      const nexts = successors(map, cur);
      const best = Math.min(...nexts.map((x) => memo.get(x.id) ?? 0));
      cur = rng.pick(nexts.filter((x) => (memo.get(x.id) ?? 0) === best));
      path.push(cur);
    }
    const cands = path.filter((x) => x.col >= 2 && x.col <= 5 && x.kind !== "inn" && x.kind !== "pitch");
    if (!cands.length) return false;
    rng.pick(cands).kind = "inn";
  }
  if ((minInnsToEnd(map).get(startNode(map).id) ?? 0) < 2) return false;
  // At most maxInns inns on any path: on the path with the most, turn an inn into something else (never below
  // two inns on any path, never a puzzle next to the same puzzle).
  for (let guard = 0; guard < 12; guard++) {
    const most = maxInnsToEnd(map);
    const start = startNode(map);
    if ((most.get(start.id) ?? 0) <= maxInns) break;
    const path: MapNode[] = [];
    let cur = start;
    while (cur.next.length) {
      const nexts = successors(map, cur);
      const best = Math.max(...nexts.map((x) => most.get(x.id) ?? 0));
      cur = rng.pick(nexts.filter((x) => (most.get(x.id) ?? 0) === best));
      path.push(cur);
    }
    const cands = rng.shuffle(path.filter((x) => x.col >= 2 && x.col <= 5 && x.kind === "inn"));
    let changed = false;
    for (const n of cands) {
      const near = [...predecessors(map, n), ...successors(map, n)].map((x) => x.kind);
      const kinds = (Object.keys(MAP_CONFIG.kindWeights) as StationKind[]).filter((k) => k !== "inn" && k !== "pitch" && !(PUZZLE_KINDS.includes(k) && near.includes(k)));
      n.kind = rng.weighted(kinds, (k) => MAP_CONFIG.kindWeights[k] ?? 0);
      if ((minInnsToEnd(map).get(start.id) ?? 0) >= 2) {
        changed = true;
        break;
      }
      n.kind = "inn";
    }
    if (!changed) return false;
  }
  if ((maxInnsToEnd(map).get(startNode(map).id) ?? 0) > maxInns) return false;
  // One dog meadow and one bikers' meeting at most, never replacing an inn or a pitch.
  const place = (kind: "dogs" | "bikers", cols: readonly number[], chance: number) => {
    if (!rng.chance(chance)) return;
    const cands = map.nodes.filter((n) => cols.includes(n.col) && !["inn", "pitch", "dogs", "bikers"].includes(n.kind));
    if (cands.length) rng.pick(cands).kind = kind;
  };
  place("dogs", MAP_CONFIG.dogsCols, MAP_CONFIG.dogsChance);
  place("bikers", MAP_CONFIG.bikersCols, MAP_CONFIG.bikersChance);
  return true;
}

// ─── layout ───────────────────────────────────────────────────────────────────────────────────────────────

function layout(map: StageMap, rng: Rng, cols = COLUMNS) {
  const L = MAP_LAYOUT;
  const step = (L.right - L.left) / (cols - 1);
  for (const n of map.nodes) {
    const k = column(map, n.col).length;
    const edge = n.col === 0 || n.col === cols - 1;
    const jx = edge ? 0 : rng.int(-L.jitterX, L.jitterX);
    const jy = rng.int(-L.jitterY, L.jitterY);
    n.x = Math.round(L.left + n.col * step + jx);
    n.y = Math.round(L.top + rowPos(n.row, k) * (L.bottom - L.top) + jy);
  }
}

// ─── the generator ────────────────────────────────────────────────────────────────────────────────────────

function nodeId(stage: number | string, col: number, row: number): string {
  return `${stage}-${col}-${row}`;
}

function skeleton(stage: number, counts: number[], rng: Rng): StageMap {
  const nodes: MapNode[] = [];
  counts.forEach((k, col) => {
    for (let row = 0; row < k; row++) nodes.push({ id: nodeId(stage, col, row), col, row, kind: "event", place: "", x: 0, y: 0, next: [] });
  });
  const map: StageMap = { region: "enztal", seed: 0, nodes };
  for (let c = 0; c < counts.length - 1; c++) {
    const from = column(map, c);
    const to = column(map, c + 1);
    let pairs: [number, number][];
    if (from.length === 1) pairs = to.map((_, j) => [0, j]);
    else if (to.length === 1) pairs = from.map((_, i) => [i, 0]);
    else pairs = connect(from.length, to.length, rng);
    for (const [i, j] of pairs) if (!from[i].next.includes(to[j].id)) from[i].next.push(to[j].id);
  }
  return map;
}

function tryGenerate(o: StageOptions, region: RegionDef, start: string, rng: Rng): StageMap | null {
  const avail = Math.max(10, region.places.filter((p) => p.id !== start && p.id !== region.tournament).length);
  const counts = [1];
  for (let c = 1; c <= 5; c++) counts.push(rng.chance(MAP_CONFIG.threeChance) ? 3 : 2);
  counts.push(1);
  while (counts.slice(1, 6).reduce((a, b) => a + b, 0) > avail) {
    const threes = [1, 2, 3, 4, 5].filter((c) => counts[c] === 3);
    counts[rng.pick(threes)] = 2;
  }
  const map = skeleton(o.stage, counts, rng);
  map.region = o.region;
  if (!assignKinds(map, rng)) return null;

  // Places.
  const colPlaces = placesForColumns(region, start, counts.slice(1, 6), rng);
  for (const n of map.nodes) {
    if (n.col === 0) n.place = start;
    else if (n.col === FINAL_COL) n.place = region.tournament;
    else n.place = colPlaces[n.col - 1][n.row];
  }
  layout(map, rng);

  // Inns.
  const names = new Set<string>();
  const colOf = new Map<CharacterId, number>();
  for (let c = 1; c <= 5; c++) for (const n of column(map, c)) if (n.kind === "inn") n.inn = rollInn(rng, c, o.stage, names, colOf, o.difficulty);
  // The Schultes and his Amtsbote take over one inn of columns 2–5 (a town-hall cellar).
  if (duoStage(o.seed, o.stage)) {
    const cands = map.nodes.filter((n) => n.inn && n.col >= 2 && n.col <= 5);
    if (cands.length) {
      const n = rng.pick(cands);
      const name = RATHAUS_NAMES.find((x) => !names.has(x)) ?? n.inn!.name;
      names.add(name);
      n.inn = { ...n.inn!, opponents: [...DUO] as [CharacterId, CharacterId], room: rng.chance(0.5) ? "village" : "clubhouse", name };
    }
  }

  // Events.
  if (o.events?.length && o.profile) {
    const ctx = {
      region: o.region, profile: o.profile, vehicle: o.vehicle ?? "camper", dogs: o.dogs ?? [],
      seen: o.seenEvents ?? [], once: o.onceEvents ?? [], unlocked: o.unlockedDogs ?? [],
    } as const;
    const taken = new Set<string>();
    for (const n of map.nodes) if (n.kind === "event") {
      const id = prerollEvent(o.events, ctx, n.place, rng, taken);
      if (id) {
        n.event = id;
        taken.add(id);
      }
    }
  }
  return validateStage(map, { region }).length ? null : map;
}

/** The deterministic map of one stage of a tour. */
export function generateStage(o: StageOptions): StageMap {
  const region = findRegion(o.pack, o.region);
  if (!region) throw new Error(`unknown region ${o.region}`);
  const start = o.startPlace && region.places.some((p) => p.id === o.startPlace) ? o.startPlace : entryPlace(region);
  const seed = (o.seed ^ Math.imul(o.stage + 1, 0x9e3779b1) ^ hashRegion(o.region)) >>> 0;
  const base = new Rng(seed);
  for (let attempt = 0; attempt < 400; attempt++) {
    const m = tryGenerate(o, region, start, base.fork(`stage-${o.stage}-${attempt}`));
    if (m) {
      m.seed = seed;
      return m;
    }
  }
  throw new Error(`stage map generation failed (${o.region}, seed ${o.seed})`);
}

function hashRegion(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return h >>> 0;
}

// ─── the guided first trip (contract §4.1) ────────────────────────────────────────────────────────────────

/** Weak opponents for the tutorial inn. */
export const TUTORIAL_OPPONENTS: [CharacterId, CharacterId] = ["neuling", "schwaetzer"];

/** Start at home, then four fixed stations: a weak inn, the kiosk, the chess board, a pitch. */
export function generateTutorialMap(o: { pack: PlacePack; profile: Pick<Profile, "home">; region: RegionId; seed: number }): StageMap {
  const region = findRegion(o.pack, o.region);
  if (!region) throw new Error(`unknown region ${o.region}`);
  const rng = new Rng((o.seed ^ 0x7e57) >>> 0);
  const start = region.places.some((p) => p.id === o.profile.home) ? o.profile.home : entryPlace(region);
  const kinds: StationKind[] = ["start", "inn", "sudoku", "chess", "pitch"];
  const map = skeleton(0, kinds.map(() => 1), rng);
  map.nodes.forEach((n) => (n.id = nodeId("t", n.col, n.row)));
  map.nodes.forEach((n, i) => (n.next = i + 1 < map.nodes.length ? [map.nodes[i + 1].id] : []));
  map.region = o.region;
  const places = placesForColumns(region, start, [1, 1, 1, 1], rng);
  map.nodes.forEach((n, i) => {
    n.kind = kinds[i];
    n.place = i === 0 ? start : places[i - 1][0];
  });
  layout(map, rng, kinds.length);
  const inn = map.nodes[1];
  inn.inn = {
    name: rollInnName(rng, "village", new Set()),
    houseRule: "standard",
    opponents: TUTORIAL_OPPONENTS,
    stakes: "small",
    room: "village",
  };
  map.seed = o.seed;
  return map;
}

/** The favourites waiting at a region's Preisskat. */
export function favourites(region: RegionId): [CharacterId, CharacterId] {
  return FAVOURITES_BY_REGION[region];
}
