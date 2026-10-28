export default async function ({ page, shot, login, log, BASE }) {
  await page.goto(`${BASE}/kids`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForSelector(".roster-row:not(.skeleton)");
  log("rows:", await page.$$eval(".roster-row", (r) => r.map((x) => x.textContent)));
  await shot("s1-25-kids-list-360");
  await page.click(".roster-toggle input");
  await page.waitForFunction(() => document.querySelector(".is-archived"), { timeout: 5000 });
  log("with archived:", await page.$$eval(".roster-row", (r) => r.map((x) => x.textContent)));
  await shot("s1-25-kids-show-archived-360");
  await shot("s1-25-kids-list-1280", 1280, 800);
  await page.setViewport({ width: 360, height: 740 });
  const [btn] = await page.$$("xpath/.//button[normalize-space()='Sign out']");
  await btn.click();
  await page.waitForSelector("#login-email");
  await login("empty@example.com");
  await page.waitForSelector(".roster-empty");
  log("empty:", await page.$eval(".roster-empty", (e) => e.textContent));
  await shot("s1-25-kids-empty-360");
}
