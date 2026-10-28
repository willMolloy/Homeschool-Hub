import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("POST /api/subjects (integration)", () => {
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
    app.inject({ method: "POST", url: "/api/subjects", payload: payload as object, cookies: cookies ?? {} });

  it("valid → 201 + row in DB with the session's family_id; appears in the list; appended last", async () => {
    const r1 = await post({ name: "  Math  ", color: "#2F6FB0" });
    expect(r1.statusCode).toBe(201);
    expect(r1.json()).toMatchObject({ name: "Math", color: "#2f6fb0", sortOrder: 0, archived: false });
    const r2 = await post({ name: "Reading" });
    expect(r2.json()).toMatchObject({ name: "Reading", color: null, sortOrder: 1 });
    const { rows } = await pool.query("SELECT family_id FROM subject WHERE id = $1", [r1.json().id]);
    expect(rows[0].family_id).toBe(a.familyId);
    const list = await app.inject({ method: "GET", url: "/api/subjects", cookies: a.cookies });
    expect(list.json().map((c: { name: string }) => c.name)).toEqual(["Math", "Reading"]);
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

  it("family_id in the body → 400 naming it; nothing inserted (RF-09)", async () => {
    const count = async () => (await pool.query("SELECT count(*)::int AS n FROM subject WHERE family_id = ANY($1::uuid[])", [[a.familyId, other.familyId]])).rows[0].n as number;
    const before = await count();
    const res = await post({ name: "Sneaky", family_id: other.familyId, familyId: other.familyId });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "invalid_request", message: expect.stringMatching(/family_id/) });
    expect(await count()).toBe(before);
  });

  it("duplicate name (different case, extra spaces) → 409 duplicate_name; nothing inserted", async () => {
    const before = await pool.query("SELECT count(*)::int AS n FROM subject WHERE family_id = $1", [a.familyId]);
    const res = await post({ name: "  mATH " });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "duplicate_name", message: "You already have a subject with that name." });
    const after = await pool.query("SELECT count(*)::int AS n FROM subject WHERE family_id = $1", [a.familyId]);
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it("the same name is fine in another family, and after the original is archived", async () => {
    expect((await post({ name: "Math" }, other.cookies)).statusCode).toBe(201);
    await pool.query("UPDATE subject SET archived_at = now() WHERE family_id = $1 AND name = 'Math'", [a.familyId]);
    expect((await post({ name: "math" })).statusCode).toBe(201);
  });

  it("signed out → 401", async () => {
    expect((await post({ name: "Nobody" }, null)).statusCode).toBe(401);
  });
});
