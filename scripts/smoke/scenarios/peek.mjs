export default async function ({ page, login, log, BASE }) {
  await page.goto(`${BASE}/plan?week=2026-11-02`, { waitUntil: "networkidle0" });
  await login();
  await new Promise((r) => setTimeout(r, 1500));
  log(location, await page.evaluate(() => location.href + "\n" + document.querySelector("main").innerText.slice(0, 600)));
}
