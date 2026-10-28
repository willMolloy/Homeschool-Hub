export default async function ({ page, shot, login, log, BASE }) {
  const names = () => page.$$eval(".roster-row-btn", (r) => r.map((x) => x.textContent));
  const clickText = async (sel, text) => {
    const els = await page.$$(sel);
    for (const e of els) if ((await e.evaluate((n) => n.textContent.trim())) === text) return e.click();
    throw new Error(`no ${sel} with text ${text}`);
  };
  const ready = () => page.waitForSelector(".roster-row-btn");
  await page.goto(`${BASE}/kids`, { waitUntil: "networkidle0" });
  await login();
  await ready();
  await clickText(".roster-row-btn", "Keyboard Kid");
  await page.waitForSelector("form[aria-label='Edit Keyboard Kid']");
  await shot("s1-27-edit-child-360");
  const input = await page.$("form[aria-label='Edit Keyboard Kid'] input[type=text]");
  await input.click({ clickCount: 3 });
  await page.keyboard.type("Ada");
  await page.click("input[aria-label='Purple']");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => [...document.querySelectorAll(".roster-name")].some((e) => e.textContent === "Ada"));
  await page.reload({ waitUntil: "networkidle0" }); await ready();
  const color = await page.evaluate(() => {
    const b = [...document.querySelectorAll(".roster-row-btn")].find((x) => x.textContent === "Ada");
    return b && getComputedStyle(b.querySelector(".color-dot")).backgroundColor;
  });
  log("after rename+recolor reload:", await names(), "Ada color:", color);
  await clickText(".roster-row-btn", "Ada");
  await clickText("button", "Archive");
  await page.waitForSelector("dialog[open]");
  log("dialog:", await page.$eval("dialog[open]", (d) => d.innerText.replace(/\n+/g, " | ")));
  await shot("s1-27-archive-confirm-360");
  await page.click("dialog[open] .btn:not(.btn-secondary)");
  await page.waitForFunction(() => !document.querySelector("dialog[open]") && ![...document.querySelectorAll(".roster-name")].some((e) => e.textContent === "Ada"));
  await page.reload({ waitUntil: "networkidle0" }); await ready();
  log("after archive reload:", await names());
  await page.click(".roster-toggle input");
  await page.waitForSelector(".is-archived");
  await clickText(".roster-row-btn", "AdaArchived");
  await clickText("button", "Unarchive");
  await page.waitForFunction(() => [...document.querySelectorAll(".roster-row-btn")].some((e) => e.textContent === "Ada"));
  await page.reload({ waitUntil: "networkidle0" }); await ready();
  log("after unarchive reload:", await names());
  await shot("s1-27-after-unarchive-360");
}
