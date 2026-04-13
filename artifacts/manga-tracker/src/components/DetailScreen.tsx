import { useState } from "react";
import type { MangaEntry, VolumeStatus } from "../types";
import { calcProgress } from "../storage";
import AddMangaModal from "./AddMangaModal";

const STATUS_CYCLE: Record<VolumeStatus, VolumeStatus> = {
  unowned: "owned",
  owned: "read",
  read: "unowned",
};

interface Props {
  entry: MangaEntry;
  onBack: () => void;
  onVolumeChange: (vol: number, status: VolumeStatus) => void;
  onEdit: (title: string, totalVolumes: number) => void;
  onDelete: () => void;
}

export default function DetailScreen({ entry, onBack, onVolumeChange, onEdit, onDelete }: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { owned, read, percent } = calcProgress(entry);

  function handleVolumeClick(vol: number) {
    const current: VolumeStatus = entry.statuses[vol] ?? "unowned";
    const next = STATUS_CYCLE[current];
    onVolumeChange(vol, next);
  }

  function handleMarkAllRead() {
    if (!window.confirm(`1〜${entry.totalVolumes}巻をすべて読了にしますか？`)) return;
    for (let v = 1; v <= entry.totalVolumes; v++) {
      onVolumeChange(v, "read");
    }
  }

  function handleDelete() {
    setShowMenu(false);
    if (!window.confirm(`「${entry.title}」を削除しますか？この操作は元に戻せません。`)) return;
    onDelete();
  }

  function getVolumeStyle(status: VolumeStatus): string {
    switch (status) {
      case "owned":
        return "bg-[#e0af68] text-[#1a1b26] border-[#c99a4a] scale-100";
      case "read":
        return "bg-[#7aa2f7] text-[#1a1b26] border-[#5a82d7] scale-100";
      default:
        return "bg-[#24283b] text-[#4a5177] border-[#3b4261]";
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1b26] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#1a1b26]/95 backdrop-blur-md border-b border-[#2a2d3e] px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="shrink-0 flex items-center gap-1 text-[#7aa2f7] text-sm font-medium active:scale-95 transition-transform py-1 pr-2"
            >
              <span className="text-base">←</span>
              <span>戻る</span>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-[#c0caf5] text-base leading-tight truncate">{entry.title}</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowEdit(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#24283b] border border-[#3b4261] text-[#787c99] hover:text-[#c0caf5] transition-colors active:scale-95 text-sm"
                aria-label="編集"
              >
                ⚙️
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#24283b] border border-[#3b4261] text-[#787c99] hover:text-[#c0caf5] transition-colors active:scale-95 text-base leading-none"
              >
                ⋯
              </button>
            </div>
          </div>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-4 top-14 z-20 bg-[#1f2335] border border-[#3b4261] rounded-xl shadow-xl min-w-[160px] overflow-hidden">
                <button
                  onClick={handleMarkAllRead}
                  className="w-full px-4 py-3 text-left text-sm text-[#9ece6a] hover:bg-[#24283b] transition-colors border-b border-[#3b4261]"
                >
                  ✅ 全巻を読了にする
                </button>
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
                <span className="inline-block w-2 h-2 rounded-sm bg-[#e0af68] mr-1"></span>
                所持 {owned}巻
              </span>
              <span>
                <span className="inline-block w-2 h-2 rounded-sm bg-[#7aa2f7] mr-1"></span>
                読了 {read}巻
              </span>
              <span className="text-[#4a5177]">/ {entry.totalVolumes}巻</span>
            </div>
            <span className="text-xs font-bold text-[#7aa2f7]">{percent}%</span>
          </div>
          <div className="h-2 bg-[#1a1b26] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#7aa2f7] to-[#bb9af7] rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 max-w-lg mx-auto w-full">
        <div className="flex gap-4 text-xs text-[#787c99]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-5 rounded border border-[#3b4261] bg-[#24283b]"></span>
            未購入
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-5 rounded border border-[#c99a4a] bg-[#e0af68]"></span>
            所持
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-5 rounded border border-[#5a82d7] bg-[#7aa2f7]"></span>
            読了
          </span>
        </div>
      </div>

      {/* Grid */}
      <main className="flex-1 px-3 py-3 max-w-lg mx-auto w-full pb-24">
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {Array.from({ length: entry.totalVolumes }, (_, i) => i + 1).map((vol) => {
            const status: VolumeStatus = entry.statuses[vol] ?? "unowned";
            return (
              <button
                key={vol}
                onClick={() => handleVolumeClick(vol)}
                className={`
                  border rounded-xl aspect-square flex items-center justify-center
                  font-bold text-sm select-none touch-manipulation
                  active:scale-90 transition-all duration-150
                  ${getVolumeStyle(status)}
                `}
                aria-label={`${vol}巻`}
              >
                {vol}
              </button>
            );
          })}
        </div>
      </main>

      {/* Bottom action */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-gradient-to-t from-[#1a1b26] via-[#1a1b26]/90 to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleMarkAllRead}
            className="w-full bg-[#9ece6a]/20 border border-[#9ece6a]/40 text-[#9ece6a] font-bold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <span>✅</span>
            <span>1〜{entry.totalVolumes}巻まで一括で読了にする</span>
          </button>
        </div>
      </div>

      {showEdit && (
        <AddMangaModal
          mode="edit"
          entry={entry}
          onClose={() => setShowEdit(false)}
          onSave={(title, totalVolumes) => {
            onEdit(title, totalVolumes);
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}
