import { buildApp } from "./app";
import { sweepExpiredSessions } from "./auth/session";
import { ConfigError, loadConfig, loadDotenv } from "./config";

loadDotenv();
let config;
try {
  config = loadConfig();
} catch (e) {
  if (e instanceof ConfigError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
const app = buildApp(config);
// S14-04: expired sessions are also swept every hour (and once at start), not only at sign-in.
const sweep = () => sweepExpiredSessions(app.db).catch((err) => app.log.error({ err }, "session sweep failed"));
void sweep();
setInterval(sweep, 60 * 60 * 1000).unref();
// S7b-14: HOST from config (default 127.0.0.1), not every network interface.
await app.listen({ port: config.PORT, host: config.HOST });
console.log(`api listening on http://${config.HOST}:${config.PORT}`);
