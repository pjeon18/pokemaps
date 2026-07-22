/**
 * Stage 2: scrape Bulbapedia via the MediaWiki API (never HTML), per region
 * pack: {{Trainerentry}} rosters (DP/Pt/HGSS sprites), infobox slogan +
 * mapdesc (segmented by generation superscripts — each pack picks its own
 * generation's text), and a location image (the pack's generation preferred).
 *
 * Etiquette: 1 req/s throttle, disk cache (re-runs are no-ops), descriptive
 * User-Agent. Bulbapedia content is CC BY-NC-SA — credited in the app.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CACHE = path.join(ROOT, "pipeline", "cache");
const API = "https://bulbapedia.bulbagarden.net/w/api.php";
const UA = "Wheremon-content-pipeline/0.1 (free fan project; github.com/pjeon18; contact pjeon1804@gmail.com)";

let lastCall = 0;
async function throttled() {
  const wait = Math.max(0, lastCall + 1000 - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

async function cached(cacheFile, fetcher, { binary = false } = {}) {
  const fp = path.join(CACHE, cacheFile);
  try {
    const buf = await fs.readFile(fp);
    return binary ? buf : JSON.parse(buf.toString("utf8"));
  } catch {
    /* miss */
  }
  const data = await fetcher();
  await fs.mkdir(path.dirname(fp), { recursive: true });
  await fs.writeFile(fp, binary ? data : JSON.stringify(data));
  return data;
}

async function apiJSON(params, cacheFile) {
  return cached(cacheFile, async () => {
    await throttled();
    const url = `${API}?${new URLSearchParams({ format: "json", ...params })}`;
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  });
}

async function download(url, cacheFile) {
  return cached(
    cacheFile,
    async () => {
      await throttled();
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return Buffer.from(await res.arrayBuffer());
    },
    { binary: true }
  );
}

async function imageURL(fileTitle) {
  const safe = fileTitle.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const d = await apiJSON(
    { action: "query", titles: `File:${fileTitle}`, prop: "imageinfo", iiprop: "url" },
    `imageinfo/${safe}.json`
  );
  const page = Object.values(d.query.pages)[0];
  return page.imageinfo?.[0]?.url ?? null;
}

function parseTrainerEntry(body) {
  const args = body.split("|").map((s) => s.trim());
  const positional = args.filter((a) => !a.includes("="));
  if (positional.length < 10) return null;
  const [sprite, klass, name] = positional;
  const team = [];
  for (let i = 5; i + 3 < positional.length; i += 5) {
    const dex = Number(positional[i]);
    const species = positional[i + 1];
    const level = Number(positional[i + 3]);
    if (!Number.isFinite(dex) || !species || !Number.isFinite(level)) break;
    team.push({ dex, species, level });
  }
  if (team.length === 0) return null;
  return { sprite, class: klass, name, team };
}

function extractTrainers(wikitext) {
  const out = [];
  const re = /\{\{[Tt]rainerentry\s*\|([\s\S]*?)\}\}/g;
  let m;
  while ((m = re.exec(wikitext))) {
    const t = parseTrainerEntry(m[1]);
    if (t) out.push(t);
  }
  return out;
}

function cleanWiki(v) {
  return v
    .replace(/<br\s*\/?\s*>/g, " ")
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Infobox values often inline several generations, each terminated by a
 * {{sup/N|GAMES}} marker. Pick the segment whose marker matches the pack's
 * generation tag; fall back to the first segment. */
function infoboxParam(wikitext, key, tagRe) {
  const m = wikitext.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n]+)`));
  if (!m) return null;
  const raw = m[1];
  const parts = [];
  const re = /\{\{sup\/\d+\|([^}]*)\}\}/g;
  let last = 0,
    mm;
  while ((mm = re.exec(raw))) {
    parts.push({ text: raw.slice(last, mm.index), tag: mm[1] });
    last = re.lastIndex;
  }
  if (parts.length === 0) return cleanWiki(raw) || null;
  const hit = parts.find((p) => tagRe.test(p.tag));
  return cleanWiki((hit ?? parts[0]).text) || null;
}

// era screenshot preference per pack (earlier = more preferred)
const IMG_PREF = {
  sinnoh: [/\bPt\.png$/i, /\bDPPt\b/i, /\bDP\.png$/i],
  "johto-kanto": [/\bHGSS\b/i, /\bHG\.png$|\bSS\.png$/i],
  hoenn: [/\bRSE\b/i, /\bE\.png$/i, /\bRS\.png$/i, /\bORAS\b/i],
  unova: [/\bB2W2\b/i, /\bBW2\b/i, /\bBW\b/i],
};
/** Prefer the pack's generation of screenshot; fall back to the infobox image,
 * then any image on the page, so every page with art yields something. */
function pickImage(wikitext, packId) {
  const files = new Set();
  const infoboxRaw = wikitext.match(/\|\s*image\s*=\s*([^\n|]+)/)?.[1]?.trim();
  if (infoboxRaw) files.add(infoboxRaw);
  const re = /(?:\[\[File:|image\d?\s*=\s*)([^|\]\n]+\.(?:png|jpg))/gi;
  let m;
  while ((m = re.exec(wikitext))) files.add(m[1].trim());
  // Never anime/manga/merch art — in-game screenshots only (Paul, 2026-07-21).
  const BANNED = /(Map|artwork|Concept|OD|VS|anime|Adventures|manga|Masters|Evolutions|GO|TCG|Duel|EP\d|AG\d|DP\d|BW\d{2,}|XY\d)/i;
  const list = [...files].filter((f) => !BANNED.test(f));
  const prefs = IMG_PREF[packId] ?? [];
  // any in-game era tag counts as a valid fallback, own-era preferred
  const ANY_GAME = /\b(RSE|RS|E|FRLG|DPPt|DP|Pt|HGSS|BW|B2W2|XY|ORAS|SM|USUM|interior|entrance)\b/i;
  const score = (f) => {
    for (let i = 0; i < prefs.length; i++) if (prefs[i].test(f)) return i;
    if (ANY_GAME.test(f)) return 40;
    if (f === infoboxRaw) return 50;
    return 60;
  };
  list.sort((a, b) => score(a) - score(b));
  const best = list.find((f) => score(f) <= 50);
  return best ?? null;
}

const { packs } = JSON.parse(await fs.readFile(path.join(ROOT, "curated", "packs.json"), "utf8"));
const trainerSprites = new Set();

for (const pack of packs) {
  const curated = JSON.parse(
    await fs.readFile(path.join(ROOT, "curated", pack.id, "locations.json"), "utf8")
  );
  const tagRe = new RegExp(pack.mapdescTag, "i");
  const extract = {};

  for (const loc of curated.locations) {
    let wikitext = "";
    try {
      const d = await apiJSON(
        { action: "parse", page: loc.bulba, prop: "wikitext", redirects: "1" },
        `bulba/${loc.id}.json`
      );
      wikitext = d.parse?.wikitext?.["*"] ?? "";
    } catch (e) {
      console.warn(`  ! [${pack.id}] ${loc.id}: ${e.message}`);
    }
    const trainers = extractTrainers(wikitext).filter((t) =>
      /Spr\s+(DP|Pt|HGSS|RS|FRLG|E|BW|B2W2)/i.test(t.sprite)
    );
    for (const t of trainers) trainerSprites.add(t.sprite);
    // curated per-location override beats the heuristic (e.g. pages that embed
    // other regions' counterparts and confuse the fallback)
    const imageFile = loc.imageFile ?? pickImage(wikitext, pack.id);
    let imagePath = null;
    if (imageFile) {
      try {
        const url = await imageURL(imageFile);
        if (url) {
          const ext = path.extname(new URL(url).pathname) || ".png";
          imagePath = `images/${loc.id}${ext}`;
          await download(url, imagePath);
        }
      } catch (e) {
        console.warn(`  ! [${pack.id}] image for ${loc.id}: ${e.message}`);
      }
    }
    extract[loc.id] = {
      slogan: infoboxParam(wikitext, "slogan", tagRe),
      mapdesc: infoboxParam(wikitext, "mapdesc", tagRe),
      trainers,
      imageFile,
      imagePath,
    };
    console.log(
      `[${pack.id}] ${loc.id}: ${trainers.length} trainers, slogan=${!!extract[loc.id].slogan}, mapdesc=${!!extract[loc.id].mapdesc}, img=${imageFile ?? "none"}`
    );
  }
  await fs.writeFile(
    path.join(CACHE, `bulba-extract-${pack.id}.json`),
    JSON.stringify(extract, null, 2)
  );
  console.log(`[${pack.id}] wrote bulba-extract-${pack.id}.json\n`);
}

// Trainer class sprites (unique, all generations seen).
for (const sprite of trainerSprites) {
  try {
    const url = await imageURL(sprite);
    if (url) {
      const safe = sprite.replace(/[^a-zA-Z0-9._-]+/g, "_");
      await download(url, `trainer-sprites/${safe}`);
    }
  } catch (e) {
    console.warn(`  ! trainer sprite ${sprite}: ${e.message}`);
  }
}
console.log(`${trainerSprites.size} trainer class sprites`);
