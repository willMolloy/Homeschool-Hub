// S13-06: Term in review end to end. Sign in as smoke@example.com (seed-second-family.ts; it can write), turn on a log that tracks
// hours by subject, school days and books, log two days for each child, then open Records, "Term in review", check a card for each
// child (the tiles, time by subject, finished and books parts), the card is drawn light for Save and Print even on a dark device, and
// Save image gives one 1080 x 1350 PNG per child on this device with no request leaving the app. Writes to the family, so reseed first:
//   DATABASE_URL=postgres://hh:hh@localhost:5432/hh_dev npx tsx scripts/smoke/seed-second-family.ts
//   node flow.mjs term-review
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fsp from "node:fs/promises";

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
  const api = (method, path, body) => page.evaluate(async (m, p, b) => {
    const res = await fetch(p, { method: m, headers: b ? { "content-type": "application/json" } : {}, body: b ? JSON.stringify(b) : undefined });
    const t = await res.text();
    return { status: res.status, body: t ? JSON.parse(t) : null };
  }, method, path, body);
  await page.evaluateOnNewDocument(() => { window.__printed = 0; window.print = () => { window.__printed += 1; }; });
  const downloads = await fsp.mkdtemp(path.join(os.tmpdir(), "hh-review-"));
  const cdp = await page.createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads });
  const requests = [];
  page.on("request", (r) => requests.push(`${r.method()} ${new URL(r.url()).origin === new URL(BASE).origin ? new URL(r.url()).pathname : r.url()}`));

  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await login("smoke@example.com");
  await page.waitForFunction(() => location.pathname === "/", { timeout: 15000 });

  // A log that tracks hours by subject, school days and books, and two days for each child.
  const kids = (await api("GET", "/api/children")).body.filter((c) => !c.archived);
  const subjects = (await api("GET", "/api/subjects")).body.filter((s) => !s.archived);
  const me = (await api("GET", "/api/me")).body;
  const set = await api("PATCH", "/api/family", { logSetup: { template: "detailed", fields: { subjectHours: true, coreSplit: false, totalHours: false, schoolDays: true, homeAway: false, notes: false, books: true } } });
  check(set.status === 200, `could not set up the log: ${JSON.stringify(set.body)}`);
  const year = me.today.slice(0, 4);
  for (const [i, k] of kids.entries()) for (const [j, d] of [`${year}-09-08`, `${year}-09-09`].entries()) {
    const sm = Object.fromEntries(subjects.slice(0, 3).map((s, n) => [s.id, 30 + 15 * n + 5 * i]));
    const made = await api("POST", "/api/log-entries", { childIds: [k.id], startDate: d, subjectMinutes: sm, books: [`Smoke book ${i}-${j}`] });
    check(made.status === 201, `could not log a day: ${JSON.stringify(made.body)}`);
  }

  // Records links to it, opening on the range and child already picked.
  await page.goto(`${BASE}/records?range=year`, { waitUntil: "networkidle0" });
  const [link] = await page.$$("xpath/.//a[normalize-space()='Term in review']");
  check(!!link, "Records has no Term in review link");
  await link.evaluate((n) => n.scrollIntoView({ block: "center" }));
  await shot("s13-06-records-term-in-review-360");
  await link.click();
  await page.waitForSelector(".review-card svg", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1200)); // the fonts, then the layout
  check(new URL(page.url()).pathname === "/records/review", `went to ${page.url()}`);
  check(await sw(), "the review page scrolls sideways at 360");
  await shot("s13-06-review-360");
  await axe("term in review");
  const small = await page.$$eval(".review-page a, .review-page button", (els) => els.map((e) => { const r = e.getBoundingClientRect(); return [(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 24), r.width, r.height]; }).filter((x) => x[1] < 44 || x[2] < 44));
  check(small.length === 0, `controls under 44 px: ${JSON.stringify(small)}`);

  // The card says what was logged, per child, and only that.
  const cardText = () => page.$eval(".review-card svg", (s) => [...s.querySelectorAll("text")].map((t) => t.textContent));
  const first = await cardText();
  log("first card:", first.join(" | "));
  check(first.includes("TIME BY SUBJECT") && first.includes("BOOKS READ"), "the card lacks time by subject or books");
  check(first.includes("school days"), "the card lacks school days");
  check(!first.some((t) => /favou?rite|note|estimate/i.test(t)), "the card has an invented part");
  check(kids.length < 2 || (await page.$$eval(".review-print .review-print-page", (p) => p.length)) === kids.length, "not one print page per child");
  if (kids.length > 1) {
    await page.click("button[aria-label='Next card']");
    await new Promise((r) => setTimeout(r, 300));
    log("second card:", (await cardText()).slice(0, 4).join(" | "));
  }

  // Dark device: the preview follows it, the saved and printed card stays light.
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
  await new Promise((r) => setTimeout(r, 500));
  await shot("s13-06-review-dark-360");
  const fills = await page.evaluate(() => ({ preview: document.querySelector(".review-card svg rect")?.getAttribute("fill"), print: document.querySelector(".review-print svg rect")?.getAttribute("fill") }));
  log("fills (preview, print):", fills.preview, fills.print);
  check(fills.print === "#FAF6EE", `the printed card is ${fills.print}, not light`);
  check(fills.preview !== fills.print, "the preview didn't follow the dark device");

  // Save image: one PNG per child, 1080 x 1350, made on this device.
  const before = requests.length;
  const label = kids.length > 1 ? `Save ${kids.length} images` : "Save image";
  const [save] = await page.$$(`xpath/.//button[contains(normalize-space(), '${label}')]`);
  check(!!save, `no "${label}" button`);
  await save.click();
  const deadline = Date.now() + 20000;
  let files = [];
  while (Date.now() < deadline) {
    files = (await fsp.readdir(downloads)).filter((f) => f.endsWith(".png"));
    if (files.length >= kids.length) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  log("saved:", files.join(", "));
  check(files.length === kids.length, `${files.length} images saved for ${kids.length} children`);
  for (const f of files) {
    const buf = await fsp.readFile(path.join(downloads, f));
    const png = buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
    const [w, h] = [buf.readUInt32BE(16), buf.readUInt32BE(20)];
    check(png && w === 1080 && h === 1350, `${f} is ${png ? "a PNG" : "not a PNG"} ${w} x ${h}`);
  }
  const sent = requests.slice(before).filter((r) => !r.startsWith("GET ") && !r.startsWith("blob:") && !r.includes("data:"));
  check(sent.length === 0, `Save image sent: ${sent.join(", ")}`);
  const foreign = requests.slice(before).filter((r) => /^https?:/.test(r.split(" ")[1] ?? "") && !r.includes(new URL(BASE).host));
  check(foreign.length === 0, `Save image reached another site: ${foreign.join(", ")}`);

  // Print asks for the dialog.
  const [print] = await page.$$("xpath/.//button[contains(normalize-space(), 'Print')]");
  await print.click();
  check(await page.evaluate(() => window.__printed >= 1), "Print did not ask for the print dialog");
  for (const format of ["Letter", "A4"]) {
    const pages = (Buffer.from(await page.pdf({ format, printBackground: true })).toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;
    log("print", format, "pages:", pages);
    check(pages === kids.length, `${format}: ${pages} pages for ${kids.length} cards`);
  }
  await fsp.rm(downloads, { recursive: true, force: true });

  if (problems.length) {
    for (const p of problems) log("PROBLEM:", p);
    throw new Error(`${problems.length} problem(s) in the term-review scenario`);
  }
  log("term-review scenario: ok");
}
