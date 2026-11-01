import fs from "node:fs";
const AXE = fs.readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
export default async function ({ page, login, log, BASE }) {
  const run = async (where) => {
    await page.evaluate(AXE);
    const r = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations
      .map((v) => `${v.impact} ${v.id}: ${v.help} [${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}]`));
    log(where, r.length ? r : "clean");
  };
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" }); await run("login");
  await login(); await page.waitForSelector("nav[aria-label=Main]"); await page.waitForSelector("h1"); await run("home");
  for (const [name, path, ready] of [["track", "/track", "h1"], ["week", "/schedule?view=week", "h1"], ["year", "/schedule?view=year", "svg.tl-svg"], ["setup", "/setup", "h1"]]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" }); await page.waitForSelector(ready); await new Promise((r) => setTimeout(r, 400));
    await run(name);
  }
  for (const p of ["children", "subjects"]) {
    await page.goto(`${BASE}/setup/${p}`, { waitUntil: "networkidle0" }); await page.waitForSelector(".roster-row-btn");
    await run(p);
    await page.click(".roster-row-btn"); await page.waitForSelector("form"); await run(`${p}-edit`);
  }
}
