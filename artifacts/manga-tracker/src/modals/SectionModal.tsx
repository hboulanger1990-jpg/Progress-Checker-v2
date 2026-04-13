import { useState, useEffect, useRef } from "react";
import type { Section } from "../types";

interface Props {
  mode: "add" | "edit";
  initial?: Section;
  defaults?: { label: string; startNum: number; endNum: number };
  onClose: () => void;
  onSave: (label: string, startNum: number, endNum: number) => void;
}

export default function SectionModal({ mode, initial, defaults, onClose, onSave }: Props) {
  const [label, setLabel] = useState(initial?.label ?? defaults?.label ?? "");
  const [startNum, setStartNum] = useState(String(initial?.startNum ?? defaults?.startNum ?? 1));
  const [endNum, setEndNum] = useState(String(initial?.endNum ?? defaults?.endNum ?? 12));
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  function handleSave() {
    const l = label.trim();
    if (!l) { setError("セクション名を入力してください"); return; }
    const s = parseInt(startNum, 10);
    const e = parseInt(endNum, 10);
    if (isNaN(s) || s < 1) { setError("開始番号が正しくありません"); return; }
    if (isNaN(e) || e < s) { setError("終了番号は開始番号以上にしてください"); return; }
    if (e - s + 1 > 2000) { setError("最大2000項目まで設定できます"); return; }
    onSave(l, s, e);
  }

  const inputClass = "w-full bg-[#24283b] text-[#c0caf5] border border-[#3b4261] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#7aa2f7] transition-colors placeholder-[#4a5177]";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#1f2335] border border-[#3b4261] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
        <h2 className="text-lg font-bold text-[#c0caf5] mb-5">
          {mode === "add" ? "セクションを追加" : "セクションを編集"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#787c99] mb-1">セクション名</label>
            <input
              ref={inputRef}
              value={label}
              onChange={(e) => { setLabel(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
              placeholder="例: シーズン1、第1部..."
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#787c99] mb-1">開始番号</label>
              <input
                type="number"
                value={startNum}
                onChange={(e) => { setStartNum(e.target.value); setError(""); }}
                min={1}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-[#787c99] mb-1">終了番号</label>
              <input
                type="number"
                value={endNum}
                onChange={(e) => { setEndNum(e.target.value); setError(""); }}
                min={1}
                className={inputClass}
              />
            </div>
          </div>
          {error && <p className="text-xs text-[#f7768e]">{error}</p>}
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#3b4261] text-[#787c99] text-sm font-medium active:scale-95 transition-transform">
            キャンセル
          </button>
          <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-[#7aa2f7] text-[#1a1b26] text-sm font-bold active:scale-95 transition-transform">
            {mode === "add" ? "追加" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
