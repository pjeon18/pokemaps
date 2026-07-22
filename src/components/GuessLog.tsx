import { motion } from "framer-motion";
import { byId } from "../lib/content";
import { DIR_ARROWS } from "../lib/distance";
import { MAX_GUESSES, type Guess } from "../store/useGameStore";

const BAND_COLOR: Record<string, string> = {
  hit: "var(--wm-hit)",
  warm: "var(--wm-warm)",
  mid: "var(--wm-mid)",
  cold: "var(--wm-cold)",
};

/** Direction-only feedback (2026-07-20, Paul): the arrow points toward the
 * answer; the band color says how close. Never a number. */
export default function GuessLog({ guesses }: { guesses: Guess[] }) {
  return (
    <section className="card overflow-hidden">
      <div className="px-4 py-3 border-b-[2.5px] border-[var(--wm-line-strong)]">
        <span className="display text-[19px]">Guesses</span>
      </div>
      <ol>
        {Array.from({ length: MAX_GUESSES }).map((_, i) => {
          const g = guesses[i];
          return (
            <li
              key={i}
              className="flex items-center gap-3 px-4 h-[52px] border-b border-[var(--wm-line)] last:border-b-0"
            >
              <span className="font-mono text-[13px] text-[var(--wm-text-3)] w-6">
                {String(i + 1).padStart(2, "0")}
              </span>
              {g ? (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between flex-1 min-w-0"
                >
                  <span className="truncate text-[17px] font-bold">{byId.get(g.id)?.name}</span>
                  <span
                    className="shrink-0 flex items-center justify-center gap-1.5 pl-2 h-9 min-w-[52px] rounded-full px-3 text-white font-black text-[18px]"
                    style={{ background: BAND_COLOR[g.band] }}
                  >
                    {g.band === "hit" ? "★" : DIR_ARROWS[g.dir]}
                  </span>
                </motion.div>
              ) : (
                <span className="text-[var(--wm-text-3)] text-[17px]">·····</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
