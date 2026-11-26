/** S22-08: undo after a break restores every child's end, including one the sheet did not move. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listBreakOverlaps, resolveEndDates } from "@hh/engine";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("S22-08 undo each child's end (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let subject = "";
  let req: ReturnType<typeof inject>;

  beforeAll(async () => {
    fam = await signedInFamily(pool, "S22-08");
    req = inject(app, fam.cookies);
    const r = await rosterFor(app, fam.cookies, ["Elias", "Margaret"], ["Reading"]);
    kids = r.childIds;
    subject = r.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  it("undo of a push for one child puts that child back and leaves the other", async () => {
    const created = await req("POST", "/api/assignments", {
      subjectId: subject, title: "History spine", unitType: "pages", totalUnits: 100,
      startDate: "2026-01-05", endDate: "2026-05-21", childIds: kids,
    });
    const id = created.json().id as string;
    await req("PATCH", `/api/assignments/${id}`, { childEnds: [{ childId: kids[0], endDate: "2026-02-06" }] });
    const book = {
      id, title: "History spine", start: "2026-01-05", end: "2026-05-21",
      childIds: kids, weekdays: null, subjectId: subject,
      children: [
        { childId: kids[0]!, end: "2026-02-06", endedAs: null },
        { childId: kids[1]!, end: "2026-05-21", endedAs: null },
      ],
    };
    const feb = { start: "2026-02-01", end: "2026-02-28", childIds: [] as string[] };
    const rows = listBreakOverlaps({ breaks: [feb], assignments: [book], existing: [], schoolDays: [1, 2, 3, 4, 5] });
    const elias = rows.find((r) => r.childId === kids[0])!;
    const resolved = resolveEndDates(rows, rows.map((r) => (r.childId === kids[0] ? { kind: "push" as const } : { kind: "keep" as const })), [book], [feb], [], { schoolDays: [1, 2, 3, 4, 5] });
    const saved = await req("POST", "/api/blocked-ranges", {
      label: "February", kind: "vacation", startDate: "2026-02-01", endDate: "2026-02-28", childIds: [],
      adjustments: resolved.ends,
    });
    expect(saved.statusCode, saved.body).toBe(201);
    const after = (await req("GET", "/api/assignments")).json().find((a: { id: string }) => a.id === id);
    const endOf = (childId: string) => after.children.find((c: { childId: string; endDate: string }) => c.childId === childId).endDate;
    expect(endOf(kids[0]!)).toBe(elias.pushedEnd);
    expect(endOf(kids[1]!)).toBe("2026-05-21");

    expect((await req("POST", "/api/undo")).statusCode).toBe(200);
    const back = (await req("GET", "/api/assignments")).json().find((a: { id: string }) => a.id === id);
    const restored = (childId: string) => back.children.find((c: { childId: string; endDate: string }) => c.childId === childId).endDate;
    expect(restored(kids[0]!)).toBe("2026-02-06");
    expect(restored(kids[1]!)).toBe("2026-05-21");
  });
});
