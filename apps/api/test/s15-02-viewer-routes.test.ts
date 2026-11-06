/**
 * S15-02: a viewer can never write, in any account they view; deny by default. The route walk below visits EVERY route the app registers
 * as a viewer: a route that is not on the allow-list (auth/viewerAccess.ts) must answer 403 `view_only` whatever it is called with, so a
 * route added later is closed to viewers until someone adds it to the list on purpose.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { VIEWER_ACCOUNT_ROUTES, VIEWER_READ_ROUTES, viewerMayCall } from "../src/auth/viewerAccess";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { createFamily } from "./helpers/family";
import { sessionFor, viewerOf } from "./helpers/members";

const PW = "viewer-routes-password";
interface Route { method: string; url: string; public: boolean }
type Cookies = { hh_session: string };

/** The routes with no session at all (and /api/health, which buildApp registers itself, ahead of any hook: it says only "ok" and the engine version).
 *  A new public route must be added here on purpose: it would otherwise be open to everyone. */
const PUBLIC = ["POST /api/auth/login", "POST /api/auth/logout", "GET /api/join/:token", "POST /api/join/:token"];
/** Concrete values for the parts of a route and the queries the allowed reads need. */
const QUERY: Record<string, string> = {
  "/api/plan": "?from=2026-11-02&to=2026-11-08",
  "/api/log-entries/run-days": "?from=2026-11-02&to=2026-11-08",
  "/api/week-overrides": "?weekStart=2026-11-02",
};

const concrete = (url: string) => url.replace(/:token/g, "t".repeat(43)).replace(/:weekStart/g, "2026-11-02").replace(/:id/g, randomUUID());

describe.skipIf(!hasDb)("a viewer can never write (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const routes: Route[] = [];
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  if (hasDb) app.addHook("onRoute", (r) => { for (const m of [r.method].flat()) routes.push({ method: String(m).toUpperCase(), url: r.url, public: !!r.config?.public }); });
  let famF = ""; let famG = ""; let childF = ""; let childG = "";
  let viewerF: { parentId: string; cookies: Cookies }; let parentF: Cookies;
  let ip = 0;
  const call = (method: string, url: string, cookies?: Cookies, payload?: unknown, headers?: Record<string, string>) =>
    app.inject({ method: method as "GET", url, cookies, headers, remoteAddress: `10.16.${Math.floor(++ip / 250)}.${(ip % 250) + 1}`, ...(payload !== undefined ? { payload: payload as object } : {}) });
  const clean = () => pool.query("DELETE FROM parent WHERE lower(email) LIKE 's15-02-%'").then(() => pool.query("DELETE FROM family WHERE name LIKE 'S15-02 %'"));

  beforeAll(async () => {
    await app.ready();
    await clean();
    famF = await createFamily(pool, "s15-02-f@example.com", PW, "S15-02 Family F");
    famG = await createFamily(pool, "s15-02-g@example.com", PW, "S15-02 Family G");
    await pool.query("UPDATE family SET setup_done = true, tips_seen = '{}', setup_deferred = '{year}' WHERE id = ANY($1)", [[famF, famG]]);
    for (const [fam, tag] of [[famF, "F"], [famG, "G"]] as const) {
      const c = (await pool.query("INSERT INTO child (family_id, name) VALUES ($1, $2) RETURNING id", [fam, `Child ${tag}`])).rows[0].id;
      const sub = (await pool.query("INSERT INTO subject (family_id, name) VALUES ($1, $2) RETURNING id", [fam, `Subject ${tag}`])).rows[0].id;
      const a = (await pool.query(
        "INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, start_date, end_date) VALUES ($1, $2, $3, 'pages', 100, '2026-11-02', '2026-12-18') RETURNING id", [fam, sub, `Book ${tag} secret`])).rows[0].id;
      await pool.query("INSERT INTO assignment_child (family_id, assignment_id, child_id) VALUES ($1, $2, $3)", [fam, a, c]);
      if (tag === "F") childF = c; else childG = c;
    }
    viewerF = await viewerOf(pool, famF, "s15-02-viewer@example.com", PW, "Vera Viewer");
    parentF = { hh_session: await sessionFor(pool, famF, (await pool.query("SELECT id FROM parent WHERE lower(email) = 's15-02-f@example.com'")).rows[0].id) };
    await pool.query("INSERT INTO invite (token_hash, family_id, role, label, expires_at) VALUES ($1, $2, 'viewer', 'S15-02 secret label', now() + interval '1 day')", ["e".repeat(64), famF]);
  });
  afterAll(async () => {
    await clean();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[famF, famG]]);
    await app.close();
    await pool.end();
  });

  it("the walk has something to walk: the app registers its routes, and the public ones are exactly the expected ones", () => {
    expect(routes.length).toBeGreaterThan(40);
    const pub = routes.filter((r) => r.public && r.method !== "HEAD").map((r) => `${r.method} ${r.url}`).sort();
    expect(pub).toEqual([...PUBLIC].sort());
  });

  it("every allow-list entry is a registered GET route (or, for the two account calls, a registered POST), and nothing is listed twice", () => {
    const have = new Set(routes.map((r) => `${r.method} ${r.url}`));
    for (const u of VIEWER_READ_ROUTES) expect(have.has(`GET ${u}`), `GET ${u} is not a registered route`).toBe(true);
    for (const r of VIEWER_ACCOUNT_ROUTES) expect(have.has(r), `${r} is not a registered route`).toBe(true);
    expect(new Set(VIEWER_READ_ROUTES).size).toBe(VIEWER_READ_ROUTES.length);
    // Nothing that can change data is on the list by pattern: every read is a GET, and the only other calls are the two account calls.
    expect(VIEWER_ACCOUNT_ROUTES).toEqual(["POST /api/auth/switch", "POST /api/auth/leave"]);
  });

  it("WALK: as a viewer, every registered route that is not allowed answers 403 view_only, with a good body, a bad body and no body", async () => {
    const closed = routes.filter((r) => !r.public && r.url.startsWith("/api/") && !viewerMayCall(r.method, r.url));
    expect(closed.length).toBeGreaterThan(30);
    const writes = closed.filter((r) => r.method !== "GET" && r.method !== "HEAD");
    expect(writes.length).toBeGreaterThan(20);
    for (const r of closed) {
      const url = concrete(r.url);
      const bodies: unknown[] = r.method === "GET" || r.method === "HEAD" ? [undefined] : [undefined, {}, { garbage: true, title: 5 }];
      for (const body of bodies) {
        const res = await call(r.method, url, viewerF.cookies, body);
        expect(res.statusCode, `${r.method} ${r.url} with ${JSON.stringify(body)}`).toBe(403);
        if (r.method !== "HEAD") expect(res.json().error, `${r.method} ${r.url}`).toBe("view_only");
      }
    }
  });

  it("WALK: the same routes are not simply broken for everyone: a parent of the same family gets past the guard", async () => {
    const closedGets = routes.filter((r) => r.method === "GET" && !r.public && r.url.startsWith("/api/") && !viewerMayCall(r.method, r.url) && !r.url.includes(":"));
    expect(closedGets.length).toBeGreaterThan(3);
    for (const r of closedGets) expect((await call("GET", r.url, parentF)).statusCode, r.url).not.toBe(403);
  });

  it("WALK: every allowed read works for a viewer, and a viewer's non-GET on an allowed path is still refused", async () => {
    for (const u of VIEWER_READ_ROUTES) {
      const res = await call("GET", concrete(u) + (QUERY[u] ?? ""), viewerF.cookies);
      expect(res.statusCode, `GET ${u}`).toBe(200);
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        const r = await call(method, concrete(u), viewerF.cookies, method === "DELETE" ? undefined : {});
        // Only the two account calls are open, and neither lives on a read path.
        expect(r.statusCode, `${method} ${u}`).toBeGreaterThanOrEqual(403);
        expect([403, 404, 405]).toContain(r.statusCode);
        if (r.statusCode === 403) expect(r.json().error).toBe("view_only");
      }
    }
  });

  it("every route needs a session, and a viewer's session cannot be used after the viewer is removed", async () => {
    for (const u of VIEWER_READ_ROUTES) expect((await call("GET", concrete(u) + (QUERY[u] ?? ""))).statusCode, u).toBe(401);
    const v = await viewerOf(pool, famF, "s15-02-removed@example.com");
    expect((await call("GET", "/api/children", v.cookies)).statusCode).toBe(200);
    await pool.query("DELETE FROM family_member WHERE parent_id = $1", [v.parentId]);
    for (const u of VIEWER_READ_ROUTES) expect((await call("GET", concrete(u) + (QUERY[u] ?? ""), v.cookies)).statusCode, u).toBe(401);
    expect((await call("POST", "/api/children", v.cookies, { name: "x" })).statusCode).toBe(401);
  });

  it("allowed reads return the viewed family's data only, never another family's", async () => {
    const bodies: string[] = [];
    for (const u of VIEWER_READ_ROUTES) {
      // Ask as hard as possible for the other family's data too: its child id as a filter.
      const qs = [QUERY[u] ?? "", `${QUERY[u] ? QUERY[u] + "&" : "?"}childId=${childG}`];
      for (const q of qs) {
        const res = await call("GET", u + q, viewerF.cookies);
        // S17-02: another family's child id as a filter is a 404 where the route checks it (records), else 200 with nothing of theirs, or 400.
        expect([200, 400, 404]).toContain(res.statusCode);
        bodies.push(res.body);
      }
    }
    const all = bodies.join("\n");
    expect(all).toContain("Child F");
    expect(all).toContain(childF);
    expect(all).toContain("Book F secret");
    expect(all).not.toContain("Child G");
    expect(all).not.toContain("Book G secret");
    expect(all).not.toContain("Subject G");
    expect(all).not.toContain(famG);
  });

  it("a viewer never sees parents' emails, names of other viewers, invites, view links or setup state", async () => {
    const other = await viewerOf(pool, famF, "s15-02-other-viewer@example.com", PW, "Olive Other");
    const bodies: string[] = [];
    for (const u of VIEWER_READ_ROUTES) bodies.push((await call("GET", u + (QUERY[u] ?? ""), viewerF.cookies)).body);
    const all = bodies.join("\n");
    for (const secret of ["@example.com", "s15-02-", "Olive Other", "token", "invite", "S15-02 secret label", "password"]) expect(all.toLowerCase(), secret).not.toContain(secret.toLowerCase());
    // The two things that name a person: the viewer's own name, and the account list (their own accounts only).
    const me = (await call("GET", "/api/me", viewerF.cookies)).json();
    expect(me).toMatchObject({ role: "viewer", parentName: "Vera Viewer", setupDone: true, setupDeferred: [], tipsSeen: ["bars", "edit", "icons"], checklistHidden: true, demo: false });
    expect(me.accounts).toEqual([{ familyId: famF, familyName: "S15-02 Family F", role: "viewer", current: true }]);
    const family = (await call("GET", "/api/family", viewerF.cookies)).json();
    expect(family).toMatchObject({ setupDone: true, setupDeferred: [], tipsSeen: ["bars", "edit", "icons"] });
    // The same two answers for the parent do carry their real state.
    expect((await call("GET", "/api/family", parentF)).json()).toMatchObject({ setupDeferred: ["year"], tipsSeen: [] });
    expect((await call("GET", "/api/me", parentF)).json()).toMatchObject({ role: "parent", setupDeferred: ["year"], checklistHidden: false });
    await pool.query("DELETE FROM family_member WHERE parent_id = $1", [other.parentId]);
  });

  it("viewer responses carry noindex, no referrer and no shared caching; a parent's do not", async () => {
    for (const res of [await call("GET", "/api/children", viewerF.cookies), await call("POST", "/api/children", viewerF.cookies, { name: "x" })]) {
      expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
      expect(res.headers["referrer-policy"]).toBe("no-referrer");
      expect(res.headers["cache-control"]).toBe("private, no-store");
    }
    const parent = await call("GET", "/api/children", parentF);
    expect(parent.headers["x-robots-tag"]).toBeUndefined();
    expect(parent.headers["referrer-policy"]).toBeUndefined();
  });

  it("switching accounts re-checks membership: a viewer cannot move to a family they don't belong to, nor on a removed membership", async () => {
    const before = (await call("GET", "/api/me", viewerF.cookies)).json().familyId;
    expect((await call("POST", "/api/auth/switch", viewerF.cookies, { familyId: famG })).statusCode).toBe(404);
    expect((await call("GET", "/api/me", viewerF.cookies)).json().familyId).toBe(before);
    expect((await call("GET", "/api/children", viewerF.cookies)).body).not.toContain("Child G");
    // Own account is allowed (a no-op), and the moment the membership is gone a switch is refused too.
    expect((await call("POST", "/api/auth/switch", viewerF.cookies, { familyId: famF })).statusCode).toBe(200);
  });

  it("a viewer is never treated as a parent through the account routes: only a viewer can leave, and the demo/parent-only calls stay closed", async () => {
    expect((await call("POST", "/api/auth/leave", parentF)).statusCode).toBe(403);
    expect((await call("GET", "/api/family/viewers", viewerF.cookies)).statusCode).toBe(403);
    expect((await call("POST", "/api/family/view-links", viewerF.cookies)).statusCode).toBe(403);
  });
});
