export default async function ({ page, shot, login, log, BASE }) {
  // A name of its own each run, so the scenario can be run again on the same database.
  const N = `Spanish ${Date.now() % 100000}`;
  const names = () => page.$$eval(".roster-row-btn", (r) => r.map((x) => x.textContent));
  const clickText = async (sel, text) => {
    const els = await page.$$(sel);
    for (const e of els) if ((await e.evaluate((n) => n.textContent.trim())) === text) return e.evaluate((n) => { n.scrollIntoView({ block: "center" }); n.click(); }); // the tab bar covers the bottom of the screen
    throw new Error(`no ${sel} with text ${text}`);
  };
  const ready = () => page.waitForSelector(".roster-row-btn");
  await page.goto(`${BASE}/setup/subjects`, { waitUntil: "networkidle0" });
  await login();
  await ready();
  // The demo family has no Spanish: add one here, with a name of its own.
  await clickText("button", "Add subject");
  await page.waitForSelector("form[aria-label='Add subject']");
  await page.type("form[aria-label='Add subject'] input[type=text]", N);
  await page.keyboard.press("Enter");
  await page.waitForFunction((n) => [...document.querySelectorAll(".roster-name")].some((e) => e.textContent === n), {}, N);
  await clickText(".roster-row-btn", N);
  await page.waitForSelector(`form[aria-label='Edit ${N}']`);
  await shot("s1-33-edit-subject-360");
  const input = await page.$(`form[aria-label='Edit ${N}'] input[type=text]`);
  await input.click({ clickCount: 3 });
  await page.keyboard.type(`${N} I`);
  await page.$eval("input[name=color][value='#2f8fb0']", (i) => { i.scrollIntoView({ block: "center" }); i.click(); });
  await page.$eval(`form[aria-label='Edit ${N}'] button[type=submit]`, (b) => b.click()); // Enter on a swatch does not submit
  await page.waitForFunction((n) => [...document.querySelectorAll(".roster-name")].some((e) => e.textContent === `${n} I`), {}, N);
  await page.reload({ waitUntil: "networkidle0" }); await ready();
  const color = await page.evaluate((n) => {
    const b = [...document.querySelectorAll(".roster-row-btn")].find((x) => x.textContent === `${n} I`);
    return b && getComputedStyle(b.querySelector(".subject-badge")).backgroundColor;
  }, N);
  log("after rename+recolor reload:", await names(), "Spanish I color:", color);
  await clickText(".roster-row-btn", `${N} I`);
  await clickText("button", "Archive");
  await page.waitForSelector("dialog[open]");
  log("dialog:", await page.$eval("dialog[open]", (d) => d.innerText.replace(/\n+/g, " | ")));
  await shot("s1-33-archive-subject-confirm-360");
  await page.click("dialog[open] .btn:not(.btn-secondary)");
  await page.waitForFunction((n) => !document.querySelector("dialog[open]") && ![...document.querySelectorAll(".roster-name")].some((e) => e.textContent === `${n} I`), {}, N);
  await page.reload({ waitUntil: "networkidle0" }); await ready();
  log("after archive reload:", await names());
  await page.click(".roster-toggle input");
  await page.waitForSelector(".is-archived");
  await clickText(".roster-row-btn", `${N} IArchived`);
  await clickText("button", "Unarchive");
  await page.waitForFunction((n) => [...document.querySelectorAll(".roster-row-btn")].some((e) => e.textContent === `${n} I`), {}, N);
  await page.reload({ waitUntil: "networkidle0" }); await ready();
  log("after unarchive reload:", await names());
  await shot("s1-33-after-unarchive-subject-360");
}
