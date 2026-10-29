import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("PATCH /api/assignments/:id (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let subjects: string[] = [];
  let id = "";
  let foreignId = "";
  let foreignKid = "";
  let req: ReturnType<typeof inject>;
  const base = (subjectId: string, childIds: string[]) => ({
    subjectId, title: "Spelling", unitType: "lessons", totalUnits: 10, weightPerUnit: 7.5, startDate: "2026-11-02", endDate: "2026-11-13", childIds,
  });
  beforeAll(async () => {
    a = await signedInFamily(pool, "Update A");
    b = await signedInFamily(pool, "Update B");
    req = inject(app, a.cookies);
    const r = await rosterFor(app, a.cookies, ["Frank", "Ada", "Max"], ["Spelling", "Latin", "Gone"]);
    kids = r.childIds;
    subjects = r.subjectIds;
    id = (await req("POST", "/api/assignments", base(subjects[0]!, [kids[0]!]))).json().id;
    const f = await rosterFor(app, b.cookies, ["Theirs"], ["TheirSubj"]);
    foreignKid = f.childIds[0]!;
    foreignId = (await inject(app, b.cookies)("POST", "/api/assignments", base(f.subjectIds[0]!, [foreignKid]))).json().id;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const patch = (payload: unknown, target = id) => req("PATCH", `/api/assignments/${target}`, payload);

  it.each([
    ["title", { title: "  Spelling Workout B " }, { title: "Spelling Workout B" }],
    // A unit change sends its new weight (S2b-06, D7).
    ["unitType", { unitType: "pages", weightPerUnit: 7.5 }, { unitType: "pages", weightPerUnit: 7.5 }],
    ["totalUnits", { totalUnits: 12.5 }, { totalUnits: 12.5 }],
    ["weightPerUnit", { weightPerUnit: 4 }, { weightPerUnit: 4 }],
    ["startDate", { startDate: "2026-11-03" }, { startDate: "2026-11-03" }],
    ["endDate", { endDate: "2026-11-20" }, { endDate: "2026-11-20" }],
  ])("%s alone → 200, other fields kept", async (_l, body, expected) => {
    const before = (await req("GET", "/api/assignments")).json().find((x: { id: string }) => x.id === id);
    const res = await patch(body);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ...before, ...expected });
  });

  it("subjectId → 200 when it's an active subject of this family", async () => {
    expect((await patch({ subjectId: subjects[1] })).json().subjectId).toBe(subjects[1]);
  });

  it("weightPerUnit null clears the override", async () => {
    expect((await patch({ weightPerUnit: null })).json()).toMatchObject({ weightPerUnit: null });
  });

  it("childIds replaces the set (not appended)", async () => {
    expect((await patch({ childIds: [kids[1], kids[2]] })).json().childIds).toEqual([kids[1], kids[2]]);
    expect((await patch({ childIds: [kids[0]] })).json().childIds).toEqual([kids[0]]);
    const { rows } = await pool.query("SELECT child_id FROM assignment_child WHERE assignment_id = $1", [id]);
    expect(rows).toEqual([{ child_id: kids[0] }]);
  });

  it("dates are checked against the stored row: endDate before the existing start → 400 invalid_range", async () => {
    const res = await patch({ endDate: "2026-11-01" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_range");
    const span = await patch({ startDate: "2023-01-01" });
    expect(span.json().error).toBe("invalid_range");
  });

  it("foreign or archived references → 400 invalid_reference, row unchanged", async () => {
    const before = (await req("GET", "/api/assignments")).json();
    await req("PATCH", `/api/subjects/${subjects[2]}`, { archived: true });
    expect((await patch({ subjectId: subjects[2] })).json().error).toBe("invalid_reference");
    expect((await patch({ childIds: [foreignKid] })).json().error).toBe("invalid_reference");
    expect((await req("GET", "/api/assignments")).json()).toEqual(before);
  });

  it("archive removes it from /api/plan; unarchive brings it back", async () => {
    const inPlan = async () => {
      const p: PlanResponse = (await req("GET", "/api/plan?from=2026-11-02&to=2026-11-08&asOf=2026-11-02")).json();
      return p.plans.some((x) => x.assignmentId === id);
    };
    expect(await inPlan()).toBe(true);
    const r = await patch({ archived: true });
    expect(r.json().archived).toBe(true);
    expect(await inPlan()).toBe(false);
    expect((await req("GET", "/api/assignments")).json().map((x: { id: string }) => x.id)).not.toContain(id);
    expect((await patch({ archived: false })).json().archived).toBe(false);
    expect(await inPlan()).toBe(true);
  });

  it("an archived assignment can still be edited (it keeps its archived flag)", async () => {
    await patch({ archived: true });
    const res = await patch({ title: "Archived but renamed" });
    expect(res.json()).toMatchObject({ title: "Archived but renamed", archived: true });
    await patch({ archived: false });
  });

  it("foreign, unknown or malformed id → 404, and their row is unchanged", async () => {
    expect((await patch({ title: "Hijack" }, foreignId)).statusCode).toBe(404);
    expect((await patch({ title: "x" }, "00000000-0000-4000-8000-000000000000")).statusCode).toBe(404);
    expect((await patch({ title: "x" }, "not-a-uuid")).statusCode).toBe(404);
    const { rows } = await pool.query("SELECT title FROM assignment WHERE id = $1", [foreignId]);
    expect(rows[0].title).toBe("Spelling");
  });

  it.each([
    ["empty body", {}],
    ["only unknown keys", { family_id: "x" }],
    ["childIds empty", { childIds: [] }],
    ["totalUnits 0", { totalUnits: 0 }],
    ["title null", { title: null }],
    ["blank title (T-10)", { title: "   " }],
    ["empty title (T-10)", { title: "" }],
    ["archived string", { archived: "yes" }],
  ])("%s → 400 invalid_request", async (_l, body) => {
    const res = await patch(body);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
  });

  it("signed out → 401", async () => {
    expect((await inject(app, null)("PATCH", `/api/assignments/${id}`, { title: "x" })).statusCode).toBe(401);
  });
});
