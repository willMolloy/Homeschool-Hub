import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { planAll, planChild, type ChildPlan } from "@hh/engine";
import * as S from "../../../packages/engine/test/fixtures/sample-family";
import { loadPlanInputs, FamilyNotFoundError, type PlanInputs } from "../src/plan/loadPlanInputs";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";

const unitsBetween = (p: ChildPlan, from: string, to: string) =>
  p.days.filter((d) => d.date >= from && d.date <= to).reduce((s, d) => s + d.units, 0);

describe.skipIf(!hasDb)("loadPlanInputs (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let other: Awaited<ReturnType<typeof seedFamily>>;
  let inputs: PlanInputs;

  beforeAll(async () => {
    fam = await seedFamily("load-plan-a@example.com");
    other = await seedFamily("load-plan-b@example.com");
    inputs = await loadPlanInputs(pool, fam.familyId);
  });
  afterAll(async () => {
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[fam.familyId, other.familyId]]);
    await pool.end();
  });

  it("maps the family calendar", () => {
    expect(inputs.calendar).toEqual(S.calendar);
    expect(inputs.ctx.calendar).toEqual(S.calendar);
  });

  it("Treasure Island for Frank: baseRate 22.5 and 90 pages in the week of Oct 26 (same as the engine test)", () => {
    const ti = inputs.assignments.find((a) => a.id === fam.ids.assignment.ti)!;
    const p = planChild(ti, fam.ids.child.frank!, inputs.ctx);
    expect(p.baseRate).toBeCloseTo(22.5);
    expect(unitsBetween(p, "2026-10-26", "2026-10-30")).toBeCloseTo(90);
  });

  it("every assignment plans to the same day-by-day numbers as the engine fixture", () => {
    const fixture = planAll(S.assignments, { calendar: S.calendar, events: S.events, blocked: S.blocked, subjectWeights: S.subjectWeights });
    const loaded = planAll(inputs.assignments, inputs.ctx);
    expect(loaded).toHaveLength(fixture.length);
    const idOf = (kind: "assignment" | "child", key: string) => fam.ids[kind][key];
    for (const f of fixture) {
      const l = loaded.find((p) => p.assignmentId === idOf("assignment", f.assignmentId) && p.childId === idOf("child", f.childId))!;
      expect(l, `${f.assignmentId}/${f.childId}`).toBeDefined();
      expect(l.days.map((d) => [d.date, d.units, d.thickness])).toEqual(f.days.map((d) => [d.date, d.units, d.thickness]));
      expect([l.weightPerUnit, l.weightSource]).toEqual([f.weightPerUnit, f.weightSource]);
    }
  });

  it("numbers come back as numbers and dates as YYYY-MM-DD strings", () => {
    for (const a of inputs.assignments) {
      expect(typeof a.totalUnits).toBe("number");
      expect(a.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(a).not.toHaveProperty("minutesPerUnit"); // S2b-13
      expect(a.weightPerUnit === null || typeof a.weightPerUnit === "number").toBe(true);
    }
    for (const e of inputs.ctx.events) expect(typeof e.capacityFraction).toBe("number");
  });

  it("maps weight_per_unit: 1.4 → 1.4, NULL → null, and a minutes row's 0.75 → 0.75 (S2b-05)", async () => {
    const ti = fam.ids.assignment.ti!;
    const poems = fam.ids.assignment.poems!;
    const piano = fam.ids.assignment.piano!;
    await pool.query("UPDATE assignment SET weight_per_unit = 1.4 WHERE id = $1", [ti]);
    await pool.query("UPDATE assignment SET weight_per_unit = 0.75 WHERE id = $1", [piano]);
    try {
      const loaded = await loadPlanInputs(pool, fam.familyId);
      const weightOf = (id: string) => loaded.assignments.find((a) => a.id === id)!.weightPerUnit;
      expect(weightOf(ti)).toBe(1.4);
      expect(weightOf(poems)).toBeNull();
      expect(weightOf(piano)).toBe(0.75);
    } finally {
      await pool.query("UPDATE assignment SET weight_per_unit = NULL WHERE id = ANY($1)", [[ti, piano]]);
    }
  });

  it("maps subject default weights: Math lessons 20, subjects with NULLs skipped (S2b-33)", () => {
    expect(inputs.ctx.subjectWeights).toEqual([{ subjectId: fam.ids.subject.math, unitType: "lessons", weightPerUnit: 20 }]);
    expect(typeof inputs.ctx.subjectWeights[0]!.weightPerUnit).toBe("number");
    const fracs = planChild(inputs.assignments.find((a) => a.id === fam.ids.assignment.fracs)!, fam.ids.child.margaret!, inputs.ctx);
    expect([fracs.weightPerUnit, fracs.weightSource]).toEqual([20, "subject"]);
  });

  it("an archived subject's default is still loaded; a cleared one is not (S2b-33)", async () => {
    const hist = fam.ids.subject.hist!;
    const math = fam.ids.subject.math!;
    await pool.query("UPDATE subject SET default_weight_unit = 'pages', default_weight = 2.5, archived_at = now() WHERE id = $1", [hist]);
    await pool.query("UPDATE subject SET default_weight_unit = NULL, default_weight = NULL WHERE id = $1", [math]);
    try {
      const loaded = await loadPlanInputs(pool, fam.familyId);
      expect(loaded.ctx.subjectWeights).toEqual([{ subjectId: hist, unitType: "pages", weightPerUnit: 2.5 }]);
      expect(loaded.assignments.some((a) => a.subjectId === hist)).toBe(false);
    } finally {
      await pool.query("UPDATE subject SET default_weight_unit = NULL, default_weight = NULL, archived_at = NULL WHERE id = $1", [hist]);
      await pool.query("UPDATE subject SET default_weight_unit = 'lessons', default_weight = 20 WHERE id = $1", [math]);
    }
  });

  it("an event with no event_child rows has childIds: [] (whole family)", async () => {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO event (family_id, name, weekdays, capacity_fraction, default_rule)
       VALUES ($1, 'Family field trip', '{5}', 0.5, 'skip') RETURNING id`, [fam.familyId]);
    const loaded = await loadPlanInputs(pool, fam.familyId);
    const e = loaded.ctx.events.find((x) => x.id === rows[0]!.id)!;
    expect(e.childIds).toEqual([]);
    expect(e.weekdays).toEqual([5]);
    expect(e.start).toBeNull();
    await pool.query("DELETE FROM event WHERE id = $1", [rows[0]!.id]);
  });

  it("subjects with no rule row fall back to default_rule; listed subjects keep their rule", async () => {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO event (family_id, name, weekdays, capacity_fraction, default_rule)
       VALUES ($1, 'Swim', '{3}', 0.25, 'lighter') RETURNING id`, [fam.familyId]);
    const id = rows[0]!.id;
    await pool.query("INSERT INTO event_subject_rule (event_id, subject_id, family_id, rule) VALUES ($1, $2, $3, 'skip')",
      [id, fam.ids.subject.math, fam.familyId]);
    const loaded = await loadPlanInputs(pool, fam.familyId);
    const e = loaded.ctx.events.find((x) => x.id === id)!;
    expect(e.subjectRules).toEqual({ [fam.ids.subject.math!]: "skip" });
    expect(e.defaultRule).toBe("lighter");
    expect(e.capacityFraction).toBe(0.25);
    await pool.query("DELETE FROM event WHERE id = $1", [id]);
  });

  it("archived children are dropped from childIds; an assignment with no active child is left out", async () => {
    const margaret = fam.ids.child.margaret!;
    await pool.query("UPDATE child SET archived_at = now() WHERE id = $1", [margaret]);
    try {
      const loaded = await loadPlanInputs(pool, fam.familyId);
      for (const a of loaded.assignments) expect(a.childIds).not.toContain(margaret);
      const margaretOnly = S.assignments.filter((a) => a.childIds.length === 1 && a.childIds[0] === "margaret");
      expect(margaretOnly.length).toBeGreaterThan(0);
      for (const a of margaretOnly) expect(loaded.assignments.map((x) => x.id)).not.toContain(fam.ids.assignment[a.id]);
      for (const e of loaded.ctx.events) expect(e.childIds).not.toContain(margaret);
    } finally {
      await pool.query("UPDATE child SET archived_at = NULL WHERE id = $1", [margaret]);
    }
  });

  it("archived subjects, assignments and events are excluded", async () => {
    const ti = fam.ids.assignment.ti!;
    const music = fam.ids.subject.music!;
    const anyEvent = Object.values(fam.ids.event)[0]!;
    await pool.query("UPDATE assignment SET archived_at = now() WHERE id = $1", [ti]);
    await pool.query("UPDATE subject SET archived_at = now() WHERE id = $1", [music]);
    await pool.query("UPDATE event SET archived_at = now() WHERE id = $1", [anyEvent]);
    try {
      const loaded = await loadPlanInputs(pool, fam.familyId);
      expect(loaded.assignments.map((a) => a.id)).not.toContain(ti);
      expect(loaded.assignments.some((a) => a.subjectId === music)).toBe(false);
      expect(loaded.ctx.events.map((e) => e.id)).not.toContain(anyEvent);
    } finally {
      await pool.query("UPDATE assignment SET archived_at = NULL WHERE id = $1", [ti]);
      await pool.query("UPDATE subject SET archived_at = NULL WHERE id = $1", [music]);
      await pool.query("UPDATE event SET archived_at = NULL WHERE id = $1", [anyEvent]);
    }
  });

  it("maps blocked ranges, week overrides and logged progress (summed per day)", async () => {
    const ti = fam.ids.assignment.ti!;
    const frank = fam.ids.child.frank!;
    await pool.query(
      `INSERT INTO week_override (family_id, assignment_id, child_id, week_start, planned_units, mode)
       VALUES ($1, $2, $3, '2026-11-02', 50, 'pushEndDate')`, [fam.familyId, ti, frank]);
    for (const [id, kind, units] of [["11111111-1111-4111-8111-111111111111", "session", 10], ["22222222-2222-4222-8222-222222222222", "session", 5.5]] as const) {
      await pool.query("INSERT INTO log_entry (id, family_id, assignment_id, log_date, kind) VALUES ($1, $2, $3, '2026-10-26', $4)",
        [id, fam.familyId, ti, kind]);
      await pool.query(
        "INSERT INTO log_child_progress (log_entry_id, child_id, assignment_id, log_date, kind, units) VALUES ($1, $2, $3, '2026-10-26', $4, $5)",
        [id, frank, ti, kind, units]);
    }
    try {
      const loaded = await loadPlanInputs(pool, fam.familyId);
      expect(loaded.ctx.overrides).toEqual([{ assignmentId: ti, childId: frank, weekStart: "2026-11-02", plannedUnits: 50, mode: "pushEndDate" }]);
      expect(loaded.ctx.progress).toEqual([{ assignmentId: ti, childId: frank, date: "2026-10-26", units: 15.5 }]);
      expect(loaded.ctx.blocked).toEqual(S.blocked.map((b) => expect.objectContaining({ start: b.start, end: b.end })));
    } finally {
      await pool.query("DELETE FROM week_override WHERE assignment_id = $1", [ti]);
      await pool.query("DELETE FROM log_entry WHERE assignment_id = $1", [ti]);
    }
  });

  it("another family's rows never appear", async () => {
    const mine = await loadPlanInputs(pool, fam.familyId);
    const theirs = await loadPlanInputs(pool, other.familyId);
    const mineIds = new Set([...mine.assignments.map((a) => a.id), ...mine.ctx.events.map((e) => e.id), ...mine.ctx.blocked.map((b) => b.id)]);
    for (const id of [...theirs.assignments.map((a) => a.id), ...theirs.ctx.events.map((e) => e.id), ...theirs.ctx.blocked.map((b) => b.id)]) {
      expect(mineIds.has(id)).toBe(false);
    }
    expect(mine.ctx.subjectWeights.map((w) => w.subjectId)).toEqual([fam.ids.subject.math]);
    expect(theirs.ctx.subjectWeights.map((w) => w.subjectId)).toEqual([other.ids.subject.math]);
    const theirChildren = new Set(Object.values(other.ids.child));
    for (const a of mine.assignments) for (const c of a.childIds) expect(theirChildren.has(c)).toBe(false);
    expect(mine.assignments).toHaveLength(S.assignments.length);
  });

  it("an unknown family throws FamilyNotFoundError", async () => {
    await expect(loadPlanInputs(pool, "00000000-0000-4000-8000-000000000000")).rejects.toBeInstanceOf(FamilyNotFoundError);
  });
});
