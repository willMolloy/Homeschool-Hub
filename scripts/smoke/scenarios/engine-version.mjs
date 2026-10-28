export default async function ({ page, shot, login, log, BASE }) {
  await page.goto(`${BASE}/kids`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForSelector(".shell-footer span");
  log("footer:", await page.$eval(".shell-footer", (e) => e.textContent), "banner:", !!(await page.$(".shell-banner")));
  await shot("s1-37-footer-360");
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    if (r.url().endsWith("/api/health")) r.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, engineVersion: "0.2.0", db: "ok" }) });
    else r.continue();
  });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".shell-banner");
  log("banner:", await page.$eval(".shell-banner", (e) => e.innerText.replace(/\n+/g, " | ")));
  await shot("s1-37-mismatch-banner-360");
}
