/**
 * `npm run demo` (S2a-18): a clean, clickable demo in one command. Dev only.
 *
 *   1. Resets the *_dev database from DATABASE_URL (or the repo-root .env) and seeds the sample family.
 *   2. Starts the API and web dev servers unless they're already running (`--no-serve` skips this).
 *   3. Prints the login and URLs. Ctrl+C stops the servers it started.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { databaseName, databaseUrlFromEnv, MIGRATIONS_DIR, reset } from "./migrate";
import { DEMO_EMAIL, DEMO_PASSWORD, seed, type SeedSummary } from "./seed";

const ROOT = path.resolve(MIGRATIONS_DIR, "..");
const WEB_URL = "http://localhost:5173";

/** Throws unless `url` names a *_dev database and NODE_ENV isn't production. */
export function assertDemoDatabase(url: string, env: Record<string, string | undefined> = process.env): void {
  if (env.NODE_ENV === "production") throw new Error("refusing to run the demo with NODE_ENV=production");
  const name = databaseName(url);
  if (!/_dev$/.test(name)) throw new Error(`refusing to reset database "${name}" for the demo: only databases ending in _dev are used`);
}

/** Wipe and re-migrate the database, then seed the demo family. `guard` is only replaced in tests. */
export async function prepareDemo(url: string, log: (s: string) => void = console.log, guard: (url: string) => void = assertDemoDatabase): Promise<SeedSummary> {
  guard(url);
  await reset(url, MIGRATIONS_DIR, log);
  return seed(url);
}

export function demoBanner(o: { webUrl: string; apiUrl: string; email: string; password: string }): string {
  return [
    "",
    "Homeschool Hub demo is ready.",
    `  Open:     ${o.webUrl}`,
    `  Sign in:  ${o.email} / ${o.password}`,
    `  API:      ${o.apiUrl}/api/health`,
    "  Look at:  Plan (debug view) → Schedule → Settings, Assignments, Days off, Events; then Plan again.",
    "  Guide:    docs/REVIEW-GUIDE.md",
    "",
  ].join("\n");
}

function apiPort(): number {
  if (process.env.PORT) return Number(process.env.PORT);
  const envFile = path.join(ROOT, ".env");
  const m = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8").match(/^PORT=(\d+)$/m) : null;
  return m?.[1] ? Number(m[1]) : 3000;
}

async function isUp(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

function start(label: string, script: string): ChildProcess {
  const child = spawn("npm", ["run", script], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" });
  const prefix = (chunk: Buffer) => chunk.toString().split(/\r?\n/).filter(Boolean).forEach((l) => console.log(`[${label}] ${l}`));
  child.stdout?.on("data", prefix);
  child.stderr?.on("data", prefix);
  return child;
}

async function waitUntilUp(url: string, label: string, ms = 60_000): Promise<void> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await isUp(url)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${label} didn't answer at ${url} within ${ms / 1000}s (see the [${label}] lines above)`);
}

async function main(): Promise<void> {
  const url = databaseUrlFromEnv();
  assertDemoDatabase(url);
  const s = await prepareDemo(url);
  console.log(`Seeded ${databaseName(url)}: ${Object.entries(s.counts).map(([t, n]) => `${n} ${t}`).join(", ")}`);

  const apiUrl = `http://localhost:${apiPort()}`;
  const banner = demoBanner({ webUrl: WEB_URL, apiUrl, email: DEMO_EMAIL, password: DEMO_PASSWORD });
  if (process.argv.includes("--no-serve")) {
    console.log(banner + "Servers not started (--no-serve). Run `npm run dev:api` and `npm run dev:web`.\n");
    return;
  }

  const started: ChildProcess[] = [];
  const stop = () => {
    for (const c of started) {
      try { if (c.pid) process.kill(process.platform === "win32" ? c.pid : -c.pid, "SIGTERM"); } catch { /* already gone */ }
    }
  };
  process.on("SIGINT", () => { stop(); process.exit(0); });
  process.on("SIGTERM", () => { stop(); process.exit(0); });
  try {
    if (!(await isUp(`${apiUrl}/api/health`))) started.push(start("api", "dev:api"));
    if (!(await isUp(WEB_URL))) started.push(start("web", "dev:web"));
    await waitUntilUp(`${apiUrl}/api/health`, "api");
    await waitUntilUp(WEB_URL, "web");
  } catch (e) {
    stop();
    throw e;
  }
  if (started.length === 0) {
    console.log(banner + "Both servers were already running; nothing else started.\n");
    return;
  }
  console.log(banner + "Press Ctrl+C to stop the servers.\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(String((e as Error).message ?? e));
    process.exit(1);
  });
}
