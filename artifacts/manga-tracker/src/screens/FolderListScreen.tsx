import { useState, useRef, useEffect } from "react";
import type { AccentColor, Folder } from "../types";
import { ACCENT_COLORS } from "../types";
import FolderModal from "../modals/FolderModal";
import BackupModal from "../modals/BackupModal";
import type { User } from "@supabase/supabase-js";

interface Props {
  folders: Folder[];
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onSelect: (f: Folder) => void;
  onAdd: (
    title: string,
    color: AccentColor,
    type: "progress" | "read",
    defaultLabelUnread: string,
    defaultLabelRead: string,
    defaultUnit: string
  ) => void;
  onEdit: (
    id: string,
    title: string,
    color: AccentColor,
    type: "progress" | "read",
    defaultLabelUnread: string,
    defaultLabelRead: string,
    defaultUnit: string
  ) => void;
  onDelete: (id: string) => void;
  onImport: (data: Folder[]) => void;
}

export default function FolderListScreen({ folders, user, onSignIn, onSignOut, onSelect, onAdd, onEdit, onDelete, onImport }: Props) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Folder | null>(null);
  const [showBackup, setShowBackup] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⑥ タブ切替でモーダルが閉じないようにvisibilitychangeで制御
  useEffect(() => {
    function handleVisibility() {
      // visibilitychangeでは何もしない（モーダル状態を保持する）
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // ② updatedAt降順でソート
  const sorted = [...folders].sort((a, b) => b.updatedAt - a.updatedAt);
  const filtered = sorted.filter((f) => f.title.toLowerCase().includes(search.toLowerCase()));

  function handleDelete(f: Folder) {
    if (!window.confirm(`「${f.title}」を削除しますか？\n内の全項目も削除されます。`)) return;
    onDelete(f.id);
    setSelectedId(null);
  }

  function handlePressStart(id: string) {
    longPressTimer.current = setTimeout(() => {
      setSelectedId(id);
    }, 500);
  }

  function handlePressEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  return (
    <div className="min-h-screen bg-[#1a1b26] flex flex-col" onClick={() => setSelectedId(null)}>
      <header className="sticky top-0 z-10 bg-[#1a1b26]/95 backdrop-blur-md border-b border-[#2a2d3e] px-4 pt-2 pb-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-[#c0caf5]">Progress Checker</h1>
            {/* ① アイコンボタン群（バックアップ・ログイン/ログアウト） */}
            <div className="flex items-center gap-2">
              {/* バックアップ：アイコンのみ */}
              <button
                onClick={() => setShowBackup(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#24283b] border border-[#3b4261] active:scale-95 transition-transform text-base"
                title="バックアップ"
              >
                💾
              </button>
              {/* ログイン/ログアウト */}
              {user ? (
                <button
                  onClick={onSignOut}
                  className="flex items-center gap-1.5 text-xs text-[#787c99] bg-[#24283b] px-3 py-1.5 rounded-xl border border-[#3b4261] active:scale-95 transition-transform h-9"
                >
                  ログアウト
                </button>
              ) : (
                <button
                  onClick={onSignIn}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#24283b] border border-[#3b4261] active:scale-95 transition-transform text-base"
                  title="Googleでログイン"
                >
                  👤
                </button>
              )}
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#787c99] text-sm">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="フォルダを検索..."
              className="w-full bg-[#24283b] text-[#c0caf5] border border-[#3b4261] rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7aa2f7] transition-colors placeholder-[#4a5177]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787c99] text-lg leading-none">✕</button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-3 max-w-lg mx-auto w-full pb-32">
        {filtered.length === 0 ? (
          <div className="mt-20 text-center space-y-2">
            <p className="text-4xl">📁</p>
            <p className="text-[#787c99] text-sm">
              {search ? `「${search}」は見つかりませんでした` : "フォルダがありません"}
            </p>
            {!search && <p className="text-[#4a5177] text-xs">下のボタンから追加しましょう</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((folder) => {
              const hex = ACCENT_COLORS[folder.accentColor].hex;
              const isSelected = selectedId === folder.id;
              return (
                <div key={folder.id} className="relative">
                  {/* ⑧ フォルダカード：タイトルのみ、進捗バーなし */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) { setSelectedId(null); return; }
                      onSelect(folder);
                    }}
                    onMouseDown={() => handlePressStart(folder.id)}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onTouchStart={() => handlePressStart(folder.id)}
                    onTouchEnd={handlePressEnd}
                    onContextMenu={(e) => { e.preventDefault(); setSelectedId(folder.id); }}
                    className={`w-full bg-[#24283b] border rounded-2xl px-4 py-3.5 text-left active:scale-[0.98] transition-all ${
                      isSelected ? "border-[#7aa2f7] ring-2 ring-[#7aa2f7]/30" : "border-[#3b4261]"
                    }`}
                    style={{ borderLeftColor: hex, borderLeftWidth: "4px" }}
                  >
                    <span className="font-bold text-[#c0caf5] text-base leading-tight">{folder.title}</span>
                  </button>

                  {isSelected && (
                    <div className="absolute top-0 right-0 z-20 flex gap-2 p-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditTarget(folder); setSelectedId(null); }}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-[#24283b] border border-[#7aa2f7] text-[#7aa2f7] active:scale-95 transition-transform shadow-lg"
                      >✏️ 編集</button>
                      <button
                        onClick={() => handleDelete(folder)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-[#24283b] border border-[#f7768e] text-[#f7768e] active:scale-95 transition-transform shadow-lg"
                      >🗑 削除</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-gradient-to-t from-[#1a1b26] via-[#1a1b26]/90 to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full bg-[#7aa2f7] text-[#1a1b26] font-bold py-4 rounded-2xl text-base shadow-lg shadow-[#7aa2f7]/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <span className="text-xl leading-none">＋</span>
            <span>新しいフォルダを追加</span>
          </button>
        </div>
      </div>

      {showAdd && (
        <FolderModal
          mode="add"
          onClose={() => setShowAdd(false)}
          onSave={(title, color, type, dlu, dlr, du) => { onAdd(title, color, type, dlu, dlr, du); setShowAdd(false); }}
        />
      )}
      {editTarget && (
        <FolderModal
          mode="edit"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(title, color, type, dlu, dlr, du) => { onEdit(editTarget.id, title, color, type, dlu, dlr, du); setEditTarget(null); }}
        />
      )}
      {showBackup && (
        <BackupModal
          data={folders}
          onClose={() => setShowBackup(false)}
          onImport={onImport}
        />
      )}
    </div>
  );
}
