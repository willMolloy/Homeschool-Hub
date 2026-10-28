/** S2b-23: GET /api/check-ins?weekStart= — one finished week's planned ranges, stored actuals and status. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { resolveWeek, type WeekCheckInJson } from "../src/services/checkInService";
import { hashSessionToken, newSessionToken } from "../src/auth/session";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";
import { signedInFamily } from "./helpers/session";

describe("resolveWeek", () => {
  it("defaults to last week and rejects unfinished or misaligned weeks", () => {
    expect(resolveWeek("mon", "2026-10-28", undefined)).toBe("2026-10-19");
    expect(resolveWeek("sun", "2026-10-28", undefined)).toBe("2026-10-18");
    expect(resolveWeek("mon", "2026-10-26", undefined)).toBe("2026-10-19");
    expect(resolveWeek("mon", "2026-10-28", "2026-10-12")).toBe("2026-10-12");
    expect(() => resolveWeek("mon", "2026-10-28", "2026-10-26")).toThrow(/finished week/);
    expect(() => resolveWeek("mon", "2026-10-28", "2026-10-18")).toThrow(/Monday/);
    expect(() => resolveWeek("sun", "2026-10-28", "2026-10-19")).toThrow(/Sunday/);
  });
});

describe.skipIf(!hasDb)("GET /api/check-ins (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  // Wed Oct 28, 10:00 in Chicago: last week is Oct 19–25.
  const app = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-10-28T15:00:00Z") }) : null!;
  // Wed Nov 4: last week is Oct 26–Nov 1.
  const later = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2026-11-04T15:00:00Z") }) : null!;
  // Wed Jan 6 2027: the Christmas vacation weeks are finished.
  const january = hasDb ? buildApp(testConfig(), { db: pool, now: () => new Date("2027-01-06T15:00:00Z") }) : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let cookies: { hh_session: string };
  let other: Awaited<ReturnType<typeof signedInFamily>>;

  const get = (qs = "", c: { hh_session: string } | null = cookies, on = app) =>
    on.inject({ method: "GET", url: `/api/check-ins${qs}`, ...(c ? { cookies: c } : {}) });
  const ok = async (qs = "", on = app, c = cookies) => {
    const res = await get(qs, c, on);
    expect(res.statusCode, res.body).toBe(200);
    return res.json<WeekCheckInJson>();
  };
  const item = (w: WeekCheckInJson, assignment: string, child: string) =>
    w.items.find((i) => i.assignmentId === fam.ids.assignment[assignment] && i.childId === fam.ids.child[child]);
  const store = (assignment: string, child: string, week: string, position: number, mode: string | null) =>
    pool.query(
      "INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position, mode) VALUES ($1, $2, $3, $4, $5, $6)",
      [fam.familyId, fam.ids.assignment[assignment], fam.ids.child[child], week, position, mode]);

  beforeAll(async () => {
    fam = await seedFamily("check-ins-read@example.com");
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')",
      [hashSessionToken(token), fam.familyId]);
    cookies = { hh_session: token };
    other = await signedInFamily(pool, "Check-ins other");
  });
  afterAll(async () => {
    await Promise.all([app.close(), later.close(), january.close()]);
    await pool.query("DELETE FROM family WHERE id = ANY($1::uuid[])", [[fam.familyId, other.familyId]]);
    await pool.end();
  });

  it("401 without a session", async () => {
    expect((await get("", null)).statusCode).toBe(401);
  });

  it("defaults to last week: Treasure Island for Frank was planned 0–90 (Tuesdays are co-op)", async () => {
    const w = await ok();
    expect(w).toMatchObject({ weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null });
    expect(item(w, "ti", "frank")).toMatchObject({
      childName: "Frank", title: expect.any(String), unitType: "pages", plannedFrom: 0, plannedTo: 90, totalUnits: 270, actual: null, mode: null,
    });
    expect(await ok("?weekStart=2026-10-19")).toEqual(w);
  });

  it("items are sorted by child, then subject, then title, and skip pairs with nothing planned", async () => {
    const w = await ok();
    const names = w.items.map((i) => i.childName);
    expect(names).toEqual([...names].sort());
    expect(item(w, "aesop", "frank")).toBeUndefined(); // ended Oct 16
    expect(item(w, "crusoe", "frank")).toBeUndefined(); // starts in January
    for (const i of w.items) expect(i.plannedTo).toBeGreaterThan(i.plannedFrom);
  });

  it("a multi-child assignment is one item per child", async () => {
    const w = await ok();
    expect(item(w, "hist", "frank")).toBeDefined();
    expect(item(w, "hist", "margaret")).toBeDefined();
  });

  it("an explicit earlier week", async () => {
    const w = await ok("?weekStart=2026-10-12");
    expect(w.weekStart).toBe("2026-10-12");
    expect(item(w, "aesop", "frank")).toBeDefined();
    expect(item(w, "ti", "frank")).toBeUndefined();
  });

  it.each([
    ["?weekStart=2026-10-26", /finished week/],
    ["?weekStart=2026-11-02", /finished week/],
    ["?weekStart=2026-10-20", /first day of a week/],
    ["?weekStart=junk", /weekStart/],
    ["?weekStart=2026-02-30", /weekStart/],
    ["?weekStart=2026-10-19&extra=1", /extra|Unrecognized/i],
  ])("400 for %s", async (qs, msg) => {
    const res = await get(qs);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "invalid_request" });
    expect(res.json().message).toMatch(msg);
  });

  it("the week after: Treasure Island was planned 90–180", async () => {
    const w = await ok("", later);
    expect(w.weekStart).toBe("2026-10-26");
    expect(item(w, "ti", "frank")).toMatchObject({ plannedFrom: 90, plannedTo: 180 });
  });

  it("a vacation week has no items", async () => {
    const w = await ok("?weekStart=2026-12-21", january);
    expect(w.items).toEqual([]);
  });

  it("a stored check-in shows as actual; that week's plan is unchanged, the next week starts from it", async () => {
    await store("ti", "frank", "2026-10-19", 70, "keepEndDate");
    await pool.query("INSERT INTO week_review (family_id, week_start, status) VALUES ($1, '2026-10-19', 'reviewed')", [fam.familyId]);
    const w = await ok();
    expect(w.status).toBe("reviewed");
    expect(item(w, "ti", "frank")).toMatchObject({ plannedFrom: 0, plannedTo: 90, actual: 70, mode: "keepEndDate" });
    const next = await ok("", later);
    expect(next.status).toBeNull();
    const ti = item(next, "ti", "frank")!;
    expect(ti.plannedFrom).toBe(70);
    expect(ti.actual).toBeNull();
    expect(ti.plannedTo).toBeGreaterThan(70);
  });

  it("archived rows drop out unless they have a check-in that week", async () => {
    await store("fracs", "margaret", "2026-10-19", 3, null);
    await pool.query("UPDATE assignment SET archived_at = now() WHERE id = ANY($1::uuid[])",
      [[fam.ids.assignment.fracs, fam.ids.assignment.poems]]);
    const w = await ok();
    expect(item(w, "poems", "margaret")).toBeUndefined();
    expect(item(w, "fracs", "margaret")).toMatchObject({ actual: 3, mode: null, childName: "Margaret" });
    expect(item(w, "fracs", "margaret")!.plannedTo).toBeGreaterThan(item(w, "fracs", "margaret")!.plannedFrom);
  });

  describe("addable: active pairs with nothing planned that week (S2c-06)", () => {
    const addable = (w: WeekCheckInJson, assignment: string, child: string) =>
      w.addable.find((i) => i.assignmentId === fam.ids.assignment[assignment] && i.childId === fam.ids.child[child]);

    it("a normal week has none: every active pair with work left is planned", async () => {
      expect((await ok("?weekStart=2026-10-12")).addable).toEqual([]);
    });

    it("a vacation week: pairs with work left, from = to = where the week starts; not finished or not-yet-started work", async () => {
      const w = await ok("?weekStart=2026-12-21", january);
      expect(w.items).toEqual([]);
      const hist = addable(w, "hist", "frank")!;
      expect(hist).toMatchObject({ childName: "Frank", unitType: "lessons", totalUnits: 140, actual: null, mode: null });
      expect(hist.plannedFrom).toBeGreaterThan(0);
      expect(hist.plannedTo).toBe(hist.plannedFrom);
      expect(addable(w, "hist", "margaret")).toBeDefined();
      expect(addable(w, "aesop", "frank")).toBeUndefined(); // finished
      expect(addable(w, "ti", "frank")).toBeUndefined(); // finished
      expect(addable(w, "crusoe", "frank")).toBeUndefined(); // the week is entirely before its start
      const keys = w.addable.map((i) => `${i.childName}/${i.title}`);
      expect(w.addable.map((i) => i.childName)).toEqual([...w.addable.map((i) => i.childName)].sort());
      expect(new Set(keys).size).toBe(keys.length);
    });

    it("once saved, the unplanned pair shows in items with its actual, and leaves addable", async () => {
      const before = addable(await ok("?weekStart=2026-12-21", january), "sci", "frank")!;
      await store("sci", "frank", "2026-12-21", before.plannedFrom + 2, "keepEndDate");
      const w = await ok("?weekStart=2026-12-21", january);
      expect(item(w, "sci", "frank")).toMatchObject({ plannedFrom: before.plannedFrom, plannedTo: before.plannedFrom, actual: before.plannedFrom + 2, mode: "keepEndDate" });
      expect(addable(w, "sci", "frank")).toBeUndefined();
      // The next week starts from the reported position.
      const next = item(await ok("?weekStart=2026-12-28", january), "sci", "frank");
      expect(next ?? addable(await ok("?weekStart=2026-12-28", january), "sci", "frank")).toMatchObject({ plannedFrom: before.plannedFrom + 2 });
    });

    it("archived pairs are never addable", async () => {
      await pool.query("UPDATE assignment SET archived_at = now() WHERE id = $1", [fam.ids.assignment.math5]);
      try {
        expect(addable(await ok("?weekStart=2026-12-21", january), "math5", "frank")).toBeUndefined();
      } finally {
        await pool.query("UPDATE assignment SET archived_at = NULL WHERE id = $1", [fam.ids.assignment.math5]);
      }
    });
  });

  it("family isolation: another family sees only its own (empty) week", async () => {
    const w = await ok("", app, other.cookies);
    expect(w.items).toEqual([]);
    expect(w.status).toBeNull();
  });
});
