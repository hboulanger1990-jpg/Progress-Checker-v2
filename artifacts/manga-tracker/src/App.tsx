import { useState, useEffect } from "react";
import type { MangaEntry, VolumeStatus } from "./types";
import {
  loadAllManga,
  saveAllManga,
  createManga,
  updateMangaVolume,
} from "./storage";
import HomeScreen from "./components/HomeScreen";
import DetailScreen from "./components/DetailScreen";

type View = { screen: "home" } | { screen: "detail"; id: string };

export default function App() {
  const [entries, setEntries] = useState<MangaEntry[]>(() => loadAllManga());
  const [view, setView] = useState<View>({ screen: "home" });
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    saveAllManga(entries);
  }, [entries]);

  function navigateTo(next: View) {
    setTransitioning(true);
    setTimeout(() => {
      setView(next);
      setTransitioning(false);
    }, 120);
  }

  function handleAddManga(title: string, totalVolumes: number) {
    const newEntry = createManga(title, totalVolumes);
    setEntries((prev) => [newEntry, ...prev]);
  }

  function handleImport(imported: MangaEntry[]) {
    setEntries(imported.sort((a, b) => b.updatedAt - a.updatedAt));
  }

  function getDetail(): MangaEntry | undefined {
    if (view.screen !== "detail") return undefined;
    return entries.find((e) => e.id === view.id);
  }

  function handleVolumeChange(vol: number, status: VolumeStatus) {
    if (view.screen !== "detail") return;
    const id = view.id;
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? updateMangaVolume(e, vol, status) : e))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    );
  }

  function handleEdit(title: string, totalVolumes: number) {
    if (view.screen !== "detail") return;
    const id = view.id;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, title, totalVolumes, updatedAt: Date.now() } : e
      ).sort((a, b) => b.updatedAt - a.updatedAt)
    );
  }

  function handleDelete() {
    if (view.screen !== "detail") return;
    const id = view.id;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    navigateTo({ screen: "home" });
  }

  const detail = getDetail();

  return (
    <div className={`transition-opacity duration-150 ${transitioning ? "opacity-0" : "opacity-100"}`}>
      {view.screen === "home" && (
        <HomeScreen
          entries={entries}
          onSelect={(entry) => navigateTo({ screen: "detail", id: entry.id })}
          onAdd={handleAddManga}
          onImport={handleImport}
        />
      )}
      {view.screen === "detail" && detail && (
        <DetailScreen
          entry={detail}
          onBack={() => navigateTo({ screen: "home" })}
          onVolumeChange={handleVolumeChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
