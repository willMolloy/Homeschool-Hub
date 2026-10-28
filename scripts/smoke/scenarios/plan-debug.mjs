export default async function ({ page, shot, login, log, BASE }) {
  const read = () => page.$$eval("table.plan-debug-table", (ts) => ts.map((t) => ({
    child: t.querySelector("caption").textContent,
    head: [...t.querySelectorAll("thead th")].map((h) => h.textContent),
    rows: [...t.querySelectorAll("tbody tr, tfoot tr")].map((r) => [...r.children].map((c) => c.textContent).join(" | ")),
  })));
  await page.goto(`${BASE}/?week=2026-10-26&asOf=2026-10-19`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForSelector("table.plan-debug-table");
  log("asOf=2026-10-19:", JSON.stringify(await read(), null, 1));
  await shot("s1-36-plan-debug-oct26-360");
  await shot("s1-36-plan-debug-oct26-1280", 1280, 900);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector("table.plan-debug-table");
  log("today:", await page.$eval(".plan-debug-week", (e) => e.textContent), JSON.stringify((await read())[0]));
  await shot("s1-36-plan-debug-today-360");
  const btns = await page.$$(".plan-debug-bar button");
  await btns[1].click();
  await page.waitForFunction(() => document.querySelector(".plan-debug-week").textContent.includes("2026-11-02"));
  await page.waitForSelector("table.plan-debug-table");
  log("next:", await page.$eval(".plan-debug-week", (e) => e.textContent));
}
