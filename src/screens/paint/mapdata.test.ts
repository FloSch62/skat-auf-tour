// The map painter keeps its own copy of the place positions; they must match the place pack.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAP_PLACES } from "./mapdata.ts";

interface PackPlace {
  id: string;
  x: number;
  y: number;
}
const pack = JSON.parse(readFileSync(new URL("../../../public/packs/enztal/pack.json", import.meta.url), "utf8")) as {
  regions: { id: string; places: PackPlace[] }[];
};

test("map place constants match pack.json", () => {
  const regions = Object.keys(MAP_PLACES).sort();
  assert.deepEqual(regions, pack.regions.map((r) => r.id).sort());
  for (const r of pack.regions) {
    const mine = new Map((MAP_PLACES[r.id as keyof typeof MAP_PLACES] as readonly (readonly [string, number, number])[]).map((q) => [q[0], q]));
    assert.equal(mine.size, r.places.length, `${r.id}: number of places`);
    for (const pl of r.places) {
      const q = mine.get(pl.id);
      assert.ok(q, `${r.id}/${pl.id} missing in mapdata.ts`);
      assert.equal(q[1], pl.x, `${r.id}/${pl.id} x`);
      assert.equal(q[2], pl.y, `${r.id}/${pl.id} y`);
    }
  }
});
