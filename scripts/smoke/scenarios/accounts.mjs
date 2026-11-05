// S14-06: accounts end to end, against a private stack on 127.0.0.1 (npm run demo). It makes its own family, so it needs no seed and
// leaves one new family (and two parents) behind in hh_dev; `npm run demo` resets it.
//   1. The command: create-family-invite prints a link (the scenario reads it from the command's output, as a person would).
//   2. The join page (320-wide look, axe), joining as the first parent, and the Sprint 11 setup flow to Home.
//   3. The same link again: the one plain message. A made-up link: the same message.
//   4. Family settings, Parents: invite another parent, copy box; the second parent joins in a separate browser profile, lands
//      Home (no setup flow) on the same family; the first parent's list shows both; the link can't be used twice.
//   5. Add several (two assignments), then Undo from the undo bar removes exactly those two.
//   6. Sign out on one device leaves the other signed in.
// Needs DATABASE_URL (default: the local hh_dev) for the command.
//   node flow.mjs accounts
import fs from "node:fs";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fillDates, PLAIN_INPUTS } from "../common.mjs";

const AXE = fs.readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const PLAIN = "This invite link has expired or was already used. Ask the person who sent it for a new one.";

const runCommand = (base) => new Promise((resolve, reject) => {
  execFile("npx", ["tsx", "apps/api/src/cli/create-family-invite.ts"], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? "postgres://hh:hh@localhost:5432/hh_dev", PUBLIC_BASE_URL: base },
  }, (err, out, errOut) => (err ? reject(new Error(`create-family-invite failed: ${errOut}`)) : resolve(out)));
});

export default async function ({ page, shot, log, BASE }) {
  const problems = [];
  const check = (ok, what) => { if (!ok) problems.push(what); };
  const stamp = Date.now();
  const mail = (who) => `smoke-${who}-${stamp}@example.com`;
  const PASSWORD = "correct-horse-battery";
  const sw = (p) => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  const waitText = (p, t) => p.waitForFunction((s) => document.body.innerText.includes(s), { timeout: 15000 }, t);
  // Clicks the element whose text is `label`, waiting for it to appear (a step's buttons arrive after its heading).
  const click = async (p, sel, label) => {
    for (let i = 0; i < 50; i++) {
      for (const e of await p.$$(sel)) if ((await e.evaluate((n) => n.textContent.trim())) === label) return e.click();
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`no ${sel} "${label}"`);
  };
  const axe = async (p, where) => {
    await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity), { timeout: 5000 });
    await p.evaluate(AXE);
    const r = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((v) => `${v.impact} ${v.id}: ${v.help}`));
    log("axe", where, r.length ? r : "clean");
    problems.push(...r.map((x) => `axe ${where}: ${x}`));
  };
  const small = (p, scope) => p.evaluate((s) => [...document.querySelectorAll(`${s} input, ${s} button, ${s} a`)].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height < 44; }).map((e) => e.textContent.trim() || e.id), scope);
  const me = (p) => p.evaluate(async () => (await fetch("/api/me")).json());
  const fillLabel = async (p, scope, label, value) => {
    const id = await p.evaluate((s, l) => { const lab = [...document.querySelector(s).querySelectorAll("label")].find((x) => x.textContent.trim() === l); return lab?.htmlFor ?? null; }, scope, label);
    if (!id) throw new Error(`no label "${label}" in ${scope}`);
    await p.type(`[id="${id}"]`, value);
  };
  const browser = page.browser();
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

  // 1. The command.
  const out = await runCommand(BASE);
  const link = out.split("\n").find((l) => l.includes("/join/"))?.trim();
  check(!!link && new RegExp(`^${BASE}/join/[A-Za-z0-9_-]{43}$`).test(link), "the command did not print one link");
  log("command printed a link (not shown)");

  // 2. The join page, joining, and the setup flow.
  await page.setViewport({ width: 320, height: 740 });
  await page.goto(link, { waitUntil: "networkidle0" });
  await page.waitForSelector("form");
  check(await sw(page), "join page scrolls sideways at 320");
  const tiny = await small(page, "form");
  check(tiny.length === 0, `join page has controls under 44 px: ${JSON.stringify(tiny)}`);
  await shot("s14-06-join-320", 320);
  await axe(page, "join page");
  await page.type("input[autocomplete=name]", "Pat Parent");
  await page.type("input[type=email]", mail("one"));
  await page.type("input[type=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForFunction(() => location.pathname === "/welcome", { timeout: 15000 });
  await page.setViewport({ width: 360, height: 740 });
  await waitText(page, "Step 1 of 6");
  const first = await me(page);
  check(first.parentName === "Pat Parent" && first.setupDone === false, `after joining: ${JSON.stringify({ p: first.parentName, d: first.setupDone })}`);
  await click(page, "button", "Continue");
  await waitText(page, "Step 2 of 6");
  await page.type(PLAIN_INPUTS, "Frank");
  await click(page, "button", "Continue");
  await waitText(page, "Step 3 of 6");
  await click(page, "button", "Continue");
  await waitText(page, "Step 4 of 6");
  await page.waitForSelector("main form .date-field input");
  await fillDates(page, "main form", ["Aug 17, 2026", "May 21, 2027"]);
  await click(page, ".shape-card .shape-name", "Three terms");
  await click(page, "button", "Continue");
  await waitText(page, "Step 5 of 6");
  await click(page, "button", "I'll get back to you on this");
  await waitText(page, "Step 6 of 6");
  await click(page, ".welcome-chips button", "Math");
  await click(page, "button", "Continue");
  await waitText(page, "You're all set");
  await click(page, "button", "Go to Home");
  await page.waitForSelector(".home-checklist");
  log("setup flow finished, on Home");

  // 3. The same link again, and a made-up one: the same plain message.
  const stranger = await browser.createBrowserContext();
  const p2 = await stranger.newPage();
  await p2.setViewport({ width: 360, height: 740 });
  await p2.goto(link, { waitUntil: "networkidle0" });
  const used = await p2.$eval("main", (m) => m.innerText);
  check(used.includes(PLAIN), `a used link says: ${used}`);
  await p2.goto(`${BASE}/join/${"Q".repeat(43)}`, { waitUntil: "networkidle0" });
  const unknown = await p2.$eval("main", (m) => m.innerText);
  check(unknown === used, "a made-up link reads differently from a used one");
  check(!/expired.*used|unknown|invalid|revoked|cancel/i.test(unknown.replace(PLAIN, "")), "the message says why");
  await shot("s14-06-bad-link-360");
  await axe(p2, "bad link");
  await stranger.close();

  // 4. Invite another parent.
  await page.goto(`${BASE}/setup/settings`, { waitUntil: "networkidle0" });
  await click(page, "button", "Invite another parent");
  await page.waitForSelector("#parent-invite-link");
  const second = await page.$eval("#parent-invite-link", (i) => i.value);
  check(second.startsWith(`${BASE}/join/`), "the Parents section shows a join link for this app");
  check(await sw(page), "Family settings scrolls sideways with the link shown");
  const tiny2 = await small(page, ".parents");
  check(tiny2.length === 0, `Parents has controls under 44 px: ${JSON.stringify(tiny2)}`);
  await (await page.$(".parents")).evaluate((n) => n.scrollIntoView());
  await shot("s14-06-parents-360");
  await axe(page, "Family settings with a link");
  const other = await browser.createBrowserContext();
  const p3 = await other.newPage();
  await p3.setViewport({ width: 360, height: 740 });
  await p3.goto(second, { waitUntil: "networkidle0" });
  await p3.waitForSelector("form");
  check((await p3.$eval("h1", (h) => h.textContent)).startsWith("Join "), "the second link's page does not say it joins a family");
  await p3.type("input[autocomplete=name]", "Sam Second");
  await p3.type("input[type=email]", mail("two"));
  await p3.type("input[type=password]", PASSWORD);
  await p3.click("button[type=submit]");
  await p3.waitForFunction(() => location.pathname === "/", { timeout: 15000 });
  await p3.waitForSelector(".home-avatar", { timeout: 15000 });
  const two = await me(p3);
  check(two.familyId === first.familyId, "the second parent is in another family");
  check(two.parentName === "Sam Second" && two.setupDone === true, "the second parent was sent to setup or has the wrong name");
  log("second parent on Home, same family:", two.familyId === first.familyId);
  await page.reload({ waitUntil: "networkidle0" });
  const names = await page.$$eval(".parents-list li", (a) => a.map((x) => x.textContent.trim()));
  check(names.length === 2 && names[0].startsWith("Pat Parent") && names[1] === "Sam Second", `parents listed: ${JSON.stringify(names)}`);
  const open = await page.$$(".parents-invites li");
  check(open.length === 0, "the used invite is still listed as open");
  const p4 = await (await browser.createBrowserContext()).newPage();
  await p4.goto(second, { waitUntil: "networkidle0" });
  check((await p4.$eval("main", (m) => m.innerText)).includes(PLAIN), "the second link worked twice");
  await p4.close();

  // 5. Add several, then Undo.
  await p3.goto(`${BASE}/setup/assignments`, { waitUntil: "networkidle0" });
  await click(p3, "button", "Add several");
  await p3.waitForSelector("form[aria-label='Add several assignments']");
  await new Promise((r) => setTimeout(r, 500));
  const form = "form[aria-label='Add several assignments']";
  const subject = await p3.$eval(`${form} select`, (s) => [...s.options].find((o) => o.textContent.trim() === "Math")?.value);
  await p3.select(`${form} select`, subject);
  await fillDates(p3, form, ["Nov 2, 2026", "Dec 18, 2026"]);
  await fillLabel(p3, "form[aria-label='Add several assignments'] [aria-label='Row 1']", "Title", "Smoke book one");
  await fillLabel(p3, "form[aria-label='Add several assignments'] [aria-label='Row 1']", "Total", "100");
  await fillLabel(p3, "form[aria-label='Add several assignments'] [aria-label='Row 2']", "Title", "Smoke book two");
  await fillLabel(p3, "form[aria-label='Add several assignments'] [aria-label='Row 2']", "Total", "120");
  const [frank] = await p3.$$(`xpath/.//form[@aria-label='Add several assignments']//label[normalize-space()='Frank']/input`);
  await frank.evaluate((n) => n.scrollIntoView({ block: "center" }));
  // A family with one child has that child ticked already: tick the box only if it is not.
  if (!(await frank.evaluate((n) => n.checked))) await frank.click();
  await new Promise((r) => setTimeout(r, 300));
  const ticked = await frank.evaluate((n) => n.checked);
  check(ticked === true, `Frank's box is ${ticked}`);
  await click(p3, `${form} button`, "Save");
  await waitText(p3, "Added 2 assignments.").catch(async (e) => {
    log("the form says:", await p3.$$eval(`${form} [role=alert], ${form} .field-error`, (a) => a.map((x) => x.textContent)));
    throw e;
  });
  const count = async () => (await p3.evaluate(async () => (await fetch("/api/assignments")).json())).filter((a) => a.title.startsWith("Smoke book")).length;
  check((await count()) === 2, "Add several did not make two assignments");
  const undo = await p3.$(".undo-btn");
  const box = await undo.boundingBox();
  check(box.height >= 44, `Undo is ${box.height} px tall`);
  await shot("s14-06-undo-bar-360");
  await undo.click();
  await p3.waitForFunction(() => !document.querySelector(".undo-bar"), { timeout: 15000 });
  check((await count()) === 0, "Undo left the assignments");
  log("Add several then Undo: gone");

  // 6. Signing out on one device keeps the other signed in.
  await p3.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await p3.click("button[aria-label='Family and settings']");
  await p3.waitForSelector("[role=dialog]");
  check((await p3.$eval("[role=dialog]", (d) => d.innerText)).includes("Signed in as Sam Second"), "the family menu does not say who is signed in");
  await new Promise((r) => setTimeout(r, 500));
  const [signOut] = await p3.$$("xpath/.//button[normalize-space()='Sign out']");
  await signOut.evaluate((b) => b.click());
  await p3.waitForFunction(() => location.pathname === "/login", { timeout: 15000 });
  const still = await me(page);
  check(still.parentName === "Pat Parent", "signing the second parent out signed the first one out");
  await other.close();

  log("PROBLEMS:", problems.length ? problems : "none");
  if (problems.length) process.exitCode = 1;
}
