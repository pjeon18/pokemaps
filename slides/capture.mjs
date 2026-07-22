// Capture PokéMAPs screenshots for the design-process deck.
// Drives the REAL store (window.pokemapsStore, dev-only) on the running dev
// server — same approach as iso-prototype/scripts/capture.mjs. Borrow
// Playwright from the iso-prototype install.
import { createRequire } from "module";
import { readFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../iso-prototype/node_modules/"));
const { chromium } = require("playwright");

const BASE = process.env.BASE ?? "http://localhost:5201";
const OUT = join(here, "shots");
mkdirSync(OUT, { recursive: true });

const LOCATIONS = JSON.parse(readFileSync(join(here, "../src/content/locations.json"), "utf8"));
const byId = new Map(LOCATIONS.map((l) => [l.id, l]));

/** pick wrong guesses in the answer's pack at descending distance (cold→warm) */
function pickWrongGuesses(answerId, n = 3) {
  const ans = byId.get(answerId);
  const pool = LOCATIONS.filter((l) => l.pack === ans.pack && l.id !== answerId)
    .map((l) => {
      const dx = l.center[0] - ans.center[0];
      const dy = l.center[1] - ans.center[1];
      return { id: l.id, d: Math.hypot(dx, dy) };
    })
    .sort((a, b) => b.d - a.d);
  // far, middle, near — shows the full band gradient in the guess log
  const picks = [pool[0], pool[Math.floor(pool.length / 2)], pool[pool.length - 1]];
  return picks.slice(0, n).map((p) => p.id);
}

async function freshPage(ctx, { closeHowTo = true } = {}) {
  const page = await ctx.newPage();
  await page.goto(BASE + "/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => document.fonts.status === "loaded" && window.pokemapsStore);
  await page.waitForTimeout(600);
  if (closeHowTo) {
    const close = page.locator("button", { hasText: "Close" }).first();
    if (await close.isVisible().catch(() => false)) await close.click();
    else await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
  return page;
}

async function guess(page, id) {
  await page.evaluate((gid) => {
    const s = window.pokemapsStore.getState();
    s.select(gid);
  }, id);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.pokemapsStore.getState().confirmGuess());
  await page.waitForTimeout(900); // let the log row + band animate in
}

const run = async () => {
  const browser = await chromium.launch();

  // ——— desktop ———
  const desktop = await browser.newContext({
    viewport: { width: 1360, height: 900 },
    deviceScaleFactor: 2,
  });
  let page = await freshPage(desktop);

  // wordmark + live type specimens (uses the app's actually-loaded webfonts)
  await page.locator("h1").screenshot({ path: join(OUT, "wordmark.png") });
  await page.evaluate(() => {
    const div = document.createElement("div");
    div.id = "specimen";
    div.style.cssText =
      "position:fixed;inset:auto auto 0 0;z-index:9999;background:#fff;padding:36px 44px;width:920px;";
    div.innerHTML = `
      <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#8a8270;margin-bottom:10px">M PLUS ROUNDED 1C — DISPLAY & BODY</div>
      <div style="font-family:'M PLUS Rounded 1c';font-weight:900;font-size:44px;color:#17130c;line-height:1.15">AaBbCcDdEeFfGg 0123456789</div>
      <div style="font-family:'M PLUS Rounded 1c';font-weight:700;font-size:22px;color:#4c4638;margin-top:6px">The quick brown Zigzagoon jumps over the lazy Snorlax.</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#8a8270;margin:26px 0 10px">IBM PLEX MONO — SURVEY LABELS</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:16px;letter-spacing:.14em;text-transform:uppercase;color:#17130c">DAILY LOCATION PUZZLE · Nº 214 · RUN 07</div>`;
    document.body.appendChild(div);
  });
  await page.waitForTimeout(400);
  await page.locator("#specimen").screenshot({ path: join(OUT, "type-specimen.png") });
  await page.evaluate(() => document.getElementById("specimen")?.remove());

  // three wrong guesses (cold → warm) then screenshots of the playing state
  const answerId = await page.evaluate(() => window.pokemapsStore.getState().daily.answerId);
  console.log("answer:", answerId, "pack:", byId.get(answerId).pack);
  for (const id of pickWrongGuesses(answerId)) await guess(page, id);

  await page.screenshot({ path: join(OUT, "desktop-playing.png") });
  await page.locator("main > div").first().locator(".card").first()
    .screenshot({ path: join(OUT, "map-card.png") });
  await page.locator("section.card", { hasText: "Guesses" })
    .screenshot({ path: join(OUT, "guess-log.png") });
  await page.locator("section.card", { hasText: "Hint" }).first()
    .screenshot({ path: join(OUT, "hint-panel.png") });

  // practice picker modal
  await page.locator("button", { hasText: "Practice" }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "practice-picker.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  // win → reveal
  await guess(page, answerId);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, "desktop-won.png") });
  const reveal = page.locator("main > div").nth(1);
  await reveal.screenshot({ path: join(OUT, "reveal-column.png") });

  await desktop.close();

  // ——— mobile ———
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  page = await freshPage(mobile);
  const ans2 = await page.evaluate(() => window.pokemapsStore.getState().daily.answerId);
  const wrongs = pickWrongGuesses(ans2, 2);
  for (const id of wrongs) await guess(page, id);
  await page.screenshot({ path: join(OUT, "mobile-playing.png") });
  await page.screenshot({ path: join(OUT, "mobile-full.png"), fullPage: true });

  await mobile.close();
  await browser.close();
  console.log("shots →", OUT);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
