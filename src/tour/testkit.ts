// Node-only helpers for tests and headless runs: the real place pack and the neutral profile from public/, and an
// environment builder. Never imported by game code (it reads files with node:fs).
import { readFileSync } from "node:fs";
import type { PlacePack, Profile } from "../game/types.ts";
import { newBook } from "./book.ts";
import { FIXTURE_EVENTS } from "./fixtures.ts";
import type { TourEnv } from "./util.ts";

const ROOT = new URL("../../", import.meta.url);

export function loadPack(): PlacePack {
  return JSON.parse(readFileSync(new URL("public/packs/enztal/pack.json", ROOT), "utf8")) as PlacePack;
}

export function loadDefaultProfile(): Profile {
  return JSON.parse(readFileSync(new URL("public/profile.default.json", ROOT), "utf8")) as Profile;
}

export function testEnv(over: Partial<TourEnv> = {}): TourEnv {
  return {
    pack: loadPack(),
    profile: loadDefaultProfile(),
    name: "Karl",
    events: FIXTURE_EVENTS,
    book: newBook(),
    today: "1983-06-12",
    ...over,
  };
}
