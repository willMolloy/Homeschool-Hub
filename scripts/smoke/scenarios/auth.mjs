export default async function ({ page, shot, login, signOut, h1, log, BASE }) {
  await page.goto(`${BASE}/kids`, { waitUntil: "networkidle0" });
  log("fresh /kids →", await page.evaluate(() => location.pathname));
  await shot("s1-20-redirected-to-login-360");
  await login();
  // /kids is an old link: it lands on /setup/children (S8-04).
  await page.waitForFunction(() => location.pathname === "/setup/children", { timeout: 5000 });
  await page.waitForSelector("nav[aria-label=Main]");
  log("after login →", await page.evaluate(() => location.pathname), "h1:", await h1());
  await shot("s1-20-kids-signed-in-360");
  await shot("s1-20-kids-signed-in-1280", 1280, 800);
  await page.setViewport({ width: 360, height: 740 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  log("family button:", await page.$eval("button[aria-label='Family and settings']", (e) => e.textContent));
  await signOut();
  await page.waitForFunction(() => location.pathname === "/login", { timeout: 5000 });
  log("after sign out →", await page.evaluate(() => location.pathname));
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  log("/ after sign out →", await page.evaluate(() => location.pathname));
}
