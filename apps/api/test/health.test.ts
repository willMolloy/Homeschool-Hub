import { afterAll, describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";

const app = buildApp(testConfig());
app.get("/api/test-throws", async () => {
  throw new Error("boom");
});
afterAll(() => app.close());

describe("GET /api/health", () => {
  it("returns 200, ok and the engine version", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, engineVersion: ENGINE_VERSION });
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
