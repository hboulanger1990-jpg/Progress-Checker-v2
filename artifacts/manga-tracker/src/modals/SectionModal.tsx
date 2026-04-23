import { useState, useEffect, useRef } from "react";
import type { Section } from "../types";

interface Props {
  mode: "add" | "edit";
  initial?: Section;
  defaults?: { label: string; startNum: number; endNum?: number };
  labelName?: string;
  workId: string;
  onClose: () => void;
  onSave: (label: string, startNum: number, endNum: number, sectionMode: "number" | "text", items: string[]) => void;
}

const SECTION_MODE_KEY = "pc-section-mode-";

export default function SectionModal({ mode, initial, defaults, labelName = "セクション", workId, onClose, onSave }: Props) {
  const [label, setLabel] = useState(initial?.label ?? defaults?.label ?? "");
  const [startNum, setStartNum] = useState(String(initial?.startNum ?? defaults?.startNum ?? 1));
  const [endNum, setEndNum] = useState(
    initial?.endNum != null ? String(initial.endNum) :
    defaults?.endNum != null ? String(defaults.endNum) : ""
  );
  const savedMode = localStorage.getItem(SECTION_MODE_KEY + workId) as "number" | "text" | null;
  const [sectionMode, setSectionMode] = useState<"number" | "text">(
    initial?.mode ?? savedMode ?? "number"
  );
  const [items, setItems] = useState<string[]>(initial?.items ?? [""]);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  function handleSetMode(m: "number" | "text") {
    setSectionMode(m);
    localStorage.setItem(SECTION_MODE_KEY + workId, m);
  }

  function handleItemChange(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    if (index === items.length - 1 && value.trim() !== "") {
      next.push("");
    }
    setItems(next);
  }

  function handleItemPaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    const lines = pasted.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== "");
    if (lines.length <= 1) return; // 1行なら通常のペーストに任せる
    e.preventDefault();
    const before = items.slice(0, index).filter((_, i) => i < index);
    const after = items.slice(index + 1).filter((l) => l.trim() !== "");
    const next = [...before, ...lines, ...after, ""];
    setItems(next);
    setError("");
  }

  function removeItem(index: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function handleSave() {
    const l = label.trim();
    if (!l) { setError(`${labelName}名を入力してください`); return; }

    if (sectionMode === "text") {
      const validItems = items.filter((i) => i.trim() !== "");
      if (validItems.length === 0) { setError("項目を1つ以上入力してください"); return; }
      onSave(l, 1, validItems.length, "text", validItems);
      return;
    }

    const s = parseInt(startNum, 10);
    if (isNaN(s) || s < 1) { setError("開始番号が正しくありません"); return; }
    if (!endNum.trim()) { setError("終了番号を入力してください"); return; }
    const e = parseInt(endNum, 10);
    if (isNaN(e) || e < s) { setError("終了番号は開始番号以上にしてください"); return; }
    if (e - s + 1 > 2000) { setError("最大2000項目まで設定できます"); return; }
    onSave(l, s, e, "number", []);
  }

  const inputClass = "w-full bg-[#24283b] text-[#c0caf5] border border-[#3b4261] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#7aa2f7] transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={sectionMode === "text" ? undefined : onClose}
      />
      <div
        className="relative w-full sm:max-w-sm bg-[#1f2335] border border-[#3b4261] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl overflow-y-auto"
        style={{ maxHeight: "90dvh" }}
      >
        <h2 className="text-lg font-bold text-[#c0caf5] mb-5">
          {mode === "add" ? `${labelName}を追加` : `${labelName}を編集`}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#787c99] mb-1">{labelName}名</label>
            <input
              ref={inputRef}
              value={label}
              onChange={(e) => { setLabel(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs text-[#787c99] mb-2">入力モード</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSetMode("number")}
                className="py-2 rounded-xl border text-sm font-medium transition-colors active:scale-95"
                style={
                  sectionMode === "number"
                    ? { backgroundColor: "#7aa2f733", borderColor: "#7aa2f7", color: "#7aa2f7" }
                    : { backgroundColor: "#24283b", borderColor: "#3b4261", color: "#787c99" }
                }
              >
                🔢 数字
              </button>
              <button
                onClick={() => handleSetMode("text")}
                className="py-2 rounded-xl border text-sm font-medium transition-colors active:scale-95"
                style={
                  sectionMode === "text"
                    ? { backgroundColor: "#7aa2f733", borderColor: "#7aa2f7", color: "#7aa2f7" }
                    : { backgroundColor: "#24283b", borderColor: "#3b4261", color: "#787c99" }
                }
              >
                📝 テキスト
              </button>
            </div>
          </div>

          {sectionMode === "number" ? (
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
          ) : (
            <div>
              <label className="block text-xs text-[#787c99] mb-2">
                項目（1行1項目・複数行のコピペ一括入力可）
              </label>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      value={item}
                      onChange={(e) => { handleItemChange(index, e.target.value); setError(""); }}
                      onPaste={(e) => handleItemPaste(index, e)}
                      placeholder={`項目 ${index + 1}`}
                      className={`${inputClass} placeholder-[#4a5177]`}
                    />
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1b26] text-[#f7768e] border border-[#3b4261] active:scale-95"
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#4a5177] mt-2">※テキスト入力中は外側クリックで閉じません</p>
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
