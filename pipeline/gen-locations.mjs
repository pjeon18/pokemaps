/**
 * One-off scaffolder: draft a pack's curated/{pack}/locations.json by joining
 * Bulbapedia's per-location highlight-map filenames (the natural
 * "is-on-the-town-map" eligibility filter) to PokéAPI location slugs.
 *
 * Usage: node pipeline/gen-locations.mjs <pack> <highlightPrefix> <W> <H> <apiRegion> <bulbaRoutePrefix>
 * The output is a DRAFT — hand-curate classes, drop interiors, fix names.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [pack, prefix, W, H, apiRegion, routePrefix] = process.argv.slice(2);
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const UA = "Wheremon-content-pipeline/0.1 (free fan project; github.com/pjeon18)";

// non-guessable interiors / composites to exclude by filename keyword
const EXCLUDE =
  /(Pretty_Petal|Trick_House|Trainer_Hill|Battle_Tents|Battle_Frontier|Battle_Tower|Inside_of_Truck|Mirage_spot|ORAS|Soaring|Terra_Cave_Locations|Black_City_White_Forest|Join_Avenue|Pokéstar|Pokestar|Pokémon_World_Tournament|Musical|Royal_Unova|Gear_Station|Battle_Subway|Unity_Tower|Marvelous_Bridge|Entralink|Poké_Transfer|Medal|Nature_Sanctuary|Abyssal|Hidden_Grotto|Secret_Base|Nameless|Pathless|Trackless|Fabled|Gnarled|Crescent|Sealed_Chamber|Scorched_Slab|Island_Cave|Desert_Ruins|Ancient_Tomb|Artisan|Altering|Faraway|Southern_Island|Mirage_Island|Sea_Mauville|New_Mauville|Secret_)/i;

const CLASS_BY_KW = [
  [/Route/i, "route"],
  [/(City)/i, "city"],
  [/(Town)/i, "town"],
  [/(Cave|Tunnel|Chamber|Passage|Well|Den|Grotto)/i, "cave"],
  [/(Forest|Woods)/i, "forest"],
  [/(Mt|Mountain|Pass|Slab|Chimney|Pyre|Peak|Twist|Reversal)/i, "mountain"],
  [/(Lake|Bay|Sea|Falls|Bridge|Drawbridge|Storage|Tube|Marine)/i, "water"],
  [/(Island|Isle|Islet)/i, "island"],
  [/(Tower|Lighthouse|Castle|Frigate|Studios|Laboratory|Institute|Ranch|Shrine|Ruins|Resort|Garden|Park|Sewers|Station|Complex)/i, "building"],
];

async function apiSlugs() {
  const res = await fetch(`https://pokeapi.co/api/v2/region/${apiRegion}`, {
    headers: { "user-agent": UA },
  });
  const d = await res.json();
  return d.locations.map((l) => l.name);
}

const slugs = new Set(await apiSlugs());
const res = await fetch(
  `https://archives.bulbagarden.net/w/api.php?action=query&list=allimages&aiprefix=${prefix}_&ailimit=500&format=json&aiprop=size`,
  { headers: { "user-agent": UA } }
);
const files = (await res.json()).query.allimages.filter(
  (r) => r.name.endsWith("_Map.png") && r.width === Number(W) && r.height === Number(H)
);

const rp = routePrefix || `${apiRegion}-route-`;
const locations = [];
for (const f of files) {
  if (EXCLUDE.test(f.name)) continue;
  const base = f.name.replace(`${prefix}_`, "").replace("_Map.png", "");
  const name = base.replace(/_/g, " ").replace(/\bMt\b/, "Mt.");
  // slug candidates
  const norm = base.toLowerCase().replace(/_/g, "-").replace(/[^a-z0-9-]/g, "");
  const routeM = base.match(/Route_(\d+)/i);
  const cands = routeM
    ? [`${rp}${routeM[1]}`, `${apiRegion}-route-${routeM[1]}`, `${apiRegion}-sea-route-${routeM[1]}`]
    : [norm, `${apiRegion}-${norm}`, norm.replace(/-city|-town/, "")];
  const api = cands.find((c) => slugs.has(c));
  const cls = (CLASS_BY_KW.find(([re]) => re.test(base)) ?? [null, "landmark"])[1];
  const isSea = routeM && !api && slugs.has(`${apiRegion}-sea-route-${routeM[1]}`);
  locations.push({
    id: api ?? norm,
    name: routeM ? `Route ${routeM[1]}` : name,
    class: isSea ? "sea-route" : cls,
    bulba: name,
    bulbaMap: f.name,
    ...(api ? {} : { _NO_API: true }),
  });
}
locations.sort((a, b) => a.id.localeCompare(b.id));
const noApi = locations.filter((l) => l._NO_API).map((l) => l.id);
await fs.mkdir(path.join(ROOT, "curated", pack), { recursive: true });
await fs.writeFile(
  path.join(ROOT, "curated", pack, "locations.draft.json"),
  JSON.stringify({ locations }, null, 1)
);
console.log(`${pack}: ${locations.length} locations drafted, ${noApi.length} without API match:`, noApi);
