/**
 * Stage 3: merge cache + curated/ into the static content the app ships, for
 * every region pack.
 *
 *  - src/content/locations.json   per-location bundles (each tagged with its pack)
 *  - src/content/schedule.json    pre-shuffled daily answers across all packs
 *  - src/content/meta.json        pack metadata (name, map asset, grid)
 *  - public/content/**            sprites, cries, screenshots, trainer/NPC
 *                                 sprites, balls, leaders, town maps
 *
 * THE COVERAGE GATE (CLAUDE.md non-negotiable #3): any location with fewer
 * than 5 of 6 hint slots filled FAILS the build with a per-location report.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CACHE = path.join(ROOT, "pipeline", "cache");
const PUB = path.join(ROOT, "public", "content");
const OUT = path.join(ROOT, "src", "content");

const LAUNCH_EPOCH = "2026-07-20"; // puzzle #1
const SCHEDULE_DAYS = 730;
const SPACING = 45; // no repeat within this many days
const SEED = 20260720; // fixed forever — changing it reshuffles every past puzzle

const read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const exists = async (p) => fs.access(p).then(() => true, () => false);
const { packs } = await read(path.join(ROOT, "curated", "packs.json"));

// ————— terrain chips from cached location-area encounter methods —————
const METHOD_TERRAIN = {
  walk: "grass",
  "dark-grass": "grass",
  surf: "water",
  "old-rod": "water",
  "good-rod": "water",
  "super-rod": "water",
  "rock-smash": "rocks",
  headbutt: "trees",
  "cave-spots": "cave",
};
async function terrainFor(loc, versions) {
  const terrain = new Set();
  const slugs = loc.api ?? [loc.id, ...(loc.merge ?? [])];
  for (const slug of slugs) {
    let locData;
    try {
      locData = await read(path.join(CACHE, "location", `${slug}.json`));
    } catch {
      continue;
    }
    for (const area of locData.areas) {
      let a;
      try {
        a = await read(path.join(CACHE, "location-area", `${area.name}.json`));
      } catch {
        continue;
      }
      for (const emr of a.encounter_method_rates ?? []) {
        const inPack = emr.version_details?.some((v) => versions.has(v.version.name));
        if (!inPack) continue;
        const t = METHOD_TERRAIN[emr.encounter_method.name];
        if (t) terrain.add(t);
      }
    }
  }
  return [...terrain].sort();
}

// ————— assets: copy caches into public/content —————
await fs.rm(PUB, { recursive: true, force: true });
await fs.mkdir(PUB, { recursive: true });
async function copyDir(from, to) {
  await fs.mkdir(path.join(PUB, to), { recursive: true });
  let n = 0;
  for (const f of await fs.readdir(path.join(CACHE, from))) {
    if (f.endsWith(".bmp")) continue;
    await fs.copyFile(path.join(CACHE, from, f), path.join(PUB, to, f));
    n++;
  }
  return n;
}
// per-generation sprite folders (sprites/<gen-dir>/<id>.png)
let nSprites = 0;
for (const dir of await fs.readdir(path.join(CACHE, "sprites"))) {
  const full = path.join(CACHE, "sprites", dir);
  if (!(await fs.stat(full)).isDirectory()) continue;
  nSprites += await copyDir(`sprites/${dir}`, `sprites/${dir}`);
}
const nCries = await copyDir("cries-mp3", "cries");
const nTrainerSprites = await copyDir("trainer-sprites", "trainer-sprites");
for (const extra of ["leaders", "npc-sprites", "balls"]) {
  try {
    await copyDir(extra, extra);
  } catch {
    console.warn(`  ! ${extra}/ not in cache — run pipeline/pull-extra-sprites.mjs`);
  }
}
await fs.mkdir(path.join(PUB, "map"), { recursive: true });
for (const pack of packs) {
  await fs.copyFile(path.join(CACHE, "map", `${pack.id}.png`), path.join(PUB, "map", `${pack.id}.png`));
}

// ————— per-location bundles + coverage gate —————
const failures = [];
const report = [];
const locations = [];
const packsMeta = [];

for (const pack of packs) {
  const curated = await read(path.join(ROOT, "curated", pack.id, "locations.json"));
  const dialogue = (await read(path.join(ROOT, "curated", pack.id, "dialogue.json"))).lines;
  const youtube = (await read(path.join(ROOT, "curated", pack.id, "youtube.json"))).ids;
  const mapRegions = await read(path.join(ROOT, "curated", pack.id, "map-regions.json"));
  const encounters = await read(path.join(CACHE, `encounters-${pack.id}.json`));
  const bulba = await read(path.join(CACHE, `bulba-extract-${pack.id}.json`));
  const versions = new Set(pack.versions);
  const spriteDir = (pack.spriteGen ?? "").replace(/\//g, "-");
  packsMeta.push({ id: pack.id, name: pack.name, grid: mapRegions.grid, spriteDir });

  await fs.mkdir(path.join(PUB, "images"), { recursive: true });
  for (const loc of curated.locations) {
    const b = bulba[loc.id] ?? {};
    const enc = encounters[loc.id] ?? [];

    // screenshot: copy + normalize to JPEG q72
    let screenshot = null;
    if (b.imagePath) {
      const src = path.join(CACHE, b.imagePath);
      let destName = `${loc.id}${path.extname(b.imagePath)}`;
      let dest = path.join(PUB, "images", destName);
      try {
        await fs.copyFile(src, dest);
        const out = execFileSync("sips", ["-g", "pixelWidth", dest]).toString();
        const width = Number(out.match(/pixelWidth: (\d+)/)?.[1] ?? 0);
        if (width > 560) execFileSync("sips", ["--resampleWidth", "560", dest], { stdio: "ignore" });
        const jpgName = `${loc.id}.jpg`;
        const jpgDest = path.join(PUB, "images", jpgName);
        execFileSync(
          "sips",
          ["-s", "format", "jpeg", "-s", "formatOptions", "72", dest, "--out", jpgDest],
          { stdio: "ignore" }
        );
        if (jpgDest !== dest) await fs.rm(dest);
        screenshot = jpgName;
      } catch {
        screenshot = destName;
      }
    }

    const trainers = (b.trainers ?? []).map((t) => ({
      class: t.class,
      name: t.name,
      sprite: t.sprite.replace(/[^a-zA-Z0-9._-]+/g, "_"),
      team: t.team,
    }));
    // drop trainers whose class sprite never materialized
    const trainersOk = [];
    for (const t of trainers) {
      if (await exists(path.join(PUB, "trainer-sprites", t.sprite))) trainersOk.push(t);
    }

    let line = dialogue[loc.id] ?? null;
    if (line?.sprite && !(await exists(path.join(PUB, line.sprite)))) {
      line = { ...line, sprite: null };
    }

    const regions = mapRegions.regions[loc.id];
    if (!regions) failures.push(`[${pack.id}] ${loc.id}: NO MAP REGION`);

    // curated `note` fills in when the wiki has no mapdesc (rendered like one)
    const mapdesc = b.mapdesc ?? loc.note ?? null;
    let noteType = null;
    if (mapdesc) noteType = "mapdesc";
    else if (b.slogan) noteType = "slogan";
    else if (trainersOk.length > 0) noteType = "trainer";

    const slots = {
      h1_class: true,
      h2_audio: true,
      h3_overheard: !!line,
      h4_sprites: enc.length > 0,
      h5_note: noteType !== null,
      h6_image: !!screenshot,
    };
    const filled = Object.values(slots).filter(Boolean).length;
    report.push(`${filled}/6  [${pack.id}] ${loc.id}${enc.length === 0 ? "  (no wild Pokémon)" : ""}`);
    if (filled < 5)
      failures.push(`[${pack.id}] ${loc.id}: only ${filled}/6 hints (${JSON.stringify(slots)})`);

    const rects = regions ?? [];
    const cx = rects.length ? rects.reduce((s, r) => s + r[0] + r[2] / 2, 0) / rects.length : 0;
    const cy = rects.length ? rects.reduce((s, r) => s + r[1] + r[3] / 2, 0) / rects.length : 0;

    locations.push({
      id: loc.id,
      pack: pack.id,
      name: loc.name,
      class: loc.class,
      terrain: await terrainFor(loc, versions),
      encounters: enc,
      trainers: trainersOk,
      noteType,
      dialogue: line,
      slogan: b.slogan ?? null,
      mapdesc,
      screenshot,
      imageCredit: b.imageFile ? `Bulbapedia (${b.imageFile})` : null,
      themeYoutubeId: youtube[loc.id] ?? null,
      rects,
      center: [Number(cx.toFixed(2)), Number(cy.toFixed(2))],
    });
  }
}

// ————— schedule: fixed-seed shuffle cycles with spacing guarantee —————
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);
const ids = locations.map((l) => l.id);
const schedule = [];
while (schedule.length < SCHEDULE_DAYS) {
  const pool = [...ids];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 0; i < pool.length; i++) {
    const recent = schedule.slice(-SPACING);
    if (recent.includes(pool[i])) {
      const k = pool.findIndex((id, j) => j > i && !recent.includes(id));
      if (k > 0) [pool[i], pool[k]] = [pool[k], pool[i]];
    }
    schedule.push(pool[i]);
  }
}
schedule.length = SCHEDULE_DAYS;
for (let i = 1; i < schedule.length; i++) {
  const prev = schedule.lastIndexOf(schedule[i], i - 1);
  if (prev >= 0 && i - prev < SPACING) {
    failures.push(`schedule: ${schedule[i]} repeats after ${i - prev} days (day ${i})`);
    break;
  }
}

// ————— report + gate —————
console.log("— coverage —");
for (const r of report.sort()) console.log(" ", r);
console.log(
  `\n${locations.length} locations across ${packs.length} packs · ${nSprites} sprites · ${nCries} cries · ${nTrainerSprites} trainer sprites · schedule ${schedule.length} days (spacing ≥ ${SPACING})`
);
if (failures.length) {
  console.error("\nCOVERAGE GATE FAILED:");
  for (const f of failures) console.error("  ✗", f);
  process.exit(1);
}

await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, "locations.json"), JSON.stringify(locations));
await fs.writeFile(
  path.join(OUT, "schedule.json"),
  JSON.stringify({ launchEpoch: LAUNCH_EPOCH, spacing: SPACING, schedule })
);
await fs.writeFile(
  path.join(OUT, "meta.json"),
  JSON.stringify({
    packs: packsMeta,
    builtAt: new Date().toISOString(),
    attribution: {
      encounters: "PokéAPI",
      sprites: "PokéAPI sprite repository",
      cries: "Pokémon Showdown audio library",
      images: "Bulbapedia (CC BY-NC-SA 2.5)",
      trainers: "Bulbapedia (CC BY-NC-SA 2.5)",
    },
  })
);
console.log("\nwrote src/content/{locations,schedule,meta}.json ✓");
