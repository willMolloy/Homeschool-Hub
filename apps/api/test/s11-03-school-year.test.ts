/** S11-03: the school year's first and last day round-trip through /api/family (020_school_year). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("the school year on the family (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => { fam = await signedInFamily(pool, "Year family"); });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });
  const get = () => app.inject({ method: "GET", url: "/api/family", cookies: fam.cookies });
  const patch = (payload: unknown) => app.inject({ method: "PATCH", url: "/api/family", payload: payload as object, cookies: fam.cookies });

  it("is null until the parent gives it", async () => {
    expect((await get()).json().schoolYear).toBeNull();
  });

  it("round-trips, and another setting leaves it alone", async () => {
    const res = await patch({ schoolYear: { start: "2026-08-17", end: "2027-05-21" }, setupStep: 5 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ schoolYear: { start: "2026-08-17", end: "2027-05-21" }, setupStep: 5 });
    expect((await patch({ name: "Year family 2" })).json().schoolYear).toEqual({ start: "2026-08-17", end: "2027-05-21" });
    expect((await get()).json().schoolYear).toEqual({ start: "2026-08-17", end: "2027-05-21" });
  });

  it.each([
    ["last day before the first", { start: "2027-05-21", end: "2026-08-17" }],
    ["more than 400 days", { start: "2026-01-01", end: "2027-03-01" }],
    ["a day that isn't a date", { start: "2026-02-30", end: "2026-05-01" }],
    ["a missing last day", { start: "2026-08-17" }],
    ["an unknown key", { start: "2026-08-17", end: "2027-05-21", name: "x" }],
    ["null", null],
  ])("%s → 400, nothing changes", async (_l, schoolYear) => {
    const before = (await get()).json();
    expect((await patch({ schoolYear })).statusCode).toBe(400);
    expect((await get()).json()).toEqual(before);
  });
});
