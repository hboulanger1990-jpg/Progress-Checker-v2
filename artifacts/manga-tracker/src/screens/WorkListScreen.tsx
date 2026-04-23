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
    tags: string[];
  }) => void;
  onEdit: (workId: string, updates: Partial<Pick<Work, "title" | "accentColor" | "labelUnread" | "labelRead" | "unit" | "sectionLabel" | "tags">>) => void;
  onDelete: (workId: string) => void;
  onToggleCompletion: (workId: string) => void;
}

export default function WorkListScreen({ folder, onBack, onSelect, onAdd, onEdit, onDelete, onToggleCompletion }: Props) {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Work | null>(null);
  const touchStart = useRef({ x: 0, y: 0 });

  const isCompletion = folder.folderType === "completion";
  const folderHex = ACCENT_COLORS[folder.accentColor].hex;
  const folderDefaults = {
    labelUnread: folder.defaultLabelUnread || "未読",
    labelRead: folder.defaultLabelRead || "読了",
    unit: folder.defaultUnit || "",
  };

  const allTags = Array.from(
    new Set(folder.works.flatMap((w) => w.tags ?? []))
  ).sort();

  const filtered = folder.works.filter((w) => {
    const matchSearch =
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      (w.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchTag = selectedTag ? (w.tags ?? []).includes(selectedTag) : true;
    return matchSearch && matchTag;
  });

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
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#787c99] text-sm">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="項目・タグを検索..."
              className="w-full bg-[#24283b] text-[#c0caf5] border border-[#3b4261] rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7aa2f7] transition-colors placeholder-[#4a5177]"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787c99] text-lg leading-none">✕</button>
            )}
          </div>
          {allTags.length > 0 && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors active:scale-95"
                  style={
                    selectedTag === tag
                      ? { backgroundColor: folderHex, color: "#1a1b26" }
                      : { backgroundColor: "#2a2d3e", color: "#787c99", border: "1px solid #3b4261" }
                  }
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-3 max-w-lg mx-auto w-full pb-32">
        {filtered.length === 0 ? (
          <div className="mt-20 text-center space-y-2">
            <p className="text-4xl">📖</p>
            <p className="text-[#787c99] text-sm">
              {search || selectedTag ? "該当する項目が見つかりませんでした" : "項目がありません"}
            </p>
            {!search && !selectedTag && <p className="text-[#4a5177] text-xs">下のボタンから追加しましょう</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((work) => {
              const hex = ACCENT_COLORS[work.accentColor].hex;

              // 読了管理タイプのカード
              if (isCompletion) {
                const isRead = !!work.completed;
                return (
                  <div key={work.id} className="relative">
                    <div
                      className="w-full bg-[#24283b] border rounded-2xl px-4 py-4 transition-colors"
                      style={{ borderColor: isRead ? hex : "#3b4261" }}
                    >
                      <div className="flex items-center gap-3 pr-16">
                        <button
                          onClick={() => onToggleCompletion(work.id)}
                          className="shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all active:scale-90"
                          style={
                            isRead
                              ? { backgroundColor: hex, borderColor: hex }
                              : { backgroundColor: "transparent", borderColor: "#3b4261" }
                          }
                        >
                          {isRead && <span className="text-[#1a1b26] text-sm font-bold">✓</span>}
                        </button>
                        <span
                          className="font-bold text-base leading-tight flex-1 text-left"
                          style={{ color: isRead ? hex : "#c0caf5" }}
                        >
                          {work.title}
                        </span>
                        <span
                          className="text-xs font-medium shrink-0 px-2 py-0.5 rounded-full"
                          style={
                            isRead
                              ? { backgroundColor: hex + "33", color: hex }
                              : { backgroundColor: "#2a2d3e", color: "#787c99" }
                          }
                        >
                          {isRead ? (work.labelRead || "読了") : (work.labelUnread || "未読")}
                        </span>
                      </div>
                      {(work.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pl-10">
                          {(work.tags ?? []).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-full text-xs"
                              style={{ backgroundColor: `${hex}22`, color: hex }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
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
              }

              // 進捗管理タイプのカード（従来通り）
              const { read, total, percent } = calcWorkProgress(work.sections);
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
                    {(work.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(work.tags ?? []).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full text-xs"
                            style={{ backgroundColor: `${hex}22`, color: hex }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
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
