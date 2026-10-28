export default async function ({ page, shot, login, log, BASE }) {
  await page.goto(`${BASE}/schedule/settings`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForFunction(() => location.pathname === "/schedule/settings", { timeout: 5000 });
  await page.waitForSelector("form[aria-label='Family settings']");
  const before = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    chips: [...document.querySelectorAll(".day-chip")].map((c) => c.getBoundingClientRect().width | 0),
    tz: document.querySelector("select").value,
    opts: document.querySelector("select").options.length,
  }));
  log("360 before", JSON.stringify(before));
  // Change the name, save, check header, then put it back.
  const nameSel = "form input[type=text]";
  const orig = await page.$eval(nameSel, (i) => i.value);
  await page.click(nameSel, { clickCount: 3 });
  await page.type(nameSel, orig + " (test)");
  await page.click("button[type=submit]");
  await page.waitForFunction(() => document.querySelector(".form-status")?.textContent === "Saved.", { timeout: 5000 });
  log("header after save:", await page.$eval(".shell-family", (e) => e.textContent));
  await shot("s2a-13-settings-saved-360");
  await page.click(nameSel, { clickCount: 3 });
  await page.type(nameSel, orig);
  await page.click("button[type=submit]");
  await page.waitForFunction((o) => document.querySelector(".shell-family")?.textContent === o, { timeout: 5000 }, orig);
  log("restored:", await page.$eval(".shell-family", (e) => e.textContent));
  // Client error: no school days.
  for (const cb of await page.$$(".day-chip input:checked")) await cb.click();
  await page.click("button[type=submit]");
  await page.waitForSelector(".day-picker .field-error");
  await shot("s2a-13-settings-error-360");
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`${BASE}/schedule/settings`, { waitUntil: "networkidle0" });
  await page.waitForSelector("form[aria-label='Family settings']");
  log("1280 sw", await page.evaluate(() => document.documentElement.scrollWidth));
  await shot("s2a-13-settings-1280", 1280, 800);
}
