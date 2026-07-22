import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MAX_GUESSES, useGameStore } from "../store/useGameStore";
import { LEADERS, leaderForStreak } from "../lib/leaders";
import { META } from "../lib/content";
import { streakShareString } from "../lib/share";
import { asset } from "../lib/assets";

export function Overlay({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/60 grid place-items-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm card max-h-[85dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b-[2.5px] border-[var(--wm-line-strong)]">
              <span className="display text-[19px]">{title}</span>
              <button onClick={onClose} className="text-[15px] font-bold px-2">
                Close
              </button>
            </div>
            <div className="p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function HowTo({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Overlay open={open} onClose={onClose} title="How to play">
      <ol className="text-[16px] leading-relaxed space-y-3.5 list-decimal ml-5 font-medium">
        <li>
          One Sinnoh location per day. <b>Tap the town map</b> to guess — or
          search it by name if you already know it.
        </li>
        <li>
          You have <b>{MAX_GUESSES} guesses</b>. Each wrong guess shows an{" "}
          <b>arrow pointing toward the answer</b>, its color says how close you
          are — and the next hint unlocks.
        </li>
        <li>
          Hints get progressively more obvious — from Poké Ball to Master Ball:
          classification, the wild cries, something overheard, wild sprites,
          the town-map note, and finally a blurred photograph.
        </li>
        <li>
          Keep a daily streak and climb the Sinnoh gauntlet — a new Gym Leader
          travels with you at every streak level, all the way to the Champion.
        </li>
      </ol>
      <p className="text-[14px] font-bold mt-5 flex items-center gap-2 flex-wrap">
        <span className="h-4 w-4 rounded inline-block" style={{ background: "var(--wm-hit)" }} /> found
        <span className="h-4 w-4 rounded inline-block ml-2" style={{ background: "var(--wm-warm)" }} /> hot
        <span className="h-4 w-4 rounded inline-block ml-2" style={{ background: "var(--wm-mid)" }} /> warm
        <span className="h-4 w-4 rounded inline-block ml-2" style={{ background: "var(--wm-cold)" }} /> cold
      </p>
    </Overlay>
  );
}

/** Pick a region before a practice run. */
export function PracticePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useGameStore();
  const start = (pack: string) => {
    s.startPractice(pack);
    onClose();
  };
  const opt =
    "w-full text-left text-[19px] font-black px-5 py-4 rounded-[var(--wm-radius-sm)] border-[2.5px] border-[var(--wm-line-strong)] hover:bg-[var(--wm-panel-2)] flex items-center justify-between";
  return (
    <Overlay open={open} onClose={onClose} title="Practice — pick a region">
      <div className="space-y-3">
        {META.packs.map((p) => (
          <button key={p.id} onClick={() => start(p.id)} className={opt}>
            {p.name}
            <span className="survey-label">{p.id === s.practicePack ? "last played" : ""}</span>
          </button>
        ))}
        <button onClick={() => start("all")} className={opt} style={{ background: "var(--wm-panel-2)" }}>
          Every Region
          <span className="survey-label">all five packs</span>
        </button>
        <p className="survey-label normal-case tracking-normal leading-relaxed">
          Practice keeps its own streak — every win extends your run, one miss ends it.
        </p>
      </div>
    </Overlay>
  );
}

/** A run just ended — celebrate how far it went, with the leader you reached. */
export function StreakEndModal() {
  const s = useGameStore();
  const [copied, setCopied] = useState(false);
  const end = s.streakEnd;
  if (!end) return null;
  const leader = leaderForStreak(end.streak);
  const label = end.mode === "practice" ? "practice run" : "daily streak";
  const share = async () => {
    try {
      await navigator.clipboard.writeText(streakShareString(end.streak, leader?.name ?? null, label));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <Overlay open onClose={s.clearStreakEnd} title="Run over!">
      <div className="text-center">
        {leader && (
          <img
            src={asset(`content/leaders/${leader.key}.png`)}
            alt={leader.name}
            className="h-24 w-24 object-contain mx-auto"
            style={{ imageRendering: "pixelated" }}
          />
        )}
        <div className="display text-[44px] leading-none mt-2">{end.streak}</div>
        <div className="text-[16px] font-bold mt-1">
          in a row — {end.mode === "practice" ? "your practice run" : "your daily streak"} ends
        </div>
        {leader && (
          <p className="text-[15px] font-medium text-[var(--wm-text-2)] mt-2">
            You made it to <b>{leader.name}</b>
            {end.streak >= 13 ? " — the Champion herself." : "."}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            onClick={share}
            className="text-[16px] font-black px-6 py-3 rounded-full bg-[var(--wm-line-strong)] text-white"
          >
            {copied ? "Copied!" : "Share your run"}
          </button>
          {end.mode === "practice" && (
            <button
              onClick={() => {
                s.clearStreakEnd();
                s.startPractice();
              }}
              className="text-[16px] font-black px-5 py-3 rounded-full border-[2.5px] border-[var(--wm-line-strong)]"
            >
              Run it back
            </button>
          )}
        </div>
      </div>
    </Overlay>
  );
}

export function StatsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const stats = useGameStore((s) => s.stats);
  const maxDist = Math.max(1, ...stats.dist);
  return (
    <Overlay open={open} onClose={onClose} title="Your record">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          [stats.played, "played"],
          [stats.played ? Math.round((stats.won / stats.played) * 100) + "%" : "—", "located"],
          [stats.streak, "streak"],
          [stats.maxStreak, "best"],
        ].map(([v, l]) => (
          <div key={l as string}>
            <div className="display text-[30px]">{v}</div>
            <div className="survey-label">{l}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-1.5">
        {stats.dist.map((n, i) => (
          <div key={i} className="flex items-center gap-2 font-mono text-[12px]">
            <span className="text-[var(--wm-text-3)] w-3">{i + 1}</span>
            <div className="flex-1 h-4 bg-[var(--wm-panel-2)] rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${(n / maxDist) * 100}%`,
                  minWidth: n > 0 ? 18 : 0,
                  background: "var(--wm-accent)",
                }}
              />
            </div>
            <span className="w-6 text-right text-[var(--wm-text-2)]">{n}</span>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className="survey-label mb-2">The gauntlet — one leader per streak day</div>
        <div className="grid grid-cols-7 gap-1.5">
          {LEADERS.map((l, i) => {
            const unlocked = stats.streak >= i + 1;
            const current = Math.min(stats.streak, LEADERS.length) === i + 1 && stats.streak > 0;
            return (
              <div
                key={l.key}
                title={`${l.name} — streak ${i + 1}`}
                className="aspect-square grid place-items-center rounded-[10px] border-2"
                style={{
                  borderColor: current ? "var(--wm-accent)" : "var(--wm-line)",
                  background: "var(--wm-panel-2)",
                }}
              >
                <img
                  src={asset(`content/leaders/${l.key}.png`)}
                  alt={l.name}
                  className="h-10 w-10 object-contain"
                  style={{
                    imageRendering: "pixelated",
                    filter: unlocked ? undefined : "grayscale(1) opacity(0.35)",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Overlay>
  );
}
