// T-07e: moving an assignment's start or end keeps its latest check-in inside it (D24, S2b-38).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject } from "./helpers/schedule";
import { seedFamily } from "./helpers/seed";
import { hashSessionToken, newSessionToken } from "../src/auth/session";

describe.skipIf(!hasDb)("PATCH /api/assignments/:id dates with a check-in (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const NOW = new Date("2026-10-28T15:00:00Z");
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => NOW }) : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let req: ReturnType<typeof inject>;
  let ti: string;

  beforeAll(async () => {
    fam = await seedFamily("assignment-dates-check-in@example.com");
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [hashSessionToken(token), fam.familyId]);
    req = inject(app, { hh_session: token });
    ti = fam.ids.assignment.ti!;
    // Treasure Island (Oct 19 →) for Frank: checked in at 75 pages for the week of Oct 19.
    await pool.query(
      "INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position, mode) VALUES ($1, $2, $3, '2026-10-19', 75, 'keepEndDate')",
      [fam.familyId, ti, fam.ids.child.frank]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  it("won't move the start past the checked-in week", async () => {
    const res = await req("PATCH", `/api/assignments/${ti}`, { startDate: "2026-10-26" });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "check_in_outside", message: "The week of Oct 19 has a check-in, so the start can't move past it." });
  });

  it("won't move the end before the checked-in week", async () => {
    const res = await req("PATCH", `/api/assignments/${ti}`, { startDate: "2026-10-05", endDate: "2026-10-16" });
    expect(res.statusCode).toBe(409);
    expect(res.json().message).toBe("The week of Oct 19 has a check-in, so the end can't move before it.");
  });

  it("moves back a week, and the check-in still decides where it stands", async () => {
    const cur = (await req("GET", "/api/assignments")).json().find((a: { id: string }) => a.id === ti);
    const res = await req("PATCH", `/api/assignments/${ti}`, { startDate: "2026-10-12", endDate: shift(cur.endDate, -7) });
    expect(res.statusCode).toBe(200);
    const plan = (await req("GET", "/api/plan?from=2026-10-01&to=2026-12-31")).json<PlanResponse>();
    expect(plan.plans.find((p) => p.assignmentId === ti && p.childId === fam.ids.child.frank)!.doneUnits).toBe(75);
  });

  it("moves an assignment with no check-ins freely", async () => {
    const other = fam.ids.assignment.math5!;
    const cur = (await req("GET", "/api/assignments")).json().find((a: { id: string }) => a.id === other);
    const res = await req("PATCH", `/api/assignments/${other}`, { startDate: shift(cur.startDate, 7), endDate: shift(cur.endDate, 7) });
    expect(res.statusCode).toBe(200);
  });
});

function shift(d: string, days: number): string {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}
