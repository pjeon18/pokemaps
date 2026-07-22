import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Loc } from "../lib/content";
import { titleCase, spritePath } from "../lib/content";
import { seededPick } from "../lib/seed";
import { asset } from "../lib/assets";

/** Ladder order (2026-07-20, tuned for difficulty): vaguest first, giveaway
 * last. Each hint number is a ball tier — Poké Ball opener, Master Ball
 * photograph (it never fails). */
const HINT_LABELS = [
  "Classification",
  "Field audio",
  "Overheard",
  "Wild sprites",
  "Town-map note",
  "Photograph",
];
const HINT_BALLS = [
  "poke-ball",
  "great-ball",
  "ultra-ball",
  "quick-ball",
  "dusk-ball",
  "master-ball",
];

/** Every cry in the area as chunky numbered play chips — deterministic
 * shuffled order so chip numbering never leaks dex order. */
function CryChips({ ids }: { ids: number[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const play = (id: number) => {
    audioRef.current?.pause();
    const a = new Audio(asset(`content/cries/${id}.mp3`));
    audioRef.current = a;
    setActive(id);
    a.addEventListener("ended", () => setActive(null));
    a.play();
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ids.map((id, i) => (
          <button
            key={id}
            onClick={() => play(id)}
            aria-label={`Play cry ${i + 1}`}
            className="h-12 min-w-[64px] px-3 rounded-full border-[2.5px] border-[var(--wm-line-strong)] font-bold text-[15px] flex items-center justify-center gap-1.5 transition-colors"
            style={
              active === id
                ? { background: "var(--wm-accent)", color: "var(--wm-accent-ink)", borderColor: "var(--wm-accent)" }
                : { background: "var(--wm-panel)" }
            }
          >
            ▶ {String(i + 1).padStart(2, "0")}
          </button>
        ))}
      </div>
      <div className="survey-label mt-2.5">
        {ids.length} wild {ids.length === 1 ? "cry" : "cries"} recorded here · replay freely
      </div>
    </div>
  );
}

export default function HintPanel({
  loc,
  seed,
  unlocked,
  ended,
}: {
  loc: Loc;
  seed: number;
  unlocked: number;
  ended: boolean;
}) {
  const allCries = seededPick(seed, 2, loc.encounters, loc.encounters.length);
  const sprites = seededPick(seed, 3, loc.encounters, 3);
  const trainer = seededPick(seed, 4, loc.trainers, 1)[0];

  const noPokemon = (
    <p className="text-[19px] font-bold">
      No Pokémon in this area.
      <span className="block text-[15px] font-medium text-[var(--wm-text-2)] mt-1">
        Very few places are this quiet…
      </span>
    </p>
  );

  const bodies: (React.ReactNode | null)[] = [
    // 1 — classification (vaguest opener)
    <div key="h1" className="flex flex-wrap gap-2">
      {[loc.class, ...loc.terrain].map((c) => (
        <span
          key={c}
          className="font-bold text-[15px] uppercase tracking-wider px-4 py-2 rounded-full border-[2.5px] border-[var(--wm-line-strong)]"
        >
          {c}
        </span>
      ))}
    </div>,
    // 2 — field audio: every cry in the area
    loc.encounters.length > 0 ? (
      <CryChips key="h2" ids={allCries.map((e) => e.id)} />
    ) : (
      <div key="h2">{noPokemon}</div>
    ),
    // 3 — overheard (speaker sprite + deliberately simple attribution)
    loc.dialogue ? (
      <figure key="h3" className="flex items-start gap-3">
        {loc.dialogue.sprite && (
          <img
            src={asset(`content/${loc.dialogue.sprite}`)}
            alt=""
            className="h-20 w-20 object-contain shrink-0 -my-1"
            style={{ imageRendering: "pixelated" }}
          />
        )}
        <div>
          <blockquote className="text-[19px] leading-snug font-medium">
            “{loc.dialogue.text}”
          </blockquote>
          <figcaption className="survey-label mt-2">— {loc.dialogue.who}</figcaption>
        </div>
      </figure>
    ) : null,
    // 4 — wild sprites
    loc.encounters.length > 0 ? (
      <div key="h4" className="flex gap-3">
        {sprites.map((sp) => (
          <figure key={sp.id} className="flex flex-col items-center gap-1.5">
            <span className="h-[84px] w-[84px] rounded-[var(--wm-radius-sm)] bg-[var(--wm-panel-2)] border-[2.5px] border-[var(--wm-line-strong)] grid place-items-center">
              <img
                src={asset(spritePath(loc, sp.id))}
                alt={sp.name}
                className="h-[72px] w-[72px]"
                style={{ imageRendering: "pixelated" }}
              />
            </span>
            <figcaption className="text-[13px] font-bold">{titleCase(sp.name)}</figcaption>
          </figure>
        ))}
      </div>
    ) : (
      <div key="h4">{noPokemon}</div>
    ),
    // 5 — town-map note (fallbacks: slogan → trainer)
    loc.noteType === "mapdesc" ? (
      <p key="h5" className="text-[17px] leading-relaxed text-[var(--wm-text-2)] font-medium">
        {loc.mapdesc}
      </p>
    ) : loc.noteType === "slogan" ? (
      <p key="h5" className="text-[19px] font-bold">“{loc.slogan}”</p>
    ) : loc.noteType === "trainer" && trainer ? (
      <div key="h5" className="flex items-start gap-3">
        <img
          src={asset(`content/trainer-sprites/${trainer.sprite}`)}
          alt=""
          className="h-16 w-16 object-contain"
          style={{ imageRendering: "pixelated" }}
        />
        <div>
          <div className="text-[17px] font-bold">
            {trainer.class} {trainer.name} battles here
          </div>
          <div className="text-[14px] font-medium text-[var(--wm-text-2)] mt-1">
            {trainer.team.map((p) => `${titleCase(p.species)} Lv.${p.level}`).join(" · ")}
          </div>
        </div>
      </div>
    ) : null,
    // 6 — photograph
    loc.screenshot ? (
      <div
        key="h6"
        className="overflow-hidden rounded-[var(--wm-radius-sm)] border-[2.5px] border-[var(--wm-line-strong)]"
      >
        <img
          src={asset(`content/images/${loc.screenshot}`)}
          alt="Field photograph of the area"
          className="w-full transition-[filter,transform] duration-700"
          style={
            ended
              ? undefined
              : { filter: "blur(14px) saturate(1.15)", transform: "scale(1.1)" }
          }
        />
      </div>
    ) : null,
  ];

  return (
    <section className="card overflow-hidden">
      <div className="px-4 py-3 border-b-[2.5px] border-[var(--wm-line-strong)] flex items-baseline justify-between">
        <span className="display text-[19px]">Hints</span>
        <span className="survey-label">{Math.min(unlocked, 6)}/6 revealed</span>
      </div>
      <ol>
        {HINT_LABELS.map((label, i) => {
          const n = i + 1;
          const open = n <= unlocked || ended;
          const body = bodies[i];
          const shownLabel =
            i === 4 && loc.noteType === "slogan"
              ? "Town sign"
              : i === 4 && loc.noteType === "trainer"
                ? "Trainer log"
                : label;
          return (
            <li key={label} className="px-4 py-3 border-b border-[var(--wm-line)] last:border-b-0">
              <div className="flex items-center justify-between">
                <span
                  className="flex items-center gap-2 font-mono text-[13px] font-medium tracking-[0.14em] uppercase"
                  style={{ color: open ? "var(--wm-text)" : "var(--wm-text-3)" }}
                >
                  <img
                    src={asset(`content/balls/${HINT_BALLS[i]}.png`)}
                    alt={`Hint ${n}`}
                    className="h-7 w-7 -my-1"
                    style={{
                      imageRendering: "pixelated",
                      filter: open ? undefined : "grayscale(1) opacity(0.45)",
                    }}
                  />
                  <span className="font-bold">0{n}</span> {shownLabel}
                </span>
                {!open && <span className="survey-label">after guess {n - 1}</span>}
              </div>
              <AnimatePresence initial={false}>
                {open && body && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3">{body}</div>
                  </motion.div>
                )}
              </AnimatePresence>
              {open && !body && (
                <div className="pt-2 text-[15px] font-medium text-[var(--wm-text-3)]">
                  No record for this area.
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
