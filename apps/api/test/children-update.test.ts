import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("PATCH /api/children/:id (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let kid = "";
  let othersKid = "";
  beforeAll(async () => {
    a = await signedInFamily(pool, "Patch A");
    b = await signedInFamily(pool, "Patch B");
    kid = (await app.inject({ method: "POST", url: "/api/children", payload: { name: "Frank", color: "#2f6fb0" }, cookies: a.cookies })).json().id;
    othersKid = (await app.inject({ method: "POST", url: "/api/children", payload: { name: "Theirs" }, cookies: b.cookies })).json().id;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const patch = (id: string, payload: unknown, cookies = a.cookies) =>
    app.inject({ method: "PATCH", url: `/api/children/${id}`, payload: payload as object, cookies });
  const names = async () =>
    (await app.inject({ method: "GET", url: "/api/children", cookies: a.cookies })).json().map((c: { name: string }) => c.name);

  it("rename → 200 + new name (trimmed), other fields untouched", async () => {
    const res = await patch(kid, { name: "  Francis " });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: kid, name: "Francis", color: "#2f6fb0", archived: false });
  });

  it("color can be changed or cleared; sortOrder can be set", async () => {
    expect((await patch(kid, { color: "#B0482F" })).json().color).toBe("#b0482f");
    expect((await patch(kid, { color: null })).json().color).toBeNull();
    expect((await patch(kid, { sortOrder: 7 })).json().sortOrder).toBe(7);
  });

  it("archive → disappears from the default list; unarchive → reappears", async () => {
    const r = await patch(kid, { archived: true });
    expect(r.statusCode).toBe(200);
    expect(r.json().archived).toBe(true);
    expect(await names()).not.toContain("Francis");
    const r2 = await patch(kid, { archived: false });
    expect(r2.json().archived).toBe(false);
    expect(await names()).toContain("Francis");
  });

  it("another family's id → 404, and their row is unchanged", async () => {
    const res = await patch(othersKid, { name: "Hijacked" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("not_found");
    const { rows } = await pool.query("SELECT name FROM child WHERE id = $1", [othersKid]);
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
    const res = await patch(kid, payload);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
  });

  it("signed out → 401", async () => {
    const res = await app.inject({ method: "PATCH", url: `/api/children/${kid}`, payload: { name: "X" } });
    expect(res.statusCode).toBe(401);
  });
});
