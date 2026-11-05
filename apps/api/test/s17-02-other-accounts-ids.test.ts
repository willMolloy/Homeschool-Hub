/**
 * S17-02: no route answers 2xx for another account's ids: a walk over every route with an id in its path (404 for a parent, 403 for a
 * viewer), the reads that take a child or subject id (404), and the writes that take ids in a body (400 or 404, never 2xx).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";
import { viewerOf } from "./helpers/members";

describe.skipIf(!hasDb)("S17-02: another account's ids (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const routes: string[] = [];
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  if (hasDb) app.addHook("onRoute", (r) => { for (const m of [r.method].flat()) routes.push(`${String(m).toUpperCase()} ${r.url}`); });
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let viewer: Awaited<ReturnType<typeof viewerOf>>;
  let ip = 0;
  const ids: Record<string, string> = {};
  const put = (cookies: { hh_session: string }, payload: object) => app.inject({ method: "PUT", url: "/api/week-overrides", cookies, payload });

  beforeAll(async () => {
    await app.ready();
    a = await signedInFamily(pool, "S17 A");
    b = await signedInFamily(pool, "S17 B");
    viewer = await viewerOf(pool, a.familyId, "s17-02-viewer@example.com");
    // Family B's own rows: every kind of thing a route takes by id.
    const req = inject(app, b.cookies);
    const r = await rosterFor(app, b.cookies, ["Bea"], ["Math"]);
    ids.child = r.childIds[0]!; ids.subject = r.subjectIds[0]!;
    ids.assignment = (await req("POST", "/api/assignments", { subjectId: ids.subject, title: "Book", unitType: "pages", totalUnits: 100, startDate: "2026-11-02", endDate: "2026-12-18", childIds: [ids.child] })).json().id;
    ids.blocked = (await req("POST", "/api/blocked-ranges", { label: "Break", kind: "vacation", startDate: "2026-11-23", endDate: "2026-11-27", childIds: [] })).json().id;
    ids.event = (await req("POST", "/api/events", { name: "Co-op", weekdays: [5], startDate: null, endDate: null, capacityFraction: 0.5, defaultRule: "normal", subjectRules: {}, childIds: [ids.child] })).json().id;
    ids.entry = (await req("POST", "/api/log-entries", { childIds: [ids.child], startDate: "2026-11-02", totalMinutes: 60 })).json()[0].id;
    ids.override = (await put(b.cookies, { assignmentId: ids.assignment, childId: ids.child, weekStart: "2026-11-02", plannedUnits: 10, mode: null })).json().id;
    ids.template = (await req("POST", "/api/calendar-templates", { name: "T", breaks: [{ offsetDays: 0, lengthDays: 3, label: null, kind: "vacation" }] })).json().id;
    ids.invite = (await pool.query("INSERT INTO invite (token_hash, family_id, role, expires_at) VALUES ($1, $2, 'parent', now() + interval '1 day') RETURNING id", ["a".repeat(64), b.familyId])).rows[0].id;
    ids.viewLink = (await pool.query("INSERT INTO invite (token_hash, family_id, role, expires_at) VALUES ($1, $2, 'viewer', now() + interval '1 day') RETURNING id", ["b".repeat(64), b.familyId])).rows[0].id;
    ids.viewer = (await viewerOf(pool, b.familyId, "s17-02-bviewer@example.com")).parentId;
  });
  afterAll(async () => {
    await pool.query("DELETE FROM parent WHERE lower(email) LIKE 's17-02-%'");
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await app.close();
    await pool.end();
  });

  describe("S17-02: another account's ids", () => {
    const withId = (url: string) => url.replace(":id", "ID").replace(":weekStart", "2026-11-02");
    /** Every route with an `:id` in its path, which id of family B it is aimed at, and the body it needs. */
    const WALK: Record<string, [string, unknown?]> = {
      "PATCH /api/assignments/:id": ["assignment", { title: "x" }],
      "POST /api/assignments/:id/reset": ["assignment", {}],
      "PATCH /api/blocked-ranges/:id": ["blocked", { label: "x" }],
      "DELETE /api/blocked-ranges/:id": ["blocked"],
      "DELETE /api/calendar-templates/:id": ["template"],
      "PATCH /api/children/:id": ["child", { name: "x" }],
      "PATCH /api/events/:id": ["event", { name: "x" }],
      "DELETE /api/family/invites/:id": ["invite"],
      "PATCH /api/log-entries/:id": ["entry", { notes: "x" }],
      "DELETE /api/log-entries/:id": ["entry"],
      "PATCH /api/subjects/:id": ["subject", { name: "x" }],
      "DELETE /api/week-overrides/:id": ["override"],
      "DELETE /api/family/view-links/:id": ["viewLink"],
      "DELETE /api/family/viewers/:id": ["viewer"],
    };

    it("the walk covers every registered route that has :id in its path", () => {
      expect(routes.filter((r) => r.includes(":id")).sort()).toEqual(Object.keys(WALK).sort());
    });

    it("as a parent of family A, family B's id in the path is a 404 and changes nothing", async () => {
      const before = await pool.query("SELECT (SELECT count(*) FROM assignment WHERE family_id = $1) AS a, (SELECT count(*) FROM record_entry WHERE family_id = $1) AS e, (SELECT count(*) FROM child WHERE family_id = $1 AND name = 'Bea') AS c, (SELECT count(*) FROM invite WHERE family_id = $1 AND revoked_at IS NULL) AS i, (SELECT count(*) FROM family_member WHERE family_id = $1) AS m", [b.familyId]);
      for (const [route, [kind, body]] of Object.entries(WALK)) {
        const [method, url] = route.split(" ") as ["PATCH", string];
        const res = await app.inject({ method, url: withId(url).replace("ID", ids[kind]!), cookies: a.cookies, ...(body ? { payload: body as object } : {}), remoteAddress: `10.17.8.${(++ip % 250) + 1}` });
        expect(res.statusCode, route).toBe(404);
      }
      const after = await pool.query("SELECT (SELECT count(*) FROM assignment WHERE family_id = $1) AS a, (SELECT count(*) FROM record_entry WHERE family_id = $1) AS e, (SELECT count(*) FROM child WHERE family_id = $1 AND name = 'Bea') AS c, (SELECT count(*) FROM invite WHERE family_id = $1 AND revoked_at IS NULL) AS i, (SELECT count(*) FROM family_member WHERE family_id = $1) AS m", [b.familyId]);
      expect(after.rows[0]).toEqual(before.rows[0]);
    });

    it("as a viewer of family A, the same calls are 403 (a viewer cannot write at all)", async () => {
      for (const [route, [kind, body]] of Object.entries(WALK)) {
        const [method, url] = route.split(" ") as ["PATCH", string];
        const res = await app.inject({ method, url: withId(url).replace("ID", ids[kind]!), cookies: viewer.cookies, ...(body ? { payload: body as object } : {}), remoteAddress: `10.17.7.${(++ip % 250) + 1}` });
        expect(res.statusCode, route).toBe(403);
      }
    });

    it("records totals, the log list and pace answer 404 for another account's child or subject (and for a made-up id), and 200 for their own", async () => {
      const own = inject(app, a.cookies);
      const mine = await rosterFor(app, a.cookies, ["Ann"], ["Art"]);
      for (const childId of [ids.child!, randomUUID()]) {
        expect((await own("GET", `/api/records/totals?childId=${childId}`)).statusCode).toBe(404);
        expect((await own("GET", `/api/log-entries?childId=${childId}`)).statusCode).toBe(404);
        const pace = (subjectId: string | null, kid: string) => own("POST", "/api/plan/pace", { drafts: [{ subjectId, childIds: [kid], startDate: "2026-11-02", endDate: "2026-11-27", weekdays: null }] });
        expect((await pace(mine.subjectIds[0]!, childId)).statusCode).toBe(404);
      }
      expect((await own("POST", "/api/plan/pace", { drafts: [{ subjectId: ids.subject, childIds: [mine.childIds[0]], startDate: "2026-11-02", endDate: "2026-11-27", weekdays: null }] })).statusCode).toBe(404);
      expect((await own("POST", "/api/plan/pace", { drafts: [{ subjectId: mine.subjectIds[0], childIds: [mine.childIds[0], ids.child], startDate: "2026-11-02", endDate: "2026-11-27", weekdays: null }] })).statusCode).toBe(404);
      expect((await own("GET", `/api/records/totals?childId=${mine.childIds[0]}`)).statusCode).toBe(200);
      expect((await own("GET", `/api/log-entries?childId=${mine.childIds[0]}`)).statusCode).toBe(200);
      expect((await own("POST", "/api/plan/pace", { drafts: [{ subjectId: mine.subjectIds[0], childIds: [mine.childIds[0]], startDate: "2026-11-02", endDate: "2026-11-27", weekdays: null }] })).statusCode).toBe(200);
      expect((await own("POST", "/api/plan/pace", { drafts: [{ subjectId: null, childIds: [mine.childIds[0]], startDate: "2026-11-02", endDate: "2026-11-27", weekdays: null }] })).statusCode).toBe(200);
    });

    it("an archived child of the family is still its own (totals and the log list work)", async () => {
      const own = inject(app, a.cookies);
      const kid = (await rosterFor(app, a.cookies, ["Old"], [])).childIds[0]!;
      await own("PATCH", `/api/children/${kid}`, { archived: true });
      expect((await own("GET", `/api/records/totals?childId=${kid}`)).statusCode).toBe(200);
      expect((await own("GET", `/api/log-entries?childId=${kid}`)).statusCode).toBe(200);
    });

    it("the routes that take ids in a query or body never answer 2xx for another account's ids", async () => {
      const own = inject(app, a.cookies);
      const day = "from=2026-11-02&to=2026-11-08";
      const tries = await Promise.all([
        own("GET", `/api/log-entries/run-days?${day}&childIds=${ids.child}`),
        own("GET", `/api/weights/suggestion?unitType=pages&childIds=${ids.child}`),
        own("POST", "/api/log-entries", { childIds: [ids.child], startDate: "2026-11-02" }),
        own("POST", "/api/log-entries", { childIds: [ids.child], startDate: "2026-11-02", subjectMinutes: { [ids.subject!]: 10 } }),
        own("POST", "/api/assignments", { subjectId: ids.subject, title: "x", unitType: "pages", totalUnits: 10, startDate: "2026-11-02", endDate: "2026-11-20", childIds: [ids.child] }),
        own("POST", "/api/blocked-ranges", { label: "x", kind: "vacation", startDate: "2026-11-23", endDate: "2026-11-27", childIds: [ids.child] }),
        own("POST", "/api/events", { name: "x", weekdays: [1], startDate: null, endDate: null, capacityFraction: 0.5, defaultRule: "normal", subjectRules: {}, childIds: [ids.child] }),
        put(a.cookies, { assignmentId: ids.assignment, childId: ids.child, weekStart: "2026-11-02", plannedUnits: 5, mode: null }),
      ]);
      for (const [i, r] of tries.entries()) expect([400, 404], `attempt ${i}: ${r.statusCode}`).toContain(r.statusCode);
    });
  });
});
