import { create } from "zustand";
import { persist } from "zustand/middleware";
import { byId, LOCATIONS } from "../lib/content";
import { answerFor, puzzleNumberFor } from "../lib/seed";
import { bandFor, feedback, type Band } from "../lib/distance";

export const MAX_GUESSES = 6;

export interface Guess {
  id: string;
  distance: number;
  dir: string;
  band: Band;
}

export type Status = "playing" | "won" | "lost";
export type Mode = "daily" | "practice";

interface DayState {
  puzzle: number;
  answerId: string;
  guesses: Guess[];
  status: Status;
}

interface Stats {
  played: number;
  won: number;
  streak: number;
  maxStreak: number;
  dist: number[]; // wins by guess count, index 0 = won in 1
  lastWonPuzzle: number | null;
  lastPlayedPuzzle: number | null;
}

const emptyStats: Stats = {
  played: 0,
  won: 0,
  streak: 0,
  maxStreak: 0,
  dist: [0, 0, 0, 0, 0, 0],
  lastWonPuzzle: null,
  lastPlayedPuzzle: null,
};

interface GameState {
  mode: Mode;
  daily: DayState | null;
  practice: DayState | null;
  practiceSeed: number;
  practiceStreak: number;
  practicePack: string; // pack id or "all"
  streakEnd: { mode: Mode; streak: number } | null; // a run just ended → popup
  stats: Stats;
  seenHowTo: boolean;
  selectedId: string | null;
  // debug (never persisted meaningfully; offset lives in sessionStorage)
  debug: boolean;
  dayOffset: number;
  audit: boolean;

  ensureToday: () => void;
  select: (id: string | null) => void;
  confirmGuess: () => void;
  startPractice: (pack?: string) => void;
  clearStreakEnd: () => void;
  exitPractice: () => void;
  markHowToSeen: () => void;
  setDayOffset: (n: number) => void;
  toggleAudit: () => void;
  resetAll: () => void;
}

function currentGame(s: GameState): DayState | null {
  return s.mode === "daily" ? s.daily : s.practice;
}

export function hintsUnlocked(game: DayState | null): number {
  if (!game) return 1;
  if (game.status !== "playing") return 6;
  return Math.min(6, game.guesses.length + 1);
}

const isDebug = () => {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).has("debug")) {
    sessionStorage.setItem("pokemaps-debug", "1");
  }
  return sessionStorage.getItem("pokemaps-debug") === "1";
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      mode: "daily",
      daily: null,
      practice: null,
      practiceSeed: 1,
      practiceStreak: 0,
      practicePack: "all",
      streakEnd: null,
      stats: emptyStats,
      seenHowTo: false,
      selectedId: null,
      debug: isDebug(),
      dayOffset: Number(sessionStorage.getItem("pokemaps-dayoffset") ?? 0),
      audit: false,

      ensureToday: () => {
        const { daily, dayOffset } = get();
        const puzzle = puzzleNumberFor(new Date(), dayOffset);
        if (daily?.puzzle === puzzle) return;
        set({
          daily: { puzzle, answerId: answerFor(puzzle), guesses: [], status: "playing" },
          mode: "daily",
          selectedId: null,
        });
      },

      select: (id) => set({ selectedId: id }),

      confirmGuess: () => {
        const s = get();
        const game = currentGame(s);
        const id = s.selectedId;
        if (!game || game.status !== "playing" || !id) return;
        if (game.guesses.some((g) => g.id === id)) return;
        const guessLoc = byId.get(id);
        const answerLoc = byId.get(game.answerId);
        if (!guessLoc || !answerLoc) return;

        const hit = id === game.answerId;
        const { distance, dir } = feedback(guessLoc.center, answerLoc.center);
        const guesses = [...game.guesses, { id, distance, dir, band: bandFor(distance, hit) }];
        const status: Status = hit ? "won" : guesses.length >= MAX_GUESSES ? "lost" : "playing";
        const next: DayState = { ...game, guesses, status };

        let stats = s.stats;
        let practiceStreak = s.practiceStreak;
        let streakEnd = s.streakEnd;
        if (s.mode === "daily" && status !== "playing") {
          const won = status === "won";
          const contiguous = s.stats.lastWonPuzzle === next.puzzle - 1;
          const streak = won ? (contiguous ? s.stats.streak + 1 : 1) : 0;
          if (!won && s.stats.streak > 0) streakEnd = { mode: "daily", streak: s.stats.streak };
          const dist = [...s.stats.dist];
          if (won) dist[guesses.length - 1]++;
          stats = {
            played: s.stats.played + 1,
            won: s.stats.won + (won ? 1 : 0),
            streak,
            maxStreak: Math.max(s.stats.maxStreak, streak),
            dist,
            lastWonPuzzle: won ? next.puzzle : s.stats.lastWonPuzzle,
            lastPlayedPuzzle: next.puzzle,
          };
        }
        if (s.mode === "practice" && status !== "playing") {
          if (status === "won") practiceStreak = s.practiceStreak + 1;
          else {
            if (s.practiceStreak > 0)
              streakEnd = { mode: "practice", streak: s.practiceStreak };
            practiceStreak = 0;
          }
        }
        set(
          s.mode === "daily"
            ? { daily: next, stats, streakEnd, selectedId: null }
            : { practice: next, practiceStreak, streakEnd, selectedId: null }
        );
      },

      startPractice: (pack) => {
        // Practice is explicitly exempt from determinism (PRD §7): random pick,
        // but hint picks still derive from the stored practiceSeed.
        const practicePack = pack ?? get().practicePack;
        const pool = LOCATIONS.filter((l) => practicePack === "all" || l.pack === practicePack);
        const seed = Math.floor(Math.random() * 1e9);
        const answerId = pool[Math.floor(Math.random() * pool.length)].id;
        set({
          mode: "practice",
          practicePack,
          practiceSeed: seed,
          practice: { puzzle: seed, answerId, guesses: [], status: "playing" },
          selectedId: null,
        });
      },

      clearStreakEnd: () => set({ streakEnd: null }),

      exitPractice: () => set({ mode: "daily", practice: null, selectedId: null }),
      markHowToSeen: () => set({ seenHowTo: true }),

      setDayOffset: (n) => {
        sessionStorage.setItem("pokemaps-dayoffset", String(n));
        set({ dayOffset: n, daily: null });
        get().ensureToday();
      },
      toggleAudit: () => set((s) => ({ audit: !s.audit })),

      resetAll: () => {
        localStorage.removeItem("pokemaps");
        window.location.reload();
      },
    }),
    {
      name: "pokemaps",
      partialize: (s) => ({
        daily: s.daily,
        stats: s.stats,
        practiceStreak: s.practiceStreak,
        practicePack: s.practicePack,
        seenHowTo: s.seenHowTo,
      }),
    }
  )
);

export { currentGame };
