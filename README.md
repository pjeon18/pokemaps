# PokeMAPs

A free daily puzzle: identify a Pokémon world location by clicking the in-game
Sinnoh town map, guided by six escalating hints from real game data. Wordle ×
GeoGuessr. Fan-made; not affiliated with Nintendo / Game Freak / The Pokémon
Company. Never monetized.

Docs: [`docs/WHEREMON_PRD.md`](docs/WHEREMON_PRD.md) (product truth) ·
[`docs/CONCEPT.md`](docs/CONCEPT.md) (research + decision log) ·
[`CLAUDE.md`](CLAUDE.md) (working context) ·
[`CURATION_TODO.md`](CURATION_TODO.md) (open data QA).

## Run

```bash
npm install
npm run dev        # http://localhost:5173 — add ?debug for the demo panel
npm run build      # tsc + vite build → dist/
npm run preview
```

`?debug` (persists for the session): day-offset to any puzzle, reveal answer,
region-audit overlay, practice puzzle, reset. Dev console handle:
`window.pokemapsStore`.

## Content pipeline (build-time only; the shipped app makes zero API calls)

```bash
npm run content        # full: PokéAPI pull → Bulbapedia scrape → merge
npm run content:build  # merge only (fast; run after editing curated/*)
node pipeline/pull-cries-mp3.mjs   # iOS-safe cry audio (part of full pull)
```

Everything is cached in `pipeline/cache/` (throttled ~1 req/s on first run;
re-runs are no-ops). The merge step **fails** if any location has < 5 of 6
hints — that's the coverage gate, not a warning.

Hand-authored data lives in `curated/`: eligible locations + PokéAPI sub-area
collapse table, one dialogue line per location, YouTube theme IDs
(reveal-screen only), and the map click-regions. Edit regions visually at
`/tools/region-editor/` on the dev server (dev-only; excluded from builds).

## Credits

Encounter data via [PokéAPI](https://pokeapi.co). Images, trainer rosters, and
map descriptions via [Bulbapedia](https://bulbapedia.bulbagarden.net)
(CC BY-NC-SA). Cries via Pokémon Showdown's audio library. Pokémon content ©
Nintendo / Game Freak / The Pokémon Company; this is a non-commercial fan
project, takedown-ready on request.
