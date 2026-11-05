// S16-03: Schedule · Week as Days end to end. Sign in as the demo family (nothing is written), open Schedule · Week (Bars is the default),
// toggle to Days (it is remembered after a reload), and check at 360 and 1280 px, light and dark: every school day is on the page in one
// view, no sideways scroll, no control under 44 px, axe clean, under All children each line has a child's initial, and the day lines
// (child, day, title, range) equal the printed weekly sheet's rows for the same week. A line opens the week adjustment; nothing is saved.
//   npm run demo   (another terminal)       node flow.mjs days
import fs from "node:fs";

const AXE = fs.readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");

export default async function ({ page, login, log, BASE }) {
  const problems = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  const check = (ok, what) => { if (!ok) problems.push(what); };
  const sw = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  const undersized = () => page.evaluate(() => [...document.querySelectorAll("button, a, input, select")].filter((e) => {
    const b = e.getBoundingClientRect();
    return b.width > 0 && b.height > 0 && (b.width < 43.5 || b.height < 43.5) && !/skip/i.test(e.textContent ?? "");
  }).map((e) => `${e.tagName} ${(e.getAttribute("aria-label") ?? e.textContent ?? "").trim().slice(0, 30)}`));
  const axe = async (where) => {
    await page.evaluate(AXE);
    const r = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((v) => `${v.impact} ${v.id}: ${v.help}`));
    log("axe", where, r.length ? r : "clean");
    problems.push(...r.map((x) => `axe ${where}: ${x}`));
  };
  const WEEK = `${BASE}/schedule?view=week&week=2026-11-02`;

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await login();
  await page.waitForFunction(() => location.pathname === "/", { timeout: 15000 });
  await page.evaluate(() => { localStorage.setItem("hh.week.layout", "bars"); localStorage.setItem("hh.child", "all"); });

  // Bars is the default view of the week (the saved choice here is Bars).
  await page.goto(WEEK, { waitUntil: "networkidle0" });
  await page.waitForSelector(".bars");
  check((await page.$$(".day")).length === 0, "Days shows while Bars is chosen");

  // The printed weekly sheet, for comparison: child|day|title|range.
  await page.goto(`${BASE}/print/week?week=2026-11-02&children=all`, { waitUntil: "networkidle0" });
  await page.waitForSelector(".sheet");
  const paper = await page.evaluate(() => [...document.querySelectorAll(".sheet")].flatMap((sheet) => {
    const child = sheet.querySelector("h1").textContent;
    return [...sheet.querySelectorAll(".sheet-assignment")].flatMap((a) => [...a.querySelectorAll("li")].map((li) =>
      `${child}|${li.querySelector(".sheet-day").textContent}|${a.querySelector("h3").textContent}|${li.querySelector(".sheet-range")?.textContent.replace(/^ · /, "") ?? "-"}`));
  }).sort());
  check(paper.length > 15, `the printed sheet has only ${paper.length} rows`);

  for (const scheme of ["light", "dark"]) {
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
    for (const width of [360, 1280]) {
      await page.setViewport({ width, height: 900 });
      await page.goto(WEEK, { waitUntil: "networkidle0" });
      await page.waitForSelector(".bars, .day");
      if (scheme === "light" && width === 360) {
        const [days] = await page.$$("xpath/.//button[normalize-space()='Days']");
        await days.click();
        await page.reload({ waitUntil: "networkidle0" }); // the choice is remembered on the device
      }
      await page.waitForSelector(".day");
      const where = `${width}px ${scheme}`;
      const pressed = await page.$eval(".week-layout-row button[aria-pressed=true]", (b) => b.textContent);
      check(pressed === "Days", `${where}: Days is not remembered after a reload (${pressed})`);
      const names = await page.$$eval(".day", (d) => d.map((x) => x.getAttribute("aria-label")));
      check(names.length === 5, `${where}: ${names.length} days, not 5`);
      check(await sw(), `${where}: sideways scroll`);
      const small = await undersized();
      check(small.length === 0, `${where}: controls under 44 px: ${small.join("; ")}`);
      const onScreen = await page.evaluate(() => [...document.querySelectorAll(".day")].flatMap((d) => {
        const day = d.getAttribute("aria-label").slice(0, 3);
        // a Together line stands for each child's identical row on the sheet
        return [...d.querySelectorAll(".day-line")].flatMap((l) => l.getAttribute("data-children").split(",").map((c) => `${c}|${day}|${l.querySelector(".day-title").textContent}|${l.querySelector(".day-range")?.textContent ?? "-"}`));
      }).sort());
      const same = JSON.stringify(onScreen) === JSON.stringify(paper);
      check(same, `${where}: Days differs from the printed sheet (${onScreen.length} lines vs ${paper.length} rows)`);
      const heads = await page.$$eval(".day-child", (d) => [...new Set(d.map((x) => x.textContent))]);
      check(heads.length >= 3 && heads.includes("Together"), `${where}: expected child and Together headings, saw ${heads.join(", ")}`);
      check((await page.$$(".day-dot")).length === 0, `${where}: initials are still drawn`);
      if (width === 1280) {
        const rows = await page.$$eval(".day", (d) => new Set(d.map((x) => Math.round(x.getBoundingClientRect().top))).size);
        check(rows === 1, `${where}: the days are not side by side`);
      }
      await axe(where);
      log(where, "days:", names.length, "lines:", onScreen.length, "same as the sheet:", same);
    }
  }

  // A line opens the week adjustment (and writes nothing).
  await page.setViewport({ width: 360, height: 900 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  const writes = [];
  page.on("request", (r) => { if (r.method() !== "GET") writes.push(`${r.method()} ${r.url()}`); });
  await page.goto(WEEK, { waitUntil: "networkidle0" });
  await page.waitForSelector(".day-line");
  await page.click(".day-line");
  await page.waitForSelector("[role=dialog]");
  check(writes.length === 0, `opening a line wrote: ${writes.join(", ")}`);
  await page.evaluate(() => localStorage.setItem("hh.week.layout", "bars"));

  log(problems.length ? `PROBLEMS:\n${problems.join("\n")}` : "PROBLEMS none");
  if (problems.length) process.exitCode = 1;
}
