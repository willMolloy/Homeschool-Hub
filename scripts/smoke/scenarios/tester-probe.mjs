export default async function ({ page, login, log, BASE }) {
  await page.setViewport({ width: 360, height: 740 });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await login("tester-odd@example.com", "demo-password");
  await page.waitForFunction(() => !location.pathname.startsWith("/login"));
  await page.goto(`${BASE}/?week=2026-10-26`, { waitUntil: "networkidle0" });
  const r = await page.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const clipped = (e) => { for (let p = e.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o !== "visible") return true; } return false; };
    return [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > cw + 1 && !clipped(e))
      .map((e) => `${e.tagName}.${e.className} right=${Math.round(e.getBoundingClientRect().right)} text=${(e.textContent || "").slice(0, 40)}`).slice(0, 8);
  });
  log(r.join("\n"));
  log(await page.evaluate(() => JSON.stringify({ sw: document.documentElement.scrollWidth, bodySW: document.body.scrollWidth, html: getComputedStyle(document.documentElement).overflowX, body: getComputedStyle(document.body).overflowX,
    chain: (() => { const t = document.querySelector("table"); const out = []; for (let p = t; p; p = p.parentElement) out.push(p.tagName + "." + p.className + ":" + getComputedStyle(p).overflowX + ":" + Math.round(p.getBoundingClientRect().width)); return out; })(),
    wline: [...document.querySelectorAll("p, li, div")].filter((e) => /WWWWWW/.test(e.textContent) && e.children.length === 0).map((e) => e.tagName + "." + e.className + " w=" + Math.round(e.scrollWidth)) })));
  for (const sel of ["/kids", "/subjects"]) {
    await page.goto(`${BASE}${sel}`, { waitUntil: "networkidle0" });
    log(sel, await page.evaluate(() => document.documentElement.scrollWidth));
  }
}
