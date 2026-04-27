import { useState, useRef, useEffect, useCallback } from "react";
import type { Folder, Work, Section } from "../types";
import { ACCENT_COLORS } from "../types";
import { calcWorkProgress, calcSectionProgress } from "../storage";
import WorkModal from "../modals/WorkModal";
import SectionModal from "../modals/SectionModal";

interface Props {
  folder: Folder;
  work: Work;
  onBack: () => void;
  onEditWork: (updates: Partial<Pick<Work, "title" | "accentColor" | "labelUnread" | "labelRead" | "unit" | "sectionLabel">>) => void;
  onDeleteWork: () => void;
  onAddSection: (s: Omit<Section, "id" | "statuses">) => void;
  onEditSection: (sectionId: string, updates: Partial<Pick<Section, "label" | "startNum" | "endNum" | "mode" | "items">>) => void;
  onDeleteSection: (sectionId: string) => void;
  onToggleItem: (sectionId: string, num: number) => void;
  onReorderSections: (newSections: Section[]) => void;
  onReorderItems: (sectionId: string, newItems: string[], newStatuses: Section["statuses"]) => void;
}

type SectionModalState = null | { mode: "add" } | { mode: "edit"; section: Section };

const LAST_TOGGLE_PREFIX = "pc-lt-";

export default function WorkDetailScreen({
  folder, work, onBack, onEditWork, onDeleteWork,
  onAddSection, onEditSection, onDeleteSection, onToggleItem,
  onReorderSections, onReorderItems,
}: Props) {
  const [showWorkEdit, setShowWorkEdit] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [sectionModal, setSectionModal] = useState<SectionModalState>(null);
  const [textSearch, setTextSearch] = useState("");

  // ① ドラッグ状態
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<{ sectionId: string; idx: number } | null>(null);
  const [dragOverItemIdx, setDragOverItemIdx] = useState<number | null>(null);

  const touchStart = useRef({ x: 0, y: 0 });
  const justBecameVisible = useRef(false);
  const sectionDragY = useRef(0);
  const itemDragY = useRef(0);

  const accentHex = ACCENT_COLORS[work.accentColor].hex;
  const folderHex = ACCENT_COLORS[folder.accentColor].hex;
  const { read, total, percent } = calcWorkProgress(work.sections);
  const secLabel = work.sectionLabel || "セクション";
  const ltKey = `${LAST_TOGGLE_PREFIX}${work.id}`;

  // ③ テキストモードのセクションが存在するか
  const hasTextSections = work.sections.some((s) => s.mode === "text");

  useEffect(() => {
    const raw = localStorage.getItem(ltKey);
    if (!raw) return;
    try {
      const { sectionId, num } = JSON.parse(raw) as { sectionId: string; num: number };
      setTimeout(() => {
        const el = document.getElementById(`item-${sectionId}-${num}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        justBecameVisible.current = true;
        setTimeout(() => { justBecameVisible.current = false; }, 500);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (justBecameVisible.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
    if (touchStart.current.x < 40 && dx > 80 && dy < 80) onBack();
  }

  function handleDelete() {
    setShowMenu(false);
    if (!window.confirm(`「${work.title}」を削除しますか？この操作は元に戻せません。`)) return;
    onDeleteWork();
  }

  function handleDeleteSection(s: Section) {
    if (!window.confirm(`「${s.label}」を削除しますか？`)) return;
    onDeleteSection(s.id);
  }

  function handleToggle(sectionId: string, num: number) {
    onToggleItem(sectionId, num);
    localStorage.setItem(ltKey, JSON.stringify({ sectionId, num }));
    requestAnimationFrame(() => {
      const el = document.getElementById(`item-${sectionId}-${num}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function getAddSectionDefaults() {
    const n = work.sections.length;
    if (n === 0) return { label: "1", startNum: 1, endNum: undefined };
    const last = work.sections[n - 1];
    const startNum = last.endNum + 1;
    const lastCount = last.endNum - last.startNum + 1;
    return { label: `${n + 1}`, startNum, endNum: startNum + lastCount - 1 };
  }

  // ① セクションドラッグ（タッチ）
  const sectionLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSectionTouchStart(e: React.TouchEvent, sectionId: string) {
    sectionDragY.current = e.touches[0].clientY;
    sectionLongPressTimer.current = setTimeout(() => {
      setDraggingSectionId(sectionId);
    }, 400);
  }

  function handleSectionTouchMove(e: React.TouchEvent) {
    if (!draggingSectionId) {
      if (sectionLongPressTimer.current) clearTimeout(sectionLongPressTimer.current);
      return;
    }
    e.preventDefault();
    const y = e.touches[0].clientY;
    // ドラッグ中のホバー先を検出
    const els = document.querySelectorAll("[data-section-id]");
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        const id = (el as HTMLElement).dataset.sectionId!;
        if (id !== draggingSectionId) setDragOverSectionId(id);
        break;
      }
    }
  }

  function handleSectionTouchEnd() {
    if (sectionLongPressTimer.current) clearTimeout(sectionLongPressTimer.current);
    if (draggingSectionId && dragOverSectionId) {
      const sections = [...work.sections];
      const fromIdx = sections.findIndex((s) => s.id === draggingSectionId);
      const toIdx = sections.findIndex((s) => s.id === dragOverSectionId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [moved] = sections.splice(fromIdx, 1);
        sections.splice(toIdx, 0, moved);
        onReorderSections(sections);
      }
    }
    setDraggingSectionId(null);
    setDragOverSectionId(null);
  }

  // ① アイテムドラッグ（タッチ）
  const itemLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleItemTouchStart(e: React.TouchEvent, sectionId: string, idx: number) {
    itemDragY.current = e.touches[0].clientY;
    itemLongPressTimer.current = setTimeout(() => {
      setDraggingItem({ sectionId, idx });
    }, 400);
  }

  function handleItemTouchMove(e: React.TouchEvent, sectionId: string, itemCount: number) {
    if (!draggingItem || draggingItem.sectionId !== sectionId) {
      if (itemLongPressTimer.current) clearTimeout(itemLongPressTimer.current);
      return;
    }
    e.preventDefault();
    const y = e.touches[0].clientY;
    const els = document.querySelectorAll(`[data-item-section="${sectionId}"]`);
    for (let i = 0; i < els.length; i++) {
      const rect = els[i].getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        if (i !== draggingItem.idx) setDragOverItemIdx(i);
        break;
      }
    }
  }

  function handleItemTouchEnd(section: Section) {
    if (itemLongPressTimer.current) clearTimeout(itemLongPressTimer.current);
    if (draggingItem && draggingItem.sectionId === section.id && dragOverItemIdx !== null && draggingItem.idx !== dragOverItemIdx) {
      const items = [...(section.items ?? [])];
      const [movedItem] = items.splice(draggingItem.idx, 1);
      items.splice(dragOverItemIdx, 0, movedItem);
      // statuses のキーを再マッピング
      const oldStatuses = section.statuses;
      const newStatuses: Section["statuses"] = {};
      items.forEach((_, newIdx) => {
        const newNum = section.startNum + newIdx;
        // 元のインデックスを逆算して旧ステータスをコピー
        const origItems = section.items ?? [];
        const origIdx = origItems.indexOf(movedItem) === newIdx
          ? draggingItem!.idx
          : newIdx < dragOverItemIdx!
            ? newIdx
            : newIdx;
        const origNum = section.startNum + origIdx;
        if (oldStatuses[origNum]) newStatuses[newNum] = "read";
      });
      onReorderItems(section.id, items, newStatuses);
    }
    setDraggingItem(null);
    setDragOverItemIdx(null);
  }

  // ③ テキスト検索フィルタ
  const filteredSections = useCallback(() => {
    if (!textSearch.trim()) return work.sections;
    return work.sections.map((s) => {
      if (s.mode !== "text" || !s.items) return s;
      const filtered = s.items.filter((item) =>
        item.toLowerCase().includes(textSearch.toLowerCase())
      );
      return { ...s, _filteredItems: filtered };
    });
  }, [work.sections, textSearch]);

  return (
    <div
      className="min-h-screen bg-[#1a1b26] flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="sticky top-0 z-10 bg-[#1a1b26]/95 backdrop-blur-md border-b border-[#2a2d3e] px-4 py-3">
        <div className="max-w-lg mx-auto relative">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="shrink-0 flex items-center gap-1 text-sm font-medium active:scale-95 transition-transform py-1 pr-2"
              style={{ color: folderHex }}
            >
              <span className="text-base">←</span>
              <span>戻る</span>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-[#c0caf5] text-base leading-tight truncate">{work.title}</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasTextSections && (
                <button
                  onClick={() => setShowTextSearch((v) => !v)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#24283b] border border-[#3b4261] active:scale-95 transition-transform text-sm"
                  style={{ color: showTextSearch ? accentHex : "#787c99", borderColor: showTextSearch ? accentHex : "#3b4261" }}
                  aria-label="テキスト検索"
                >⌕</button>
              )}
              <button
                onClick={() => setShowWorkEdit(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#24283b] border border-[#3b4261] text-[#787c99] active:scale-95 transition-transform text-sm"
              >⚙</button>
            </div>
          </div>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-12 z-20 bg-[#1f2335] border border-[#3b4261] rounded-xl shadow-xl min-w-[160px] overflow-hidden">
                <button onClick={handleDelete} className="w-full px-4 py-3 text-left text-sm text-[#f7768e] hover:bg-[#24283b] transition-colors">
                  🗑 削除する
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="px-4 py-3 max-w-lg mx-auto w-full">
        <div className="bg-[#24283b] border border-[#3b4261] rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-4 text-xs text-[#787c99]">
              <span>
                <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: accentHex }} />
                {work.labelRead} {read}
              </span>
              <span className="text-[#4a5177]">/ {total}{work.unit}</span>
            </div>
            <span className="text-xs font-bold" style={{ color: accentHex }}>{percent}%</span>
          </div>
          <div className="h-2 bg-[#1a1b26] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: accentHex }} />
          </div>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto w-full mb-2">
        <div className="flex gap-4 text-xs text-[#787c99]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-5 rounded border border-[#3b4261] bg-[#24283b]" />
            {work.labelUnread}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-5 rounded border" style={{ backgroundColor: accentHex, borderColor: accentHex }} />
            {work.labelRead}
          </span>
        </div>
      </div>

      {/* ③ テキストモード検索バー */}
      {hasTextSections && (
        <div className="px-4 mb-2 max-w-lg mx-auto w-full">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#787c99] text-sm">🔍</span>
            <input
              value={textSearch}
              onChange={(e) => setTextSearch(e.target.value)}
              placeholder="テキスト項目を検索..."
              className="w-full bg-[#24283b] text-[#c0caf5] border border-[#3b4261] rounded-xl pl-9 pr-8 py-2.5 text-sm outline-none focus:border-[#7aa2f7] transition-colors placeholder-[#4a5177]"
            />
            {textSearch && (
              <button onClick={() => setTextSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787c99] text-lg leading-none">✕</button>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 px-3 max-w-lg mx-auto w-full pb-6">
        {work.sections.length === 0 ? (
          <div className="mt-12 text-center space-y-2">
            <p className="text-3xl">📋</p>
            <p className="text-[#787c99] text-sm">{secLabel}がありません</p>
            <button
              onClick={() => setSectionModal({ mode: "add" })}
              className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold text-[#1a1b26] active:scale-95 transition-transform"
              style={{ backgroundColor: accentHex }}
            >
              ＋ {secLabel}を追加
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredSections().map((section) => {
              const sectionWithFilter = section as Section & { _filteredItems?: string[] };
              const displayItems = sectionWithFilter._filteredItems ?? section.items ?? [];
              const { read: sRead, total: sTotal } = calcSectionProgress(section);
              const isDraggingThis = draggingSectionId === section.id;
              const isDragOver = dragOverSectionId === section.id;

              return (
                <div
                  key={section.id}
                  data-section-id={section.id}
                  className={`transition-all duration-150 ${isDraggingThis ? "opacity-40 scale-[0.98]" : ""} ${isDragOver ? "ring-2 rounded-xl" : ""}`}
                  style={isDragOver ? { ringColor: accentHex } : {}}
                  onTouchMove={(e) => handleSectionTouchMove(e)}
                  onTouchEnd={handleSectionTouchEnd}
                >
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* ① セクションドラッグハンドル（長押し） */}
                      <button
                        className="shrink-0 w-7 h-7 flex items-center justify-center text-[#4a5177] cursor-grab active:cursor-grabbing touch-none select-none"
                        onTouchStart={(e) => { e.stopPropagation(); handleSectionTouchStart(e, section.id); }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          // マウスでのドラッグ
                          setDraggingSectionId(section.id);
                          const onMouseMove = (me: MouseEvent) => {
                            const els = document.querySelectorAll("[data-section-id]");
                            for (const el of els) {
                              const rect = el.getBoundingClientRect();
                              if (me.clientY >= rect.top && me.clientY <= rect.bottom) {
                                const id = (el as HTMLElement).dataset.sectionId!;
                                if (id !== section.id) setDragOverSectionId(id);
                                break;
                              }
                            }
                          };
                          const onMouseUp = () => {
                            window.removeEventListener("mousemove", onMouseMove);
                            window.removeEventListener("mouseup", onMouseUp);
                            setDraggingSectionId((cur) => {
                              setDragOverSectionId((over) => {
                                if (cur && over) {
                                  const sections = [...work.sections];
                                  const fromIdx = sections.findIndex((s) => s.id === cur);
                                  const toIdx = sections.findIndex((s) => s.id === over);
                                  if (fromIdx !== -1 && toIdx !== -1) {
                                    const [moved] = sections.splice(fromIdx, 1);
                                    sections.splice(toIdx, 0, moved);
                                    onReorderSections(sections);
                                  }
                                }
                                return null;
                              });
                              return null;
                            });
                          };
                          window.addEventListener("mousemove", onMouseMove);
                          window.addEventListener("mouseup", onMouseUp);
                        }}
                        aria-label="セクションを並び替え"
                      >
                        ⠿
                      </button>
                      <div className="min-w-0">
                        <span className="font-bold text-[#c0caf5] text-sm">{section.label}</span>
                        <span className="text-xs text-[#787c99] ml-2">
                          {section.mode === "text"
                            ? `${sTotal}項目 · ${work.labelRead} ${sRead}/${sTotal}`
                            : `${section.startNum}〜${section.endNum}${work.unit} · ${work.labelRead} ${sRead}/${sTotal}`
                          }
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSectionModal({ mode: "edit", section })}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#787c99] text-xs active:scale-95 transition-transform"
                      >⚙️</button>
                      <button
                        onClick={() => handleDeleteSection(section)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#f7768e] text-xs active:scale-95 transition-transform"
                      >🗑</button>
                    </div>
                  </div>

                  {section.mode === "text" && section.items ? (
                    <div className="space-y-1.5">
                      {displayItems.map((itemLabel, idx) => {
                        // 検索時は元のitemsから実インデックスを探す
                        const realIdx = section.items!.indexOf(itemLabel);
                        const num = section.startNum + (textSearch ? realIdx : idx);
                        const isRead = !!section.statuses[num];
                        const isDraggingThisItem = draggingItem?.sectionId === section.id && draggingItem?.idx === idx;
                        const isDragOverItem = draggingItem?.sectionId === section.id && dragOverItemIdx === idx;
                        return (
                          <button
                            key={`${section.id}-${idx}`}
                            id={`item-${section.id}-${num}`}
                            data-item-section={section.id}
                            onClick={() => handleToggle(section.id, num)}
                            onTouchStart={(e) => { e.stopPropagation(); handleItemTouchStart(e, section.id, idx); }}
                            onTouchMove={(e) => handleItemTouchMove(e, section.id, displayItems.length)}
                            onTouchEnd={(e) => { e.stopPropagation(); handleItemTouchEnd(section); }}
                            onMouseDown={(e) => {
                              // マウスでのアイテムドラッグ
                              const startY = e.clientY;
                              let moved = false;
                              const onMouseMove = (me: MouseEvent) => {
                                if (Math.abs(me.clientY - startY) > 5) moved = true;
                                if (!moved) return;
                                setDraggingItem({ sectionId: section.id, idx });
                                const els = document.querySelectorAll(`[data-item-section="${section.id}"]`);
                                for (let i = 0; i < els.length; i++) {
                                  const rect = els[i].getBoundingClientRect();
                                  if (me.clientY >= rect.top && me.clientY <= rect.bottom) {
                                    if (i !== idx) setDragOverItemIdx(i);
                                    break;
                                  }
                                }
                              };
                              const onMouseUp = () => {
                                window.removeEventListener("mousemove", onMouseMove);
                                window.removeEventListener("mouseup", onMouseUp);
                                if (moved) {
                                  setDraggingItem((di) => {
                                    setDragOverItemIdx((doi) => {
                                      if (di && doi !== null && di.idx !== doi) {
                                        const items = [...(section.items ?? [])];
                                        const [movedItem] = items.splice(di.idx, 1);
                                        items.splice(doi, 0, movedItem);
                                        const newStatuses: Section["statuses"] = {};
                                        items.forEach((it, newIdx) => {
                                          const origIdx = section.items!.indexOf(it);
                                          if (section.statuses[section.startNum + origIdx]) {
                                            newStatuses[section.startNum + newIdx] = "read";
                                          }
                                        });
                                        onReorderItems(section.id, items, newStatuses);
                                      }
                                      return null;
                                    });
                                    return null;
                                  });
                                }
                              };
                              window.addEventListener("mousemove", onMouseMove);
                              window.addEventListener("mouseup", onMouseUp);
                            }}
                            className={`w-full border rounded-xl px-4 py-3 text-left text-sm font-medium select-none touch-manipulation active:scale-[0.98] transition-all duration-100 ${isDraggingThisItem ? "opacity-40" : ""} ${isDragOverItem ? "ring-2 ring-offset-1 ring-offset-[#1a1b26]" : ""}`}
                            style={
                              isRead
                                ? { backgroundColor: accentHex, color: "#1a1b26", borderColor: accentHex, ...(isDragOverItem ? { ringColor: accentHex } : {}) }
                                : { backgroundColor: "#24283b", color: "#c0caf5", borderColor: "#3b4261" }
                            }
                          >
                            {/* ⑨ テキストモード：折り返し全文表示 */}
                            <span className="whitespace-pre-wrap break-words">{itemLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
                      {Array.from(
                        { length: section.endNum - section.startNum + 1 },
                        (_, i) => section.startNum + i
                      ).map((num) => {
                        const isRead = !!section.statuses[num];
                        return (
                          <button
                            key={num}
                            id={`item-${section.id}-${num}`}
                            onClick={() => handleToggle(section.id, num)}
                            className="border rounded-xl aspect-square flex items-center justify-center font-bold text-sm select-none touch-manipulation active:scale-90 transition-all duration-100"
                            style={
                              isRead
                                ? { backgroundColor: accentHex, color: "#1a1b26", borderColor: accentHex }
                                : { backgroundColor: "#24283b", color: "#4a5177", borderColor: "#3b4261" }
                            }
                            aria-label={`${num}${work.unit}`}
                          >
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => setSectionModal({ mode: "add" })}
              className="w-full py-3 rounded-xl border border-dashed border-[#3b4261] text-[#787c99] text-sm active:scale-95 transition-transform flex items-center justify-center gap-1.5"
            >
              <span>＋</span>
              <span>{secLabel}を追加</span>
            </button>
          </div>
        )}
      </main>

      {/* ② 範囲指定一括変更UI 削除済み */}

      {showWorkEdit && (
        <WorkModal
          mode="edit"
          initial={work}
          onClose={() => setShowWorkEdit(false)}
          onSave={(data) => { onEditWork(data); setShowWorkEdit(false); }}
        />
      )}
      {sectionModal?.mode === "add" && (
        <SectionModal
          mode="add"
          labelName={secLabel}
          workId={work.id}
          defaults={getAddSectionDefaults()}
          onClose={() => setSectionModal(null)}
          onSave={(label, startNum, endNum, sectionMode, items) => {
            onAddSection({ label, startNum, endNum, mode: sectionMode, items });
            setSectionModal(null);
          }}
        />
      )}
      {sectionModal?.mode === "edit" && (
        <SectionModal
          mode="edit"
          labelName={secLabel}
          workId={work.id}
          initial={sectionModal.section}
          onClose={() => setSectionModal(null)}
          onSave={(label, startNum, endNum, sectionMode, items) => {
            onEditSection(sectionModal.section.id, { label, startNum, endNum, mode: sectionMode, items });
            setSectionModal(null);
          }}
        />
      )}
    </div>
  );
}
