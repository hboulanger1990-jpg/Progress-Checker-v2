import { useState, useEffect, useRef } from "react";
import type { AccentColor, Work } from "../types";
import { ACCENT_COLORS } from "../types";

interface Props {
  mode: "add" | "edit";
  initial?: Work;
  folderDefaults?: { labelUnread: string; labelRead: string };
  onClose: () => void;
  onSave: (data: { title: string; accentColor: AccentColor; labelUnread: string; labelRead: string; unit: string }) => void;
}

const COLOR_KEYS = Object.keys(ACCENT_COLORS) as AccentColor[];

export default function WorkModal({ mode, initial, folderDefaults, onClose, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [color, setColor] = useState<AccentColor>(initial?.accentColor ?? "blue");
  const [labelUnread, setLabelUnread] = useState(
    initial?.labelUnread ?? folderDefaults?.labelUnread ?? "未完了"
  );
  const [labelRead, setLabelRead] = useState(
    initial?.labelRead ?? folderDefaults?.labelRead ?? "完了"
  );
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  function handleSave() {
    const t = title.trim();
    if (!t) { setError("タイトルを入力してください"); return; }
    if (!labelUnread.trim() || !labelRead.trim()) { setError("ステータス名を入力してください"); return; }
    onSave({ title: t, accentColor: color, labelUnread: labelUnread.trim(), labelRead: labelRead.trim(), unit: unit.trim() });
  }

  const inputClass = "w-full bg-[#24283b] text-[#c0caf5] border border-[#3b4261] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#7aa2f7] transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#1f2335] border border-[#3b4261] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-[#c0caf5] mb-5">
          {mode === "add" ? "項目を追加" : "項目を編集"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#787c99] mb-1">タイトル</label>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-[#787c99] mb-2">アクセントカラー</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_KEYS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-10 h-10 rounded-full transition-transform active:scale-90"
                  style={{
                    backgroundColor: ACCENT_COLORS[c].hex,
                    outline: color === c ? `3px solid ${ACCENT_COLORS[c].hex}` : "none",
                    outlineOffset: 2,
                    opacity: color === c ? 1 : 0.5,
                  }}
                  aria-label={ACCENT_COLORS[c].label}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#787c99] mb-1">未完了ラベル</label>
              <input value={labelUnread} onChange={(e) => setLabelUnread(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-[#787c99] mb-1">完了ラベル</label>
              <input value={labelRead} onChange={(e) => setLabelRead(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#787c99] mb-1">単位（省略可）</label>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} />
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
