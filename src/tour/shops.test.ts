import { test } from "node:test";
import assert from "node:assert/strict";
import type { MapNode } from "../game/types.ts";
import { SOUVENIRS } from "../game/ids.ts";
import {
  buyFuel, buySouvenir, buyUpgrade, dogOffer, fuelOffer, garageOffer, marketOffer, placeSouvenir, rollDogOffer,
  rollGarageOffer, rollMarketOffer, takeDog, upgradePrice,
} from "./shops.ts";
import { souvenirSlots, dogSlots } from "./ledger.ts";
import { newTour } from "./state.ts";
import { testEnv } from "./testkit.ts";

function at(kind: MapNode["kind"], vehicle: "camper" | "sidecar-rig" = "camper") {
  const env = testEnv();
  env.book!.unlocks.sidecarRig = true;
  const t = newTour({ seed: 8, difficulty: "sporty", vehicle, dogs: ["shepherd"], pack: env.pack, profile: env.profile, book: env.book });
  const node = t.map.nodes.find((n) => n.col === 2)!;
  node.kind = kind;
  t.at = node.id;
  t.station = { node: node.id, done: ["arrived"] };
  return { t, env };
}

test("flea market: three souvenirs not owned, prices 2–6, buying, slots and swapping", () => {
  const { t, env } = at("market");
  t.souvenirs = ["thermos"];
  const offer = rollMarketOffer(t);
  assert.equal(offer.length, 3);
  assert.ok(!offer.includes("thermos"));
  assert.deepEqual(rollMarketOffer(t), offer, "stable per station");
  t.station!.offer = offer;
  const view = marketOffer(t);
  assert.ok(view.every((v) => v.price >= 2 && v.price <= 6));
  t.marks = 30;
  const r = buySouvenir(t, env, offer[0]);
  assert.ok(r.ok);
  assert.match(r.line!, /^Flohmarkt in .+: .+ gekauft, –\d Mark$/);
  assert.ok(env.book!.souvenirs.includes(offer[0]), "Andenken-Sammlung");
  assert.equal(buySouvenir(t, env, offer[0]).ok, false);
  const fillers = SOUVENIRS.filter((x) => !offer.includes(x)).slice(0, 4);
  t.souvenirs = fillers;
  const full = buySouvenir(t, env, offer[1]);
  assert.equal(full.ok, false);
  assert.ok(full.needsReplace);
  const sw = buySouvenir(t, env, offer[1], fillers[0]);
  assert.ok(sw.ok);
  assert.equal(t.souvenirs.length, 4);
  assert.ok(!t.souvenirs.includes(fillers[0]));
  t.marks = 0;
  assert.equal(buySouvenir(t, env, offer[2], fillers[1]).reason?.startsWith("Kostet"), true);
  assert.ok(placeSouvenir(t, env, offer[2], fillers[1]).ok);
});

test("slots: camper 4 (+2 roof box), rig 2; dogs 2 (+1 dog bed), rig 1", () => {
  const c = at("market").t;
  assert.equal(souvenirSlots(c), 4);
  c.upgrades.push("roof-box", "dog-bed");
  assert.equal(souvenirSlots(c), 6);
  assert.equal(dogSlots(c), 3);
  const r = at("market", "sidecar-rig").t;
  assert.equal(souvenirSlots(r), 2);
  assert.equal(dogSlots(r), 1);
});

test("garage: up to three upgrades, the oil can, the rig only fits the aux tank, fuel for 3 Mark", () => {
  const { t, env } = at("garage");
  const offer = rollGarageOffer(t);
  assert.equal(offer.length, 3);
  t.station!.offer = offer;
  t.marks = 40;
  const view = garageOffer(t);
  assert.ok(view.every((v) => v.price >= 6 && v.price <= 12));
  t.station!.offer = ["aux-tank", "fridge"];
  t.souvenirs.push("oil-can");
  assert.equal(upgradePrice(t, "aux-tank"), 8);
  const before = t.fuelMax;
  t.fuel = 3;
  assert.ok(buyUpgrade(t, env, "aux-tank").ok);
  assert.equal(t.fuelMax, before + 2);
  assert.equal(t.fuel, 5);
  assert.equal(t.marks, 32);
  assert.equal(buyUpgrade(t, env, "aux-tank").ok, false);
  t.fuel = 2;
  assert.deepEqual(fuelOffer(t), { price: 3, max: 5 });
  const f = buyFuel(t, env, 2);
  assert.ok(f.ok);
  assert.equal(t.fuel, 4);
  assert.match(f.line!, /2 Striche getankt, –6 Mark/);
  const rig = at("garage", "sidecar-rig");
  assert.deepEqual(rollGarageOffer(rig.t), ["aux-tank"]);
  rig.t.station!.offer = ["fridge"];
  assert.equal(buyUpgrade(rig.t, rig.env, "fridge").ok, false);
});

test("dog meadow: unlocked dogs only, take or swap", () => {
  const { t, env } = at("dogs");
  assert.deepEqual(rollDogOffer(t, env), [], "only the shepherd is unlocked, and he is aboard");
  env.book!.dogs.push("airedale", "schnauzer-a", "wolfhound-b");
  const offer = rollDogOffer(t, env);
  assert.equal(offer.length, 2);
  assert.ok(!offer.includes("shepherd"));
  t.station!.offer = offer;
  assert.ok(dogOffer(t, env)[0].name.includes(","));
  assert.ok(takeDog(t, env, offer[0]).ok);
  assert.equal(t.dogs.length, 2);
  const full = takeDog(t, env, offer[1]);
  assert.ok(full.needsReplace);
  const sw = takeDog(t, env, offer[1], "shepherd");
  assert.ok(sw.ok);
  assert.match(sw.line!, /fährt mit, Hasso fährt heim$/);
  assert.deepEqual(t.dogs, [offer[0], offer[1]]);
});
