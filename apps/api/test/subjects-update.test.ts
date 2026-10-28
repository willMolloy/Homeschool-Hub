import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("PATCH /api/subjects/:id (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let subj = "";
  let othersSubject = "";
  beforeAll(async () => {
    a = await signedInFamily(pool, "Patch A");
    b = await signedInFamily(pool, "Patch B");
    subj = (await app.inject({ method: "POST", url: "/api/subjects", payload: { name: "Math", color: "#2f6fb0" }, cookies: a.cookies })).json().id;
    othersSubject = (await app.inject({ method: "POST", url: "/api/subjects", payload: { name: "Theirs" }, cookies: b.cookies })).json().id;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const patch = (id: string, payload: unknown, cookies = a.cookies) =>
    app.inject({ method: "PATCH", url: `/api/subjects/${id}`, payload: payload as object, cookies });
  const names = async () =>
    (await app.inject({ method: "GET", url: "/api/subjects", cookies: a.cookies })).json().map((c: { name: string }) => c.name);

  it("rename → 200 + new name (trimmed), other fields untouched", async () => {
    const res = await patch(subj, { name: "  Maths " });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: subj, name: "Maths", color: "#2f6fb0", archived: false });
  });

  it("color can be changed or cleared; sortOrder can be set", async () => {
    expect((await patch(subj, { color: "#B0482F" })).json().color).toBe("#b0482f");
    expect((await patch(subj, { color: null })).json().color).toBeNull();
    expect((await patch(subj, { sortOrder: 7 })).json().sortOrder).toBe(7);
  });

  it("archive → disappears from the default list; unarchive → reappears", async () => {
    const r = await patch(subj, { archived: true });
    expect(r.statusCode).toBe(200);
    expect(r.json().archived).toBe(true);
    expect(await names()).not.toContain("Maths");
    const r2 = await patch(subj, { archived: false });
    expect(r2.json().archived).toBe(false);
    expect(await names()).toContain("Maths");
  });

  it("another family's id → 404, and their row is unchanged", async () => {
    const res = await patch(othersSubject, { name: "Hijacked" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("not_found");
    const { rows } = await pool.query("SELECT name FROM subject WHERE id = $1", [othersSubject]);
    expect(rows[0].name).toBe("Theirs");
  });

  it.each(["not-a-uuid", "123", "00000000-0000-0000-0000-00000000000g"])("malformed id %s → 404", async (id) => {
    const res = await patch(id, { name: "X" });
    expect(res.statusCode).toBe(404);
  });

  it("unknown (well-formed) id → 404", async () => {
    expect((await patch("00000000-0000-4000-8000-000000000000", { name: "X" })).statusCode).toBe(404);
  });

  it.each([
    ["empty body", {}],
    ["only unknown keys", { family_id: "x" }],
    ["blank name", { name: " " }],
    ["bad color", { color: "red" }],
    ["negative sortOrder", { sortOrder: -1 }],
    ["fractional sortOrder", { sortOrder: 1.5 }],
    ["archived as string", { archived: "yes" }],
  ])("%s → 400", async (_l, payload) => {
    const res = await patch(subj, payload);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
  });

  it("rename to an existing active name (any case) → 409 duplicate_name; row unchanged", async () => {
    await app.inject({ method: "POST", url: "/api/subjects", payload: { name: "History" }, cookies: a.cookies });
    const res = await patch(subj, { name: "history" });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "duplicate_name", message: "You already have a subject with that name." });
    const { rows } = await pool.query("SELECT name FROM subject WHERE id = $1", [subj]);
    expect(rows[0].name).toBe("Maths");
  });

  it("renaming to its own name in a different case is fine", async () => {
    expect((await patch(subj, { name: "MATHS" })).statusCode).toBe(200);
    expect((await patch(subj, { name: "Maths" })).json().name).toBe("Maths");
  });

  it("unarchiving into a name clash → 409; it stays archived", async () => {
    expect((await patch(subj, { archived: true })).statusCode).toBe(200);
    await app.inject({ method: "POST", url: "/api/subjects", payload: { name: "maths" }, cookies: a.cookies });
    const res = await patch(subj, { archived: false });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("duplicate_name");
    const { rows } = await pool.query("SELECT archived_at FROM subject WHERE id = $1", [subj]);
    expect(rows[0].archived_at).not.toBeNull();
  });

  it("signed out → 401", async () => {
    const res = await app.inject({ method: "PATCH", url: `/api/subjects/${subj}`, payload: { name: "X" } });
    expect(res.statusCode).toBe(401);
  });
});
