# CLAUDE.md — PokéMAPs

You (Claude) are working on **PokéMAPs**, a daily Pokémon location-guessing web
game — Wordle × GeoGuessr on the in-game town maps. (Folder keeps the old
working-title slug `wheremon`.) Read this fully at session start. This file is
the working context; product truth lives in the docs below.

## Authoritative docs (read before building)

1. `docs/WHEREMON_PRD.md` — **source of truth for product behavior**: game
   rules, hint ladder, feedback, tiers, acceptance criteria.
2. `docs/CONCEPT.md` — research + **decision log D1–D15**. Do not re-litigate
   settled decisions. If a request conflicts with one, flag it, don't build.
3. `VALIDATION.md` — acceptance-criteria trace + dated addendums.
4. `CURATION_TODO.md` — open data-QA work (Sonnet-tier per the model split).

**Model split (Paul's decision):** design and build sessions run on **Fable**;
only mechanical data-labor (scraper runs, dialogue QA, spreadsheet-to-JSON)
runs on Sonnet.

## What this is / isn't

- A **free, static, no-backend** web game. localStorage only. GitHub Pages.
- **Never monetized** — no ads, no donations (a BMC link was added and removed
  same day at Paul's direction; don't re-add). The IP posture depends on it:
  fan project, all Pokémon content © Nintendo/Game Freak/TPC, attribution in
  the footer, takedown-ready.
- **No self-ripped assets.** Cries = mp3 from Pokémon Showdown's library
  (PokéAPI's .ogg fails on iOS Safari). Music = visible YouTube embeds on the
  reveal screen only (never hidden — YouTube ToS). Images = Bulbapedia
  (CC BY-NC-SA), **in-game screenshots only — never anime/manga** (enforced in
  the scraper's `pickImage`). Everything bundled at build time, never hotlinked.

## The game (current state)

**Five region packs, 373 locations**, mixed into one daily schedule:
Sinnoh 67 (DPPt) · Johto & Kanto 99 (HGSS, combined 362×145 map) ·
Hoenn 76 (RSE) · Unova 77 (BW+B2W2 combined) · Kalos 54 (XY).
Each pack ships **era-correct Pokémon sprites** (`spriteGen` per pack).

- **Hint ladder** (hardest→giveaway, ball-tier numbered Poké→Master):
  Classification → Field audio (ALL cries in the area; "No Pokémon in this
  area" when empty — that's a hint, not a bug) → Overheard (real in-game
  class/name speakers + sprite) → Wild sprites → Town-map note → Photograph
  (blurred until game end).
- **Feedback is direction-only**: 8-way arrow + proximity band color
  (never show tile numbers). Distance computed internally in tile units.
- **Determinism**: same date → same puzzle + same seeded hint picks worldwide;
  no `Math.random()` in the daily path. Practice mode is exempt.
- **Practice**: region picker (each pack or all), its own persisted streak
  ("run"), streak-end popup with the gym-leader gauntlet avatar
  (Roark→Cynthia by streak level) and a share string.
- `?debug` (sessionStorage-persistent): day offset, reveal answer,
  **region audit overlay**, practice, reset. Dev handle: `window.pokemapsStore`.
  Persist keys: `pokemaps`, `pokemaps-debug`, `pokemaps-dayoffset`.

## Design language (pinned — revise deliberately in `src/styles/tokens.css`)

"Field guide, turned up": white page, very large **M PLUS Rounded 1c** type
(free stand-in for FOT-NewRodin, which is commercial — one-line swap in
tokens.css if licensed), chunky ink-outlined cards with hard drop shadows
(DS-menu energy). Color is semantic only: proximity bands + one interactive
blue; the pixel maps carry all other color. Wordmark: Poké (ink) MAPs (blue).
IBM Plex Mono for small labels. No pixel fonts. No emoji in UI chrome
(share-string emoji are fine — that's clipboard text).

## Architecture

React 18 + TS + Vite + Tailwind + Zustand + Framer Motion. Single screen.

- `src/store/useGameStore.ts` — one persisted Zustand store; daily/practice
  slots, stats, streaks, streak-end popup state. Game invariants live here.
- `src/lib/` — `seed.ts` (puzzle number, schedule lookup, seeded picks),
  `distance.ts` (bands + bearings; band thresholds are THE tuning constants),
  `share.ts`, `content.ts` (typed content + `spritePath()` for era sprites),
  `leaders.ts` (streak gauntlet), `assets.ts` (base-path-safe URLs — always
  use `asset()`, never hard-code `/content/...`).
- `src/components/` — `MapPicker` (pan/zoom, pointer hit-testing: EXACT
  containment beats padded proximity, then smallest-area wins), `SearchBar`
  (pack-scoped name guessing), `HintPanel`, `GuessLog`, `RevealPanel`,
  `Modals` (HowTo/Stats/PracticePicker/StreakEnd), `DebugPanel`.
- `src/content/` — **generated** by the pipeline; never hand-edit.
- `public/content/` — **generated** assets (maps, sprites per gen, cries,
  images, trainer/NPC/leader/ball sprites); never hand-edit.

## Content pipeline (build-time only; the shipped app makes ZERO API calls)

All scripts cache to `pipeline/cache/` (gitignored, reproducible), throttle
~1 req/s to external hosts, and are safe to re-run (warm cache = no-op).

Order: `node pipeline/pull-pokeapi.mjs` → `pull-cries-mp3.mjs` →
`scrape-bulbapedia.mjs` → `pull-extra-sprites.mjs` → `pull-maps.mjs` →
`build-content.mjs`.

- **packs.json** (`curated/packs.json`) drives everything per pack: encounter
  `versions`, **`maxDex`** (per-generation dex ceiling — a global 493 once
  silently emptied all Gen 5 encounters; don't reintroduce), `mapdescTag`
  (which generation's infobox text to keep), `spriteGen`, region-extraction
  method, optional `regionShift`.
- **Click-region auto-extraction** (`pull-maps.mjs`) from Bulbapedia's
  per-location highlighted town maps, three methods:
  - `johto-kanto`: stitched-frame crimson-ring/orange-fill detection
    (Johto 212w at x=0, Kanto 192w at x+170, 362w seam files as-is).
  - `dotColors` packs (Unova): exact moving-dot colors (#eb1c24 towns,
    #d84870 routes) + recurring-rect dedupe.
  - default (Hoenn, Kalos): **palette-cluster diff** — group files by
    background palette, per-group per-pixel-mode base, diff = the recolored
    highlight. Kalos additionally has `regionShift` (−0.63,+0.69) applied to
    NON-route classes only (the town glyph anchors bottom-left; routes
    highlight the actual path and must NOT be shifted — Paul calibrated this).
  - Manual overrides per pack in `curated/{pack}/map-regions-manual.json`
    (authored in the FINAL frame). NEVER hand-edit the generated
    `map-regions.json` (except Sinnoh, which is fully hand-authored).
- **Coverage gate**: `build-content.mjs` FAILS if any location has <5 of 6
  hint slots. Fallback chains: hint-5 note = mapdesc → slogan → trainer →
  curated `note` field; roaming/event spots (Plasma Frigate, Marine Cave,
  Sinjoh Ruins) are NOT locations — don't add them back.
- Curated per pack (`curated/{pack}/`): `locations.json` (eligibility, API
  slugs, merges, `imageFile`/`note` overrides), `dialogue.json` (one Overheard
  line per location, real in-game class/name speakers, ALL `verified:false`
  pending QA), `youtube.json` (empty — never guess video IDs), map-region
  manuals.

## Commands

- `npm install` · `npm run dev` (port from `.claude/launch.json`: 5201) ·
  `npm run build` (tsc + vite) · `npm run preview`
- Region editor (dev-only): `/tools/region-editor/` on the dev server
  (Sinnoh-frame; other packs are auto-extracted).
- Before declaring anything done: `npx tsc -b`, `npm run build`, verify in the
  browser (Paul reviews by looking at the running app — screenshot changes),
  update `VALIDATION.md` if acceptance behavior changed.

## Gotchas

- **Shell cwd resets between Bash calls** in this environment — `cd` to the
  project root in every command that touches relative paths.
- `pgrep -f` matches your own watcher's command line — pattern on `.mjs`
  filenames when polling for pipeline processes.
- PokéAPI location-area data ends at **Gen 6** — Gen 7+ packs are off the
  table until that changes.
- Bulbapedia location pages sometimes embed OTHER regions' counterparts
  (Safari Zone) or only anime art (Lacunosa) — use the curated `imageFile`
  override, don't loosen the picker.
- Sinnoh's hand-authored regions live in `curated/sinnoh/map-regions.json`
  WITH its grid header; every other pack's generated file is disposable.
- Two players in different timezones can briefly be on different puzzle
  numbers (local-midnight rollover) — correct behavior, not a bug.
- Deploy: GitHub Pages workflow builds with `BASE_PATH="/<repo>/"`; keep all
  public-asset refs going through `asset()`.
