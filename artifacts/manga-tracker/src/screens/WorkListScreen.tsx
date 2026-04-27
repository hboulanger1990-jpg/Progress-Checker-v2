import { useState, useRef, useEffect } from "react";
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
    tags: string[];
  }) => void;
  onEdit: (workId: string, updates: Partial<Pick<Work, "title" | "accentColor" | "labelUnread" | "labelRead" | "unit" | "sectionLabel" | "tags">>) => void;
  onDelete: (workId: string) => void;
}

export default function WorkListScreen({ folder, onBack, onSelect, onToggleCompleted, onAdd, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Work | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef({ x: 0, y: 0 });

  const isReadMode = folder.type === "read";
  const folderHex = ACCENT_COLORS[folder.accentColor].hex;
  const folderDefaults = {
    labelUnread: folder.defaultLabelUnread || "未完了",
    labelRead: folder.defaultLabelRead || "完了",
    unit: folder.defaultUnit || "",
  };

  useEffect(() => {
    const handler = (e: Event) => { e.stopImmediatePropagation(); };
    document.addEventListener("visibilitychange", handler, true);
    return () => document.removeEventListener("visibilitychange", handler, true);
  }, []);

  // ④ フォルダ内の全タグを収集（重複なし）
  const allTags = Array.from(
    new Set(folder.works.flatMap((w) => w.tags ?? []))
  );

  // テキスト検索＋タグ絞り込み
  const filtered = folder.works.filter((w) => {
    const matchText = w.title.toLowerCase().includes(search.toLowerCase());
    const matchTag = selectedTag ? (w.tags ?? []).includes(selectedTag) : true;
    return matchText && matchTag;
  });

  // ⑦ 進捗管理：進行中(0<p<100) → 未着手(p=0) → 100%完了 の順にソート
  const sortedFiltered = isReadMode ? filtered : [...filtered].sort((a, b) => {
    const pa = calcWorkProgress(a.sections).percent;
    const pb = calcWorkProgress(b.sections).percent;
    const rankA = pa === 100 ? 2 : pa === 0 ? 1 : 0;
    const rankB = pb === 100 ? 2 : pb === 0 ? 1 : 0;
    if (rankA !== rankB) return rankA - rankB;
    // 同ランク内はupdatedAtで降順（最近更新が上）
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  });

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
            {isReadMode && (
              <span className="text-xs text-[#787c99] bg-[#24283b] border border-[#3b4261] px-2 py-1 rounded-lg shrink-0">
                完了管理
              </span>
            )}
          </div>
          {/* 検索バー */}
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
          {/* ④ タグ一覧（検索バー直下） */}
          {allTags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {allTags.map((tag) => {
                const isActive = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(isActive ? null : tag)}
                    className="text-xs px-2.5 py-1 rounded-full border transition-all active:scale-95"
                    style={
                      isActive
                        ? { backgroundColor: folderHex, color: "#1a1b26", borderColor: folderHex }
                        : { backgroundColor: "#24283b", color: "#787c99", borderColor: "#3b4261" }
                    }
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-3 max-w-lg mx-auto w-full pb-32">
        {sortedFiltered.length === 0 ? (
          <div className="mt-20 text-center space-y-2">
            <p className="text-4xl">📖</p>
            <p className="text-[#787c99] text-sm">
              {search || selectedTag ? "条件に一致する項目はありません" : "項目がありません"}
            </p>
            {!search && !selectedTag && <p className="text-[#4a5177] text-xs">下のボタンから追加しましょう</p>}
          </div>
        ) : isReadMode ? (
          /* ---- 完了管理モード ---- */
          <div className="space-y-2">
            {sortedFiltered.map((work) => {
              const hex = ACCENT_COLORS[work.accentColor].hex;
              const done = !!work.completed;
              const isSelected = selectedId === work.id;
              const unreadLabel = work.labelUnread || folder.defaultLabelUnread || "未完了";
              const readLabel = work.labelRead || folder.defaultLabelRead || "完了";
              return (
                <div key={work.id} className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) { setSelectedId(null); return; }
                      onToggleCompleted(work.id);
                    }}
                    onMouseDown={() => handlePressStart(work.id, 0, 0)}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onTouchStart={(e) => handleTouchStart(e, work.id)}
                    onTouchEnd={(e) => { handlePressEnd(); e.stopPropagation(); }}
                    onContextMenu={(e) => { e.preventDefault(); setSelectedId(work.id); }}
                    className="w-full rounded-2xl px-4 py-3 text-left active:scale-[0.98] transition-all duration-200 border"
                    style={{
                      backgroundColor: done ? hex : "#24283b",
                      borderColor: isSelected ? "#7aa2f7" : done ? hex : "#3b4261",
                    }}
                  >
                    {/* ⑧ タイトル・タグ・ステータスを1行に */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-xs transition-all"
                        style={{
                          borderColor: done ? "#1a1b26" : hex,
                          backgroundColor: done ? "#1a1b26" : "transparent",
                          color: done ? hex : "transparent",
                        }}
                      >✓</span>
                      {/* ⑧ タイトルをtruncateで省略 */}
                      <span
                        className="font-bold text-sm leading-tight truncate flex-1 min-w-0"
                        style={{ color: done ? "#1a1b26" : "#c0caf5" }}
                      >
                        {work.title}
                      </span>
                      {/* ⑧ タグを右寄せ、アクセントカラー */}
                      {work.tags && work.tags.length > 0 && (
                        <div className="flex gap-1 shrink-0 flex-wrap justify-end max-w-[40%]">
                          {work.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap"
                              style={{
                                backgroundColor: done ? "#1a1b2622" : `${hex}22`,
                                color: done ? "#1a1b2699" : hex,
                              }}
                            >#{tag}</span>
                          ))}
                        </div>
                      )}
                      <span className="text-xs font-medium shrink-0" style={{ color: done ? "#1a1b2699" : "#787c99" }}>
                        {done ? readLabel : unreadLabel}
                      </span>
                    </div>
                  </button>

                  {isSelected && (
                    <div className="absolute top-0 right-0 z-20 flex gap-2 p-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditTarget(work); setSelectedId(null); }}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-[#24283b] border border-[#7aa2f7] text-[#7aa2f7] active:scale-95 transition-transform shadow-lg"
                      >✏️ 編集</button>
                      <button
                        onClick={() => handleDelete(work)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-[#24283b] border border-[#f7768e] text-[#f7768e] active:scale-95 transition-transform shadow-lg"
                      >🗑 削除</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ---- 進捗管理モード ---- */
          <div className="space-y-2">
            {sortedFiltered.map((work) => {
              const { read, total, percent } = calcWorkProgress(work.sections);
              const hex = ACCENT_COLORS[work.accentColor].hex;
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
                    {/* ⑤ タイトル行（右に進捗数字） */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-[#c0caf5] text-sm leading-tight truncate">{work.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-[#787c99]">{read}/{total}{work.unit}</span>
                        <span className="text-xs font-bold" style={{ color: hex }}>{percent}%</span>
                      </div>
                    </div>
                    {/* ⑤ 進捗バー */}
                    <div className="h-1 bg-[#1a1b26] rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: hex }}
                      />
                    </div>
                    {/* ⑤ タグ（アクセントカラーで表示） */}
                    {work.tags && work.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {work.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: `${hex}22`, color: hex }}
                          >#{tag}</span>
                        ))}
                      </div>
                    )}
                  </button>

                  {isSelected && (
                    <div className="absolute top-0 right-0 z-20 flex gap-2 p-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditTarget(work); setSelectedId(null); }}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-[#24283b] border border-[#7aa2f7] text-[#7aa2f7] active:scale-95 transition-transform shadow-lg"
                      >✏️ 編集</button>
                      <button
                        onClick={() => handleDelete(work)}
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
          folderAccentColor={folder.accentColor}
          existingTags={allTags}
          onClose={() => setShowAdd(false)}
          onSave={(data) => { onAdd(data); setShowAdd(false); }}
        />
      )}
      {editTarget && (
        <WorkModal
          mode="edit"
          initial={editTarget}
          folderAccentColor={folder.accentColor}
          existingTags={allTags}
          onClose={() => setEditTarget(null)}
          onSave={(data) => { onEdit(editTarget.id, data); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
