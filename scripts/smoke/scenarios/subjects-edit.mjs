export default async function ({ page, shot, login, log, BASE }) {
  const names = () => page.$$eval(".roster-row-btn", (r) => r.map((x) => x.textContent));
  const clickText = async (sel, text) => {
    const els = await page.$$(sel);
    for (const e of els) if ((await e.evaluate((n) => n.textContent.trim())) === text) return e.click();
    throw new Error(`no ${sel} with text ${text}`);
  };
  const ready = () => page.waitForSelector(".roster-row-btn");
  await page.goto(`${BASE}/subjects`, { waitUntil: "networkidle0" });
  await login();
  await ready();
  await clickText(".roster-row-btn", "Spanish");
  await page.waitForSelector("form[aria-label='Edit Spanish']");
  await shot("s1-33-edit-subject-360");
  const input = await page.$("form[aria-label='Edit Spanish'] input[type=text]");
  await input.click({ clickCount: 3 });
  await page.keyboard.type("Spanish I");
  await page.click("input[aria-label='Teal']");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => [...document.querySelectorAll(".roster-name")].some((e) => e.textContent === "Spanish I"));
  await page.reload({ waitUntil: "networkidle0" }); await ready();
  const color = await page.evaluate(() => {
    const b = [...document.querySelectorAll(".roster-row-btn")].find((x) => x.textContent === "Spanish I");
    return b && getComputedStyle(b.querySelector(".color-dot")).backgroundColor;
  });
  log("after rename+recolor reload:", await names(), "Spanish I color:", color);
  await clickText(".roster-row-btn", "Spanish I");
  await clickText("button", "Archive");
  await page.waitForSelector("dialog[open]");
  log("dialog:", await page.$eval("dialog[open]", (d) => d.innerText.replace(/\n+/g, " | ")));
  await shot("s1-33-archive-subject-confirm-360");
  await page.click("dialog[open] .btn:not(.btn-secondary)");
  await page.waitForFunction(() => !document.querySelector("dialog[open]") && ![...document.querySelectorAll(".roster-name")].some((e) => e.textContent === "Spanish I"));
  await page.reload({ waitUntil: "networkidle0" }); await ready();
  log("after archive reload:", await names());
  await page.click(".roster-toggle input");
  await page.waitForSelector(".is-archived");
  await clickText(".roster-row-btn", "Spanish IArchived");
  await clickText("button", "Unarchive");
  await page.waitForFunction(() => [...document.querySelectorAll(".roster-row-btn")].some((e) => e.textContent === "Spanish I"));
  await page.reload({ waitUntil: "networkidle0" }); await ready();
  log("after unarchive reload:", await names());
  await shot("s1-33-after-unarchive-subject-360");
}
