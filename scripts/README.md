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

Tap targets (S5-09): `node flow.mjs tap-targets` signs in, visits This Week, Timeline (a bar selected), Kids, Subjects, Schedule, Assignments, Days off, Events and Settings at 360 px (set `TAP_WIDTH`, e.g. `TAP_WIDTH=320 node flow.mjs tap-targets`, for another width from 280 to 1600), and also opens each screen's Add forms and template panels, an edited row and its Archive/Delete confirm. It lists every visible button, link, input, select, textarea and summary under 44 by 44 px (a checkbox or radio is measured as its label; inline links in a sentence are exempt) and ends with "No undersized controls on the listed screens." or the total. It saves nothing. The demo family cannot add events; set `TAP_EMAIL` and `TAP_PASSWORD` to a non-demo login to measure the event form and its "What changes" list too.

Environment: `SCREENS_DIR` (default `docs/progress/screens`), `CHROME_PATH` (default `/usr/bin/google-chrome`), `BASE_URL` (default `http://localhost:5173`), `PREVIEW_URL` (default `http://localhost:4173`).
Scenarios that add data leave rows in `hh_dev`; `npm run demo` resets it.
