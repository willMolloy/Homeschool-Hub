import { afterAll, describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { buildApp } from "../src/app";
import { createPool } from "../src/db";
import { testConfig } from "./helpers/config";
import { hasDb } from "./helpers/db";

// Port 1 refuses connections immediately: a deterministic "database down".
const deadPool = createPool({ DATABASE_URL: "postgres://hh:hh@127.0.0.1:1/none" });
const app = buildApp(testConfig(), { db: deadPool });
app.get("/api/test-throws", async () => {
  throw new Error("boom");
});
afterAll(async () => {
  await app.close();
  await deadPool.end();
});

describe("GET /api/health", () => {
  it("returns 200, ok and the engine version, db down when unreachable", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, engineVersion: ENGINE_VERSION, db: "down" });
  });
  it.skipIf(!hasDb)("reports db ok when the database answers", async () => {
    const live = buildApp(testConfig());
    const res = await live.inject({ method: "GET", url: "/api/health" });
    expect(res.json()).toMatchObject({ ok: true, db: "ok" });
    await live.close();
  });
});

describe("errors", () => {
  it("404s unknown routes with JSON", async () => {
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "not_found" });
  });
  it("returns 500 JSON when a route throws, without leaking the message", async () => {
    const res = await app.inject({ method: "GET", url: "/api/test-throws" });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: "internal_error", message: "Something went wrong." });
  });
});
