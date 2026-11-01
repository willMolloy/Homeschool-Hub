// Hardening: login -> Home -> Schedule · Week -> children -> subjects -> Week, checking overflow, console errors, failed requests.
export default async function ({ page, shot, login, signOut, h1, log, BASE }) {
  const W = Number(process.env.WIDTH || 360), H = W >= 1000 ? 900 : 740;
  await page.setViewport({ width: W, height: H });
  const problems = [];
  page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !/401/.test(m.text())) problems.push(`console.${m.type()}: ${m.text()}`); });
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/api/me")) problems.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on("requestfailed", (r) => problems.push(`failed ${r.url()}`));
  const overflow = async (where) => {
    const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    if (o.sw > o.cw) problems.push(`${where}: horizontal overflow ${o.sw} > ${o.cw}`);
  };
  const nav = async (name) => {
    const links = await page.$$("nav[aria-label=Main] a");
    for (const l of links) if ((await l.evaluate((n) => n.textContent.trim())) === name) { await l.click(); return; }
    throw new Error(`no nav ${name}`);
  };
  const clickText = async (sel, text) => {
    for (const e of await page.$$(sel)) if ((await e.evaluate((n) => n.textContent.trim())) === text) return e.click();
    throw new Error(`no ${sel} "${text}"`);
  };
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await overflow("login"); await shot(`hardening-1-login-${W}`, W, H);
  await login();
  await page.waitForSelector("button[aria-label='Family and settings']");
  log("home h1:", await h1()); await overflow("home"); await shot(`hardening-2-plan-${W}`, W, H);
  await nav("Schedule"); await page.waitForSelector(".bar, .week-empty, [role=alert]");
  log("schedule h1:", await h1(), "bars:", (await page.$$(".bar")).length); await overflow("week");
  await page.goto(`${BASE}/setup/children`, { waitUntil: "networkidle0" }); await page.waitForSelector(".roster-row-btn");
  log("kids:", await page.$$eval(".roster-row-btn", (r) => r.map((x) => x.textContent)));
  await overflow("kids"); await shot(`hardening-3-kids-${W}`, W, H);
  await clickText("button", "Add child"); await page.waitForSelector("form");
  await overflow("kids-add"); await shot(`hardening-4-kids-add-${W}`, W, H);
  await clickText("button", "Cancel");
  await clickText(".roster-row-btn", "Frank"); await page.waitForSelector("form[aria-label='Edit Frank']");
  await overflow("kids-edit"); await shot(`hardening-5-kids-edit-${W}`, W, H);
  await clickText("button", "Cancel");
  await page.goto(`${BASE}/setup/subjects`, { waitUntil: "networkidle0" }); await page.waitForFunction(() => document.querySelector("h1")?.textContent === "Subjects" && document.querySelector(".roster-row-btn"));
  log("subjects:", await page.$$eval(".roster-row-btn", (r) => r.map((x) => x.textContent)));
  await overflow("subjects"); await shot(`hardening-6-subjects-${W}`, W, H);
  await clickText(".roster-row-btn", "Literature"); await page.waitForSelector("form[aria-label='Edit Literature']");
  await overflow("subjects-edit"); await shot(`hardening-7-subjects-edit-${W}`, W, H);
  await clickText("button", "Cancel");
  await page.goto(`${BASE}/schedule?view=week`, { waitUntil: "networkidle0" }); await page.waitForSelector(".bar, .week-empty");
  await page.click("button[aria-label='Next week']"); await page.waitForFunction(() => /Coming week/.test(document.body.innerText));
  await new Promise((r) => setTimeout(r, 400));
  log("after next:", await page.$eval("main h2", (b) => b.textContent));
  await overflow("plan-next"); await shot(`hardening-8-plan-next-${W}`, W, H);
  await signOut(); await page.waitForSelector("#login-email");
  log("signed out ->", page.url());
  log("PROBLEMS:", problems.length ? problems : "none");
}
