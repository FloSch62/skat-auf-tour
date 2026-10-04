// Playing styles of all 26 characters (contract §4.5, §5.3 "Charakter"). A style is a parameter set — sample counts,
// node budgets, how far ahead the figure calculates, bidding threshold, preferences for game kinds, error rate — never
// a hidden advantage: every figure sees only its SeatView. Weak figures calculate shallower and sometimes pick a
// plausible but worse card (never an absurd one); strong figures sample more worlds and see to the end.
// `AiRequest.depth` (difficulty) scales the thinking: more samples and a longer horizon, fewer slips.
import type { CharacterId } from "../../game/ids.ts";
import type { DeclKind } from "../rules/value.ts";
import { FULL_INFERENCE } from "./infer.ts";
import type { InferenceOptions } from "./infer.ts";
import type { PimcParams } from "./pimc.ts";

export interface BidStyle {
  /** Worlds (skat + other hands) per game kind when valuing a hand. */
  samples: number;
  /**
   * Win chance (as valued by the solver with slack, see bid.ts) a game needs before the figure bids it (0…1). Set per
   * strength in `bid()`; figures shift it with `shift` (positive = more careful).
   */
  threshold: number;
  /** Added to the threshold per kind (negative = likes it). */
  kindBias: Partial<Record<DeclKind, number>>;
  /** Chance to go one or more steps beyond the own limit ("überreizt sich gern"). */
  overbidChance: number;
  overbidSteps: number;
  /** Extra list points a Hand game must promise over picking up the skat (negative = likes Hand games). */
  handMargin: number;
  /** Win chance needed to announce Schneider in a Hand game. */
  schneiderAnnounce: number;
  /** Favourite kinds when choosing the game: list points added (Grand-Helmut loves Grand, Null-Eugen Null). */
  prefer?: Partial<Record<DeclKind, number>>;
  /** The favourite only counts for games with at least this chance (default 0.35; Null-Eugen also plays hopeless Nulls). */
  preferMinChance?: number;
}

export interface PlayStyle extends PimcParams {
  /** Probability of a plausible second-best card. */
  errorRate: number;
  /** How much worse (list points) such a slip may be. */
  errorTolerance: number;
}

export interface Persona {
  id: CharacterId;
  strength: 1 | 2 | 3 | 4;
  /** One line for docs and tools (the shown style sentence lives in src/data/characters.ts). */
  note: string;
  bid: BidStyle;
  /** Card play as declarer. */
  declarer: PlayStyle;
  /** Card play as defender (some figures defend better than they declare). */
  defender: PlayStyle;
  /** Card play in Ramsch. */
  ramsch: PlayStyle;
  discard: { samples: number; candidates: number; kinds: number; prefer?: Partial<Record<DeclKind, number>>; preferMinChance?: number };
  /**
   * Kontra when the declarer's win chance (solver with the valuation slack) is below this; Re when the declarer's own
   * chance is at least `re`. Kontra doubles and pays only when the declarer wins less than half the time — but measured
   * against real outcomes, a defender's estimate below 10 % still meant 67 % declarer wins (docs/notes-ai.md), so
   * Kontra is kept for hopeless-looking games (bold figures a little more often).
   */
  kontra: number;
  re: number;
  /** Schieberamsch: shove the skat on when the hand's Ramsch danger is at most this (0…1). */
  shove: number;
  /** Quirks of weak players: smear on the partner's card although the declarer can still take it. */
  smearEarly: number;
}

/** Node budget per decision (all worlds together) at depth 1, before scaling. ~26 M nodes/s in V8. */
const NODES = { 1: 1_500_000, 2: 6_000_000, 3: 9_000_000, 4: 12_000_000 } as const;

function play(strength: 1 | 2 | 3 | 4, over: Partial<PlayStyle> = {}): PlayStyle {
  const base: Record<1 | 2 | 3 | 4, PlayStyle> = {
    1: {
      samples: 6, pool: 1, inference: { bidding: false, declaration: false, trumpVoids: true }, nodesPerWorld: 0,
      exactTricks: 4, horizonTricks: 2, schneider: false, errorRate: 0.22, errorTolerance: 60,
    },
    2: {
      samples: 12, pool: 3, inference: FULL_INFERENCE, nodesPerWorld: 0, exactTricks: 6, horizonTricks: Infinity,
      schneider: true, errorRate: 0.05, errorTolerance: 25,
    },
    3: {
      samples: 16, pool: 4, inference: FULL_INFERENCE, nodesPerWorld: 0, exactTricks: 7, horizonTricks: Infinity,
      schneider: true, errorRate: 0.015, errorTolerance: 15,
    },
    4: {
      samples: 22, pool: 4, inference: FULL_INFERENCE, nodesPerWorld: 0, exactTricks: 7, horizonTricks: Infinity,
      schneider: true, errorRate: 0, errorTolerance: 0,
    },
  };
  const p = { ...base[strength], ...over };
  if (!over.nodesPerWorld) p.nodesPerWorld = Math.floor(NODES[strength] / p.samples);
  return p;
}

/** Bidding threshold of a solid figure; measured in docs/balance-skat.md (wins ≥ 75 % of declared games). */
export const BASE_THRESHOLD = 0.42;

function bid(strength: 1 | 2 | 3 | 4, over: Partial<BidStyle> & { shift?: number } = {}): BidStyle {
  const { shift = 0, ...rest } = over;
  const base: BidStyle = {
    samples: strength === 1 ? 8 : strength === 2 ? 12 : strength === 3 ? 16 : 20,
    threshold: (strength === 1 ? BASE_THRESHOLD - 0.04 : BASE_THRESHOLD) + shift,
    // The open-card solver plays every Null as if it were ouvert (the defenders see the declarer's cards), which is far
    // stricter than a plain Null: Null needs a lower solver chance.
    kindBias: { null: -0.15 },
    overbidChance: 0,
    overbidSteps: 0,
    handMargin: 25,
    schneiderAnnounce: 0.9,
  };
  return { ...base, ...rest };
}

function persona(
  id: CharacterId,
  strength: 1 | 2 | 3 | 4,
  note: string,
  o: {
    bid?: Partial<BidStyle> & { shift?: number };
    declarer?: Partial<PlayStyle>;
    defender?: Partial<PlayStyle>;
    kontra?: number;
    re?: number;
    shove?: number;
    smearEarly?: number;
    discard?: Partial<Persona["discard"]>;
  } = {},
): Persona {
  const discardBase = {
    samples: strength === 1 ? 4 : strength === 2 ? 10 : 12,
    candidates: strength === 1 ? 1 : 3,
    kinds: strength === 1 ? 1 : 2,
  };
  return {
    id,
    strength,
    note,
    bid: bid(strength, o.bid),
    declarer: play(strength, o.declarer),
    defender: play(strength, o.defender ?? o.declarer),
    ramsch: play(strength, { ...(o.declarer ?? {}), schneider: false }),
    discard: { ...discardBase, ...o.discard, prefer: o.bid?.prefer, preferMinChance: o.bid?.preferMinChance },
    kontra: o.kontra ?? 0.01,
    re: o.re ?? 0.88,
    shove: o.shove ?? 0.35,
    smearEarly: o.smearEarly ?? 0,
  };
}

const FORGETFUL: InferenceOptions = { bidding: false, declaration: false, trumpVoids: false };

export const PERSONAS: Record<CharacterId, Persona> = {
  // ── Stammgäste ──
  maurer: persona("maurer", 2, "bids too cautiously, defends like a wall", {
    bid: { shift: 0.24 },
    defender: { samples: 18, pool: 4, errorRate: 0, exactTricks: 7 },
    kontra: 0.005,
  }),
  zocker: persona("zocker", 2, "bids everything and likes to overbid", {
    bid: { shift: -0.12, overbidChance: 0.35, overbidSteps: 2, handMargin: 10 },
    kontra: 0.04,
    re: 0.8,
  }),
  rechnerin: persona("rechnerin", 3, "counts every card, hardly any mistake", {
    declarer: { pool: 6, samples: 18, errorRate: 0 },
    bid: { shift: 0.03 },
  }),
  nullfuchs: persona("nullfuchs", 2, "looks for Null, even where there is none", {
    bid: { kindBias: { null: -0.32 }, prefer: { null: 140 }, preferMinChance: 0.05 },
  }),
  grandspieler: persona("grandspieler", 2, "plays Grand where others play a suit", {
    bid: { kindBias: { null: -0.15, grand: -0.24, diamonds: 0.05, hearts: 0.05, spades: 0.05, clubs: 0.05 }, prefer: { grand: 80 }, preferMinChance: 0.25 },
  }),
  neuling: persona("neuling", 1, "forgets to count trumps, smears at the wrong time", {
    declarer: { inference: FORGETFUL, errorRate: 0.25 },
    smearEarly: 0.5,
  }),
  schwaetzer: persona("schwaetzer", 1, "talks a lot, plays loosely", {
    bid: { shift: -0.04 },
  }),
  lehrer: persona("lehrer", 2, "by the book, predictable", {
    bid: { shift: 0.06, handMargin: 40 },
    declarer: { errorRate: 0 },
    kontra: 0.005,
  }),
  schlitzohr: persona("schlitzohr", 3, "cuts riskily and sets traps", {
    bid: { shift: -0.02, handMargin: 5, schneiderAnnounce: 0.8 },
    kontra: 0.03,
    re: 0.82,
  }),
  kommandant: persona("kommandant", 2, "fast and aggressive", {
    bid: { shift: -0.06, samples: 10, handMargin: 15 },
    declarer: { samples: 8 },
    kontra: 0.03,
  }),
  wirtin: persona("wirtin", 2, "solid", {}),
  altmeister: persona("altmeister", 4, "old tournament winner, reads the game", {
    declarer: { samples: 24, pool: 5 },
  }),

  // ── Favoriten (Preisskat) ──
  wengerter: persona("wengerter", 3, "safe and tough", { bid: { shift: 0.06 } }),
  muellerin: persona("muellerin", 4, "calculates steadily", {}),
  bahner: persona("bahner", 3, "bids exactly to the edge", { bid: { shift: 0 } }),
  klosterwirt: persona("klosterwirt", 4, "patient, strikes in the last trick", { declarer: { samples: 24 } }),
  floesser: persona("floesser", 3, "dares a lot", { bid: { shift: -0.05, handMargin: 10 } }),
  brenner: persona("brenner", 4, "clear play, wastes nothing", {}),
  wasenwirt: persona("wasenwirt", 3, "loud but calculating", { bid: { shift: -0.02 } }),
  schaffnerin: persona("schaffnerin", 4, "no trick rides for free", { defender: { samples: 26, pool: 5 } }),

  // ── Nebenfiguren ──
  wachtmeister: persona("wachtmeister", 2, "controlled", { bid: { shift: 0.08 } }),
  anwaerter: persona("anwaerter", 1, "still learning", {}),
  "biker-manne": persona("biker-manne", 2, "full throttle: bids high, plays fast", {
    bid: { shift: -0.07, overbidChance: 0.15, overbidSteps: 1 },
    declarer: { samples: 9 },
  }),
  "biker-uschi": persona("biker-uschi", 3, "cool, rarely loses", {}),
  meister: persona("meister", 2, "has seen it all", {}),
  lehrling: persona("lehrling", 1, "breaks things", { declarer: { errorRate: 0.28 } }),
  // The vain mayor: thinks he is the best player in the district — bids like der Erwin and loves Grand, but plays
  // pompous-solid (a normal medium figure at the table).
  schultes: persona("schultes", 2, "vain mayor: overbids, loves Grand, plays solidly", {
    bid: { shift: -0.1, overbidChance: 0.25, overbidSteps: 1, handMargin: 15, kindBias: { null: -0.15, grand: -0.12 }, prefer: { grand: 20 } },
  }),
  // His sly clerk: looks simple, counts every card and sets traps — close to 's Schlitzohr Fritz.
  amtsbote: persona("amtsbote", 3, "sly clerk: counts every card, sets traps", {
    bid: { shift: -0.02, handMargin: 5, schneiderAnnounce: 0.8 },
    declarer: { pool: 5, errorRate: 0 },
    kontra: 0.03,
    re: 0.82,
  }),
};

/** A figure that is not in the table (tools, tests): solid medium. */
export const DEFAULT_PERSONA: Persona = PERSONAS.wirtin;

export function personaFor(id: CharacterId | string): Persona {
  return (PERSONAS as Record<string, Persona>)[id] ?? DEFAULT_PERSONA;
}

/** Apply the difficulty's thinking depth (1 = as the persona says). */
export function scalePlay(p: PlayStyle, depth: number): PlayStyle {
  if (depth === 1) return p;
  const d = Math.max(0.3, Math.min(2, depth));
  const samples = Math.max(3, Math.round(p.samples * d));
  return {
    ...p,
    samples,
    nodesPerWorld: Math.floor((p.nodesPerWorld * p.samples * Math.min(d, 1.5)) / samples),
    horizonTricks: Number.isFinite(p.horizonTricks) ? Math.max(1, Math.round(p.horizonTricks * d)) : Infinity,
    exactTricks: Math.max(3, Math.min(8, Math.round(p.exactTricks * (d > 1 ? 1 : d)))),
    // Below depth 1 (Gemütlich) even the strong figures slip now and then: a plausible but worse card, within a
    // tolerance in utility — never an absurd one. Thinking less alone barely weakens them (docs/balance-tour.md).
    errorRate: Math.min(0.5, p.errorRate / d + (d < 1 ? (1 - d) * 0.5 : 0)),
    errorTolerance: d < 1 ? Math.max(p.errorTolerance, Math.round((1 - d) * 90)) : p.errorTolerance,
  };
}

export function scaleBid(b: BidStyle, depth: number): BidStyle {
  if (depth === 1) return b;
  const d = Math.max(0.3, Math.min(2, depth));
  return { ...b, samples: Math.max(4, Math.round(b.samples * d)) };
}
