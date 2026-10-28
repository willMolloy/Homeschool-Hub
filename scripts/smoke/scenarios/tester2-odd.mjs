// Tester round 2: Schedule screens with odd data (long/RTL/emoji names, archived child & subject still linked,
// overlapping days off, 7-day event with 0.001 capacity, 2100 dates, Asia/Kolkata) at WIDTH.
import { writeFileSync } from "node:fs";
export default async function ({ page, shot, login, log, BASE }) {
  const W = Number(process.env.WIDTH || 360), H = W >= 1000 ? 900 : 740;
  await page.setViewport({ width: W, height: H });
  const problems = [];
  page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !/401/.test(m.text())) problems.push(`console.${m.type()}: ${m.text()}`); });
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().endsWith("/api/me")) problems.push(`HTTP ${r.status()} ${r.request().method()} ${r.url()}`); });
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
  const go = async (p, sel = ".schedule-list, .schedule-empty") => { await page.goto(`${BASE}${p}`, { waitUntil: "networkidle0" }); await page.waitForSelector(sel); };
  const openCard = async (start) => {
    const ok = await page.$$eval(".schedule-card-btn", (bs, start) => { const b = bs.find((x) => x.querySelector(".card-title")?.textContent.startsWith(start)); if (b) { b.scrollIntoView(); b.click(); } return !!b; }, start);
    if (!ok) throw new Error(`no card ${start}`);
    await page.waitForSelector("form.schedule-form");
  };
  const tick = (text) => page.$$eval("form.schedule-form label.choice", (ls, text) => { const l = ls.find((x) => x.textContent.trim().startsWith(text)); if (!l) return false; l.querySelector("input").click(); return true; }, text);
  const save = async (where) => {
    await page.$eval("form.schedule-form button[type=submit]", (b) => { b.scrollIntoView(); b.click(); });
    await new Promise((r) => setTimeout(r, 1200));
    const still = await page.$eval("form.schedule-form", (f) => f.innerText).catch(() => null);
    if (still) problems.push(`${where}: form still open after save: ${still.replace(/\s+/g, " ").slice(-160)}`);
    log(where, still ? "FORM STILL OPEN" : "saved");
  };

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await login("tester2-odd@example.com", "demo-password");
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), { timeout: 10000 });
  await page.goto(`${BASE}/?week=2026-10-25`, { waitUntil: "networkidle0" });
  log("plan tables:", (await page.$$("table")).length);
  await overflow("plan"); await shot(`tester2-1-plan-${W}`, W, H);

  await go("/schedule", "h1"); await overflow("hub"); await shot(`tester2-2-hub-${W}`, W, H);

  await go("/schedule/settings", "form");
  const tz = await page.$eval("form select", (s) => ({ value: s.value, n: s.options.length, first: s.options[0]?.value }));
  log("settings tz select:", JSON.stringify(tz));
  if (tz.value !== "Asia/Kolkata") problems.push(`settings: time zone shows ${tz.value}, stored Asia/Kolkata`);
  writeFileSync(process.env.TZ_DUMP ?? "/tmp/chrome-tz.json", JSON.stringify(await page.evaluate(() => Intl.supportedValuesOf("timeZone"))));
  await overflow("settings"); await shot(`tester2-3-settings-${W}`, W, H);

  await go("/schedule/assignments");
  await overflow("assignments"); await shot(`tester2-4-assignments-${W}`, W, H);
  await page.$eval(".schedule-toggle input", (i) => i.click()); await new Promise((r) => setTimeout(r, 600));
  await openCard("Uses a later-archived");
  const shown = await page.$$eval("form.schedule-form label.choice", (ls) => ls.map((l) => `${l.textContent.trim()}=${l.querySelector("input").checked}`));
  log("assignment child choices:", JSON.stringify(shown));
  await tick("🦕");
  await overflow("assignment-edit"); await shot(`tester2-5-assignment-edit-archived-child-${W}`, W, H);
  await save("assignment add-child with archived child kept");
  if (W >= 1000) await tick("🦕"); // no-op when the form closed

  await go("/schedule/days-off");
  await overflow("days-off"); await shot(`tester2-6-days-off-${W}`, W, H);
  await openCard("Overlap 1");
  await tick(W >= 1000 ? "زينب" : "Al");
  await save("day off add-child with archived child kept");

  await go("/schedule/events");
  await overflow("events"); await shot(`tester2-7-events-${W}`, W, H);
  await openCard("Ends 2100");
  await overflow("event-edit"); await shot(`tester2-8-event-edit-stale-rule-${W}`, W, H);
  await tick("Al");
  await save("event add-child with archived child kept");

  await page.goto(`${BASE}/?week=2026-10-25`, { waitUntil: "networkidle0" });
  await overflow("plan-after");
  log(problems.length ? "PROBLEMS:\n  " + problems.join("\n  ") : "no problems");
}
