# Handoff — start here (updated 2026-11-06)

For anyone picking up Homeschool Hub: Will, DeeDee, Grok, or a new Claude session. Read this, then [ROADMAP.md](../ROADMAP.md) and [HOW_WE_WORK.md](../HOW_WE_WORK.md). Older handoff notes are in git history and in each sprint's progress doc.

## 1. Where things stand

- **Everything through Sprint 17 is merged to `main`** (last: PR #15, `3d08e96`). Every sprint had a tester pass (reports in `docs/reviews/`). The core is built: year timeline with effort bars, steering (week adjust, Update status, undo), the completion question and needs-you dot, Records (configurable logging, totals, CSV, print, term in review), first-run setup, printable weekly/daily sheets, the Days view, parent logins and invites, view-only accounts and co-ops, light and dark Soft Paper design.
- **Second end-to-end run done** (`docs/reviews/cm-term-run-2.md`, 2026-11-06): "Nearly — fix E1 to E3 and it's a clear yes." **Next: Sprint 18** (`docs/tickets/sprint-18-e2e-fixes/`).
- **On hold (Will, 2026-11-05):** hosting and the hosting fixes in code. The full plan is ready: [HOSTING_PLAN.md](../HOSTING_PLAN.md).
- **Open Low backlog:** none (ROADMAP "Open backlog (Low)").

## 2. The finish line

ROADMAP phases: (1) build the core ✔ nearly → (2) private hosting for DeeDee → (3) DeeDee's real spring term from January 2027 → (4) friends beta (3–6 invited families, ~March 2027) → (5) decide on going public using the go-public signals in ROADMAP.

"Finished" for now means **phase 2 done: DeeDee uses the hosted app on her phone, and one backup restore has been tested.**

## 3. Next steps, in order

1. **End-to-end run results.** Read `docs/reviews/cm-term-run-2.md`. **Done 2026-11-06:** 38 Works, 4 Confusing, 1 Broken of 43; verdict "Nearly". The fix sprint is written and ready to build: `docs/tickets/sprint-18-e2e-fixes/` (E1–E3 Medium first: Update status undo and pick-your-own end date, Bars agreeing with Days; then the Lows).
2. **Hosting fixes in code sprint** (HOSTING_PLAN §4): health live/ready, graceful shutdown, migration advisory lock, proxy-aware throttle, production build + Dockerfile (`HOST=0.0.0.0`), security headers. No AWS needed. Tester pass. *Only when Will says hosting is a go.*
3. **Decisions with DeeDee** (HOSTING_PLAN §10): H1 host (recommended AWS App Runner + RDS + S3/CloudFront), H2 sessions (keep server-side Postgres sessions), H3 time-zone fallback (keep America/Chicago), domain, region.
4. **Terraform** in `infra/` (HOSTING_PLAN §3, §5): `terraform plan` only, reviewed by Will.
5. **First deploy, with Will at the keyboard** (HOSTING_PLAN §6): apply, push the image, run migrations as a one-off task, upload the web build. Agents never deploy on their own (HOW_WE_WORK).
6. **Smoke test on the host and the restore test** (HOSTING_PLAN §9). Record the real restore time in `docs/reviews/`.
7. **Invite DeeDee:** `npm run create-family-invite -w @hh/api` (against the hosted database), send her the link by hand.
8. **Phase 3:** DeeDee's spring term; a 15-minute weekly review; fix what blocks her.
9. **After hosting:** the calendar feed (ROADMAP "Order of work", item 6), CI deploys, then the friends beta.
10. **Later, only with feedback:** curriculum import, "smooth this month", optional daily checklist, co-op classes inside family plans (ROADMAP "Optional modules").

## 4. How the work is driven (the loop that built Sprints 1–17)

- **Roles:** a coordinator (writes tickets, reviews, talks to Will), a **developer** agent, and a separate **tester** agent. Will (and DeeDee) approve scope and merge PRs; agents never merge.
- **Tickets:** one folder per sprint in `docs/tickets/sprint-NN-name/`, a README with Will's decisions and the build order, one small file per ticket (Goal, Steps, Done when, Tests). Keep them simple and testable.
- **Building:** one commit per ticket; before every commit `bash scripts/check.sh` must end **ALL GREEN** (lint, typecheck, build, engine tests in 7 time zones, API, web, db). Progress goes in `docs/progress/sprint-NN.md` with decisions and any changed test expectations. **Push after every ticket** so anyone can pick up.
- **Branches:** one branch per sprint off `main` (HOW_WE_WORK "Branches", DeeDee's rule); a draft PR while building, marked ready only after the tester passes.
- **Testing:** the tester works in a real browser (Playwright's Chromium) at 320/360/390/1280 px in light and dark, runs `scripts/smoke` scenarios (set `CHROME_PATH` to Playwright's Chromium), axe and the tap-target script, and writes `docs/reviews/sprint-NN-verification.md` (verdict, pass/fail per ticket, findings N1.. with severity). High/Medium findings get a fix ticket and a re-test before merge.
- **Gotchas learned the hard way:**
  - Database tests must not depend on text sort order (CI's Postgres uses en_US collation, local uses C). Order by ids or use `COLLATE "C"`.
  - Smoke scenarios must not leave files in the repo.
  - The sign-in throttle (10/min) trips scripted walks; sign in once per person.
  - Agents hit usage limits; resume from the last pushed commit.
- **Never:** force-push, skip or disable a test to get green, commit secrets, contact anyone, host or tunnel anything without DeeDee's approval.

## 5. Running it locally

From scratch: `docs/LOCAL_TESTING.md` (and REVIEW-GUIDE §1). Short version: Node 20, Docker Desktop, then `docker compose up -d db`, `cp .env.example .env` (set `SESSION_SECRET`), `npm ci`, `npm run demo`, open http://localhost:5173, sign in `demo@example.com` / `demo-password`.

Useful commands:

| What | Command |
|---|---|
| Full gate | `bash scripts/check.sh` |
| Demo family (resets `hh_dev`) | `npm run demo` |
| Realistic CM family (dev DBs only) | `npm run e2e:seed` (`-- --reset`) |
| New family invite link | `npm run create-family-invite -w @hh/api` |
| Reset a parent's password | `npm run set-parent-login -w @hh/api` |
| Remove a parent | `npm run remove-parent -w @hh/api -- <email>` |
| A smoke scenario | `cd scripts/smoke && CHROME_PATH=… node flow.mjs <scenario>` |

## 6. Where to find things

| Need | File |
|---|---|
| Plan, order of work, decisions | `docs/ROADMAP.md`, `docs/progress/decisions-2026-11-04.md` |
| Product and design rules | `docs/APP_OVERVIEW.md`, `docs/DESIGN_DIRECTION.md`, `docs/spec/SPEC.md` |
| How we work, branches, rules | `docs/HOW_WE_WORK.md` |
| Hosting | `docs/HOSTING_PLAN.md` |
| Each sprint's tickets / progress / tester report | `docs/tickets/sprint-NN-*/`, `docs/progress/sprint-NN.md`, `docs/reviews/sprint-NN-verification.md` |
| End-to-end runs | `docs/e2e/cm-term-run-2.md`, `docs/reviews/cm-term-run.md`, `docs/reviews/cm-term-run-2.md` |
| Design mockups and UX reviews | `docs/design/` |

## 7. Open decisions

- **For hosting:** H1–H3, domain, region (HOSTING_PLAN §10).
- **Before going public:** working name, pricing, signup and password-reset email, kid logins and COPPA, which states get helpers first (ROADMAP "Open decisions for DeeDee").
- **Small product questions left open:** whether "Days attended" / "Days and hours" term cards need more presence (Sprint 16 note N14); whether a day that finishes one chapter and starts the next should also show the next chapter's start (Sprint 16 note N15).
