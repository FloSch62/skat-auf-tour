// All event decks, merged (contract §4.10). The tour draws random events by `pool` (+ `region` for "region",
// `requires`, `weight`; no repeats within a tour) and reaches "chain" events only by id (`next`, `skat.onWin`,
// `skat.onLose`). Each deck file also lists the flags it sets or reads.
import type { EventDef } from "../../game/types.ts";
import { ENZTAL_EVENTS, ENZTAL_FLAGS } from "./enztal.ts";
import { MUEHLACKER_EVENTS, MUEHLACKER_FLAGS } from "./muehlacker.ts";
import { SCHWARZWALD_EVENTS, SCHWARZWALD_FLAGS } from "./schwarzwald.ts";
import { STUTTGART_EVENTS, STUTTGART_FLAGS } from "./stuttgart.ts";
import { ANYWHERE_EVENTS, ANYWHERE_FLAGS } from "./anywhere.ts";
import { DOG_EVENTS, DOG_FLAGS } from "./dogs.ts";
import { BIKE_EVENTS, BIKE_FLAGS } from "./bike.ts";
import { RATHAUS_EVENTS, RATHAUS_FLAGS } from "./rathaus.ts";

export { EVENT_ART, EVENT_ART_IDS } from "./art.ts";
export type { EventArtId } from "./art.ts";

/** The decks by file name (used by the content test for partial checks). */
export const EVENT_DECKS: Record<string, EventDef[]> = {
  enztal: ENZTAL_EVENTS,
  muehlacker: MUEHLACKER_EVENTS,
  schwarzwald: SCHWARZWALD_EVENTS,
  stuttgart: STUTTGART_EVENTS,
  anywhere: ANYWHERE_EVENTS,
  dogs: DOG_EVENTS,
  bike: BIKE_EVENTS,
  rathaus: RATHAUS_EVENTS,
};

/**
 * Decks on top of the Alpha quota of contract §4.10 (108 = 4 × 16 + 20 + 12 + 12). Their events are drawn like the
 * others of their pool; the content test counts them separately.
 */
export const EXTRA_DECKS = ["rathaus"] as const;

export const ALL_EVENTS: EventDef[] = Object.values(EVENT_DECKS).flat();

/** Every tour flag the events set or read, with a one-line meaning. */
export const ALL_FLAGS: Record<string, string> = {
  ...ENZTAL_FLAGS, ...MUEHLACKER_FLAGS, ...SCHWARZWALD_FLAGS, ...STUTTGART_FLAGS, ...ANYWHERE_FLAGS, ...DOG_FLAGS,
  ...BIKE_FLAGS, ...RATHAUS_FLAGS,
};

/** The examples of contract §4.10 (and the profile event "Werkstor"), by id. */
export const REQUIRED_EVENT_IDS = [
  "any-kehrwoche", "any-stau", "any-hocketse", "any-tramper", "any-regen", "any-kontrolle", "any-werkstor",
  "enz-besen", "enz-falsches-vaihingen", "mue-schafherde", "mue-mostfass", "swa-brennerei", "dog-besuch",
  "dog-tierschutz", "dog-nachbarin", "chain-ungarn-grenze", "chain-ungarn-tierheim", "bike-auspuff", "bike-mofa-rocker", "rat-pokal",
] as const;

export function eventById(id: string): EventDef | undefined {
  return ALL_EVENTS.find((e) => e.id === id);
}
