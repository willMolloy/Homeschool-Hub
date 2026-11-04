// S12-07: "Did Frank finish…?" end to end. Sign in as smoke@example.com (seed-second-family.ts: the demo data under another login),
// add two assignments that ended yesterday through the app's own API, then answer from Home each way: Yes, finished, Not yet
// and We stopped (the demo's poems, which ended last week, is a third question). Checks the needs-you dot appears with the
// right name and clears when the last question is answered, that Year draws the finished and stopped bars as such, that Not yet
// moved the end, and that nothing scrolls sideways or fails axe. Writes to the family, so reseed before each run:
//   DATABASE_URL=postgres://hh:hh@localhost:5432/hh_dev npx tsx scripts/smoke/seed-second-family.ts
//   node flow.mjs completion
import fs from "node:fs";

const AXE = fs.readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const day = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

export default async function ({ page, shot, login, log, BASE }) {
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  const check = (ok, what) => { if (!ok) problems.push(what); };
  const sw = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  const axe = async (where) => {
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity), { timeout: 5000 });
    await page.evaluate(AXE);
    const r = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations
      .map((v) => `${v.impact} ${v.id}: ${v.help} [${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}]`));
    log("axe", where, r.length ? r : "clean");
    problems.push(...r.map((x) => `axe ${where}: ${x}`));
  };
  const api = (method, path, body) => page.evaluate(async (m, p, b) => {
    const res = await fetch(p, { method: m, headers: b ? { "content-type": "application/json" } : {}, body: b ? JSON.stringify(b) : undefined });
    return res.status === 204 ? null : res.json();
  }, method, path, body);
  const homeName = () => page.$eval(".shell-nav a[href='/']", (a) => a.getAttribute("aria-label") ?? a.textContent.trim());
  const clickButton = async (selector) => { const b = await page.waitForSelector(selector); await b.evaluate((n) => n.scrollIntoView({ block: "center" })); await b.click(); };
  const saveAnswer = async () => {
    await page.waitForSelector("[role=dialog] form");
    await new Promise((r) => setTimeout(r, 500)); // the sheet slides in
    const [save] = await page.$$("xpath/.//button[normalize-space()='Save']");
    await save.click();
  };

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await login("smoke@example.com");
  await page.waitForFunction(() => location.pathname === "/", { timeout: 15000 });

  // Two assignments that ended yesterday.
  const me = await api("GET", "/api/me");
  const children = await api("GET", "/api/children");
  const subjects = await api("GET", "/api/subjects");
  const yesterday = day(me.today, -1);
  for (const title of ["Smoke book A", "Smoke book B"]) {
    const made = await api("POST", "/api/assignments", {
      subjectId: subjects[0].id, title, unitType: "pages", totalUnits: 100, startDate: day(yesterday, -13), endDate: yesterday, childIds: [children[0].id],
    });
    check(made && made.id, `could not create ${title}: ${JSON.stringify(made)}`);
  }

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".home-question");
  const heading = await page.$eval(".home-question h2", (e) => e.textContent);
  log("question:", heading);
  check(/assignments ended/.test(heading), `expected the several-waiting card, got "${heading}"`);
  const waiting = Number(heading.match(/^(\d+)/)?.[1] ?? 0);
  check(waiting >= 3, `expected at least 3 waiting (A, B and the poems), got ${waiting}`);
  const name = await homeName();
  log("home link:", name);
  check(name === `Home, ${waiting} things need you`, `Home's name is "${name}"`);
  check(!!(await page.$(".shell-nav-dot")), "the needs-you dot is missing");
  check(await sw(), "Home scrolls sideways with the question");
  await shot("s12-07-home-question-360");
  await axe("home with the question");

  await clickButton(".home-question .btn");
  await page.waitForSelector("[role=dialog] .question-list");
  await new Promise((r) => setTimeout(r, 500));
  await shot("s12-07-list-360");
  await axe("the list sheet");

  // A: Yes, finished (one tap: it saves on yesterday, its end, with no date sheet). B: Not yet (a new end a week from today).
  await clickButton("[role=dialog] button[aria-label='Yes, finished: Smoke book A']");
  await page.waitForFunction(() => !document.querySelector("[aria-label='Yes, finished: Smoke book A']"));
  const one = waiting - 1;
  await page.waitForFunction((n) => document.querySelector(".shell-nav a[href='/']")?.getAttribute("aria-label") === n, { timeout: 5000 }, `Home, ${one} ${one === 1 ? "thing needs" : "things need"} you`);
  await clickButton("[role=dialog] button[aria-label='Not yet: Smoke book B']");
  await saveAnswer();
  await page.waitForFunction(() => !document.querySelector("[aria-label='Not yet: Smoke book B']"));
  // Everything else (the poems and anything else that has ended): We stopped.
  for (;;) {
    // The sheet goes back to the list after each answer; give it a moment to show the next row (or to close on the last).
    await page.waitForSelector("[role=dialog] .question-row", { timeout: 2500 }).catch(() => null);
    const row = await page.$("[role=dialog] .question-row button[aria-label^='We stopped: ']");
    if (!row) break;
    await row.click();
    await saveAnswer();
    await new Promise((r) => setTimeout(r, 600));
  }
  await page.waitForFunction(() => !document.querySelector(".home-question"), { timeout: 10000 });
  await page.waitForFunction(() => !document.querySelector(".shell-nav-dot"), { timeout: 10000 });
  log("home link after the last answer:", await homeName());
  check((await homeName()) === "Home", "the dot did not clear");
  await shot("s12-07-home-answered-360");

  // What the answers did.
  const list = await api("GET", "/api/assignments");
  const get = (t) => list.find((a) => a.title === t);
  check(get("Smoke book A")?.endedAs === "finished" && get("Smoke book A")?.endedOn === yesterday, `A is ${JSON.stringify(get("Smoke book A"))}`);
  check(get("Smoke book B")?.endedAs === null && get("Smoke book B")?.endDate === day(me.today, 7), `B is ${JSON.stringify(get("Smoke book B"))}: Not yet should move the end a week on, still open`);
  const stopped = list.filter((a) => a.endedAs === "stopped");
  check(stopped.length >= 1, "no assignment was marked stopped");
  log("stopped:", stopped.map((a) => a.title).join(", "));

  // The Year view draws them.
  await page.goto(`${BASE}/schedule?view=year`, { waitUntil: "networkidle0" });
  await page.waitForSelector("path.tl-band");
  const ended = await page.$$eval("path.tl-band[data-ended]", (p) => [...new Set(p.map((x) => x.dataset.ended))].sort());
  log("ended bars drawn as:", ended.join(", "));
  check(ended.includes("finished") && ended.includes("stopped"), `Year draws ${JSON.stringify(ended)} bars`);
  check(await sw(), "Year scrolls sideways");
  await shot("s12-07-year-360");
  await axe("year");
  // Home no longer says anything about them: no question, and the briefing never names answered work.
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  check(!(await page.$(".home-question")), "the question came back after every answer");
  check(!(await page.evaluate(() => /Smoke book A|Smoke book B|Garden of Verses/.test(document.querySelector(".home-briefing")?.textContent ?? ""))), "the briefing still mentions an answered assignment");

  if (problems.length) {
    for (const p of problems) log("PROBLEM:", p);
    throw new Error(`${problems.length} problem(s) in the completion scenario`);
  }
  log("completion scenario: ok");
}
