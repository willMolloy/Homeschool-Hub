import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { hashSessionToken, newSessionToken } from "../src/auth/session";
import type { AssignmentJson } from "../src/repos/assignmentRepo";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("GET /api/assignments (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let other: Awaited<ReturnType<typeof signedInFamily>>;
  let cookies: { hh_session: string };
  beforeAll(async () => {
    fam = await seedFamily("assignments-list@example.com");
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [hashSessionToken(token), fam.familyId]);
    cookies = { hh_session: token };
    other = await signedInFamily(pool, "Assignments other");
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[fam.familyId, other.familyId]]);
    await pool.end();
  });

  const list = async (qs = "", c: { hh_session: string } = cookies) =>
    (await app.inject({ method: "GET", url: `/api/assignments${qs}`, cookies: c })).json() as AssignmentJson[];

  it("seed family → 14 rows with child ids; numbers are numbers, dates are strings", async () => {
    const rows = await list();
    expect(rows).toHaveLength(14);
    const childIds = new Set(Object.values(fam.ids.child));
    for (const a of rows) {
      expect(Object.keys(a).sort()).toEqual(["archived", "childIds", "endDate", "id", "minutesPerUnit", "startDate", "subjectId", "title", "unitType", "totalUnits", "weightPerUnit"].sort());
      expect(typeof a.totalUnits).toBe("number");
      expect(a.minutesPerUnit === null || typeof a.minutesPerUnit === "number").toBe(true);
      expect(a.weightPerUnit === null || typeof a.weightPerUnit === "number").toBe(true);
      expect(a.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a.childIds.length).toBeGreaterThan(0);
      for (const c of a.childIds) expect(childIds.has(c)).toBe(true);
      expect(a.archived).toBe(false);
    }
    expect(new Set(rows.map((r) => r.id))).toEqual(new Set(Object.values(fam.ids.assignment)));
  });

  it("sorted by start date, then title", async () => {
    const rows = await list();
    const keys = rows.map((r) => `${r.startDate} ${r.title.toLowerCase()}`);
    expect(keys).toEqual([...keys].sort());
  });

  it("archived hidden by default, shown with includeArchived=true", async () => {
    const id = Object.values(fam.ids.assignment)[0]!;
    await pool.query("UPDATE assignment SET archived_at = now() WHERE id = $1", [id]);
    try {
      expect((await list()).map((r) => r.id)).not.toContain(id);
      const all = await list("?includeArchived=true");
      expect(all).toHaveLength(14);
      expect(all.find((r) => r.id === id)?.archived).toBe(true);
    } finally {
      await pool.query("UPDATE assignment SET archived_at = NULL WHERE id = $1", [id]);
    }
  });

  it("another family sees none of these rows", async () => {
    expect(await list("?includeArchived=true", other.cookies)).toEqual([]);
  });

  it("signed out → 401", async () => {
    expect((await app.inject({ method: "GET", url: "/api/assignments" })).statusCode).toBe(401);
  });
});
