# Curation TODO — human QA pass

The pipeline + best-effort curation gets the game fully playable across all four
region packs, but a few datasets need a human (or a Sonnet data-labor session)
before the content can be called fully accurate. **This is Sonnet-tier work per
the model split.** Paths are per-pack under `curated/{pack}/`.

## 1. Dialogue QA (`curated/{pack}/dialogue.json`)

All Overheard lines across every pack (Sinnoh 67, Johto & Kanto 100, Hoenn 68,
Unova 78 ≈ **313 lines**) are written from game knowledge and marked
`verified: false`. The in-app label attributes them by real in-game class/name
(e.g. "Youngster Joey", "Gym Leader Fantina", "Aqua Grunt") and they read as
paraphrase-safe, so this isn't a launch blocker — but each should be checked
against a game text dump (the pret/pokeemerald etc. decomps, or Bulbapedia
quotes) and corrected or confirmed. Flip `verified: true` as you go.

## 2. YouTube theme IDs (`curated/{pack}/youtube.json`)

Empty for every pack. For each location find the official-ish theme upload and
add `"<location-id>": "<videoId>"`. Never guess an ID. The reveal hides the
music module when the ID is null, so partial coverage is fine.

## 3. Map-region audit (region editor + `?debug` overlay)

- **Sinnoh, Johto & Kanto:** auto-extracted + spot-checked; solid.
- **Hoenn:** 59 regions auto-extracted from Bulbapedia highlight maps (verified
  visually against the base map — good). **12 hand-placed in
  `curated/hoenn/map-regions-manual.json` are APPROXIMATE** and need a
  region-editor pass: `littleroot-town`, `oldale-town`, `petalburg-city`,
  routes `101`–`105`, `110` (their Bulbapedia highlights exist only on a
  different 352×223 map revision that can't diff against the 257 RSE base), plus
  `marine-cave`.
- **Unova:** redone via exact dot detection (2026-07-21) — verified correct.
- **Kalos:** auto rects carry a measured calibration shift (−0.63, +0.69 tiles;
  the XY highlight glyph anchors bottom-left — see packs.json `regionShift`),
  verified against the map's own node circles. Manual (final frame):
  Vaniville, Aquacorde, Azure Bay, Lumiose (oversized on purpose), Route 7
  (its highlight file is corrupt for diffing).

## 4. Screenshot era (minor, Hoenn)

Some Hoenn route reveal screenshots fall back to ORAS-era images when no RSE
screenshot exists on Bulbapedia (the map/sprites/cries are all gen-3). Cosmetic,
reveal-screen only. Swap to RSE captures if desired.

## 5. Deferred: physical-device spot check + share-string paste test.
