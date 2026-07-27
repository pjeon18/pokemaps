// Offline high-zoom overlay of extracted regions on the Sinnoh base map.
// Reuses the pipeline's sips-based PNG codec (no sharp needed). Draws each
// region rect as a colored outline; scales up NxN with nearest-neighbor.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..");

function decodePNG(pngPath) {
  const bmpPath = pngPath.replace(/\.png$/, ".bmp");
  execFileSync("sips", ["-s", "format", "bmp", pngPath, "--out", bmpPath], { stdio: "ignore" });
  const buf = readFileSync(bmpPath);
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
      px[y * w + x] = (buf[o + 2] << 16) | (buf[o + 1] << 8) | buf[o];
    }
  }
  return { w, h, px };
}
function encodePNG(img, outPath) {
  const rowSize = Math.ceil((img.w * 24) / 32) * 4;
  const dataSize = rowSize * img.h;
  const buf = Buffer.alloc(54 + dataSize);
  buf.write("BM", 0);
  buf.writeUInt32LE(54 + dataSize, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(img.w, 18);
  buf.writeInt32LE(img.h, 22);
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
  writeFileSyncShim(bmpPath, buf);
  execFileSync("sips", ["-s", "format", "png", bmpPath, "--out", outPath], { stdio: "ignore" });
}
import { writeFileSync as writeFileSyncShim } from "node:fs";

const TILE = 8;
const S = 6; // scale
const base = decodePNG(join(ROOT, "public/content/map/sinnoh.png"));
const regions = JSON.parse(readFileSync(join(ROOT, "curated/sinnoh/map-regions.json"), "utf8")).regions;
const manual = new Set(["wayward-cave", "sinnoh-victory-road", "sinnoh-route-228"]);

// upscale
const W = base.w * S, H = base.h * S;
const out = new Uint32Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out[y * W + x] = base.px[((y / S) | 0) * base.w + ((x / S) | 0)];

function drawRect(px, py, pw, ph, color) {
  const x0 = Math.round(px), y0 = Math.round(py), x1 = Math.round(px + pw), y1 = Math.round(py + ph);
  for (let t = 0; t < 2; t++) {
    for (let x = x0; x <= x1; x++) { if (y0 + t >= 0 && y0 + t < H && x >= 0 && x < W) out[(y0 + t) * W + x] = color; if (y1 - t >= 0 && y1 - t < H && x >= 0 && x < W) out[(y1 - t) * W + x] = color; }
    for (let y = y0; y <= y1; y++) { if (x0 + t >= 0 && x0 + t < W && y >= 0 && y < H) out[y * W + x0 + t] = color; if (x1 - t >= 0 && x1 - t < W && y >= 0 && y < H) out[y * W + x1 - t] = color; }
  }
}
for (const [id, rects] of Object.entries(regions)) {
  const color = manual.has(id) ? 0x0d7fbf : 0xe2001a;
  for (const [x, y, w, h] of rects) drawRect(x * TILE * S, y * TILE * S, w * TILE * S, h * TILE * S, color);
}
encodePNG({ w: W, h: H, px: out }, join(here, "shots", "sinnoh-overlay-full.png"));
console.log("wrote sinnoh-overlay-full.png", W + "x" + H, "regions:", Object.keys(regions).length);
