// Dev scenes of the table:
//   /?dev=table&seed=42&rule=ramsch&opp=maurer,zocker&games=3&deck=german[&auto=1&speed=8][&pace=fast][&oneclick=1]
//      [&peek=1&redeal=1&takeback=1&trumps=1&points=1&forehand=1][&tournament=1][&room=besen][&played=2][&title=Meister]
//   /?dev=table-result&seed=42[&kind=grand|null|clubs|ramsch|passed][&declarer=0|1|2][&rule=kontra]
//   /?dev=table-final&seed=42[&games=3]          the places after a whole round (games played quickly)
//   /?dev=table-ouvert&seed=42[&kind=null]       the left regular plays ouvert (open cards in his panel)
//   /?dev=table-declare&seed=42[&tutorial=1]     the declaration panel after picking up and pressing
//   /?dev=table-banter&case=overtake|smear|letThrough|robbed|aceTrumped|lost60[&opp=schultes,amtsbote], &end=lost
//   /?dev=table-liste&seed=42&games=6&played=4   the Liste overlay over a running round
// `start=1` skips the round intro (readability check), `tutorial=1` shows the Probefahrt notes,
// `dogs=shepherd,airedale` puts travelling dogs beside the table.
// `auto=1` lets the AI play the player's seat too (soak test, tools/soak.mjs); `played=n` resumes after n games.
import type { DevFactory } from "../../dev";
import type { App, Scene } from "../../core/scene";
import { settings, type DeckStyle, type Pace } from "../../core/save";
import { Rng } from "../../core/rng";
import type { CharacterId, HouseRuleId } from "../../game/ids";
import { CHARACTERS, DOGS, HOUSE_RULES } from "../../game/ids";
import type { DogId } from "../../game/ids";
import type { RoundConfig, RoundProgress } from "../../game/types";
import {
  applyAction, cardsOf, currentSeat, declaration, finishGame, houseRuleEffects, isJack, isRoundOver, legalActions,
  startGame, startRound,
} from "../rules/index";
import type { Action, DeclKind, GameState, Seat } from "../rules/index";
import { createTableScene } from "./scene";
import { createListeOverlay } from "./overlays";
import { characterNameStart } from "../../data/characters";
import { BANTER_CASES, banterCase, type BanterCaseId } from "./banterCases";

function num(params: URLSearchParams, key: string, def: number): number {
  const v = Number(params.get(key));
  return params.has(key) && Number.isFinite(v) ? v : def;
}

function flag(params: URLSearchParams, key: string): boolean {
  return params.get(key) === "1" || params.get(key) === "true";
}

export function devConfig(params: URLSearchParams): RoundConfig {
  const rawRule = params.get("rule") ?? "standard";
  const rule = (HOUSE_RULES as readonly string[]).includes(rawRule) ? (rawRule as HouseRuleId) : "standard";
  const e = houseRuleEffects(rule);
  const ids = (params.get("opp") ?? "maurer,zocker").split(",").filter((id) => (CHARACTERS as readonly string[]).includes(id)) as CharacterId[];
  const opponents: [CharacterId, CharacterId] = [ids[0] ?? "maurer", ids[1] ?? (ids[0] === "zocker" ? "maurer" : "zocker")];
  const tournament = flag(params, "tournament");
  return {
    seed: num(params, "seed", 42),
    opponents,
    houseRule: tournament ? "standard" : rule,
    games: num(params, "games", tournament ? 6 : e.games ?? 3),
    tournament,
    title: params.get("title-text") ?? (tournament ? "Preisskat in Vaihingen an der Enz" : "Gasthaus Krone"),
    room: params.get("room") ?? (tournament ? "clubhouse" : "village"),
    marks: num(params, "marks", 10),
    perks: {
      showTrumps: flag(params, "trumps"),
      showPoints: flag(params, "points"),
      redeals: num(params, "redeal", 0),
      skatPeeks: num(params, "peek", 0),
      takeBacks: num(params, "takeback", 0),
      forehandFirst: flag(params, "forehand"),
      listBonus: { ...e.listBonus },
    },
    depth: num(params, "depth", 1),
  };
}

function applySettings(params: URLSearchParams) {
  const d = params.get("deck");
  if (d === "french" || d === "german" || d === "tournament") settings.deck = d as DeckStyle;
  const p = params.get("pace");
  if (p === "slow" || p === "normal" || p === "fast") settings.pace = p as Pace;
  if (params.has("oneclick")) settings.oneClickPlay = flag(params, "oneclick");
  if (params.has("name")) settings.name = params.get("name") ?? settings.name;
}

/** A quick, legal, not very clever policy to finish games without the AI (dev previews only). */
export function quickAction(s: GameState, rng: Rng, want: { declarer?: Seat; kind?: DeclKind | "passed" | "ramsch"; ouvert?: boolean } = {}): Action {
  const seat = currentSeat(s)!;
  const legal = legalActions(s, seat).filter((a) => a.type !== "peek" && a.type !== "takeBack" && a.type !== "kontra");
  const of = <T extends Action["type"]>(t: T) => legal.filter((a) => a.type === t) as Extract<Action, { type: T }>[];
  const wantsGame = want.kind !== "passed" && want.kind !== "ramsch";
  const declarer = want.declarer ?? 1;
  switch (s.phase) {
    case "bidding": {
      if (wantsGame && seat === declarer) return of("bid").find((a) => a.value === 18) ?? of("hold")[0] ?? of("pass")[0];
      return of("pass")[0];
    }
    case "skat": {
      if (want.ouvert) {
        const kind = (wantsGame && want.kind ? want.kind : "grand") as DeclKind;
        const o = of("declare").find((a) => a.declaration.kind === kind && a.declaration.ouvert);
        if (o) return o;
      }
      return of("pickUp")[0];
    }
    case "discard": {
      const cards = cardsOf(s.hands[seat]).filter((c) => !isJack(c)).sort((a, b) => (a % 7) - (b % 7));
      return { type: "discard", seat, cards: [cards[0], cards[1]] };
    }
    case "declare": {
      const kind = (wantsGame && want.kind ? want.kind : "grand") as DeclKind;
      const d = declaration(kind);
      return of("declare").find((a) => a.declaration.kind === d.kind && !a.declaration.ouvert) ?? of("declare")[0];
    }
    case "schieben":
      return of("shove")[0] ?? legal[0];
    case "re":
      return of("noRe")[0];
    default:
      return rng.pick(of("play"));
  }
}

/** Play the next game of the round to its end with the quick policy. */
export function quickGame(p: RoundProgress, rng: Rng, want: Parameters<typeof quickAction>[2] = {}): GameState {
  let s = startGame(p);
  for (let guard = 0; s.phase !== "done" && guard < 400; guard++) s = applyAction(s, quickAction(s, rng, want));
  return s;
}

function quickRound(config: RoundConfig, played: number, seed: number): RoundProgress {
  let p = startRound(config);
  const rng = new Rng(seed);
  for (let i = 0; i < played && !isRoundOver(p); i++) {
    const kinds: (DeclKind | "ramsch")[] = ["clubs", "grand", "hearts", "null", "spades", "diamonds"];
    const s = quickGame(p, rng, { declarer: (i % 3) as Seat, kind: kinds[i % kinds.length] });
    p = finishGame(p, s).progress;
  }
  return p;
}

function table(app: App, params: URLSearchParams, progress?: RoundProgress): Scene {
  applySettings(params);
  const config = devConfig(params);
  const p = progress ?? quickRound(config, num(params, "played", 0), config.seed);
  const t = params.get("title");
  return createTableScene(app, {
    progress: p,
    playerName: params.get("name") ?? undefined,
    title: t === "Meister" ? "Meister" : "Lehrling",
    stakes: (params.get("stakes") as "small" | "medium" | "high" | null) ?? "small",
    auto: flag(params, "auto"),
    speed: num(params, "speed", 1),
    devSkipIntro: flag(params, "start"),
    tutorial: flag(params, "tutorial"),
    dogs: (params.get("dogs") ?? "").split(",").filter((d) => (DOGS as readonly string[]).includes(d)) as DogId[],
    onProgress(np) {
      console.info(`[table] saved after game ${np.games.length}: list ${np.list.join(" / ")}`);
    },
    onDone(r) {
      console.info(`[table] round done: place ${r.place}, list ${r.list.join(" / ")}, marks ${r.marks}`);
      if (flag(params, "auto")) return; // the soak test reads window.__table.done
      const next = new URLSearchParams(params);
      next.set("seed", String(config.seed + 1));
      next.delete("played");
      app.scenes.switchTo(table(app, next));
    },
  });
}

export const dev: Record<string, DevFactory> = {
  table: (app, params) => table(app, params),
  "table-result": (app, params) => {
    applySettings(params);
    const config = devConfig(params);
    const p = startRound(config);
    const kind = (params.get("kind") ?? "grand") as DeclKind | "passed" | "ramsch";
    const s = quickGame(p, new Rng(config.seed), { declarer: num(params, "declarer", 0) as Seat, kind });
    return createTableScene(app, {
      progress: p,
      devGame: s,
      onProgress: () => {},
      onDone: () => {},
    });
  },
  /** An opponent plays ouvert: his cards lie open in his panel (stops before the first card). */
  "table-ouvert": (app, params) => {
    applySettings(params);
    const config = devConfig(params);
    const p = startRound(config);
    const rng = new Rng(config.seed);
    let s = startGame(p);
    const want = { declarer: 1 as Seat, kind: (params.get("kind") ?? "grand") as DeclKind, ouvert: true };
    for (let guard = 0; s.phase !== "play" && s.phase !== "done" && guard < 50; guard++) s = applyAction(s, quickAction(s, rng, want));
    return createTableScene(app, { progress: p, devGame: s, onProgress: () => {}, onDone: () => {} });
  },
  /** The player declares a Kreuz game, a regular says Kontra: the player decides about Re (house rule kontra). */
  "table-re": (app, params) => {
    applySettings(params);
    params.set("rule", "kontra");
    const config = devConfig(params);
    const p = startRound(config);
    const rng = new Rng(config.seed);
    let s = startGame(p);
    const want = { declarer: 0 as Seat, kind: "clubs" as DeclKind };
    for (let guard = 0; s.phase !== "play" && s.phase !== "done" && guard < 50; guard++) s = applyAction(s, quickAction(s, rng, want));
    for (let guard = 0; s.phase === "play" && guard < 30; guard++) {
      const k = legalActions(s).find((a) => a.type === "kontra");
      if (k) {
        s = applyAction(s, k);
        break;
      }
      s = applyAction(s, quickAction(s, rng, want));
    }
    return createTableScene(app, { progress: p, devGame: s, onProgress: () => {}, onDone: () => {} });
  },
  /**
   * Stammtisch banter on demand: a hand-made trick that provokes it (banterCases.ts), played out by script, with the
   * banter forced on. `case` = overtake | smear | letThrough | robbed | aceTrumped | lost60; `end=lost` instead shows
   * the result of a lost game (selfBlame / tease in the quote). Default opponents have banter lines.
   */
  "table-banter": (app, params) => {
    applySettings(params);
    if (!params.has("opp")) params.set("opp", "wengerter,brenner");
    const config = devConfig(params);
    const p = startRound(config);
    if (params.get("end") === "lost") {
      // search a deal in which the left regular declares and loses
      for (let seed = config.seed; seed < config.seed + 400; seed++) {
        const q = startRound({ ...config, seed });
        const s = quickGame(q, new Rng(seed), { declarer: num(params, "declarer", 1) as Seat, kind: "grand" });
        if (s.result && s.result.type === "declared" && !s.result.won) {
          return createTableScene(app, { progress: q, devGame: s, devBanter: true, onProgress: () => {}, onDone: () => {} });
        }
      }
    }
    const id = (params.get("case") ?? "overtake") as BanterCaseId;
    const c = banterCase(BANTER_CASES.includes(id) ? id : "overtake");
    console.info(`[table] banter case ${c.id}: ${c.title}`);
    return createTableScene(app, { progress: p, devGame: c.state, devScript: c.script, devBanter: true, onProgress: () => {}, onDone: () => {} });
  },
  /** The player has picked up and pressed: the declaration panel (with `tutorial=1` its Probefahrt line). */
  "table-declare": (app, params) => {
    applySettings(params);
    const config = devConfig(params);
    const p = startRound(config);
    const rng = new Rng(config.seed);
    let s = startGame(p);
    const want = { declarer: 0 as Seat, kind: "grand" as DeclKind };
    for (let guard = 0; s.phase !== "declare" && s.phase !== "done" && guard < 50; guard++) s = applyAction(s, quickAction(s, rng, want));
    return createTableScene(app, { progress: p, devGame: s, tutorial: flag(params, "tutorial"), onProgress: () => {}, onDone: () => {} });
  },
  "table-final": (app, params) => {
    applySettings(params);
    const config = devConfig(params);
    return table(app, params, quickRound(config, config.games, config.seed));
  },
  "table-liste": (app, params) => {
    applySettings(params);
    const config = devConfig(params);
    const p = quickRound(config, num(params, "played", Math.min(4, config.games)), config.seed);
    const scene = table(app, params, p);
    const names: [string, string, string] = [params.get("name") || settings.name || "Du", characterNameStart(config.opponents[0]), characterNameStart(config.opponents[1])];
    setTimeout(() => app.scenes.push(createListeOverlay(app, { progress: p, names, deck: settings.deck })), 50);
    return scene;
  },
};
