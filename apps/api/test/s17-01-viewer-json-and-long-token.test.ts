/** S17-01 (Sprint 15 N1, N5): the viewer role check runs before the body is parsed; a very long join token gets the plain bad-link answer. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApp } from "../src/app";
import { INVITE_UNAVAILABLE_MESSAGE } from "../src/services/invites";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";
import { viewerOf } from "./helpers/members";

describe.skipIf(!hasDb)("S17-01 N1 and N5 (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let viewer: Awaited<ReturnType<typeof viewerOf>>;
  let ip = 0;
  const raw = (method: "POST" | "PATCH" | "PUT" | "DELETE", url: string, payload: string | undefined, cookies?: { hh_session: string }) =>
    app.inject({ method, url, payload, headers: { "content-type": "application/json" }, cookies, remoteAddress: `10.17.${Math.floor(++ip / 250)}.${(ip % 250) + 1}` });

  beforeAll(async () => {
    await app.ready();
    a = await signedInFamily(pool, "S17 A");
    viewer = await viewerOf(pool, a.familyId, "s17-01-viewer@example.com");
  });
  afterAll(async () => {
    await pool.query("DELETE FROM parent WHERE lower(email) LIKE 's17-01-%'");
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId]]);
    await app.close();
    await pool.end();
  });

  describe("N1: a viewer's write gets 403 whatever the body", () => {
    it("invalid JSON, empty JSON and no body on a write route are all 403 view_only", async () => {
      for (const [method, url] of [["POST", "/api/children"], ["PATCH", `/api/children/${randomUUID()}`], ["POST", "/api/assignments"], ["PUT", "/api/week-overrides"], ["DELETE", `/api/log-entries/${randomUUID()}`]] as const) {
        for (const payload of ["garbage{{", "", undefined, "{"]) {
          const res = await raw(method, url, payload, viewer.cookies);
          expect(res.statusCode, `${method} ${url} ${JSON.stringify(payload)}`).toBe(403);
          expect(res.json().error).toBe("view_only");
        }
      }
    });
    it("a signed-out request with invalid JSON gets 401, and a parent's invalid JSON is still a 400", async () => {
      expect((await raw("POST", "/api/children", "garbage{{")).statusCode).toBe(401);
      expect((await raw("POST", "/api/children", "garbage{{", a.cookies)).statusCode).toBe(400);
    });
  });

  describe("N5: a join token over 100 characters", () => {
    it("gets the plain bad-link answer on both calls, the same as a short unknown token", async () => {
      const short = await app.inject({ method: "GET", url: `/api/join/${"t".repeat(43)}`, remoteAddress: "10.17.9.1" });
      for (const len of [101, 300, 1500]) {
        const long = await app.inject({ method: "GET", url: `/api/join/${"t".repeat(len)}`, remoteAddress: "10.17.9.2" });
        expect(long.statusCode).toBe(404);
        expect(long.json().message).toBe(INVITE_UNAVAILABLE_MESSAGE);
        expect(long.body).toBe(short.body);
        expect(long.body).not.toContain("ttttt");
      }
      const post = await app.inject({ method: "POST", url: `/api/join/${"t".repeat(150)}`, remoteAddress: "10.17.9.3", payload: { name: "N", email: "n@example.com", password: "a-long-enough-password-1" } });
      expect(post.statusCode).toBe(404);
      expect(post.json().message).toBe(INVITE_UNAVAILABLE_MESSAGE);
    });
  });

});
