export default async function ({ page, shot, login, log, BASE }) {
  await page.goto(`${BASE}/schedule/days-off`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForFunction(() => location.pathname === "/schedule/days-off", { timeout: 5000 });
  await page.waitForSelector(".schedule-list, .schedule-empty");
  log("cards:", await page.$$eval(".schedule-card", (c) => c.length), "sw", await page.evaluate(() => document.documentElement.scrollWidth));
  await shot("s2a-15-days-off-list-360");
  const planText = async () => {
    await page.goto(`${BASE}/?week=2026-11-09`, { waitUntil: "networkidle0" });
    await page.waitForSelector("table");
    return page.$eval("table", (t) => t.innerText);
  };
  const before = await planText();
  await page.goto(`${BASE}/schedule/days-off`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".schedule-list, .schedule-empty");
  await page.click(".schedule-actions .btn");
  const form = "form[aria-label='Add days off']";
  await page.waitForSelector(form);
  const label = await page.$(`${form} input[type=text]`);
  await label.type("Smoke test break");
  await page.$$eval(`${form} input[type=date]`, (els) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const vals = ["2026-11-09", "2026-11-11"];
    els.forEach((el, i) => { set.call(el, vals[i]); el.dispatchEvent(new Event("input", { bubbles: true })); });
  });
  log("form sw", await page.evaluate(() => document.documentElement.scrollWidth));
  await shot("s2a-15-days-off-add-360");
  await page.$eval(`${form} button[type=submit]`, (b) => b.scrollIntoView({ block: "center" }));
  await page.click(`${form} button[type=submit]`);
  await page.waitForFunction(() => [...document.querySelectorAll(".card-title")].some((e) => e.textContent === "Smoke test break"), { timeout: 5000 });
  log("added; card:", await page.$$eval(".schedule-card", (c) => c.map((x) => x.innerText.replace(/\n/g, " | ")).join(" // ")));
  const after = await planText();
  log("plan changed:", before !== after);
  log("before:", JSON.stringify(before.split("\n").slice(0, 8)));
  log("after:", JSON.stringify(after.split("\n").slice(0, 8)));
  await shot("s2a-15-plan-after-add-360");
  await page.goto(`${BASE}/schedule/days-off`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".schedule-list");
  const btns = await page.$$(".schedule-card-btn");
  for (const b of btns) if ((await b.evaluate((e) => e.textContent)).includes("Smoke test break")) { await b.click(); break; }
  await page.waitForSelector("form.schedule-form");
  await shot("s2a-15-days-off-edit-360");
  await page.click("form.schedule-form .btn-danger");
  await page.waitForSelector("dialog[open]");
  log("dialog:", await page.$eval("dialog[open]", (d) => d.innerText.replace(/\n/g, " | ")));
  await page.click("dialog[open] .btn-danger, dialog[open] button.btn:not(.btn-secondary)");
  await page.waitForFunction(() => ![...document.querySelectorAll(".card-title")].some((e) => e.textContent === "Smoke test break"), { timeout: 5000 });
  log("deleted; plan back:", (await planText()) === before);
  await page.goto(`${BASE}/schedule/days-off`, { waitUntil: "networkidle0" });
  await page.setViewport({ width: 1280, height: 800 });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".schedule-list, .schedule-empty");
  log("1280 sw", await page.evaluate(() => document.documentElement.scrollWidth));
  await shot("s2a-15-days-off-1280", 1280, 800);
}
