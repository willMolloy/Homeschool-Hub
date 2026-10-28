// Full Schedule flow: settings → add assignment → add days off → add event → plan reflects each → clean up.
export default async function ({ page, shot, login, log, BASE }) {
  const W = Number(process.env.W || 360), H = W === 360 ? 740 : 800;
  const tag = `${W}`;
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error" && !/401/.test(m.text())) errs.push(m.text()); });
  page.on("requestfailed", (r) => errs.push("REQFAIL " + r.url()));
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/api/me")) errs.push(`${r.status()} ${r.url()}`); });
  await page.setViewport({ width: W, height: H });
  const sw = () => page.evaluate(() => document.documentElement.scrollWidth);
  const S = (name) => shot(`s2a-hardening-${name}-${tag}`, W, H);
  const setDates = (form, vals) => page.$$eval(`${form} input[type=date]`, (els, vals) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    els.forEach((el, i) => { if (vals[i] != null) { set.call(el, vals[i]); el.dispatchEvent(new Event("input", { bubbles: true })); } });
  }, vals);
  const click = async (sel) => { await page.$eval(sel, (b) => b.scrollIntoView({ block: "center" })); await page.click(sel); };
  const hasCard = (t) => page.waitForFunction((t) => [...document.querySelectorAll(".card-title")].some((e) => e.textContent === t), { timeout: 5000 }, t);
  const goneCard = (t) => page.waitForFunction((t) => ![...document.querySelectorAll(".card-title")].some((e) => e.textContent === t), { timeout: 5000 }, t);
  const go = async (p, sel = ".schedule-list, .schedule-empty") => { await page.goto(`${BASE}${p}`, { waitUntil: "networkidle0" }); await page.waitForSelector(sel); };
  const WEEK = "2026-11-16";
  const plan = async () => { await go(`/?week=${WEEK}`, "table"); return page.$$eval("table", (ts) => ts.map((t) => t.innerText)); };
  const totals = (tables) => tables.map((t) => t.split("\n").filter((l) => l.startsWith("Total")).slice(-1)[0]?.replace(/\t+/g, " "));

  await page.goto(`${BASE}/schedule`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForFunction(() => location.pathname === "/schedule");
  await page.waitForSelector(".schedule-hub, h1");
  await S("1-hub"); log("hub sw", await sw());

  // Settings: open, check values, save with no change ("Nothing to save.").
  await go("/schedule/settings", "form");
  await click("form button[type=submit]");
  await page.waitForFunction(() => /Nothing to save|Saved/.test(document.body.innerText), { timeout: 5000 });
  log("settings status:", await page.$eval(".form-status", (e) => e.textContent).catch(() => "?"), "sw", await sw());
  await S("2-settings");

  const p0 = await plan();
  log("plan before:", JSON.stringify(totals(p0)));

  // Assignment: 10 lessons Nov 16–20 for the first child.
  const A = `Hardening assignment ${tag}`;
  await go("/schedule/assignments");
  await click(".schedule-actions .btn");
  let form = "form[aria-label='Add assignment']";
  await page.waitForSelector(form);
  const subj = await page.$eval(`${form} select`, (s) => s.options[1].value);
  await page.select(`${form} select`, subj);
  const inputs = await page.$$(`${form} input[type=text], ${form} input[type=number]`);
  await inputs[0].type(A); await inputs[1].type("10");
  await setDates(form, [WEEK, "2026-11-20"]);
  await click(`${form} .choice-list input[type=checkbox]`);
  await S("3-assignment-add");
  await click(`${form} button[type=submit]`);
  await hasCard(A);
  await S("4-assignments-list"); log("assignments sw", await sw());
  const p1 = await plan();
  log("plan after assignment:", JSON.stringify(totals(p1)), "changed", JSON.stringify(p1) !== JSON.stringify(p0));

  // Days off: Monday Nov 16, whole family.
  const D = `Hardening day off ${tag}`;
  await go("/schedule/days-off");
  await click(".schedule-actions .btn");
  form = "form[aria-label='Add days off']";
  await page.waitForSelector(form);
  await (await page.$(`${form} input[type=text]`)).type(D);
  await setDates(form, [WEEK, WEEK]);
  await S("5-days-off-add");
  await click(`${form} button[type=submit]`);
  await hasCard(D);
  await S("6-days-off-list"); log("days off sw", await sw());
  const p2 = await plan();
  log("plan after day off:", JSON.stringify(totals(p2)));

  // Event: Wednesday, skip by default, whole family.
  const E = `Hardening event ${tag}`;
  await go("/schedule/events");
  await click(".schedule-actions .btn");
  form = "form[aria-label='Add event']";
  await page.waitForSelector(form);
  await (await page.$(`${form} input[type=text]`)).type(E);
  await click(`${form} input[aria-label=Wednesday]`);
  await page.select(`${form} select`, "skip");
  await S("7-event-add");
  await click(`${form} button[type=submit]`);
  await hasCard(E);
  await S("8-events-list"); log("events sw", await sw());
  const p3 = await plan();
  log("plan after event:", JSON.stringify(totals(p3)));
  await S("9-plan-reflects"); log("plan sw", await sw());

  // Clean up: archive the event and assignment, delete the day off, then the plan should match the start.
  const removeCard = async (path, title) => {
    await go(path, ".schedule-list");
    for (const b of await page.$$(".schedule-card-btn")) if ((await b.evaluate((e) => e.textContent)).includes(title)) { await b.evaluate((e) => e.scrollIntoView({ block: "center" })); await b.click(); break; }
    await page.waitForSelector("form.schedule-form");
    await click("form.schedule-form .btn-danger");
    await page.waitForSelector("dialog[open]");
    await page.click("dialog[open] .btn-danger, dialog[open] button.btn:not(.btn-secondary)");
    await goneCard(title);
  };
  await removeCard("/schedule/events", E);
  await removeCard("/schedule/days-off", D);
  await removeCard("/schedule/assignments", A);
  const p4 = await plan();
  log("plan restored:", JSON.stringify(p4) === JSON.stringify(p0));
  log("errors:", errs.length ? errs : "none");
}
