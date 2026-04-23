import { useState, useRef, useEffect } from "react";
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
  onBulkRange: (start: number, end: number, toRead: boolean) => void;
}

type SectionModalState =
  | null
  | { mode: "add" }
  | { mode: "edit"; section: Section };

const LAST_TOGGLE_PREFIX = "pc-lt-";

export default function WorkDetailScreen({
  folder, work, onBack, onEditWork, onDeleteWork,
  onAddSection, onEditSection, onDeleteSection, onToggleItem, onBulkRange,
}: Props) {
  const [showWorkEdit, setShowWorkEdit] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [sectionModal, setSectionModal] = useState<SectionModalState>(null);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangeError, setRangeError] = useState("");
  const touchStart = useRef({ x: 0, y: 0 });

  const accentHex = ACCENT_COLORS[work.accentColor].hex;
  const folderHex = ACCENT_COLORS[folder.accentColor].hex;
  const { read, total, percent } = calcWorkProgress(work.sections);
  const secLabel = work.sectionLabel || "セクション";
  const ltKey = `${LAST_TOGGLE_PREFIX}${work.id}`;

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function handleTouchEnd(e: React.TouchEvent) {
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

  function handleBulkRange(toRead: boolean) {
    const s = parseInt(rangeStart, 10);
    const e = parseInt(rangeEnd, 10);
    if (isNaN(s) || isNaN(e) || s < 1 || e < 1) { setRangeError("正しい数値を入力してください"); return; }
    if (s > e) { setRangeError("開始番号は終了番号以下にしてください"); return; }
    const count = e - s + 1;
    if (count >= 10) {
      const label = toRead ? work.labelRead : work.labelUnread;
      if (!window.confirm(`${s}〜${e}（${count}件）を「${label}」に変更します。よろしいですか？`)) return;
    }
    setRangeError("");
    onBulkRange(s, e, toRead);
    setRangeStart("");
    setRangeEnd("");
  }

  function getAddSectionDefaults() {
    const n = work.sections.length;
    if (n === 0) return { label: "1", startNum: 1, endNum: undefined };
    const last = work.sections[n - 1];
    const startNum = last.endNum + 1;
    const lastCount = last.endNum - last.startNum + 1;
    return { label: `${n + 1}`, startNum, endNum: startNum + lastCount - 1 };
  }

  const inputClass = "w-0 flex-1 bg-[#1a1b26] text-[#c0caf5] border border-[#3b4261] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#7aa2f7] transition-colors text-center placeholder-[#4a5177]";

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
              <h1 className="font-bold text-[#c0caf5] text-base lea
