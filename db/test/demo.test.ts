import { execFile } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDemoDatabase, demoBanner, prepareDemo } from "../demo";
import { migrate } from "../migrate";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../seed";
import { createScratch, dropScratch, hasDb, q } from "./scratch";

// S2a-18: `npm run demo`.
describe("assertDemoDatabase", () => {
  it("accepts a *_dev database outside production", () => {
    expect(() => assertDemoDatabase("postgres://hh:hh@localhost:5432/hh_dev", {})).not.toThrow();
    expect(() => assertDemoDatabase("postgres://hh:hh@localhost:5432/hh_dev", { NODE_ENV: "development" })).not.toThrow();
  });
  it.each(["hh_test", "hh", "hh_dev_copy", "prod"])("refuses %s", (db) => {
    expect(() => assertDemoDatabase(`postgres://hh:hh@localhost:5432/${db}`, {})).toThrow(/_dev/);
  });
  it("refuses NODE_ENV=production even for *_dev", () => {
    expect(() => assertDemoDatabase("postgres://hh:hh@localhost:5432/hh_dev", { NODE_ENV: "production" })).toThrow(/production/);
  });
});

describe("demoBanner", () => {
  it("names the web URL, the API health URL and the login", () => {
    const text = demoBanner({ webUrl: "http://localhost:5173", apiUrl: "http://localhost:3000", email: DEMO_EMAIL, password: DEMO_PASSWORD });
    expect(text).toContain("http://localhost:5173");
    expect(text).toContain("http://localhost:3000/api/health");
    expect(text).toContain(`${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  });
});

const DB = "hh_demo_test";
describe.skipIf(!hasDb)("prepareDemo (integration)", () => {
  let url = "";
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url);
    await q(url, "INSERT INTO family (name) VALUES ('Smoke leftover')");
  });
  afterAll(() => dropScratch(DB));

  it("wipes everything and leaves only the seeded demo family", async () => {
    const s = await prepareDemo(url, () => {}, () => {});
    expect(s.counts).toMatchObject({ child: 2, subject: 6, assignment: 20, event: 4, blocked_range: 4, progress_checkin: 2 });
    expect(await q(url, "SELECT name, login_email FROM family")).toEqual([{ name: expect.any(String), login_email: DEMO_EMAIL }]);
  });

  it("the CLI refuses a _test database and changes nothing", async () => {
    await q(url, "INSERT INTO family (name) VALUES ('Still here')");
    const tsx = path.resolve(__dirname, "../../node_modules/.bin/tsx");
    const res = await new Promise<{ failed: boolean; stderr: string }>((resolve) => {
      execFile(tsx, [path.resolve(__dirname, "../demo.ts"), "--no-serve"], { env: { ...process.env, DATABASE_URL: url } }, (err, _out, stderr) =>
        resolve({ failed: err !== null, stderr }));
    });
    expect(res.failed).toBe(true);
    expect(res.stderr).toMatch(/_dev/);
    expect(await q(url, "SELECT count(*)::int AS n FROM family WHERE name = 'Still here'")).toEqual([{ n: 1 }]);
  });
});
