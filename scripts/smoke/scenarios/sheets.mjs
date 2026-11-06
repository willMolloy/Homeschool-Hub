// S13-06: printable sheets end to end. Sign in as the demo family (read-only is enough: nothing is written), open Schedule · Week,
// choose Print sheets for a week and for a day (All children), and check the print page: one sheet per child with that child's name,
// no app bar or rail, a Back to Schedule, no minutes or effort words, paper boxes and a notes area; that Back returns to Schedule; and
// (page.pdf in Letter and A4) one page per child. window.print is replaced so no dialog opens.
//   npm run demo   (another terminal)       node flow.mjs sheets
import fs from "node:fs";

// S17-01: the screenshots are for looking at, not for the repo: they go to the temp folder (flow.mjs).
export const scratchScreens = true;

const AXE = fs.readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");

export default async function ({ page, shot, login, log, BASE }) {
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  const check = (ok, what) => { if (!ok) problems.push(what); };
  const sw = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  const axe = async (where) => {
    await page.evaluate(AXE);
    const r = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((v) => `${v.impact} ${v.id}: ${v.help}`));
    log("axe", where, r.length ? r : "clean");
    problems.push(...r.map((x) => `axe ${where}: ${x}`));
  };
  await page.evaluateOnNewDocument(() => { window.__printed = 0; window.print = () => { window.__printed += 1; }; });
  const clickText = async (selector, text) => {
    const [el] = await page.$$(`xpath/.//${selector}[normalize-space()='${text}' or @aria-label='${text}']`);
    if (!el) throw new Error(`no ${selector} "${text}"`);
    await el.evaluate((n) => n.scrollIntoView({ block: "center" }));
    await el.click();
  };
  const pdfPages = async (format) => ((Buffer.from(await page.pdf({ format, printBackground: true })).toString("latin1")).match(/\/Type \/Page\b/g) ?? []).length;

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForFunction(() => location.pathname === "/", { timeout: 15000 });
  const kids = await page.evaluate(async () => (await (await fetch("/api/children")).json()).filter((c) => !c.archived).map((c) => c.name));
  log("children:", kids.join(", "));

  for (const kind of ["week", "day"]) {
    await page.goto(`${BASE}/schedule?view=week`, { waitUntil: "networkidle0" });
    await page.waitForSelector(".print-sheets-btn");
    const size = await page.$eval(".print-sheets-btn", (b) => { const r = b.getBoundingClientRect(); return [r.width, r.height]; });
    check(size[0] >= 44 && size[1] >= 44, `the Print sheets button is ${size.join(" x ")}`);
    if (kind === "week") await shot("s13-06-print-sheets-button-360");
    await page.click(".print-sheets-btn");
    await page.waitForSelector(".print-form");
    await new Promise((r) => setTimeout(r, 500));
    if (kind === "day") await clickText("button", "Day");
    check(await sw(), `the Print sheets sheet scrolls sideways (${kind})`);
    await shot(`s13-06-print-sheets-${kind}-360`);
    await axe(`print sheets ${kind}`);
    await clickText("button", "Print");
    await page.waitForSelector(".sheet", { timeout: 15000 });
    const url = new URL(page.url());
    check(url.pathname === `/print/${kind}`, `Print went to ${url.pathname}`);
    check(url.searchParams.get("children") === "all", "the print page is not for All children");
    check(await page.waitForFunction(() => window.__printed >= 1, { timeout: 5000 }).then(() => true, () => false), "the print dialog was not asked for");

    const sheets = await page.$$eval(".sheet", (s) => s.map((x) => ({ name: x.querySelector("h1")?.textContent, notes: !!x.querySelector(".sheet-notes"), boxes: x.querySelectorAll(".sheet-box").length, text: x.textContent })));
    log(kind, "sheets:", sheets.map((s) => `${s.name} (${s.boxes} boxes)`).join("; "));
    check(sheets.length === kids.length, `${sheets.length} sheets for ${kids.length} children`);
    check(sheets.map((s) => s.name).join() === kids.join(), "the sheets are not one per child in order");
    check(sheets.every((s) => s.notes), "a sheet has no notes area");
    check(sheets.every((s) => !/minute|\bmin\b|effort|heavy|light/i.test(s.text)), "a sheet mentions minutes or effort");
    check(!(await page.$("nav, .shell-nav, .app-shell")), "the print page has app chrome");
    const bg = await page.$eval(".print-screen", (e) => getComputedStyle(e).backgroundColor);
    check(bg === "rgb(255, 255, 255)", `the print page background is ${bg}`);
    check(await sw(), `the print page scrolls sideways (${kind})`);
    await shot(`s13-06-print-${kind}-360`);
    await axe(`print ${kind}`);
    for (const format of ["Letter", "A4"]) {
      const n = await pdfPages(format);
      log(kind, format, "pages:", n);
      check(n === kids.length, `${kind} ${format}: ${n} pages for ${kids.length} children`);
    }
    // Back returns to Schedule.
    await clickText("a", "‹ Back");
    await page.waitForFunction(() => location.pathname === "/schedule", { timeout: 10000 });
  }

  if (problems.length) {
    for (const p of problems) log("PROBLEM:", p);
    throw new Error(`${problems.length} problem(s) in the sheets scenario`);
  }
  log("sheets scenario: ok");
}
