import { createRequire } from "module";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../iso-prototype/node_modules/"));
const { chromium } = require("playwright");

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5201/?debug");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => document.fonts.status === "loaded" && window.pokemapsStore);
  await page.waitForTimeout(500);
  const close = page.locator("button", { hasText: "Close" }).first();
  if (await close.isVisible().catch(() => false)) await close.click();
  await page.waitForTimeout(300);

  // force a sinnoh practice puzzle + audit overlay on
  await page.evaluate(() => {
    const s = window.pokemapsStore.getState();
    s.startPractice("sinnoh");
    if (!window.pokemapsStore.getState().audit) window.pokemapsStore.getState().toggleAudit();
  });
  await page.waitForTimeout(800);
  const answer = await page.evaluate(() => window.pokemapsStore.getState().practice?.answerId ?? window.pokemapsStore.getState().practiceState?.answerId);
  console.log("sinnoh practice answer:", answer);

  const mapCard = page.locator("main .card").first();
  await mapCard.screenshot({ path: join(here, "shots", "sinnoh-audit-app.png") });
  console.log("wrote sinnoh-audit-app.png");
  await browser.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
