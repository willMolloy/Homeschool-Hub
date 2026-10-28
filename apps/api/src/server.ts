import { buildApp } from "./app";
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
await app.listen({ port: config.PORT, host: "0.0.0.0" });
console.log(`api listening on http://localhost:${config.PORT}`);
