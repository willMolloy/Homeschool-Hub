/** S11-06: the one-time hints a family has seen round-trip through /api/family and /api/me (021_tips_seen). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("tips seen on the family (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => { fam = await signedInFamily(pool, "Tips family"); });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });
  const me = () => app.inject({ method: "GET", url: "/api/me", cookies: fam.cookies });
  const patch = (payload: unknown) => app.inject({ method: "PATCH", url: "/api/family", payload: payload as object, cookies: fam.cookies });

  it("a new family has seen none", async () => {
    expect((await me()).json().tipsSeen).toEqual([]);
  });

  it("round-trips, shows in /api/me, survives another setting, and an empty list shows the tips again", async () => {
    expect((await patch({ tipsSeen: ["bars", "icons"] })).json().tipsSeen).toEqual(["bars", "icons"]);
    expect((await me()).json().tipsSeen).toEqual(["bars", "icons"]);
    expect((await patch({ name: "Tips family 2" })).json().tipsSeen).toEqual(["bars", "icons"]);
    expect((await patch({ tipsSeen: [] })).json().tipsSeen).toEqual([]);
  });

  it.each([["an unknown tip", ["tour"]], ["a repeat", ["bars", "bars"]], ["not a list", "bars"], ["null", null]])("%s → 400, nothing changes", async (_l, tipsSeen) => {
    await patch({ tipsSeen: ["edit"] });
    expect((await patch({ tipsSeen })).statusCode).toBe(400);
    expect((await me()).json().tipsSeen).toEqual(["edit"]);
  });
});
