/** S22-01: creating a book and changing its end write that end onto every child. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("S22-01 child end (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let subject = "";
  let req: ReturnType<typeof inject>;

  beforeAll(async () => {
    fam = await signedInFamily(pool, "S22-01");
    req = inject(app, fam.cookies);
    const r = await rosterFor(app, fam.cookies, ["Elias", "Margaret", "Wren"], ["Reading"]);
    kids = r.childIds;
    subject = r.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  const stored = (id: string) => pool.query<{ child_id: string; end_date: string; ended_as: string | null; ended_on: string | null }>(
    `SELECT child_id, end_date::text, ended_as, ended_on::text FROM assignment_child WHERE assignment_id = $1 ORDER BY child_id`,
    [id],
  ).then((r) => r.rows);

  it("creates the book with the same end on every child, and a new child joins that end", async () => {
    const created = await req("POST", "/api/assignments", {
      subjectId: subject, title: "Treasure Island", unitType: "pages", totalUnits: 100,
      startDate: "2026-10-01", endDate: "2026-10-30", childIds: [kids[0], kids[1]],
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;
    const open = (end: string, endedAs: string | null = null, endedOn: string | null = null) =>
      [kids[0]!, kids[1]!].map((childId) => ({ childId, endDate: end, endedAs, endedOn }));
    expect(created.json().children).toEqual(expect.arrayContaining(open("2026-10-30")));
    expect(created.json().children).toHaveLength(2);
    const rows = await stored(id);
    expect(rows.map((r) => r.child_id).sort()).toEqual([kids[0]!, kids[1]!].sort());
    expect(rows.every((r) => r.end_date === "2026-10-30" && r.ended_as === null && r.ended_on === null)).toBe(true);

    const moved = await req("PATCH", `/api/assignments/${id}`, { endDate: "2026-11-20" });
    expect(moved.statusCode).toBe(200);
    expect(moved.json().endDate).toBe("2026-11-20");
    expect(moved.json().children.map((c: { endDate: string }) => c.endDate)).toEqual(["2026-11-20", "2026-11-20"]);

    const finished = await req("PATCH", `/api/assignments/${id}`, { endedAs: "finished", endedOn: "2026-11-20" });
    expect(finished.json().children).toEqual(expect.arrayContaining(open("2026-11-20", "finished", "2026-11-20")));
    expect(finished.json().children).toHaveLength(2);

    const added = await req("PATCH", `/api/assignments/${id}`, { childIds: kids });
    expect(added.statusCode).toBe(200);
    const joined = await stored(id);
    expect(joined).toHaveLength(3);
    expect(joined.every((r) => r.end_date === "2026-11-20" && r.ended_as === "finished" && r.ended_on === "2026-11-20")).toBe(true);
  });
});
