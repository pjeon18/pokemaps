/**
 * Stage 2b: gym-leader/E4/champion sprites (streak avatars), named-NPC
 * sprites (Overheard speakers), and Poké Ball item sprites (hint-number
 * design). Cached + throttled like everything else; missing files skip
 * gracefully (the UI renders nothing when a sprite is absent).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CACHE = path.join(ROOT, "pipeline", "cache");
const API = "https://bulbapedia.bulbagarden.net/w/api.php";
const UA = "Wheremon-content-pipeline/0.1 (free fan project; github.com/pjeon18)";

let last = 0;
async function throttled(ms = 1000) {
  const wait = Math.max(0, last + ms - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
}
async function cachedBin(url, cacheFile, ms = 1000) {
  const fp = path.join(CACHE, cacheFile);
  try {
    await fs.access(fp);
    return true;
  } catch {
    /* miss */
  }
  await throttled(ms);
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await fs.mkdir(path.dirname(fp), { recursive: true });
  await fs.writeFile(fp, Buffer.from(await res.arrayBuffer()));
  return true;
}
async function bulbaImageURL(fileTitle) {
  await throttled();
  const url = `${API}?${new URLSearchParams({
    format: "json",
    action: "query",
    titles: `File:${fileTitle}`,
    prop: "imageinfo",
    iiprop: "url",
  })}`;
  const res = await fetch(url, { headers: { "user-agent": UA } });
  const d = await res.json();
  return Object.values(d.query.pages)[0]?.imageinfo?.[0]?.url ?? null;
}
async function pullBulba(fileCandidates, dest) {
  try {
    await fs.access(path.join(CACHE, dest));
    return "cached";
  } catch {
    /* miss */
  }
  for (const f of fileCandidates) {
    try {
      const url = await bulbaImageURL(f);
      if (url) {
        await cachedBin(url, dest);
        return f;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

// Streak avatars, in badge/league order (Paul's list).
const LEADERS = [
  ["roark", "Spr DP Roark.png"],
  ["gardenia", "Spr DP Gardenia.png"],
  ["maylene", "Spr DP Maylene.png"],
  ["fantina", "Spr DP Fantina.png"],
  ["wake", "Spr DP Crasher Wake.png"],
  ["byron", "Spr DP Byron.png"],
  ["candice", "Spr DP Candice.png"],
  ["volkner", "Spr DP Volkner.png"],
  ["aaron", "Spr DP Aaron.png"],
  ["bertha", "Spr DP Bertha.png"],
  ["flint", "Spr DP Flint.png"],
  ["lucian", "Spr DP Lucian.png"],
  ["cynthia", "Spr DP Cynthia.png"],
];
for (const [key, file] of LEADERS) {
  const got = await pullBulba([file], `leaders/${key}.png`);
  console.log(`leader ${key}: ${got ?? "MISSING"}`);
}

// Named NPCs for Overheard speaker sprites.
const NPCS = [
  ["rowan", ["Spr DP Rowan.png", "Spr DP Professor Rowan.png", "Professor Rowan DP.png"]],
  ["cyrus", ["Spr DP Cyrus.png"]],
  ["mira", ["Spr DP Mira.png"]],
  ["cheryl", ["Spr DP Cheryl.png"]],
  ["riley", ["Spr DP Riley.png"]],
  ["buck", ["Spr DP Buck.png"]],
  ["jupiter", ["Spr DP Jupiter.png", "Spr Pt Jupiter.png"]],
  ["dawn", ["Spr DP Dawn.png"]],
  ["barry", ["Spr DP Barry.png"]],
];
for (const [key, files] of NPCS) {
  const got = await pullBulba(files, `npc-sprites/${key}.png`);
  console.log(`npc ${key}: ${got ?? "MISSING"}`);
}

// Every trainer-class sprite referenced by a dialogue speaker, across all
// packs (guarantees the Overheard hint's speaker sprite exists even when that
// class never appears in a scraped roster).
const { packs } = JSON.parse(await fs.readFile(path.join(ROOT, "curated", "packs.json"), "utf8"));
const dialogueSprites = new Set();
for (const pack of packs) {
  try {
    const dlg = JSON.parse(
      await fs.readFile(path.join(ROOT, "curated", pack.id, "dialogue.json"), "utf8")
    );
    for (const line of Object.values(dlg.lines)) {
      if (line.sprite?.startsWith("trainer-sprites/")) {
        dialogueSprites.add(line.sprite.replace("trainer-sprites/", "").replace(/\.png$/, ""));
      }
    }
  } catch {
    /* pack has no dialogue yet */
  }
}
let dOk = 0;
const dMiss = [];
for (const safe of dialogueSprites) {
  const dest = `trainer-sprites/${safe}.png`;
  try {
    await fs.access(path.join(CACHE, dest));
    dOk++;
    continue;
  } catch {
    /* miss */
  }
  const title = safe.replace(/_/g, " ") + ".png"; // File:Spr RS Youngster.png
  try {
    const url = await bulbaImageURL(title);
    if (url) {
      await cachedBin(url, dest);
      dOk++;
    } else dMiss.push(safe);
  } catch {
    dMiss.push(safe);
  }
}
console.log(`dialogue speaker sprites: ${dOk} ok${dMiss.length ? ", missing: " + dMiss.join(", ") : ""}`);

// Poké Ball item sprites (hint-number design), via the PokéAPI sprite repo.
const BALLS = ["poke-ball", "great-ball", "ultra-ball", "quick-ball", "dusk-ball", "master-ball"];
for (const ball of BALLS) {
  try {
    await cachedBin(
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${ball}.png`,
      `balls/${ball}.png`,
      200
    );
    console.log(`ball ${ball}: ok`);
  } catch (e) {
    console.log(`ball ${ball}: MISSING (${e.message})`);
  }
}
