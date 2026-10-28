import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("POST /api/children (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let other: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Create A");
    other = await signedInFamily(pool, "Create Other");
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, other.familyId]]);
    await pool.end();
  });

  const post = (payload: unknown, cookies: { hh_session: string } | null = a.cookies) =>
    app.inject({ method: "POST", url: "/api/children", payload: payload as object, cookies: cookies ?? {} });

  it("valid → 201 + row in DB with the session's family_id; appears in the list; appended last", async () => {
    const r1 = await post({ name: "  Frank  ", color: "#2F6FB0" });
    expect(r1.statusCode).toBe(201);
    expect(r1.json()).toMatchObject({ name: "Frank", color: "#2f6fb0", sortOrder: 0, archived: false });
    const r2 = await post({ name: "Margaret" });
    expect(r2.json()).toMatchObject({ name: "Margaret", color: null, sortOrder: 1 });
    const { rows } = await pool.query("SELECT family_id FROM child WHERE id = $1", [r1.json().id]);
    expect(rows[0].family_id).toBe(a.familyId);
    const list = await app.inject({ method: "GET", url: "/api/children", cookies: a.cookies });
    expect(list.json().map((c: { name: string }) => c.name)).toEqual(["Frank", "Margaret"]);
  });

  it.each([
    ["empty name", { name: "" }],
    ["whitespace name", { name: "   " }],
    ["61-char name", { name: "x".repeat(61) }],
    ["missing name", {}],
    ["bad color", { name: "Ann", color: "blue" }],
    ["short hex color", { name: "Ann", color: "#abc" }],
  ])("%s → 400", async (_label, payload) => {
    const res = await post(payload);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
  });

  it("60-char name is fine", async () => {
    expect((await post({ name: "y".repeat(60) })).statusCode).toBe(201);
  });

  it("family_id in the body is ignored", async () => {
    const res = await post({ name: "Sneaky", family_id: other.familyId, familyId: other.familyId });
    expect(res.statusCode).toBe(201);
    const { rows } = await pool.query("SELECT family_id FROM child WHERE id = $1", [res.json().id]);
    expect(rows[0].family_id).toBe(a.familyId);
  });

  it("signed out → 401", async () => {
    expect((await post({ name: "Nobody" }, null)).statusCode).toBe(401);
  });
});
