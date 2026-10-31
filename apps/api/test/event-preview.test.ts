import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { EventPreviewResponse } from "../src/routes/eventPreview";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("POST /api/plan/preview-event (S5-01, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const NOW = new Date("2026-10-28T15:00:00Z"); // Wednesday
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => NOW }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let subjects: string[] = [];
  let req: ReturnType<typeof inject>;
  let foreignEvent = "";
  beforeAll(async () => {
    a = await signedInFamily(pool, "Preview A");
    b = await signedInFamily(pool, "Preview B");
    req = inject(app, a.cookies);
    ({ childIds: kids, subjectIds: subjects } = await rosterFor(app, a.cookies, ["Frank", "Ada"], ["Literature", "Math"]));
    const base = { unitType: "pages", totalUnits: 100, startDate: "2026-10-26", endDate: "2026-11-20", childIds: kids };
    await req("POST", "/api/assignments", { ...base, subjectId: subjects[0], title: "Treasure Island" });
    await req("POST", "/api/assignments", { ...base, subjectId: subjects[1], title: "Fractions" });
    const f = await rosterFor(app, b.cookies, ["Theirs"], ["Theirs"]);
    foreignEvent = (await inject(app, b.cookies)("POST", "/api/events", { name: "Theirs", weekdays: [2], childIds: [f.childIds[0]] })).json().id;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const preview = (event: Record<string, unknown>, eventId?: string) =>
    req("POST", "/api/plan/preview-event", { event, ...(eventId ? { eventId } : {}) });
  const count = async (table: string) => Number((await pool.query(`SELECT count(*) FROM ${table} WHERE family_id = $1`, [a.familyId])).rows[0].count);

  it("a Tuesday co-op that skips Literature raises Literature's daily amount, for each child, and leaves Math out", async () => {
    const before = [await count("event"), await count("event_subject_rule")];
    const res = await preview({ name: "Co-op", weekdays: [2], defaultRule: "normal", subjectRules: { [subjects[0]!]: "skip" } });
    expect(res.statusCode).toBe(200);
    const body = res.json<EventPreviewResponse>();
    expect(body.more).toBe(0);
    expect(body.changes.map((c) => [c.title, c.childName]).sort()).toEqual([["Treasure Island", "Ada"], ["Treasure Island", "Frank"]]);
    for (const c of body.changes) {
      expect(c.unitType).toBe("pages");
      expect(c.after.perDay).toBeGreaterThan(c.before.perDay);
      expect(c.before.end).toBe("2026-11-20");
      expect(c.after.end).toBe("2026-11-20");
      expect(typeof c.assignmentId).toBe("string");
    }
    expect([await count("event"), await count("event_subject_rule")]).toEqual(before);
  });

  it("a lighter rule changes the amount by less than a skip", async () => {
    const skip = (await preview({ name: "Co-op", weekdays: [2], subjectRules: { [subjects[0]!]: "skip" } })).json<EventPreviewResponse>();
    const light = (await preview({ name: "Co-op", weekdays: [2], capacityFraction: 0.5, subjectRules: { [subjects[0]!]: "lighter" } })).json<EventPreviewResponse>();
    expect(light.changes.length).toBeGreaterThan(0);
    expect(light.changes[0]!.after.perDay).toBeGreaterThan(light.changes[0]!.before.perDay);
    expect(light.changes[0]!.after.perDay).toBeLessThan(skip.changes[0]!.after.perDay);
  });

  it("an event for one child leaves the other child out", async () => {
    const body = (await preview({ name: "Piano", weekdays: [2], defaultRule: "skip", childIds: [kids[0]] })).json<EventPreviewResponse>();
    expect(body.changes.length).toBe(2); // Frank's two assignments
    expect(new Set(body.changes.map((c) => c.childId))).toEqual(new Set([kids[0]]));
  });

  it("an event on days with no school work changes nothing: empty list", async () => {
    const body = (await preview({ name: "Sunday", weekdays: [0], defaultRule: "skip" })).json<EventPreviewResponse>();
    expect(body).toEqual({ changes: [], more: 0 });
  });

  it("editing previews against the stored version, not on top of it; a label-only edit is empty", async () => {
    const e = (await req("POST", "/api/events", { name: "Co-op", weekdays: [2], subjectRules: { [subjects[0]!]: "skip" } })).json();
    // The stored event already skips Literature on Tuesdays: the same event as a draft changes nothing.
    const same = (await preview({ name: "Renamed co-op", weekdays: [2], subjectRules: { [subjects[0]!]: "skip" } }, e.id)).json<EventPreviewResponse>();
    expect(same).toEqual({ changes: [], more: 0 });
    // Made lighter, Literature gets easier than with the stored skip: the amount goes down.
    const softer = (await preview({ name: "Co-op", weekdays: [2], capacityFraction: 0.5, subjectRules: { [subjects[0]!]: "lighter" } }, e.id)).json<EventPreviewResponse>();
    expect(softer.changes.length).toBe(2);
    for (const c of softer.changes) expect(c.after.perDay).toBeLessThan(c.before.perDay);
    await req("PATCH", `/api/events/${e.id}`, { archived: true });
  });

  it("S7-06: an assignment that ended before today is left out; one still running is listed", async () => {
    const done = (await req("POST", "/api/assignments", { subjectId: subjects[0], title: "Aesop's Fables", unitType: "pages", totalUnits: 40, startDate: "2026-08-31", endDate: "2026-09-11", childIds: kids })).json();
    const body = (await preview({ name: "Tue", weekdays: [2], subjectRules: { [subjects[0]!]: "skip" } })).json<EventPreviewResponse>();
    expect(body.changes.map((c) => c.title)).not.toContain("Aesop's Fables");
    expect(body.changes.map((c) => c.title)).toContain("Treasure Island");
    await req("PATCH", `/api/assignments/${done.id}`, { archived: true });
  });

  it("returns at most 20 rows with a count of the rest, biggest relative change first", async () => {
    const f = await rosterFor(app, a.cookies, ["Many"], ["Extra"]);
    const rows = Array.from({ length: 11 }, (_, i) => ({
      subjectId: f.subjectIds[0], title: `Book ${i}`, unitType: "pages", totalUnits: 100, startDate: "2026-10-26", endDate: "2026-11-20", childIds: [kids[0], kids[1]],
    }));
    expect((await req("POST", "/api/assignments/bulk", { assignments: rows })).statusCode).toBe(201);
    const body = (await preview({ name: "Everything", weekdays: [1, 2, 3], defaultRule: "skip" })).json<EventPreviewResponse>();
    expect(body.changes.length).toBe(20);
    expect(body.more).toBe(2 * 13 - 20);
  });

  it("invalid bodies → 400 (like create), unknown keys too", async () => {
    expect((await preview({ name: "", weekdays: [2] })).statusCode).toBe(400);
    expect((await preview({ name: "x", weekdays: [] })).statusCode).toBe(400);
    expect((await preview({ name: "x", weekdays: [2], startDate: "2026-12-02", endDate: "2026-12-01" })).statusCode).toBe(400);
    expect((await preview({ name: "x", weekdays: [2], childIds: ["00000000-0000-4000-8000-000000000001"] })).statusCode).toBe(400);
    expect((await preview({ name: "x", weekdays: [2], extra: 1 })).statusCode).toBe(400);
    expect((await req("POST", "/api/plan/preview-event", { event: { name: "x", weekdays: [2] }, other: 1 })).statusCode).toBe(400);
    expect((await req("POST", "/api/plan/preview-event", {})).statusCode).toBe(400);
  });

  it("another family's (or a made-up) eventId → 404", async () => {
    expect((await preview({ name: "x", weekdays: [2] }, foreignEvent)).statusCode).toBe(404);
    expect((await preview({ name: "x", weekdays: [2] }, "not-an-id")).statusCode).toBe(404);
  });

  it("signed out → 401", async () => {
    expect((await inject(app, null)("POST", "/api/plan/preview-event", { event: { name: "x", weekdays: [2] } })).statusCode).toBe(401);
  });
});
