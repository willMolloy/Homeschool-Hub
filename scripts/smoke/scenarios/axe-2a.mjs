import fs from "node:fs";
const AXE = fs.readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
export default async function ({ page, login, log, BASE }) {
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("requestfailed", (r) => errs.push("REQFAIL " + r.url()));
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/api/me")) errs.push(`${r.status()} ${r.url()}`); });
  const run = async (where) => {
    await page.evaluate(AXE);
    const r = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations
      .map((v) => `${v.impact} ${v.id}: ${v.help} [${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}]`));
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    log(where, r.length ? r : "clean", "sw", sw);
  };
  await page.goto(`${BASE}/schedule`, { waitUntil: "networkidle0" });
  await login(); await page.waitForFunction(() => location.pathname === "/schedule"); await page.waitForSelector("h1");
  for (const w of [360, 1280]) {
    await page.setViewport({ width: w, height: 800 });
    await page.goto(`${BASE}/schedule`, { waitUntil: "networkidle0" }); await run(`${w} hub`);
    await page.goto(`${BASE}/schedule/settings`, { waitUntil: "networkidle0" }); await page.waitForSelector("form"); await run(`${w} settings`);
    for (const p of ["assignments", "days-off", "events"]) {
      await page.goto(`${BASE}/schedule/${p}`, { waitUntil: "networkidle0" }); await page.waitForSelector(".schedule-list, .schedule-empty");
      await run(`${w} ${p}`);
      await page.click(".schedule-actions .btn"); await page.waitForSelector("form.schedule-form"); await run(`${w} ${p}-add`);
      await page.click("form.schedule-form button[type=submit]"); await new Promise((r) => setTimeout(r, 200)); await run(`${w} ${p}-add-errors`);
      await page.goto(`${BASE}/schedule/${p}`, { waitUntil: "networkidle0" }); await page.waitForSelector(".schedule-card-btn");
      await page.click(".schedule-card-btn"); await page.waitForSelector("form.schedule-form"); await run(`${w} ${p}-edit`);
      await page.click("form.schedule-form .btn-danger"); await page.waitForSelector("dialog[open]"); await run(`${w} ${p}-confirm`);
    }
  }
  log("errors:", errs.length ? errs : "none");
}
