// S10-10b (M1): axe on the Records › Log form with a run of dates open, so the run's day chips are checked too (the other
// axe scenarios never open a run). Fails on any violation. Uses the smoke family (SMOKE_EMAIL), and saves its log setup if it
// has none; the Log form itself is filled but never saved.
import fs from "node:fs";
const AXE = fs.readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
export default async function ({ page, login, log, BASE }) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const settled = () => page.waitForFunction(() => document.getAnimations()
    .every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity), { timeout: 5000 });
  const found = [];
  const run = async (where) => {
    await settled();
    await page.evaluate(AXE);
    const r = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations
      .map((v) => `${v.impact} ${v.id}: ${v.help} [${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}]`));
    log(where, r.length ? r : "clean");
    found.push(...r.map((x) => `${where}: ${x}`));
  };
  const typeDate = async (sel, v) => {
    await page.$eval(sel, (i) => { i.scrollIntoView({ block: "center" }); i.focus(); i.select(); });
    await page.type(sel, v);
    await page.keyboard.press("Tab");
  };
  await page.goto(`${BASE}/records`, { waitUntil: "networkidle0" });
  await login(process.env.SMOKE_EMAIL); // a family that is not the demo: see README, "Smoke login"
  await page.waitForSelector("nav[aria-label=Main]");
  for (const w of [360, 1280]) {
    for (const [name, last] of [["short run", "11/08/2026"], ["long run", "11/29/2026"]]) {
      await page.setViewport({ width: w, height: 900 });
      await page.goto(`${BASE}/records`, { waitUntil: "networkidle0" });
      await wait(600);
      if (await page.$("form[aria-label='Log setup']")) {
        await page.click("form[aria-label='Log setup'] .choice-card input");
        await page.click("form[aria-label='Log setup'] button[type=submit]");
        await page.waitForFunction(() => !document.querySelector("form[aria-label='Log setup']"));
        await wait(600);
      }
      const [logBtn] = await page.$$("xpath/.//button[normalize-space()='Log']");
      await logBtn.evaluate((b) => b.click()); // the list's own Log button can sit under the sticky bar at 360
      await page.waitForSelector("form[aria-label='Log']");
      await typeDate("#log-first", "11/02/2026");
      await typeDate("#log-last", last);
      const kids = await page.$$("form[aria-label='Log'] .log-kids .chip");
      if (kids.length) await kids[0].evaluate((b) => b.click());
      await page.waitForSelector(".log-day-chips .chip:not([disabled])");
      await run(`${w} log ${name}`);
    }
  }
  if (found.length) throw new Error(`axe violations on the Log form:\n${found.join("\n")}`);
}
