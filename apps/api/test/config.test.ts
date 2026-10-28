import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "../src/config";

const good = {
  DATABASE_URL: "postgres://hh:hh@localhost:5432/hh_dev",
  SESSION_SECRET: "x".repeat(32),
  PORT: "4000",
  NODE_ENV: "production",
};

describe("loadConfig", () => {
  it("returns a typed object when every value is present", () => {
    expect(loadConfig(good)).toEqual({ ...good, PORT: 4000 });
  });
  it("throws naming DATABASE_URL when it is missing", () => {
    const { DATABASE_URL: _omit, ...rest } = good;
    expect(() => loadConfig(rest)).toThrow(ConfigError);
    expect(() => loadConfig(rest)).toThrow(/DATABASE_URL/);
  });
  it("throws on a short SESSION_SECRET", () => {
    expect(() => loadConfig({ ...good, SESSION_SECRET: "short" })).toThrow(/SESSION_SECRET/);
  });
  it("lists every bad key at once", () => {
    let msg = "";
    try { loadConfig({}); } catch (e) { msg = (e as Error).message; }
    expect(msg).toMatch(/DATABASE_URL/);
    expect(msg).toMatch(/SESSION_SECRET/);
  });
  it("defaults PORT to 3000 and NODE_ENV to development", () => {
    const c = loadConfig({ DATABASE_URL: good.DATABASE_URL, SESSION_SECRET: good.SESSION_SECRET });
    expect(c.PORT).toBe(3000);
    expect(c.NODE_ENV).toBe("development");
  });
});
