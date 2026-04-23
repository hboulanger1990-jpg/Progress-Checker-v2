import { useState, useEffect, useCallback } from "react";
import type { AccentColor, Folder, Work, Section } from "./types";
import { loadFolders, saveFolders, loadFoldersFromCloud, saveFoldersToCloud } from "./storage";
import { supabase } from "./lib/supabase";
import FolderListScreen from "./screens/FolderListScreen";
import WorkListScreen from "./screens/WorkListScreen";
import WorkDetailScreen from "./screens/WorkDetailScreen";
import type { User } from "@supabase/supabase-js";

type View =
  | { screen: "folders" }
  | { screen: "works"; folderId: string }
  | { screen: "detail"; folderId: string; workId: string };

export default function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [view, setView] = useState<View>({ screen: "folders" });
  const [fading, setFading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- Auth ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
   const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
    setUser((prev) => {
      const next = session?.user ?? null;
      if (prev?.id === next?.id) return prev;
      return next;
    });
  }
});

  // ---- Load data ----
  useEffect(() => {
    async function load() {
      setLoading(true);
      if (user) {
        const cloud = await loadFoldersFromCloud(user.id);
        if (cloud) {
          setFolders(cloud);
        } else {
          const local = loadFolders();
          setFolders(local);
          if (local.length > 0) await saveFoldersToCloud(user.id, local);
        }
      } else {
        setFolders(loadFolders());
      }
      setLoading(false);
    }
    load();
  }, [user?.id]);

  // ---- Save data ----
  useEffect(() => {
    if (loading) return;
    saveFolders(folders);
    if (user) saveFoldersToCloud(user.id, folders);
  }, [folders]);

  // ---- Google login ----
  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // ---- History management ----
  const applyView = useCallback((next: View) => {
    setFading(true);
    setTimeout(() => { setView(next); setFading(false); }, 110);
  }, []);

  useEffect(() => {
    history.replaceState({ screen: "folders" } satisfies View, "");
    function handlePop(e: PopStateEvent) {
      const v = e.state as View | null;
      applyView(v?.screen ? v : { screen: "folders" });
    }
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [applyView]);

  function navigate(next: View) {
    history.pushState(next, "");
    applyView(next);
  }

  function goBack() {
    history.back();
  }

  function mutate(updater: (prev: Folder[]) => Folder[]) {
    setFolders((prev) => {
      const next = updater(prev);
      saveFolders(next);
      return next;
    });
  }

  // ---- Folder CRUD ----
  function addFolder(title: string, color: AccentColor, defaultLabelUnread: string, defaultLabelRead: string, defaultUnit: string, folderType: "progress" | "completion") {
    const f: Folder = { id: crypto.randomUUID(), title, accentColor: color, defaultLabelUnread, defaultLabelRead, defaultUnit, folderType, works: [], updatedAt: Date.now() };
    mutate((prev) => [f, ...prev]);
  }
  function editFolder(id: string, title: string, color: AccentColor, defaultLabelUnread: string, defaultLabelRead: string, defaultUnit: string, folderType: "progress" | "completion") {
    mutate((prev) => prev.map((f) => f.id === id ? { ...f, title, accentColor: color, defaultLabelUnread, defaultLabelRead, defaultUnit, folderType, updatedAt: Date.now() } : f));
  }
  function deleteFolder(id: string) {
    mutate((prev) => prev.filter((f) => f.id !== id));
  }

  // ---- Work CRUD ----
  function addWork(folderId: string, data: { title: string; accentColor: AccentColor; labelUnread: string; labelRead: string; unit: string; sectionLabel: string; tags: string[]; }) {
    const work: Work = { ...data, id: crypto.randomUUID(), sections: [], updatedAt: Date.now() };
    mutate((prev) => prev.map((f) => f.id !== folderId ? f : { ...f, works: [work, ...f.works], updatedAt: Date.now() }));
  }
  function editWork(folderId: string, workId: string, updates: Partial<Pick<Work, "title" | "accentColor" | "labelUnread" | "labelRead" | "unit" | "sectionLabel" | "tags" | "completed">>) {
    mutate((prev) => prev.map((f) => f.id !== folderId ? f : { ...f, updatedAt: Date.now(), works: f.works.map((w) => w.id !== workId ? w : { ...w, ...updates, updatedAt: Date.now() }).sort((a, b) => b.updatedAt - a.updatedAt) }));
  }
  function deleteWork(folderId: string, workId: string) {
    mutate((prev) => prev.map((f) => f.id !== folderId ? f : { ...f, works: f.works.filter((w) => w.id !== workId), updatedAt: Date.now() }));
  }

  // ---- Section CRUD ----
  function addSection(folderId: string, workId: string, s: Omit<Section, "id" | "statuses">) {
    const section: Section = { ...s, id: crypto.randomUUID(), statuses: {} };
    mutate((prev) => prev.map((f) => f.id !== folderId ? f : { ...f, updatedAt: Date.now(), works: f.works.map((w) => w.id !== workId ? w : { ...w, sections: [...w.sections, section], updatedAt: Date.now() }).sort((a, b) => b.updatedAt - a.updatedAt) }));
  }
  function editSection(folderId: string, workId: string, sectionId: string, updates: Partial<Pick<Section, "label" | "startNum" | "endNum" | "mode" | "items">>) {
    mutate((prev) => prev.map((f) => f.id !== folderId ? f : { ...f, updatedAt: Date.now(), works: f.works.map((w) => w.id !== workId ? w : { ...w, updatedAt: Date.now(), sections: w.sections.map((s) => s.id !== sectionId ? s : { ...s, ...updates }) }).sort((a, b) => b.updatedAt - a.updatedAt) }));
  }
  function deleteSection(folderId: string, workId: string, sectionId: string) {
    mutate((prev) => prev.map((f) => f.id !== folderId ? f : { ...f, updatedAt: Date.now(), works: f.works.map((w) => w.id !== workId ? w : { ...w, updatedAt: Date.now(), sections: w.sections.filter((s) => s.id !== sectionId) }).sort((a, b) => b.updatedAt - a.updatedAt) }));
  }

  // ---- Item toggle ----
  function toggleItem(folderId: string, workId: string, sectionId: string, num: number) {
    mutate((prev) => prev.map((f) => f.id !== folderId ? f : { ...f, updatedAt: Date.now(), works: f.works.map((w) => w.id !== workId ? w : { ...w, updatedAt: Date.now(), sections: w.sections.map((s) => { if (s.id !== sectionId) return s; const next = { ...s.statuses }; if (next[num]) delete next[num]; else next[num] = "read"; return { ...s, statuses: next }; }) }).sort((a, b) => b.updatedAt - a.updatedAt) }));
  }

  // ---- Bulk range ----
  function bulkRange(folderId: string, workId: string, start: number, end: number, toRead: boolean) {
    mutate((prev) => prev.map((f) => f.id !== folderId ? f : { ...f, updatedAt: Date.now(), works: f.works.map((w) => w.id !== workId ? w : { ...w, updatedAt: Date.now(), sections: w.sections.map((s) => { const next = { ...s.statuses }; for (let n = Math.max(start, s.startNum); n <= Math.min(end, s.endNum); n++) { if (toRead) next[n] = "read"; else delete next[n]; } return { ...s, statuses: next }; }) }).sort((a, b) => b.updatedAt - a.updatedAt) }));
  }

  // ---- Import ----
  function importHandler(data: Folder[]) {
    const sorted = [...data].sort((a, b) => b.updatedAt - a.updatedAt);
    setFolders(sorted);
    saveFolders(sorted);
    navigate({ screen: "folders" });
  }

  const currentFolder = view.screen !== "folders" ? folders.find((f) => f.id === (view as { folderId: string }).folderId) : undefined;
  const currentWork = view.screen === "detail" && currentFolder ? currentFolder.works.find((w) => w.id === (view as { workId: string }).workId) : undefined;

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", color: "#ccc" }}>読み込み中...</div>;

  return (
    <div style={{ opacity: fading ? 0 : 1, transition: "opacity 0.11s ease" }}>
      {/* ログインボタン */}
      <div style={{ position: "fixed", top: 12, right: 12, zIndex: 1000 }}>
        {user ? (
          <button onClick={signOut} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "#333", color: "#ccc", border: "1px solid #555", cursor: "pointer" }}>
            ログアウト
          </button>
        ) : (
          <button onClick={signInWithGoogle} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "#333", color: "#ccc", border: "1px solid #555", cursor: "pointer" }}>
            Googleでログイン
          </button>
        )}
      </div>

      {view.screen === "folders" && (
        <FolderListScreen
          folders={folders}
          onSelect={(f) => navigate({ screen: "works", folderId: f.id })}
          onAdd={addFolder}
          onEdit={editFolder}
          onDelete={deleteFolder}
          onImport={importHandler}
        />
      )}
      {view.screen === "works" && currentFolder && (
        <WorkListScreen
          folder={currentFolder}
          onBack={goBack}
          onSelect={(w) => navigate({ screen: "detail", folderId: currentFolder.id, workId: w.id })}
          onAdd={(data) => addWork(currentFolder.id, data)}
          onEdit={(wId, updates) => editWork(currentFolder.id, wId, updates)}
          onDelete={(wId) => deleteWork(currentFolder.id, wId)}
          onToggleCompletion={(wId) => editWork(currentFolder.id, wId, { completed: !currentFolder.works.find(w => w.id === wId)?.completed })}
        />
      )}
      {view.screen === "detail" && currentFolder && currentWork && (
        <WorkDetailScreen
          folder={currentFolder}
          work={currentWork}
          onBack={goBack}
          onEditWork={(updates) => editWork(currentFolder.id, currentWork.id, updates)}
          onDeleteWork={() => { deleteWork(currentFolder.id, currentWork.id); navigate({ screen: "works", folderId: currentFolder.id }); }}
          onAddSection={(s) => addSection(currentFolder.id, currentWork.id, s)}
          onEditSection={(sId, u) => editSection(currentFolder.id, currentWork.id, sId, u)}
          onDeleteSection={(sId) => deleteSection(currentFolder.id, currentWork.id, sId)}
          onToggleItem={(sId, n) => toggleItem(currentFolder.id, currentWork.id, sId, n)}
          onBulkRange={(s, e, r) => bulkRange(currentFolder.id, currentWork.id, s, e, r)}
        />
      )}
    </div>
  );
}
