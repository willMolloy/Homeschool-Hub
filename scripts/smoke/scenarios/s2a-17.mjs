export default async function ({ page, shot, login, log, BASE }) {
  const errs = [];
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/api/me")) errs.push(`${r.status()} ${r.url()}`); });
  await page.goto(`${BASE}/schedule/settings`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForFunction(() => location.pathname === "/schedule/settings");
  for (const W of [360, 1280]) {
    await page.setViewport({ width: W, height: W === 360 ? 740 : 800 });
    await page.goto(`${BASE}/schedule/settings`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => document.querySelectorAll("form select option").length > 100);
    const opts = await page.$$eval("form select option", (o) => o.map((x) => x.value));
    log(W, "options", opts.length, "Coyhaique", opts.includes("America/Coyhaique"), "Kolkata", opts.includes("Asia/Kolkata"), "Calcutta", opts.includes("Asia/Calcutta"), "sw", await page.evaluate(() => document.documentElement.scrollWidth));
    await shot(`s2a-17-settings-${W}`, W, W === 360 ? 740 : 800);
  }
  // Pick Asia/Kolkata, save, then put it back.
  await page.select("form select", "Asia/Kolkata");
  await page.click("form button[type=submit]");
  await page.waitForFunction(() => /Saved/.test(document.body.innerText));
  log("saved:", await page.$eval("form select", (s) => s.value));
  await page.select("form select", "America/Chicago");
  await page.click("form button[type=submit]");
  await page.waitForFunction(() => document.querySelector("form select").value === "America/Chicago" && /Saved/.test(document.body.innerText));
  log("restored; errors:", errs.length ? errs : "none");
}
