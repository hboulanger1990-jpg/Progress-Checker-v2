import type { MangaEntry, VolumeStatus } from "./types";

const STORAGE_KEY = "manga-tracker-v2";

export function loadAllManga(): MangaEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MangaEntry[];
      return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  } catch {}
  return [];
}

export function saveAllManga(entries: MangaEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function createManga(title: string, totalVolumes: number): MangaEntry {
  return {
    id: crypto.randomUUID(),
    title,
    totalVolumes,
    statuses: {},
    updatedAt: Date.now(),
  };
}

export function updateMangaVolume(
  entry: MangaEntry,
  vol: number,
  status: VolumeStatus
): MangaEntry {
  const statuses = { ...entry.statuses };
  if (status === "unowned") {
    delete statuses[vol];
  } else {
    statuses[vol] = status;
  }
  return { ...entry, statuses, updatedAt: Date.now() };
}

export function calcProgress(entry: MangaEntry): {
  owned: number;
  read: number;
  total: number;
  percent: number;
} {
  const owned = Object.values(entry.statuses).filter((s) => s === "owned").length;
  const read = Object.values(entry.statuses).filter((s) => s === "read").length;
  const total = owned + read;
  const percent = entry.totalVolumes > 0 ? Math.round((read / entry.totalVolumes) * 100) : 0;
  return { owned, read, total, percent };
}

export function exportAllToJson(entries: MangaEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function importFromJson(json: string): MangaEntry[] | null {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed as MangaEntry[];
  } catch {
    return null;
  }
}
