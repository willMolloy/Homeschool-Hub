import puppeteer from "puppeteer-core";
import { PREVIEW_URL, launchOptions } from "./common.mjs";
// PWA check against the production preview (npm run build -w @hh/web && npm run preview -w @hh/web).
const browser = await puppeteer.launch(launchOptions);
const page = await browser.newPage();
await page.goto(`${PREVIEW_URL}/login`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1500));
const cdp = await page.createCDPSession();
const m = await cdp.send("Page.getAppManifest");
console.log("manifest url:", m.url, "errors:", JSON.stringify(m.errors));
const inst = await cdp.send("Page.getInstallabilityErrors");
console.log("installability errors:", JSON.stringify(inst.installabilityErrors));
const sw = await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
console.log("service worker registered:", sw);
for (const p of ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png", "/icons/apple-touch-icon.png"]) {
  const r = await page.evaluate(async (u) => { const x = await fetch(u); return `${x.status} ${x.headers.get("content-type")}`; }, p);
  console.log(p, r);
}
console.log("apple-touch link:", await page.$eval("link[rel=apple-touch-icon]", (e) => e.href));
await browser.close();
