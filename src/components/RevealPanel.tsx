import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { byId, titleCase, spritePath } from "../lib/content";
import { asset } from "../lib/assets";
import { msToNextPuzzle } from "../lib/seed";
import { shareString } from "../lib/share";
import { useGameStore, currentGame } from "../store/useGameStore";

function Countdown() {
  const [ms, setMs] = useState(msToNextPuzzle(new Date()));
  useEffect(() => {
    const t = setInterval(() => setMs(msToNextPuzzle(new Date())), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="font-mono text-[13px] text-[var(--wm-text-2)]">
      next survey in {pad(h)}:{pad(m)}:{pad(sec)}
    </span>
  );
}

function ThemeModule({ videoId, name }: { videoId: string; name: string }) {
  const [state, setState] = useState<"idle" | "playing" | "dead">("idle");
  if (state === "dead") return null;
  return (
    <div className="mt-3">
      {state === "idle" ? (
        <button
          onClick={() => setState("playing")}
          className="w-full text-[16px] font-black px-4 py-3.5 rounded-full border-[2.5px] border-[var(--wm-line-strong)] hover:bg-[var(--wm-panel-2)]"
        >
          ▶ Play the {name} theme
        </button>
      ) : (
        <div className="aspect-video rounded-[var(--wm-radius-sm)] overflow-hidden border border-[var(--wm-line)]">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
            title={`${name} theme`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            onError={() => setState("dead")}
          />
        </div>
      )}
    </div>
  );
}

export default function RevealPanel() {
  const s = useGameStore();
  const game = currentGame(s)!;
  const loc = byId.get(game.answerId)!;
  const won = game.status === "won";
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = shareString(game.puzzle, game.guesses, won);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="card overflow-hidden"
      style={{ borderColor: won ? "var(--wm-hit)" : "var(--wm-line-strong)" }}
    >
      <div className="px-5 pt-5">
        <div
          className="text-[15px] font-black uppercase tracking-wider"
          style={{ color: won ? "var(--wm-hit)" : "var(--wm-cold)" }}
        >
          {won ? `★ Found in ${game.guesses.length}` : "Not found"}
        </div>
        <h2 className="display text-[34px] leading-tight mt-1">{loc.name}</h2>
        {(loc.slogan || loc.mapdesc) && (
          <p className="text-[16px] leading-relaxed text-[var(--wm-text-2)] font-medium mt-2">
            {loc.slogan ? `“${loc.slogan}” — ` : ""}
            {loc.mapdesc}
          </p>
        )}
      </div>

      <div className="px-5 py-4">
        {loc.screenshot && (
          <figure className="overflow-hidden rounded-[var(--wm-radius-sm)] border-[2.5px] border-[var(--wm-line-strong)]">
            <img src={asset(`content/images/${loc.screenshot}`)} alt={loc.name} className="w-full" />
            {loc.imageCredit && (
              <figcaption className="survey-label px-2.5 py-1.5">{loc.imageCredit}</figcaption>
            )}
          </figure>
        )}
        {loc.encounters.length > 0 && (
          <div className="mt-4">
            <div className="survey-label mb-2">Wild presence</div>
            <div className="flex flex-wrap gap-1">
              {loc.encounters.slice(0, 12).map((e) => (
                <img
                  key={e.id}
                  src={asset(spritePath(loc, e.id))}
                  alt={titleCase(e.name)}
                  title={titleCase(e.name)}
                  className="h-10 w-10"
                  style={{ imageRendering: "pixelated" }}
                />
              ))}
              {loc.encounters.length > 12 && (
                <span className="survey-label self-center">+{loc.encounters.length - 12}</span>
              )}
            </div>
          </div>
        )}
        {loc.themeYoutubeId && <ThemeModule videoId={loc.themeYoutubeId} name={loc.name} />}

        <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
          {s.mode === "daily" ? (
            <>
              <button
                onClick={share}
                className="text-[16px] font-black px-6 py-3 rounded-full bg-[var(--wm-line-strong)] text-white shadow-[0_4px_0_rgba(23,19,12,0.35)]"
              >
                {copied ? "Copied!" : "Share result"}
              </button>
              <Countdown />
            </>
          ) : (
            <button
              onClick={() => s.startPractice()}
              className="text-[16px] font-black px-6 py-3 rounded-full bg-[var(--wm-line-strong)] text-white"
            >
              Play another
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}
