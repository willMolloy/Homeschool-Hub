// S9b-04: dates are typed into the DateField (US text, then blur).
import { PLAIN_INPUTS, fillDates } from "../common.mjs";

export default async function ({ page, shot, login, log, BASE }) {
  await page.goto(`${BASE}/setup/assignments`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForFunction(() => location.pathname === "/setup/assignments", { timeout: 5000 });
  await page.waitForSelector(".schedule-list, .schedule-empty");
  log("cards:", await page.$$eval(".schedule-card", (c) => c.length), "sw", await page.evaluate(() => document.documentElement.scrollWidth));
  await shot("s2a-14-assignments-list-360");
  const planText = async () => {
    await page.goto(`${BASE}/schedule?view=week&week=2026-11-02&debug=1`, { waitUntil: "networkidle0" });
    await page.waitForSelector("table");
    return page.$eval("table", (t) => t.innerText);
  };
  const before = await planText();
  await page.goto(`${BASE}/setup/assignments`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".schedule-list");
  // Add one through the form.
  await page.click(".schedule-actions .btn");
  const form = "form[aria-label='Add assignment']";
  await page.waitForSelector(form);
  const subj = await page.$eval(`${form} select`, (s) => s.options[1].value);
  await page.select(`${form} select`, subj);
  const inputs = await page.$$(`${form} ${PLAIN_INPUTS}`);
  await inputs[0].type("Smoke test assignment");
  await inputs[1].type("10");
  await fillDates(page, form, ["Nov 2, 2026", "Nov 13, 2026"]); // S9b-04: typed into the DateField, US style
  const kid = await page.$(`${form} .choice-list input[type=checkbox]`);
  await kid.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await kid.click();
  log("form sw", await page.evaluate(() => document.documentElement.scrollWidth));
  await shot("s2a-14-assignments-add-360");
  await page.$eval(`${form} button[type=submit]`, (b) => b.scrollIntoView({ block: "center" }));
  await page.click(`${form} button[type=submit]`);
  await page.waitForFunction(() => [...document.querySelectorAll(".card-title")].some((e) => e.textContent === "Smoke test assignment"), { timeout: 5000 });
  log("added; cards:", await page.$$eval(".schedule-card", (c) => c.length));
  // It shows on the plan debug view for that week.
  const after = await planText();
  log("plan (first child) changed:", before !== after);
  log("before:", JSON.stringify(before.split("\n").slice(0, 4)));
  log("after:", JSON.stringify(after.split("\n").slice(0, 4)));
  await shot("s2a-14-plan-after-add-360");
  // Archive it again so the demo data is unchanged.
  await page.goto(`${BASE}/setup/assignments`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".schedule-list");
  const btns = await page.$$(".schedule-card-btn");
  for (const b of btns) if ((await b.evaluate((e) => e.textContent)).includes("Smoke test assignment")) { await b.click(); break; }
  await page.waitForSelector("form.schedule-form");
  await shot("s2a-14-assignments-edit-360");
  await page.click("form.schedule-form .btn-danger");
  await page.waitForSelector("dialog[open]");
  await page.click("dialog[open] .btn-danger, dialog[open] button.btn:not(.btn-secondary)");
  await page.waitForFunction(() => ![...document.querySelectorAll(".card-title")].some((e) => e.textContent === "Smoke test assignment"), { timeout: 5000 });
  log("archived again");
  await page.setViewport({ width: 1280, height: 800 });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".schedule-list");
  log("1280 sw", await page.evaluate(() => document.documentElement.scrollWidth));
  await shot("s2a-14-assignments-1280", 1280, 800);
}
