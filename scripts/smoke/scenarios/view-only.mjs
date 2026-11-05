// S15-04: view-only access end to end, against a private stack on 127.0.0.1 (npm run demo, then seed-second-family.ts). It signs in as
// smoke@example.com (a parent), so it needs the seed; it leaves one viewer removed and no link open.
//   1. Family settings, View-only access: create a sign-up link with a label; it shows once (320/360/1280, light and dark, axe, 44 px).
//   2. In a fresh browser profile: the link's page, sign up as a viewer, land on Schedule with View only, two tabs and no Home or Set up.
//   3. Browse Schedule Week (a bar opens a read-only detail), Year, Records (Export, Term in review), Print sheets; nothing editable on any
//      of them, at 320, 360 and 1280 px, light and dark; no control under 44 px; axe clean.
//   4. Try writes from the viewer's own page (fetch POST/PATCH/DELETE/PUT): each is 403; GETs of the settings, parents and viewers are 403.
//   5. The parent removes the viewer (two steps); the viewer reloads and is refused (sign-in page, /api/me 401).
//   6. The used link and a made-up link show the same plain message.
//   node flow.mjs view-only
import fs from "node:fs";

const AXE = fs.readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const PLAIN = "This invite link has expired or was already used. Ask the person who sent it for a new one.";
const EDIT = /^(Add assignment|Edit views|Copy|More|Update status|Update time estimate|Reset|Log|Change log setup|Make an adjustment|Save|Delete|Edit .*|Delete .*|Move end.*|Keep .*|.*completed|Family and settings|Home|Set up)$/;

export default async function ({ page, shot, login, log, BASE }) {
  const problems = [];
  const check = (ok, what) => { if (!ok) problems.push(what); };
  const stamp = Date.now();
  const email = `smoke-viewer-${stamp}@example.com`;
  const PASSWORD = "correct-horse-battery";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const sw = (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  const waitText = (p, t) => p.waitForFunction((s) => document.body.innerText.includes(s), { timeout: 15000 }, t);
  const settle = (p) => p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity), { timeout: 5000 }).catch(() => {});
  const axe = async (p, where) => {
    await settle(p);
    await p.evaluate(AXE);
    const r = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((v) => `${v.impact} ${v.id}: ${v.help}`));
    problems.push(...r.map((x) => `axe ${where}: ${x}`));
    return r.length;
  };
  const small = (p) => p.evaluate(() => [...document.querySelectorAll("button, a, input, select")].filter((e) => {
    if (e.closest(".skip-link")) return false;
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width && r.height && s.visibility !== "hidden" && (r.height < 44 || r.width < 44) && !(e.tagName === "A" && e.closest("p, li:not(.shell-nav li)") && e.closest("p"));
  }).map((e) => (e.getAttribute("aria-label") ?? e.textContent).trim().slice(0, 30) || e.tagName));
  const editControls = (p) => p.evaluate((src) => { const re = new RegExp(src); return [...document.querySelectorAll("button, a")].map((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim()).filter((n) => re.test(n)); }, EDIT.source);
  const click = async (p, sel, label) => {
    for (let i = 0; i < 50; i++) {
      for (const e of await p.$$(sel)) if ((await e.evaluate((n) => n.textContent.trim())) === label) return e.click();
      await sleep(200);
    }
    throw new Error(`no ${sel} "${label}"`);
  };
  const matrix = async (p, where, { editable = false } = {}) => {
    for (const scheme of ["light", "dark"]) {
      await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
      for (const w of [320, 360, 1280]) {
        await p.setViewport({ width: w, height: w === 1280 ? 800 : 740 });
        await sleep(300);
        check(await sw(p), `${where} scrolls sideways at ${w} (${scheme})`);
        const tiny = await small(p);
        check(tiny.length === 0, `${where} has controls under 44 px at ${w} (${scheme}): ${JSON.stringify(tiny)}`);
        if (!editable) { const e = await editControls(p); check(e.length === 0, `${where} shows edit controls: ${JSON.stringify(e)}`); }
      }
      await axe(p, `${where} (${scheme})`);
    }
    await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  };
  const browser = page.browser();
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

  // 1. The parent makes a link.
  await page.setViewport({ width: 360, height: 740 });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await login("smoke@example.com", "demo-password");
  await page.waitForFunction(() => location.pathname === "/", { timeout: 15000 });
  await page.goto(`${BASE}/setup/settings`, { waitUntil: "networkidle0" });
  await page.waitForSelector("#view-link-label");
  await page.type("#view-link-label", "Co-op");
  await click(page, "button", "Create a sign-up link");
  await page.waitForSelector("#view-link-box");
  const link = await page.$eval("#view-link-box", (i) => i.value);
  check(new RegExp(`^${BASE}/join/[A-Za-z0-9_-]{43}$`).test(link), "the card shows no join link for this app");
  await (await page.$(".parents:nth-of-type(2), .parents")).evaluate((n) => n.scrollIntoView());
  const cardSmall = await page.evaluate(() => [...document.querySelectorAll("#view-link-box, .parents button, .parents input")].filter((e) => e.getBoundingClientRect().height && e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim() || e.id));
  check(cardSmall.length === 0, `View-only access has controls under 44 px: ${JSON.stringify(cardSmall)}`);
  await shot("s15-04-view-card-360");
  check((await axe(page, "Family settings with a view link")) === 0, "Family settings axe");
  log("link made (not shown)");

  // 2. The viewer, in a fresh browser profile.
  const ctx = await browser.createBrowserContext();
  const v = await ctx.newPage();
  v.on("pageerror", (e) => problems.push(`viewer pageerror: ${e.message}`));
  await v.setViewport({ width: 320, height: 740 });
  await v.goto(link, { waitUntil: "networkidle0" });
  await v.waitForSelector("form");
  check((await v.$eval("h1", (h) => h.textContent)).startsWith("View "), "the view link's page does not say it is a view");
  await shot("s15-04-join-view-320");
  await matrix(v, "view link page");
  await v.type("input[autocomplete=name]", "Vera Viewer");
  await v.type("input[type=email]", email);
  await v.type("input[type=password]", PASSWORD);
  await v.click("button[type=submit]");
  await v.waitForFunction(() => location.pathname === "/schedule", { timeout: 15000 });
  await v.waitForSelector(".viewer-bar");
  const me = await v.evaluate(async () => (await fetch("/api/me")).json());
  check(me.role === "viewer" && !JSON.stringify(me).includes("@"), `a viewer's /api/me: ${JSON.stringify(me)}`);
  const tabs = await v.$$eval(".shell-nav a", (a) => a.map((x) => x.textContent.trim()));
  check(JSON.stringify(tabs) === JSON.stringify(["Schedule", "Records"]), `a viewer's tabs: ${JSON.stringify(tabs)}`);
  check((await v.$eval(".viewer-bar", (b) => b.innerText)).includes("View only"), "no View only label");
  check((await v.$eval('head meta[name="robots"]', (m) => m.content)) === "noindex, nofollow", "no noindex meta");

  // 3. Browse everything.
  await v.goto(`${BASE}/schedule?view=week`, { waitUntil: "networkidle0" });
  await v.waitForSelector(".bars");
  await shot("s15-04-viewer-week-360");
  await matrix(v, "viewer Schedule Week");
  await v.click(".bars .bar-body");
  await v.waitForSelector("[role=dialog]");
  await sleep(500);
  const detail = await v.$eval("[role=dialog]", (d) => [...d.querySelectorAll("button, input, select, textarea")].map((e) => (e.getAttribute("aria-label") ?? e.textContent).trim()));
  check(JSON.stringify(detail) === JSON.stringify(["Close"]), `the bar detail has controls: ${JSON.stringify(detail)}`);
  await shot("s15-04-viewer-bar-detail-360");
  await axe(v, "viewer bar detail");
  await v.keyboard.press("Escape");
  await sleep(300);
  await v.goto(`${BASE}/schedule?view=year`, { waitUntil: "networkidle0" });
  await v.waitForSelector(".tl-svg");
  await shot("s15-04-viewer-year-360");
  await matrix(v, "viewer Schedule Year");
  await v.goto(`${BASE}/records`, { waitUntil: "networkidle0" });
  await v.waitForSelector(".records-page h1");
  await shot("s15-04-viewer-records-360");
  await matrix(v, "viewer Records");
  await v.goto(`${BASE}/records/review`, { waitUntil: "networkidle0" });
  await v.waitForSelector(".review-page");
  await matrix(v, "viewer Term in review");
  await v.goto(`${BASE}/print/week?week=2026-11-02&children=all`, { waitUntil: "networkidle0" });
  await v.waitForSelector(".sheet");
  check((await v.$$(".sheet")).length >= 1, "no print sheet for a viewer");
  await v.goto(`${BASE}/setup/children`, { waitUntil: "networkidle0" });
  await v.waitForFunction(() => location.pathname === "/schedule", { timeout: 10000 });
  await v.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await v.waitForFunction(() => location.pathname === "/schedule", { timeout: 10000 });

  // 4. Writes and closed reads from the viewer's own page.
  const tries = await v.evaluate(async () => {
    const out = {};
    const call = async (m, u, b) => (await fetch(u, { method: m, ...(b ? { headers: { "content-type": "application/json" }, body: JSON.stringify(b) } : {}) })).status;
    out.postChild = await call("POST", "/api/children", { name: "Nope" });
    out.patchFamily = await call("PATCH", "/api/family", { name: "Nope" });
    out.putCheckIn = await call("PUT", "/api/check-ins/2026-11-02", { status: "reviewed", items: [] });
    out.deleteRange = await call("DELETE", "/api/blocked-ranges/00000000-0000-4000-8000-000000000000");
    out.postLink = await call("POST", "/api/family/view-links", {});
    out.getParents = await call("GET", "/api/family/parents");
    out.getViewers = await call("GET", "/api/family/viewers");
    out.getUndo = await call("GET", "/api/undo");
    out.getChildren = await call("GET", "/api/children");
    return out;
  });
  check(["postChild", "patchFamily", "putCheckIn", "deleteRange", "postLink", "getParents", "getViewers", "getUndo"].every((k) => tries[k] === 403) && tries.getChildren === 200, `viewer calls: ${JSON.stringify(tries)}`);
  log("viewer writes refused:", JSON.stringify(tries));

  // 6 (early). The used link and a made-up one say the same thing.
  const stranger = await (await browser.createBrowserContext()).newPage();
  await stranger.goto(link, { waitUntil: "networkidle0" });
  const used = await stranger.$eval("main", (m) => m.innerText);
  await stranger.goto(`${BASE}/join/${"Q".repeat(43)}`, { waitUntil: "networkidle0" });
  const unknown = await stranger.$eval("main", (m) => m.innerText);
  check(used.includes(PLAIN) && used === unknown, "a used link and a made-up link read differently");
  await stranger.close();

  // 5. The parent removes the viewer.
  await page.goto(`${BASE}/setup/settings`, { waitUntil: "networkidle0" });
  await page.waitForSelector("[aria-label='People who can view']");
  const listed = await page.$eval("[aria-label='People who can view']", (u) => u.innerText);
  check(listed.includes("Vera Viewer") && listed.includes(email), `the viewer is not listed with name and email: ${listed}`);
  await (await page.$("[aria-label='People who can view']")).evaluate((n) => n.scrollIntoView());
  await shot("s15-04-viewers-list-360");
  await page.click("[aria-label='Remove Vera Viewer']");
  await click(page, "button", "Yes, remove");
  await waitText(page, "Vera Viewer was removed.");
  await v.reload({ waitUntil: "networkidle0" });
  await v.waitForFunction(() => location.pathname === "/login", { timeout: 15000 });
  const after = await v.evaluate(async () => (await fetch("/api/me")).status);
  check(after === 401, `after removal /api/me is ${after}`);
  log("viewer removed; reload refused");
  await ctx.close();

  console.log(problems.length ? `PROBLEMS\n${problems.join("\n")}` : "PROBLEMS none");
  if (problems.length) process.exitCode = 1;
}
