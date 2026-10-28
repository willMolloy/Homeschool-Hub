export default async function ({ page, shot, login, h1, log, BASE }) {
  await page.goto(`${BASE}/schedule`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForFunction(() => location.pathname === "/schedule", { timeout: 5000 });
  await page.waitForSelector(".schedule-hub");
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    nav: [...document.querySelectorAll(".shell-nav a")].map((a) => [a.textContent, a.getBoundingClientRect().width | 0, a.scrollWidth > a.clientWidth, a.getAttribute("aria-current")]),
  }));
  log("360", h1 && (await h1()), JSON.stringify(m));
  await shot("s2a-12-schedule-hub-360");
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise((r) => setTimeout(r, 200));
  log("1280 sw", await page.evaluate(() => document.documentElement.scrollWidth));
  await shot("s2a-12-schedule-hub-1280", 1280, 800);
  await page.setViewport({ width: 360, height: 740 });
  await page.goto(`${BASE}/schedule/events`, { waitUntil: "networkidle0" });
  log("nested current:", await page.$eval(".shell-nav a[aria-current=page]", (a) => a.textContent));
}
