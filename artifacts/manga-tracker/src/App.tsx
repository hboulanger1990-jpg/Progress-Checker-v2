import { useState, useEffect, useCallback } from "react";
import type { AccentColor, Folder, Work, Section } from "./types";
import { loadFolders, saveFolders } from "./storage";
import FolderListScreen from "./screens/FolderListScreen";
import WorkListScreen from "./screens/WorkListScreen";
import WorkDetailScreen from "./screens/WorkDetailScreen";

type View =
  | { screen: "folders" }
  | { screen: "works"; folderId: string }
  | { screen: "detail"; folderId: string; workId: string };

export default function App() {
  const [folders, setFolders] = useState<Folder[]>(() => loadFolders());
  const [view, setView] = useState<View>({ screen: "folders" });
  const [fading, setFading] = useState(false);

  useEffect(() => { saveFolders(folders); }, [folders]);

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
  function addFolder(
    title: string,
    color: AccentColor,
    defaultLabelUnread: string,
    defaultLabelRead: string,
    defaultUnit: string
  ) {
    const f: Folder = {
      id: crypto.randomUUID(),
      title,
      accentColor: color,
      defaultLabelUnread,
      defaultLabelRead,
      defaultUnit,
      works: [],
      updatedAt: Date.now(),
    };
    mutate((prev) => [f, ...prev]);
  }
  function editFolder(
    id: string,
    title: string,
    color: AccentColor,
    defaultLabelUnread: string,
    defaultLabelRead: string,
    defaultUnit: string
  ) {
    mutate((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, title, accentColor: color, defaultLabelUnread, defaultLabelRead, defaultUnit, updatedAt: Date.now() }
          : f
      )
    );
  }
  function deleteFolder(id: string) {
    mutate((prev) => prev.filter((f) => f.id !== id));
  }

  // ---- Work CRUD ----
  function addWork(
    folderId: string,
    data: {
      title: string;
      accentColor: AccentColor;
      labelUnread: string;
      labelRead: string;
      unit: string;
      sectionLabel: string;
    }
  ) {
    const work: Work = { ...data, id: crypto.randomUUID(), sections: [], updatedAt: Date.now() };
    mutate((prev) =>
      prev.map((f) =>
        f.id !== folderId ? f : { ...f, works: [work, ...f.works], updatedAt: Date.now() }
      )
    );
  }
  function editWork(
    folderId: string,
    workId: string,
    updates: Partial<Pick<Work, "title" | "accentColor" | "labelUnread" | "labelRead" | "unit" | "sectionLabel">>
  ) {
    mutate((prev) =>
      prev.map((f) =>
        f.id !== folderId
          ? f
          : {
              ...f,
              updatedAt: Date.now(),
              works: f.works
                .map((w) => (w.id !== workId ? w : { ...w, ...updates, updatedAt: Date.now() }))
                .sort((a, b) => b.updatedAt - a.updatedAt),
            }
      )
    );
  }
  function deleteWork(folderId: string, workId: string) {
    mutate((prev) =>
      prev.map((f) =>
        f.id !== folderId
          ? f
          : { ...f, works: f.works.filter((w) => w.id !== workId), updatedAt: Date.now() }
      )
    );
  }

  // ---- Section CRUD ----
  function addSection(folderId: string, workId: string, s: Omit<Section, "id" | "statuses">) {
    const section: Section = { ...s, id: crypto.randomUUID(), statuses: {} };
    mutate((prev) =>
      prev.map((f) =>
        f.id !== folderId
          ? f
          : {
              ...f,
              updatedAt: Date.now(),
              works: f.works
                .map((w) =>
                  w.id !== workId ? w : { ...w, sections: [...w.sections, section], updatedAt: Date.now() }
                )
                .sort((a, b) => b.updatedAt - a.updatedAt),
            }
      )
    );
  }
  function editSection(
    folderId: string,
    workId: string,
    sectionId: string,
    updates: Partial<Pick<Section, "label" | "startNum" | "endNum">>
  ) {
    mutate((prev) =>
      prev.map((f) =>
        f.id !== folderId
          ? f
          : {
              ...f,
              updatedAt: Date.now(),
              works: f.works
                .map((w) =>
                  w.id !== workId
                    ? w
                    : {
                        ...w,
                        updatedAt: Date.now(),
                        sections: w.sections.map((s) =>
                          s.id !== sectionId ? s : { ...s, ...updates }
                        ),
                      }
                )
                .sort((a, b) => b.updatedAt - a.updatedAt),
            }
      )
    );
  }
  function deleteSection(folderId: string, workId: string, sectionId: string) {
    mutate((prev) =>
      prev.map((f) =>
        f.id !== folderId
          ? f
          : {
              ...f,
              updatedAt: Date.now(),
              works: f.works
                .map((w) =>
                  w.id !== workId
                    ? w
                    : {
                        ...w,
                        updatedAt: Date.now(),
                        sections: w.sections.filter((s) => s.id !== sectionId),
                      }
                )
                .sort((a, b) => b.updatedAt - a.updatedAt),
            }
      )
    );
  }

  // ---- Item toggle ----
  function toggleItem(folderId: string, workId: string, sectionId: string, num: number) {
    mutate((prev) =>
      prev.map((f) =>
        f.id !== folderId
          ? f
          : {
              ...f,
              updatedAt: Date.now(),
              works: f.works
                .map((w) =>
                  w.id !== workId
                    ? w
                    : {
                        ...w,
                        updatedAt: Date.now(),
                        sections: w.sections.map((s) => {
                          if (s.id !== sectionId) return s;
                          const next = { ...s.statuses };
                          if (next[num]) delete next[num];
                          else next[num] = "read";
                          return { ...s, statuses: next };
                        }),
                      }
                )
                .sort((a, b) => b.updatedAt - a.updatedAt),
            }
      )
    );
  }

  // ---- Bulk range ----
  function bulkRange(folderId: string, workId: string, start: number, end: number, toRead: boolean) {
    mutate((prev) =>
      prev.map((f) =>
        f.id !== folderId
          ? f
          : {
              ...f,
              updatedAt: Date.now(),
              works: f.works
                .map((w) =>
                  w.id !== workId
                    ? w
                    : {
                        ...w,
                        updatedAt: Date.now(),
                        sections: w.sections.map((s) => {
                          const next = { ...s.statuses };
                          for (
                            let n = Math.max(start, s.startNum);
                            n <= Math.min(end, s.endNum);
                            n++
                          ) {
                            if (toRead) next[n] = "read";
                            else delete next[n];
                          }
                          return { ...s, statuses: next };
                        }),
                      }
                )
                .sort((a, b) => b.updatedAt - a.updatedAt),
            }
      )
    );
  }

  // ---- Import ----
  function importHandler(data: Folder[]) {
    const sorted = [...data].sort((a, b) => b.updatedAt - a.updatedAt);
    setFolders(sorted);
    saveFolders(sorted);
    navigate({ screen: "folders" });
  }

  // Derive
  const currentFolder =
    view.screen !== "folders"
      ? folders.find((f) => f.id === (view as { folderId: string }).folderId)
      : undefined;
  const currentWork =
    view.screen === "detail" && currentFolder
      ? currentFolder.works.find((w) => w.id === (view as { workId: string }).workId)
      : undefined;

  return (
    <div style={{ opacity: fading ? 0 : 1, transition: "opacity 0.11s ease" }}>
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
        />
      )}

      {view.screen === "detail" && currentFolder && currentWork && (
        <WorkDetailScreen
          folder={currentFolder}
          work={currentWork}
          onBack={goBack}
          onEditWork={(updates) => editWork(currentFolder.id, currentWork.id, updates)}
          onDeleteWork={() => {
            deleteWork(currentFolder.id, currentWork.id);
            navigate({ screen: "works", folderId: currentFolder.id });
          }}
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
