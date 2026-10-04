// The loaded world: place pack and profile (contract §8). The game knows no places and no names of its own.
// The personal profile is imported once as a file (Einstellungen → Profil laden) and kept in the browser; without it
// the neutral default profile applies.
import { loadJson } from "../core/assets";
import { loadSaved, saveJson } from "../core/save";
import type { PlaceDef, PlacePack, Profile, RegionDef } from "./types";
import type { DogId, RegionId } from "./ids";

let pack: PlacePack = { id: "none", title: "SKAT AUF TOUR", subtitle: "", regions: [] };
let defaultProfile: Profile = { home: "", partner: "", child: "", van: "", bike: "", deck: "french", dogs: {}, notes: {} };
let profile: Profile = defaultProfile;

export async function loadWorld(): Promise<void> {
  const [p, d] = await Promise.all([loadJson<PlacePack>("packs/enztal/pack.json"), loadJson<Profile>("profile.default.json")]);
  if (p) pack = p;
  if (d) defaultProfile = d;
  const saved = loadSaved<Partial<Profile>>("profile");
  profile = saved ? normaliseProfile(saved) : defaultProfile;
}

export function normaliseProfile(p: Partial<Profile>): Profile {
  return {
    ...defaultProfile,
    ...p,
    dogs: { ...defaultProfile.dogs, ...(p.dogs ?? {}) },
    notes: { ...(p.notes ?? {}) },
  };
}

/** Replace the profile (import) and keep it in the browser. */
export function setProfile(p: Partial<Profile>) {
  profile = normaliseProfile(p);
  saveJson("profile", profile);
}

export function getPack(): PlacePack {
  return pack;
}

export function getProfile(): Profile {
  return profile;
}

/** Inject a pack and profile directly (node tests, headless runs). */
export function setWorld(p: PlacePack, prof: Profile) {
  pack = p;
  defaultProfile = prof;
  profile = prof;
}

export function region(id: RegionId): RegionDef | undefined {
  return pack.regions.find((r) => r.id === id);
}

export function place(id: string): PlaceDef | undefined {
  for (const r of pack.regions) {
    const p = r.places.find((q) => q.id === id);
    if (p) return p;
  }
  return undefined;
}

export function placeName(id: string): string {
  return place(id)?.name ?? id;
}

export function regionOfPlace(id: string): RegionId | undefined {
  return pack.regions.find((r) => r.places.some((q) => q.id === id))?.id;
}

/** The home region (stage 1 of every tour). */
export function homeRegion(): RegionId {
  return regionOfPlace(profile.home) ?? pack.regions[0]?.id ?? "enztal";
}

export function dogName(id: DogId): string {
  return profile.dogs[id] ?? id;
}
