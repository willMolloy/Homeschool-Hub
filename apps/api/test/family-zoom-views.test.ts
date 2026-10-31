/** S7-03: GET/PATCH /api/family zoomViews: hidden built-ins and the family's own views. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

const id = (n: number) => `70000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const view = (n: number, over: object = {}) => ({ id: id(n), name: `Term ${n}`, start: "2026-08-17", end: "2026-11-06", ...over });
const EMPTY = { hidden: [], custom: [] };

describe.skipIf(!hasDb)("zoomViews on /api/family (S7-03, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Zoom A");
    b = await signedInFamily(pool, "Zoom B");
  });
  beforeEach(async () => {
    await pool.query("UPDATE family SET zoom_views = '{\"hidden\":[],\"custom\":[]}' WHERE id = $1", [a.familyId]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const get = (cookies = a.cookies) => app.inject({ method: "GET", url: "/api/family", cookies });
  const patch = (zoomViews: unknown) => app.inject({ method: "PATCH", url: "/api/family", payload: { zoomViews } as object, cookies: a.cookies });
  const rejected = async (zoomViews: unknown, message: RegExp) => {
    const res = await patch(zoomViews);
    expect(res.statusCode, res.body).toBe(400);
    expect(res.json()).toMatchObject({ error: "invalid_request" });
    expect(res.json().message).toMatch(message);
    expect((await get()).json().zoomViews).toEqual(EMPTY);
  };

  it("starts with nothing hidden and no views of its own", async () => {
    expect((await get()).json().zoomViews).toEqual(EMPTY);
  });

  it("round-trips hidden built-ins and custom views, and keeps the other settings", async () => {
    const zoomViews = { hidden: ["fall", "spring"], custom: [view(1), view(2, { name: "Term 2", start: "2026-11-09", end: "2027-02-05" })] };
    const res = await patch(zoomViews);
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({ name: "Zoom A", weekStart: "mon", zoomViews });
    expect((await get()).json().zoomViews).toEqual(zoomViews);
    expect((await get(b.cookies)).json().zoomViews).toEqual(EMPTY);
  });

  it("keeps the order of the custom views", async () => {
    const zoomViews = { hidden: ["fall", "spring"], custom: [view(3), view(1), view(2)] };
    await patch(zoomViews);
    expect((await get()).json().zoomViews.custom.map((v: { id: string }) => v.id)).toEqual([id(3), id(1), id(2)]);
  });

  it("a name is trimmed", async () => {
    await patch({ hidden: [], custom: [view(1, { name: "  Term one  " })] });
    expect((await get()).json().zoomViews.custom[0].name).toBe("Term one");
  });

  it("another setting alone leaves the views as they were", async () => {
    await patch({ hidden: ["month"], custom: [view(1)] });
    expect((await app.inject({ method: "PATCH", url: "/api/family", payload: { name: "Renamed" }, cookies: a.cookies })).statusCode).toBe(200);
    expect((await get()).json().zoomViews).toEqual({ hidden: ["month"], custom: [view(1)] });
  });

  it("can send an empty set to bring everything back", async () => {
    await patch({ hidden: ["fall"], custom: [view(1)] });
    expect((await patch(EMPTY)).statusCode).toBe(200);
    expect((await get()).json().zoomViews).toEqual(EMPTY);
  });

  it("Year can't be hidden", async () => {
    await rejected({ hidden: ["year"], custom: [] }, /Only Fall, Spring and This month can be hidden/);
  });

  it("5 custom views with the three built-ins hidden is 6 shown: fine", async () => {
    const res = await patch({ hidden: ["fall", "spring", "month"], custom: [1, 2, 3, 4, 5].map((n) => view(n)) });
    expect(res.statusCode, res.body).toBe(200);
  });

  it("6 custom views are refused", async () => {
    await rejected({ hidden: ["fall", "spring", "month"], custom: [1, 2, 3, 4, 5, 6].map((n) => view(n)) }, /up to 5 views of your own/);
  });

  it("4 custom views with all three built-ins shown (8 shown) are refused", async () => {
    await rejected({ hidden: [], custom: [1, 2, 3, 4].map((n) => view(n)) }, /show up to 6 views; this shows 8/);
  });

  it("3 custom views with the built-ins shown (7 shown) are refused, 2 (6 shown) are fine", async () => {
    await rejected({ hidden: [], custom: [1, 2, 3].map((n) => view(n)) }, /this shows 7/);
    expect((await patch({ hidden: [], custom: [1, 2].map((n) => view(n)) })).statusCode).toBe(200);
  });

  it.each([
    ["an end before the start", view(1, { start: "2026-11-06", end: "2026-08-17" }), /last day must be on or after the first day/],
    ["a bad date", view(1, { start: "2026-02-30" }), /real YYYY-MM-DD dates/],
    ["a date that is not text", view(1, { end: 20261106 }), /YYYY-MM-DD/],
    ["more than 400 days", view(1, { start: "2026-01-01", end: "2027-02-05" }), /at most 400 days; this one covers 401/],
    ["an empty name", view(1, { name: "   " }), /Name is required/],
    ["a 31-character name", view(1, { name: "x".repeat(31) }), /30 characters or fewer/],
    ["an id that is not a uuid", view(1, { id: "term-1" }), /id must be a uuid/],
    ["an unknown key", view(1, { color: "#fff" }), /color/],
  ])("%s is refused", async (_label, v, message) => {
    await rejected({ hidden: ["fall", "spring"], custom: [v] }, message);
  });

  it("exactly 400 days is fine", async () => {
    expect((await patch({ hidden: ["fall"], custom: [view(1, { start: "2026-01-01", end: "2027-02-04" })] })).statusCode).toBe(200);
  });

  it("two views can't share an id", async () => {
    await rejected({ hidden: ["fall", "spring"], custom: [view(1), view(1, { name: "Again" })] }, /own id/);
  });

  it("a built-in can't be hidden twice, and an unknown name is refused", async () => {
    await rejected({ hidden: ["fall", "fall"], custom: [] }, /only be hidden once/);
    await rejected({ hidden: ["winter"], custom: [] }, /Only Fall, Spring and This month/);
  });

  it.each([
    ["no hidden list", { custom: [] }],
    ["no custom list", { hidden: [] }],
    ["an unknown key", { hidden: [], custom: [], extra: 1 }],
    ["not an object", []],
    ["null", null],
  ])("%s is refused", async (_label, body) => {
    const res = await patch(body);
    expect(res.statusCode).toBe(400);
    expect((await get()).json().zoomViews).toEqual(EMPTY);
  });
});
