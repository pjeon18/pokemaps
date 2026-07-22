import { useEffect, useState } from "react";
import MapPicker from "./components/MapPicker";
import HintPanel from "./components/HintPanel";
import GuessLog from "./components/GuessLog";
import SearchBar from "./components/SearchBar";
import RevealPanel from "./components/RevealPanel";
import DebugPanel from "./components/DebugPanel";
import { HowTo, StatsModal, PracticePicker, StreakEndModal } from "./components/Modals";
import { byId, packById } from "./lib/content";
import { asset } from "./lib/assets";
import { leaderForStreak } from "./lib/leaders";
import { useGameStore, currentGame, hintsUnlocked } from "./store/useGameStore";


export default function App() {
  const s = useGameStore();
  const [showHowTo, setShowHowTo] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // today's puzzle + local-midnight rollover while the tab stays open
  useEffect(() => {
    s.ensureToday();
    if (!s.seenHowTo) {
      setShowHowTo(true);
      s.markHowToSeen();
    }
    const t = setInterval(() => useGameStore.getState().ensureToday(), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const game = currentGame(s);
  if (!game) return null;
  const loc = byId.get(game.answerId)!;
  const ended = game.status !== "playing";
  const seed = s.mode === "daily" ? game.puzzle : s.practiceSeed;

  const navBtn =
    "text-[14px] font-black uppercase tracking-wide px-4 py-2.5 rounded-full border-[2.5px] border-[var(--wm-line-strong)] bg-[var(--wm-panel)] shadow-[0_3px_0_rgba(23,19,12,0.9)]";

  return (
    <div className="min-h-dvh">
      <header className="max-w-md lg:max-w-5xl mx-auto px-4 pt-6 pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="display text-[40px] leading-none">
            Poké<span className="text-[var(--wm-accent)]">MAPs</span>
          </h1>
          <nav className="flex items-center gap-2">
            {(() => {
              const streak = s.mode === "practice" ? s.practiceStreak : s.stats.streak;
              const leader = leaderForStreak(streak);
              return leader ? (
                <span
                  className="flex flex-col items-center mr-1"
                  title={`${s.mode === "practice" ? "Practice run" : "Streak"} ${streak} — traveling with ${leader.name}`}
                >
                  <img
                    src={asset(`content/leaders/${leader.key}.png`)}
                    alt={leader.name}
                    className="h-14 w-14 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <span className="survey-label leading-none">
                    {s.mode === "practice" ? "run" : "streak"} {streak}
                  </span>
                </span>
              ) : null;
            })()}
            {s.mode === "practice" ? (
              <button onClick={s.exitPractice} className={navBtn} style={{ borderColor: "var(--wm-accent)", color: "var(--wm-accent)" }}>
                Daily
              </button>
            ) : (
              <button onClick={() => setShowPicker(true)} className={navBtn}>
                Practice
              </button>
            )}
            <button onClick={() => setShowStats(true)} className={navBtn}>
              Stats
            </button>
            <button onClick={() => setShowHowTo(true)} aria-label="How to play" className={navBtn}>
              ?
            </button>
          </nav>
        </div>
        <div className="survey-label mt-2">
          {s.mode === "daily" ? (
            <>Daily location puzzle · {packById.get(loc.pack)?.name} · Nº {game.puzzle}</>
          ) : (
            <>Practice · {packById.get(loc.pack)?.name}</>
          )}
        </div>
      </header>

      <main className="max-w-md lg:max-w-5xl mx-auto px-4 pb-24 lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-5 lg:items-start">
        <div className="space-y-4">
          <MapPicker />
          <SearchBar />
          <GuessLog guesses={game.guesses} />
        </div>
        <div className="space-y-4 mt-4 lg:mt-0">
          {ended && <RevealPanel />}
          <HintPanel loc={loc} seed={seed} unlocked={hintsUnlocked(game)} ended={ended} />
        </div>
      </main>

      <footer className="max-w-md lg:max-w-5xl mx-auto px-4 pb-10">
        <p className="survey-label leading-relaxed normal-case tracking-normal">
          A free fan-made puzzle. Not affiliated with Nintendo, Game Freak, or The
          Pokémon Company; Pokémon content © its owners. Data: PokéAPI · images &
          trainer data: Bulbapedia (CC BY-NC-SA) · cries: Pokémon Showdown.
        </p>
      </footer>

      <HowTo open={showHowTo} onClose={() => setShowHowTo(false)} />
      <StatsModal open={showStats} onClose={() => setShowStats(false)} />
      <PracticePicker open={showPicker} onClose={() => setShowPicker(false)} />
      <StreakEndModal />
      <DebugPanel />
    </div>
  );
}
