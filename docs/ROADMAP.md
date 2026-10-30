# Roadmap

DeeDee approves what gets built. The MVP plan below was agreed on 2026-10-30. It replaces the old "Next (optional)" list. The same day, DeeDee moved the MVP work ahead of hosting. Anything outside this plan still needs approval before it starts.

## The plan, in order

1. **Finish the MVP** (checklist below), developed and tested locally.
2. **Private hosting**, once DeeDee is ready to use the app on her phone during real school weeks. It is for DeeDee only, and nobody else gets the link. It must be done before step 3.
3. **Share with a few families**, only after every MVP box is checked and the private hosting has run for real weeks. These can be friends from co-op, invited by DeeDee when she's ready. Agents contact no one (HOW_WE_WORK.md, "Rules").
4. **Polish and post-MVP work**, guided by what those families struggle with.

## 1. MVP checklist

**The test:** a co-op friend can set up their whole year and use it for a week without DeeDee sitting next to them.

- [ ] **Self-serve signup and password reset.** Today families are created with a CLI (`set-family-login`), so nobody else can start alone.
- [ ] **Undo or reset a bad change.** A parent can undo a change to a bar and reset an assignment to how it was. A messed-up plan in week one breaks trust as badly as lost data.
- [ ] **Fast setup.** The minimum is bulk-add and copy-assignment, with CSV import close behind. Curriculum templates come later if they slip.
- [ ] **The core loop works end to end:** plan the year, see it on the timeline, adjust the week, check in.
- [ ] **Phone usability:** a compact edit bar and 44 px tap targets.
- [ ] **Data safety:** automated backups, and one restore tested from start to finish. This is built with the hosting step, and must be checked before step 3.

## 2. Private hosting

The deployment gaps from the 2026-10-30 review belong to this ticket set, not separate work:

- **Health check.** `/api/health` always returns 200, even when the database is down. Split it into liveness (the process is up) and readiness (the database answers), so a load balancer stops sending traffic to a broken instance.
- **Login throttle behind a proxy.** The throttle is per IP and the proxy isn't trusted (`reviews/developer-review.md` L12). Behind a load balancer every user shares one IP, so one person's failed logins would block everyone.
- **Migration race.** The runner has no lock (L16). Two instances starting together can both run migrations. Take a Postgres advisory lock, or run migrations as a separate one-off step.
- **Graceful shutdown.** There is none (L19). On SIGTERM, stop taking requests, finish the ones in flight, then close the pool.
- **A production start.** The API runs through `tsx` and the repo has no container or deploy config. Add a production build and start, secrets from the host (never committed), HTTPS, and the `secure` cookie flag on.
- **Backups**, with one restore actually tested (see the MVP checklist).

## Not in the MVP

- AA contrast for inside names on dimmed bars (45 of 240 safe-palette combinations fail, T-11d).
- An even drag preview.
- T-07b manual zoom: pinch, ctrl+wheel and pan (`tickets/timeline/README.md`).
- More label and layout polish.
- A tester verification of the timeline sprint, like `reviews/sprint-2b-verification.md`. Worth doing before step 3; DeeDee decides.
- Later phases from the spec (`spec/SPEC.md`). v1 is web and PWA only ("v1 engineering decisions", item 7), and the whole hub list is backlog:
  - **Logging and export:** one-tap check-off, quick add, logging once for several kids, progress filling the bars, hour and attendance totals, and export. CSV export is free and PDF records are on the Family plan. Every total and export carries the neutral records note, and nothing claims to meet a state's requirements ("Low-friction logging").
  - **Paywall:** Free is the full timeline for one child, including logging, attendance and CSV export. Family ($5.99/mo or $49/yr) adds unlimited children, shared assignments, the family load view, PDF records and a portfolio. There is an optional founding offer at $39/yr for life for the first 500 ("Free vs premium").
  - **First in line after v1** (the "MVP" rows): attendance, auto-shift after missed days, a Today view per child, lesson-level plans, printed daily or weekly plans, a reading log and the privacy baseline (CSV import moved into the MVP's fast setup) ("Hub features").
  - **Family plan features (v1.x premium):** grades and transcripts, kid logins, co-teacher access, portfolio, state record-keeping helpers, curriculum templates beyond the MVP's fast setup (including Ambleside, Memoria Press and an Orthodox overlay), calendar sync, email digests, school-year rollover, and "smooth this month".
  - **Later:** native app with full offline mode, curriculum budget and ESA report, library due dates, co-op groups, importers, household items and sharing templates.
  - **Payments and billing**, only after live testing.

## Done

Commit hashes and notes are in each progress doc.

| Work | Last commit | Where |
|---|---|---|
| Sprint 1: monorepo, engine, schema, login, kids and subjects, plan endpoint (S1-01 to S1-37) | e499c5f | `progress/overnight.md`, `tickets/sprint-1/` |
| Sprint 2a: schedule data (family settings, assignments, days off, recurring events, forms, `npm run demo`) | 1e27062 | `tickets/sprint-2a/` |
| Review fixes RF-01 to RF-12 | 24172fc | `tickets/review-fixes/`, `reviews/review-fixes-verification.md` |
| Sprint 2b: effort weights, assumed progress, weekly check-ins (S2b-01 to S2b-38) | e9d9aad | `progress/sprint-2b.md` |
| Sprint 2c: fixes from the Sprint 2b verification (S2c-01 to S2c-06) | 6346256 | `progress/sprint-2c.md` |

The timeline tickets, in `progress/timeline.md`:

| Ticket | Commit |
|---|---|
| T-01 design tokens · T-01b colour-blind-safe palette | 9df15da · a58731e |
| T-02 view model · T-02b hand-test fixes | 13209a6 · 2282106 |
| T-03 layout · T-03b This Week "Make an adjustment" | a0a1a77 · a8a43a0, f04a4f5 |
| T-04 static SVG timeline | ed51f34 |
| T-05 zoom presets · T-05b All subjects bar · T-05c calm detail and This month | db0db98 · 8891fb4 · 7ecc308 |
| T-06 names inside bars | aa34054 |
| T-07 adjust sheet · T-07c child filter · T-07d demo seed · T-07e edit bar · T-07f month rows | 21158b1 · b24ba30 · 4bb9262 · e998596 · 9dad6cc |
| T-08 drag a bar · T-08b polish · T-08c bar opacity | 7283bf4 · d9777f1 · 31e6a0b |
| T-09 "How did last week go?" redesign | ea9ed8c |
| T-10 add assignment from the timeline · T-10b label overlap | ae916f3 · cd8f104 |
| T-11 gaps, connectors, a name in every piece · T-11b · T-11c names on the bar | 7927305 · 448dc73 · 328cd1d |
| T-11d names above thin bars (+ fix) | d19dd73, e03fd0c |
| T-11e outside names closer to their bars (+ fix) | 3faeab8, c601581 |

## Open decisions waiting on DeeDee

### New, for the MVP and hosting

- **How far undo goes:** the last change only, or a short history per assignment. This is needed for the MVP.
- **How password-reset emails are sent.** Reset needs an email provider.
- **Where to host and the monthly budget.** Nothing is chosen yet; this is needed before step 2.
- Items 4 (time-zone fallback) and 8 (sessions) below become more pressing once the app is hosted.

### From earlier

Items 1 to 10 are recorded in `progress/overnight.md` ("Decisions for DeeDee"). They were re-checked on 2026-10-30 against `spec/SPEC.md` and the progress docs. An item is marked settled only when one of those settles it, with a citation.

1. **Week-override mode rule** (last edit or latest week). This blocks the week-overrides API (`tickets/sprint-2a/README.md`). The engine currently uses the last edit (`packages/engine/src/placement.ts`), but DeeDee hasn't confirmed it and the spec doesn't say, so it stays open.
2. **Removal:** days off are hard-deleted; assignments and events are archive-only. Is that OK?
3. **Rules for archived subjects and children** in events.
4. **Time-zone fallback** (America/Chicago) and the accepted formats.
5. ~~**Strictness**~~ **Settled:** every route rejects unknown body fields (RF-09, `tickets/review-fixes/RF-09-reject-unknown-body-fields-everywhere.md`).
6. **Field and range limits** (titles, totals, days).
7. **Which events and days off reach the plan**, and how warnings name things.
8. **Sessions:** sign the cookie or drop `SESSION_SECRET`. Should we add expired-session cleanup and a login throttle? (`reviews/developer-review.md` L14)
9. **Name policy:** UTF-16 length, and which control characters are allowed.
10. **Sign-off on the earlier stack deviations** listed there.

### Open questions from the spec

These are from `spec/SPEC.md`, "Open questions for DeeDee".

- ~~Default minutes per unit for chapters~~ **Superseded:** thickness now comes from effort weights (S2b-01, S2b-02, `progress/sprint-2b.md`).
- Which states get record-keeping helpers first.
- Orthodox overlay: New Calendar, Old Calendar or both, and whether fasts affect anything.
- Whether the founding offer is worth it, and whether transcripts belong in Family or are a separate upsell.
- Kid logins under 13 (COPPA): parent-managed profiles only at first?
- School year: fixed Aug–Jun, year-round, or terms the family defines.
- Working name for the app.
