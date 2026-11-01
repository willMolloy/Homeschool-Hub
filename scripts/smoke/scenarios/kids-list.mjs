export default async function ({ page, shot, login, signOut, log, BASE }) {
  await page.goto(`${BASE}/setup/children`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForSelector(".roster-row:not(.skeleton)");
  log("rows:", await page.$$eval(".roster-row", (r) => r.map((x) => x.textContent)));
  await shot("s1-25-kids-list-360");
  await page.click(".roster-toggle input");
  await page.waitForSelector(".is-archived", { timeout: 3000 }).catch(() => log("(no archived child in this family)"));
  log("with archived:", await page.$$eval(".roster-row", (r) => r.map((x) => x.textContent)));
  await shot("s1-25-kids-show-archived-360");
  await shot("s1-25-kids-list-1280", 1280, 800);
  await page.setViewport({ width: 360, height: 740 });
  await signOut();
  await page.waitForSelector("#login-email");
  await login("empty@example.com");
  await page.goto(`${BASE}/setup/children`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".roster-empty");
  log("empty:", await page.$eval(".roster-empty", (e) => e.textContent));
  await shot("s1-25-kids-empty-360");
}
