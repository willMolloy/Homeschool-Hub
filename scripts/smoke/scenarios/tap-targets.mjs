// S5-09: every visible button, link, input, select, textarea and summary on the core screens must be at least 44 x 44 px at
// 360 px wide. Read-only: nothing is saved. Prints one line per undersized control and "none" per screen when all pass.
// Sign-in is the demo login unless TAP_EMAIL / TAP_PASSWORD are set; the demo family cannot add events, so use a non-demo
// family to also measure the event form and its "What changes" list.
// Inline text links inside a sentence are exempt; a checkbox or radio inside a label is measured as its label.
const MIN = 44;
const SCREENS = [
  ["This Week", "/"], ["Timeline (bar selected)", "/timeline"], ["Kids", "/kids"], ["Subjects", "/subjects"],
  ["Schedule", "/schedule"], ["Assignments", "/schedule/assignments"], ["Days off", "/schedule/days-off"],
  ["Events", "/schedule/events"], ["Settings", "/schedule/settings"],
];
// Buttons in the page that open a form or panel in place (by the start of their label); each is opened in turn and measured too.
const OPENER = /^(Add|Import|Use a template|Save as a template|New )/;

function undersized(min) {
  const out = [];
  const visible = (r, cs) => r.width > 1 && r.height > 1 && r.right > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  for (const el of document.querySelectorAll("button, a[href], input, select, textarea, summary, [role=button], [role=tab]")) {
    if (el.matches("input[type=hidden]")) continue;
    if (el.closest("[aria-hidden=true]") || el.closest("[inert]")) continue;
    let target = el;
    if (el.matches("input[type=checkbox], input[type=radio]")) target = el.closest("label") ?? el;
    const r = target.getBoundingClientRect(), cs = getComputedStyle(target);
    if (!visible(r, cs)) continue;
    if (el.matches("a")) {
      const p = el.parentElement;
      const rest = (p?.textContent ?? "").replace(el.textContent ?? "", "").trim();
      if (p && /^(P|LI|SPAN|SMALL|LABEL|DD)$/.test(p.tagName) && rest.length > 0 && cs.display === "inline") continue;
    }
    if (r.width + 0.01 >= min && r.height + 0.01 >= min) continue;
    const name = (el.getAttribute("aria-label") || el.textContent || el.value || el.name || el.id || "").trim().replace(/\s+/g, " ").slice(0, 40);
    out.push(`${el.tagName.toLowerCase()}${el.type && el.tagName === "INPUT" ? `[${el.type}]` : ""} "${name}" ${Math.round(r.width)}x${Math.round(r.height)} .${(el.className || "").toString().split(" ").join(".")}`);
  }
  return out;
}

export default async function ({ page, login, log, BASE }) {
  await page.setViewport({ width: 360, height: 740 });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await login(process.env.TAP_EMAIL, process.env.TAP_PASSWORD);
  await page.waitForSelector("table, h1");
  let total = 0;
  const report = async (where) => {
    const checked = await page.evaluate(() => document.querySelectorAll("button, a[href], input, select, textarea, summary").length);
    const bad = await page.evaluate(undersized, MIN);
    total += bad.length;
    log(`${where}: ${bad.length ? bad.length + " undersized" : "none"} (${checked} controls)`);
    for (const b of bad) log(`  ${b}`);
  };
  const settle = () => new Promise((r) => setTimeout(r, 400));
  for (const [name, path] of SCREENS) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
    await settle();
    if (path === "/timeline") {
      await page.waitForSelector("[data-assignment]");
      const box = await (await page.$("[data-assignment]")).boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForSelector(".tl-edit");
      await settle();
    }
    await report(name);
    // Forms and panels that open from a button on the screen.
    const labels = await page.$$eval("main button", (bs) => bs.map((b) => b.textContent.trim()));
    for (const label of labels.filter((l) => OPENER.test(l))) {
      const buttons = await page.$$("main button");
      const texts = await Promise.all(buttons.map((b) => b.evaluate((n) => n.textContent.trim())));
      await buttons[texts.indexOf(label)].click();
      await settle();
      await report(`${name} > ${label}`);
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
      await settle();
    }
  }
  // A row opened for editing (Kids, Subjects, and the Schedule lists' cards).
  for (const [name, path, row] of [["Kids", "/kids", ".roster-row-btn"], ["Subjects", "/subjects", ".roster-row-btn"]]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
    await page.waitForSelector(row);
    await page.click(row);
    await settle();
    await report(`${name} > edit first row`);
  }
  // A schedule row opened for editing, and its Archive/Delete confirm dialog (cancelled, so nothing changes).
  for (const [name, path] of SCREENS.filter(([, p]) => p.startsWith("/schedule/"))) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
    if (!(await page.$(".schedule-card-btn"))) continue;
    await page.click(".schedule-card-btn");
    await settle();
    await report(`${name} > edit first row`);
    const buttons = await page.$$(".schedule-form button");
    const texts = await Promise.all(buttons.map((b) => b.evaluate((n) => n.textContent.trim())));
    const i = texts.findIndex((t) => t === "Delete" || t === "Archive");
    if (i < 0) continue;
    await buttons[i].click();
    await settle();
    await report(`${name} > ${texts[i]} confirm dialog`);
  }
  // The event form with a filled-in draft, so the "What changes" list shows (needs a family that can add events).
  await page.goto(`${BASE}/schedule/events`, { waitUntil: "networkidle0" });
  const addEvent = (await page.$$("main button"));
  const addTexts = await Promise.all(addEvent.map((b) => b.evaluate((n) => n.textContent.trim())));
  const ai = addTexts.findIndex((t) => /^Add/.test(t));
  if (ai >= 0) {
    await addEvent[ai].click();
    await page.waitForSelector("form[aria-label='Add event']");
    await page.type("form[aria-label='Add event'] input[type=text]", "Co-op");
    const boxes = await page.$$("form[aria-label='Add event'] input[type=checkbox]");
    if (boxes.length) await boxes[0].evaluate((n) => { if (!n.checked) n.click(); });
    await new Promise((r) => setTimeout(r, 1500));
    const shown = await page.evaluate(() => document.body.textContent.includes("What changes"));
    log(`event preview list shown: ${shown}`);
    await report("Events > Add event (draft with preview)");
  } else {
    log("Events > Add event: skipped (this family cannot add events; set TAP_EMAIL to a non-demo login)");
  }
  log(total ? `TOTAL undersized controls: ${total}` : "No undersized controls on the listed screens.");
}
