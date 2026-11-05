/** S14-04: a session lasts 30 days from its last use; expired ones are cleaned up; signing out ends only that device. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { SESSION_DAYS, SESSION_MAX_AGE_S, hashSessionToken, sweepExpiredSessions } from "../src/auth/session";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { createFamily, sessionCookie } from "./helpers/family";

const PW = "sessions-test-password";

describe.skipIf(!hasDb)("sessions (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let famA = ""; let famB = "";
  let ip = 0; // the sign-in throttle is per address
  const login = (email: string) => app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: `10.14.7.${++ip}`, payload: { email, password: PW } });
  const me = (token: string) => app.inject({ method: "GET", url: "/api/me", cookies: { hh_session: token } });
  const age = (token: string, days: number) => pool.query(
    "UPDATE session SET last_seen_at = last_seen_at - make_interval(days => $2), expires_at = expires_at - make_interval(days => $2) WHERE id = $1", [hashSessionToken(token), days]);
  const row = async (token: string) => (await pool.query("SELECT expires_at, last_seen_at FROM session WHERE id = $1", [hashSessionToken(token)])).rows[0];
  beforeAll(async () => {
    famA = await createFamily(pool, "s14-04-a1@example.com", PW, "Family A");
    await pool.query("DELETE FROM parent WHERE lower(email) = 's14-04-a2@example.com'");
    await pool.query("INSERT INTO parent (family_id, name, email, password_hash) SELECT $1, 'Second', 's14-04-a2@example.com', password_hash FROM parent WHERE family_id = $1", [famA]);
    famB = await createFamily(pool, "s14-04-b@example.com", PW, "Family B");
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[famA, famB]]);
    await pool.end();
  });

  it("a sign-in lasts 30 days: the session row and the cookie say so", async () => {
    expect(SESSION_DAYS).toBe(30);
    const res = await login("s14-04-a1@example.com");
    const token = sessionCookie(res)!;
    const r = await row(token);
    expect((r.expires_at.getTime() - Date.now()) / 86400000).toBeCloseTo(30, 1);
    expect(res.cookies.find((c) => c.name === "hh_session")!.maxAge).toBe(SESSION_MAX_AGE_S);
    expect(SESSION_MAX_AGE_S).toBe(30 * 86400);
  });

  it("one used every day stays valid for 40 days", async () => {
    const token = sessionCookie(await login("s14-04-a1@example.com"))!;
    for (let day = 1; day <= 40; day++) {
      await age(token, 1);
      expect((await me(token)).statusCode, `day ${day}`).toBe(200);
    }
  });

  it("one not used for 31 days is refused, and 29 days is still fine (and slides)", async () => {
    const stale = sessionCookie(await login("s14-04-a1@example.com"))!;
    await age(stale, 31);
    expect((await me(stale)).statusCode).toBe(401);
    const ok = sessionCookie(await login("s14-04-a1@example.com"))!;
    await age(ok, 29);
    const res = await me(ok);
    expect(res.statusCode).toBe(200);
    expect(sessionCookie(res)).toBe(ok); // the cookie is renewed with it
    expect(((await row(ok)).expires_at.getTime() - Date.now()) / 86400000).toBeGreaterThan(29.9);
  });

  it("a session that expired a second ago is refused", async () => {
    const token = sessionCookie(await login("s14-04-a1@example.com"))!;
    await pool.query("UPDATE session SET expires_at = now() - interval '1 second' WHERE id = $1", [hashSessionToken(token)]);
    expect((await me(token)).statusCode).toBe(401);
  });

  it("signing out ends only that device's session", async () => {
    const phone = sessionCookie(await login("s14-04-a1@example.com"))!;
    const laptop = sessionCookie(await login("s14-04-a1@example.com"))!;
    const other = sessionCookie(await login("s14-04-a2@example.com"))!;
    const outsider = sessionCookie(await login("s14-04-b@example.com"))!;
    expect((await app.inject({ method: "POST", url: "/api/auth/logout", cookies: { hh_session: phone } })).statusCode).toBe(204);
    expect((await me(phone)).statusCode).toBe(401);
    for (const still of [laptop, other, outsider]) expect((await me(still)).statusCode).toBe(200);
  });

  it("expired sessions are deleted at the next sign-in, and live ones are kept", async () => {
    const live = sessionCookie(await login("s14-04-a1@example.com"))!;
    const dead = sessionCookie(await login("s14-04-b@example.com"))!;
    await pool.query("UPDATE session SET expires_at = now() - interval '2 days' WHERE id = $1", [hashSessionToken(dead)]);
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ('s14-04-orphan-expired', $1, now() - interval '1 hour')", [famB]);
    await login("s14-04-a2@example.com");
    expect(await row(dead)).toBeUndefined();
    expect((await pool.query("SELECT 1 FROM session WHERE id = 's14-04-orphan-expired'")).rowCount).toBe(0);
    expect(await row(live)).toBeTruthy();
    expect((await me(live)).statusCode).toBe(200);
  });

  it("sweepExpiredSessions counts what it removed and touches nothing else", async () => {
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ('s14-04-old-1', $1, now() - interval '1 day'), ('s14-04-old-2', $1, now() - interval '1 second'), ('s14-04-new', $1, now() + interval '1 day')", [famA]);
    expect(await sweepExpiredSessions(pool)).toBeGreaterThanOrEqual(2);
    expect((await pool.query("SELECT id FROM session WHERE id LIKE 's14-04-%' ORDER BY id")).rows).toEqual([{ id: "s14-04-new" }]);
    expect(await sweepExpiredSessions(pool)).toBe(0);
  });

  it("a wrong password and an unknown email answer with the same one message", async () => {
    const wrong = await app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: `10.14.7.${++ip}`, payload: { email: "s14-04-a1@example.com", password: "wrong-wrong" } });
    const unknown = await app.inject({ method: "POST", url: "/api/auth/login", remoteAddress: `10.14.7.${++ip}`, payload: { email: "s14-04-nobody@example.com", password: "wrong-wrong" } });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.body).toBe(unknown.body);
    expect(wrong.json()).toEqual({ error: "invalid_credentials", message: "That email and password don't match." });
  });
});
