# RF-04 — Turn on structured production logging

**Depends on:** RF-03  
**Size:** S  
**Review refs:** developer M1, tester H-1

## Goal
Production writes structured JSON logs (requests, 5xx errors, pool errors, the bad-time-zone warning), and no password, cookie or session token ever reaches a log line.

## Context
The Fastify logger is off unless `NODE_ENV=development`. In production a 500 leaves no trace, `pool.on("error", () => {})` discards errors, and the bad-zone `req.log.warn` goes nowhere.

## Steps
1. `config.ts`: optional `LOG_LEVEL` (fatal…trace or silent). The default depends on NODE_ENV: production → `info`, development → `warn`, test → `silent`.
2. `http/logging.ts`: `loggerOptions(config)` sets the level, redacts `req.headers.cookie`, `req.headers.authorization`, `res.headers["set-cookie"]`, `*.password` and `*.password_hash` (censored as `[redacted]`), and uses request serializers that log method, url (query string kept: there are no secrets in our queries), route, IP and status only, never headers or bodies.
3. `app.ts` uses it. `BuildOptions.logger?` lets tests pass a stream-backed logger.
4. `createPool(config, log?)`: pool errors are logged with `log.error({ err }, "idle database client error")` and still never crash the process.
5. The bad-zone warning keeps its `familyId` and `timeZone` fields.

## Done when
- [ ] In production mode, a 500 produces an `error`-level line with the stack, and a request line per request.
- [ ] No captured line contains the login password, the cookie value or the set-cookie header.

## Tests
- `loadConfig`: the LOG_LEVEL default for each NODE_ENV; an explicit value wins; junk → ConfigError.
- With a capture stream: login (right and wrong password) and an authenticated GET produce request logs with none of password, cookie or token; a forced 500 is logged at error level.
- An idle pool `error` event calls the logger and doesn't throw.
- A family with a bad stored time zone → one `warn` line with `familyId` and `timeZone`.

## Out of scope
- Shipping logs anywhere, request ids in responses, metrics.
