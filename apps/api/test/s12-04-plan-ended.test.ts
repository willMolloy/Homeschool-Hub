/** S12-04: GET /api/plan closes an assignment the parent said had ended; the check-in week no longer plans work after it. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("the plan for ended assignments (S12-04, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-11-04T18:00:00Z") }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let id = "";
  const plan = async () => ((await req("GET", "/api/plan?from=2026-09-01&to=2026-12-31")).json() as PlanResponse);
  const mine = async () => (await plan()).plans.find((p) => p.assignmentId === id)!;

  beforeAll(async () => {
    a = await signedInFamily(pool, "Ended plan");
    req = inject(app, a.cookies);
    const r = await rosterFor(app, a.cookies, ["Frank"], ["Reading"]);
    id = (await req("POST", "/api/assignments", {
      subjectId: r.subjectIds[0], title: "Treasure Island", unitType: "pages", totalUnits: 200, weightPerUnit: 2, startDate: "2026-09-07", endDate: "2026-10-30", childIds: r.childIds,
    })).json().id;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [a.familyId]);
    await pool.end();
  });

  it("an open assignment has no ended fields; the engine is 0.14.0", async () => {
    const p = await plan();
    expect(p.engineVersion).toBe(ENGINE_VERSION);
    expect(ENGINE_VERSION).toBe("0.14.0");
    expect(await mine()).not.toHaveProperty("endedAs");
  });

  it("finished: the whole bar stays, complete, nothing left, no warnings", async () => {
    const open = await mine();
    await req("PATCH", `/api/assignments/${id}`, { endedAs: "finished" });
    const p = await mine();
    expect(p).toMatchObject({ endedAs: "finished", endedOn: "2026-10-30", complete: true, remainingUnits: 0, unplacedUnits: 0, warnings: [] });
    expect(p.days).toEqual(open.days);
  });

  it("finished early (S13-00): the bar ends that day and reopening brings the whole plan back", async () => {
    await req("PATCH", `/api/assignments/${id}`, { endedAs: null });
    const open = await mine();
    await req("PATCH", `/api/assignments/${id}`, { endedAs: "finished", endedOn: "2026-10-09" });
    const p = await mine();
    expect(p).toMatchObject({ endedAs: "finished", endedOn: "2026-10-09", complete: true, end: "2026-10-09", plannedEnd: "2026-10-30", warnings: [] });
    expect(p.days.at(-1)!.date).toBe("2026-10-09");
    await req("PATCH", `/api/assignments/${id}`, { endedAs: null });
    expect(await mine()).toEqual(open);
  });

  it("stopped: no work after the day it stopped; reopening brings the whole plan back", async () => {
    const open = await (async () => { await req("PATCH", `/api/assignments/${id}`, { endedAs: null }); return mine(); })();
    expect(open).not.toHaveProperty("endedAs");
    await req("PATCH", `/api/assignments/${id}`, { endedAs: "stopped", endedOn: "2026-10-02" });
    const p = await mine();
    expect(p).toMatchObject({ endedAs: "stopped", endedOn: "2026-10-02", complete: false, remainingUnits: 0, warnings: [], end: "2026-10-02" });
    expect(p.days.at(-1)!.date).toBe("2026-10-02");
    await req("PATCH", `/api/assignments/${id}`, { endedAs: null });
    expect(await mine()).toEqual(open);
  });

  it("the check-in week after it ended lists nothing to check in for it", async () => {
    await req("PATCH", `/api/assignments/${id}`, { endedAs: "stopped", endedOn: "2026-10-02" });
    const later = (await req("GET", "/api/check-ins?weekStart=2026-10-12")).json();
    expect(later.items.map((i: { assignmentId: string }) => i.assignmentId)).not.toContain(id);
    const earlier = (await req("GET", "/api/check-ins?weekStart=2026-09-28")).json();
    expect(earlier.items.map((i: { assignmentId: string }) => i.assignmentId)).toContain(id);
  });
});
