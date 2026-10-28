import { fileURLToPath } from "node:url";
import { config as loadDotenvFile } from "dotenv";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string({ error: (i) => (i.input === undefined ? "is required" : "must be a string") }).url({ message: "must be a URL like postgres://user:pass@host:5432/db" }),
  SESSION_SECRET: z.string({ error: (i) => (i.input === undefined ? "is required" : "must be a string") }).min(32, { message: "must be at least 32 characters (try: openssl rand -hex 32)" }),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Config = z.infer<typeof schema>;

export class ConfigError extends Error {}

/**
 * Parse and validate configuration. Throws a ConfigError listing every missing or invalid key.
 * Pure: reads only the `env` object it is given (tests pass their own).
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const res = schema.safeParse(env);
  if (!res.success) {
    const lines = res.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new ConfigError(`Invalid API configuration:\n${lines.join("\n")}`);
  }
  return res.data;
}

/**
 * Load the repo-root `.env` into process.env (existing variables win).
 * The API usually runs with cwd = apps/api, so `import "dotenv/config"` would miss the root file.
 */
export function loadDotenv(): void {
  loadDotenvFile({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true } as never);
}
