/**
 * Stage 1b: iOS Safari can't decode the .ogg cries from PokéAPI, so bundle
 * mp3 cries from Pokémon Showdown's audio library instead (same in-game
 * audio, attributed in the app footer). Cached + throttled like everything.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CACHE = path.join(ROOT, "pipeline", "cache");
const UA = "Wheremon-content-pipeline/0.1 (free fan project; github.com/pjeon18)";

// PokéAPI species name -> Showdown cry filename
function showdownName(apiName) {
  return apiName
    .replace(
      /-(plant|altered|land|normal|origin|sky|east|west|red-striped|blue-striped|average|50|incarnate|ordinary|standard|aria|male|female)$/,
      ""
    )
    .replace(/nidoran-f/, "nidoranf")
    .replace(/nidoran-m/, "nidoranm")
    .replace(/[^a-z0-9]/g, "");
}

const species = new Map();
for (const f of await fs.readdir(CACHE)) {
  if (!/^encounters-.*\.json$/.test(f)) continue;
  const enc = JSON.parse(await fs.readFile(path.join(CACHE, f), "utf8"));
  for (const list of Object.values(enc)) for (const s of list) species.set(s.id, s.name);
}

let last = 0,
  ok = 0,
  miss = [];
for (const [id, name] of species) {
  const fp = path.join(CACHE, "cries-mp3", `${id}.mp3`);
  try {
    await fs.access(fp);
    ok++;
    continue;
  } catch {
    /* miss */
  }
  const wait = Math.max(0, last + 250 - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const url = `https://play.pokemonshowdown.com/audio/cries/${showdownName(name)}.mp3`;
  try {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, Buffer.from(await res.arrayBuffer()));
    ok++;
  } catch (e) {
    miss.push(`${name} (${e.message})`);
  }
}
console.log(`cries-mp3: ${ok} ok, ${miss.length} missing${miss.length ? ": " + miss.join(", ") : ""}`);
