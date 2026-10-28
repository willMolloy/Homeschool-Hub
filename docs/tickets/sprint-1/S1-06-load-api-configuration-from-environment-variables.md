# S1-06 — Load API configuration from environment variables

**Depends on:** S1-05  
**Size:** XS

## Goal
One typed `config` object holds PORT, DATABASE_URL, SESSION_SECRET and NODE_ENV, and the API refuses to start if a required value is missing.

## Context
Config spread through `process.env` calls is hard to test and easy to typo. Java devs: think of this as one `@ConfigurationProperties` class.

## Steps
1. `npm i -w @hh/api zod dotenv`.
2. Create `apps/api/src/config.ts`: `import 'dotenv/config'`; define a zod schema: `PORT` (number, default 3000), `DATABASE_URL` (string url, required), `SESSION_SECRET` (string, min 32 chars, required), `NODE_ENV` (`development|test|production`, default development).
3. Export `loadConfig(env = process.env)` that parses and throws a readable error listing every missing or invalid key.
4. Use it in `server.ts`. Pass config into `buildApp(config)`. Tests build their own config object.
5. Add `SESSION_SECRET=` with a comment to `.env.example` (generate one with `openssl rand -hex 32`).

## Done when
- [ ] Starting the API without DATABASE_URL prints a clear error and exits non-zero.
- [ ] Tests don't need a `.env` file.

## Tests
- loadConfig with all values → typed object
- missing DATABASE_URL → throws naming the key
- short SESSION_SECRET → throws
- PORT defaults to 3000

## Out of scope
- Secrets management for production.
