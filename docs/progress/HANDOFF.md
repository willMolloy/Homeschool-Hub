# Handoff — start here (updated 2026-11-11, Sprints 19–21 ticketed)

For anyone picking up Homeschool Hub: Will, DeeDee, Grok, or a new Claude session. Read this, then [ROADMAP.md](../ROADMAP.md) and [HOW_WE_WORK.md](../HOW_WE_WORK.md). Older handoff notes are in git history and in each sprint's progress doc.

## 1. Where things stand

- **Everything through Sprint 18 is merged to `main`** (last: PR #17, `75086dd`). Every sprint had a tester pass (reports in `docs/reviews/`). The core is built: year timeline with effort bars, steering (week adjust, Update status, undo), the completion question and needs-you dot, Records (configurable logging, totals, CSV, print, term in review), first-run setup, printable weekly/daily sheets, the Days view, parent logins and invites, view-only accounts and co-ops, light and dark Soft Paper design.
- **Sprint 18 is on `main`.** DeeDee explicitly chose merge first, with the tester at 0 High / 2 Medium / 3 Low. The report is `docs/reviews/sprint-18-verification.md` and the same text again at `docs/reviews/pr17-verification.md`. She decided both Mediums on 2026-11-06. The tickets are `docs/tickets/sprint-18b-follow-ups/`. Neither is built.
  - **S18b-01, decided.** Pick a date may be before today. Saving a past date requires an explicit confirmation ("That's before today; this ends the book now. Continue?"). A minimum of today was the provisional idea and is not the decision.
  - **S18b-02, decided.** An assignment uses the same school days for everyone on it. A child who needs different days gets their own assignment: a separate workbook with its own schedule and daily flow. Readings on those copies need not stay aligned day to day. This is that separate workbook. It is not a per-child school-days planner. The same ticket specifies a usability follow-up, also not built: make copying a book, and updating the other copies, clearer and easier. The tester's evidence (four duplicated books, split page ranges, duplicated updates, a shared Mon–Thu book adding Monday for a Tue–Fri child) is in the ticket.
- **Sprints 19, 20 and 21 are decided and not built** (DeeDee, 2026-11-11, after she used the app on current main). The note is [decisions-2026-11-11.md](decisions-2026-11-11.md). Tickets: `docs/tickets/sprint-19-visual-print/`, `docs/tickets/sprint-20-minutes-check-in/`, `docs/tickets/sprint-21-break-overlap/`. A few unlabeled details have defaults in the tickets. Those defaults are not open questions.
  - **Sprint 19, visual and print.** The date picker stays on screen, including in the right-hand assignment panel. Home's Records card matches the Schedule card. Log looks like an action, not a selected tab. Bar thickness shows a light day against a heavy day, and bars are a little more opaque, not solid. The weekly print is grouped by day. The school's regular weekly days off are not drawn on the year view and have no label; they show only at a month zoom or closer. A break of a week or longer still shows its name on the year view.
  - **Sprint 20, minutes, check-in, and logging.** A minutes assignment asks only for minutes a day and the dates. "Got through" opens on the last unit the week already shows, and ahead or behind does not change that number. A pending last-week check-in is obvious on Home and stays optional. Logging styles explain themselves with a live sample. Books read leaves the log; term in review borrows finished books from the schedule. A log entry starts as one day.
  - **Sprint 21, a break that overlaps work.** Adding a break over open assignments asks, for each one, whether to keep the end date, push it back by the break, or push it to a day she picks. Partial overlap counts, finished work stays put, and one undo reverses the break and the moves. This is not a silent reschedule.
- **On hold (Will, 2026-11-05):** hosting and the hosting fixes in code. The full plan is ready: [HOSTING_PLAN.md](../HOSTING_PLAN.md). Sprint 18b and Sprints 19–21 do not block it, and the recommended order is to build them first. Hosting still waits until Will says go.
- **Open Low backlog:** none open (ROADMAP "Open backlog (Low)"). Sprint 18's three Lows stay in the verification report and were not opened as tickets.

## 2. The finish line

ROADMAP phases: (1) build the core ✔ nearly → (2) private hosting for DeeDee → (3) DeeDee's real spring term from January 2027 → (4) friends beta (3–6 invited families, ~March 2027) → (5) decide on going public using the go-public signals in ROADMAP.

"Finished" for now means **phase 2 done: DeeDee uses the hosted app on her phone, and one backup restore has been tested.**

## 3. Next steps, in order

1. **Sprint 18 is merged** (PR #17, `75086dd`). The second end-to-end run is `docs/reviews/cm-term-run-2.md` (38 Works, 4 Confusing, 1 Broken of 43; verdict "Nearly"). DeeDee chose merge first with the tester at 0 High / 2 Medium / 3 Low. The three Lows are in the report only.
2. **Sprint 18b, still unbuilt, its own sprint.** `docs/tickets/sprint-18b-follow-ups/`: S18b-01 (a past Pick a date stays allowed and asks for confirmation) and S18b-02 (one set of school days on a shared book; a different schedule is a separate workbook, with a usability follow-up for copies). Decided 2026-11-06. Do not rewrite these tickets or fold them into Sprints 19–21.
3. **Sprint 19 — visual and print** (`docs/tickets/sprint-19-visual-print/`). Date picker on screen, matching Home cards, Log as an action, bar thickness and a slightly stronger fill, weekly print by day. Regular weekly days off stay off the year view and unlabeled; a week-long break still shows its name. Decided 2026-11-11. Not built.
4. **Sprint 20 — minutes, check-in, and logging** (`docs/tickets/sprint-20-minutes-check-in/`). Minutes a day with no total, got-through left alone, a visible optional check-in, logging styles with a sample, books read removed, a log that starts as one day. Not built.
5. **Sprint 21 — breaks that overlap assignments** (`docs/tickets/sprint-21-break-overlap/`). Ask, per overlapping assignment, whether to keep the end date, push it back by the break, or push it to a chosen day. Not built.
6. **Hosting fixes in code sprint** (HOSTING_PLAN §4): health live/ready, graceful shutdown, migration advisory lock, proxy-aware throttle, production build + Dockerfile (`HOST=0.0.0.0`), security headers. No AWS needed. Tester pass. *Only when Will says hosting is a go.* Sprint 18b and Sprints 19–21 do not block this. The recommended order is still to build them first.
7. **Decisions with DeeDee** (HOSTING_PLAN §10): H1 host (recommended AWS App Runner + RDS + S3/CloudFront), H2 sessions (keep server-side Postgres sessions), H3 time-zone fallback (keep America/Chicago), domain, region.
8. **Terraform** in `infra/` (HOSTING_PLAN §3, §5): `terraform plan` only, reviewed by Will.
9. **First deploy, with Will at the keyboard** (HOSTING_PLAN §6): apply, push the image, run migrations as a one-off task, upload the web build. Agents never deploy on their own (HOW_WE_WORK).
10. **Smoke test on the host and the restore test** (HOSTING_PLAN §9). Record the real restore time in `docs/reviews/`.
11. **Invite DeeDee:** `npm run create-family-invite -w @hh/api` (against the hosted database), send her the link by hand.
12. **Phase 3:** DeeDee's spring term; a 15-minute weekly review; fix what blocks her.
13. **After hosting:** the calendar feed (ROADMAP "Order of work"), CI deploys, then the friends beta.
14. **Later, only with feedback:** curriculum import, "smooth this month", optional daily checklist, co-op classes inside family plans (ROADMAP "Optional modules").

## 4. How the work is driven (the loop that built Sprints 1–18)

- **Roles:** a coordinator (writes tickets, reviews, talks to Will), a **developer** agent, and a separate **tester** agent. Will (and DeeDee) approve scope and merge PRs; agents never merge.
- **Tickets:** one folder per sprint in `docs/tickets/sprint-NN-name/`, a README with the decisions and the build order, one small file per ticket (Goal, Steps, Done when, Tests). Keep them simple and testable.
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
| Plan, order of work, decisions | `docs/ROADMAP.md`, `docs/progress/decisions-2026-11-11.md`, `docs/progress/decisions-2026-11-04.md` |
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
- **Decided 2026-11-06, not built** (ROADMAP "Decided after Sprint 18"): a past Pick a date stays allowed and needs an explicit confirmation (S18b-01); a shared book uses one set of school days, and a different schedule is a separate workbook whose readings need not stay aligned (S18b-02). No choice on either is still open. Build this folder on its own, before Sprint 19.
- **Decided 2026-11-11, not built** (ROADMAP "Decided 2026-11-11", [decisions-2026-11-11.md](decisions-2026-11-11.md)): Sprints 19, 20 and 21, in that order after 18b. No product question from that session is still open. Defaults for a few labels and thresholds are written in the tickets and are not blockers.
