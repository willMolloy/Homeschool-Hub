// S11-07: a brand-new family's first run. Sign in as fresh@example.com (seed-second-family.ts makes it: not set up, step 1),
// walk the setup flow with one step put off ("I'll get back to you on this" for the breaks), land on Home with only that
// reminder, then see exactly one hint on Schedule's Year. Writes to the family, so reseed it before each run:
//   DATABASE_URL=postgres://hh:hh@localhost:5432/hh_dev npx tsx scripts/smoke/seed-second-family.ts
//   node flow.mjs new-family
import fs from "node:fs";
import { fillDates, PLAIN_INPUTS } from "../common.mjs";

const AXE = fs.readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");

export default async function ({ page, shot, login, log, BASE }) {
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  const check = (ok, what) => { if (!ok) problems.push(what); };
  const sw = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  const text = () => page.evaluate(() => document.body.innerText);
  const waitText = (t) => page.waitForFunction((s) => document.body.innerText.includes(s), { timeout: 15000 }, t);
  const click = async (sel, label) => {
    for (const e of await page.$$(sel)) if ((await e.evaluate((n) => n.textContent.trim())) === label) return e.click();
    throw new Error(`no ${sel} "${label}"`);
  };
  // axe on each screen (after animations settle, so a fading colour is not read as a contrast failure); any violation is a problem.
  const axe = async (where) => {
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity), { timeout: 5000 });
    await page.evaluate(AXE);
    const r = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations
      .map((v) => `${v.impact} ${v.id}: ${v.help} [${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}]`));
    log("axe", where, r.length ? r : "clean");
    problems.push(...r.map((x) => `axe ${where}: ${x}`));
  };
  const step = async (n, name) => {
    await waitText(`Step ${n} of 6`);
    check(await sw(), `step ${n} scrolls sideways`);
    log(`step ${n}:`, await page.$eval("h1", (e) => e.textContent));
    await shot(`s11-07-${name}-360`);
    await axe(`step ${n}`);
  };

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await login("fresh@example.com");
  await page.waitForFunction(() => location.pathname === "/welcome", { timeout: 15000 });
  await step(1, "step1");
  check(!(await page.$("nav")), "the setup flow shows the tab bar");
  await click("button", "Continue");

  await step(2, "step2");
  await page.type(PLAIN_INPUTS, "Frank");
  await click("button", "Add another");
  await page.waitForFunction(() => document.querySelectorAll(".welcome-list li").length === 1);
  await page.type(PLAIN_INPUTS, "Margaret");
  await click("button", "Continue");

  await step(3, "step3");
  // Closing the tab and coming back resumes at the step reached.
  await page.reload({ waitUntil: "networkidle0" });
  await waitText("Step 3 of 6");
  await click("button", "Continue");

  await step(4, "step4");
  await fillDates(page, "main form", ["Aug 17, 2026", "May 21, 2027"]);
  await click(".shape-card .shape-name", "Three terms");
  await waitText("Adds 3 term views and 2 breaks");
  log("preview:", await page.$eval(".welcome-preview", (e) => e.textContent));
  await click("button", "Continue");

  await step(5, "step5");
  await click("button", "I'll get back to you on this");

  await step(6, "step6");
  await click(".welcome-chips button", "Math");
  await click(".welcome-chips button", "Literature");
  await click("button", "Continue");
  await waitText("You're all set");
  await shot("s11-07-all-set-360");
  await axe("all set");
  await click("button", "Go to Home");
  await page.waitForSelector(".home-checklist");
  const reminders = await page.$$eval(".home-checklist .checklist-row", (a) => a.map((x) => x.textContent.trim()));
  log("home reminders:", reminders);
  check(reminders.length === 1 && reminders[0] === "Add your breaks", `home reminders are ${JSON.stringify(reminders)}, not just "Add your breaks"`);
  check(!(await text()).includes("books and lessons"), "Home asks for books and lessons");
  await shot("s11-07-home-360");
  await axe("home with a reminder");

  // What the flow saved is in Set up.
  await page.goto(`${BASE}/setup/children`, { waitUntil: "networkidle0" });
  log("children:", await page.$$eval(".roster-name", (r) => r.map((x) => x.textContent)));
  // One assignment, so Year has bars: through the app's own API (the Add sheet has its own scenarios).
  const made = await page.evaluate(async () => {
    const get = async (p) => (await fetch(p)).json();
    const [kids, subjects] = await Promise.all([get("/api/children"), get("/api/subjects")]);
    const math = subjects.find((s) => s.name === "Math");
    const res = await fetch("/api/assignments", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ subjectId: math.id, title: "Math 5", unitType: "pages", totalUnits: 200, startDate: "2026-08-17", endDate: "2027-05-21", childIds: kids.map((k) => k.id) }),
    });
    return res.status;
  });
  check(made === 201, `the assignment was not created (${made})`);

  await page.goto(`${BASE}/schedule?view=year`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[data-tip]", { timeout: 15000 });
  const first = await page.$$eval("[data-tip] .tip-text", (t) => t.map((x) => x.textContent));
  log("hint 1:", first);
  check(first.length === 1 && first[0].startsWith("Thicker bars"), `first hint is ${JSON.stringify(first)}`);
  check(await sw(), "Year with a hint scrolls sideways");
  await shot("s11-07-hint-360");
  await axe("year with a hint");
  await click("[data-tip] button", "Got it");
  await page.waitForFunction(() => document.querySelector("[data-tip] .tip-text")?.textContent.startsWith("Tap an icon"), { timeout: 5000 });
  const second = await page.$$eval("[data-tip] .tip-text", (t) => t.map((x) => x.textContent));
  log("hint 2:", second);
  check(second.length === 1, `two hints at once: ${JSON.stringify(second)}`);
  log("PROBLEMS:", problems.length ? problems : "none");
}
