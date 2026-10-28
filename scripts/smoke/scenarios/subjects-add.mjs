export default async function ({ page, shot, login, log, BASE }) {
  await page.goto(`${BASE}/subjects`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForSelector(".roster-row-btn");
  let label = "";
  for (let i = 0; i < 30 && label !== "Add subject"; i++) {
    await page.keyboard.press("Tab");
    label = await page.evaluate(() => document.activeElement?.textContent ?? "");
  }
  log("focused:", label);
  await page.keyboard.press("Enter");
  await page.waitForSelector("form[aria-label='Add subject']");
  // Duplicate (case-insensitive) → 409 message
  await page.keyboard.type("math");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".field-error");
  log("409 message:", await page.$eval(".field-error", (e) => e.textContent));
  await shot("s1-32-add-subject-duplicate-360");
  // Fix the name and save
  await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
  await page.keyboard.type("Spanish");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => [...document.querySelectorAll(".roster-name")].some((e) => e.textContent === "Spanish"), { timeout: 5000 });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".roster-row-btn");
  log("after reload:", await page.$$eval(".roster-name", (r) => r.map((x) => x.textContent)));
  await shot("s1-32-after-add-subject-360");
}
