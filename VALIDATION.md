# VALIDATION — traced against PRD §16 (2026-07-20)

> **Addendum 4 (2026-07-21 — Paul's playtest fixes + Kalos, CONCEPT D15):**
> **373 locations across 5 packs** (Sinnoh 67 · Johto & Kanto 99 · Hoenn 76 ·
> Unova 77 · Kalos 54). Fixed from playtest: anime/manga reveal images banned
> (Safari Zone/Route 7 verified clean or removed); Gen-5 encounter truncation
> (MAX_DEX bug) fixed — Unova Route 5 now 9 species; Unova regions redone via
> exact dot detection (Challenger's Cave verified at the Bulbapedia dot
> position, all towns labeled); Hoenn manual placements re-anchored (Petalburg
> at its true west-coast marker) and 9 missing landmarks added; roaming
> Plasma Frigate + Marine Cave dropped. Kalos: 51/54 regions auto (palette
> diff), Vaniville/Aquacorde/Azure Bay hand-anchored, X/Y encounters
> (maxDex 721), gen-vi sprites — played end-to-end in-browser (Lumiose →
> W/cold → Route 10 hit). Coverage gate passing; `tsc` + build clean.

> **Addendum 3 (same day — Hoenn + Unova packs, era sprites, speaker pass —
> CONCEPT D12–D14):** the game now has **four packs, 312 locations**: Sinnoh
> (67), Johto & Kanto (99), Hoenn (68, RSE gen-3), Unova (78, BW+B2W2 combined).
> Each pack ships era-correct Pokémon sprites. Re-verified: coverage gate passes
> (most 6/6, ~95 at 5/6); `tsc` + production build clean; **Hoenn** played
> end-to-end in a scoped practice run (map renders, `generation-iii-emerald`
> sprite + Hoenn route screenshot + RSE mapdesc all load 200, direction feedback
> correct, answer highlights on the RSE map); **Unova** combined map renders and
> scopes search/regions to the pack. Overheard speakers re-verified as real
> classes/named NPCs. Open (CURATION_TODO): 313-line dialogue QA, 14 approximate
> hand-placed Hoenn/Unova regions need a region-editor audit, some Hoenn route
> reveal screenshots are ORAS-era fallbacks.

> **Addendum 2 (same day — HGSS expansion, CONCEPT D10):** the game is now
> multi-region: Sinnoh (67) + Johto & Kanto (99, combined HGSS map, regions
> auto-extracted from Bulbapedia highlight maps). Re-verified: coverage gate
> 131×6/6 + 35×5/6 passing; `tsc` + build clean; a Johto & Kanto puzzle
> (Mt. Moon, day-offset 1) played end-to-end in-browser with correct
> cross-region direction feedback (Goldenrod → 27 tiles E cold; Cerulean →
> 4.5 W mid; hit), pack-scoped search and map, HGSS mapdesc on the reveal.
> The BMC link was removed (never-monetized posture restored). Open: dialogue
> QA now covers 166 lines; johto-kanto region audit deserves one full-map
> visual pass at high zoom (extraction is pixel-derived, so expected-correct).

> **Addendum (same day, post-review round — CONCEPT D8):** rename to PokeMAPs,
> light redesign, direction-only feedback (numbers removed from UI; bands
> unchanged internally), hint ladder reordered (Overheard → all-cries Field
> audio → Classification → Sprites → Town-map note → Photograph), name-search
> guessing added. Re-verified after the changes: coverage gate 57×6/6 + 10×5/6
> (≥5 rule passes), `tsc` + production build clean, search→select→confirm flow
> verified in-browser (search also closes the keyboard-path gap in criterion 2
> and the open item below), win and loss flows re-played, no runtime API calls.
> The dialogue-QA and YouTube-ID open items still stand.

Verified on the dev build (Chrome, desktop + 375×812 mobile viewport) after the
Tier 1 build. ✅ = verified · ⚠️ = partially verified / caveat.

| # | Acceptance criterion | Status | Evidence |
|---|---|---|---|
| 1 | Same date → same puzzle, hints, seeded picks everywhere | ✅ | Puzzle # derives from local-midnight day index into a fixed-seed precompiled `schedule.json`; every hint pick is `seededPick(puzzle, salt)` — no `Math.random()` in the daily path (practice mode is exempt by design, PRD §7). Cross-timezone check is by construction (local midnight ⇒ same calendar date ⇒ same index). |
| 2 | Every location clickable + nameable on mobile + desktop | ✅ | Real `pointerType: 'touch'` tap at 375 px selected the intended region (Jubilife City) with confirm sheet; hit-testing has 0.35-tile tap tolerance and smallest-region-wins for landmarks over routes; hover readout verified on desktop. All 67 regions audited visually via the `?debug` region-audit overlay against the labeled reference map (4 offsets found and corrected). |
| 3 | Coverage gate fails the build on < 5/6 hints | ✅ | `build-content.mjs` exits 1 with a per-location report; observed failing (verifier bug during development) and passing. Current content: **67/67 locations at 6/6** (via `nearby`-encounters + `mapdesc` fallbacks). |
| 4 | Dead/blocked YouTube ID never breaks the reveal | ✅ | Module renders only when `themeYoutubeId` is non-null (currently all null — IDs are open curation, `CURATION_TODO.md`); iframe `onError` → module removed. Reveal verified rendering with null IDs. |
| 5 | Distance/direction correct on sampled pairs | ✅ | Hand-checked: Twinleaf→Wayward Cave 9.1 tiles NE; Jubilife→Wayward Cave 6.1 NE; Canalave→Twinleaf 4.5 SE; Snowpoint→Twinleaf 19.5 S; Pastoria→Twinleaf W — all geographically correct. |
| 6 | Share string pastes into iMessage/Discord/X w/o spoilers | ⚠️ | String format implemented per PRD §8 (`Wherémon #N — 3/6` + band squares + bearing arrows, no location names); clipboard write verified in code path. Paste rendering in the three apps needs a manual check from a phone. |
| 7 | No runtime calls to PokéAPI/Bulbapedia | ✅ | Network log after full win + loss sessions: localhost-only (content bundles, fonts, sprites/cries/images from `public/content/`). |
| 8 | Streak/stats survive reload; practice never touches them | ✅ | Stats persist via zustand/persist; win: played 1 / won 1 / streak 1 / dist[3]++; loss: streak 0. Practice writes only the in-memory practice slot (verified in store code; `partialize` excludes it). |

## Known deviations from the PRD (documented in the PRD + CONCEPT D7)

- Distance bands rescaled to the 27×21-tile map (≤4 / ≤10 / beyond).
- Schedule spacing 45 days, not 90 (pool = 67 locations).
- Cries ship as mp3 from Pokémon Showdown (iOS Safari can't decode PokéAPI's
  .ogg); cry `loadedmetadata` verified with real duration in-browser.
- Hint 4 fallback = scraped in-game `mapdesc` → slogan (better than the
  originally-specced fallbacks; revives Paul's original "description" hint).

## Open items

- `CURATION_TODO.md`: dialogue wording QA (all 67 lines `verified:false`,
  labeled "Overheard in this area" as paraphrase cover), YouTube theme IDs
  (empty — music module hidden until filled), physical-device spot check of
  map tappability and the share-string paste test.
- Keyboard-only map guessing isn't possible yet (pointer-centric); a search/
  list fallback is a candidate for Tier 2.
- Lighthouse pass not yet run; bundle is 124 KB gz JS + per-puzzle lazy assets.
