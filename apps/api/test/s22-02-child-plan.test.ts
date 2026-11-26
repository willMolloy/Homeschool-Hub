/** S22-02: the plan uses each child's stored end. A copied row does not move the plan. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("S22-02 child plan (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let subject = "";
  let req: ReturnType<typeof inject>;

  beforeAll(async () => {
    fam = await signedInFamily(pool, "S22-02");
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

  const planOf = async (id: string) => {
    const body = (await req("GET", "/api/plan?from=2026-09-07&to=2026-09-18&asOf=2026-09-07")).json() as PlanResponse;
    return kids.map((childId) => body.plans.find((p) => p.assignmentId === id && p.childId === childId)!);
  };

  it("a copied end plans both children the same, and a forked end or finish does not", async () => {
    const created = await req("POST", "/api/assignments", {
      subjectId: subject, title: "Treasure Island", unitType: "pages", totalUnits: 100,
      startDate: "2026-09-07", endDate: "2026-09-18", childIds: kids,
    });
    const id = created.json().id as string;
    const [beforeE, beforeM] = await planOf(id);
    expect(beforeE!.plannedEnd).toBe("2026-09-18");
    expect(beforeM!.plannedEnd).toBe("2026-09-18");
    expect(beforeE!.days.map((d) => d.units)).toEqual(beforeM!.days.map((d) => d.units));

    await pool.query(
      "UPDATE assignment_child SET end_date = '2026-09-11' WHERE assignment_id = $1 AND child_id = $2",
      [id, kids[1]],
    );
    const [forkE, forkM] = await planOf(id);
    expect(forkE!.plannedEnd).toBe("2026-09-18");
    expect(forkM!.plannedEnd).toBe("2026-09-11");
    expect(forkE!.days.map((d) => d.units)).toEqual(beforeE!.days.map((d) => d.units));

    await pool.query(
      "UPDATE assignment_child SET ended_as = 'finished', ended_on = '2026-09-11' WHERE assignment_id = $1 AND child_id = $2",
      [id, kids[0]],
    );
    const [doneE, doneM] = await planOf(id);
    expect(doneE).toMatchObject({ endedAs: "finished", endedOn: "2026-09-11" });
    expect(doneM!.endedAs).toBeUndefined();
    expect(doneM!.plannedEnd).toBe("2026-09-11");
  });
});
