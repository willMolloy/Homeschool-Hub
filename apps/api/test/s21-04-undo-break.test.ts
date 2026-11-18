/** S21-04: one undo removes the break and puts every end date back, including a keep and a push in the same save. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listBreakOverlaps } from "@hh/engine";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("undo a break with the schedule changes (S21-04)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let familyId = "";
  let req: ReturnType<typeof inject>;
  let childId = "";
  let subjectId = "";

  beforeAll(async () => {
    const fam = await signedInFamily(pool, "Undo break");
    familyId = fam.familyId;
    req = inject(app, fam.cookies);
    const roster = await rosterFor(app, fam.cookies, ["Frank"], ["Literature"]);
    childId = roster.childIds[0]!;
    subjectId = roster.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [familyId]);
    await pool.end();
  });

  const make = (title: string) => req("POST", "/api/assignments", {
    subjectId, title, unitType: "pages", totalUnits: 100, startDate: "2026-01-05", endDate: "2026-05-21", childIds: [childId],
  });
  const ends = async () => new Map(((await req("GET", "/api/assignments")).json() as { id: string; endDate: string; title: string }[]).map((a) => [a.id, a.endDate]));
  const label = async () => (await req("GET", "/api/undo")).json()?.label as string | undefined;
  const undoRows = async () => (await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM undo_entry WHERE family_id = $1", [familyId])).rows[0]!.n;

  it("one undo after a keep and a push restores the snapshot", async () => {
    const kept = (await make("Kept")).json().id as string;
    const moved = (await make("Moved")).json().id as string;
    const before = await ends();
    const [row] = listBreakOverlaps({
      breaks: [{ start: "2026-02-01", end: "2026-02-28", childIds: [] }],
      assignments: [{ id: moved, title: "Moved", start: "2026-01-05", end: "2026-05-21", childIds: [childId], weekdays: null, subjectId }],
      existing: [],
      schoolDays: [1, 2, 3, 4, 5],
    });
    const saved = await req("POST", "/api/blocked-ranges", {
      label: "February", startDate: "2026-02-01", endDate: "2026-02-28",
      adjustments: [{ assignmentId: moved, endDate: row!.pushedEnd }],
    });
    expect(saved.statusCode).toBe(201);
    expect(await label()).toBe("Added February break");
    expect(await undoRows()).toBe(1);
    expect((await ends()).get(moved)).toBe(row!.pushedEnd);
    expect((await ends()).get(kept)).toBe("2026-05-21");

    const undone = await req("POST", "/api/undo");
    expect(undone.statusCode).toBe(200);
    expect((await req("GET", "/api/blocked-ranges")).json()).toEqual([]);
    expect(await ends()).toEqual(before);
    expect(await label()).toBeUndefined();
    expect((await req("POST", "/api/undo")).statusCode).toBe(404);
  });

  it("undo of an edited break restores its old dates and the old end", async () => {
    const id = (await make("Edited")).json().id as string;
    const created = await req("POST", "/api/blocked-ranges", { label: "March", startDate: "2026-03-02", endDate: "2026-03-06" });
    expect(await label()).toBe("Added a day off");
    const breakId = created.json().id as string;
    const edited = await req("PATCH", `/api/blocked-ranges/${breakId}`, {
      label: "February", startDate: "2026-02-01", endDate: "2026-03-06",
      adjustments: [{ assignmentId: id, endDate: "2026-06-01" }],
    });
    expect(edited.statusCode).toBe(200);
    expect(await label()).toBe("Updated February break");
    expect(await undoRows()).toBe(1);
    expect((await req("POST", "/api/undo")).statusCode).toBe(200);
    expect((await req("GET", "/api/blocked-ranges")).json()).toEqual([
      expect.objectContaining({ id: breakId, label: "March", startDate: "2026-03-02", endDate: "2026-03-06" }),
    ]);
    expect((await ends()).get(id)).toBe("2026-05-21");
  });

  it("a later change is its own undo and does not reach back into the break", async () => {
    const id = (await make("Later")).json().id as string;
    await req("POST", "/api/blocked-ranges", {
      label: "April", startDate: "2026-04-06", endDate: "2026-04-10",
      adjustments: [{ assignmentId: id, endDate: "2026-06-01" }],
    });
    expect(await label()).toBe("Added April break");
    await req("PATCH", `/api/assignments/${id}`, { title: "Later still" });
    expect(await label()).toBe("Changed Later still");
    expect((await req("POST", "/api/undo")).statusCode).toBe(200);
    const rows = (await req("GET", "/api/assignments")).json() as { id: string; title: string; endDate: string }[];
    expect(rows.find((a) => a.id === id)).toMatchObject({ title: "Later", endDate: "2026-06-01" });
    expect((await req("GET", "/api/blocked-ranges")).json()).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "April", startDate: "2026-04-06", endDate: "2026-04-10" }),
    ]));
  });
});
