# S1-01 — Verify the skeleton builds on your machine

**Depends on:** nothing  
**Size:** XS  
**Status:** Built overnight, needs verification on your machine

## Goal
Confirm the overnight monorepo skeleton installs, typechecks, tests, and runs locally.

## Context
The skeleton was created on the build box (commits b11fd41 onward). Nothing has been run on DeeDee's own machine yet.
Layout: `packages/engine` (pure TypeScript planning engine), `apps/web` (Vite + React PWA shell), `apps/api` (Node API), `db/` (SQL migrations).
npm workspaces link `@hh/engine` into both apps, so there is no build step for the engine. The apps import its TypeScript source directly.

## Steps
1. Install Node 20 (see `.nvmrc`; `nvm use` works if you use nvm).
2. From the repo root, run `npm install`.
3. Run `npm run typecheck` (all three workspaces).
4. Run `npm test` (engine 128 tests + api 2 tests).
5. Run `npm run test:tz` (the engine suite again under 7 time zones).
6. Run `npm run dev:api`, then open http://localhost:3000/api/health.
7. In a second terminal, run `npm run dev:web`, then open http://localhost:5173. It shows the engine version and a sample rate.
8. Write down anything that failed in a new ticket. Don't fix it inside this one.

## Done when
- [ ] All commands above succeed on your machine.
- [ ] The health endpoint returns `{"ok":true,"engineVersion":"0.1.0"}`.
- [ ] The web page loads and shows `Engine v0.1.0` (the placeholder text; S1-37 later moves it to the footer as `Engine 0.1.0`).

## Tests
- No new tests. This ticket runs the existing ones.

## Out of scope
- Any code changes (file a ticket instead).
