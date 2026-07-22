import { useMemo, useRef, useState } from "react";
import { LOCATIONS, byId } from "../lib/content";
import { useGameStore, currentGame } from "../store/useGameStore";

/** Guess by name when you know the place but not the pixel (also the
 * keyboard path to guessing). Picking a result selects the region on the
 * map — the same confirm step applies everywhere. */
export default function SearchBar() {
  const s = useGameStore();
  const game = currentGame(s);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const guessed = new Set(game?.guesses.map((g) => g.id));
  const playing = game?.status === "playing";

  const activePack = game ? byId.get(game.answerId)?.pack : null;
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return LOCATIONS.filter(
      (l) => l.pack === activePack && l.name.toLowerCase().includes(needle)
    ).slice(0, 6);
  }, [q, activePack]);

  if (!playing) return null;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        placeholder="Know the name? Search it…"
        aria-label="Search a location by name"
        className="w-full h-[56px] px-5 rounded-full border-[2.5px] border-[var(--wm-line-strong)] bg-[var(--wm-panel)] text-[17px] font-bold placeholder:font-medium placeholder:text-[var(--wm-text-3)] shadow-[0_4px_0_rgba(23,19,12,0.9)]"
      />
      {focus && matches.length > 0 && (
        <ul className="absolute z-30 left-2 right-2 mt-2 card overflow-hidden">
          {matches.map((l) => {
            const done = guessed.has(l.id);
            return (
              <li key={l.id} className="border-b border-[var(--wm-line)] last:border-b-0">
                <button
                  disabled={done}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    s.select(l.id);
                    setQ("");
                    inputRef.current?.blur();
                  }}
                  className="w-full text-left px-5 py-3 text-[17px] font-bold disabled:opacity-40 flex items-center justify-between hover:bg-[var(--wm-panel-2)]"
                >
                  {l.name}
                  <span className="survey-label">{done ? "guessed" : l.class}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
