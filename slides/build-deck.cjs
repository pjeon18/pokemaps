/* PokéMAPs — design-process portfolio deck.
 * Built in the app's own "field guide, turned up" language:
 * white pages, ink outlines, hard drop shadows, mono survey labels,
 * color only where it means something (bands + one blue).
 * Run: node slides/build-deck.cjs  → slides/PokeMAPs_Design_Process.pptx
 */
const path = require("path");
const pptxgen = require(path.join(__dirname, "../../iso-prototype/node_modules/pptxgenjs"));

const SHOTS = (f) => path.join(__dirname, "shots", f);
const CONTENT = (f) => path.join(__dirname, "../public/content", f);

// ——— tokens (mirror src/styles/tokens.css) ———
const INK = "17130C";
const TEXT2 = "4C4638";
const TEXT3 = "8A8270";
const BLUE = "0D7FBF";
const PANEL2 = "F4F2EC";
const LINE = "E5E1D6";
const HIT = "1CA35E";
const WARM = "E0A800";
const MID = "E2711D";
const COLD = "D94A4A";

const DISPLAY = "Arial Rounded MT Bold";
const BODY = "Arial";
const MONO = "Courier New";

const W = 13.33;
const H = 7.5;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "Paul Jeon";
pres.title = "PokéMAPs — Design Process";

// hard DS-menu shadow — fresh object per use (pptxgenjs mutates in place)
const shadow = () => ({ type: "outer", color: INK, opacity: 0.9, blur: 0, offset: 3, angle: 90 });

/** chunky ink-outlined card */
function card(slide, x, y, w, h, { fill = "FFFFFF", lineW = 2.25 } = {}) {
  slide.addShape("roundRect", {
    x, y, w, h,
    rectRadius: 0.12,
    fill: { color: fill },
    line: { color: INK, width: lineW },
    shadow: shadow(),
  });
}

/** mono survey eyebrow */
function eyebrow(slide, text, x, y, w, opts = {}) {
  slide.addText(text.toUpperCase(), {
    x, y, w, h: 0.32,
    fontFace: MONO, fontSize: 11, charSpacing: 3,
    color: opts.color ?? TEXT3, margin: 0, align: opts.align ?? "left", bold: false,
  });
}

function title(slide, text, x, y, w, size = 32, color = INK) {
  slide.addText(text, {
    x, y, w, h: size / 46,
    fontFace: DISPLAY, fontSize: size, color, bold: true, margin: 0, lineSpacingMultiple: 1.04,
  });
}

function body(slide, runs, x, y, w, h, size = 14, color = TEXT2) {
  slide.addText(runs, {
    x, y, w, h,
    fontFace: BODY, fontSize: size, color, margin: 0, lineSpacingMultiple: 1.22, valign: "top",
  });
}

const fit = (iw, ih, maxW, maxH) => {
  const s = Math.min(maxW / iw, maxH / ih);
  return { w: iw * s, h: ih * s };
};

/* ————————————————— 1 · COVER ————————————————— */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  eyebrow(s, "Product design case study · 2026", 0.75, 0.75, 7);
  // wordmark, captured live from the app (420×82)
  s.addImage({ path: SHOTS("wordmark.png"), x: 0.72, y: 1.25, w: 4.83, h: 0.943 });
  body(
    s,
    "A daily location-guessing puzzle played on the Pokémon games' own town maps — six escalating hints, direction-only feedback, one answer a day across five regions.",
    0.75, 2.55, 7.3, 1.15, 17
  );
  body(s, "Paul Jeon — product · design · engineering", 0.75, 3.62, 6, 0.3, 12, TEXT3);

  // stat chips
  const stats = [
    ["5", "REGIONS"],
    ["373", "LOCATIONS"],
    ["6", "HINT TIERS"],
    ["1", "PUZZLE A DAY"],
  ];
  stats.forEach(([n, label], i) => {
    const x = 0.75 + i * 2.02;
    card(s, x, 4.55, 1.82, 1.35);
    s.addText(n, { x, y: 4.72, w: 1.82, h: 0.6, fontFace: DISPLAY, fontSize: 30, bold: true, color: i === 1 ? BLUE : INK, align: "center", margin: 0 });
    s.addText(label, { x, y: 5.42, w: 1.82, h: 0.3, fontFace: MONO, fontSize: 9.5, charSpacing: 2, color: TEXT3, align: "center", margin: 0 });
  });
  body(s, "pjeon18.github.io/pokemaps  ·  github.com/pjeon18/pokemaps", 0.75, 6.55, 7, 0.3, 12, TEXT3);

  // phone shot right (1170×2532)
  const m = fit(1170, 2532, 3.4, 6.34);
  card(s, 9.55, 0.48, m.w + 0.16, m.h + 0.16);
  s.addImage({ path: SHOTS("mobile-playing.png"), x: 9.63, y: 0.56, w: m.w, h: m.h });
}

/* ————————————————— 2 · CONCEPT ————————————————— */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  eyebrow(s, "01 — The concept", 0.75, 0.6, 6);
  title(s, [
    { text: "Wordle × GeoGuessr — ", options: { color: INK } },
    { text: "on the games' own town maps.", options: { color: BLUE } },
  ], 0.75, 1.05, 6.6, 30);
  body(
    s,
    "Every day, one hidden location somewhere in the Pokémon world. You don't type a word — you tap the actual pixel town map. Wrong guesses answer back, and the hint ladder drops another rung.",
    0.75, 2.35, 5.9, 1.2, 14.5
  );

  const steps = [
    ["01", "TAP THE MAP", "A guess is a place, not a word — every location is a click region on the real in-game map."],
    ["02", "DIRECTION + HEAT", "Feedback is an 8-way arrow and a warmth band. Never a number."],
    ["03", "THE LADDER DROPS", "Each miss unlocks a broader hint, from habitat classification down to a photograph."],
  ];
  steps.forEach(([n, label, desc], i) => {
    const y = 3.85 + i * 1.13;
    card(s, 0.75, y, 5.9, 0.98);
    s.addText(n, { x: 0.98, y: y + 0.18, w: 0.6, h: 0.6, fontFace: DISPLAY, fontSize: 22, bold: true, color: BLUE, margin: 0 });
    s.addText(label, { x: 1.62, y: y + 0.13, w: 4.9, h: 0.28, fontFace: MONO, fontSize: 10.5, charSpacing: 2, color: INK, bold: true, margin: 0 });
    s.addText(desc, { x: 1.62, y: y + 0.42, w: 4.85, h: 0.5, fontFace: BODY, fontSize: 11.5, color: TEXT2, margin: 0, lineSpacingMultiple: 1.1 });
  });

  // map card shot (1106×928)
  const m = fit(1106, 928, 5.6, 5.4);
  card(s, 7.15, 1.35, m.w + 0.16, m.h + 0.16);
  s.addImage({ path: SHOTS("map-card.png"), x: 7.23, y: 1.43, w: m.w, h: m.h });
  eyebrow(s, "The Hoenn survey sheet — live build", 7.15, 1.35 + m.h + 0.3, 5.5);
}

/* ————————————————— 3 · DESIGN LANGUAGE ————————————————— */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  eyebrow(s, "02 — Design language", 0.75, 0.6, 6);
  title(s, "Field guide, turned up.", 0.75, 1.05, 6.5, 32);
  body(
    s,
    "The interface plays a naturalist's survey kit: white pages, ink outlines, huge rounded type with the DS-menu energy of the games themselves. The chrome never competes with the pixel maps — it frames them.",
    0.75, 1.95, 6.6, 1.3, 14.5
  );

  // guess log as proof, right (1106×746)
  const g = fit(1106, 746, 4.6, 3.2);
  card(s, 8.0, 0.75, g.w + 0.16, g.h + 0.16);
  s.addImage({ path: SHOTS("guess-log.png"), x: 8.08, y: 0.83, w: g.w, h: g.h });
  eyebrow(s, "Direction + heat, never distance", 8.0, 0.75 + g.h + 0.3, 4.6);

  const cards = [
    ["INK ON WHITE", "Panels are white with 2.5px ink outlines and hard un-blurred drop shadows — menu boxes you could pick up."],
    ["SEMANTIC COLOR ONLY", "Color appears only as information: proximity bands and one interactive blue. The pixel maps carry all the rest."],
    ["LOUD TYPE, QUIET LABELS", "M PLUS Rounded 1c at display sizes does the talking; IBM Plex Mono survey labels whisper in the margins."],
  ];
  cards.forEach(([label, desc], i) => {
    const x = 0.75 + i * 4.05;
    card(s, x, 4.55, 3.85, 2.15);
    s.addText(label, { x: x + 0.25, y: 4.85, w: 3.35, h: 0.3, fontFace: MONO, fontSize: 11, charSpacing: 2, color: BLUE, bold: true, margin: 0 });
    s.addText(desc, { x: x + 0.25, y: 5.25, w: 3.35, h: 1.3, fontFace: BODY, fontSize: 12.5, color: TEXT2, margin: 0, lineSpacingMultiple: 1.2 });
  });
}

/* ————————————————— 4 · TYPE & COLOR ————————————————— */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  eyebrow(s, "03 — Type & color", 0.75, 0.6, 6);
  title(s, "One face for everything. Color as data.", 0.75, 1.05, 9, 28);

  // live-captured type specimen (1840×542)
  const t = fit(1840, 542, 7.55, 2.25);
  card(s, 0.75, 1.95, t.w + 0.2, t.h + 0.2, { fill: "FFFFFF" });
  s.addImage({ path: SHOTS("type-specimen.png"), x: 0.85, y: 2.05, w: t.w, h: t.h });

  // typeface note
  card(s, 8.85, 1.95, 3.75, t.h + 0.2, { fill: PANEL2 });
  s.addText("WHY THIS FACE", { x: 9.1, y: 2.25, w: 3.2, h: 0.3, fontFace: MONO, fontSize: 10.5, charSpacing: 2, color: INK, bold: true, margin: 0 });
  s.addText(
    "M PLUS Rounded 1c is the free relative of FOT-NewRodin — the rounded face the games themselves use. IBM Plex Mono plays the instrument-panel labels.",
    { x: 9.1, y: 2.62, w: 3.25, h: 1.5, fontFace: BODY, fontSize: 12, color: TEXT2, margin: 0, lineSpacingMultiple: 1.22 }
  );

  // swatches
  const swatches = [
    ["INK", INK, "chrome & type"],
    ["INTERACTIVE", BLUE, "the one blue"],
    ["HIT", HIT, "found it"],
    ["WARM", WARM, "getting close"],
    ["MID", MID, "in the region"],
    ["COLD", COLD, "far away"],
  ];
  swatches.forEach(([name, hex, note], i) => {
    const x = 0.75 + i * 2.02;
    card(s, x, 4.75, 1.82, 1.85);
    s.addShape("roundRect", { x: x + 0.18, y: 4.95, w: 1.46, h: 0.75, rectRadius: 0.09, fill: { color: hex }, line: { color: INK, width: 1.5 } });
    s.addText(name, { x: x + 0.05, y: 5.82, w: 1.72, h: 0.26, fontFace: MONO, fontSize: 9, charSpacing: 1.5, color: INK, bold: true, align: "center", margin: 0 });
    s.addText("#" + hex + " · " + note, { x: x + 0.02, y: 6.08, w: 1.78, h: 0.4, fontFace: BODY, fontSize: 8.5, color: TEXT3, align: "center", margin: 0 });
  });
  body(s, "Band colors are the game's information — the warmth of a guess. Nothing else in the chrome is allowed to have color.", 0.75, 6.85, 11, 0.35, 12, TEXT3);
}

/* ————————————————— 5 · HINT LADDER ————————————————— */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  eyebrow(s, "04 — The hint ladder", 0.75, 0.6, 6);
  title(s, "Six hints, hardest first — priced in Poké Balls.", 0.75, 1.05, 7.6, 27);
  body(
    s,
    "Rarer ball, bigger giveaway. The opener asks you to reason from habitat; the Master Ball simply shows you the place.",
    0.75, 1.95, 7.0, 0.7, 13.5
  );

  const tiers = [
    ["poke-ball", "CLASSIFICATION", "terrain and habitat chips only"],
    ["great-ball", "FIELD AUDIO", "every wild cry recorded in the area"],
    ["ultra-ball", "OVERHEARD", "a real NPC line — in-game class and name"],
    ["quick-ball", "WILD SPRITES", "encounters, in that generation's own pixels"],
    ["dusk-ball", "TOWN-MAP NOTE", "the games' own map description"],
    ["master-ball", "PHOTOGRAPH", "an in-game screenshot, unblurred at the end"],
  ];
  tiers.forEach(([ball, name, desc], i) => {
    const y = 2.75 + i * 0.72;
    card(s, 0.75, y, 7.0, 0.6);
    s.addImage({ path: CONTENT("balls/" + ball + ".png"), x: 0.98, y: y + 0.14, w: 0.32, h: 0.32 });
    s.addText("0" + (i + 1), { x: 1.45, y: y + 0.16, w: 0.45, h: 0.3, fontFace: MONO, fontSize: 12, color: TEXT3, bold: true, margin: 0 });
    s.addText(name, { x: 1.95, y: y + 0.15, w: 2.6, h: 0.3, fontFace: DISPLAY, fontSize: 13.5, bold: true, color: INK, margin: 0 });
    s.addText(desc, { x: 4.55, y: y + 0.17, w: 3.05, h: 0.3, fontFace: BODY, fontSize: 10.5, color: TEXT3, margin: 0 });
  });

  // hint panel shot (962×1588)
  const hp = fit(962, 1588, 4.2, 6.3);
  card(s, 8.55, 0.5, hp.w + 0.16, hp.h + 0.16);
  s.addImage({ path: SHOTS("hint-panel.png"), x: 8.63, y: 0.58, w: hp.w, h: hp.h });
}

/* ————————————————— 6 · FEEDBACK ————————————————— */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  eyebrow(s, "05 — Guess feedback", 0.75, 0.6, 6);

  // big desktop shot (2720×1800)
  const d = fit(2720, 1800, 8.1, 5.36);
  card(s, 0.75, 1.5, d.w + 0.16, d.h + 0.16);
  s.addImage({ path: SHOTS("desktop-playing.png"), x: 0.83, y: 1.58, w: d.w, h: d.h });

  title(s, "Never a number.", 9.35, 1.5, 3.4, 26);
  body(
    s,
    "A wrong guess answers with an 8-way arrow and a warmth band — enough to navigate by, never enough to triangulate with. Distance is computed internally in map tiles and stays there.",
    9.35, 2.3, 3.35, 1.7, 13
  );
  const bands = [
    [HIT, "HIT", "found it — the star"],
    [WARM, "WARM", "a few tiles out"],
    [MID, "MID", "same corner of the map"],
    [COLD, "COLD", "wrong side of the region"],
  ];
  bands.forEach(([hex, name, note], i) => {
    const y = 4.35 + i * 0.62;
    s.addShape("roundRect", { x: 9.35, y, w: 0.85, h: 0.42, rectRadius: 0.21, fill: { color: hex }, line: { color: INK, width: 1.5 } });
    s.addText(name, { x: 9.35, y: y + 0.06, w: 0.85, h: 0.3, fontFace: MONO, fontSize: 8.5, bold: true, color: "FFFFFF", align: "center", margin: 0 });
    s.addText(note, { x: 10.35, y: y + 0.07, w: 2.4, h: 0.3, fontFace: BODY, fontSize: 11, color: TEXT2, margin: 0 });
  });
}

/* ————————————————— 7 · PIPELINE ————————————————— */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  eyebrow(s, "06 — Content pipeline", 0.75, 0.6, 6);
  title(s, "373 locations, zero runtime calls.", 0.75, 1.05, 9, 30);
  body(
    s,
    "Everything is pulled, scraped, extracted, and verified at build time — then shipped as one static bundle. The live game never talks to a third party.",
    0.75, 2.0, 9.5, 0.7, 14
  );

  const steps = [
    ["POKÉAPI", "encounter tables and cries, filtered per pack to era-correct game versions"],
    ["BULBAPEDIA", "trainer rosters, the games' own map descriptions, in-game screenshots — never anime art"],
    ["EXTRACTION", "click regions read from the games' highlight maps — three computer-vision methods across five generations"],
    ["COVERAGE GATE", "the build fails if any location can't fill its hint ladder — no half-authored puzzles ship"],
    ["STATIC BUNDLE", "no backend, no accounts; state lives in localStorage on your device"],
  ];
  steps.forEach(([label, desc], i) => {
    const x = 0.75 + i * 2.45;
    card(s, x, 3.0, 2.25, 2.35, { fill: i === 4 ? PANEL2 : "FFFFFF" });
    s.addText("0" + (i + 1), { x: x + 0.2, y: 3.2, w: 0.8, h: 0.35, fontFace: DISPLAY, fontSize: 17, bold: true, color: BLUE, margin: 0 });
    s.addText(label, { x: x + 0.2, y: 3.58, w: 1.9, h: 0.3, fontFace: MONO, fontSize: 10, charSpacing: 1.5, color: INK, bold: true, margin: 0 });
    s.addText(desc, { x: x + 0.2, y: 3.95, w: 1.88, h: 1.25, fontFace: BODY, fontSize: 10, color: TEXT2, margin: 0, lineSpacingMultiple: 1.15 });
  });

  const calls = [
    ["3", "extraction methods — ring detection, dot colors, palette-cluster diff"],
    ["5", "sprite eras — a Sandshrew in Hoenn looks like 2003"],
    ["0", "API calls at runtime — everything bundled, attributed, takedown-ready"],
  ];
  calls.forEach(([n, note], i) => {
    const x = 0.75 + i * 4.1;
    s.addText(n, { x, y: 5.75, w: 0.85, h: 0.75, fontFace: DISPLAY, fontSize: 40, bold: true, color: INK, margin: 0 });
    s.addText(note, { x: x + 0.9, y: 5.92, w: 3.0, h: 0.75, fontFace: BODY, fontSize: 11, color: TEXT2, margin: 0, lineSpacingMultiple: 1.15 });
  });
}

/* ————————————————— 8 · REGION PACKS ————————————————— */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  eyebrow(s, "07 — Region packs", 0.75, 0.6, 6);
  title(s, "Five regions, one daily schedule.", 0.75, 1.02, 9, 28);

  const packs = [
    ["sinnoh", "Sinnoh", "67 LOCATIONS · D/P/PT", 216, 168],
    ["johto-kanto", "Johto & Kanto", "99 LOCATIONS · HGSS", 362, 145],
    ["hoenn", "Hoenn", "76 LOCATIONS · R/S/E", 257, 159],
    ["unova", "Unova", "77 LOCATIONS · BW + B2W2", 256, 168],
    ["kalos", "Kalos", "54 LOCATIONS · XY", 256, 168],
  ];
  packs.forEach(([file, name, label, iw, ih], i) => {
    const row = i < 3 ? 0 : 1;
    const col = i < 3 ? i : i - 3;
    const x = row === 0 ? 0.75 + col * 4.12 : 2.81 + col * 4.12;
    const y = row === 0 ? 1.85 + 0 : 4.55;
    card(s, x, y, 3.92, 2.5);
    const m = fit(iw, ih, 3.3, 1.62);
    s.addImage({ path: CONTENT("map/" + file + ".png"), x: x + (3.92 - m.w) / 2, y: y + 0.22, w: m.w, h: m.h });
    s.addText(name, { x: x + 0.25, y: y + 1.92, w: 3.4, h: 0.3, fontFace: DISPLAY, fontSize: 14.5, bold: true, color: INK, margin: 0 });
    s.addText(label, { x: x + 0.25, y: y + 2.2, w: 3.5, h: 0.24, fontFace: MONO, fontSize: 8.5, charSpacing: 1.5, color: TEXT3, margin: 0 });
  });
  s.addText(
    "Each pack ships its own era's sprites, cries, and screenshots — the region looks and sounds like its generation.",
    { x: 0.75, y: 7.12, w: 11.8, h: 0.3, fontFace: BODY, fontSize: 11.5, color: TEXT3, margin: 0 }
  );
}

/* ————————————————— 9 · STREAKS & PRACTICE ————————————————— */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  eyebrow(s, "08 — Retention without pressure", 0.75, 0.6, 6);
  title(s, "Streaks as a gym gauntlet.", 0.75, 1.05, 6.2, 28);
  body(
    s,
    "A daily streak climbs Sinnoh's gym-leader ladder — Roark travels with you at streak 1, Cynthia waits at the summit. Practice mode keeps its own run, per region or across every pack, and ends with a shareable result instead of a scold.",
    0.75, 1.95, 5.6, 1.6, 14
  );

  // the gauntlet
  const leaders = ["roark", "gardenia", "maylene", "wake", "fantina", "byron", "candice", "volkner", "cynthia"];
  card(s, 0.75, 3.95, 5.85, 1.9, { fill: PANEL2 });
  leaders.forEach((l, i) => {
    s.addImage({ path: CONTENT("leaders/" + l + ".png"), x: 1.05 + i * 0.6, y: 4.35, w: 0.52, h: 0.78 });
  });
  s.addText("STREAK 1", { x: 1.0, y: 5.25, w: 1.2, h: 0.25, fontFace: MONO, fontSize: 9, charSpacing: 1.5, color: TEXT3, margin: 0 });
  s.addText("THE SUMMIT", { x: 5.05, y: 5.25, w: 1.4, h: 0.25, fontFace: MONO, fontSize: 9, charSpacing: 1.5, color: TEXT3, align: "right", margin: 0 });
  eyebrow(s, "The gauntlet — companions by streak", 0.75, 6.05, 6);

  // practice picker shot (2720×1800)
  const p = fit(2720, 1800, 5.7, 3.77);
  card(s, 6.95, 1.5, p.w + 0.16, p.h + 0.16);
  s.addImage({ path: SHOTS("practice-picker.png"), x: 7.03, y: 1.58, w: p.w, h: p.h });
  eyebrow(s, "Practice — every region, its own run", 6.95, 1.5 + p.h + 0.35, 5.5);
}

/* ————————————————— 10 · CLOSING ————————————————— */
{
  const s = pres.addSlide();
  s.background = { color: "FFFFFF" };
  eyebrow(s, "09 — What it refuses to do", 0.75, 0.6, 8);
  title(s, "The values are visible in the interface.", 0.75, 1.05, 10.5, 30);

  const refusals = [
    ["NEVER MONETIZED", "No ads, no donations, no upsell. A fan project stays a fan project — the IP posture depends on it."],
    ["NO ACCOUNTS, NO BACKEND", "The app is static files. Your streak lives in your browser's localStorage and nowhere else."],
    ["DETERMINISTIC DAYS", "Same date, same puzzle, same hint picks, worldwide. There is no randomness in the daily path."],
    ["QUIET ANALYTICS", "No cookies, no tracking — anonymous page counts only, disclosed in the footer next to the attributions."],
  ];
  refusals.forEach(([label, desc], i) => {
    const x = 0.75 + (i % 2) * 6.05;
    const y = 2.2 + Math.floor(i / 2) * 1.85;
    card(s, x, y, 5.85, 1.6);
    s.addText(label, { x: x + 0.3, y: y + 0.28, w: 5.2, h: 0.3, fontFace: MONO, fontSize: 11.5, charSpacing: 2, color: BLUE, bold: true, margin: 0 });
    s.addText(desc, { x: x + 0.3, y: y + 0.68, w: 5.25, h: 0.8, fontFace: BODY, fontSize: 12.5, color: TEXT2, margin: 0, lineSpacingMultiple: 1.2 });
  });

  s.addImage({ path: SHOTS("wordmark.png"), x: 0.75, y: 6.35, w: 2.51, h: 0.49 });
  s.addText(
    [
      { text: "Play today's puzzle — pjeon18.github.io/pokemaps", options: { color: BLUE, bold: true } },
      { text: "   ·   github.com/pjeon18/pokemaps   ·   Paul Jeon, 2026", options: { color: TEXT3 } },
    ],
    { x: 3.5, y: 6.45, w: 9.0, h: 0.35, fontFace: BODY, fontSize: 12.5, margin: 0 }
  );
}

pres.writeFile({ fileName: path.join(__dirname, "PokeMAPs_Design_Process.pptx") }).then((f) => console.log("wrote", f));
