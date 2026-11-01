export default async function ({ page, shot, login, log, BASE }) {
  await page.goto(`${BASE}/setup/settings`, { waitUntil: "networkidle0" });
  await login(process.env.SMOKE_EMAIL); // not the demo family: the demo cannot change its settings
  await page.waitForFunction(() => location.pathname === "/setup/settings", { timeout: 15000 });
  await page.waitForSelector("form[aria-label='Family settings']");
  const before = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    chips: [...document.querySelectorAll(".day-chip")].map((c) => c.getBoundingClientRect().width | 0),
    tz: document.querySelector("select").value,
    opts: document.querySelector("select").options.length,
  }));
  log("360 before", JSON.stringify(before));
  // Change the name, save, check header, then put it back.
  // The header is gone (S8-04): the family name is read from the API.
  const familyName = () => page.evaluate(() => fetch("/api/me").then((r) => r.json()).then((m) => m.name));
  // The tab bar covers a submit button near the bottom of the screen, so scroll it to the middle first.
  const submit = () => page.$eval("button[type=submit]", (b) => { b.scrollIntoView({ block: "center" }); b.click(); });
  const nameSel = "form input[type=text]";
  const orig = await page.$eval(nameSel, (i) => i.value);
  await page.click(nameSel, { clickCount: 3 });
  await page.type(nameSel, orig + " (test)");
  await submit();
  await page.waitForFunction(() => document.querySelector(".form-status")?.textContent === "Saved.", { timeout: 15000 });
  log("name after save:", await familyName());
  await shot("s2a-13-settings-saved-360");
  await page.click(nameSel, { clickCount: 3 });
  await page.type(nameSel, orig);
  await submit();
  await new Promise((r) => setTimeout(r, 1000)); // the second save
  log("restored:", await familyName());
  // Client error: no school days.
  for (const cb of await page.$$(".day-chip input:checked")) await cb.click();
  await submit();
  await page.waitForSelector(".day-picker .field-error");
  await shot("s2a-13-settings-error-360");
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`${BASE}/setup/settings`, { waitUntil: "networkidle0" });
  await page.waitForSelector("form[aria-label='Family settings']");
  log("1280 sw", await page.evaluate(() => document.documentElement.scrollWidth));
  await shot("s2a-13-settings-1280", 1280, 800);
}
