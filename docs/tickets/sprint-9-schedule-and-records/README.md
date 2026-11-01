# Sprint 9 — Schedule and Records: fixing the two main jobs

> **Status: planned, not approved, do not build** (Will, 2026-11-01: "Plan to fix that misunderstanding in the next sprint. Don't start dev yet."). Detailed tickets are written after Will approves this outline and the UX review of the current screens (`docs/design/ux-review-current.md`) is in.

## The correction

Will, 2026-11-01: "I thought the record/csv page was the other main option besides the schedule on the home page. The 'this week' is an optional feature attached to the schedule functionality to keep it updated."

What we built in Sprint 8 read the earlier answer ("Track work/schedule") as *checking in* being the second job. The intended shape is:

- **Home** has two main options: **Schedule** and **Records**.
- **Schedule** is the plan: Week | Year, steering, and the weekly check-in ("Did everything get done?") as an **optional helper** that keeps the plan up to date. It is not its own tab.
- **Records** is the second main job: what was done, as attendance, hours, a book list and a CSV export, generated from the plan plus check-ins with no extra typing.

This moves Records from "optional module" into the core (ROADMAP, "Optional modules" #1) and replaces Track work as a tab.

## Outline (one ticket each; sizes are rough)

| Order | Ticket | What it does | Size |
|-------|--------|--------------|------|
| 1 | S9-01 — Navigation: Home · Schedule · Records | The tab bar becomes Home · Schedule · Records; `/track` redirects to Schedule · Week; Home's two big cards are Schedule and Records. | S |
| 2 | S9-02 — The check-in lives in Schedule | The "How did last week go?" card, Completed ticks and Update status move onto Schedule · Week, above this week's bars; same behaviour as today. | M |
| 3 | S9-03 — Check-in is optional | A setting turns the weekly check-in off; when off, the plan simply assumes work was done and nothing nags. (Open question below.) | S |
| 4 | S9-04 — Records: attendance and hours | A Records page per child (and All children): attendance days (school days minus days off and sick days) and estimated hours by subject, labelled as estimates, for a chosen date range (this term, this year, custom). | M |
| 5 | S9-05 — Records: book list | Books finished (and in progress) per child, from assignments and check-ins. | S |
| 6 | S9-06 — Records: CSV export | One tap exports attendance, hours and books as CSV, with formula-safe cells and the neutral "check your state's requirements" note. | S |
| 7 | S9-07 — Records: printable summary | A term or year summary per child as a print page that saves as PDF. | S |
| 8 | S9-08 — Docs follow the new shape | DESIGN_DIRECTION, APP_OVERVIEW, ROADMAP, LOCAL_TESTING and the mockups say Home · Schedule · Records. | XS |
| 9 | S9-09 — Tester pass | Browser check at phone and laptop widths, both themes; a records total checked by hand against the plan. | S |

Anything the UX review recommends that is small and fits this shape is folded into these tickets; anything bigger becomes its own proposal for Will.

## Open questions for Will (before detailed tickets)

1. **Check-in when it's on:** keep "the card stays until answered", or let a parent dismiss a week ("skip this week")?
2. **Records date ranges:** is "this term / this year / custom dates" enough, or do you want school-year dates stored (the app has none today)?
3. **Hours:** estimated from the plan (minutes a day × days done) is what's planned. Is an estimate OK for DeeDee's records, or do some families need to type actual hours?
4. **Printable summary (S9-07):** in this sprint, or later?

## After this sprint

Accounts and hosting hardening (the old "Sprint 9" scope) becomes Sprint 10.
