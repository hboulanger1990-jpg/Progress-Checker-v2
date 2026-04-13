import { useState, useEffect, useRef } from "react";

type VolumeStatus = "unowned" | "owned" | "read";

const STATUS_CYCLE: Record<VolumeStatus, VolumeStatus> = {
  unowned: "owned",
  owned: "read",
  read: "unowned",
};

const STATUS_STYLE: Record<VolumeStatus, { bg: string; text: string; border: string; label: string }> = {
  unowned: {
    bg: "bg-[hsl(222,47%,18%)]",
    text: "text-[hsl(215,20%,45%)]",
    border: "border-[hsl(217,33%,24%)]",
    label: "未購入",
  },
  owned: {
    bg: "bg-[hsl(48,96%,53%)]",
    text: "text-[hsl(222,47%,11%)]",
    border: "border-[hsl(48,90%,42%)]",
    label: "所持",
  },
  read: {
    bg: "bg-[hsl(213,80%,52%)]",
    text: "text-white",
    border: "border-[hsl(213,80%,40%)]",
    label: "読了",
  },
};

const TOTAL_VOLUMES = 180;
const STORAGE_KEY_PREFIX = "manga-tracker-";

function getStorageKey(title: string) {
  return `${STORAGE_KEY_PREFIX}${encodeURIComponent(title)}`;
}

function loadStatuses(title: string): Record<number, VolumeStatus> {
  try {
    const raw = localStorage.getItem(getStorageKey(title));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveStatuses(title: string, statuses: Record<number, VolumeStatus>) {
  try {
    localStorage.setItem(getStorageKey(title), JSON.stringify(statuses));
  } catch {}
}

function loadTitle(): string {
  return localStorage.getItem("manga-tracker-title") || "税金で買った本";
}

function saveTitle(title: string) {
  localStorage.setItem("manga-tracker-title", title);
}

export default function App() {
  const [title, setTitle] = useState<string>(loadTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [statuses, setStatuses] = useState<Record<number, VolumeStatus>>({});
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStatuses(loadStatuses(title));
  }, [title]);

  function handleVolumeClick(vol: number) {
    const current: VolumeStatus = statuses[vol] ?? "unowned";
    const next = STATUS_CYCLE[current];
    const updated = { ...statuses, [vol]: next };
    if (next === "unowned") {
      delete updated[vol];
    }
    setStatuses(updated);
    saveStatuses(title, updated);
  }

  function startEditTitle() {
    setDraftTitle(title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 50);
  }

  function commitTitle() {
    const trimmed = draftTitle.trim();
    if (trimmed) {
      saveTitle(trimmed);
      setTitle(trimmed);
    }
    setEditingTitle(false);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitTitle();
    if (e.key === "Escape") setEditingTitle(false);
  }

  const owned = Object.values(statuses).filter((s) => s === "owned").length;
  const read = Object.values(statuses).filter((s) => s === "read").length;
  const total = owned + read;

  return (
    <div className="min-h-screen bg-[hsl(222,47%,11%)] flex flex-col">
      <header className="sticky top-0 z-10 bg-[hsl(222,47%,11%)] border-b border-[hsl(217,33%,18%)] px-4 pt-safe">
        <div className="max-w-lg mx-auto py-4">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={handleTitleKeyDown}
              className="w-full text-xl font-bold bg-[hsl(222,47%,16%)] text-[hsl(210,40%,92%)] border border-[hsl(213,80%,52%)] rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-[hsl(213,80%,52%)]"
            />
          ) : (
            <button
              onClick={startEditTitle}
              className="text-left text-xl font-bold text-[hsl(210,40%,92%)] hover:text-white transition-colors group flex items-center gap-2"
            >
              <span>{title}</span>
              <span className="text-xs text-[hsl(215,20%,45%)] group-hover:text-[hsl(215,20%,65%)] transition-colors font-normal">
                ✏️
              </span>
            </button>
          )}
          <div className="mt-2 flex gap-4 text-sm text-[hsl(215,20%,55%)]">
            <span>
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[hsl(48,96%,53%)] mr-1"></span>
              所持 {owned}巻
            </span>
            <span>
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[hsl(213,80%,52%)] mr-1"></span>
              読了 {read}巻
            </span>
            <span className="text-[hsl(215,20%,40%)]">計 {total}/{TOTAL_VOLUMES}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 py-4 max-w-lg mx-auto w-full">
        <div className="mb-3 flex gap-3 flex-wrap text-xs text-[hsl(215,20%,50%)]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-5 h-5 rounded border border-[hsl(217,33%,24%)] bg-[hsl(222,47%,18%)]"></span>
            未購入
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-5 h-5 rounded border border-[hsl(48,90%,42%)] bg-[hsl(48,96%,53%)]"></span>
            所持（黄）
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-5 h-5 rounded border border-[hsl(213,80%,40%)] bg-[hsl(213,80%,52%)]"></span>
            読了（青）
          </span>
        </div>

        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
        >
          {Array.from({ length: TOTAL_VOLUMES }, (_, i) => i + 1).map((vol) => {
            const status: VolumeStatus = statuses[vol] ?? "unowned";
            const style = STATUS_STYLE[status];
            return (
              <button
                key={vol}
                onClick={() => handleVolumeClick(vol)}
                className={`
                  ${style.bg} ${style.text} border ${style.border}
                  rounded-lg aspect-square flex items-center justify-center
                  font-bold text-sm select-none
                  active:scale-95 transition-all duration-100
                  touch-manipulation
                `}
                aria-label={`${vol}巻 ${style.label}`}
              >
                {vol}
              </button>
            );
          })}
        </div>
      </main>

      <footer className="text-center py-3 text-xs text-[hsl(215,20%,35%)] pb-safe">
        タップで未購入→所持→読了→未購入と切り替わります
      </footer>
    </div>
  );
}
