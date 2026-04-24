import { useState, useEffect, useRef } from "react";
import type { AccentColor, Folder } from "../types";
import { ACCENT_COLORS } from "../types";

interface Props {
  mode: "add" | "edit";
  initial?: Folder;
  onClose: () => void;
  onSave: (
    title: string,
    color: AccentColor,
    type: "progress" | "read",
    defaultLabelUnread: string,
    defaultLabelRead: string,
    defaultUnit: string
  ) => void;
}

const COLOR_KEYS = Object.keys(ACCENT_COLORS) as AccentColor[];

export default function FolderModal({ mode, initial, onClose, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [color, setColor] = useState<AccentColor>(initial?.accentColor ?? "blue");
  const [folderType, setFolderType] = useState<"progress" | "read">(initial?.type ?? "progress");
  const [defaultLabelUnread, setDefaultLabelUnread] = useState(initial?.defaultLabelUnread ?? "");
  const [defaultLabelRead, setDefaultLabelRead] = useState(initial?.defaultLabelRead ?? "");
  const [defaultUnit, setDefaultUnit] = useState(initial?.defaultUnit ?? "");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  function handleSave() {
    const t = title.trim();
    if (!t) { setError("タイトルを入力してください"); return; }
    onSave(t, color, folderType, defaultLabelUnread.trim(), defaultLabelRead.trim(), defaultUnit.trim());
  }

  const inputClass = "w-full bg-[#24283b] text-[#c0caf5] border border-[#3b4261] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#7aa2f7] transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-sm bg-[#1f2335] border border-[#3b4261] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl overflow-y-auto"
        style={{ maxHeight: "90dvh" }}
      >
        <h2 className="text-lg font-bold text-[#c0caf5] mb-5">
          {mode === "add" ? "フォルダを追加" : "フォルダを編集"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#787c99] mb-1">フォルダ名</label>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs text-[#787c99] mb-2">管理タイプ</label>
            <div className="grid grid-cols-2 gap-2">
              {(["progress", "read"] as const).map((t) => {
                const isSelected = folderType === t;
                const label = t === "progress" ? "進捗管理" : "完了管理";
                const desc = t === "progress" ? "話数・章などを細かく記録" : "完了／未完了をワンタップで管理";
                return (
                  <button
                    key={t}
                    onClick={() => setFolderType(t)}
                    className="rounded-xl border p-3 text-left transition-all active:scale-95"
                    style={{
                      borderColor: isSelected ? ACCENT_COLORS[color].hex : "#3b4261",
                      backgroundColor: isSelected ? `${ACCENT_COLORS[color].hex}22` : "#24283b",
                    }}
                  >
                    <div className="text-sm font-bold mb-1" style={{ color: isSelected ? ACCENT_COLORS[color].hex : "#c0caf5" }}>
                      {label}
                    </div>
                    <div className="text-xs text-[#787c99] leading-tight">{desc}</div>
                  </button>
                );
              })}
            </div>
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

          {folderType === "progress" && (
            <div className="border-t border-[#3b4261] pt-4">
              <p className="text-xs text-[#787c99] mb-3">新規項目のデフォルト設定（省略可）</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-[#787c99] mb-1">未完了ラベル</label>
                  <input value={defaultLabelUnread} onChange={(e) => setDefaultLabelUnread(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-[#787c99] mb-1">完了ラベル</label>
                  <input value={defaultLabelRead} onChange={(e) => setDefaultLabelRead(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#787c99] mb-1">単位</label>
                <input value={defaultUnit} onChange={(e) => setDefaultUnit(e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

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
