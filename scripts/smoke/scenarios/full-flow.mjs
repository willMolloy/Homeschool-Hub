// Hardening: login -> plan -> kids -> subjects -> plan, checking overflow, console errors, failed requests.
export default async function ({ page, shot, login, h1, log, BASE }) {
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
  await page.waitForSelector("table, .plan-empty, [role=alert]");
  log("plan h1:", await h1(), "tables:", (await page.$$("table")).length); await overflow("plan"); await shot(`hardening-2-plan-${W}`, W, H);
  await nav("Kids"); await page.waitForSelector(".roster-row-btn");
  log("kids:", await page.$$eval(".roster-row-btn", (r) => r.map((x) => x.textContent)));
  await overflow("kids"); await shot(`hardening-3-kids-${W}`, W, H);
  await clickText("button", "Add child"); await page.waitForSelector("form");
  await overflow("kids-add"); await shot(`hardening-4-kids-add-${W}`, W, H);
  await clickText("button", "Cancel");
  await clickText(".roster-row-btn", "Frank"); await page.waitForSelector("form[aria-label='Edit Frank']");
  await overflow("kids-edit"); await shot(`hardening-5-kids-edit-${W}`, W, H);
  await clickText("button", "Cancel");
  await nav("Subjects"); await page.waitForFunction(() => document.querySelector("h1")?.textContent === "Subjects" && document.querySelector(".roster-row-btn"));
  log("subjects:", await page.$$eval(".roster-row-btn", (r) => r.map((x) => x.textContent)));
  await overflow("subjects"); await shot(`hardening-6-subjects-${W}`, W, H);
  await clickText(".roster-row-btn", "Literature"); await page.waitForSelector("form[aria-label='Edit Literature']");
  await overflow("subjects-edit"); await shot(`hardening-7-subjects-edit-${W}`, W, H);
  await clickText("button", "Cancel");
  await nav("Plan"); await page.waitForSelector("table, .plan-empty");
  await page.click("button[aria-label='Next week']"); await page.waitForFunction(() => /Week of/.test(document.body.innerText));
  await new Promise((r) => setTimeout(r, 400));
  log("after next:", await page.$eval("body", (b) => (b.innerText.match(/Week of \S+/) || [""])[0]));
  await overflow("plan-next"); await shot(`hardening-8-plan-next-${W}`, W, H);
  await clickText("button", "Sign out"); await page.waitForSelector("#login-email");
  log("signed out ->", page.url());
  log("PROBLEMS:", problems.length ? problems : "none");
}
