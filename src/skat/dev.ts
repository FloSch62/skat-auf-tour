// Dev scenes of the Skat area: src/dev.ts collects only top-level folders, so this file gathers the nested ones
// (src/skat/table/dev.ts, src/skat/problems/dev.ts, and src/skat/ai/dev.ts when the AI workstream adds one).
import type { DevFactory } from "../dev";

const modules = import.meta.glob<{ dev: Record<string, DevFactory> }>("./*/dev.ts", { eager: true });

export const dev: Record<string, DevFactory> = {};
for (const m of Object.values(modules)) Object.assign(dev, m.dev ?? {});
