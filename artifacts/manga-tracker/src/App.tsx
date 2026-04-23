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
    return () => subscription.unsubscribe();
  }, []);

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
  function editSection(fo
