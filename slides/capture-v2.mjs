import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../iso-prototype/node_modules/"));
const { chromium } = require("playwright");
const OUT = join(here, "shots");
const fresh = async (ctx) => {
  const page = await ctx.newPage();
  await page.goto("http://localhost:5201/?debug");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => document.fonts.status === "loaded" && window.pokemapsStore);
  await page.waitForTimeout(500);
  const close = page.locator("button", { hasText: "Close" }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.waitForTimeout(300);
  return page;
};
const guess = async (page, id) => {
  await page.evaluate((g) => window.pokemapsStore.getState().select(g), id);
  await page.waitForTimeout(150);
  await page.evaluate(() => window.pokemapsStore.getState().confirmGuess());
  await page.waitForTimeout(700);
};
const run = async () => {
  const browser = await chromium.launch();
  const d = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
  let page = await fresh(d);
  // a Sinnoh practice puzzle with items → deterministic-looking shot; 2 wrong guesses
  await page.evaluate(() => window.pokemapsStore.getState().startPractice("sinnoh"));
  await page.waitForTimeout(500);
  const ans = await page.evaluate(() => window.pokemapsStore.getState().practice.answerId);
  const wrong = ["snowpoint-city", "pastoria-city", "canalave-city"].filter((x) => x !== ans).slice(0, 2);
  for (const w of wrong) await guess(page, w);
  await page.screenshot({ path: join(OUT, "v2-desktop.png") });
  // preview assist on + select a location → thumbnail in readout
  await page.evaluate(() => { const s = window.pokemapsStore.getState(); if (!s.assist.preview) s.toggleAssist("preview"); s.select("jubilife-city"); });
  await page.waitForTimeout(400);
  await page.locator("main .card").first().screenshot({ path: join(OUT, "v2-preview.png") });
  // arrows off → color-only pills
  await page.evaluate(() => { const s = window.pokemapsStore.getState(); if (s.assist.arrows) s.toggleAssist("arrows"); s.select(null); });
  await page.waitForTimeout(400);
  await page.locator("section.card", { hasText: "Guesses" }).screenshot({ path: join(OUT, "v2-arrows-off.png") });
  await page.locator("section.card", { hasText: "Hints" }).screenshot({ path: join(OUT, "v2-hints.png") });
  console.log("answer:", ans);
  await d.close();
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  page = await fresh(m);
  await page.evaluate(() => window.pokemapsStore.getState().startPractice("hoenn"));
  await page.waitForTimeout(500);
  await guess(page, "rustboro-city");
  await page.screenshot({ path: join(OUT, "v2-mobile.png") });
  await browser.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
