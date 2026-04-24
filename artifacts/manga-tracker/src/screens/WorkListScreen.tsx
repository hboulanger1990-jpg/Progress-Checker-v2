import { useState, useRef } from "react";
import type { Folder, Work } from "../types";
import { ACCENT_COLORS } from "../types";
import { calcWorkProgress } from "../storage";
import WorkModal from "../modals/WorkModal";

interface Props {
  folder: Folder;
  onBack: () => void;
  onSelect: (w: Work) => void;
  onToggleCompleted: (workId: string) => void;
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

export default function WorkListScreen({ folder, onBack, onSelect, onToggleCompleted, onAdd, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Work | null>(null);
  const touchStart = useRef({ x: 0, y: 0 });

  const isReadMode = folder.type === "read";
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
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
    if (touchStart.current.x < 40 && dx > 80 && dy < 80) onBack();
  }

  return (
    <div
      className="min-h-screen bg-[#1a1b26] flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
            {isReadMode && (
              <span className="text-xs text-[#787c99] bg-[#24283b] border border-[#3b4261] px-2 py-1 rounded-lg shrink-0">
                完了管理
              </span>
            )}
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
        ) : isReadMode ? (
          /* ---- 完了管理モード ---- */
          <div className="space-y-2">
            {filtered.map((work) => {
              const hex = ACCENT_COLORS[work.accentColor].hex;
              const done = !!work.completed;
              return (
                <div key={work.id} className="relative">
                  <button
                    onClick={() => onToggleCompleted(work.id)}
                    className="w-full rounded-2xl px-4 py-4 text-left active:scale-[0.98] transition-all duration-200 border"
                    style={{
                      backgroundColor: done ? hex : "#24283b",
                      borderColor: done ? hex : "#3b4261",
                    }}
                  >
                    <div className="flex items-center gap-3 pr-16">
                      <span
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-sm transition-all"
                        style={{
                          borderColor: done ? "#1a1b26" : hex,
                          backgroundColor: done ? "#1a1b26" : "transparent",
                          color: done ? hex : "transparent",
                        }}
                      >
                        ✓
                      </span>
                      <span
                        className="font-bold text-base leading-tight line-clamp-2"
                        style={{ color: done ? "#1a1b26" : "#c0caf5" }}
                      >
                        {work.title}
                      </span>
                    </div>
                    <div className="mt-1.5 pl-9">
                      <span
                        className="text-xs font-medium"
                        style={{ color: done ? "#1a1b2699" : "#787c99" }}
                      >
                        {done ? "完了" : "未完了"}
                      </span>
                    </div>
                  </button>
                  <div className="absolute top-3 right-3 flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditTarget(work); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-sm active:scale-95 transition-transform border"
                      style={{
                        backgroundColor: done ? `${hex}33` : "#1a1b26",
                        borderColor: done ? `${hex}55` : "#3b4261",
                        color: done ? "#1a1b26" : "#787c99",
                      }}
                    >⚙️</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(work); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-sm active:scale-95 transition-transform border"
                      style={{
                        backgroundColor: done ? `${hex}33` : "#1a1b26",
                        borderColor: done ? `${hex}55` : "#3b4261",
                        color: "#f7768e",
                      }}
                    >🗑</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ---- 進捗管理モード ---- */
          <div className="space-y-2">
            {filtered.map((work) => {
              const { read, total, percent } = calcWorkProgress(work.sections);
              const hex = ACCENT_COLORS[work.accentColor].hex;
              const secLabel = work.sectionLabel || "セクション";
              return (
                <div key={work.id} className="relative">
                  <button
                    onClick={() => onSelect(work)}
                    className="w-full bg-[#24283b] border border-[#3b4261] rounded-2xl px-4 py-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2 pr-16">
                      <span className="font-bold text-[#c0caf5] text-base leading-tight line-clamp-2">{work.title}</span>
                      <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: hex }}>{percent}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1a1b26] rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: hex }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#787c99]">
                      <span>
                        <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: hex }} />
                        {work.labelRead} {read}
                      </span>
                      <span className="text-[#4a5177]">/ {total}{work.unit}</span>
                      <span className="text-[#4a5177]">· {work.sections.length}{secLabel}</span>
                    </div>
                  </button>
                  <div className="absolute top-3 right-3 flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditTarget(work); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1b26] text-[#787c99] text-sm active:scale-95 transition-transform border border-[#3b4261]"
                    >⚙️</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(work); }}
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
