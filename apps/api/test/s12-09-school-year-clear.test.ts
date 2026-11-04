/** S12-09 (N8): PATCH /api/family { schoolYear: null } clears the saved year; a saved year never leaves "year" on the reminder list. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("clearing the school year (S12-09, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => { fam = await signedInFamily(pool, "Clear year"); });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });
  const get = async () => (await app.inject({ method: "GET", url: "/api/family", cookies: fam.cookies })).json();
  const patch = (payload: unknown) => app.inject({ method: "PATCH", url: "/api/family", payload: payload as object, cookies: fam.cookies });
  const year = { start: "2026-08-17", end: "2027-05-21", shape: "three-terms" };

  it("null clears the dates and the shape; the rest of the family stays", async () => {
    await patch({ schoolYear: year, name: "Kept" });
    expect((await get()).schoolYear).toEqual(year);
    const res = await patch({ schoolYear: null });
    expect(res.statusCode).toBe(200);
    expect(res.json().schoolYear).toBeNull();
    expect(await get()).toMatchObject({ schoolYear: null, name: "Kept" });
    const { rows } = await pool.query("SELECT school_year_start, school_year_end, school_year_shape FROM family WHERE id = $1", [fam.familyId]);
    expect(rows[0]).toEqual({ school_year_start: null, school_year_end: null, school_year_shape: null });
  });

  it("clearing with nothing saved is fine, and \"later\" stays on the reminder list with it", async () => {
    const res = await patch({ schoolYear: null, setupDeferred: ["year"] });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ schoolYear: null, setupDeferred: ["year"] });
  });

  it("a year saved takes \"year\" off the reminder list, in the same request or already", async () => {
    await patch({ schoolYear: null, setupDeferred: ["year", "breaks"] });
    expect((await patch({ schoolYear: year })).json().setupDeferred).toEqual(["breaks"]);
    // Putting the year off without clearing it leaves no reminder for a year that is set.
    expect((await patch({ setupDeferred: ["year", "breaks"] })).json().setupDeferred).toEqual(["breaks"]);
    expect((await patch({ schoolYear: year, setupDeferred: ["year"] })).json().setupDeferred).toEqual([]);
    // Cleared and put off in one request: the reminder stays.
    expect((await patch({ schoolYear: null, setupDeferred: ["year"] })).json()).toMatchObject({ schoolYear: null, setupDeferred: ["year"] });
  });

  it("still refuses an invalid year, and nothing changes", async () => {
    await patch({ schoolYear: year });
    expect((await patch({ schoolYear: { start: "2027-05-21", end: "2026-08-17" } })).statusCode).toBe(400);
    expect((await get()).schoolYear).toEqual(year);
  });
});
