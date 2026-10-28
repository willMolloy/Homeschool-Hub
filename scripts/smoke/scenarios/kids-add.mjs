export default async function ({ page, shot, login, log, BASE }) {
  await page.goto(`${BASE}/kids`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForSelector(".roster-row:not(.skeleton)");
  // Keyboard only: focus the Add button via Tab, open with Enter, type, Enter.
  let label = "";
  for (let i = 0; i < 20 && label !== "Add child"; i++) {
    await page.keyboard.press("Tab");
    label = await page.evaluate(() => document.activeElement?.textContent ?? "");
  }
  log("focused:", label);
  await page.keyboard.press("Enter");
  await page.waitForSelector("form[aria-label='Add child']");
  log("focus in form:", await page.evaluate(() => document.activeElement?.id ? "name input" : document.activeElement?.tagName));
  await shot("s1-26-add-child-form-360");
  await page.keyboard.type("Keyboard Kid");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => [...document.querySelectorAll(".roster-name")].some((e) => e.textContent === "Keyboard Kid"), { timeout: 5000 });
  log("rows:", await page.$$eval(".roster-name", (r) => r.map((x) => x.textContent)));
  log("focus after add:", await page.evaluate(() => document.activeElement?.textContent));
  await shot("s1-26-after-add-360");
  // Error path: empty name
  await page.keyboard.press("Enter");
  await page.waitForSelector("form[aria-label='Add child']");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".field-error");
  await shot("s1-26-add-child-error-360");
  await page.keyboard.press("Escape");
  log("form closed:", (await page.$("form[aria-label='Add child']")) === null);
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".roster-row:not(.skeleton)");
  log("after reload:", await page.$$eval(".roster-name", (r) => r.map((x) => x.textContent)));
}
