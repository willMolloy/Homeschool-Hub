import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("/api/calendar-templates (S5-06, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let theirs: ReturnType<typeof inject>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Templates A");
    b = await signedInFamily(pool, "Templates B");
    req = inject(app, a.cookies);
    theirs = inject(app, b.cookies);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const brk = (over: object = {}) => ({ offsetDays: 21, lengthDays: 7, label: "Break", kind: "vacation", ...over });
  const body = (over: object = {}) => ({ name: "Our year", breaks: [brk()], ...over });
  const count = async () => (await pool.query("SELECT count(*)::int AS n FROM calendar_template WHERE family_id = $1", [a.familyId])).rows[0].n as number;

  it("create → 201, list shows it, and the breaks round-trip unchanged", async () => {
    const breaks = [brk(), brk({ offsetDays: 100, lengthDays: 2, label: "Thanksgiving", kind: "holiday" }), brk({ offsetDays: 0, lengthDays: 1, label: null, kind: "other" })];
    const res = await req("POST", "/api/calendar-templates", { name: "  Our year  ", breaks });
    expect(res.statusCode).toBe(201);
    const t = res.json();
    expect(t).toEqual({ id: expect.any(String), name: "Our year", breaks });
    expect((await req("GET", "/api/calendar-templates")).json()).toEqual([t]);
  });

  it("a blank label is stored as none; lists come oldest first", async () => {
    const second = (await req("POST", "/api/calendar-templates", body({ name: "Second", breaks: [brk({ label: "  " })] }))).json();
    expect(second.breaks[0].label).toBeNull();
    expect((await req("GET", "/api/calendar-templates")).json().map((t: { name: string }) => t.name)).toEqual(["Our year", "Second"]);
  });

  it("delete → 204 and it is gone; deleting again → 404", async () => {
    const t = (await req("POST", "/api/calendar-templates", body({ name: "Doomed" }))).json();
    expect((await req("DELETE", `/api/calendar-templates/${t.id}`)).statusCode).toBe(204);
    expect((await req("GET", "/api/calendar-templates")).json().map((x: { id: string }) => x.id)).not.toContain(t.id);
    expect((await req("DELETE", `/api/calendar-templates/${t.id}`)).statusCode).toBe(404);
  });

  it("is invisible to other families: not listed, delete → 404 and nothing is removed", async () => {
    const mine = (await req("POST", "/api/calendar-templates", body({ name: "Mine only" }))).json();
    expect((await theirs("GET", "/api/calendar-templates")).json()).toEqual([]);
    expect((await theirs("DELETE", `/api/calendar-templates/${mine.id}`)).statusCode).toBe(404);
    expect((await req("GET", "/api/calendar-templates")).json().map((x: { id: string }) => x.id)).toContain(mine.id);
    const own = (await theirs("POST", "/api/calendar-templates", body({ name: "Theirs" }))).json();
    expect((await req("GET", "/api/calendar-templates")).json().map((x: { id: string }) => x.id)).not.toContain(own.id);
  });

  it("a malformed id → 404", async () => {
    expect((await req("DELETE", "/api/calendar-templates/not-an-id")).statusCode).toBe(404);
  });

  const bad: [string, Record<string, unknown>][] = [
    ["no name", { name: undefined }],
    ["blank name", { name: "   " }],
    ["a 61-character name", { name: "x".repeat(61) }],
    ["a NUL in the name", { name: "a\u0000b" }],
    ["no breaks", { breaks: [] }],
    ["breaks not a list", { breaks: brk() }],
    ["101 breaks", { breaks: Array.from({ length: 101 }, () => brk()) }],
    ["offset -1", { breaks: [brk({ offsetDays: -1 })] }],
    ["offset 401", { breaks: [brk({ offsetDays: 401 })] }],
    ["offset 1.5", { breaks: [brk({ offsetDays: 1.5 })] }],
    ["offset as text", { breaks: [brk({ offsetDays: "3" })] }],
    ["length 0", { breaks: [brk({ lengthDays: 0 })] }],
    ["length 61", { breaks: [brk({ lengthDays: 61 })] }],
    ["unknown kind", { breaks: [brk({ kind: "someday" })] }],
    ["no kind", { breaks: [brk({ kind: undefined })] }],
    ["a 61-character label", { breaks: [brk({ label: "x".repeat(61) })] }],
    ["an unknown key on a break", { breaks: [brk({ startDate: "2026-09-01" })] }],
    ["an unknown key on the body", { familyId: "x" }],
  ];
  it.each(bad)("invalid: %s → 400, nothing stored", async (_label, over) => {
    const before = await count();
    const res = await req("POST", "/api/calendar-templates", body(over));
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
    expect(await count()).toBe(before);
  });

  it("the limits themselves are accepted: 100 breaks, offset 400, length 60, a 60-character name", async () => {
    const res = await req("POST", "/api/calendar-templates", body({ name: "x".repeat(60), breaks: Array.from({ length: 100 }, () => brk({ offsetDays: 400, lengthDays: 60 })) }));
    expect(res.statusCode).toBe(201);
    expect(res.json().breaks).toHaveLength(100);
  });

  it("signed out → 401 on all three", async () => {
    const out = inject(app, null);
    expect((await out("GET", "/api/calendar-templates")).statusCode).toBe(401);
    expect((await out("POST", "/api/calendar-templates", body())).statusCode).toBe(401);
    expect((await out("DELETE", "/api/calendar-templates/00000000-0000-4000-8000-000000000001")).statusCode).toBe(401);
  });
});
