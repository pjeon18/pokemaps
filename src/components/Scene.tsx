import { useMemo, type CSSProperties } from "react";
import { asset } from "../lib/assets";
import { seededPick } from "../lib/seed";

/**
 * Overworld scenery, shared with the Speed Quiz: grass, a forest edge and a
 * few friendly Pokémon from the animated Black and White set. The tiles
 * are cut from the art Paul supplied for Pocket Tactics. Everything is drawn
 * at 2× with pixelated scaling, and none of it is part of the puzzle.
 */
const px = (n: number) => `${n}px`;
const scene = (name: string) => asset(`scene/${name}.png`);
const mon = (id: number) => asset(`scene/mons/${id}.gif`);

/** Friendly-looking Pokémon only, so the scene reads as a calm route. */
const CUTE_LAND = [
  1, 4, 25, 35, 37, 39, 133, 152, 155, 161, 172, 173, 174, 175, 216, 252, 255, 300, 311, 312, 333, 387, 390, 417,
  427, 446, 447, 495, 498, 572, 585, 587,
];

function Img({ name, x, y, top, w, h, z = 1, flip = false }: {
  name: string;
  x: string;
  y?: number;
  top?: number;
  w: number;
  h: number;
  z?: number;
  flip?: boolean;
}) {
  return (
    <img
      src={scene(name)}
      alt=""
      aria-hidden
      draggable={false}
      className="absolute select-none pointer-events-none"
      style={{
        imageRendering: "pixelated",
        left: x,
        ...(top != null ? { top: px(top) } : { bottom: px(y ?? 0) }),
        width: px(w * 2),
        height: px(h * 2),
        zIndex: z,
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    />
  );
}

function Tree({ i, x, y, top, z = 0 }: { i: number; x: string; y?: number; top?: number; z?: number }) {
  return <Img name={i % 3 === 1 ? "pine" : "tree"} x={x} y={y} top={top} w={68} h={160} z={z} flip={i % 2 === 0} />;
}

function Grass({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        backgroundImage: `url(${scene("grass")})`,
        backgroundSize: "256px 256px",
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
}

/** An animated sprite at 2×, its bottom centre on the given spot. */
function Mon({ id, left, bottom, flip = false, z = 3 }: { id: number; left: string; bottom: number; flip?: boolean; z?: number }) {
  return (
    <img
      src={mon(id)}
      alt=""
      aria-hidden
      className="absolute pointer-events-none"
      style={{
        imageRendering: "pixelated",
        left,
        bottom: px(bottom),
        zIndex: z,
        transform: `translateX(-50%)${flip ? " scaleX(-1)" : ""}`,
        visibility: "hidden",
      }}
      onLoad={(e) => {
        const img = e.currentTarget;
        img.style.width = `${img.naturalWidth * 2}px`;
        img.style.height = `${img.naturalHeight * 2}px`;
        img.style.visibility = "visible";
      }}
    />
  );
}

/** A row of trees cut off by the top or bottom edge, like the border of a route. */
function TreeLine({ edge, offset = 0, lift = 0, count = 24, z = 0 }: {
  edge: "top" | "bottom";
  offset?: number;
  lift?: number;
  count?: number;
  z?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) =>
        edge === "top" ? (
          <Tree key={i} i={i} x={px(i * 112 - 40 + offset)} top={-170 - lift + (i % 2) * 18} z={z} />
        ) : (
          <Tree key={i} i={i + 1} x={px(i * 112 - 40 + offset)} y={-130 - lift + (i % 2) * 22} z={z} />
        )
      )}
    </>
  );
}

/**
 * The backdrop behind the game: a grass clearing with forest down both sides
 * and along the bottom, and one friendly Pokémon in the bottom-right corner.
 * It is one fixed layer, so the whole scene stays put while the page scrolls
 * over it. The Pokémon changes with the puzzle, so everyone sees the same one
 * on the same day.
 */
export function ForestBackdrop({ seed }: { seed: number }) {
  const side = Array.from({ length: 8 }, (_, i) => i);
  const pal = useMemo(() => seededPick(seed, 41, CUTE_LAND, 1)[0], [seed]);
  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <Grass className="absolute inset-0" />
      {side.map((i) => (
        <Tree key={`l${i}`} i={i} x={px(-96 + (i % 2) * 30)} top={i * 150 - 60} z={i} />
      ))}
      {side.map((i) => (
        <Tree key={`r${i}`} i={i + 1} x={`calc(100% - ${px(40 + (i % 2) * 30)})`} top={i * 150 - 20} z={i} />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-[180px]">
        <TreeLine edge="bottom" offset={56} z={10} />
        <TreeLine edge="bottom" z={11} />
        {/* Desktop: one Pokémon in the bottom-right corner. Phones show it at
            the end of the page instead (FooterMon), because the cards there
            cover the backdrop and would leave slivers in the gaps. */}
        <div className="hidden lg:block">
          <Mon id={pal} left="calc(100% - 110px)" bottom={26} z={12} flip />
        </div>
      </div>
    </div>
  );
}

/** Phone only: the same Pokémon, standing in front of the trees at the bottom right of the page. */
export function FooterMon({ seed }: { seed: number }) {
  const pal = useMemo(() => seededPick(seed, 41, CUTE_LAND, 1)[0], [seed]);
  return (
    <div aria-hidden className="lg:hidden relative h-[190px]">
      <Mon id={pal} left="calc(100% - 70px)" bottom={22} flip />
    </div>
  );
}
