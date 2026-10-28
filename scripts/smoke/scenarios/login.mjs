export default async function ({ page, shot, login, h1, log, BASE }) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await shot("s1-19-login-360");
  await login("demo@example.com", "wrong-password");
  await page.waitForSelector("[role=alert]");
  log("bad login alert:", await page.$eval("[role=alert]", (e) => e.textContent));
  await shot("s1-19-login-error-360");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  page.on("response", (r) => r.url().includes("/api/") && log("resp", r.status(), r.url()));
  await login();
  await page.waitForFunction(() => location.pathname === "/", { timeout: 5000 }).catch(() => {});
  log("after login path", await page.evaluate(() => location.pathname), "h1:", await h1(),
    await page.$eval("[role=alert]", (e) => e.textContent).catch(() => "no alert"));
  await shot("s1-19-after-login-360");
}
