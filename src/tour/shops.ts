// The shops (contract §4.12): flea market (three souvenirs, 2–6 Mark, slots 4 / roof box +2 / rig 2, swap when
// full), garage (upgrades 6–12 Mark, the oil can takes 2 off; fuel for Mark; the rig fits only the aux tank) and the
// dog meadow (take or swap a dog; 2 dogs, dog bed 3, rig 1). Offers are rolled once on arrival and kept in
// tour.station.offer, so a reload shows the same table. Pure module.
import type { TourState } from "../game/types.ts";
import type { DogId, SouvenirId, UpgradeId } from "../game/ids.ts";
import { DOGS, SOUVENIRS, UPGRADES } from "../game/ids.ts";
import { SOUVENIR_DEFS } from "../data/souvenirs.ts";
import { UPGRADE_DEFS } from "../data/upgrades.ts";
import { DOG_DEFS, dogName } from "../data/dogs.ts";
import { VEHICLE_DEFS, VEHICLE_RULES } from "../data/vehicles.ts";
import { collectSouvenir, unlockedDogs } from "./book.ts";
import { addMarks, dogSlots, gainFuel, log, souvenirSlots } from "./ledger.ts";
import { ECONOMY } from "./economy.ts";
import { currentNode, hasSouvenir, markWord, placeName, rngFor, STROKES, type TourEnv } from "./util.ts";

export interface ShopResult {
  ok: boolean;
  /** German reason when not ok. */
  reason?: string;
  /** The route line when ok. */
  line?: string;
  /** Slots are full: call again with `replace` (souvenir) or `swapOut` (dog). */
  needsReplace?: boolean;
}

export interface OfferView<Id extends string> {
  id: Id;
  name: string;
  text: string;
  price: number;
  /** Already bought / aboard. */
  owned: boolean;
  affordable: boolean;
  /** German reason when it cannot be taken now. */
  reason?: string;
}

function where(tour: TourState, env: TourEnv, shop: string): string {
  return `${shop} in ${placeName(env.pack, currentNode(tour).place)}`;
}

function remember(tour: TourState, key: string) {
  if (tour.station && !tour.station.done.includes(key)) tour.station.done.push(key);
}

// ─── flea market ──────────────────────────────────────────────────────────────────────────────────────────

/** Three souvenirs not yet owned, rolled per station. */
export function rollMarketOffer(tour: TourState): SouvenirId[] {
  const rng = rngFor(tour.seed, tour.stage, tour.at, "market");
  return rng.shuffle(SOUVENIRS.filter((s) => !tour.souvenirs.includes(s))).slice(0, 3);
}

export function souvenirPrice(id: SouvenirId): number {
  return SOUVENIR_DEFS[id].price ?? 4;
}

export function marketOffer(tour: TourState): OfferView<SouvenirId>[] {
  const ids = (tour.station?.offer ?? []) as SouvenirId[];
  return ids.map((id) => {
    const price = souvenirPrice(id);
    const owned = tour.souvenirs.includes(id);
    const affordable = tour.marks >= price;
    return {
      id, name: SOUVENIR_DEFS[id].name, text: SOUVENIR_DEFS[id].text, price, owned, affordable,
      reason: owned ? "Schon dabei" : affordable ? undefined : `Kostet ${price} Mark`,
    };
  });
}

/** Buy an offered souvenir; when all slots are full, `replace` names the souvenir to leave at the stall. */
export function buySouvenir(tour: TourState, env: TourEnv, id: SouvenirId, replace?: SouvenirId): ShopResult {
  const offer = (tour.station?.offer ?? []) as string[];
  if (!offer.includes(id)) return { ok: false, reason: "Liegt hier nicht aus" };
  if (tour.souvenirs.includes(id)) return { ok: false, reason: "Schon dabei" };
  const price = souvenirPrice(id);
  if (tour.marks < price) return { ok: false, reason: `Kostet ${price} Mark` };
  if (tour.souvenirs.length >= souvenirSlots(tour)) {
    if (!replace || !tour.souvenirs.includes(replace)) return { ok: false, needsReplace: true, reason: "Kein Platz mehr: ein Andenken dalassen?" };
    tour.souvenirs = tour.souvenirs.filter((s) => s !== replace);
  }
  addMarks(tour, -price);
  tour.souvenirs.push(id);
  if (env.book) collectSouvenir(env.book, id);
  remember(tour, `bought:${id}`);
  const swap = replace ? ` (${SOUVENIR_DEFS[replace].name} bleibt da)` : "";
  const line = `${where(tour, env, "Flohmarkt")}: ${SOUVENIR_DEFS[id].name} gekauft${swap}, ${markWord(-price)}`;
  log(tour, line);
  return { ok: true, line };
}

/** Swap a souvenir that came from an event without a free slot (EventResult.overflow). */
export function placeSouvenir(tour: TourState, env: TourEnv, id: SouvenirId, replace: SouvenirId): ShopResult {
  if (tour.souvenirs.includes(id)) return { ok: false, reason: "Schon dabei" };
  if (!tour.souvenirs.includes(replace)) return { ok: false, reason: "Das Andenken ist nicht dabei" };
  tour.souvenirs = tour.souvenirs.filter((s) => s !== replace).concat(id);
  if (env.book) collectSouvenir(env.book, id);
  const line = `${SOUVENIR_DEFS[id].name} statt ${SOUVENIR_DEFS[replace].name}`;
  log(tour, line);
  return { ok: true, line };
}

// ─── garage ───────────────────────────────────────────────────────────────────────────────────────────────

export function upgradeAllowed(tour: Pick<TourState, "vehicle">, id: UpgradeId): boolean {
  const allowed = VEHICLE_RULES[tour.vehicle].upgrades;
  return !allowed || allowed.includes(id);
}

/** Up to three upgrades not fitted yet (the rig: only the aux tank). */
export function rollGarageOffer(tour: TourState): UpgradeId[] {
  const rng = rngFor(tour.seed, tour.stage, tour.at, "garage");
  return rng.shuffle(UPGRADES.filter((u) => !tour.upgrades.includes(u) && upgradeAllowed(tour, u))).slice(0, 3);
}

export function upgradePrice(tour: Pick<TourState, "souvenirs">, id: UpgradeId): number {
  const base = UPGRADE_DEFS[id].price ?? 8;
  return Math.max(1, base - (hasSouvenir(tour, "oil-can") ? ECONOMY.oilCan : 0));
}

export function garageOffer(tour: TourState): OfferView<UpgradeId>[] {
  const ids = (tour.station?.offer ?? []) as UpgradeId[];
  return ids.map((id) => {
    const price = upgradePrice(tour, id);
    const owned = tour.upgrades.includes(id);
    const affordable = tour.marks >= price;
    return {
      id, name: UPGRADE_DEFS[id].name, text: UPGRADE_DEFS[id].text, price, owned, affordable,
      reason: owned ? "Schon eingebaut" : affordable ? undefined : `Kostet ${price} Mark`,
    };
  });
}

/** Fit an upgrade (it stays for the tour). The aux tank adds two strokes and comes full. */
export function buyUpgrade(tour: TourState, env: TourEnv, id: UpgradeId): ShopResult {
  const offer = (tour.station?.offer ?? []) as string[];
  if (!offer.includes(id)) return { ok: false, reason: "Hat die Werkstatt nicht da" };
  if (tour.upgrades.includes(id)) return { ok: false, reason: "Schon eingebaut" };
  if (!upgradeAllowed(tour, id)) return { ok: false, reason: `Passt nicht ans ${VEHICLE_DEFS[tour.vehicle].name}` };
  const price = upgradePrice(tour, id);
  if (tour.marks < price) return { ok: false, reason: `Kostet ${price} Mark` };
  addMarks(tour, -price);
  tour.upgrades.push(id);
  if (id === "aux-tank") {
    tour.fuelMax += 2;
    gainFuel(tour, 2);
  }
  remember(tour, `bought:${id}`);
  const line = `${where(tour, env, "Werkstatt")}: ${UPGRADE_DEFS[id].name} eingebaut, ${markWord(-price)}`;
  log(tour, line);
  return { ok: true, line };
}

/** Fuel at the garage: price per stroke and how many strokes he can buy right now. */
export function fuelOffer(tour: TourState): { price: number; max: number } {
  const room = tour.fuelMax - tour.fuel;
  return { price: ECONOMY.fuelPrice, max: Math.max(0, Math.min(room, Math.floor(tour.marks / ECONOMY.fuelPrice))) };
}

export function buyFuel(tour: TourState, env: TourEnv, strokes = 1): ShopResult {
  const { price, max } = fuelOffer(tour);
  const n = Math.min(strokes, max);
  if (n <= 0) return { ok: false, reason: tour.fuel >= tour.fuelMax ? "Der Tank ist voll" : `Ein Strich kostet ${price} Mark` };
  addMarks(tour, -n * price);
  gainFuel(tour, n);
  remember(tour, "fuel");
  const line = `${where(tour, env, "Werkstatt")}: ${STROKES(n)} getankt, ${markWord(-n * price)}`;
  log(tour, line);
  return { ok: true, line };
}

// ─── dog meadow ───────────────────────────────────────────────────────────────────────────────────────────

/** Up to two dogs from the Tourenbuch that are not aboard (the shepherd is always unlocked). */
export function rollDogOffer(tour: TourState, env: Pick<TourEnv, "book">): DogId[] {
  const unlocked = env.book ? unlockedDogs(env.book) : (["shepherd"] as DogId[]);
  const rng = rngFor(tour.seed, tour.stage, tour.at, "dogs");
  return rng.shuffle(DOGS.filter((d) => unlocked.includes(d) && !tour.dogs.includes(d))).slice(0, 2);
}

export function dogOffer(tour: TourState, env: TourEnv): OfferView<DogId>[] {
  const ids = (tour.station?.offer ?? []) as DogId[];
  return ids.map((id) => ({
    id,
    name: `${dogName(env.profile, id)}, ${DOG_DEFS[id].breed}`,
    text: DOG_DEFS[id].ability,
    price: 0,
    owned: tour.dogs.includes(id),
    affordable: true,
    reason: tour.dogs.includes(id) ? "Fährt schon mit" : undefined,
  }));
}

/** Take an offered dog; when every seat is taken, `swapOut` names the dog who stays at the meadow (and goes home). */
export function takeDog(tour: TourState, env: TourEnv, id: DogId, swapOut?: DogId): ShopResult {
  const offer = (tour.station?.offer ?? []) as string[];
  if (!offer.includes(id)) return { ok: false, reason: "Der ist nicht auf der Wiese" };
  if (tour.dogs.includes(id)) return { ok: false, reason: "Fährt schon mit" };
  if (tour.dogs.length >= dogSlots(tour)) {
    if (!swapOut || !tour.dogs.includes(swapOut)) return { ok: false, needsReplace: true, reason: "Kein Platz mehr: tauschen?" };
    tour.dogs = tour.dogs.filter((d) => d !== swapOut);
  }
  tour.dogs.push(id);
  remember(tour, `dog:${id}`);
  const swap = swapOut ? `, ${dogName(env.profile, swapOut)} fährt heim` : "";
  const line = `${where(tour, env, "Hundewiese")}: ${dogName(env.profile, id)} fährt mit${swap}`;
  log(tour, line);
  return { ok: true, line };
}
