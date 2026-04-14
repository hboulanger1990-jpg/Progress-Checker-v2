import { useState } from "react";
import type { AccentColor, Folder } from "../types";
import { ACCENT_COLORS } from "../types";
import { calcSectionProgress } from "../storage";
import FolderModal from "../modals/FolderModal";
import BackupModal from "../modals/BackupModal";

interface Props {
  folders: Folder[];
  onSelect: (f: Folder) => void;
  onAdd: (title: string, color: AccentColor, defaultLabelUnread: string, defaultLabelRead: string) => void;
  onEdit: (id: string, title: string, color: AccentColor, defaultLabelUnread: string, defaultLabelRead: string) => void;
  onDelete: (id: string) => void;
  onImport: (data: Folder[]) => void;
}

export default function FolderListScreen({ folders, onSelect, onAdd, onEdit, onDelete, onImport }: Props) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Folder | null>(null);
  const [showBackup, setShowBackup] = useState(false);

  const filtered = folders.filter((f) => f.title.toLowerCase().includes(search.toLowerCase()));

  function handleDelete(f: Folder) {
    if (!window.confirm(`「${f.title}」を削除しますか？\n内の全項目も削除されます。`)) return;
    onDelete(f.id);
  }

  function getFolderStats(folder: Folder) {
    let total = 0, read = 0;
    for (const w of folder.works) {
      for (const s of w.sections) {
        const p = calcSectionProgress(s);
        total += p.total;
        read += p.read;
      }
    }
    const percent = total > 0 ? Math.round((read / total) * 100) : 0;
    return { total, read, percent };
  }

  return (
    <div className="min-h-screen bg-[#1a1b26] flex flex-col">
      <header className="sticky top-0 z-10 bg-[#1a1b26]/95 backdrop-blur-md border-b border-[#2a2d3e] px-4 pt-2 pb-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-[#c0caf5]">Progress Checker</h1>
            <button
              onClick={() => setShowBackup(true)}
              className="flex items-center gap-1.5 text-xs text-[#787c99] bg-[#24283b] px-3 py-1.5 rounded-lg border border-[#3b4261] active:scale-95 transition-transform"
            >
              <span>💾</span>
              <span>バックアップ</span>
            </button>
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
              const { read, total, percent } = getFolderStats(folder);
              const hex = ACCENT_COLORS[folder.accentColor].hex;
              return (
                <div key={folder.id} className="relative group">
                  <button
                    onClick={() => onSelect(folder)}
                    className="w-full bg-[#24283b] border border-[#3b4261] rounded-2xl px-4 py-4 text-left active:scale-[0.98] transition-transform"
                    style={{ borderLeftColor: hex, borderLeftWidth: "4px" }}
                  >
                    <div className="flex items-center justify-between mb-1 pr-16">
                      <span className="font-bold text-[#c0caf5] text-base leading-tight">{folder.title}</span>
                      <span className="text-xs font-bold shrink-0 ml-2" style={{ color: hex }}>{percent}%</span>
                    </div>
                    <div className="text-xs text-[#787c99] mb-2">
                      {folder.works.length}項目 · {read}/{total}
                    </div>
                    <div className="h-1.5 bg-[#1a1b26] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: hex }}
                      />
                    </div>
                  </button>
                  <div className="absolute top-3 right-3 flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditTarget(folder); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1b26] text-[#787c99] text-sm active:scale-95 transition-transform border border-[#3b4261]"
                    >⚙️</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(folder); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1b26] text-[#f7768e] text-sm active:scale-95 transition-transform border border-[#3b4261]"
                    >🗑</button>
                  </div>
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
          onSave={(title, color, dlu, dlr) => { onAdd(title, color, dlu, dlr); setShowAdd(false); }}
        />
      )}
      {editTarget && (
        <FolderModal
          mode="edit"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(title, color, dlu, dlr) => { onEdit(editTarget.id, title, color, dlu, dlr); setEditTarget(null); }}
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
