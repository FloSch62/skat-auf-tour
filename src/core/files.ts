// File export/import for backups and the personal profile. The browser's own file dialog is the one unavoidable
// piece of browser chrome (contract §4.1: Export und Import als Datei); everything else stays in the canvas.

/** Offer `data` as a JSON file download. */
export function downloadJson(fileName: string, data: unknown) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  } catch {
    /* ignore */
  }
}

/** Let the player choose a JSON file; resolves null when cancelled or unreadable. */
export function pickJsonFile(): Promise<unknown | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    let settled = false;
    const done = (v: unknown | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(v);
    };
    input.addEventListener("change", async () => {
      const f = input.files?.[0];
      if (!f) return done(null);
      try {
        done(JSON.parse(await f.text()));
      } catch {
        done(null);
      }
    });
    input.addEventListener("cancel", () => done(null));
    document.body.appendChild(input);
    input.click();
  });
}

const PREFIX = "sat.";

/** Everything the game keeps in the browser (settings, profile, Tourenbuch, running tour) as one object. */
export function collectBackup(): { app: string; version: number; date: string; data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      try {
        data[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k) ?? "null");
      } catch {
        /* skip */
      }
    }
  } catch {
    /* storage blocked */
  }
  return { app: "skat-auf-tour", version: 1, date: new Date().toISOString().slice(0, 10), data };
}

/** Restore a backup made by collectBackup. Returns false when the file is not one. */
export function restoreBackup(b: unknown): boolean {
  const o = b as { app?: string; data?: Record<string, unknown> } | null;
  if (!o || o.app !== "skat-auf-tour" || !o.data || typeof o.data !== "object") return false;
  try {
    for (const [k, v] of Object.entries(o.data)) localStorage.setItem(PREFIX + k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
