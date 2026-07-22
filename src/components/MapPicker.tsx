import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LOCATIONS, byId, packById, type Loc } from "../lib/content";
import { asset } from "../lib/assets";
import { useGameStore, currentGame } from "../store/useGameStore";
import type { Band } from "../lib/distance";

const TILE = 8;
const HIT_PAD = 0.35; // tiles of tap tolerance

const BAND_FILL: Record<Band, string> = {
  hit: "var(--wm-hit)",
  warm: "var(--wm-warm)",
  mid: "var(--wm-mid)",
  cold: "var(--wm-cold)",
};

/** Exact containment beats padded proximity (so a route band skimming past a
 * town node can't steal its tap); among ties, the smallest region wins, so
 * tiny landmarks beat the routes they sit on. Coordinates in tile units. */
function hitTest(locs: Loc[], tx: number, ty: number): string | null {
  let exact: { id: string; area: number } | null = null;
  let padded: { id: string; area: number } | null = null;
  for (const loc of locs) {
    for (const [x, y, w, h] of loc.rects) {
      const area = w * h;
      if (tx >= x && tx <= x + w && ty >= y && ty <= y + h) {
        if (!exact || area < exact.area) exact = { id: loc.id, area };
      } else if (
        tx >= x - HIT_PAD &&
        tx <= x + w + HIT_PAD &&
        ty >= y - HIT_PAD &&
        ty <= y + h + HIT_PAD
      ) {
        if (!padded || area < padded.area) padded = { id: loc.id, area };
      }
    }
  }
  return exact?.id ?? padded?.id ?? null;
}

export default function MapPicker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: 0, startDist: 0, startScale: 1 });

  const s = useGameStore();
  const game = currentGame(s);
  const answerLoc = game ? byId.get(game.answerId)! : null;
  const pack = packById.get(answerLoc?.pack ?? "sinnoh")!;
  const MAP_W = pack.grid.cols * TILE;
  const MAP_H = pack.grid.rows * TILE;
  const MAX_SCALE = pack.grid.cols > 30 ? 8 : 5;
  const packLocs = useMemo(() => LOCATIONS.filter((l) => l.pack === pack.id), [pack.id]);

  const [size, setSize] = useState({ w: 343, h: (343 * MAP_H) / MAP_W });
  const playing = game?.status === "playing";
  const guessedBands = new Map<string, Band>();
  for (const g of game?.guesses ?? []) guessedBands.set(g.id, g.band);
  const answerId = game && game.status !== "playing" ? game.answerId : null;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      setSize({ w, h: (w * MAP_H) / MAP_W });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [MAP_W, MAP_H]);

  // new pack (or new puzzle) → reset the viewport
  useEffect(() => {
    setView({ scale: 1, tx: 0, ty: 0 });
    setHovered(null);
    const w = containerRef.current?.clientWidth ?? 343;
    setSize({ w, h: (w * MAP_H) / MAP_W });
  }, [pack.id, game?.puzzle, MAP_W, MAP_H]);

  const clamp = (v: { scale: number; tx: number; ty: number }) => {
    const scale = Math.min(MAX_SCALE, Math.max(1, v.scale));
    const minTx = size.w - size.w * scale;
    const minTy = size.h - size.h * scale;
    return {
      scale,
      tx: Math.min(0, Math.max(minTx, v.tx)),
      ty: Math.min(0, Math.max(minTy, v.ty)),
    };
  };

  /** client coords → tile coords */
  const toTile = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const px = (clientX - rect.left - view.tx) / view.scale;
    const py = (clientY - rect.top - view.ty) / view.scale;
    return { tx: (px / size.w) * pack.grid.cols, ty: (py / size.h) * pack.grid.rows };
  };

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    setView((v) => {
      const scale = Math.min(MAX_SCALE, Math.max(1, v.scale * factor));
      const k = scale / v.scale;
      return clamp({ scale, tx: cx - k * (cx - v.tx), ty: cy - k * (cy - v.ty) });
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    containerRef.current!.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current.moved = 0;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.startDist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.startScale = view.scale;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) {
      if (e.pointerType === "mouse" && playing) {
        const { tx, ty } = toTile(e.clientX, e.clientY);
        setHovered(hitTest(packLocs, tx, ty));
      }
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current.moved += Math.abs(dx) + Math.abs(dy);
    if (pointers.current.size === 1) {
      setView((v) => clamp({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const target = (gesture.current.startScale * dist) / gesture.current.startDist;
      zoomAt(mid.x, mid.y, target / view.scale);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0 && gesture.current.moved < 8 && playing) {
      const { tx, ty } = toTile(e.clientX, e.clientY);
      const id = hitTest(packLocs, tx, ty);
      if (id && !guessedBands.has(id)) s.select(id === s.selectedId ? null : id);
    }
  };

  const readoutId = s.selectedId ?? hovered;
  const readout = readoutId ? byId.get(readoutId) : null;
  const tileDisplay = (size.w / pack.grid.cols) * view.scale;

  const rectEls: React.ReactNode[] = [];
  for (const loc of packLocs) {
    const band = guessedBands.get(loc.id);
    const isAnswer = loc.id === answerId;
    const isSelected = loc.id === s.selectedId;
    const isHover = loc.id === hovered && playing && !band;
    const showAudit = s.audit;
    if (!band && !isAnswer && !isSelected && !isHover && !showAudit) continue;
    for (const [x, y, w, h] of loc.rects) {
      rectEls.push(
        <rect
          key={`${loc.id}-${x}-${y}`}
          x={x * TILE}
          y={y * TILE}
          width={w * TILE}
          height={h * TILE}
          rx={1.5}
          fill={
            isAnswer
              ? "var(--wm-hit)"
              : band
                ? BAND_FILL[band]
                : isSelected
                  ? "var(--wm-accent)"
                  : "transparent"
          }
          fillOpacity={isAnswer ? 0.8 : band ? 0.72 : isSelected ? 0.35 : 0}
          stroke={
            isAnswer
              ? "var(--wm-hit)"
              : isSelected
                ? "var(--wm-accent)"
                : band
                  ? BAND_FILL[band]
                  : "var(--wm-accent)"
          }
          strokeOpacity={showAudit && !band && !isSelected && !isAnswer && !isHover ? 0.5 : 1}
          strokeWidth={isSelected || isAnswer ? 1.2 : band ? 1 : 0.7}
          strokeDasharray={isSelected ? "2.5 1.5" : undefined}
        />
      );
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* plate header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-[2.5px] border-[var(--wm-line-strong)]">
        <span className="display text-[19px]">{pack.name}</span>
        <span className="survey-label flex items-center gap-2">
          <span
            className="inline-block h-[3px] bg-[var(--wm-text-3)]"
            style={{ width: Math.max(16, tileDisplay * 3) }}
          />
          3 tiles · N↑
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative w-full touch-none select-none cursor-crosshair overflow-hidden"
        style={{ height: size.h }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHovered(null)}
        onWheel={(e) => zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 0.87)}
        onDoubleClick={(e) => zoomAt(e.clientX, e.clientY, view.scale < MAX_SCALE / 2 ? 1.8 : 0.3)}
      >
        <div
          style={{
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
            transformOrigin: "0 0",
            width: size.w,
            height: size.h,
          }}
        >
          <img
            src={asset(`content/map/${pack.id}.png`)}
            alt={`${pack.name} town map`}
            draggable={false}
            className="w-full h-full"
            style={{ imageRendering: "pixelated" }}
          />
          <svg
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {rectEls}
            {s.audit &&
              packLocs.map((l) => (
                <text
                  key={l.id}
                  x={l.center[0] * TILE}
                  y={l.center[1] * TILE}
                  fontSize={3}
                  fill="#000"
                  stroke="#fff"
                  strokeWidth={0.12}
                  textAnchor="middle"
                >
                  {l.name}
                </text>
              ))}
          </svg>
        </div>
      </div>

      {/* readout + confirm */}
      <div className="border-t-[2.5px] border-[var(--wm-line-strong)] px-4 py-2.5 min-h-[64px] flex items-center justify-between gap-3">
        {playing ? (
          readout ? (
            <>
              <div className="min-w-0">
                <div className="text-[19px] font-bold leading-tight truncate">{readout.name}</div>
                <div className="survey-label">{readout.class}</div>
              </div>
              {s.selectedId && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => s.select(null)}
                    className="text-[15px] font-bold px-4 py-2.5 rounded-full border-[2.5px] border-[var(--wm-line-strong)]"
                  >
                    Cancel
                  </button>
                  <motion.button
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={s.confirmGuess}
                    className="text-[15px] font-black px-5 py-2.5 rounded-full bg-[var(--wm-line-strong)] text-white"
                  >
                    Guess it!
                  </motion.button>
                </div>
              )}
            </>
          ) : (
            <span className="text-[15px] font-medium text-[var(--wm-text-3)]">
              Tap the map to guess · drag to pan · pinch to zoom
            </span>
          )
        ) : (
          <span className="text-[19px] font-bold">
            {answerLoc?.name}
            <span
              className="ml-2.5 text-[15px] font-black uppercase"
              style={{ color: game!.status === "won" ? "var(--wm-hit)" : "var(--wm-cold)" }}
            >
              {game!.status === "won" ? "★ Found" : "Not found"}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
