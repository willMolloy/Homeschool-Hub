# scripts

## `check.sh`: the full gate
Run before every commit (`npm run check` does the same):

```bash
scripts/check.sh
```

Runs lint, typecheck, build, `db:reset`, test, test:tz and `db:validate`, stopping at the first failure with the tail of the log (full log: `$CHECK_LOG`, default `/tmp/hh-check.log`). It needs Postgres 16 and `DATABASE_URL` pointing at a `*_test` database (default `postgres://hh:hh@localhost:5432/hh_test`). That database is reset, and its role must be able to create the scratch database `hh_validate_test` that `db:validate` makes and drops.

CI (`.github/workflows/ci.yml`) runs the same steps.

## `smoke/`: browser smoke runs
Puppeteer scenarios that click through the running app and save screenshots to `docs/progress/screens`. This folder is **not** an npm workspace, so the app's install never pulls a browser driver.

```bash
cd scripts/smoke && npm install          # once
npm run demo                             # (repo root, another terminal) API + web dev servers on hh_dev
node flow.mjs login                      # runs scenarios/login.mjs
node shot.mjs http://localhost:5173/login /tmp/login.png 360
node manifest-check.mjs                  # PWA check against `npm run preview -w @hh/web` (port 4173)
```

Tap targets (S5-09): `node flow.mjs tap-targets` signs in, visits Home, Track work, Schedule (Week, and Year with a bar selected), Set up, Children, Subjects, Assignments, Days off, Events and Family settings at 360 px (set `TAP_WIDTH`, e.g. `TAP_WIDTH=320 node flow.mjs tap-targets`, for another width from 280 to 1600), and also opens each screen's Add forms and template panels (Assignments' two Copy panels included), the timeline's Zoom views sheet, an edited row and its Archive/Delete confirm. It lists every visible button, link, input, select, textarea and summary under 44 by 44 px (a checkbox or radio is measured as its label; inline links in a sentence are exempt) and ends with "No undersized controls on the listed screens." or the total. It saves nothing. The demo family cannot add events; set `TAP_EMAIL` and `TAP_PASSWORD` to a non-demo login to measure the event form and its "What changes" list too.

**Scenarios on the Soft Paper screens (S8b-06).** Every scenario in `smoke/scenarios/` runs against the dev servers (`npm run demo`, 127.0.0.1). Routes follow Sprint 8 (`/setup/...`, `/schedule?view=week|year`, `/track`; the plan table needs `&debug=1`) and Sign out is the `signOut()` helper (the family button on Home). `track.mjs` covers Home, Track work, Update status and the child switch (read-only). Scenarios that write need a family that is not the demo one, and two scenarios need an empty family: seed both once per `npm run demo` with
```bash
DATABASE_URL=postgres://hh:hh@localhost:5432/hh_dev npx tsx scripts/smoke/seed-second-family.ts
SMOKE_EMAIL=smoke@example.com node flow.mjs s2a-16-events      # also s2a-hardening, axe-2a, s2a-13-settings, s2a-17
```
`kids-list` and `subjects-list` log in as `empty@example.com` (same demo password). Retired in S8b-06: `peek`, `tester-probe` (one-off probes of the old Plan page), `s2b-screens` (the weekly check-in card is gone; `track.mjs` replaces it), `tester-odd` and `tester2-odd` (they need hand-seeded odd-data families that are not in the repo; the API side is covered by `apps/api/test/tester2.schedule.test.ts`).

Environment: `SCREENS_DIR` (default `docs/progress/screens`), `CHROME_PATH` (default `/usr/bin/google-chrome`), `BASE_URL` (default `http://localhost:5173`), `PREVIEW_URL` (default `http://localhost:4173`).
Scenarios that add data leave rows in `hh_dev`; `npm run demo` resets it.
