// Sprint 2b screens: the subject "Default bar width" picker and the weekly check-in card. Read-only: nothing is saved.
export default async function ({ page, shot, login, log, BASE }) {
  const clickText = async (sel, text) => {
    for (const e of await page.$$(sel)) if ((await e.evaluate((n) => n.textContent.trim())).startsWith(text)) return e.click();
    throw new Error(`no ${sel} "${text}"`);
  };
  await page.goto(`${BASE}/subjects`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForSelector(".roster-row-btn");
  await clickText(".roster-row-btn", "Math");
  await page.waitForSelector("details.default-weight");
  await page.$eval("details.default-weight", (d) => { d.open = true; });
  await page.$eval("details.default-weight", (d) => d.scrollIntoView({ block: "start" }));
  log("picker legend:", await page.$eval("details.default-weight legend", (e) => e.textContent).catch(() => "?"));
  await shot("s2b-subject-width-picker-360", 360, 740);
  await shot("s2b-subject-width-picker-1280", 1280, 900);

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.textContent.includes("How did last week go?"), { timeout: 10000 });
  await shot("s2b-weekly-card-360", 360, 740);
  await shot("s2b-weekly-card-1280", 1280, 900);
  await clickText("button", "Adjust");
  await page.waitForSelector("input[type=range], input[type=number]");
  await shot("s2b-weekly-card-adjust-360", 360, 740);
  await shot("s2b-weekly-card-adjust-1280", 1280, 900);
  await clickText("button", "Review a past week");
  await new Promise((r) => setTimeout(r, 500));
  await shot("s2b-past-week-picker-360", 360, 740);
}
