// Follow-up: clean won-state shots (fresh context = fresh state, so replay the win).
import { createRequire } from "module";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../iso-prototype/node_modules/"));
const { chromium } = require("playwright");
const OUT = join(here, "shots");

const LOCATIONS = JSON.parse(readFileSync(join(here, "../src/content/locations.json"), "utf8"));
const byId = new Map(LOCATIONS.map((l) => [l.id, l]));
function pickWrongGuesses(answerId, n = 3) {
  const ans = byId.get(answerId);
  const pool = LOCATIONS.filter((l) => l.pack === ans.pack && l.id !== answerId)
    .map((l) => ({ id: l.id, d: Math.hypot(l.center[0] - ans.center[0], l.center[1] - ans.center[1]) }))
    .sort((a, b) => b.d - a.d);
  return [pool[0], pool[Math.floor(pool.length / 2)], pool[pool.length - 1]].slice(0, n).map((p) => p.id);
}

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5201/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => document.fonts.status === "loaded" && window.pokemapsStore);
  await page.waitForTimeout(600);
  const close = page.locator("button", { hasText: "Close" }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.waitForTimeout(400);

  const answerId = await page.evaluate(() => window.pokemapsStore.getState().daily.answerId);
  const seq = [...pickWrongGuesses(answerId), answerId];
  for (const id of seq) {
    await page.evaluate((gid) => window.pokemapsStore.getState().select(gid), id);
    await page.waitForTimeout(250);
    await page.evaluate(() => window.pokemapsStore.getState().confirmGuess());
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, "desktop-won.png") });

  // reveal card, clipped to its top (the full card includes the tall photograph)
  const card = page.locator("main > div").nth(1).locator("section.card").first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const bb = await card.boundingBox();
  await page.screenshot({
    path: join(OUT, "reveal-card.png"),
    clip: { x: bb.x, y: Math.max(0, bb.y), width: bb.width, height: Math.min(bb.height, 700) },
  });
  await browser.close();
  console.log("done, answer:", answerId);
};
run().catch((e) => { console.error(e); process.exit(1); });
