/**
 * Stage 1: pull location + encounter data from PokéAPI for every region pack,
 * then download the sprite + cry for every species that appears anywhere.
 *
 * Etiquette (CLAUDE.md non-negotiable #4): every response is cached to
 * pipeline/cache/ and never re-fetched; API calls are throttled ~1 req/s.
 * Safe to re-run — a warm cache makes it a no-op.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CACHE = path.join(ROOT, "pipeline", "cache");
const UA = "Wheremon-content-pipeline/0.1 (free fan project; github.com/pjeon18)";

let lastCall = 0;
async function throttled(ms) {
  const wait = Math.max(0, lastCall + ms - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

async function cachedFetch(url, cacheFile, { binary = false, throttleMs = 1000 } = {}) {
  const fp = path.join(CACHE, cacheFile);
  try {
    const buf = await fs.readFile(fp);
    return binary ? buf : JSON.parse(buf.toString("utf8"));
  } catch {
    /* cache miss */
  }
  await throttled(throttleMs);
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(fp), { recursive: true });
  await fs.writeFile(fp, buf);
  return binary ? buf : JSON.parse(buf.toString("utf8"));
}

const { packs } = JSON.parse(await fs.readFile(path.join(ROOT, "curated", "packs.json"), "utf8"));
const allSpecies = new Map(); // id -> name
const genSpecies = new Map(); // spriteGen -> Set(id) for era-correct sprites

for (const pack of packs) {
  const curated = JSON.parse(
    await fs.readFile(path.join(ROOT, "curated", pack.id, "locations.json"), "utf8")
  );
  const versions = new Set(pack.versions);
  const maxDex = pack.maxDex ?? 1025; // per-generation national dex ceiling
  const encountersByLocation = {};

  for (const loc of curated.locations) {
    const slugs = loc.api ?? [loc.id, ...(loc.merge ?? [])];
    const species = new Map();
    for (const slug of slugs) {
      let locData;
      try {
        locData = await cachedFetch(
          `https://pokeapi.co/api/v2/location/${slug}`,
          `location/${slug}.json`
        );
      } catch (e) {
        console.warn(`  ! [${pack.id}] location ${slug}: ${e.message}`);
        continue;
      }
      for (const area of locData.areas) {
        const areaData = await cachedFetch(area.url, `location-area/${area.name}.json`);
        for (const pe of areaData.pokemon_encounters) {
          const inPack = pe.version_details.some((v) => versions.has(v.version.name));
          if (!inPack) continue;
          const m = pe.pokemon.url.match(/\/pokemon\/(\d+)\//);
          if (!m) continue;
          const id = Number(m[1]);
          if (id > maxDex) continue;
          species.set(id, pe.pokemon.name);
        }
      }
    }
    const list = [...species.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([id, name]) => ({ id, name }));
    encountersByLocation[loc.id] = list;
    for (const s of list) allSpecies.set(s.id, s.name);
    if (pack.spriteGen) {
      if (!genSpecies.has(pack.spriteGen)) genSpecies.set(pack.spriteGen, new Set());
      for (const s of list) genSpecies.get(pack.spriteGen).add(s.id);
    }
    console.log(`[${pack.id}] ${loc.id}: ${list.length} species`);
  }

  await fs.mkdir(CACHE, { recursive: true });
  await fs.writeFile(
    path.join(CACHE, `encounters-${pack.id}.json`),
    JSON.stringify(encountersByLocation, null, 2)
  );
  console.log(`[${pack.id}] ${Object.keys(encountersByLocation).length} locations\n`);
}
console.log(`${allSpecies.size} unique species across all packs`);

// Cries (gen-agnostic, bundled).
let cryOk = 0,
  cryMiss = 0;
for (const [id] of allSpecies) {
  try {
    await cachedFetch(
      `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`,
      `cries/${id}.ogg`,
      { binary: true, throttleMs: 120 }
    );
    cryOk++;
  } catch (e) {
    cryMiss++;
    console.warn(`  ! cry #${id}: ${e.message}`);
  }
}
console.log(`cries: ${cryOk} ok, ${cryMiss} missing`);

// Era-correct Pokémon sprites: one folder per spriteGen, falling back to the
// default sprite when a versioned one is absent (e.g. a species predating a
// gen's regional dex quirk).
for (const [gen, ids] of genSpecies) {
  const dir = gen.replace(/\//g, "-");
  let ok = 0,
    fell = 0;
  for (const id of ids) {
    try {
      await cachedFetch(
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/${gen}/${id}.png`,
        `sprites/${dir}/${id}.png`,
        { binary: true, throttleMs: 90 }
      );
      ok++;
    } catch {
      try {
        await cachedFetch(
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
          `sprites/${dir}/${id}.png`,
          { binary: true, throttleMs: 90 }
        );
        fell++;
      } catch (e) {
        console.warn(`  ! sprite #${id} (${dir}): ${e.message}`);
      }
    }
  }
  console.log(`sprites ${dir}: ${ok} era + ${fell} fallback`);
}
