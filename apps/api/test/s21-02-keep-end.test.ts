/** S21-02: confirming keep saves the break and leaves the book's end date where it was. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("keep the end date when a break overlaps (S21-02)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let cookies: { hh_session: string };
  let familyId = "";
  let req: ReturnType<typeof inject>;
  let childId = "";
  let subjectId = "";

  beforeAll(async () => {
    const fam = await signedInFamily(pool, "Keep end");
    cookies = fam.cookies;
    familyId = fam.familyId;
    req = inject(app, cookies);
    const roster = await rosterFor(app, cookies, ["Frank"], ["Literature"]);
    childId = roster.childIds[0]!;
    subjectId = roster.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [familyId]);
    await pool.end();
  });

  it("saves the break, leaves May 21, and does not place the book in February", async () => {
    const made = await req("POST", "/api/assignments", {
      subjectId, title: "The Hobbit", unitType: "pages", totalUnits: 100, startDate: "2026-01-05", endDate: "2026-05-21", childIds: [childId],
    });
    expect(made.statusCode).toBe(201);
    const id = made.json().id as string;
    const saved = await req("POST", "/api/blocked-ranges", {
      label: "February", kind: "vacation", startDate: "2026-02-01", endDate: "2026-02-28", adjustments: [],
    });
    expect(saved.statusCode).toBe(201);
    const listed = (await req("GET", "/api/assignments")).json() as { id: string; endDate: string }[];
    expect(listed.find((a) => a.id === id)?.endDate).toBe("2026-05-21");
    const plan = (await req("GET", "/api/plan?from=2026-01-05&to=2026-05-21&asOf=2026-01-05")).json();
    const days = plan.plans.find((p: { assignmentId: string }) => p.assignmentId === id).days;
    const on = (date: string) => days.find((d: { date: string }) => d.date === date);
    expect(on("2026-02-02").units).toBe(0);
    expect(on("2026-01-05").units).toBeGreaterThan(0);
    expect(plan.plans.find((p: { assignmentId: string }) => p.assignmentId === id).end).toBe("2026-05-21");
  });
});
