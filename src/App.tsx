import { useEffect, useState } from "react";
import MapPicker from "./components/MapPicker";
import HintPanel from "./components/HintPanel";
import GuessLog from "./components/GuessLog";
import AssistBar from "./components/AssistBar";
import RevealPanel from "./components/RevealPanel";
import DebugPanel from "./components/DebugPanel";
import { FooterMon, ForestBackdrop } from "./components/Scene";
import { HowTo, StatsModal, PracticePicker, StreakEndModal } from "./components/Modals";
import { byId } from "./lib/content";
import { asset } from "./lib/assets";
import { leaderForStreak } from "./lib/leaders";
import { useGameStore, currentGame, hintsUnlocked } from "./store/useGameStore";


/** Click-to-load Spotify player (Paul, 2026-07-21): zero third-party requests
 * until the player opts in; compact 152px; quiet footer placement. Full tracks
 * require the visitor to be logged into Spotify — otherwise 30s previews. */
function MusicCorner() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn btn-sm"
      >
        ♪ Play Pokémon music
      </button>
    );
  }
  return (
    <iframe
      title="Pokémon music playlist on Spotify"
      style={{ borderRadius: 12 }}
      src="https://open.spotify.com/embed/playlist/5zzAS3TA6c3w3smlHSz7Hb?utm_source=generator&theme=0"
      width="100%"
      height="152"
      frameBorder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );
}

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

  const navBtn = "btn btn-sm max-sm:h-[38px] max-sm:px-3 max-sm:text-[14px]";

  return (
    <div className="relative min-h-dvh">
      <ForestBackdrop seed={seed} />
      <div className="relative z-10 bg-[var(--wm-panel)] border-b-[2.5px] border-[var(--wm-line-strong)]">
      <header className="max-w-md lg:max-w-6xl xl:max-w-[1360px] mx-auto px-4 pt-4 pb-4">
        <div className="flex items-center justify-between gap-x-2 gap-y-3 flex-wrap">
          <h1 className="display text-[30px] sm:text-[40px] leading-none flex items-center gap-2">
            <img
              src={asset("logo/town-map.png")}
              alt=""
              className="h-[1.1em] w-[1.1em] shrink-0"
              style={{ imageRendering: "pixelated" }}
            />
            <span>
              Poké<span className="text-[var(--wm-accent)]">MAPs</span>
            </span>
          </h1>
          <div className="order-last w-full lg:order-none lg:w-auto lg:flex-1 lg:flex lg:justify-center">
            <AssistBar />
          </div>
          <nav className="flex items-center gap-1.5 sm:gap-2">
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
                    className="h-10 w-10 sm:h-14 sm:w-14 object-contain"
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
      </header>
      </div>

      {/* the map is the game — it takes ~62% of the desktop width (Paul, 2026-09-10) */}
      <main className="relative z-10 pt-6 max-w-md lg:max-w-6xl xl:max-w-[1360px] mx-auto px-4 pb-24 lg:grid lg:grid-cols-[1.65fr_1fr] lg:gap-6 lg:items-start">
        <div className="space-y-4">
          <MapPicker />
          <GuessLog guesses={game.guesses} />
        </div>
        <div className="space-y-4 mt-4 lg:mt-0">
          {ended && <RevealPanel />}
          <HintPanel loc={loc} seed={seed} unlocked={hintsUnlocked(game)} ended={ended} />
          {/* The sister game. Under the hints on desktop, at the bottom on a phone. */}
          <a href="/pokefinder/" className="btn w-full">
            <img
              src={asset("logo/poke-radar.png")}
              alt=""
              className="h-8 w-8 -my-1"
              style={{ imageRendering: "pixelated" }}
            />
            Try the PokéFinder game
          </a>
        </div>
      </main>

      <footer className="relative z-10 max-w-md lg:max-w-6xl xl:max-w-[1360px] mx-auto px-4 lg:pb-[210px]">
        <div className="card p-4 sm:p-5 space-y-4">
        <MusicCorner />
        <p className="survey-label leading-relaxed normal-case tracking-normal">
          A free fan-made puzzle. Not affiliated with Nintendo, Game Freak, or The
          Pokémon Company; Pokémon content © its owners. Data: PokéAPI · images &
          trainer data: Bulbapedia (CC BY-NC-SA) · cries: Pokémon Showdown ·
          anonymous visit counts: GoatCounter (no cookies).
        </p>
        </div>
        <FooterMon seed={seed} />
      </footer>

      <HowTo open={showHowTo} onClose={() => setShowHowTo(false)} />
      <StatsModal open={showStats} onClose={() => setShowStats(false)} />
      <PracticePicker open={showPicker} onClose={() => setShowPicker(false)} />
      <StreakEndModal />
      <DebugPanel />
    </div>
  );
}
