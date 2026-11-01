// S9-09: Home (Schedule and Records cards, the three tabs), Records (Log setup for a new family, or the log, totals and Export
// once set up), Update status from a Week bar, and the child switch. Read-only: nothing is saved or logged. Needs the demo family.
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
  log("tabs:", await page.$$eval("nav[aria-label=Main] a", (a) => a.map((x) => x.textContent.trim())));
  log("home cards:", await page.$$eval(".home-card h2", (h) => h.map((x) => x.textContent)));
  if (!(await sw())) problems.push("home scrolls sideways");
  await shot("s9-home-360");
  await page.click("nav[aria-label=Main] a[href='/records']");
  await page.waitForFunction(() => location.pathname === "/records");
  await page.waitForSelector("main h1");
  await new Promise((r) => setTimeout(r, 800));
  log("records h1:", await page.$eval("main h1", (e) => e.textContent));
  log("records page:", await page.$eval("main", (e) => e.innerText.replace(/\n+/g, " | ").slice(0, 240)));
  if (!(await sw())) problems.push("records scrolls sideways");
  await shot("s9-records-360");
  const setUp = await page.$("form[aria-label='Log setup']");
  if (setUp) log("log setup styles:", await page.$$eval(".choice-card", (c) => c.map((x) => x.querySelector("span").firstChild.textContent)));
  else {
    await clickByText("button", "Log");
    await page.waitForSelector("form[aria-label='Log']");
    log("log form first day:", JSON.stringify(await page.$eval("#log-first", (e) => e.value)), "(empty: nothing prefilled)");
    await shot("s9-log-form-360");
    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 500));
    await clickByText("button", "Export");
    await page.waitForSelector("form[aria-label='Export']");
    await shot("s9-export-360");
    await page.keyboard.press("Escape");
  }
  await page.goto(`${BASE}/schedule?view=week`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".bar-body");
  await page.click(".bar-body");
  await page.waitForSelector("[role=dialog]");
  await new Promise((r) => setTimeout(r, 500));
  const [update] = await page.$$("xpath/.//button[starts-with(@aria-label, 'Update status for')]");
  await update.evaluate((b) => b.click());
  await page.waitForFunction(() => document.body.innerText.includes("How did it go?"));
  log("update status sheet:", await page.$eval("[role=dialog]", (e) => e.innerText.replace(/\n+/g, " | ").slice(0, 160)));
  await shot("s9-update-status-360");
  await clickByText("[role=dialog] button", "Cancel");
  for (const view of ["Week", "Year"]) {
    await clickByText("[role=tab]", view);
    await new Promise((r) => setTimeout(r, 700));
    log(view, "child switch:", await page.$$eval(".child-switch button", (b) => b.map((x) => x.textContent)), "scrolls sideways:", !(await sw()));
  }
  log("PROBLEMS:", problems.length ? problems : "none");
}
