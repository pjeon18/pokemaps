import type { Band } from "./distance";
import { DIR_ARROWS } from "./distance";

const BAND_SQUARE: Record<Band, string> = {
  hit: "🟩",
  warm: "🟨",
  mid: "🟧",
  cold: "🟥",
};

/** Streak-run share string — used by the streak-end popup. */
export function streakShareString(
  streak: number,
  leaderName: string | null,
  label: string
): string {
  const traveled = leaderName ? ` — traveled with ${leaderName}` : "";
  return `PokéMAPs ${label}: ${streak} in a row${traveled}\n${location.origin}${location.pathname}`;
}

/** Spoiler-free share string (PRD §8). Emoji allowed here — it's share text,
 * not UI chrome. */
export function shareString(
  puzzle: number,
  guesses: { band: Band; dir: string }[],
  won: boolean
): string {
  const score = won ? `${guesses.length}/6` : "X/6";
  const rows = guesses
    .map((g) => (g.band === "hit" ? BAND_SQUARE.hit : BAND_SQUARE[g.band] + DIR_ARROWS[g.dir]))
    .join(" ");
  return `PokéMAPs #${puzzle} — ${score}\n${rows}\n${location.origin}${location.pathname}`;
}
