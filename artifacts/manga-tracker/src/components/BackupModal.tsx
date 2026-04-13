import { useState } from "react";
import type { MangaEntry } from "../types";
import { exportAllToJson, importFromJson } from "../storage";

interface Props {
  entries: MangaEntry[];
  onClose: () => void;
  onImport: (entries: MangaEntry[]) => void;
}

export default function BackupModal({ entries, onClose, onImport }: Props) {
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [tab, setTab] = useState<"export" | "import">("export");

  const json = exportAllToJson(entries);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = json;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleImport() {
    const parsed = importFromJson(importText.trim());
    if (!parsed) {
      setImportError("JSONの形式が正しくありません");
      return;
    }
    if (!window.confirm(`${parsed.length}件のデータをインポートします。現在のデータは上書きされます。よろしいですか？`)) return;
    onImport(parsed);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#1f2335] border border-[#3b4261] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#c0caf5]">バックアップ</h2>
          <button onClick={onClose} className="text-[#787c99] hover:text-[#c0caf5] text-xl leading-none transition-colors">✕</button>
        </div>

        <div className="flex gap-1 mb-4 bg-[#24283b] rounded-xl p-1">
          <button
            onClick={() => setTab("export")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === "export" ? "bg-[#3b4261] text-[#c0caf5]" : "text-[#787c99]"}`}
          >
            エクスポート
          </button>
          <button
            onClick={() => setTab("import")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === "import" ? "bg-[#3b4261] text-[#c0caf5]" : "text-[#787c99]"}`}
          >
            インポート
          </button>
        </div>

        {tab === "export" && (
          <div className="flex flex-col gap-3 flex-1 overflow-hidden">
            <p className="text-xs text-[#787c99]">全データをJSONテキストとしてコピーできます。メモ帳などに保存して保管してください。</p>
            <textarea
              readOnly
              value={json}
              className="flex-1 min-h-[180px] bg-[#24283b] text-[#787c99] text-xs border border-[#3b4261] rounded-xl p-3 outline-none font-mono resize-none"
            />
            <button
              onClick={handleCopy}
              className={`w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${copied ? "bg-[#9ece6a] text-[#1a1b26]" : "bg-[#7aa2f7] text-[#1a1b26]"}`}
            >
              {copied ? "✓ コピーしました！" : "JSONをコピー"}
            </button>
          </div>
        )}

        {tab === "import" && (
          <div className="flex flex-col gap-3 flex-1 overflow-hidden">
            <p className="text-xs text-[#787c99]">バックアップしたJSONテキストを貼り付けてインポートします。現在のデータは上書きされます。</p>
            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportError(""); }}
              placeholder="JSONを貼り付け..."
              className="flex-1 min-h-[180px] bg-[#24283b] text-[#c0caf5] text-xs border border-[#3b4261] rounded-xl p-3 outline-none font-mono resize-none placeholder-[#4a5177] focus:border-[#7aa2f7] transition-colors"
            />
            {importError && <p className="text-xs text-[#f7768e]">{importError}</p>}
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="w-full py-3 rounded-xl bg-[#f7768e] text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              インポートする
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
