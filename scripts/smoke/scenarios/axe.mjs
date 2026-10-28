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
  await login(); await page.waitForSelector("table"); await run("plan");
  for (const p of ["kids", "subjects"]) {
    await page.goto(`${BASE}/${p}`, { waitUntil: "networkidle0" }); await page.waitForSelector(".roster-row-btn");
    await run(p);
    await page.click(".roster-row-btn"); await page.waitForSelector("form"); await run(`${p}-edit`);
  }
}
