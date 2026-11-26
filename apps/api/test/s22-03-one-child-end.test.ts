/** S22-03: a named child keeps their own end. A save that names nobody still updates every child. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("S22-03 one child's end (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let subject = "";
  let req: ReturnType<typeof inject>;

  beforeAll(async () => {
    fam = await signedInFamily(pool, "S22-03");
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

  const byChild = (body: { children: { childId: string; endDate: string; endedAs: string | null }[] }) =>
    Object.fromEntries(body.children.map((c) => [c.childId, c]));

  it("moves one child, leaves the other, and undo puts both back", async () => {
    const created = await req("POST", "/api/assignments", {
      subjectId: subject, title: "Treasure Island", unitType: "pages", totalUnits: 80,
      startDate: "2026-10-01", endDate: "2026-10-30", childIds: kids,
    });
    const id = created.json().id as string;
    const moved = await req("PATCH", `/api/assignments/${id}`, { childEnds: [{ childId: kids[0], endDate: "2026-11-20" }] });
    expect(moved.statusCode).toBe(200);
    const ends = byChild(moved.json());
    expect(ends[kids[0]!]?.endDate).toBe("2026-11-20");
    expect(ends[kids[1]!]?.endDate).toBe("2026-10-30");
    expect(moved.json().endDate).toBe("2026-11-20");

    const undone = await req("POST", "/api/undo");
    expect(undone.statusCode).toBe(200);
    const back = byChild((await req("GET", `/api/assignments`)).json().find((a: { id: string }) => a.id === id));
    expect(back[kids[0]!]?.endDate).toBe("2026-10-30");
    expect(back[kids[1]!]?.endDate).toBe("2026-10-30");
  });

  it("an end with no child still updates everyone, and both together is refused", async () => {
    const created = await req("POST", "/api/assignments", {
      subjectId: subject, title: "Poems", unitType: "pages", totalUnits: 40,
      startDate: "2026-10-01", endDate: "2026-10-30", childIds: kids,
    });
    const id = created.json().id as string;
    await req("PATCH", `/api/assignments/${id}`, { childEnds: [{ childId: kids[0], endDate: "2026-11-13" }] });
    const all = await req("PATCH", `/api/assignments/${id}`, { endDate: "2026-12-04" });
    expect(all.statusCode).toBe(200);
    expect(all.json().children.map((c: { endDate: string }) => c.endDate)).toEqual(["2026-12-04", "2026-12-04"]);
    const both = await req("PATCH", `/api/assignments/${id}`, { endDate: "2026-12-11", childEnds: [{ childId: kids[0], endDate: "2026-12-18" }] });
    expect(both.statusCode).toBe(400);
  });

  it("a minutes book keeps its minutes a day when one end moves", async () => {
    const created = await req("POST", "/api/assignments", {
      subjectId: subject, title: "Piano", unitType: "minutes", totalUnits: 300, minutesPerDay: 30,
      startDate: "2026-10-05", endDate: "2026-10-16", childIds: kids,
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;
    const daily = created.json().minutesPerDay as number;
    const moved = await req("PATCH", `/api/assignments/${id}`, { childEnds: [{ childId: kids[0], endDate: "2026-10-09" }] });
    expect(moved.statusCode).toBe(200);
    expect(moved.json().minutesPerDay).toBe(daily);
    const plans = (await req("GET", "/api/plan?from=2026-10-05&to=2026-10-16&asOf=2026-10-05")).json() as { plans: { assignmentId: string; childId: string; days: { units: number }[] }[] };
    for (const childId of kids) {
      const days = plans.plans.find((p) => p.assignmentId === id && p.childId === childId)!.days.filter((d) => d.units > 0.01);
      expect(days.every((d) => Math.abs(d.units - daily) < 0.02)).toBe(true);
    }
  });
});
