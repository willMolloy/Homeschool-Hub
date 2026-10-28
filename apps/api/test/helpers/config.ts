import type { Config } from "../../src/config";

/** Config for tests: no .env needed. Integration tests override DATABASE_URL from the environment. */
export function testConfig(over: Partial<Config> = {}): Config {
  return {
    PORT: 0,
    DATABASE_URL: process.env.DATABASE_URL ?? "postgres://hh:hh@localhost:5432/hh_test",
    SESSION_SECRET: "test-secret-test-secret-test-secret-123",
    NODE_ENV: "test",
    ...over,
  };
}
