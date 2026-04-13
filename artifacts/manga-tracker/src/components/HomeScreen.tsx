import { useState } from "react";
import type { MangaEntry } from "../types";
import { calcProgress } from "../storage";
import AddMangaModal from "./AddMangaModal";
import BackupModal from "./BackupModal";

interface Props {
  entries: MangaEntry[];
  onSelect: (entry: MangaEntry) => void;
  onAdd: (title: string, totalVolumes: number) => void;
  onImport: (entries: MangaEntry[]) => void;
}

export default function HomeScreen({ entries, onSelect, onAdd, onImport }: Props) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  const filtered = entries.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#1a1b26] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#1a1b26]/95 backdrop-blur-md border-b border-[#2a2d3e] px-4 pt-2 pb-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-[#c0caf5]">📚 マイ漫画</h1>
            <button
              onClick={() => setShowBackup(true)}
              className="flex items-center gap-1.5 text-xs text-[#787c99] hover:text-[#c0caf5] transition-colors bg-[#24283b] px-3 py-1.5 rounded-lg border border-[#3b4261] active:scale-95"
            >
              <span>💾</span>
              <span>バックアップ</span>
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#787c99] text-sm">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="タイトルを検索..."
              className="w-full bg-[#24283b] text-[#c0caf5] border border-[#3b4261] rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7aa2f7] transition-colors placeholder-[#4a5177]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787c99] hover:text-[#c0caf5] text-lg leading-none"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* List */}
      <main className="flex-1 px-4 py-3 max-w-lg mx-auto w-full pb-32">
        {filtered.length === 0 ? (
          <div className="mt-20 text-center">
            {search ? (
              <p className="text-[#787c99] text-sm">「{search}」は見つかりませんでした</p>
            ) : (
              <div className="space-y-2">
                <p className="text-4xl">📖</p>
                <p className="text-[#787c99] text-sm">まだ漫画が登録されていません</p>
                <p className="text-[#4a5177] text-xs">下の「＋」ボタンから追加しましょう</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry) => {
              const { owned, read, total, percent } = calcProgress(entry);
              return (
                <button
                  key={entry.id}
                  onClick={() => onSelect(entry)}
                  className="w-full bg-[#24283b] border border-[#3b4261] rounded-2xl px-4 py-4 text-left active:scale-[0.98] transition-transform hover:border-[#545c7e]"
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className="font-bold text-[#c0caf5] text-base leading-tight line-clamp-2">{entry.title}</span>
                    <span className="shrink-0 text-xs text-[#7aa2f7] font-bold mt-0.5">{percent}%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-[#1a1b26] rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-[#7aa2f7] to-[#bb9af7] rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#787c99]">
                    <span>
                      <span className="inline-block w-2 h-2 rounded-sm bg-[#e0af68] mr-1"></span>
                      所持 {owned}
                    </span>
                    <span>
                      <span className="inline-block w-2 h-2 rounded-sm bg-[#7aa2f7] mr-1"></span>
                      読了 {read}
                    </span>
                    <span className="text-[#4a5177]">/ {entry.totalVolumes}巻</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Button */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-gradient-to-t from-[#1a1b26] via-[#1a1b26]/90 to-transparent">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full bg-[#7aa2f7] text-[#1a1b26] font-bold py-4 rounded-2xl text-base shadow-lg shadow-[#7aa2f7]/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <span className="text-xl leading-none">＋</span>
            <span>新しく漫画を追加</span>
          </button>
        </div>
      </div>

      {showAdd && (
        <AddMangaModal
          mode="add"
          onClose={() => setShowAdd(false)}
          onSave={(title, totalVolumes) => {
            onAdd(title, totalVolumes);
            setShowAdd(false);
          }}
        />
      )}

      {showBackup && (
        <BackupModal
          entries={entries}
          onClose={() => setShowBackup(false)}
          onImport={onImport}
        />
      )}
    </div>
  );
}
