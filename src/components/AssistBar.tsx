import { useGameStore } from "../store/useGameStore";

/** Two player-chosen assists, always visible under the map so they're easy to
 * flip mid-run (Paul, 2026-09-10). On-state uses the one interactive blue. */
export default function AssistBar() {
  const assist = useGameStore((s) => s.assist);
  const toggle = useGameStore((s) => s.toggleAssist);
  const pill = (on: boolean) =>
    `flex items-center gap-2 text-[14px] font-extrabold h-[42px] px-4 rounded-full border-[2.5px] shadow-[0_3px_0_rgba(23,19,12,0.92)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(23,19,12,0.92)] transition ${
      on
        ? "border-[var(--wm-line-strong)] bg-[var(--wm-accent)] text-[var(--wm-accent-ink)]"
        : "border-[var(--wm-line-strong)] bg-[var(--wm-panel)] text-[var(--wm-text-2)]"
    }`;
  const state = (on: boolean) => (
    <span className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-80">{on ? "on" : "off"}</span>
  );
  return (
    <div className="card flex items-center gap-2 flex-wrap px-3 py-2.5">
      <span className="survey-label mr-1">Assists</span>
      <button
        onClick={() => toggle("preview")}
        aria-pressed={assist.preview}
        className={pill(assist.preview)}
        title="Show the photo of whatever you tap on the map"
      >
        Location preview {state(assist.preview)}
      </button>
      <button
        onClick={() => toggle("arrows")}
        aria-pressed={assist.arrows}
        className={pill(assist.arrows)}
        title="Direction arrows in the guess log (off = color only)"
      >
        Direction arrows {state(assist.arrows)}
      </button>
    </div>
  );
}
