/** S2b-08: choicesFor reads each child's usual-weight window in one family-scoped query. */
import { usualWeight } from "@hh/engine";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { choicesFor } from "../src/repos/weightChoiceRepo";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("choicesFor (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let mine: Awaited<ReturnType<typeof signedInFamily>>;
  let theirs: Awaited<ReturnType<typeof signedInFamily>>;
  let kids: string[] = [];
  let theirKid = "";
  let subject = "";
  let theirSubject = "";

  const create = async (cookies: { hh_session: string }, subjectId: string, childIds: string[], unitType: string, weightPerUnit: number) => {
    const res = await inject(app, cookies)("POST", "/api/assignments", {
      subjectId, title: "Book", unitType, totalUnits: 50, startDate: "2026-11-02", endDate: "2026-11-27", childIds, weightPerUnit,
    });
    expect(res.statusCode, res.body).toBe(201);
    return res.json().id as string;
  };

  beforeAll(async () => {
    mine = await signedInFamily(pool, "Repo mine");
    theirs = await signedInFamily(pool, "Repo theirs");
    const r = await rosterFor(app, mine.cookies, ["Ann", "Ben"], ["Reading"]);
    kids = r.childIds;
    subject = r.subjectIds[0]!;
    const t = await rosterFor(app, theirs.cookies, ["Zed"], ["Math"]);
    theirKid = t.childIds[0]!;
    theirSubject = t.subjectIds[0]!;
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1::uuid[])", [[mine.familyId, theirs.familyId]]);
    await pool.end();
  });

  it("returns the latest choice per assignment, newest 5 per child, per unit and family", async () => {
    const ids: string[] = [];
    for (const w of [100, 1, 2, 3, 4]) ids.push(await create(mine.cookies, subject, [kids[0]!], "pages", w));
    // An edit counts once, at its last value; Ben shares this one.
    const shared = await create(mine.cookies, subject, [kids[0]!, kids[1]!], "pages", 9);
    expect((await inject(app, mine.cookies)("PATCH", `/api/assignments/${shared}`, { weightPerUnit: 5 })).statusCode).toBe(200);
    // A cleared assignment drops out and doesn't take a window slot.
    const cleared = await create(mine.cookies, subject, [kids[0]!], "pages", 50);
    expect((await inject(app, mine.cookies)("PATCH", `/api/assignments/${cleared}`, { weightPerUnit: null })).statusCode).toBe(200);
    // Other units and other families never appear.
    await create(mine.cookies, subject, [kids[0]!], "chapters", 40);
    await create(theirs.cookies, theirSubject, [theirKid], "pages", 70);

    const rows = await choicesFor(pool, mine.familyId, [kids[0]!, kids[1]!, theirKid], "pages");
    const ann = rows.filter((r) => r.childId === kids[0]);
    const ben = rows.filter((r) => r.childId === kids[1]);
    expect(ann.map((r) => r.weight)).toEqual([5, 4, 3, 2, 1]);
    expect(ben.map((r) => r.weight)).toEqual([5]);
    expect(rows.every((r) => r.childId !== theirKid)).toBe(true);
    expect(usualWeight(ann)).toBe(3);

    const chapters = await choicesFor(pool, mine.familyId, [kids[0]!], "chapters");
    expect(chapters.map((r) => r.weight)).toEqual([40]);
    expect(await choicesFor(pool, theirs.familyId, [kids[0]!], "pages")).toEqual([]);
  });

  it("archived assignments still count", async () => {
    const id = await create(mine.cookies, subject, [kids[1]!], "chapters", 12);
    expect((await inject(app, mine.cookies)("PATCH", `/api/assignments/${id}`, { archived: true })).statusCode).toBe(200);
    expect((await choicesFor(pool, mine.familyId, [kids[1]!], "chapters")).map((r) => r.weight)).toEqual([12]);
  });

  it("no children → no query, no rows", async () => {
    expect(await choicesFor(pool, mine.familyId, [], "pages")).toEqual([]);
  });
});
