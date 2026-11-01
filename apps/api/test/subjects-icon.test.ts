/** S8-11: a subject's icon: a key from the fixed list, a default from the name, null for the first-letter badge. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { SUBJECT_ICONS, defaultIconFor } from "../src/http/subjectIcons";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

describe("defaultIconFor", () => {
  it.each([
    ["Math", "calculator"], ["Reading", "book"], ["Literature", "book"], ["Writing", "pencil"], ["Spelling", "pencil"], ["Grammar", "pencil"],
    ["History", "scroll"], ["Science", "flask"], ["Geography", "globe"], ["Art", "palette"], ["Music", "music"], ["Foreign Language", "language"],
    ["Bible", "cross"], ["PE", "running"], ["Latin for Children", "language"], ["Nature notebook", "leaf"], ["Biology 101", "microscope"],
    ["Piano practice", "music"], ["math 5", "calculator"], ["Chess club", null], ["Smart", null], ["Heart of the matter", null],
  ])("%s → %s", (name, icon) => expect(defaultIconFor(name)).toBe(icon));

  it("every default is on the list, and the list has about twenty distinct keys", () => {
    for (const n of ["Math", "Reading", "Writing", "History", "Science", "Geography", "Art", "Music", "Foreign Language", "Bible", "PE", "Nature", "Biology"]) {
      expect(SUBJECT_ICONS).toContain(defaultIconFor(n));
    }
    expect(new Set(SUBJECT_ICONS).size).toBe(SUBJECT_ICONS.length);
    expect(SUBJECT_ICONS.length).toBeGreaterThanOrEqual(18);
    expect(SUBJECT_ICONS.length).toBeLessThanOrEqual(24);
  });
});

describe.skipIf(!hasDb)("subject icons (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => { a = await signedInFamily(pool, "Icon A"); });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [a.familyId]);
    await pool.end();
  });
  const post = (payload: unknown) => app.inject({ method: "POST", url: "/api/subjects", payload: payload as object, cookies: a.cookies });
  const patch = (id: string, payload: unknown) => app.inject({ method: "PATCH", url: `/api/subjects/${id}`, payload: payload as object, cookies: a.cookies });

  it("a new subject gets the default its name suggests; an unknown name gets the letter badge (null)", async () => {
    expect((await post({ name: "Math" })).json().icon).toBe("calculator");
    expect((await post({ name: "Chess club" })).json().icon).toBeNull();
  });

  it("an icon sent on create is kept; null asks for the letter badge even on a common name", async () => {
    expect((await post({ name: "Piano", icon: "star" })).json().icon).toBe("star");
    expect((await post({ name: "Science", icon: null })).json().icon).toBeNull();
  });

  it("the list carries each subject's icon", async () => {
    const list = await app.inject({ method: "GET", url: "/api/subjects", cookies: a.cookies });
    expect(list.json().map((s: { name: string; icon: string | null }) => [s.name, s.icon])).toEqual([
      ["Math", "calculator"], ["Chess club", null], ["Piano", "star"], ["Science", null],
    ]);
  });

  it("patch changes it, null puts the letter back, other edits leave it alone", async () => {
    const id = (await post({ name: "Poetry" })).json().id as string;
    expect((await patch(id, { icon: "heart" })).json().icon).toBe("heart");
    expect((await patch(id, { name: "Poetry hour" })).json().icon).toBe("heart");
    expect((await patch(id, { icon: null })).json().icon).toBeNull();
  });

  it.each([["an unknown key", { icon: "dragon" }], ["a number", { icon: 3 }], ["upper case", { icon: "Star" }], ["empty", { icon: "" }]])("%s → 400, on create and on patch", async (_l, body) => {
    const create = await post({ name: "Bad", ...body });
    expect(create.statusCode).toBe(400);
    expect(create.json().error).toBe("invalid_request");
    const id = (await post({ name: `Fine ${_l}` })).json().id as string;
    expect((await patch(id, body)).statusCode).toBe(400);
  });
});
