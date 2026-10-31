/** S6-10: a weight nudge (a PATCH of weightPerUnit) carries forward to the child's next suggestion, and undoes. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("a weight nudge carries forward (S6-10, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let kid = "", other = "", subject = "", id = "";
  const suggest = async (child: string) =>
    (await req("GET", `/api/weights/suggestion?unitType=pages&childIds=${child}&subjectId=${subject}`)).json();
  const create = async (child: string, weightPerUnit: number | null) =>
    (await req("POST", "/api/assignments", { subjectId: subject, title: "Book", unitType: "pages", totalUnits: 100, weightPerUnit, startDate: "2026-11-02", endDate: "2026-12-11", childIds: [child] })).json().id;

  beforeAll(async () => {
    fam = await signedInFamily(pool, "Nudge");
    req = inject(app, fam.cookies);
    const r = await rosterFor(app, fam.cookies, ["Ada", "Ben"], ["Reading"]);
    [kid, other] = r.childIds as [string, string];
    subject = r.subjectIds[0]!;
    id = await create(kid, 2);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  it("the next suggestion for that child reflects the nudge, and not another child's", async () => {
    expect(await suggest(kid)).toMatchObject({ weightPerUnit: 2, source: "child" });
    const res = await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: 2.5 });
    expect(res.statusCode).toBe(200);
    expect(await suggest(kid)).toMatchObject({ weightPerUnit: 2.5, source: "child" });
    expect(await suggest(other)).toMatchObject({ source: "builtin" });
    // A later assignment for the child starts from the corrected weight.
    await create(kid, null);
    expect(await suggest(kid)).toMatchObject({ weightPerUnit: 2.5 });
  });

  it("two nudges compound, and undoing the last one takes its choice back", async () => {
    await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: 3.13 });
    expect(await suggest(kid)).toMatchObject({ weightPerUnit: 3.13 });
    expect((await req("POST", "/api/undo")).statusCode).toBe(200);
    expect(await suggest(kid)).toMatchObject({ weightPerUnit: 2.5 });
  });
});
