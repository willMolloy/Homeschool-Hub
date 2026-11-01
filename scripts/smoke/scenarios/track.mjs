// S8b-06: Home, Track work (the question, the checks, Update status) and the child switch. Read-only: nothing is saved
// (the check-in is never sent). Needs the demo family, whose last week is not checked in.
export default async function ({ page, shot, login, log, BASE }) {
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  const sw = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  const clickByText = async (sel, text) => {
    for (const e of await page.$$(sel)) if ((await e.evaluate((n) => n.textContent.trim())) === text) return e.click();
    throw new Error(`no ${sel} "${text}"`);
  };
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForSelector("button[aria-label='Family and settings']");
  log("home:", await page.$eval("main h1", (e) => e.textContent), "| cards:", await page.$$eval(".home-card h2", (h) => h.map((x) => x.textContent)));
  if (!(await sw())) problems.push("home scrolls sideways");
  await shot("s8-home-360");
  await page.click("nav[aria-label=Main] a[href='/track']");
  await page.waitForFunction(() => location.pathname === "/track");
  await page.waitForSelector("[aria-label=\"Last week's check-in\"]");
  log("question:", await page.$eval("[aria-label=\"Last week's check-in\"]", (e) => e.innerText.replace(/\n+/g, " | ")));
  await clickByText("button", "Not quite");
  await page.waitForSelector(".bar-check");
  log("hint:", await page.$eval(".board-hint", (e) => e.textContent));
  log("bars:", await page.$$eval(".bar", (b) => b.map((x) => x.querySelector(".bar-title").textContent + " " + x.querySelector(".bar-amount").textContent)));
  await shot("s8-track-360");
  await page.click(".bar-body");
  await page.waitForSelector("[role=dialog]");
  log("sheet:", await page.$eval("[role=dialog]", (e) => e.innerText.replace(/\n+/g, " | ").slice(0, 200)));
  await shot("s8-update-status-360");
  await clickByText("[role=dialog] button", "Cancel");
  await page.click("nav[aria-label=Main] a[href='/schedule']");
  await page.waitForSelector("[role=tab]");
  for (const view of ["Week", "Year"]) {
    await clickByText("[role=tab]", view);
    await new Promise((r) => setTimeout(r, 700));
    log(view, "child switch:", await page.$$eval(".child-switch button", (b) => b.map((x) => x.textContent)), "scrolls sideways:", !(await sw()));
  }
  log("PROBLEMS:", problems.length ? problems : "none");
}
