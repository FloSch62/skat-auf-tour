// Open-card solvers (contract §5.3 "Löser bei offenen Karten"). Pure TypeScript, no DOM, no clock.
//
// `PointSolver`: alpha-beta over single cards for suit games, Grand and Ramsch. One seat (the "solo" seat, i.e. the
// declarer) plays against the other two, who cooperate. The value is the number of card points (Augen) the solo seat
// still takes from now on, with best play from everybody. Because the outcome of a game (won with 61, Schneider with
// 90, the declarer Schneider with 30 or fewer) is a monotone function of these points, the exact point value answers
// every threshold question at once; `atLeast` answers a single one with a null window, which is cheaper.
//   - Transposition table at trick boundaries only, keyed by the cards still in the hands (the hands are fixed for one
//     search, so the remaining-card mask and the leader identify the position). Lower and upper bounds plus the best
//     card for move ordering; a generation counter clears it in O(1).
//   - Equivalent cards are collapsed: two cards of the same follow class in the same hand with no card between them
//     still in play (hands or the current trick) and the same Augen are interchangeable (e.g. Kreuz-Bube and Pik-Bube
//     once nothing lies between them, or Sieben, Acht and Neun of a suit).
//   - Move ordering: card from the table first, then winners for the side that profits, smearing (schmieren) on the
//     partner's trick, cheap discards otherwise.
//   - The last trick is evaluated directly.
//   - A node budget (never the clock) makes searches deterministic; an aborted search reports `aborted`.
//
// `TrickSolver`: the boolean solver for trick goals. Null: can the declarer avoid every trick? Schwarz/Durchmarsch:
// can the solo seat take every trick? Same table and equivalence ideas, Null uses its own card order.
import { CARD_POINTS, pointsOf } from "../rules/cards.ts";
import type { Card, CardMask } from "../rules/cards.ts";
import { playRules } from "../rules/play.ts";
import type { PlayKind, PlayRules } from "../rules/play.ts";

/** A play position for the solvers. Hands are the cards still held (by seat 0…2, play order 0 → 1 → 2). */
export interface SolvePosition {
  kind: PlayKind;
  hands: readonly CardMask[];
  /** Seat that led the current trick (or leads next when `trick` is empty). */
  leader: number;
  /** Cards already in the current trick, in play order (0…2 cards). */
  trick?: readonly Card[];
  /** The seat playing alone (declarer). In Ramsch: the seat whose points are counted. */
  solo: number;
}

/** Cards above `c` (higher bit index); 0 for the Kreuz-Bube. */
const ABOVE: Int32Array = (() => {
  const t = new Int32Array(32);
  for (let c = 0; c < 31; c++) t[c] = -1 << (c + 1);
  t[31] = 0;
  return t;
})();

const TT_BITS = 18;
const TT_SIZE = 1 << TT_BITS;
const TT_MASK = TT_SIZE - 1;

function hashKey(all: number, leader: number): number {
  let h = Math.imul(all ^ (leader * 0x5bd1e995), 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h & TT_MASK;
}

/** Shared transposition table storage (one per solver instance; reused across searches via a generation counter). */
class Table {
  readonly key = new Int32Array(TT_SIZE);
  /** generation * 4 + leader; 0 = empty. */
  readonly tag = new Int32Array(TT_SIZE);
  readonly lo = new Uint8Array(TT_SIZE);
  readonly hi = new Uint8Array(TT_SIZE);
  readonly best = new Int8Array(TT_SIZE);
  gen = 1;

  clear(): void {
    this.gen++;
    if (this.gen > 0x1fffffff) {
      this.tag.fill(0);
      this.gen = 1;
    }
  }
}

const MAX_MOVES = 12;

/**
 * Exact card-point solver for suit games, Grand and Ramsch (two against one). Create once and reuse: it owns a 0.5 M
 * entry table (~6 MB).
 */
export class PointSolver {
  /** Nodes visited since the last `reset()`. */
  nodes = 0;
  /** Abort after this many nodes (per search call made through `begin`). */
  nodeLimit = Infinity;
  aborted = false;

  private r: PlayRules = playRules("grand");
  private follow: Int32Array = this.r.follow;
  private order: Uint8Array = this.r.order;
  private classOf: Uint8Array = this.r.classOf;
  private readonly h = new Int32Array(3);
  /** 1 if the seat maximises the solo seat's points. */
  private readonly maxSeat = new Uint8Array(3);
  private solo = 0;
  private turn = 0;
  private leader = 0;
  /** Cards in the current trick and how many. */
  private t0 = -1;
  private t1 = -1;
  private tl = 0;
  private readonly tt = new Table();
  private readonly mv = new Int8Array(40 * MAX_MOVES);
  private readonly sc = new Int16Array(40 * MAX_MOVES);
  private limit = Infinity;
  /** Search depth in plies from the root; trick boundaries beyond it are estimated (weak players). */
  private horizon = Infinity;

  /**
   * Limit the search to `tricks` further tricks (Infinity = to the end). Beyond it the remaining Augen are split by a
   * rough card-strength estimate, which is how a weaker player "rechnet flacher".
   */
  setHorizon(tricks: number): void {
    this.horizon = Number.isFinite(tricks) ? Math.max(1, tricks) * 3 : Infinity;
  }

  /** Load a position. `maximize` false: the solo seat wants as few points as possible (Ramsch). */
  load(p: SolvePosition, maximize = true): void {
    if (p.kind === "null") throw new Error("PointSolver: use TrickSolver for Null");
    this.r = playRules(p.kind);
    this.follow = this.r.follow;
    this.order = this.r.order;
    this.classOf = this.r.classOf;
    this.h[0] = p.hands[0];
    this.h[1] = p.hands[1];
    this.h[2] = p.hands[2];
    this.solo = p.solo;
    for (let s = 0; s < 3; s++) this.maxSeat[s] = (s === p.solo) === maximize ? 1 : 0;
    const t = p.trick ?? [];
    this.tl = t.length;
    this.t0 = t.length > 0 ? t[0] : -1;
    this.t1 = t.length > 1 ? t[1] : -1;
    this.leader = p.leader;
    this.turn = (p.leader + t.length) % 3;
    this.tt.clear();
  }

  /** Forget the table (call between different worlds; `load` does it too). */
  clearTable(): void {
    this.tt.clear();
  }

  /** Points of the cards still in the hands and the current trick. */
  remaining(): number {
    let m = this.h[0] | this.h[1] | this.h[2];
    if (this.tl > 0) m |= 1 << this.t0;
    if (this.tl > 1) m |= 1 << this.t1;
    return pointsOf(m);
  }

  /** Seat to play in the loaded position. */
  get toMove(): number {
    return this.turn;
  }

  /** Exact future points of the solo seat (fail-soft within [alpha, beta]). */
  solve(alpha = -1, beta = 121, nodeLimit = Infinity): number {
    this.aborted = false;
    this.limit = this.nodes + nodeLimit;
    return this.search(alpha, beta, 0);
  }

  /** Does the solo seat take at least `t` more points with best play? (Null-window search.) */
  atLeast(t: number, nodeLimit = Infinity): boolean {
    this.aborted = false;
    this.limit = this.nodes + nodeLimit;
    return this.search(t - 1, t, 0) >= t;
  }

  /**
   * Exact value after each of the given first cards of the side to move (shared table, so the second and later cards
   * are cheap). `out[i]` receives the solo seat's future points including the trick in progress. Cards must be legal.
   * Returns false if the node budget ran out (values are then incomplete).
   */
  valuesAfter(cards: readonly Card[], out: Float64Array | number[], nodeLimit = Infinity, alpha = -1, beta = 121): boolean {
    this.aborted = false;
    this.limit = this.nodes + nodeLimit;
    for (let i = 0; i < cards.length; i++) {
      out[i] = this.playAndSearch(cards[i], alpha, beta);
      if (this.aborted) return false;
    }
    return true;
  }

  /** Null-window test after one first card: does the solo seat take at least `t` more points? null if aborted. */
  testAfter(card: Card, t: number, nodeLimit = Infinity): boolean | null {
    this.aborted = false;
    this.limit = this.nodes + nodeLimit;
    const v = this.playAndSearch(card, t - 1, t);
    return this.aborted ? null : v >= t;
  }

  /** Exact value after one first card, or null if the budget ran out. */
  exactAfter(card: Card, nodeLimit = Infinity): number | null {
    this.aborted = false;
    this.limit = this.nodes + nodeLimit;
    const v = this.playAndSearch(card, -1, 121);
    return this.aborted ? null : v;
  }

  /** Play one root card, search the rest, undo. Value includes the points of the trick if it completes now. */
  private playAndSearch(card: Card, alpha: number, beta: number): number {
    const seat = this.turn;
    const sh = this.h[seat];
    const st0 = this.t0;
    const st1 = this.t1;
    const stl = this.tl;
    const sleader = this.leader;
    this.h[seat] = sh & ~(1 << card);
    let v: number;
    if (stl < 2) {
      if (stl === 0) this.t0 = card;
      else this.t1 = card;
      this.tl = stl + 1;
      this.turn = seat === 2 ? 0 : seat + 1;
      v = this.search(alpha, beta, 1);
    } else {
      const w = this.winnerOf(st0, st1, card);
      const pts = CARD_POINTS[st0] + CARD_POINTS[st1] + CARD_POINTS[card];
      const gain = w === this.solo ? pts : 0;
      this.tl = 0;
      this.leader = w;
      this.turn = w;
      v = gain + this.search(alpha - gain, beta - gain, 1);
    }
    this.h[seat] = sh;
    this.t0 = st0;
    this.t1 = st1;
    this.tl = stl;
    this.leader = sleader;
    this.turn = seat;
    return v;
  }

  /** Winner seat of the trick (t0 led by `leader`). */
  private winnerOf(a: Card, b: Card, c: Card): number {
    const cls = this.classOf;
    const ord = this.order;
    let w = 0;
    let wc = a;
    // beats(): same class → higher order; else trump beats.
    if (cls[b] === cls[wc] ? ord[b] > ord[wc] : cls[b] === 4) {
      w = 1;
      wc = b;
    }
    if (cls[c] === cls[wc] ? ord[c] > ord[wc] : cls[c] === 4) w = 2;
    const s = this.leader + w;
    return s >= 3 ? s - 3 : s;
  }

  /** Rough share of the remaining Augen for the solo seat: card strength, trumps counting double. */
  private estimate(rem: number): number {
    let solo = 0;
    let other = 0;
    const cls = this.classOf;
    const ord = this.order;
    for (let s = 0; s < 3; s++) {
      let m = this.h[s];
      let str = 0;
      while (m !== 0) {
        const low = m & -m;
        m ^= low;
        const c = 31 - Math.clz32(low);
        str += (ord[c] + 1) * (cls[c] === 4 ? 2 : 1);
      }
      if (s === this.solo) solo += str;
      else other += str * 0.5;
    }
    const share = solo / (solo + other || 1);
    return Math.round(rem * share);
  }

  private search(alpha: number, beta: number, depth: number): number {
    if (++this.nodes > this.limit) {
      this.aborted = true;
      return alpha;
    }
    const tl = this.tl;
    const turn = this.turn;
    const h = this.h;
    const all = h[0] | h[1] | h[2];
    let ttIdx = -1;
    let ttBest = -1;
    if (tl === 0) {
      if (all === 0) return 0;
      const rem = pointsOf(all);
      if (rem <= alpha) return rem;
      if (beta <= 0) return 0;
      if (depth >= this.horizon) return this.estimate(rem);
      const l = this.leader;
      const l1 = l === 2 ? 0 : l + 1;
      const l2 = l1 === 2 ? 0 : l1 + 1;
      // Last trick: forced.
      if ((h[l] & (h[l] - 1)) === 0) {
        const a = 31 - Math.clz32(h[l]);
        const b = 31 - Math.clz32(h[l1]);
        const c = 31 - Math.clz32(h[l2]);
        return this.winnerOf(a, b, c) === this.solo ? rem : 0;
      }
      const tt = this.tt;
      ttIdx = hashKey(all, l);
      const tag = tt.gen * 4 + l;
      if (tt.tag[ttIdx] === tag && tt.key[ttIdx] === all) {
        const lo = tt.lo[ttIdx];
        const hi = tt.hi[ttIdx];
        if (lo >= beta) return lo;
        if (hi <= alpha) return hi;
        if (lo === hi) return lo;
        if (lo > alpha) alpha = lo;
        if (hi < beta) beta = hi;
        ttBest = tt.best[ttIdx];
      }
    }

    // ── Move generation with equivalence collapsing ──
    const hand = h[turn];
    const follow = this.follow;
    let legal = hand;
    if (tl > 0) {
      const f = hand & follow[this.t0];
      if (f !== 0) legal = f;
    }
    let present = all;
    if (tl > 0) present |= 1 << this.t0;
    if (tl > 1) present |= 1 << this.t1;
    const base = depth * MAX_MOVES;
    const mv = this.mv;
    const sc = this.sc;
    const isMax = this.maxSeat[turn] === 1;
    const cls = this.classOf;
    const ord = this.order;
    // Current trick winner (for ordering).
    let wCard = -1;
    let wSide = 0;
    let trickPts = 0;
    if (tl > 0) {
      wCard = this.t0;
      let wIdx = 0;
      trickPts = CARD_POINTS[this.t0];
      if (tl > 1) {
        trickPts += CARD_POINTS[this.t1];
        const b = this.t1;
        if (cls[b] === cls[wCard] ? ord[b] > ord[wCard] : cls[b] === 4) {
          wCard = b;
          wIdx = 1;
        }
      }
      const ws = (this.leader + wIdx) % 3;
      wSide = this.maxSeat[ws] === this.maxSeat[turn] ? 1 : 0;
    }
    let n = 0;
    let m = legal;
    while (m !== 0) {
      const low = m & -m;
      m ^= low;
      const c = 31 - Math.clz32(low);
      const higher = present & follow[c] & ABOVE[c];
      const nb = higher & -higher;
      if (nb !== 0 && (nb & hand) !== 0 && CARD_POINTS[c] === CARD_POINTS[31 - Math.clz32(nb)]) continue;
      let s: number;
      const pts = CARD_POINTS[c];
      if (c === ttBest) s = 10000;
      else if (tl === 0) {
        // Leading: a card nobody else can beat in its class first (the solo seat pulls trumps first), then a low card
        // to the partner's top card, then low cards.
        const top = (higher & ~hand) === 0;
        if (top) s = 600 + pts * 8 + (cls[c] === 4 && turn === this.solo ? 120 : 0);
        else {
          const tc = 31 - Math.clz32(present & follow[c]);
          const pt = turn === this.solo ? -1 : 3 - turn - this.solo;
          s = pt >= 0 && (h[pt] & (1 << tc)) !== 0 ? 450 - pts * 8 : 200 - pts * 8 - ord[c];
        }
      } else {
        const wins = cls[c] === cls[wCard] ? ord[c] > ord[wCard] : cls[c] === 4;
        if (wSide === 1) {
          // Partner is winning: smear Augen if last to play, else keep it cheap.
          s = tl === 2 ? 300 + pts * 8 - (wins ? 1 : 0) : 300 - pts * 4 + (wins ? 2 : 0);
        } else if (wins) {
          s = tl === 2 ? 600 + pts * 8 - ord[c] : 600 - ord[c] * 2 + pts;
        } else {
          s = 200 - pts * 8 - ord[c];
        }
      }
      // Insertion sort, descending.
      let i = n;
      while (i > 0 && sc[base + i - 1] < s) {
        sc[base + i] = sc[base + i - 1];
        mv[base + i] = mv[base + i - 1];
        i--;
      }
      sc[base + i] = s;
      mv[base + i] = c;
      n++;
    }

    const a0 = alpha;
    const b0 = beta;
    let best = isMax ? -1 : 1000;
    let bestCard = mv[base];
    const st0 = this.t0;
    const st1 = this.t1;
    const sleader = this.leader;
    const nextTurn = turn === 2 ? 0 : turn + 1;
    for (let i = 0; i < n; i++) {
      const c = mv[base + i];
      h[turn] = hand & ~(1 << c);
      let v: number;
      if (tl < 2) {
        if (tl === 0) this.t0 = c;
        else this.t1 = c;
        this.tl = tl + 1;
        this.turn = nextTurn;
        v = this.search(alpha, beta, depth + 1);
        this.tl = tl;
        this.t0 = st0;
        this.t1 = st1;
      } else {
        const w = this.winnerOf(st0, st1, c);
        const gain = w === this.solo ? trickPts + CARD_POINTS[c] : 0;
        this.tl = 0;
        this.leader = w;
        this.turn = w;
        v = gain + this.search(alpha - gain, beta - gain, depth + 1);
        this.tl = tl;
        this.leader = sleader;
      }
      this.turn = turn;
      h[turn] = hand;
      if (this.aborted) return alpha;
      if (isMax) {
        if (v > best) {
          best = v;
          bestCard = c;
          if (v > alpha) {
            alpha = v;
            if (alpha >= beta) break;
          }
        }
      } else if (v < best) {
        best = v;
        bestCard = c;
        if (v < beta) {
          beta = v;
          if (alpha >= beta) break;
        }
      }
    }

    if (ttIdx >= 0) {
      const tt = this.tt;
      const tag = tt.gen * 4 + this.leader;
      let lo = 0;
      let hi = 120;
      if (tt.tag[ttIdx] === tag && tt.key[ttIdx] === all) {
        lo = tt.lo[ttIdx];
        hi = tt.hi[ttIdx];
      }
      if (best <= a0) {
        if (best < hi) hi = best;
      } else if (best >= b0) {
        if (best > lo) lo = best;
      } else {
        lo = best;
        hi = best;
      }
      if (lo < 0) lo = 0;
      tt.tag[ttIdx] = tag;
      tt.key[ttIdx] = all;
      tt.lo[ttIdx] = lo;
      tt.hi[ttIdx] = hi;
      tt.best[ttIdx] = bestCard;
    }
    return best;
  }
}

// ─── Trick goals: Null (no trick) and Schwarz / Durchmarsch (every trick) ───────────────────────────────────

/** Null order rank inside a suit: 7 8 9 10 B D K A → 0…7. Index by card. */
const NULL_RANK: Uint8Array = (() => {
  const slotRank = [0, 1, 2, 5, 6, 3, 7]; // 7 8 9 D K 10 A
  const t = new Uint8Array(32);
  for (let c = 0; c < 28; c++) t[c] = slotRank[c % 7];
  for (let c = 28; c < 32; c++) t[c] = 4;
  return t;
})();

/** Per card, the cards of the same Null suit ordered by rank above it (lowest first), as single-bit masks. */
const NULL_HIGHER: Int32Array[] = (() => {
  const out: Int32Array[] = [];
  for (let c = 0; c < 32; c++) {
    const suit = c >= 28 ? c - 28 : (c / 7) | 0;
    const same: number[] = [];
    for (let d = 0; d < 32; d++) {
      const sd = d >= 28 ? d - 28 : (d / 7) | 0;
      if (sd === suit && NULL_RANK[d] > NULL_RANK[c]) same.push(d);
    }
    same.sort((a, b) => NULL_RANK[a] - NULL_RANK[b]);
    out.push(Int32Array.from(same.map((d) => 1 << d)));
  }
  return out;
})();

export type TrickGoal = "none" | "all";

/**
 * Boolean solver for trick goals with open cards. `goal` "none": the solo seat must take no trick (Null). "all": the
 * solo seat must take every trick (Schwarz angesagt, ouvert, Durchmarsch in Ramsch).
 */
export class TrickSolver {
  nodes = 0;
  aborted = false;
  private r: PlayRules = playRules("null");
  private isNull = true;
  private readonly h = new Int32Array(3);
  private solo = 0;
  private goalAll = false;
  private turn = 0;
  private leader = 0;
  private t0 = -1;
  private t1 = -1;
  private tl = 0;
  private readonly tt = new Table();
  private readonly mv = new Int8Array(40 * MAX_MOVES);
  private limit = Infinity;

  load(p: SolvePosition, goal: TrickGoal): void {
    this.r = playRules(p.kind);
    this.isNull = p.kind === "null";
    this.h[0] = p.hands[0];
    this.h[1] = p.hands[1];
    this.h[2] = p.hands[2];
    this.solo = p.solo;
    this.goalAll = goal === "all";
    const t = p.trick ?? [];
    this.tl = t.length;
    this.t0 = t.length > 0 ? t[0] : -1;
    this.t1 = t.length > 1 ? t[1] : -1;
    this.leader = p.leader;
    this.turn = (p.leader + t.length) % 3;
    this.tt.clear();
  }

  get toMove(): number {
    return this.turn;
  }

  /** Can the solo seat reach the goal from here with best play? */
  solve(nodeLimit = Infinity): boolean {
    this.aborted = false;
    this.limit = this.nodes + nodeLimit;
    return this.search(0);
  }

  /** Goal reachable after each of the given first cards of the side to move. */
  valuesAfter(cards: readonly Card[], out: boolean[], nodeLimit = Infinity): boolean {
    this.aborted = false;
    this.limit = this.nodes + nodeLimit;
    for (let i = 0; i < cards.length; i++) {
      out[i] = this.playAndSearch(cards[i]);
      if (this.aborted) return false;
    }
    return true;
  }

  /** Goal reachable after one first card; null if the budget ran out. */
  testAfter(card: Card, nodeLimit = Infinity): boolean | null {
    this.aborted = false;
    this.limit = this.nodes + nodeLimit;
    const v = this.playAndSearch(card);
    return this.aborted ? null : v;
  }

  private playAndSearch(card: Card): boolean {
    const seat = this.turn;
    const sh = this.h[seat];
    const st0 = this.t0;
    const st1 = this.t1;
    const stl = this.tl;
    const sleader = this.leader;
    this.h[seat] = sh & ~(1 << card);
    let v: boolean;
    if (stl < 2) {
      if (stl === 0) this.t0 = card;
      else this.t1 = card;
      this.tl = stl + 1;
      this.turn = seat === 2 ? 0 : seat + 1;
      v = this.search(1);
    } else {
      const w = this.winnerOf(st0, st1, card);
      if ((w === this.solo) !== this.goalAll) v = false;
      else {
        this.tl = 0;
        this.leader = w;
        this.turn = w;
        v = this.search(1);
      }
    }
    this.h[seat] = sh;
    this.t0 = st0;
    this.t1 = st1;
    this.tl = stl;
    this.leader = sleader;
    this.turn = seat;
    return v;
  }

  private winnerOf(a: Card, b: Card, c: Card): number {
    const cls = this.r.classOf;
    const ord = this.r.order;
    let w = 0;
    let wc = a;
    if (cls[b] === cls[wc] ? ord[b] > ord[wc] : cls[b] === 4) {
      w = 1;
      wc = b;
    }
    if (cls[c] === cls[wc] ? ord[c] > ord[wc] : cls[c] === 4) w = 2;
    const s = this.leader + w;
    return s >= 3 ? s - 3 : s;
  }

  /** Is the next higher card in play (same class/suit, by trick order) in `hand`? Then `c` is redundant. */
  private redundant(c: Card, hand: number, present: number): boolean {
    if (this.isNull) {
      const hs = NULL_HIGHER[c];
      for (let i = 0; i < hs.length; i++) {
        const b = hs[i];
        if ((present & b) !== 0) return (hand & b) !== 0;
      }
      return false;
    }
    const higher = present & this.r.follow[c] & ABOVE[c];
    const nb = higher & -higher;
    return nb !== 0 && (nb & hand) !== 0;
  }

  private search(depth: number): boolean {
    if (++this.nodes > this.limit) {
      this.aborted = true;
      return false;
    }
    const tl = this.tl;
    const turn = this.turn;
    const h = this.h;
    const all = h[0] | h[1] | h[2];
    let ttIdx = -1;
    if (tl === 0) {
      if (all === 0) return true;
      const tt = this.tt;
      ttIdx = hashKey(all, this.leader);
      if (tt.tag[ttIdx] === tt.gen * 4 + this.leader && tt.key[ttIdx] === all) return tt.lo[ttIdx] === 1;
    }
    const hand = h[turn];
    const follow = this.r.follow;
    let legal = hand;
    if (tl > 0) {
      const f = hand & follow[this.t0];
      if (f !== 0) legal = f;
    }
    let present = all;
    if (tl > 0) present |= 1 << this.t0;
    if (tl > 1) present |= 1 << this.t1;
    const base = depth * MAX_MOVES;
    const mv = this.mv;
    let n = 0;
    let m = legal;
    while (m !== 0) {
      const low = m & -m;
      m ^= low;
      const c = 31 - Math.clz32(low);
      if (this.redundant(c, hand, present)) continue;
      mv[base + n++] = c;
    }
    // Solo wants the goal (OR node); the others want to break it (AND node).
    const isSolo = turn === this.solo;
    // Ordering: in Null the declarer tries low cards first, defenders high cards; for "all" the reverse.
    const ord = this.isNull ? NULL_RANK : this.r.order;
    const lowFirst = isSolo !== this.goalAll;
    for (let i = 1; i < n; i++) {
      const c = mv[base + i];
      let j = i;
      while (j > 0 && (lowFirst ? ord[mv[base + j - 1]] > ord[c] : ord[mv[base + j - 1]] < ord[c])) {
        mv[base + j] = mv[base + j - 1];
        j--;
      }
      mv[base + j] = c;
    }
    const st0 = this.t0;
    const st1 = this.t1;
    const sleader = this.leader;
    const nextTurn = turn === 2 ? 0 : turn + 1;
    let result = !isSolo;
    for (let i = 0; i < n; i++) {
      const c = mv[base + i];
      h[turn] = hand & ~(1 << c);
      let v: boolean;
      if (tl < 2) {
        if (tl === 0) this.t0 = c;
        else this.t1 = c;
        this.tl = tl + 1;
        this.turn = nextTurn;
        v = this.search(depth + 1);
        this.tl = tl;
        this.t0 = st0;
        this.t1 = st1;
      } else {
        const w = this.winnerOf(st0, st1, c);
        if ((w === this.solo) !== this.goalAll) v = false;
        else {
          this.tl = 0;
          this.leader = w;
          this.turn = w;
          v = this.search(depth + 1);
          this.tl = tl;
          this.leader = sleader;
        }
      }
      this.turn = turn;
      h[turn] = hand;
      if (this.aborted) return false;
      if (isSolo ? v : !v) {
        result = isSolo;
        break;
      }
    }
    if (ttIdx >= 0) {
      const tt = this.tt;
      tt.tag[ttIdx] = tt.gen * 4 + this.leader;
      tt.key[ttIdx] = all;
      tt.lo[ttIdx] = result ? 1 : 2;
    }
    return result;
  }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────────────────────────────────

let sharedPoint: PointSolver | null = null;
let sharedTrick: TrickSolver | null = null;

/** A lazily created shared point solver (one per thread/worker). */
export function pointSolver(): PointSolver {
  return (sharedPoint ??= new PointSolver());
}

/** A lazily created shared trick solver. */
export function trickSolver(): TrickSolver {
  return (sharedTrick ??= new TrickSolver());
}

/** Exact future card points of the solo seat (suit, Grand; Ramsch with `maximize` false = solo minimises). */
export function solvePoints(p: SolvePosition, maximize = true): number {
  const s = pointSolver();
  s.load(p, maximize);
  return s.solve();
}

/** Null: can the declarer (solo) avoid every trick from here? */
export function solveNull(p: Omit<SolvePosition, "kind">): boolean {
  const s = trickSolver();
  s.load({ ...p, kind: "null" }, "none");
  return s.solve();
}

/** Can the solo seat take every remaining trick (Schwarz, Durchmarsch)? */
export function solveAllTricks(p: SolvePosition): boolean {
  const s = trickSolver();
  s.load(p, "all");
  return s.solve();
}

/** Legal cards of the seat to move (plain, not collapsed). */
export function legalOf(p: SolvePosition): CardMask {
  const r = playRules(p.kind);
  const t = p.trick ?? [];
  const turn = (p.leader + t.length) % 3;
  const hand = p.hands[turn];
  if (t.length === 0) return hand;
  const f = hand & r.follow[t[0]];
  return f !== 0 ? f : hand;
}
