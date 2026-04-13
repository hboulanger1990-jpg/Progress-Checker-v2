import { useState, useEffect, useRef } from "react";
import type { MangaEntry } from "../types";

interface Props {
  mode: "add" | "edit";
  entry?: MangaEntry;
  onClose: () => void;
  onSave: (title: string, totalVolumes: number) => void;
}

export default function AddMangaModal({ mode, entry, onClose, onSave }: Props) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [totalVolumes, setTotalVolumes] = useState(String(entry?.totalVolumes ?? 20));
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 80);
  }, []);

  function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("タイトルを入力してください");
      return;
    }
    const vol = parseInt(totalVolumes, 10);
    if (isNaN(vol) || vol < 1 || vol > 9999) {
      setError("最大数は1〜9999の間で入力してください");
      return;
    }
    onSave(trimmed, vol);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#1f2335] border border-[#3b4261] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
        <h2 className="text-lg font-bold text-[#c0caf5] mb-5">
          {mode === "add" ? "項目を追加" : "項目を編集"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#787c99] mb-1">タイトル</label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="例: 税金で買った本"
              className="w-full bg-[#24283b] text-[#c0caf5] border border-[#3b4261] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#7aa2f7] transition-colors placeholder-[#4a5177]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#787c99] mb-1">最大数</label>
            <input
              type="number"
              value={totalVolumes}
              onChange={(e) => { setTotalVolumes(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              min={1}
              max={9999}
              className="w-full bg-[#24283b] text-[#c0caf5] border border-[#3b4261] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#7aa2f7] transition-colors"
            />
          </div>
          {error && (
            <p className="text-xs text-[#f7768e]">{error}</p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#3b4261] text-[#787c99] text-sm font-medium active:scale-95 transition-transform"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-[#7aa2f7] text-[#1a1b26] text-sm font-bold active:scale-95 transition-transform"
          >
            {mode === "add" ? "追加" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
