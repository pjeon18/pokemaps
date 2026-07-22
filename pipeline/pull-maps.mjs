/**
 * Stage 2c: town maps + click regions.
 *
 * Sinnoh: downloads the DP town map (regions stay hand-authored in
 * curated/sinnoh/map-regions.json).
 *
 * Johto/Kanto (regionSource: "auto"): Bulbapedia archives host a per-location
 * HGSS town map with that location HIGHLIGHTED. We download all of them,
 * derive the clean base map as the per-pixel MODE across the set, then diff
 * each highlight against the base — giving pixel-perfect click regions with
 * zero hand-tracing. Locations without a highlight file come from
 * curated/{pack}/map-regions-manual.json.
 *
 * PNG decode/encode goes through `sips` (macOS) via BMP as an intermediate.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CACHE = path.join(ROOT, "pipeline", "cache");
const API = "https://bulbapedia.bulbagarden.net/w/api.php";
const UA = "Wheremon-content-pipeline/0.1 (free fan project; github.com/pjeon18)";
const TILE = 8;

let lastCall = 0;
async function throttled() {
  const wait = Math.max(0, lastCall + 1000 - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}
async function cachedDownload(url, cacheFile) {
  const fp = path.join(CACHE, cacheFile);
  try {
    await fs.access(fp);
    return fp;
  } catch {
    /* miss */
  }
  await throttled();
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await fs.mkdir(path.dirname(fp), { recursive: true });
  await fs.writeFile(fp, Buffer.from(await res.arrayBuffer()));
  return fp;
}
async function imageURL(fileTitle) {
  const safe = fileTitle.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const fp = path.join(CACHE, "imageinfo", `${safe}.json`);
  let d;
  try {
    d = JSON.parse(await fs.readFile(fp, "utf8"));
  } catch {
    await throttled();
    const url = `${API}?${new URLSearchParams({
      format: "json",
      action: "query",
      titles: `File:${fileTitle}`,
      prop: "imageinfo",
      iiprop: "url",
    })}`;
    const res = await fetch(url, { headers: { "user-agent": UA } });
    d = await res.json();
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, JSON.stringify(d));
  }
  return Object.values(d.query.pages)[0]?.imageinfo?.[0]?.url ?? null;
}

/** PNG → {w, h, pixels: Uint32Array (0xRRGGBB)} via sips + BMP parse. */
function decodePNG(pngPath) {
  const bmpPath = pngPath.replace(/\.png$/, ".bmp");
  execFileSync("sips", ["-s", "format", "bmp", pngPath, "--out", bmpPath], { stdio: "ignore" });
  const buf = require_fs().readFileSync(bmpPath);
  const dataOffset = buf.readUInt32LE(10);
  const w = buf.readInt32LE(18);
  const hRaw = buf.readInt32LE(22);
  const h = Math.abs(hRaw);
  const bottomUp = hRaw > 0;
  const bpp = buf.readUInt16LE(28);
  const bytes = bpp / 8;
  const rowSize = Math.ceil((w * bpp) / 32) * 4;
  const px = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) {
    const srcY = bottomUp ? h - 1 - y : y;
    const row = dataOffset + srcY * rowSize;
    for (let x = 0; x < w; x++) {
      const o = row + x * bytes;
      px[y * w + x] = (buf[o + 2] << 16) | (buf[o + 1] << 8) | buf[o]; // BGR(A) → RGB
    }
  }
  return { w, h, px };
}
// small helper so we can use sync fs alongside promises API
import { createRequire } from "node:module";
const require_fs = () => createRequire(import.meta.url)("node:fs");

/** {w,h,px} → PNG at outPath (24bpp BMP → sips). */
function encodePNG(img, outPath) {
  const rowSize = Math.ceil((img.w * 24) / 32) * 4;
  const dataSize = rowSize * img.h;
  const buf = Buffer.alloc(54 + dataSize);
  buf.write("BM", 0);
  buf.writeUInt32LE(54 + dataSize, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(img.w, 18);
  buf.writeInt32LE(img.h, 22); // bottom-up
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(dataSize, 34);
  for (let y = 0; y < img.h; y++) {
    const row = 54 + (img.h - 1 - y) * rowSize;
    for (let x = 0; x < img.w; x++) {
      const c = img.px[y * img.w + x];
      const o = row + x * 3;
      buf[o] = c & 0xff;
      buf[o + 1] = (c >> 8) & 0xff;
      buf[o + 2] = (c >> 16) & 0xff;
    }
  }
  const bmpPath = outPath.replace(/\.png$/, ".bmp");
  require_fs().writeFileSync(bmpPath, buf);
  execFileSync("sips", ["-s", "format", "png", bmpPath, "--out", outPath], { stdio: "ignore" });
}

/** Connected components (4-neighbor) of a boolean mask → bounding boxes. */
function componentsToRects(mask, w, h, cap = 4, minArea = 6) {
  const seen = new Uint8Array(w * h);
  const rects = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen[i]) continue;
    let minX = w,
      maxX = 0,
      minY = h,
      maxY = 0,
      area = 0;
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w,
        y = (p / w) | 0;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= mask.length) continue;
        if (Math.abs((q % w) - x) > 1) continue; // no row wrap
        if (mask[q] && !seen[q]) {
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
    if (area >= minArea) rects.push({ minX, maxX, minY, maxY, area });
  }
  rects.sort((a, b) => b.area - a.area);
  return rects.slice(0, cap).map((r) => [
    Number((r.minX / TILE).toFixed(2)),
    Number((r.minY / TILE).toFixed(2)),
    Number(((r.maxX - r.minX + 1) / TILE).toFixed(2)),
    Number(((r.maxY - r.minY + 1) / TILE).toFixed(2)),
  ]);
}

const { packs } = JSON.parse(await fs.readFile(path.join(ROOT, "curated", "packs.json"), "utf8"));

for (const pack of packs) {
  if (pack.regionSource === "manual") {
    // just make sure the base map asset is cached under the canonical name
    const url = await imageURL(pack.mapFile);
    if (url) await cachedDownload(url, `map/${pack.id}.png`);
    console.log(`[${pack.id}] map cached (regions are hand-authored)`);
    continue;
  }

  const curated = JSON.parse(
    await fs.readFile(path.join(ROOT, "curated", pack.id, "locations.json"), "utf8")
  );
  const withMaps = curated.locations.filter((l) => l.bulbaMap);
  console.log(`[${pack.id}] downloading ${withMaps.length} highlight maps…`);
  const images = [];
  for (const loc of withMaps) {
    try {
      const url = await imageURL(loc.bulbaMap);
      if (!url) throw new Error("no imageinfo");
      const fp = await cachedDownload(url, `highlight/${pack.id}/${loc.id}.png`);
      images.push({ loc, img: decodePNG(fp) });
    } catch (e) {
      console.warn(`  ! ${loc.id}: ${e.message}`);
    }
  }

  // Canvas + per-file frame offset. johto-kanto is a special stitched case
  // (Johto 212w at x=0, Kanto 192w at x+170, 362w seam files in combined
  // coords). Every other auto pack is single-frame: one town-map size shared
  // by all highlights, overlaid directly.
  let W, H, frameOffset;
  if (pack.id === "johto-kanto") {
    W = 362;
    H = 145;
    frameOffset = (img) => {
      if (img.w === 362 && img.h === 145) return { dx: 0, dy: 0 };
      if (img.w === 212 && img.h === 145) return { dx: 0, dy: 0 };
      if (img.w === 192 && Math.abs(img.h - 145) <= 1) return { dx: 170, dy: 145 - img.h };
      return null;
    };
  } else {
    const dims = new Map();
    for (const { img } of images) {
      const k = `${img.w}x${img.h}`;
      dims.set(k, (dims.get(k) ?? 0) + 1);
    }
    [W, H] = [...dims.entries()].sort((a, b) => b[1] - a[1])[0][0].split("x").map(Number);
    frameOffset = (img) => (img.w === W && img.h === H ? { dx: 0, dy: 0 } : null);
  }

  const MAX_RECT_AREA = 0.15 * (W / TILE) * (H / TILE);

  /** Union nearby rects into one region; separate segments stay separate. */
  const mergeClusters = (list) => {
    const rects = list.map((r) => ({ x: r[0], y: r[1], w: r[2], h: r[3] }));
    let merged = true;
    while (merged) {
      merged = false;
      outer: for (let i = 0; i < rects.length; i++)
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i],
            b = rects[j];
          const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
          const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
          if (gapX <= 1.0 && gapY <= 1.0) {
            const x = Math.min(a.x, b.x),
              y = Math.min(a.y, b.y);
            rects[i] = {
              x,
              y,
              w: Math.max(a.x + a.w, b.x + b.w) - x,
              h: Math.max(a.y + a.h, b.y + b.h) - y,
            };
            rects.splice(j, 1);
            merged = true;
            break outer;
          }
        }
    }
    return rects.map((r) => [
      Number(r.x.toFixed(2)),
      Number(r.y.toFixed(2)),
      Number(r.w.toFixed(2)),
      Number(r.h.toFixed(2)),
    ]);
  };
  const minSize = ([x, y, w, h]) => {
    const mw = Math.max(w, 0.7),
      mh = Math.max(h, 0.7);
    return [Number((x - (mw - w) / 2).toFixed(2)), Number((y - (mh - h) / 2).toFixed(2)), mw, mh];
  };

  const regions = {};
  if (pack.id === "johto-kanto") {
    // Combined stitched canvas — the highlight is a bright crimson ring / orange
    // fill; recurring rects are fixed map features (deduped away).
    const fullFrame = images.filter(({ img }) => img.w === 362 && img.h === 145);
    const base = new Uint32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const counts = new Map();
      for (const { img } of fullFrame) counts.set(img.px[i], (counts.get(img.px[i]) ?? 0) + 1);
      let bc = 0,
        bv = 0;
      for (const [v, n] of counts) if (n > bc) ((bc = n), (bv = v));
      base[i] = bv;
    }
    encodePNG({ w: W, h: H, px: base }, path.join(CACHE, "map", `${pack.id}.png`));
    const isRing = (c) => {
      const r = (c >> 16) & 255,
        g = (c >> 8) & 255,
        b = c & 255;
      const ring = r >= 200 && g <= 40 && b <= 110;
      const fill = r >= 180 && g >= 90 && g <= 200 && b <= 120 && r > g + 30 && g >= b + 70;
      const pink = r >= 230 && g >= 60 && g <= 110 && b <= 130 && r > b + 90;
      return ring || fill || pink;
    };
    const candidates = [];
    const rectFreq = new Map();
    for (const { loc, img } of images) {
      const off = frameOffset(img);
      if (!off) {
        console.warn(`  ! ${loc.id}: unknown frame ${img.w}x${img.h} — needs manual region`);
        continue;
      }
      const mask = new Uint8Array(img.w * img.h);
      for (let i = 0; i < mask.length; i++) if (isRing(img.px[i])) mask[i] = 1;
      const rects = componentsToRects(mask, img.w, img.h, 40)
        .map(([x, y, w, h]) => [
          Number((x + off.dx / TILE).toFixed(2)),
          Number((y + off.dy / TILE).toFixed(2)),
          w,
          h,
        ])
        .filter((r) => r[2] * r[3] <= MAX_RECT_AREA);
      candidates.push({ loc, rects });
      for (const r of rects) rectFreq.set(r.join(","), (rectFreq.get(r.join(",")) ?? 0) + 1);
    }
    for (const { loc, rects } of candidates) {
      const unique = rects.filter((r) => (rectFreq.get(r.join(",")) ?? 0) < 4);
      const real = mergeClusters(unique)
        .filter((r) => r[2] * r[3] <= MAX_RECT_AREA)
        .slice(0, 4)
        .map(minSize);
      if (real.length === 0) console.warn(`  ! ${loc.id}: no unique ring — needs manual region`);
      else regions[loc.id] = real;
    }
  } else if (pack.dotColors) {
    // DOT DETECTION: this generation's town map marks the highlighted location
    // with a small solid dot in known colors (e.g. Unova: #eb1c24 towns,
    // #d84870 routes). Exact and immune to seasonal/revision noise.
    const tol = 26;
    const isDot = (c) => {
      const r = (c >> 16) & 255,
        g = (c >> 8) & 255,
        b = c & 255;
      return pack.dotColors.some(
        ([dr, dg, db]) =>
          Math.abs(r - dr) <= tol && Math.abs(g - dg) <= tol && Math.abs(b - db) <= tol
      );
    };
    // base map: mode across same-size files
    const full = images.filter(({ img }) => img.w === W && img.h === H);
    const base = new Uint32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const counts = new Map();
      for (const { img } of full) counts.set(img.px[i], (counts.get(img.px[i]) ?? 0) + 1);
      let bc = 0,
        bv = 0;
      for (const [v, n] of counts) if (n > bc) ((bc = n), (bv = v));
      base[i] = bv;
    }
    encodePNG({ w: W, h: H, px: base }, path.join(CACHE, "map", `${pack.id}.png`));

    const candidates = [];
    const rectFreq = new Map();
    for (const { loc, img } of images) {
      if (img.w !== W || img.h !== H) {
        console.warn(`  ! ${loc.id}: odd frame ${img.w}x${img.h} — needs manual region`);
        continue;
      }
      const mask = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) if (isDot(img.px[i])) mask[i] = 1;
      const rects = componentsToRects(mask, W, H, 12, 3);
      candidates.push({ loc, rects });
      for (const r of rects) rectFreq.set(r.join(","), (rectFreq.get(r.join(",")) ?? 0) + 1);
    }
    for (const { loc, rects } of candidates) {
      // fixed same-colored map features recur across files; the real dot moves
      const unique = rects.filter((r) => (rectFreq.get(r.join(",")) ?? 0) < 4);
      const real = mergeClusters(unique).slice(0, 3).map(minSize);
      if (real.length === 0) console.warn(`  ! ${loc.id}: no dot found — needs manual region`);
      else regions[loc.id] = real;
    }
  } else {
    // PALETTE-CLUSTER DIFF (universal, palette-agnostic): every location marker
    // is a permanent pill/path that only RECOLORS when highlighted. Group files
    // by their background palette (map revisions differ), build a per-group
    // base by per-pixel mode, then the pixels where a file differs from its
    // group base ARE the recolored highlight. No color heuristics needed.
    const full = images.filter(({ img }) => img.w === W && img.h === H);
    const groups = new Map();
    for (const x of full) {
      const k = x.img.px[0]; // top-left corner = background palette key
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(x);
    }
    const modeBase = (grp) => {
      const base = new Uint32Array(W * H);
      for (let i = 0; i < W * H; i++) {
        const counts = new Map();
        for (const { img } of grp) counts.set(img.px[i], (counts.get(img.px[i]) ?? 0) + 1);
        let bc = 0,
          bv = 0;
        for (const [v, n] of counts) if (n > bc) ((bc = n), (bv = v));
        base[i] = bv;
      }
      return base;
    };
    const bases = new Map();
    for (const [k, grp] of groups) bases.set(k, { base: modeBase(grp), size: grp.length });
    const largest = [...bases.values()].sort((a, b) => b.size - a.size)[0];
    console.log(
      `[${pack.id}] ${groups.size} palette group(s): ${[...bases.values()].map((b) => b.size).join("/")}`
    );
    encodePNG({ w: W, h: H, px: largest.base }, path.join(CACHE, "map", `${pack.id}.png`));

    for (const { loc, img } of images) {
      if (img.w !== W || img.h !== H) {
        console.warn(`  ! ${loc.id}: odd frame ${img.w}x${img.h} — needs manual region`);
        continue;
      }
      const g = bases.get(img.px[0]);
      const base = g && g.size >= 3 ? g.base : largest.base;
      const mask = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) if (img.px[i] !== base[i]) mask[i] = 1;
      const rects = componentsToRects(mask, W, H, 20, 8).filter(
        (r) => r[2] * r[3] <= MAX_RECT_AREA
      );
      const real = mergeClusters(rects)
        .filter((r) => r[2] * r[3] <= MAX_RECT_AREA)
        .slice(0, 4)
        .map(minSize);
      if (real.length === 0) console.warn(`  ! ${loc.id}: empty diff — needs manual region`);
      else regions[loc.id] = real;
    }
  }

  // Uniform calibration shift (e.g. Kalos: the town/landmark highlight GLYPH's
  // bbox sits up-right of the node it points at — measured against the map's
  // own circles). Routes highlight the actual path (no glyph), so they are
  // exempt (Paul, 2026-07-21). Manual entries are authored in the final frame.
  if (pack.regionShift) {
    const [sx, sy] = pack.regionShift;
    const classById = new Map(curated.locations.map((l) => [l.id, l.class]));
    for (const id of Object.keys(regions)) {
      const cls = classById.get(id);
      if (cls === "route" || cls === "sea-route") continue;
      regions[id] = regions[id].map(([x, y, w, h]) => [
        Number((x + sx).toFixed(2)),
        Number((y + sy).toFixed(2)),
        w,
        h,
      ]);
    }
  }

  // manual overrides / additions
  try {
    const manual = JSON.parse(
      await fs.readFile(path.join(ROOT, "curated", pack.id, "map-regions-manual.json"), "utf8")
    );
    Object.assign(regions, manual.regions ?? {});
  } catch {
    /* none */
  }

  const out = {
    _comment: `AUTO-GENERATED by pipeline/pull-maps.mjs from Bulbapedia highlight maps (+ manual overrides). Do not hand-edit; edit map-regions-manual.json instead.`,
    grid: { cols: Number((W / TILE).toFixed(2)), rows: Number((H / TILE).toFixed(2)), tilePx: TILE },
    regions,
  };
  await fs.writeFile(
    path.join(ROOT, "curated", pack.id, "map-regions.json"),
    JSON.stringify(out, null, 1)
  );
  console.log(`[${pack.id}] ${Object.keys(regions).length} regions extracted → curated/${pack.id}/map-regions.json`);
}
