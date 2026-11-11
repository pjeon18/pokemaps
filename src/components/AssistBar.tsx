import { useGameStore } from "../store/useGameStore";

/** Two player-chosen assists, in the header so they're easy to flip mid-run
 * (Paul, 2026-09-10; moved to the header 2026-11-11). On-state uses the one interactive blue. */
export default function AssistBar() {
  const assist = useGameStore((s) => s.assist);
  const toggle = useGameStore((s) => s.toggleAssist);
  const pill = (on: boolean) =>
    `flex items-center gap-2 text-[13px] sm:text-[14px] font-extrabold h-[38px] sm:h-[42px] px-3 sm:px-4 rounded-full whitespace-nowrap border-[2.5px] shadow-[0_3px_0_rgba(23,19,12,0.92)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(23,19,12,0.92)] transition ${
      on
        ? "border-[var(--wm-line-strong)] bg-[var(--wm-accent)] text-[var(--wm-accent-ink)]"
        : "border-[var(--wm-line-strong)] bg-[var(--wm-panel)] text-[var(--wm-text-2)]"
    }`;
  const state = (on: boolean) => (
    <span className="font-mono text-[11px] tracking-[0.14em] uppercase opacity-80">{on ? "on" : "off"}</span>
  );
  return (
    <div className="flex items-center gap-2">
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
