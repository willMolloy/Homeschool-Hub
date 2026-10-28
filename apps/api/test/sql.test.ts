/** RF-12: the shared update-SET builder and child-link replacement. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { withTransaction } from "../src/db";
import { buildUpdateSet, replaceLinks } from "../src/repos/sql";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe("buildUpdateSet", () => {
  it("skips undefined, keeps null, numbers params from firstParam", () => {
    expect(buildUpdateSet({ a: 1, b: undefined, c: null, d: "x" }, { firstParam: 3 })).toEqual({
      set: "a = $3, c = $4, d = $5, updated_at = now()", params: [1, null, "x"],
    });
    expect(buildUpdateSet({ a: 1 }, { firstParam: 1 }).set).toBe("a = $1, updated_at = now()");
  });
  it("archived true keeps an existing archived_at, false clears it, absent leaves it", () => {
    expect(buildUpdateSet({}, { firstParam: 3, archived: true }).set).toBe("archived_at = COALESCE(archived_at, now()), updated_at = now()");
    expect(buildUpdateSet({}, { firstParam: 3, archived: false }).set).toBe("archived_at = NULL, updated_at = now()");
    expect(buildUpdateSet({ a: 1 }, { firstParam: 3 }).set).not.toContain("archived_at");
  });
  it("an empty patch still sets updated_at", () => {
    expect(buildUpdateSet({ a: undefined }, { firstParam: 3 })).toEqual({ set: "updated_at = now()", params: [] });
  });
  it("refuses a column name that isn't a plain identifier", () => {
    expect(() => buildUpdateSet({ "x = 1; --": 1 } as Record<string, unknown>, { firstParam: 1 })).toThrow(/bad column name/);
  });
});

describe.skipIf(!hasDb)("replaceLinks (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[];
  let r1: string;
  let r2: string;
  beforeAll(async () => {
    fam = await signedInFamily(pool, "Replace links");
    const req = inject(app, fam.cookies);
    kids = (await rosterFor(app, fam.cookies, ["A", "B", "C"], ["Math"])).childIds;
    const add = async (childIds: string[]) =>
      (await req("POST", "/api/blocked-ranges", { label: "Off", kind: "other", startDate: "2026-11-02", endDate: "2026-11-03", childIds })).json().id as string;
    r1 = await add([kids[0]!]);
    r2 = await add([kids[0]!, kids[1]!]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });
  const links = async (id: string) =>
    (await pool.query("SELECT child_id FROM blocked_range_child WHERE blocked_range_id = $1 ORDER BY child_id", [id])).rows.map((r) => r.child_id as string);

  it("replaces the owner's links and leaves other owners alone", async () => {
    await withTransaction(pool, (tx) => replaceLinks(tx, "blocked_range_child", { ownerId: r1, familyId: fam.familyId, childIds: [kids[1]!, kids[2]!] }));
    expect(await links(r1)).toEqual([kids[1]!, kids[2]!].sort());
    expect(await links(r2)).toEqual([kids[0]!, kids[1]!].sort());
  });
  it("[] removes them all", async () => {
    await withTransaction(pool, (tx) => replaceLinks(tx, "blocked_range_child", { ownerId: r1, familyId: fam.familyId, childIds: [] }));
    expect(await links(r1)).toEqual([]);
    expect(await links(r2)).toHaveLength(2);
  });
});
