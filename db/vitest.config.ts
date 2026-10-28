import { defineConfig } from "vitest/config";
// DB tests share one Postgres server and create/drop databases, so run files one at a time.
export default defineConfig({ test: { include: ["test/**/*.test.ts"], fileParallelism: false, testTimeout: 30000, hookTimeout: 30000 } });
