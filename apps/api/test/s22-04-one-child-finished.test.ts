/** S22-04: finishing one child leaves the others open, and the plan closes only that child. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("S22-04 one child finished (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let req: ReturnType<typeof inject>;

  beforeAll(async () => {
    fam = await signedInFamily(pool, "S22-04");
    req = inject(app, fam.cookies);
    const r = await rosterFor(app, fam.cookies, ["Elias", "Margaret"], ["Reading"]);
    kids = r.childIds;
    const created = await req("POST", "/api/assignments", {
      subjectId: r.subjectIds[0], title: "Treasure Island", unitType: "pages", totalUnits: 80,
      startDate: "2026-09-07", endDate: "2026-09-18", childIds: kids,
    });
    const id = created.json().id as string;
    const finished = await req("PATCH", `/api/assignments/${id}`, {
      childEnds: [{ childId: kids[0], endedAs: "finished", endedOn: "2026-09-11" }],
    });
    expect(finished.statusCode).toBe(200);
    const by = Object.fromEntries(finished.json().children.map((c: { childId: string; endedAs: string | null }) => [c.childId, c.endedAs]));
    expect(by[kids[0]!]).toBe("finished");
    expect(by[kids[1]!]).toBeNull();
    expect(finished.json().endedAs).toBeNull();
    const plans = (await req("GET", "/api/plan?from=2026-09-07&to=2026-09-18&asOf=2026-09-07")).json() as PlanResponse;
    const elias = plans.plans.find((p) => p.assignmentId === id && p.childId === kids[0]);
    const margaret = plans.plans.find((p) => p.assignmentId === id && p.childId === kids[1]);
    expect(elias).toMatchObject({ endedAs: "finished", endedOn: "2026-09-11" });
    expect(margaret?.endedAs).toBeUndefined();
    expect(margaret?.plannedEnd).toBe("2026-09-18");
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  it("recorded the split finish", () => {
    expect(kids).toHaveLength(2);
  });
});