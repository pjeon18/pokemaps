import { useState } from "react";
import { byId } from "../lib/content";
import { useGameStore } from "../store/useGameStore";

/** Dev/demo controls, only rendered when ?debug (persists via sessionStorage). */
export default function DebugPanel() {
  const s = useGameStore();
  const [open, setOpen] = useState(false);
  const [reveal, setReveal] = useState(false);
  if (!s.debug) return null;
  return (
    <div className="fixed bottom-3 right-3 z-50">
      {open && (
        <div className="mb-2 w-60 rounded-[var(--wm-radius)] border border-[var(--wm-line-strong)] bg-[var(--wm-panel)] p-3 space-y-2 font-mono text-[12px]">
          <div className="survey-label">Debug</div>
          <div className="flex items-center justify-between">
            <span>day offset: {s.dayOffset}</span>
            <span className="flex gap-1">
              <button className="px-2 py-1 border border-[var(--wm-line-strong)] rounded" onClick={() => s.setDayOffset(s.dayOffset - 1)}>−</button>
              <button className="px-2 py-1 border border-[var(--wm-line-strong)] rounded" onClick={() => s.setDayOffset(s.dayOffset + 1)}>+</button>
              <button className="px-2 py-1 border border-[var(--wm-line-strong)] rounded" onClick={() => s.setDayOffset(0)}>0</button>
            </span>
          </div>
          <button className="block w-full text-left px-2 py-1 border border-[var(--wm-line-strong)] rounded" onClick={() => setReveal(!reveal)}>
            {reveal ? `answer: ${byId.get(s.mode === "daily" ? s.daily?.answerId ?? "" : s.practice?.answerId ?? "")?.name ?? "?"}` : "reveal answer"}
          </button>
          <button className="block w-full text-left px-2 py-1 border border-[var(--wm-line-strong)] rounded" onClick={s.toggleAudit}>
            region audit: {s.audit ? "on" : "off"}
          </button>
          <button className="block w-full text-left px-2 py-1 border border-[var(--wm-line-strong)] rounded" onClick={() => s.startPractice()}>
            practice puzzle
          </button>
          <button className="block w-full text-left px-2 py-1 border border-[var(--wm-cold)] text-[var(--wm-cold)] rounded" onClick={s.resetAll}>
            reset all state
          </button>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="h-10 w-10 rounded-full border border-[var(--wm-line-strong)] bg-[var(--wm-panel)] font-mono text-[14px]"
        aria-label="Debug panel"
      >
        ⚙
      </button>
    </div>
  );
}
