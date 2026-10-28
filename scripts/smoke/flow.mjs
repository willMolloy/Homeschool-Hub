// Usage: node flow.mjs <scenario>   (runs scenarios/<scenario>.mjs against BASE_URL; screens go to docs/progress/screens)
import puppeteer from "puppeteer-core";
import { BASE_URL as BASE, SCREENS_DIR as OUT, launchOptions } from "./common.mjs";

const scenario = process.argv[2];
if (!scenario) {
  console.error("usage: node flow.mjs <scenario>   (see scenarios/)");
  process.exit(2);
}
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
async function login(email = "demo@example.com", password = "demo-password") {
  await page.waitForSelector("#login-email");
  await page.type("#login-email", email);
  await page.type("#login-password", password);
  await page.click("button[type=submit]");
}
const h1 = () => page.$eval("h1", (e) => e.textContent).catch(() => null);
try {
  await page.setViewport({ width: 360, height: 740 });
  const s = await import(`./scenarios/${scenario}.mjs`);
  await s.default({ page, shot, login, h1, log, BASE });
} finally {
  await browser.close();
}
