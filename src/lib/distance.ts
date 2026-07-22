/**
 * Guess feedback (PRD §5): Euclidean distance between region centroids in
 * map-tile units + an 8-way bearing from guess toward answer.
 *
 * Band thresholds are tuned to THIS map: the DP town map is a 27×21 tile
 * grid (max possible distance ≈ 34), so the PRD's illustrative values are
 * rescaled here. These are the game's tuning constants.
 */
export const BANDS = {
  warm: 4, // ≤ 4 tiles
  mid: 10, // ≤ 10 tiles
} as const;

export type Band = "hit" | "warm" | "mid" | "cold";

export function bandFor(distance: number, hit: boolean): Band {
  if (hit) return "hit";
  if (distance <= BANDS.warm) return "warm";
  if (distance <= BANDS.mid) return "mid";
  return "cold";
}

const DIRS = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"] as const;
export const DIR_ARROWS: Record<string, string> = {
  E: "→",
  NE: "↗",
  N: "↑",
  NW: "↖",
  W: "←",
  SW: "↙",
  S: "↓",
  SE: "↘",
};

export function feedback(guess: [number, number], answer: [number, number]) {
  const dx = answer[0] - guess[0];
  const dy = answer[1] - guess[1];
  const distance = Math.round(Math.hypot(dx, dy) * 10) / 10;
  // screen y grows downward; N is -y
  const angle = Math.atan2(-dy, dx); // radians, E = 0
  const oct = Math.round(angle / (Math.PI / 4));
  const dir = DIRS[((oct % 8) + 8) % 8];
  return { distance, dir };
}
