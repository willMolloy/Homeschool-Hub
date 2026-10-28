/**
 * S2a-11: the contract the timeline relies on. Whatever the forms save through the API is exactly what the engine
 * plans: every stage's /api/plan is compared with planAll on hand-built inputs (not re-read from the DB).
 */
import { planAll, type Assignment, type BlockedPeriod, type ChildPlan, type FamilyCalendar, type RecurringEvent } from "@hh/engine";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

const FROM = "2026-11-01";
const TO = "2026-11-30";
const AS_OF = "2026-11-02";

describe.skipIf(!hasDb)("/api/plan reflects schedule data written through the API (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let child = "";
  let subject = "";
  let assignment: Assignment;
  const calendar: FamilyCalendar = { weekStart: "sun", schoolDays: [1, 2, 3, 4] };

  beforeAll(async () => {
    fam = await signedInFamily(pool, "Contract");
    req = inject(app, fam.cookies);
    expect((await req("PATCH", "/api/family", { weekStart: "sun", schoolDays: [4, 1, 3, 2] })).statusCode).toBe(200);
    const r = await rosterFor(app, fam.cookies, ["Frank"], ["Math"]);
    child = r.childIds[0]!;
    subject = r.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  const apiPlan = async (): Promise<ChildPlan[]> => {
    const res = await req("GET", `/api/plan?from=${FROM}&to=${TO}&asOf=${AS_OF}`);
    expect(res.statusCode).toBe(200);
    return (res.json() as PlanResponse).plans as ChildPlan[];
  };
  /** The engine's answer for hand-built inputs, cut to the same window and passed through JSON like the response. */
  const predicted = (events: RecurringEvent[] = [], blocked: BlockedPeriod[] = []): ChildPlan[] =>
    JSON.parse(JSON.stringify(planAll([assignment], { calendar, events, blocked, asOf: AS_OF })
      .map((p) => ({ ...p, days: p.days.filter((d) => d.date >= FROM && d.date <= TO) }))));
  const minutesOn = (plans: ChildPlan[], date: string) => plans[0]!.days.find((d) => d.date === date)!.minutes;
  const capacityOn = (plans: ChildPlan[], date: string) => plans[0]!.days.find((d) => d.date === date)!.capacity;

  let stage1: ChildPlan[] = [];
  let eventId = "";
  let vacationId = "";
  const skipWednesday = (): RecurringEvent =>
    ({ id: eventId, name: "Co-op", childIds: [], weekdays: [3], start: null, end: null, capacityFraction: 0.5, subjectRules: { [subject]: "skip" }, defaultRule: "normal" });
  const vacation = (): BlockedPeriod => ({ id: vacationId, start: "2026-11-16", end: "2026-11-20", childIds: [], kind: "vacation" });

  it("stage 1: an assignment plans exactly as the engine predicts", async () => {
    const res = await req("POST", "/api/assignments", {
      subjectId: subject, title: "Saxon 5", unitType: "lessons", totalUnits: 20, minutesPerUnit: 30,
      startDate: "2026-11-02", endDate: "2026-11-26", childIds: [child],
    });
    expect(res.statusCode).toBe(201);
    assignment = {
      id: res.json().id, childIds: [child], subjectId: subject, title: "Saxon 5", unitType: "lessons", totalUnits: 20,
      start: "2026-11-02", end: "2026-11-26", minutesPerUnit: 30,
    };
    stage1 = await apiPlan();
    expect(stage1).toEqual(predicted());
    expect(minutesOn(stage1, "2026-11-04")).toBeGreaterThan(0); // a Wednesday
    expect(minutesOn(stage1, "2026-11-06")).toBe(0); // Friday is no longer a school day
  });

  it("stage 2: a Wednesday 'skip' event zeroes Wednesdays and moves the work as predicted", async () => {
    const res = await req("POST", "/api/events", { name: "Co-op", weekdays: [3], subjectRules: { [subject]: "skip" } });
    expect(res.statusCode).toBe(201);
    eventId = res.json().id;
    const got = await apiPlan();
    expect(got).toEqual(predicted([skipWednesday()]));
    for (const wed of ["2026-11-04", "2026-11-11", "2026-11-18", "2026-11-25"]) expect(minutesOn(got, wed)).toBe(0);
    expect(minutesOn(got, "2026-11-05")).toBeGreaterThan(minutesOn(stage1, "2026-11-05"));
  });

  it("stage 3: a vacation week zeroes those days and raises minutes elsewhere as predicted", async () => {
    const before = await apiPlan();
    const res = await req("POST", "/api/blocked-ranges", { startDate: "2026-11-16", endDate: "2026-11-20", label: "Thanksgiving trip" });
    expect(res.statusCode).toBe(201);
    vacationId = res.json().id;
    const got = await apiPlan();
    expect(got).toEqual(predicted([skipWednesday()], [vacation()]));
    for (const d of ["2026-11-16", "2026-11-17", "2026-11-19"]) expect(minutesOn(got, d)).toBe(0);
    expect(minutesOn(got, "2026-11-23")).toBeGreaterThan(minutesOn(before, "2026-11-23"));
  });

  it("stage 4: archiving the event and deleting the vacation restores the first plan", async () => {
    expect((await req("PATCH", `/api/events/${eventId}`, { archived: true })).statusCode).toBe(200);
    expect((await req("DELETE", `/api/blocked-ranges/${vacationId}`)).statusCode).toBe(204);
    const got = await apiPlan();
    expect(got).toEqual(stage1);
    expect(got).toEqual(predicted());
  });

  it("a 'lighter' event with capacity 0.5 halves that day's capacity as the engine predicts", async () => {
    const res = await req("POST", "/api/events", { name: "Piano", weekdays: [2], capacityFraction: 0.5, defaultRule: "lighter", childIds: [child] });
    expect(res.statusCode).toBe(201);
    const lighter: RecurringEvent = {
      id: res.json().id, name: "Piano", childIds: [child], weekdays: [2], start: null, end: null, capacityFraction: 0.5, subjectRules: {}, defaultRule: "lighter",
    };
    const got = await apiPlan();
    expect(got).toEqual(predicted([lighter]));
    expect(capacityOn(got, "2026-11-03")).toBe(capacityOn(stage1, "2026-11-03") / 2);
    expect(capacityOn(got, "2026-11-05")).toBe(capacityOn(stage1, "2026-11-05"));
    await req("PATCH", `/api/events/${lighter.id}`, { archived: true });
  });

  it("every plan carries a finite weight and thickness = units × weightPerUnit on each day (S2b-05)", async () => {
    for (const p of await apiPlan()) {
      expect(Number.isFinite(p.weightPerUnit), p.assignmentId).toBe(true);
      expect(["assignment", "subject", "default"]).toContain(p.weightSource);
      for (const d of p.days) {
        expect(Number.isFinite(d.thickness)).toBe(true);
        expect(d.thickness).toBeCloseTo(d.units * p.weightPerUnit, 9);
      }
    }
  });

  it("a minutes row with no weight uses the built-in 0.5; a stored weight shows source 'assignment' (S2b-05)", async () => {
    const res = await req("POST", "/api/assignments", {
      subjectId: subject, title: "Piano", unitType: "minutes", totalUnits: 600,
      startDate: "2026-11-02", endDate: "2026-11-26", childIds: [child],
    });
    expect(res.statusCode).toBe(201);
    const id = res.json().id as string;
    try {
      const planOf = async () => (await apiPlan()).find((p) => p.assignmentId === id)!;
      const unset = await planOf();
      expect([unset.weightPerUnit, unset.weightSource]).toEqual([0.5, "default"]);
      await pool.query("UPDATE assignment SET weight_per_unit = 0.75 WHERE id = $1", [id]);
      const stored = await planOf();
      expect([stored.weightPerUnit, stored.weightSource]).toEqual([0.75, "assignment"]);
      for (const d of stored.days) expect(d.thickness).toBeCloseTo(d.units * 0.75, 9);
    } finally {
      await req("PATCH", `/api/assignments/${id}`, { archived: true });
    }
  });
});
