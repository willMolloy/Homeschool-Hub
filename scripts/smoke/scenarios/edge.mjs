export default async function ({ page, login, h1, log, BASE }) {
  await page.goto(`${BASE}/subjects`, { waitUntil: "networkidle0" });
  log("deep link signed-out ->", page.url());
  await login(); await page.waitForFunction(() => document.querySelector("h1")?.textContent === "Subjects");
  log("after login ->", page.url());
  await page.reload({ waitUntil: "networkidle0" }); log("reload stays:", page.url(), await h1());
  await page.goto(`${BASE}/nope`, { waitUntil: "networkidle0" }); log("unknown route h1:", await h1(), page.url());
  await page.goto(`${BASE}/?week=garbage&asOf=2026-13-40`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 500));
  log("bad params:", (await page.$eval("main", (m) => m.innerText)).slice(0, 200).replace(/\n+/g, " | "));
  log("title:", await page.title());
}
