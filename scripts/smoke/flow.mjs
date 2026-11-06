// Usage: node flow.mjs <scenario>   (runs scenarios/<scenario>.mjs against BASE_URL; screens go to docs/progress/screens)
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { BASE_URL as BASE, SCREENS_DIR, launchOptions } from "./common.mjs";

const scenario = process.argv[2];
if (!scenario) {
  console.error("usage: node flow.mjs <scenario>   (see scenarios/)");
  process.exit(2);
}
// S17-01: a scenario that only needs its screenshots to look at (`export const scratchScreens = true`) writes them to the
// system temp folder, so a run leaves no untracked files in the repo. SCREENS_DIR, when set, still wins.
const scenarioModule = await import(`./scenarios/${scenario}.mjs`);
const OUT = scenarioModule.scratchScreens && !process.env.SCREENS_DIR ? path.join(os.tmpdir(), "hh-smoke-screens") : SCREENS_DIR;
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch(launchOptions);
const page = await browser.newPage();
const log = (...a) => console.log(...a);
page.on("pageerror", (e) => log("PAGEERROR", e.message));
async function shot(name, width = 360, height = 740) {
  await page.setViewport({ width, height });
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  log("saved", `${OUT}/${name}.png`);
}
// S10-19 (R7): the API allows 10 sign-ins a minute (routes/auth.ts), and a full run signs in once or more per scenario, so a
// later scenario can get 429 "Too many attempts" and sit on /login until its own wait times out. When that happens, wait out
// the API's Retry-After and sign in again, instead of failing on a redirect that never comes.
async function login(email = "demo@example.com", password = "demo-password") {
  for (let attempt = 1; ; attempt++) {
    await page.waitForSelector("#login-email");
    // select what a refused try left in the boxes, so typing replaces it (setting .value would not reach React's state)
    await page.$eval("#login-email", (i) => i.select());
    await page.type("#login-email", email);
    await page.$eval("#login-password", (i) => i.select());
    await page.type("#login-password", password);
    const answer = page.waitForResponse((r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST", { timeout: 15000 });
    await page.click("button[type=submit]");
    const res = await answer;
    if (res.status() !== 429) return;
    if (attempt === 3) throw new Error("sign-in still rate-limited (429) after 2 waits");
    const wait = Math.min(Number(res.headers()["retry-after"]) || 60, 65);
    log(`sign-in rate-limited (429), waiting ${wait} s (attempt ${attempt})`);
    await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
  }
}
// S8b-06: Sign out is behind the family button on Home (S8-04).
async function signOut() {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.click("button[aria-label='Family and settings']");
  await page.waitForSelector("[role=dialog]");
  await new Promise((r) => setTimeout(r, 500)); // the sheet slides in
  const [btn] = await page.$$("xpath/.//button[normalize-space()='Sign out']");
  await btn.evaluate((b) => b.click());
}
const h1 = () => page.$eval("h1", (e) => e.textContent).catch(() => null);
try {
  await page.setViewport({ width: 360, height: 740 });
  await scenarioModule.default({ page, shot, login, signOut, h1, log, BASE });
} finally {
  await browser.close();
}
