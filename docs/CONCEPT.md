# Wherémon — Concept & Ideation Record

This file records **where the idea came from, what the research found, and why each
major decision was made**. The PRD says *what to build*; this says *why*. Keep it
updated when a decision changes — it's the file that stops future sessions from
re-litigating settled questions.

---

## 1. Origin (Paul's pitch, 2026-07-20)

A daily Wordle/GeoGuessr-style guessing game for Pokémon towns and locations across
the mainline games (Gen 1–9), using PokéAPI. Original six proposed hints:

1. One random NPC dialogue line from the location
2. A snippet of the location's theme music
3. Pokémon/items found in the area
4. One random trainer's team from the area
5. The location's in-game description
6. A photo of the area from the game

Plus: guess by clicking the **in-game town map for that generation** (unlabeled),
with hover-to-preview location names, one new hint per guess.

Reference assets: labeled + unlabeled Gen 4 Sinnoh town maps (provided by Paul).

## 2. Market research (2026-07-20)

The daily Pokémon puzzle space is crowded, but every incumbent guesses *Pokémon*,
not *places*:

- [Squirdle](https://squirdle.fireblend.com/) — guess the Pokémon from type/gen/height/weight feedback. The genre-definer; years of sustained play.
- [Pokedle](https://pokedle.io/) — seven daily modes (image, cry, Pokédex entry, stats, drawing…). Its "route spawns" mode is the closest existing thing to our concept — but it's *guess the Pokémon from the route*, inverted from ours, and has no map.
- [PokeDoku](https://pokedoku.com/) — 3×3 grid trivia.
- Outside Pokémon: Worldle/Globle proved **map + distance/direction feedback** retains as a daily mechanic.

**The gap:** nobody combines an interactive in-game town map with location
guessing. The map is both the differentiator and the nostalgia hook. Squirdle-class
games also prove the survival posture: free, no ads, fan-made, tolerated for years.

## 3. Feasibility audit — what PokéAPI actually has

Checked against [PokéAPI v2 docs](https://pokeapi.co/docs/v2) and live probes
(2026-07-20):

| Original hint | In PokéAPI? | Finding |
|---|---|---|
| Wild Pokémon in area | ✅ | `location-area` → `pokemon_encounters`. **Probe: 128 Sinnoh locations.** Solid Gen 1–6; [Gen 7+ location-areas largely missing](https://github.com/PokeAPI/pokeapi/discussions/958) → hard scope constraint. |
| Items found in area | ❌ | No item→location mapping in the API. Dropped as a primary hint. |
| NPC dialogue | ❌ | Not in any API; Bulbapedia doesn't systematically store overworld lines. → manual curation (§5). |
| Trainer rosters | ❌ in PokéAPI | ✅ scrapeable from Bulbapedia wikitext. **Probe: Route 203 wikitext contains 29 structured `{{Trainerentry}}` templates** (class, name, team, levels) via the MediaWiki API. |
| In-game description | ⚠️ | Town slogans ("Fresh and Free!") exist on wiki town pages; routes have none. → slogan used on reveal + as fallback hint. |
| Theme music | ❌ + legal risk | See §4. |
| Location screenshots | ❌ in API | ✅ Bulbapedia location-page infobox images, scrapeable via the same MediaWiki API, attribution required. |
| *(Location connections/adjacency)* | ❌ | [Known PokéAPI gap](https://github.com/PokeAPI/pokeapi/issues/102) — why distance feedback uses map-tile geometry instead of route-graph hops. |

**Consequence:** the app is not "a PokéAPI client." It's a **build-time content
pipeline** merging one automated API pull + one automated wiki scrape + small
hand-curated datasets into static bundles. Runtime is pure static files.

## 4. Decision log

**D1 — Music is not a hint; it's the post-solve reward.** (2026-07-20, approved)
- Ripped OST audio is the single most DMCA'd Nintendo asset class → never self-host.
- YouTube-as-hint fails twice: the embed leaks the answer (title overlay +
  thumbnail; `modestbranding` deprecated), and hiding the player to make it
  audio-only violates YouTube's API ToS ("don't build the portfolio on a ToS
  violation").
- Resolution: **visible** YouTube embed on the reveal screen only, where there's
  nothing to leak and the player can be legitimately shown. Nostalgia lands at the
  win moment — arguably better game design than music-as-hint (real fans instantly
  recognize town themes anyway; it was a near-giveaway hint).

**D2 — The audio hint is a Pokémon cry.** (2026-07-20, approved)
- PokéAPI serves `cries` audio for every species → 100% API-sourced, zero legal
  exposure, guessable-but-not-giveaway. Keeps an audio moment in the ladder.

**D3 — Hybrid data collection.** (2026-07-20, approved — "whichever is more feasible")
- **Scripted:** PokéAPI pull (locations + encounters + cries); Bulbapedia MediaWiki
  API scrape (`{{Trainerentry}}` parse, infobox screenshots). Throttled ~1 req/s,
  disk-cached, one-time.
- **Manual:** NPC dialogue (~65 lines — one *chosen* line per location; curation is
  a feature, iconic lines beat random ones), town slogans (14), `themeYoutubeId`
  (~25 unique themes), QA pass on scraped data.
- **Tool-assisted manual:** map click-regions via a throwaway **region editor**
  (click-drag rectangles over the unlabeled map, export JSON) — never hand-typed
  coordinates. Bulbapedia's region page no longer ships an HTML imagemap (probed:
  0 `<area>` tags), so there's no coordinate shortcut.
- Estimate: ~1 day scripting + 2–3 evenings curation for a complete Sinnoh pack.

**D4 — Sinnoh-first, Gen 7–9 out of scope.** (2026-07-20, approved)
- Paul already has the labeled/unlabeled Sinnoh maps (labeled = authoring
  reference). ~65 guessable spots ≈ 2 months of dailies per region; Gen 1–4 ≈ a
  year+. Gen 7+ blocked by API gap + open-world map shape.

**D5 — Distance + direction feedback, precompiled shuffled schedule, local-midnight
rollover, one global daily + separate practice mode.** (2026-07-20, approved)
- Worldle-style feedback turns wrong guesses into information; tile-grid maps make
  it cheap. Pre-shuffled schedule (fixed seed, 90-day no-repeat) beats date-hashing.

**D6 — Model usage.** (updated 2026-07-20, Paul)
- Design and build run on **Fable**. Sonnet is reserved for the mechanical
  data-labor only: scraper runs, curation formatting, spreadsheet-to-JSON chores.

**D7 — Build-day resolutions.** (2026-07-20, during the Tier 1 build)
- **`mapdesc` discovery:** Bulbapedia infoboxes carry the in-game town-map
  description for 60/67 locations — the original "in-game description" hint is
  scrapeable after all. Used as the hint-4 fallback and on the reveal card;
  with it, coverage is 6/6 everywhere (no location needed exclusion).
- **Cries ship as mp3 from Pokémon Showdown's audio library** — PokéAPI's .ogg
  cries can't play on iOS Safari, and no local converter was available. Same
  in-game audio class as sprites; attributed in the footer.
- **Distance bands rescaled** to the real 27×21-tile map: 🟨 ≤ 4 · 🟧 ≤ 10 ·
  🟥 beyond (constants in `src/lib/distance.ts`).
- **Schedule spacing = 45 days**, not 90 (pool is 67 — 90 was impossible).
- **Map asset:** Bulbapedia's `Sinnoh_DP.png` (216×168 native, pixel-perfect
  upscale). Screenshots re-encoded as JPEG q72 (sips-written PNGs were ~10×
  larger). Region coordinates authored visually against Paul's labeled
  reference map, then verified with the in-app `?debug` region audit.
- **Design language: "survey chart room."** Nighttime cartography bureau — the
  pixel town map is the sole bright object (an illuminated survey plate);
  chrome is cold ink-blue and instrument-quiet; guess feedback reads as
  surveyor log entries (distance + bearing, IBM Plex Mono); color is semantic
  only (proximity bands + one interactive cyan). Archivo (display) / Inter
  (body). No pixel fonts — the map supplies the pixels. No emoji in chrome.
  *(Superseded same day by D8.)*

**D8 — Paul's review round.** (2026-07-20, after playing the first build)
- **Name: PokeMAPs** (see §7).
- **Design language flipped light: "field guide, turned up."** Mostly-white
  page, much bigger type throughout, chunky ink-outlined rounded cards with
  hard drop shadows (DS-menu energy), bolder and more fun. The map and the
  proximity band colors carry all the color; chrome stays white + ink + one
  interactive blue. Wordmark: "Poke" ink / "MAPs" blue.
- **Font:** Paul asked for **FOT-NewRodin** (the games' actual UI face) — it's
  a commercial Fontworks font that can't be bundled without a license, so the
  build uses **M PLUS Rounded 1c** (closest free relative, same rounded-gothic
  genre) with a one-line swap point in `tokens.css` if a license appears.
- **Direction-only feedback:** never display the tile distance; the 8-way
  arrow + band color are the only signals. Distance stays internal (bands).
- **Search bar:** guess by name (typeahead over the 67 locations) for players
  who know the place but not the pixel; doubles as the keyboard path.
- **Hint ladder reordered** (see PRD §6): Overheard → Field audio (now **all**
  cries in the area; encounter-less areas say "No Pokémon in this area", which
  is itself a hint — the `nearby`-borrowing fallback was removed) →
  Classification → Wild sprites → Town-map note → Photograph. The trainer card
  demoted to a town-map-note fallback.
- localStorage/sessionStorage keys and the dev handle renamed
  (`pokemaps`, `window.pokemapsStore`).

**D9 — Paul's second review round.** (2026-07-20)
- **Wordmark: PokéMAPs** (accent on the e).
- **Ladder re-tuned for difficulty** (Paul delegated the order): Classification
  → Field audio → Overheard → Wild sprites → Town-map note → Photograph, with
  **Poké Ball tiers as the hint numbers** (Poké → Great → Ultra → Quick → Dusk
  → Master; the Master Ball is the photograph — it never fails). Ball sprites
  from the PokéAPI item sprite repo.
- **Overheard speakers simplified** ("Swimmer", not "A swimmer treading
  water") + speaker sprites where available (trainer-class sprites from the
  scrape; named NPCs + all 13 leaders pulled by
  `pipeline/pull-extra-sprites.mjs`).
- **Streak gauntlet:** the daily streak walks the Sinnoh order — Roark (1) …
  Volkner (8), Elite Four (9–12), Cynthia (13+) — as a header avatar and a
  13-slot ladder in the stats modal.
- **Guessed-region map tints darkened** (fillOpacity 0.72/0.8) for legibility.
- **Buy Me a Coffee footer link** — conflicts with the original "never
  monetized" IP posture; risk flagged, Paul accepted, then **removed same day
  at Paul's direction (D10 round)**. The never-monetized posture stands.

**D10 — HeartGold/SoulSilver expansion.** (2026-07-20, Paul: "can we do this
for HGSS with all of the stuff we have?")
- **Multi-region packs**: curated/ and the whole pipeline parametrized by
  `curated/packs.json` (versions filter, per-generation mapdesc tag, image
  preference, region source). The daily pool mixes all packs; the map shown is
  the answer's pack.
- **One combined "Johto & Kanto" pack**, not two: the HGSS town map ships as
  the combined 362×145 canvas (Johto frame at x=0, Kanto at x+170px) — matches
  Paul's reference map, keeps seam locations (Victory Road, Tohjo Falls,
  Routes 26–28, Mt. Silver, Indigo Plateau) natural. 99 locations.
- **Click regions auto-extracted from Bulbapedia's per-location highlight
  maps** (`Johto_*_Map.png` / `Kanto_*_Map.png`): detect the highlight (bright
  crimson ring #e01840 / saturated orange fill #f49928 / revision-B pink
  #fb5161 — g−b≥70 separates fill orange from terrain tans), drop rects that
  recur across ≥4 files (fixed map features), cluster-merge fragments.
  94/99 pixel-perfect from the game's own map data; 5 hand-anchored
  (map-regions-manual.json). The base map asset is the per-pixel mode across
  the 4 combined-frame files.
- **Sinjoh Ruins dropped** — an off-map event location; it does not exist on
  the native HGSS town map (the fan reference map invented a cloud area).
- **99 new dialogue lines** authored (incl. "My Rattata is in the top
  percentage of all Rattata!" on Route 30), all verified:false pending QA.
- Curated `note` field added as mapdesc fallback (Pokéathlon Dome, Cliff Cave).
- Coverage: 131/166 locations at 6/6, rest 5/6, gate passing.

**D11 — Practice runs.** (2026-07-20, Paul)
- **Practice has its own streak** ("run"), persisted; every win extends it, one
  miss ends it. The header avatar walks the same leader gauntlet as the daily
  streak, labeled "run N".
- **Region picker**: the Practice button opens a chooser — Sinnoh, Johto &
  Kanto, or Both together; the choice persists as the default.
- **Streak-end popup** (practice loss with a run ≥1, or a daily streak
  breaking): the leader you reached, the count, a share string
  ("PokéMAPs practice run: 7 in a row — traveled with Candice"), and
  "Run it back" for practice.
- Feasibility ruled ON for future packs: **Hoenn/Emerald (94 highlight maps on
  the archives, 77 at a consistent 257×159) and Unova/BW+B2W2 (97 files, 90 at
  256×168)** — same pipeline, same auto-extraction; PokéAPI covers gen 3 and
  gen 5 encounters. Each ≈ one session (eligible table + ~95 dialogue lines).

**D12 — Overheard speakers use real in-game class/name.** (2026-07-20, Paul)
Replaced invented flavor nouns ("Vacationer", "Onlooker", "Stranger") with real
trainer classes and named NPCs across all packs — Gym Leaders by city,
Professors, Youngster Joey, Kurt, Cyrus/Jupiter/Cheryl/Mira/Riley/Buck/Barry,
Team grunts by class, etc. Generic-noun→class fallback for the rest. Lines stay
`verified:false` (wording QA still pending).

**D13 — Hoenn + Unova packs, and era-correct Pokémon sprites.** (2026-07-20, Paul)
- **Hoenn (RSE)** — gen-3 map/graphics per Paul. 68 locations; ruby/sapphire/
  emerald encounters; Spr_RS_* trainers; generation-iii/emerald sprites. 12
  locations hand-placed (their highlights exist only on a 352×223 revision that
  can't diff the 257 RSE base — CURATION_TODO §3).
- **Unova = one combined BW + B2W2 pack.** Paul asked to split IF the maps
  separate easily; they don't — every Bulbapedia Unova highlight shares the one
  256×168 B2W2-era canvas and there's no clean BW-only base. Combined, with
  black/white/black-2/white-2 encounters. 78 locations; gen-v/black-white sprites.
- **Era-correct sprites for every pack** (answers "gen-3 sprites and graphics"):
  per-pack `spriteGen` (Sinnoh=iv/platinum · J&K=iv/hgss · Hoenn=iii/emerald ·
  Unova=v/black-white) selects the versioned PokéAPI sprite folder;
  `spritePath(loc,id)` resolves per location's pack, default-sprite fallback.
- **Universal region extractor — palette-cluster diff** (new; replaced the
  color-heuristic for single-frame packs): every marker is a permanent pill/
  path that only RECOLORS when highlighted, so group files by background palette
  (revisions differ), build a per-group mode base, and a file's pixels that
  differ from its group base ARE the highlight — no per-gen color tuning.
  johto-kanto keeps its stitched-frame ring detector. Auto: 99 J&K + 59 Hoenn +
  76 Unova.
- Coverage: 312 locations, gate passing. Curated `note` field added as a
  mapdesc fallback for a few interiors.

**D14 — Gen 6 (Kalos/XY) ruled feasible, not built.** (2026-07-20) PokéAPI
serves X/Y encounters (Route 2 = 7) and Bulbapedia has 256×168 Kalos highlight
maps — the existing pipeline + palette-diff extractor handle it directly (≈ one
session). Gen 7+ stays out (encounter-data gap). Offered as the next pack.

**D15 — Quality round from Paul's playtest + Kalos.** (2026-07-21, Paul)
- **Reveal screenshots must be in-game** — anime/manga art leaked through the
  image picker (Safari Zone anime still, Route 7 Adventures manga panel).
  `pickImage` now bans anime/Adventures/manga/merch filenames outright and only
  falls back to files carrying a recognizable game-era tag; otherwise no image.
- **Gen-5 encounters were silently truncated**: the pull kept `MAX_DEX = 493`
  (a Gen 4 constant) — every Gen 5 species was dropped, emptying Unova Route 5
  etc. Now per-pack `maxDex` (386/493/649/721).
- **Unova regions redone with dot detection**: the palette-cluster diff was
  defeated by Unova's seasonal map variants (wrong giant rects, mislabeled
  Challenger's Cave). The BW/B2W2 (and XY) town maps mark the highlighted
  location with a small solid dot — #eb1c24 (towns) / #d84870 (routes) — whose
  centroid moves per file. Exact-color dot detection + recurring-rect dedupe
  replaces the diff for these packs (`dotColors` in packs.json).
- **Hoenn**: 9 missing landmarks added (Island Cave, Desert Ruins, Ancient
  Tomb, Sealed Chamber, Scorched Slab, New Mauville, Trick House, Mirage
  Island, Battle Frontier; Cave of Origin merged into Sootopolis); roaming
  Marine Cave dropped; the 9 approximate manual placements (Petalburg, Oldale,
  Littleroot, Routes 101–105/110) re-placed precisely against the base map's
  own markers at 6× zoom.
- **Kalos (XY) pack built** per Paul: 54 locations (52 auto via dot detection,
  Vaniville + Aquacorde manual), x/y encounters, generation-vi/x-y sprites,
  text-only Overheard speakers (no overworld trainer sprites in the 3D era).

## 5. Data collection plan (operational detail)

| Data | Method | Effort |
|---|---|---|
| Location list + encounters + cries | Script — PokéAPI one-time pull | ~1 hr code |
| Trainer rosters | Script — MediaWiki `action=parse`, regex `{{Trainerentry}}`, manual spot-check | ~half day |
| Screenshots | Semi-auto — infobox image URLs via same API, download once, attribute | ~1 hr + QA |
| Map click regions | Manual via region editor tool | ~half day incl. tool |
| NPC dialogue | Manual — ~65 rows from walkthroughs/text dumps | 1–2 evenings |
| Town slogans | Manual — 14 towns | ~30 min |
| YouTube theme IDs | Manual — ~25 unique themes (routes share) | ~1 hr |

Etiquette: build-side only, cache everything, ~1 req/s, descriptive UA. Bulbapedia
is CC BY-NC-SA → non-commercial + attribution (footer credit + per-image credit).

**D16 — Items opener, regional-dex gate, assists, map-first layout.**
(2026-09-10, Paul)
- **Hint 1 = items found there.** Classification chips (class + terrain) were
  too vague to reward anyone; the item list rewards real recall ("TM24 is on
  Route 212"). Source: Bulbapedia `{{Itemlist|sprite|where|D=yes|…|display=}}`
  rows filtered by per-pack `itemFlags`; TMs render as "TM46 Thief"; icons are
  PokéAPI bag sprites keyed by the row's sprite-name param. Filtered out as
  non-cues: Sinnoh Underground goods (Underground Man's tutorial gifts in
  Eterna) and B2W2 dust-cloud type-Gem sets identical across every Unova cave.
  TMs/HMs always make the 12-chip cut. An empty list is itself a hint ("Nothing
  to pick up here" — 26 locations), so the coverage slot always counts, like
  field audio. Fallout fixed along the way: three curated `bulba` titles were
  disambiguation pages (Safari Zone, Victory Road ×2), the Regi chambers and
  Embedded Tower lacked town-map notes, and four Unova/Hoenn spots lacked any
  in-game image.
- **Regional dex only.** PokéAPI location-area encounters include every
  post-National-Dex arrival (swarms, Poké Radar, dual-slot inserts, even NPC
  trades listed as encounters). Encounters are now intersected with the pack's
  regional dex (`regionalDex`: extended-sinnoh, updated-johto, hoenn,
  updated-unova, the three kalos dexes). 832 encounters dropped; sprite bundle
  1330→953, cries 562→540. Kalos lost nothing (XY's dex already covers it).
- **Assists.** `assist.preview` (photo of what you tap, default off) and
  `assist.arrows` (default on; off = band color only) — persisted, always
  visible under the map. Direction-only feedback (D-series) is untouched.
- **Map-first layout.** Desktop grid 1.65fr/1fr (map ≈ 62%), container up to
  1360px; on phones the map card bleeds to the screen edge.

**D17 — Overworld scenery and chunky buttons from the Speed Quiz.** (2026-11-11, Paul)
Paul asked for the Speed Quiz's look here. The game sits on one fixed forest
clearing: grass, trees down both sides and along the bottom, and one friendly
animated Black and White Pokémon in the bottom-right corner. On a phone the
cards cover the backdrop, so it stands at the bottom right of the page end
instead. It is picked with `seededPick`, so everyone sees the same one for the
same puzzle. Paul asked for that one Pokémon and nothing else. The header and
nav stay at the very top as a white bar, and the footer is a white card. A
first version put a scrolling route band above the header, but Paul found it
read as a second map that came apart from the fixed backdrop while scrolling,
so the whole scene now lives in one fixed layer. Every action button uses the shared `.btn` class: a white pill with an ink
outline and a hard lip that presses down when tapped. Primary actions are ink.
The scenery is decoration only and never part of the puzzle. The tiles are the
Pocket Tactics cut in `public/scene/`, and the sprites are in
`public/scene/mons/`. This revises the pinned "colour is semantic only" rule for the
page chrome, while the proximity bands keep their meaning.

## 6. Risks

- **Nintendo/TPC takedown** — mitigated by the §15 posture in the PRD (free, no
  ads, no ripped assets, disclaimer, takedown-ready). Residual risk accepted;
  Squirdle-class precedent is years of tolerance.
- **Hint difficulty balance** — cries may be too hard, screenshots too easy; the
  ladder order and distance bands are the tuning surface. Playtest before launch.
- **Content errors** (wrong trainer on a route, misattributed dialogue) — the
  coverage report + a spot-check pass; fans will report the rest quickly.
- **PokéAPI sprite/cry hotlinking** — bundle assets at build time; don't hotlink.

## 7. Naming

**PokeMAPs** — chosen by Paul 2026-07-20, superseding the working title
"Wherémon" (also considered: TownMapper, Routele, PokéWhere). The repo folder
keeps the `wheremon/` slug. TODO before anything public: domain availability +
a trademark sanity pass (the "Poke-" prefix raises the trademark surface —
worth a check, noted and accepted by the name choice).

## 8. Open questions

Tracked in PRD §17. Additions welcome here first, promoted to the PRD when decided.
