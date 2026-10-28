/* global document, location, getComputedStyle */
// Run from a puppeteer-core harness: flow.mjs passes { page, shot, login, log, BASE } (see overnight.md smoke notes).
// Tester: odd data (60-char names, emoji, RTL, 20 children) at WIDTH; checks overflow, console errors, failed requests.
export default async function ({ page, shot, login, log, BASE }) {
  const W = Number(process.env.WIDTH || 360), H = W >= 1000 ? 900 : 740;
  await page.setViewport({ width: W, height: H });
  const problems = [];
  page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !/401/.test(m.text())) problems.push(`console.${m.type()}: ${m.text()}`); });
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/api/me")) problems.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on("requestfailed", (r) => problems.push(`failed ${r.url()}`));
  page.on("dialog", (d) => { problems.push(`unexpected dialog: ${d.message()}`); d.dismiss(); });
  const overflow = async (where) => {
    const o = await page.evaluate(() => {
      const de = document.documentElement;
      const wide = [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > de.clientWidth + 1 && getComputedStyle(e).position !== "fixed").slice(0, 3).map((e) => e.tagName + "." + e.className);
      return { sw: de.scrollWidth, cw: de.clientWidth, wide };
    });
    if (o.sw > o.cw) problems.push(`${where}: horizontal overflow ${o.sw} > ${o.cw} (${o.wide.join(", ")})`);
    log(where, "scrollWidth", o.sw, "clientWidth", o.cw);
  };
  const nav = async (name) => {
    for (const l of await page.$$("nav[aria-label=Main] a")) if ((await l.evaluate((n) => n.textContent.trim())) === name) { await l.click(); return; }
    throw new Error(`no nav ${name}`);
  };
  const clickText = async (sel, text) => {
    for (const e of await page.$$(sel)) if ((await e.evaluate((n) => n.textContent.trim())).startsWith(text)) return e.click();
    throw new Error(`no ${sel} "${text}"`);
  };
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await login("tester-odd@example.com", "demo-password");
  await page.waitForFunction(() => !location.pathname.startsWith("/login") || document.querySelector("[role=alert]"), { timeout: 10000 });
  log("after login:", await page.evaluate(() => location.pathname + " " + (document.querySelector("[role=alert]")?.textContent ?? "")));
  await page.goto(`${BASE}/?week=2026-10-26`, { waitUntil: "networkidle0" });
  log("plan tables:", (await page.$$("table")).length);
  await overflow("plan"); await shot(`tester-1-plan-${W}`, W, H);
  await nav("Kids"); await page.waitForSelector(".roster-row-btn");
  const kids = await page.$$eval(".roster-row-btn", (r) => r.map((x) => x.textContent));
  log("kids:", kids.length);
  if (kids.length !== 20) problems.push(`expected 20 kids, saw ${kids.length}`);
  if (!kids.some((k) => k.includes("<script>"))) problems.push("script-tag name not shown literally");
  await overflow("kids"); await shot(`tester-2-kids-${W}`, W, H);
  await clickText("button", "Add child"); await page.waitForSelector("form");
  await page.type("form input[type=text], form input:not([type])", "🦕".repeat(30));
  await shot(`tester-3-kids-add-emoji-${W}`, W, H);
  await page.keyboard.press("Enter");
  await new Promise((r) => setTimeout(r, 800));
  const err = await page.$eval("form", (f) => f.innerText).catch(() => "(form closed)");
  log("after 30-emoji add:", err.slice(0, 120));
  await overflow("kids-add"); await shot(`tester-4-kids-after-add-${W}`, W, H);
  if (err !== "(form closed)") await clickText("button", "Cancel");
  await clickText(".roster-row-btn", "Maximilian"); await page.waitForSelector("form[aria-label^='Edit']");
  await overflow("kids-edit"); await shot(`tester-5-kids-edit-long-${W}`, W, H);
  await clickText("button", "Cancel");
  await nav("Subjects"); await page.waitForFunction(() => document.querySelector("h1")?.textContent === "Subjects" && document.querySelector(".roster-row-btn"));
  log("subjects:", await page.$$eval(".roster-row-btn", (r) => r.map((x) => x.textContent)));
  await overflow("subjects"); await shot(`tester-6-subjects-${W}`, W, H);
  await nav("Plan"); await page.waitForSelector("table, .plan-empty");
  await clickText("button", "Sign out"); await page.waitForSelector("#login-email");
  log("PROBLEMS:", problems.length ? problems : "none");
}
