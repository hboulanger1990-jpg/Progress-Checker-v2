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
  onReorder: (newWorks: Work[]) => void;
}

export default function WorkListScreen({ folder, onBack, onSelect, onToggleCompleted, onAdd, onEdit, onDelete, onReorder }: Props) {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Work | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
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

  const allTags = Array.from(new Set(folder.works.flatMap((w) => w.tags ?? [])));

  const filtered = folder.works.filter((w) => {
    const matchText = w.title.toLowerCase().includes(search.toLowerCase());
    const matchTag = selectedTag ? (w.tags ?? []).includes(selectedTag) : true;
    return matchText && matchTag;
  });

  const sortedFiltered = sortMode
    ? folder.works
    : isReadMode
      ? filtered
      : [...filtered].sort((a, b) => {
          const pa = calcWorkProgress(a.sections).percent;
          const pb = calcWorkProgress(b.sections).percent;
          const rankA = pa === 100 ? 2 : pa === 0 ? 1 : 0;
          const rankB = pb === 100 ? 2 : pb === 0 ? 1 : 0;
          if (rankA !== rankB) return rankA - rankB;
          return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
        });

  function handleDelete(w: Work) {
    if (!window.confirm(`「${w.title}」を削除しますか？この操作は元に戻せません。`)) return;
    onDelete(w.id);
    setSelectedId(null);
  }

  function handlePressStart(id: string, touchX: number, touchY: number) {
    if (sortMode) return;
    touchStart.current = { x: touchX, y: touchY };
    longPressTimer.current = setTimeout(() => setSelectedId(id), 500);
  }
  function handlePressEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }
  function handleTouchStart(e: React.TouchEvent, id: string) {
    handlePressStart(id, e.touches[0].clientX, e.touches[0].clientY);
  }

  function calcDragOverIdx(clientY: number): number {
    const els = document.querySelectorAll("[data-work-id]");
    let found = 0;
    for (let i = 0; i < els.length; i++) {
      const rect = els[i].getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) { found = i; return found; }
      found = i + 1;
    }
    return found;
  }

  function applyReorder(fromId: string, overIdx: number) {
    const list = [...folder.works];
    const fromIdx = list.findIndex((w) => w.id === fromId);
    if (fromIdx === -1) return;
    const adjustedTo = overIdx > fromIdx ? overIdx - 1 : overIdx;
    if (adjustedTo === fromIdx) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(adjustedTo, 0, moved);
    onReorder(list);
  }

  function handleMouseDragStart(e: React.MouseEvent, id: string) {
    if (!sortMode) return;
    e.preventDefault();
    setDraggingId(id);
    const onMove = (me: MouseEvent) => {
      setDragOverIdx(calcDragOverIdx(me.clientY));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDraggingId((cur) => {
        setDragOverIdx((over) => {
          if (cur && over !== null) applyReorder(cur, over);
          return null;
        });
        return null;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleTouchDragStart(e: React.TouchEvent, id: string) {
    if (!sortMode) return;
    e.stopPropagation();
    setDraggingId(id);
  }
  function handleTouchDragMove(e: React.TouchEvent) {
    if (!sortMode || !draggingId) return;
    e.preventDefault();
    setDragOverIdx(calcDragOverIdx(e.touches[0].clientY));
  }
  function handleTouchDragEnd() {
    if (draggingId && dragOverIdx !== null) applyReorder(draggingId, dragOverIdx);
    setDraggingId(null);
    setDragOverIdx(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }
  function handleDragLeave() {
    setIsDragOver(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const text = e.dataTransfer.getData("text/plain");
    if (!text) return;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    [...lines].reverse().forEach((title) => {
      onAdd({
        title,
        accentColor: folder.accentColor,
        labelUnread: folderDefaults.labelUnread,
        labelRead: folderDefaults.labelRead,
        unit: folderDefaults.unit,
        sectionLabel: "",
        tags: [],
      });
    });
  }

  return (
    <div
      className="min-h-screen bg-[#1a1b26] flex flex-col relative"
      onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={(e) => {
        handleTouchDragEnd();
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        const dy = Math.abs(e.changedTouches[0].clientY - touchStart.current.y);
        if (!sortMode && touchStart.current.x < 40 && dx > 80 && dy < 80) onBack();
      }}
      onTouchMove={(e) => handleTouchDragMove(e)}
      onClick={() => setSelectedId(null)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-[#1a1b26]/80 backdrop-blur-sm" />
          <div
            className="relative border-2 border-dashed rounded-3xl px-10 py-8 text-center"
            style={{ borderColor: folderHex }}
          >
            <p className="text-4xl mb-2">📋</p>
            <p className="font-bold text-lg" style={{ color: folderHex }}>ここにドロップ</p>
            <p className="text-sm text-[#787c99] mt-1">1行につき1項目として追加します</p>
          </div>
        </div>
      )}

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
