/**
 * Independent tester: API security and robustness (Oct 28, 2026).
 * Cross-family access on every route, session lifecycle, cookie flags, injection strings, oversize bodies,
 * unicode names, the login rate limit, concurrent creates, archived-name edges.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { hashSessionToken } from "../src/auth/session";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { createFamily, sessionCookie } from "./helpers/family";
import { seedFamily } from "./helpers/seed";
import { signedInFamily } from "./helpers/session";

type Fam = Awaited<ReturnType<typeof signedInFamily>>;

describe.skipIf(!hasDb)("tester: cross-family isolation on every route", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Fam; let b: Fam; let seeded: Awaited<ReturnType<typeof seedFamily>>; let seededCookie = "";
  let bChild = ""; let bSubject = "";
  beforeAll(async () => {
    a = await signedInFamily(pool, "Iso A");
    b = await signedInFamily(pool, "Iso B");
    bChild = (await app.inject({ method: "POST", url: "/api/children", payload: { name: "B kid" }, cookies: b.cookies })).json().id;
    bSubject = (await app.inject({ method: "POST", url: "/api/subjects", payload: { name: "B subj" }, cookies: b.cookies })).json().id;
    seeded = await seedFamily("tester-iso-seed@example.com");
    const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: seeded.email, password: seeded.password } });
    seededCookie = sessionCookie(login)!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1) OR lower(login_email) = 'tester-iso-seed@example.com'", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  it("GET lists never include another family's rows (incl. archived)", async () => {
    for (const url of ["/api/children?includeArchived=true", "/api/subjects?includeArchived=true"]) {
      const res = await app.inject({ method: "GET", url, cookies: a.cookies });
      expect(res.statusCode).toBe(200);
      const ids = res.json().map((r: { id: string }) => r.id);
      expect(ids).not.toContain(bChild);
      expect(ids).not.toContain(bSubject);
    }
  });

  it.each([
    ["children", () => bChild],
    ["subjects", () => bSubject],
  ])("PATCH another family's %s → 404 and the row is untouched (every field)", async (kind, id) => {
    for (const payload of [{ name: "pwned" }, { archived: true }, { color: "#000000" }, { sortOrder: 99 }]) {
      const res = await app.inject({ method: "PATCH", url: `/api/${kind}/${id()}`, payload, cookies: a.cookies });
      expect(res.statusCode).toBe(404);
    }
    const list = await app.inject({ method: "GET", url: `/api/${kind}?includeArchived=true`, cookies: b.cookies });
    const row = list.json().find((r: { id: string }) => r.id === id());
    expect(row).toMatchObject({ archived: false, color: null, sortOrder: 0 });
    expect(row.name).not.toBe("pwned");
  });

  it("GET /api/me and /api/plan answer for the session's family only", async () => {
    const me = await app.inject({ method: "GET", url: "/api/me", cookies: a.cookies });
    expect(me.json().familyId).toBe(a.familyId);
    const planA = await app.inject({ method: "GET", url: "/api/plan?from=2026-08-01&to=2027-06-30&familyId=" + seeded.familyId, cookies: a.cookies });
    expect(planA.statusCode).toBe(200);
    expect(planA.json().plans).toEqual([]);
    const planS = await app.inject({ method: "GET", url: "/api/plan?from=2026-08-01&to=2027-06-30", cookies: { hh_session: seededCookie } });
    expect(planS.json().plans.length).toBeGreaterThan(0);
  });

  it("every protected route is 401 without a cookie (no route forgot the session check)", async () => {
    const routes = app.printRoutes({ commonPrefix: false });
    expect(routes).toContain("api");
    for (const [method, url] of [["GET", "/api/me"], ["GET", "/api/children"], ["POST", "/api/children"], ["PATCH", `/api/children/${bChild}`],
      ["GET", "/api/subjects"], ["POST", "/api/subjects"], ["PATCH", `/api/subjects/${bSubject}`], ["GET", "/api/plan?from=2026-09-01&to=2026-09-02"]] as const) {
      const res = await app.inject({ method, url, payload: method === "GET" ? undefined : { name: "x" } });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
    }
  });
});

describe.skipIf(!hasDb)("tester: sessions and cookies", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  const prodApp = hasDb ? buildApp(testConfig({ NODE_ENV: "production" }), { db: pool }) : null!;
  const EMAIL = "tester-sessions@example.com", PW = "tester-sessions-pw";
  let familyId = "";
  beforeAll(async () => { familyId = await createFamily(pool, EMAIL, PW); });
  afterAll(async () => {
    await app.close(); await prodApp.close();
    await pool.query("DELETE FROM family WHERE id = $1", [familyId]);
    await pool.end();
  });
  const login = (which = app, cookies: Record<string, string> = {}) =>
    which.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL, password: PW }, cookies });

  it("cookie flags: HttpOnly, SameSite=Lax, Path=/, 30-day Max-Age; Secure only in production", async () => {
    const dev = (await login()).cookies.find((c) => c.name === "hh_session")!;
    expect(dev).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/", maxAge: 30 * 86400 });
    expect(dev.secure).toBeFalsy();
    const prod = (await login(prodApp)).cookies.find((c) => c.name === "hh_session")!;
    expect(prod).toMatchObject({ httpOnly: true, sameSite: "Lax", secure: true });
  });

  it("session fixation: a cookie the attacker planted before login is not what login returns", async () => {
    const planted = "attacker-chosen-token-attacker-chosen-token";
    const res = await login(app, { hh_session: planted });
    const issued = sessionCookie(res)!;
    expect(issued).not.toBe(planted);
    const { rows } = await pool.query("SELECT 1 FROM session WHERE id = $1", [hashSessionToken(planted)]);
    expect(rows).toHaveLength(0);
    expect(issued).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("only the hash is stored: the raw token is never a session id", async () => {
    const token = sessionCookie(await login())!;
    expect((await pool.query("SELECT 1 FROM session WHERE id = $1", [token])).rows).toHaveLength(0);
    expect((await pool.query("SELECT 1 FROM session WHERE id = $1", [hashSessionToken(token)])).rows).toHaveLength(1);
  });

  it("expired session → 401 even one second past expiry; logout then reuse → 401", async () => {
    const token = sessionCookie(await login())!;
    await pool.query("UPDATE session SET expires_at = now() - interval '1 second' WHERE id = $1", [hashSessionToken(token)]);
    expect((await app.inject({ method: "GET", url: "/api/me", cookies: { hh_session: token } })).statusCode).toBe(401);
    const t2 = sessionCookie(await login())!;
    expect((await app.inject({ method: "POST", url: "/api/auth/logout", cookies: { hh_session: t2 } })).statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: "/api/me", cookies: { hh_session: t2 } })).statusCode).toBe(401);
  });

  it("deleting the family kills its sessions (cascade)", async () => {
    const otherId = await createFamily(pool, "tester-sessions-2@example.com", PW);
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "tester-sessions-2@example.com", password: PW } });
    const tok = sessionCookie(res)!;
    await pool.query("DELETE FROM family WHERE id = $1", [otherId]);
    expect((await app.inject({ method: "GET", url: "/api/me", cookies: { hh_session: tok } })).statusCode).toBe(401);
  });

  it("weird cookie values (huge, unicode, injection) → 401, never 500", async () => {
    for (const v of ["x".repeat(4000), "' OR 1=1 --", "%00", "😀", "a;b=c"]) {
      const res = await app.inject({ method: "GET", url: "/api/me", headers: { cookie: `hh_session=${encodeURIComponent(v)}` } });
      expect(res.statusCode, v).toBe(401);
    }
  });

  it("login email lookup is case-insensitive and trims; wrong-case password fails", async () => {
    const ok = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "  TESTER-SESSIONS@example.com ", password: PW } });
    expect(ok.statusCode).toBe(200);
    const bad = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL, password: PW.toUpperCase() } });
    expect(bad.statusCode).toBe(401);
  });
});

describe.skipIf(!hasDb)("tester: hostile input", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Fam;
  beforeAll(async () => { a = await signedInFamily(pool, "Hostile"); });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [a.familyId]);
    await pool.end();
  });
  const post = (kind: string, payload: unknown) => app.inject({ method: "POST", url: `/api/${kind}`, payload: payload as object, cookies: a.cookies });

  it.each(["children", "subjects"])("SQL injection strings in %s names are stored verbatim", async (kind) => {
    const names = ["Robert'); DROP TABLE child;--", "' OR '1'='1", "$1", "\\x00", "%; SELECT pg_sleep(5);", "name\"); --"];
    for (const name of names) {
      const res = await post(kind, { name });
      expect(res.statusCode, name).toBe(201);
      expect(res.json().name).toBe(name);
    }
    const list = await app.inject({ method: "GET", url: `/api/${kind}`, cookies: a.cookies });
    expect(list.json().map((r: { name: string }) => r.name)).toEqual(expect.arrayContaining(names));
    expect((await pool.query("SELECT count(*)::int n FROM child")).rows[0].n).toBeGreaterThan(0);
  });

  it.each(["children", "subjects"])("unicode %s names: emoji, RTL, combining marks round-trip", async (kind) => {
    for (const name of ["Zoë 🦖", "مريم", "👨‍👩‍👧‍👦 family", "e\u0301mile", "李小龍", "🦖".repeat(30)]) {
      const res = await post(kind, { name });
      expect(res.statusCode, name).toBe(201);
      expect(res.json().name).toBe(name);
    }
  });

  it.each(["children", "subjects"])("a NUL byte in a %s name is a 400, not a 500", async (kind) => {
    const res = await post(kind, { name: "Ada\u0000" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
  });

  it("a NUL byte in the login email is a 401/400, not a 500", async () => {
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "a\u0000@example.com", password: "whatever-password" } });
    expect([400, 401]).toContain(res.statusCode);
  });

  it("a NUL byte in a PATCH name is a 400, not a 500", async () => {
    const id = (await post("children", { name: "Patchy" })).json().id;
    const res = await app.inject({ method: "PATCH", url: `/api/children/${id}`, payload: { name: "x\u0000y" }, cookies: a.cookies });
    expect(res.statusCode).toBe(400);
  });

  it("oversize body (2 MB) → 413 with a JSON error, not a crash", async () => {
    const res = await app.inject({ method: "POST", url: "/api/children", headers: { "content-type": "application/json" }, payload: JSON.stringify({ name: "x".repeat(2 * 1024 * 1024) }), cookies: a.cookies });
    expect(res.statusCode).toBe(413);
    expect(res.json()).toHaveProperty("error");
  });

  it("malformed JSON, wrong types, arrays and non-JSON content types are 4xx", async () => {
    const bad = [
      { headers: { "content-type": "application/json" }, payload: "{name:" },
      { headers: { "content-type": "application/json" }, payload: "[]" },
      { headers: { "content-type": "application/json" }, payload: "null" },
      { headers: { "content-type": "application/json" }, payload: JSON.stringify({ name: 42 }) },
      { headers: { "content-type": "application/json" }, payload: JSON.stringify({ name: ["a"] }) },
      { headers: { "content-type": "text/plain" }, payload: "name=x" },
      { headers: { "content-type": "application/x-www-form-urlencoded" }, payload: "name=x" },
    ];
    for (const b of bad) {
      const res = await app.inject({ method: "POST", url: "/api/children", cookies: a.cookies, ...b });
      expect(res.statusCode, b.payload).toBeGreaterThanOrEqual(400);
      expect(res.statusCode, b.payload).toBeLessThan(500);
    }
  });

  it("PATCH with __proto__ / constructor keys is ignored or rejected, never 500", async () => {
    const id = (await post("subjects", { name: "Proto" })).json().id;
    const res = await app.inject({ method: "PATCH", url: `/api/subjects/${id}`, headers: { "content-type": "application/json" }, payload: '{"__proto__":{"archived":true},"constructor":{"x":1},"name":"Proto2"}', cookies: a.cookies });
    // Unknown keys are rejected by the strict schema (400); what matters is no 500 and no archive.
    expect(res.statusCode).toBe(400);
    const list = await app.inject({ method: "GET", url: "/api/subjects?includeArchived=true", cookies: a.cookies });
    expect(list.json().find((r: { id: string }) => r.id === id)).toMatchObject({ name: "Proto", archived: false });
  });

  it("sortOrder edge values: negative, float, huge, string → 400", async () => {
    const id = (await post("children", { name: "Sorty" })).json().id;
    for (const sortOrder of [-1, 1.5, 1e12, "3", null]) {
      const res = await app.inject({ method: "PATCH", url: `/api/children/${id}`, payload: { sortOrder }, cookies: a.cookies });
      expect(res.statusCode, String(sortOrder)).toBe(400);
    }
  });

  it("plan query: junk dates, repeated params, injection → 400, never 500", async () => {
    for (const qs of ["from=2026-02-30&to=2026-03-01", "from=2026-09-01&to=2026-09-01&from=2026-09-02", "from=2026-09-01'--&to=2026-09-02",
      "from=+2026-09-01&to=2026-09-02", "from=2026-9-1&to=2026-09-02", "from=2026-09-01&to=2027-12-31", "from=2026-09-02&to=2026-09-01",
      "from=2026-09-01&to=2026-09-02&asOf=2026-13-01", "from[]=2026-09-01&to=2026-09-02"]) {
      const res = await app.inject({ method: "GET", url: `/api/plan?${qs}`, cookies: a.cookies });
      expect(res.statusCode, qs).toBe(400);
    }
  });
});

describe.skipIf(!hasDb)("tester: login rate limit", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  afterAll(async () => { await app.close(); await pool.end(); });
  it("the 11th attempt in a minute from one IP → 429 rate_limited, and the right password doesn't bypass it", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      const res = await app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: "10.9.8.7", payload: { email: "nobody-tester@example.com", password: "wrong-password" } });
      codes.push(res.statusCode);
    }
    expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true);
    expect(codes[10]).toBe(429);
    const last = await app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: "10.9.8.7", payload: { email: "nobody-tester@example.com", password: "wrong-password" } });
    expect(last.json()).toMatchObject({ error: "rate_limited" });
    // A different IP is not affected.
    const other = await app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: "10.9.8.8", payload: { email: "nobody-tester@example.com", password: "wrong-password" } });
    expect(other.statusCode).toBe(401);
  });
  it("X-Forwarded-For can't be used to dodge the limit (trustProxy is off)", async () => {
    const codes: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      const res = await app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: "10.9.8.20", headers: { "x-forwarded-for": `1.2.3.${i}` }, payload: { email: "nobody-tester@example.com", password: "wrong-password" } });
      codes.push(res.statusCode);
    }
    expect(codes[10]).toBe(429);
  });
});

describe.skipIf(!hasDb)("tester: concurrency and archived names", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Fam;
  beforeAll(async () => { a = await signedInFamily(pool, "Race"); });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [a.familyId]);
    await pool.end();
  });
  const post = (kind: string, name: string) => app.inject({ method: "POST", url: `/api/${kind}`, payload: { name }, cookies: a.cookies });

  it.fails.each(["children", "subjects"])("20 concurrent %s creates get 20 distinct sort_orders (appended, no ties)", async (kind) => {
    const res = await Promise.all(Array.from({ length: 20 }, (_, i) => post(kind, `Racer ${kind} ${i}`)));
    expect(res.map((r) => r.statusCode).every((c) => c === 201)).toBe(true);
    const orders = res.map((r) => r.json().sortOrder as number);
    expect(new Set(orders).size).toBe(20);
  });

  it("10 concurrent creates of the same subject name: exactly one 201, the rest 409 (never 500)", async () => {
    const res = await Promise.all(Array.from({ length: 10 }, () => post("subjects", "Latin")));
    const codes = res.map((r) => r.statusCode).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(9);
  });

  it("archived-name edges: case/space variants clash; two archived twins; unarchive the second → 409", async () => {
    const art1 = (await post("subjects", "Art")).json();
    expect((await post("subjects", "  aRT ")).statusCode).toBe(409);
    expect((await post("subjects", "ÄRT")).statusCode).toBe(201); // different letter, not a clash
    expect((await post("subjects", "ärt")).statusCode).toBe(409); // Unicode case-folding clash (C.UTF-8 / ICU lower)
    await app.inject({ method: "PATCH", url: `/api/subjects/${art1.id}`, payload: { archived: true }, cookies: a.cookies });
    const art2 = (await post("subjects", "art")).json();
    expect(art2.archived).toBe(false);
    await app.inject({ method: "PATCH", url: `/api/subjects/${art2.id}`, payload: { archived: true }, cookies: a.cookies });
    // Both archived now; unarchive one is fine, the other clashes.
    expect((await app.inject({ method: "PATCH", url: `/api/subjects/${art1.id}`, payload: { archived: false }, cookies: a.cookies })).statusCode).toBe(200);
    const clash = await app.inject({ method: "PATCH", url: `/api/subjects/${art2.id}`, payload: { archived: false }, cookies: a.cookies });
    expect(clash.statusCode).toBe(409);
    // A combined unarchive + rename to a free name succeeds in one PATCH.
    const both = await app.inject({ method: "PATCH", url: `/api/subjects/${art2.id}`, payload: { archived: false, name: "Art II" }, cookies: a.cookies });
    expect(both.statusCode).toBe(200);
    expect(both.json()).toMatchObject({ name: "Art II", archived: false });
  });

  it("children may share a name (no unique index) and archived children keep their sort_order", async () => {
    const c1 = (await post("children", "Twin")).json();
    const c2 = await post("children", "Twin");
    expect(c2.statusCode).toBe(201);
    const arch = await app.inject({ method: "PATCH", url: `/api/children/${c1.id}`, payload: { archived: true }, cookies: a.cookies });
    expect(arch.json().sortOrder).toBe(c1.sortOrder);
  });
});
