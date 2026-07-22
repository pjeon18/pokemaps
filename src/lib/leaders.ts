/** Streak avatars: the Sinnoh badge/League gauntlet in encounter order.
 * Streak 1 = Roark … streak 13+ = Cynthia. */
export const LEADERS = [
  { key: "roark", name: "Roark" },
  { key: "gardenia", name: "Gardenia" },
  { key: "maylene", name: "Maylene" },
  { key: "fantina", name: "Fantina" },
  { key: "wake", name: "Crasher Wake" },
  { key: "byron", name: "Byron" },
  { key: "candice", name: "Candice" },
  { key: "volkner", name: "Volkner" },
  { key: "aaron", name: "Aaron" },
  { key: "bertha", name: "Bertha" },
  { key: "flint", name: "Flint" },
  { key: "lucian", name: "Lucian" },
  { key: "cynthia", name: "Cynthia" },
] as const;

export function leaderForStreak(streak: number) {
  if (streak < 1) return null;
  return LEADERS[Math.min(streak, LEADERS.length) - 1];
}
