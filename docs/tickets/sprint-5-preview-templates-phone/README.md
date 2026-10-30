# Sprint 5 — Event preview, calendar templates and the phone pass

> **Status: proposed, not started** (2026-10-30). Contents chosen by Will on 2026-10-30. **Approval to build:** _none yet_ (Will or DeeDee, recorded here). Starts after Sprint 4.

**Source:** ROADMAP.md core checklist: "Preview before saving an event" (Steering), "Calendar templates for the year's shape" (Fast setup), "Phone finishing pass" (The map).

Each ticket uses the usual format. Build them in order, one commit per ticket, each with `bash scripts/check.sh` green. Progress goes in `docs/progress/sprint-5.md`.

## Order and dependencies

| Order | Ticket | Depends on | Size |
|-------|--------|------------|------|
| 1 | [S5-01 — Add the event preview endpoint](S5-01-add-the-event-preview-endpoint.md) | none | M |
| 2 | [S5-02 — Show the plan change before saving an event](S5-02-show-the-plan-change-before-saving-an-event.md) | S5-01 | M |
| 3 | [S5-03 — Add year-shape helpers: holidays and on/off patterns](S5-03-add-year-shape-helpers.md) | none | S |
| 4 | [S5-04 — Add the bulk-create days off endpoint](S5-04-add-the-bulk-create-days-off-endpoint.md) | none | S |
| 5 | [S5-05 — Apply a calendar template from Days off](S5-05-apply-a-calendar-template.md) | S5-03, S5-04 | M |
| 6 | [S5-06 — Store saved calendar templates](S5-06-store-saved-calendar-templates.md) | none | S |
| 7 | [S5-07 — Save this year as a template, and reuse it](S5-07-save-this-year-as-a-template.md) | S5-05, S5-06 | M |
| 8 | [S5-08 — A compact edit bar on phones](S5-08-a-compact-edit-bar-on-phones.md) | none | S |
| 9 | [S5-09 — 44 px tap targets on every core screen](S5-09-44-px-tap-targets-on-every-core-screen.md) | S5-08 | M |
| 10 | [S5-10 — Tester pass: preview, templates and phone](S5-10-tester-pass.md) | S5-01 to S5-09 | S |
