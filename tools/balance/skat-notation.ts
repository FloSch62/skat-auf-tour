// German notation for game logs a club player can review (docs/balance-skat-games.md): hands sorted like at the table,
// the bidding, the skat and the discard, every trick with who played what, and the Liste line.
import { CHARACTER_DEFS } from "../../src/data/characters.ts";
import type { CharacterId } from "../../src/game/ids.ts";
import {
  POSITION_NAMES, applyAction, declarationName, maskOf, newGame, positionOf, recordLabel, sortHand, valueBreakdown,
} from "../../src/skat/rules/index.ts";
import type { Action, Card, GameState, PlayKind, RuleOptions, Seat } from "../../src/skat/rules/index.ts";

const SUIT_SYMBOL = ["♦", "♥", "♠", "♣"];
const RANK = ["7", "8", "9", "D", "K", "10", "A"];

/** "♣B", "♥10", "♠A". */
export function short(c: Card): string {
  if (c >= 28) return `${SUIT_SYMBOL[c - 28]}B`;
  return `${SUIT_SYMBOL[(c / 7) | 0]}${RANK[c % 7]}`;
}

export function shortHand(mask: number, kind: PlayKind | null = null): string {
  return sortHand(mask, kind).map(short).join(" ");
}

export function agentName(id: string): string {
  if (id.startsWith("allpass:")) return agentName(id.slice(8));
  if (id === "baseline") return "Regelspieler";
  const [c, d] = id.split("@");
  const n = CHARACTER_DEFS[c as CharacterId]?.name ?? c;
  return d ? `${n} (Tiefe ${d})` : n;
}

const SEAT_NAMES = ["unten", "links", "rechts"];
const POS_SHORT = ["VH", "MH", "HH"];

/** A complete game in readable German. */
export function gameToMarkdown(
  title: string,
  seed: number,
  dealer: Seat,
  agents: readonly string[],
  actions: readonly Action[],
  notes?: readonly (string | undefined)[],
  rules: Partial<RuleOptions> = {},
): string {
  let s: GameState = newGame({ seed, dealer, rules });
  const out: string[] = [];
  const name = (seat: number) => `${agentName(agents[seat])} (${POSITION_NAMES[positionOf(seat as Seat, dealer)]})`;
  out.push(`### ${title}`, "");
  out.push(`Seed ${seed}, Geber: ${agentName(agents[dealer])}.`, "");
  for (let p = 0; p < 3; p++) {
    const seat = ((dealer + 1 + p) % 3) as Seat;
    out.push(`- **${POS_SHORT[p]}** ${agentName(agents[seat])}: ${shortHand(s.hands[seat])}`);
  }
  out.push(`- **Skat:** ${shortHand(s.skat)}`, "");
  const bidding: string[] = [];
  const tricks: string[] = [];
  let trick: string[] = [];
  let kind: PlayKind | null = null;
  let i = 0;
  for (const a of actions) {
    const note = notes?.[i];
    i++;
    const who = agentName(agents[a.seat]);
    switch (a.type) {
      case "bid":
        bidding.push(`${POS_SHORT[positionOf(a.seat, dealer)]} ${a.value}`);
        break;
      case "hold":
        bidding.push(`${POS_SHORT[positionOf(a.seat, dealer)]} ja`);
        break;
      case "pass":
        bidding.push(`${POS_SHORT[positionOf(a.seat, dealer)]} passe`);
        break;
      case "pickUp":
        if (s.phase === "skat") out.push(`Reizen: ${bidding.join(", ")}.`, "", `${name(a.seat)} nimmt den Skat auf (Reizwert ${s.bid}).`);
        else out.push(`${who} nimmt den Skat auf (Schieberamsch).`);
        break;
      case "discard":
        out.push(s.phase === "discard" ? `Gedrückt: ${a.cards.map(short).join(" ")}.` : `${who} schiebt weiter: ${a.cards.map(short).join(" ")}.`);
        break;
      case "shove":
        out.push(`${who} schiebt den Skat ungesehen weiter.`);
        break;
      case "declare":
        if (s.phase === "skat") out.push(`Reizen: ${bidding.join(", ")}.`, "", `${name(a.seat)} spielt **${declarationName(a.declaration)}** (Reizwert ${s.bid}).`);
        else out.push(`Angesagt: **${declarationName(a.declaration)}**.${note ? ` _(${note})_` : ""}`);
        break;
      case "kontra":
        out.push(`${who} sagt Kontra.`);
        break;
      case "re":
        out.push(`${who} sagt Re.`);
        break;
      case "noRe":
        break;
      case "play": {
        if (s.trick.length === 0) trick = [];
        trick.push(`${POS_SHORT[positionOf(a.seat, dealer)]} ${short(a.card)}`);
        break;
      }
      default:
        break;
    }
    const before = s;
    s = applyAction(s, a);
    if (a.type === "pass" && s.phase !== "bidding" && before.phase === "bidding" && s.declarer === null) {
      out.push(`Reizen: ${bidding.join(", ")}.`, "");
    }
    kind = kind ?? (s.declaration ? s.declaration.kind : s.phase === "play" && s.declarer === null ? "ramsch" : null);
    if (a.type === "play" && s.tricks.length > tricks.length) {
      const t = s.tricks[s.tricks.length - 1];
      tricks.push(`${String(tricks.length + 1).padStart(2)}. ${trick.join("  ")}  → ${POS_SHORT[positionOf(t.winner, dealer)]} ${t.points}`);
    }
  }
  if (tricks.length) {
    if (kind) out.push("", `Hände zu Spielbeginn (sortiert für ${kind === "ramsch" ? "Ramsch" : declarationName(s.declaration!)}):`);
    for (let p = 0; p < 3; p++) {
      const seat = ((dealer + 1 + p) % 3) as Seat;
      const role = s.declarer === null ? "" : seat === s.declarer ? ", Alleinspieler" : "";
      out.push(`- ${POS_SHORT[p]} ${agentName(agents[seat])}${role}: ${shortHand(s.playHands[seat], kind)}`);
    }
    out.push("", "Stiche (Ausspieler zuerst, → wer sticht, Augen):", "", ...tricks.map((t) => `    ${t}`));
  }
  const r = s.result!;
  out.push("");
  if (r.type === "passed") out.push("**Eingepasst** — alle passen.");
  else if (r.type === "ramsch") {
    out.push(`**Ramsch:** Augen ${r.points.map((p, k) => `${agentName(agents[k])} ${p}`).join(", ")}. ${valueBreakdown(r).join(", ")}.`);
  } else {
    const label = recordLabel({
      seed, forehand: s.forehand, declarer: r.declarer, kind: r.declaration!.kind, hand: r.declaration!.hand, ouvert: r.declaration!.ouvert,
      schneiderAnnounced: r.declaration!.schneiderAnnounced, schwarzAnnounced: r.declaration!.schwarzAnnounced, schneider: r.schneider,
      schwarz: r.schwarz, matadors: r.matadors?.count ?? 0, withTops: r.matadors?.withTops, bid: r.bid, won: r.won, overbid: r.overbid,
      points: r.declarerPoints, value: r.written, kontra: r.kontra, list: r.list,
    });
    out.push(`**${agentName(agents[r.declarer!])}: ${label}** — ${r.declarerPoints} Augen, ${valueBreakdown(r).join(", ")}.`);
  }
  out.push(`Liste: ${r.list.map((p, k) => `${agentName(agents[k])} ${p > 0 ? "+" : ""}${p}`).join(", ")}.`, "");
  return out.join("\n");
}

export { maskOf };
