import { useState, useRef } from "react";
import type { Folder, Work } from "../types";
import { ACCENT_COLORS } from "../types";
import { calcWorkProgress } from "../storage";
import WorkModal from "../modals/WorkModal";

interface Props {
  folder: Folder;
  onBack: () => void;
  onSelect: (w: Work) => void;
  onAdd: (data: {
    title: string;
    accentColor: import("../types").AccentColor;
    labelUnread: string;
    labelRead: string;
    unit: string;
    sectionLabel: string;
  }) => void;
  onEdit: (workId: string, updates: Partial<Pick<Work, "title" | "accentColor" | "labelUnread" | "labelRead" | "unit" | "sectionLabel">>) => void;
  onDelete: (workId: string) => void;
}

export default function WorkListScreen({ folder, onBack, onSelect, onAdd, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Work | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef({ x: 0, y: 0 });

  const folderHex = ACCENT_COLORS[folder.accentColor].hex;
  const folderDefaults = {
    labelUnread: folder.defaultLabelUnread || "未完了",
    labelRead: folder.defaultLabelRead || "完了",
    unit: folder.defaultUnit || "",
  };

  const filtered = folder.works.filter((w) =>
    w.title.toLowerCase().includes(search.toLowerCase())
  );

  function handleDelete(w: Work) {
    if (!window.confirm(`「${w.title}」を削除しますか？この操作は元に戻せません。`)) return;
    onDelete(w.id);
    setSelectedId(null);
  }

  function handlePressStart(id: string, touchX: number, touchY: number) {
    touchStart.current = { x: touchX, y: touchY };
    longPressTimer.current = setTimeout(() => {
      setSelectedId(id);
    }, 500);
  }

  function handlePressEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function handleTouchStart(e: React.TouchEvent, id: string) {
    handlePressStart(id, e.touches[0].clientX, e.touches[0].clientY);
  }

  function handleTouchEnd(e: React.TouchEvent, isCard: boolean) {
    handlePressEnd();
    if (!isCard) {
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
      if (touchStart.current.x < 40 && dx > 80 && dy < 80) onBack();
    }
  }

  return (
    <div
      className="min-h-screen bg-[#1a1b26] flex flex-col"
      onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
        if (touchStart.current.x < 40 && dx > 80 && dy < 80) onBack();
      }}
      onClick={() => setSelectedId(null)}
    >
      <header className="sticky top-0 z-10 bg-[#1a1b26]/95 backdrop-blur-md border-b border-[#2a2d3e] px-4 pt-2 pb-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBack}
              className="shrink-0 flex items-center gap-1 text-sm font-medium active:scale-95 transition-transform py-1 pr-2"
              style={{ color: folderHex }}
            >
              <span className="text-base">←</span>
              <span>戻る</span>
            </button>
            <h1 className="flex-1 font-bold text-[#c0caf5] text-base truncate">{folder.title}</h1>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#787c99] text-sm">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="項目を検索..."
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
            <p className="text-4xl">📖</p>
            <p className="text-[#787c99] text-sm">
              {search ? `「${search}」は見つかりませんでした` : "項目がありません"}
            </p>
            {!search && <p className="text-[#4a5177] text-xs">下のボタンから追加しましょう</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((work) => {
              const { read, total, percent } = calcWorkProgress(work.sections);
              const hex = ACCENT_COLORS[work.accentColor].hex;
              const secLabel = work.sectionLabel || "セクション";
              const isSelected = selectedId === work.id;
              return (
                <div key={work.id} className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) { setSelectedId(null); return; }
                      onSelect(work);
                    }}
                    onMouseDown={() => handlePressStart(work.id, 0, 0)}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onTouchStart={(e) => handleTouchStart(e, work.id)}
                    onTouchEnd={(e) => { handlePressEnd(); e.stopPropagation(); }}
                    onContextMenu={(e) => { e.preventDefault(); setSelectedId(work.id); }}
                    className={`w-full bg-[#24283b] border rounded-2xl px-4 py-3 text-left active:scale-[0.98] transition-all ${
                      isSelected ? "border-[#7aa2f7] ring-2 ring-[#7aa2f7]/30" : "border-[#3b4261]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#c0caf5] text-base leading-tight truncate">{work.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-[#787c99]">{read}/{total}{work.unit}</span>
                        <span className="text-xs font-bold" style={{ color: hex }}>{percent}%</span>
                      </div>
                    </div>
                    <div className="h-1 bg-[#1a1b26] rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: hex }}
                      />
                    </div>
                  </button>

                  {/* 長押しメニュー */}
                  {isSelected && (
                    <div
                      className="absolute top-0 right-0 z-20 flex gap-2 p-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => { setEditTarget(work); setSelectedId(null); }}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-[#24283b] border border-[#7aa2f7] text-[#7aa2f7] active:scale-95 transition-transform shadow-lg"
                      >
                        ✏️ 編集
                      </button>
                      <button
                        onClick={() => handleDelete(work)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-[#24283b] border border-[#f7768e] text-[#f7768e] active:scale-95 transition-transform shadow-lg"
                      >
                        🗑 削除
                      </button>
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
            className="w-full font-bold py-4 rounded-2xl text-base shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-[#1a1b26]"
            style={{ backgroundColor: folderHex, boxShadow: `0 4px 24px ${folderHex}33` }}
          >
            <span className="text-xl leading-none">＋</span>
            <span>新しい項目を追加</span>
          </button>
        </div>
      </div>

      {showAdd && (
        <WorkModal
          mode="add"
          folderDefaults={folderDefaults}
          onClose={() => setShowAdd(false)}
          onSave={(data) => { onAdd(data); setShowAdd(false); }}
        />
      )}
      {editTarget && (
        <WorkModal
          mode="edit"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(data) => { onEdit(editTarget.id, data); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
