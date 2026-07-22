# PokeMAPs — Product Requirements Document v1

> **Name: PokeMAPs** (chosen by Paul, 2026-07-20; supersedes the working title
> "Wherémon" — the folder keeps the old slug). Check domain/trademark before
> anything public.

**One-liner:** A daily Wordle × GeoGuessr puzzle where you identify a location from
the Pokémon games by clicking the in-game town map, guided by six escalating hints
drawn from real game data.

**Status:** Approved for build (2026-07-20). Sinnoh-first MVP. This PRD is the
source of truth for product behavior; `CONCEPT.md` records the research and the
reasoning behind decisions; `../CLAUDE.md` is the build-session working context.

---

## 1. Problem & opportunity

Daily puzzle games (Wordle, Worldle, Squirdle) retain through a fixed ritual: one
shared puzzle, escalating information, a spoiler-free share string. The Pokémon
daily-puzzle space is crowded with *Pokémon-guessing* games (Squirdle, Pokedle,
PokeDoku) but **nobody owns location guessing with an interactive in-game map**.
The map is the differentiator and the nostalgia hook: clicking the Gen 4 town map
is itself the emotional payload for the 18–35 fan who grew up on these games.

Full competitive research and feasibility audit: `CONCEPT.md §2–3`.

## 2. Goals & non-goals

**Goals**
- A polished, free, static web game — portfolio-grade craft (motion, feel, mobile).
- A genuine daily habit loop: one global puzzle, streaks, a viral share string.
- Zero backend. Pure static site on GitHub Pages, all content precompiled.

**Non-goals (permanent)**
- Monetization of any kind (ads, subscriptions, donations). A Buy-Me-a-Coffee
  link was briefly added and **removed same day at Paul's direction**
  (2026-07-20) — the original never-monetized IP posture stands.
- Accounts or server-side state.

**Non-goals (for now)**
- Generations 7–9 (PokéAPI data gap + open-world games lack discrete clickable locations).
- Native mobile apps. Mobile web must be first-class instead.

## 3. Players

- **The rotation player** — plays Wordle → Connections → one more. Needs: <3 min sessions, zero onboarding friction, a share string worth posting.
- **The nostalgia fan** — played Gen 1–4 as a kid, follows Pokémon casually. Needs: the map to *feel* like the game; the reveal to deliver the memory (slogan, music).
- **The completionist** — deep-lore fan who wants to win on hint 1–2. Needs: early hints hard enough to be a flex; stats and streaks that prove it.

## 4. Core loop

1. Open the app → today's puzzle **#N** (same for every player worldwide).
2. Hint 1 is visible. Player pans/zooms the unlabeled town map; hovering (or
   touch-dragging) shows location names; clicking opens a confirm sheet
   ("Guess Route 203?").
3. Wrong guess → the guess row shows **distance + direction** feedback (§5) and
   the next hint unlocks (§6). Six guesses total.
4. Win or loss → the **reveal screen** (§9): location card, theme music, stats,
   share string.
5. Next puzzle at **local midnight** (Wordle convention).

## 5. Guess feedback

Every wrong guess converts to information:

- **Direction** — 8-way arrow from the guessed location toward the answer
  (↑ ↗ → ↘ ↓ ↙ ← ↖), shown as a big color-banded chip.
- **Distance is never displayed as a number** (Paul, 2026-07-20) — it's computed
  internally (Euclidean, map-tile units, region centroids) only to drive the
  band color, which is the sole "how close" signal.
- **Distance bands** (drive guess-row color, map tinting, and the share string):
  - 🟩 correct · 🟨 ≤ 4 tiles · 🟧 ≤ 10 tiles · 🟥 beyond
  - (Rescaled at build time: the DP town map is a 27×21-tile grid, max distance
    ≈ 34, so the PRD's original illustrative values were resized to fit.)
  - Band thresholds are named constants in `src/lib/distance.ts` — expect tuning
    after playtests.
- **Map memory** — already-guessed regions stay tinted with their band color, so
  the map becomes a heatmap of the player's own reasoning.

## 6. Hint ladder

Hints unlock hardest → easiest, one per wrong guess. **All randomized picks (which
cry, which sprites, which trainer, which line) are seeded by the puzzle number** so
every player sees identical hints — this is what makes results comparable and the
share string meaningful.

Ladder order tuned for difficulty (2026-07-20, second revision — Paul delegated
"most difficult and engaging"): vaguest evidence first, giveaway last. **Each
hint number is drawn as a Poké Ball tier** (Poké → Great → Ultra → Quick →
Dusk → Master), so the ladder reads as escalating capture power — the Master
Ball is the photograph, because it never fails.

| # | Ball | Visible | Hint | Source |
|---|------|---------|------|--------|
| 1 | Poké | at start | Classification: location class + terrain chips | PokéAPI |
| 2 | Great | after guess 1 | **Field audio:** the cries of **every** wild Pokémon in the area, as numbered play chips (deterministic shuffled order). If the area has no wild Pokémon, the hint says so — only 6 areas are that quiet, so the absence is itself a strong hint | Showdown mp3s via pipeline |
| 3 | Ultra | after guess 2 | **Overheard:** one NPC dialogue line, attributed by real in-game class/name (2026-07-20: "Youngster Joey", "Gym Leader Fantina", "Aqua Grunt" — real trainer classes and named NPCs, not invented nouns) with the speaker's sprite where one exists | Curated (manual) |
| 4 | Quick | after guess 3 | Sprites of three wild encounters (or the no-Pokémon message) | PokéAPI |
| 5 | Dusk | after guess 4 | **Town-map note:** the in-game map description (fallbacks: town slogan → trainer card) | Bulbapedia scrape |
| 6 | Master | after guess 5 | Screenshot of the area, heavily blurred (near-giveaway by design) | Bulbapedia infobox image |

**Coverage rule:** every location in the schedule must have **≥ 5 of 6** hint slots
filled; the content build **fails** otherwise (see §11). Fallbacks as built:
hint 4 (trainer) falls back to the **in-game town-map description** (`mapdesc`,
scraped from Bulbapedia infoboxes — a discovery that revived the original
"in-game description" hint) → town slogan; a location with no wild encounters
fills hints 2–3 from its curated `nearby` location, labeled "heard nearby".
With these fallbacks, all 67 Sinnoh locations currently pass at 6/6.

**Explicitly rejected as a hint: location theme music.** Rationale (YouTube ToS,
answer leakage, DMCA exposure of ripped audio) in `CONCEPT.md §4`. Music appears
post-solve only (§9).

## 7. Daily puzzle system

- **Puzzle number** = days since `LAUNCH_EPOCH`, rolling over at local midnight.
- **Answer** comes from a precompiled `schedule.json`: the pipeline shuffles the
  eligible location pool with a fixed seed and enforces **no repeat within 45
  days** (the pool is 67 locations, so the original 90-day figure was impossible;
  45 is the guarantee the build verifies). A pre-shuffled schedule beats hashing
  the date — it guarantees spacing.
- **Practice mode** — unlimited, random puzzles, clearly labeled, never affects
  streaks, produces no numbered share string.

## 8. Share & retention

Share string (clipboard, spoiler-free):

```
PokeMAPs #142 — 3/6
🟥↘ 🟧→ 🟩
<site url>
```

Stats in `localStorage` (no accounts): played, win %, current streak, max streak,
guess distribution. First-visit "how to play" modal, Wordle-style.

## 9. Post-solve reveal

The emotional payoff — where the nostalgia lands:

- **Location card:** name, town slogan (where one exists), the region map with the
  answer highlighted, the full encounter list, the featured trainer.
- **Theme music:** a **visible** YouTube embed (`youtube-nocookie.com`) of the
  location's theme via a curated `themeYoutubeId`. Plays only on user tap (satisfies
  autoplay policy). **Never hidden, covered, or resized below visibility** — hiding
  the player violates YouTube's API ToS, and this placement is post-answer so
  there's nothing to leak. `onError` hides the module entirely: **a dead video must
  never break the reveal.**
- Share button, countdown to next puzzle, streak display.

## 10. Map interaction

- Unlabeled Gen 4 town-map PNG + an **SVG overlay** of authored regions (rects/
  polygons in tile coordinates — the source maps are tile grids, so most locations
  are 1–3 rectangles).
- Hover / touch-drag → tooltip with location name. Click/tap → confirm sheet.
- Pan and pinch/wheel zoom with clamped min/max. **Mobile-first:** every scheduled
  location must be comfortably tappable at default zoom on a 375 px viewport.
- Region coordinates are authored with the internal **region editor** tool (§12),
  never hand-typed.

## 11. Content spec

Per-location record (compiled by the pipeline into static bundles):

```jsonc
{
  "id": "sinnoh-route-203",
  "name": "Route 203",
  "region": "sinnoh",
  "class": "route",              // town|city|route|cave|lake|building|island
  "terrain": ["grass"],          // derived from encounter methods
  "mapRegions": [{ "x": 21, "y": 47, "w": 6, "h": 2 }],   // tile coords
  "encounters": [{ "species": "starly", "id": 396 }, ...],
  "cryPool": [396, 399, 401],    // seeded pick per puzzle
  "trainers": [{ "class": "Youngster", "name": "Michael",
                 "team": [{ "species": "bidoof", "level": 5 }, ...] }],
  "dialogue": ["..."],           // hand-curated, 1+ lines
  "slogan": null,                // towns/cities only
  "screenshot": { "file": "route-203.png", "credit": "Bulbapedia" },
  "themeYoutubeId": "abc123"     // optional; reveal-only
}
```

**Pipeline rules** (detailed in `../CLAUDE.md`):
- Build-time only — the shipped app never calls PokéAPI or Bulbapedia at runtime.
- Scrapes are cached to disk, throttled ~1 req/s, descriptive User-Agent.
- The build emits a **coverage report** and fails if any scheduled location has < 5 hints.
- Attribution: Bulbapedia content is CC BY-NC-SA — credit line in the app footer
  and per-image credit on the reveal screen.

## 12. Screens & surfaces

1. **Game** — map + name-search bar + hint panel + guess rows (the app is
   essentially this one screen, done extremely well). The search bar (Paul,
   2026-07-20) is the guess path for players who know the name but not the
   pixel — and the keyboard path.
2. **How-to-play** modal (auto-opens on first visit).
3. **Stats** modal.
4. **Reveal** screen (§9).
5. **Practice mode** (same game screen, labeled).
6. **`?debug` panel** — jump to any puzzle #, force a date, reveal answer, reset stats.
7. **Region editor** — internal tool, not shipped in the production bundle: map PNG + click-drag rectangle authoring + name field + JSON export.

## 13. Scope tiers

- **Tier 1 (MVP):** Sinnoh only (67 guessable locations). Full loop: map guessing, hint ladder, direction feedback, daily schedule, share string, stats, reveal with music, `?debug`. ✅ SHIPPED 2026-07-20.
- **Tier 2:** ✅ SHIPPED 2026-07-20 — the **Johto & Kanto pack** (HGSS, 99 locations on the combined 362×145 town map; regions auto-extracted from Bulbapedia's per-location highlight maps — CONCEPT D10). The daily pool mixes all packs; the map shown is the answer's region (that's part of the puzzle's reveal, like Worldle's country silhouette). Sinjoh Ruins is excluded — it doesn't exist on the native town map.
- **Tier 3:** ✅ SHIPPED 2026-07-20 — **Hoenn** (RSE, gen-3 map/sprites/graphics, 68 locations) and **Unova** (BW + B2W2 combined on the one shared HGSS-era map, 78 locations — Bulbapedia has no separable BW-only base, so combined per Paul). All four packs now use **era-correct Pokémon sprites** (Sinnoh=Platinum, J&K=HGSS, Hoenn=Emerald, Unova=BW) and the daily pool mixes every pack. **312 locations total.**
- **Tier 4:** ✅ SHIPPED 2026-07-21 — **Kalos (XY)**: 54 locations, X/Y encounters, gen-vi sprites, text-only Overheard (3D era has no overworld trainer sprites). **373 locations across 5 packs.** Remaining tier ideas: hard mode, themed weeks, past-puzzle archive.
- **Out of scope:** Gen 7–9 (PokéAPI encounter gap; open-world map shape), accounts, monetization (permanent).

## 14. Success metrics (portfolio framing)

North star: **share rate** (share strings generated ÷ puzzles completed) — it
captures both puzzle quality and the growth loop. Supporting: completion rate,
average guesses (healthy target ~3.5–4.5 — too low means hints are too easy),
7-day return rate, content-error reports (guardrail: < 2% of sessions).

## 15. IP & legal posture

- Free forever; no ads, no monetization, no donations (a BMC link existed for
  a few hours on 2026-07-20 and was removed at Paul's direction), no data
  collection beyond localStorage.
- **No self-ripped assets.** Audio = Pokémon cries bundled as mp3 from Pokémon
  Showdown's audio library (PokéAPI's .ogg cries don't play on iOS Safari);
  music = YouTube embeds only, reveal screen only.
- Imagery wiki-sourced with attribution; sprites via PokéAPI's sprite repository.
- Footer disclaimer: fan project, not affiliated with Nintendo / Game Freak / The
  Pokémon Company; all Pokémon content © its owners.
- Takedown-ready: a contact route and willingness to remove anything on request.

## 16. Acceptance criteria

- [ ] Two devices in different timezones on the same calendar date get the same puzzle, hints, and seeded picks.
- [ ] Every scheduled location is clickable and hover-nameable on mobile Safari (375 px) and desktop.
- [ ] The content build fails loudly when a scheduled location has < 5 hints; the coverage report lists per-location hint fill.
- [ ] A dead/blocked `themeYoutubeId` never breaks or blanks the reveal screen.
- [ ] Distance/direction feedback is correct for a hand-checked sample of 10 location pairs.
- [ ] Share string pastes correctly into iMessage, Discord, and X without spoilers.
- [ ] No runtime network calls to PokéAPI or Bulbapedia (verify in the network tab).
- [ ] Streak/stats survive reload; practice mode never touches them.

## 17. Open questions

1. Final name + domain (see `CONCEPT.md §7`).
2. Distance-band thresholds — tune after first playtests.
3. Hard mode in Tier 1 or Tier 3? (Currently Tier 3.)
4. Should losses show the full hint ladder on the reveal? (Leaning yes — it teaches.)
