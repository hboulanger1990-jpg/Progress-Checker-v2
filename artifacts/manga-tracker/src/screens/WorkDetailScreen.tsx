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
  onEditSection: (sectionId: string, updates: Partial<Pick<Section, "label" | "startNum" | "endNum">>) => void;
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

  // Auto-scroll to last toggled item on mount
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
    if (n === 0) {
      return { label: "1", startNum: 1, endNum: undefined };
    }
    const last = work.sections[n - 1];
    const startNum = last.endNum + 1;
    const lastCount = last.endNum - last.startNum + 1;
    return {
      label: `${n + 1}`,
      startNum,
      endNum: startNum + lastCount - 1,
    };
  }

  const inputClass = "w-0 flex-1 bg-[#1a1b26] text-[#c0caf5] border border-[#3b4261] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#7aa2f7] transition-colors text-center placeholder-[#4a5177]";

  return (
    <div
      className="min-h-screen bg-[#1a1b26] flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
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
              <button
                onClick={() => setShowWorkEdit(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#24283b] border border-[#3b4261] text-[#787c99] active:scale-95 transition-transform text-sm"
              >⚙️</button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#24283b] border border-[#3b4261] text-[#787c99] active:scale-95 transition-transform text-base leading-none"
              >⋯</button>
            </div>
          </div>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-12 z-20 bg-[#1f2335] border border-[#3b4261] rounded-xl shadow-xl min-w-[160px] overflow-hidden">
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-3 text-left text-sm text-[#f7768e] hover:bg-[#24283b] transition-colors"
                >
                  🗑 削除する
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Stats */}
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
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${percent}%`, backgroundColor: accentHex }}
            />
          </div>
        </div>
      </div>

      {/* Legend */}
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

      {/* Sections */}
      <main className="flex-1 px-3 max-w-lg mx-auto w-full pb-48">
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
            {work.sections.map((section) => {
              const { read: sRead, total: sTotal } = calcSectionProgress(section);
              return (
                <div key={section.id}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div>
                      <span className="font-bold text-[#c0caf5] text-sm">{section.label}</span>
                      <span className="text-xs text-[#787c99] ml-2">
                        {section.startNum}〜{section.endNum}{work.unit} · {work.labelRead} {sRead}/{sTotal}
                      </span>
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

      {/* Bottom: Range bulk */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-gradient-to-t from-[#1a1b26] via-[#1a1b26]/95 to-transparent">
        <div className="max-w-lg mx-auto">
          <div className="bg-[#24283b] border border-[#3b4261] rounded-2xl px-4 py-3">
            <p className="text-xs text-[#787c99] mb-2.5">範囲指定で一括変更（10件以上で確認）</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={rangeStart}
                onChange={(e) => { setRangeStart(e.target.value); setRangeError(""); }}
                placeholder="開始"
                min={1}
                className={inputClass}
              />
              <span className="text-[#787c99] text-sm shrink-0">〜</span>
              <input
                type="number"
                value={rangeEnd}
                onChange={(e) => { setRangeEnd(e.target.value); setRangeError(""); }}
                placeholder="終了"
                min={1}
                className={inputClass}
              />
              <button
                onClick={() => handleBulkRange(true)}
                className="shrink-0 font-bold px-3 py-2.5 rounded-xl text-sm active:scale-95 transition-transform text-[#1a1b26]"
                style={{ backgroundColor: accentHex }}
              >
                {work.labelRead}
              </button>
              <button
                onClick={() => handleBulkRange(false)}
                className="shrink-0 font-bold px-3 py-2.5 rounded-xl text-sm active:scale-95 transition-transform text-[#c0caf5] bg-[#1a1b26] border border-[#3b4261]"
              >
                {work.labelUnread}
              </button>
            </div>
            {rangeError && <p className="text-xs text-[#f7768e] mt-1.5">{rangeError}</p>}
          </div>
        </div>
      </div>

      {/* Modals */}
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
          defaults={getAddSectionDefaults()}
          onClose={() => setSectionModal(null)}
          onSave={(label, startNum, endNum) => {
            onAddSection({ label, startNum, endNum });
            setSectionModal(null);
          }}
        />
      )}
      {sectionModal?.mode === "edit" && (
        <SectionModal
          mode="edit"
          labelName={secLabel}
          initial={sectionModal.section}
          onClose={() => setSectionModal(null)}
          onSave={(label, startNum, endNum) => {
            onEditSection(sectionModal.section.id, { label, startNum, endNum });
            setSectionModal(null);
          }}
        />
      )}
    </div>
  );
}
