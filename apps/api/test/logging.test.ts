import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app";
import { createPool } from "../src/db";
import { loggerOptions } from "../src/http/logging";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { createFamily, sessionCookie } from "./helpers/family";

const EMAIL = "logging-test@example.com";
const PASSWORD = "logging-test-password-9f3";

/** Collect the JSON lines a Fastify app writes. */
function capture() {
  const lines: Record<string, unknown>[] = [];
  const raw: string[] = [];
  return {
    lines,
    raw,
    stream: { write: (s: string) => { raw.push(s); lines.push(JSON.parse(s)); } },
  };
}

describe("loggerOptions", () => {
  it("uses LOG_LEVEL, else the NODE_ENV default, and always redacts", () => {
    expect(loggerOptions({ NODE_ENV: "production" })).toMatchObject({ level: "info" });
    expect(loggerOptions({ NODE_ENV: "development" })).toMatchObject({ level: "warn" });
    expect(loggerOptions({ NODE_ENV: "test" })).toMatchObject({ level: "silent" });
    expect(loggerOptions({ NODE_ENV: "test", LOG_LEVEL: "debug" })).toMatchObject({ level: "debug" });
    const o = loggerOptions({ NODE_ENV: "production" }) as { redact: { paths: string[]; censor: string } };
    expect(o.redact.censor).toBe("[redacted]");
    expect(o.redact.paths).toEqual(expect.arrayContaining(["req.headers.cookie", 'res.headers["set-cookie"]', "*.password"]));
  });
});

describe("pool errors", () => {
  it("an idle client error is logged and does not throw", () => {
    const error = vi.fn();
    const pool = createPool({ DATABASE_URL: "postgres://hh:hh@127.0.0.1:1/none" }, { error });
    const err = new Error("terminating connection due to administrator command");
    expect(() => pool.emit("error", err)).not.toThrow();
    expect(error).toHaveBeenCalledWith({ err }, "idle database client error");
    void pool.end();
  });
  it("a throwing logger still does not crash", () => {
    const pool = createPool({ DATABASE_URL: "postgres://hh:hh@127.0.0.1:1/none" }, { error: () => { throw new Error("x"); } });
    expect(() => pool.emit("error", new Error("boom"))).not.toThrow();
    void pool.end();
  });
});

describe.skipIf(!hasDb)("production logging (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  let familyId = "";
  beforeAll(async () => {
    familyId = await createFamily(pool, EMAIL, PASSWORD, "Logging family");
  });
  afterAll(async () => {
    await pool.query("DELETE FROM family WHERE id = $1", [familyId]);
    await pool.end();
  });
  const prodApp = (logStream: { write(s: string): void }) =>
    buildApp(testConfig({ NODE_ENV: "production", LOG_LEVEL: "info" }), { db: pool, logStream });

  it("logs one request line per request with no password, cookie or token", async () => {
    const cap = capture();
    const app = prodApp(cap.stream);
    const bad = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL, password: "wrong-" + PASSWORD } });
    expect(bad.statusCode).toBe(401);
    const ok = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL, password: PASSWORD } });
    expect(ok.statusCode).toBe(200);
    const token = sessionCookie(ok)!;
    const setCookie = String(ok.headers["set-cookie"]);
    const me = await app.inject({ method: "GET", url: "/api/me", headers: { cookie: `hh_session=${token}`, authorization: "Bearer abc" } });
    expect(me.statusCode).toBe(200);
    await app.close();

    const all = cap.raw.join("\n");
    expect(all).not.toContain(PASSWORD);
    expect(all).not.toContain(token);
    expect(all).not.toContain(setCookie);
    expect(all).not.toMatch(/hh_session|Bearer abc/);

    const done = cap.lines.filter((l) => l.msg === "request completed");
    expect(done.map((l) => (l.res as { statusCode: number }).statusCode)).toEqual([401, 200, 200]);
    const req = cap.lines.find((l) => l.msg === "incoming request" && (l.req as { url: string }).url === "/api/me")!.req;
    expect(req).toEqual({ method: "GET", url: "/api/me", route: "/api/me", ip: "127.0.0.1" });
  });

  it("a 500 is logged at error level with the stack", async () => {
    const cap = capture();
    const app = prodApp(cap.stream);
    app.get("/api/test-boom", { config: { public: true } }, async () => {
      throw new Error("kaboom-for-the-log");
    });
    const res = await app.inject({ method: "GET", url: "/api/test-boom" });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: "internal_error", message: "Something went wrong." });
    await app.close();
    const line = cap.lines.find((l) => l.msg === "request failed")!;
    expect(line.level).toBe(50);
    expect((line.err as { stack: string }).stack).toContain("kaboom-for-the-log");
  });

  it("a bad stored time zone logs one warning with familyId and timeZone", async () => {
    await pool.query("UPDATE family SET time_zone = 'Mars/Olympus_Mons' WHERE id = $1", [familyId]);
    try {
      const cap = capture();
      const app = prodApp(cap.stream);
      const login = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: EMAIL, password: PASSWORD } });
      const res = await app.inject({
        method: "GET",
        url: "/api/plan?from=2026-11-02&to=2026-11-08",
        headers: { cookie: `hh_session=${sessionCookie(login)}` },
      });
      expect(res.statusCode).toBe(200);
      await app.close();
      const warns = cap.lines.filter((l) => l.level === 40);
      expect(warns).toHaveLength(1);
      expect(warns[0]).toMatchObject({ familyId, timeZone: "Mars/Olympus_Mons", msg: "invalid family time_zone; using default" });
    } finally {
      await pool.query("UPDATE family SET time_zone = 'America/Chicago' WHERE id = $1", [familyId]);
    }
  });
});
