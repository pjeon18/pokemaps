/**
 * Determinism (CLAUDE.md non-negotiable #1): every "random" pick during play
 * derives from the puzzle seed, never Math.random(). Same date → same puzzle,
 * same cry, same sprites, same trainer, worldwide.
 */
import scheduleData from "../content/schedule.json";

const DAY_MS = 86_400_000;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Local-midnight day index (Wordle convention): #1 on launch day. */
export function puzzleNumberFor(date: Date, offsetDays = 0): number {
  const [y, m, d] = scheduleData.launchEpoch.split("-").map(Number);
  const epochLocal = new Date(y, m - 1, d).getTime();
  const todayLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.floor((todayLocal - epochLocal) / DAY_MS) + 1 + offsetDays;
}

/** Answer id for a puzzle number (1-based; wraps if beyond the built schedule). */
export function answerFor(puzzle: number): string {
  const s = scheduleData.schedule;
  const i = ((puzzle - 1) % s.length + s.length) % s.length;
  return s[i];
}

/** Deterministic pick of n distinct items, keyed by puzzle seed + salt. */
export function seededPick<T>(seed: number, salt: number, items: T[], n: number): T[] {
  if (items.length === 0) return [];
  const rng = mulberry32(seed * 2654435761 + salt);
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length));
}

/** ms until the next local midnight (for the countdown). */
export function msToNextPuzzle(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
