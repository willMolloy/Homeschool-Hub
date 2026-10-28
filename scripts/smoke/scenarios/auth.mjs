export default async function ({ page, shot, login, h1, log, BASE }) {
  await page.goto(`${BASE}/kids`, { waitUntil: "networkidle0" });
  log("fresh /kids →", await page.evaluate(() => location.pathname));
  await shot("s1-20-redirected-to-login-360");
  await login();
  await page.waitForFunction(() => location.pathname === "/kids", { timeout: 5000 });
  await page.waitForSelector(".shell-family");
  log("after login →", await page.evaluate(() => location.pathname), "h1:", await h1(),
    "family:", await page.$eval(".shell-family", (e) => e.textContent));
  await shot("s1-20-kids-signed-in-360");
  await shot("s1-20-kids-signed-in-1280", 1280, 800);
  await page.setViewport({ width: 360, height: 740 });
  const [btn] = await page.$$("xpath/.//button[normalize-space()='Sign out']");
  await btn.click();
  await page.waitForFunction(() => location.pathname === "/login", { timeout: 5000 });
  log("after sign out →", await page.evaluate(() => location.pathname));
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  log("/ after sign out →", await page.evaluate(() => location.pathname));
}
