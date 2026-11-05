# Sprint 15 — View-only access

> **Status: approved, after Sprint 14** (Will, 2026-11-05: "the view only should only be able to view the schedule and records. They can adjust the timeframe and child but just can't edit."). One branch for the sprint; PR after its tester passes.

## Decisions
- **Will:** a viewer sees **Schedule** (Week and Year) and **Records** only. They can change the zoom or week, the Records date range, and the child (All children or one). **Nothing can be edited:** no adds, edits, answers, logs, exports that change data, settings or undo.
- **Will (2026-11-05, later):** access **lasts until revoked**; the parent **sends a sign-up link**; parents can create **as many as they like**; useful for **homeschool co-ops**.
- So viewers are **accounts**, not anonymous links: a parent creates a view-only sign-up link in Family settings and sends it; the person signs up (name, email, password) and becomes a **viewer** of that family. Each link is single use (one per person) and an unused link expires after 7 days; the viewer's access lasts until a parent removes it. No cap on links or viewers.
- **One viewer account can view several families** (a co-op leader joins each family's link with the same email) and switches between them from a family picker. A viewer never edits anything in any family.
- **Coordinator's defaults (Will can change):** viewers can **print sheets, export CSV and save/print Term in review** (all read-only); hidden from viewers: Home's question card and dot, Family settings, Set up, parents, invites, the setup flow, hints; search engines are told not to index; no referrer is sent. A parent sees each viewer's name and email and can **Remove** them; a viewer can leave a family themselves.

Build in order, one commit per ticket, gate ALL GREEN, push after each. Progress in `docs/progress/sprint-15.md`.

| # | Ticket | Size |
|---|--------|------|
| 1 | [S15-01 — View-only sign-up links and viewer accounts](S15-01-view-links.md) | M |
| 2 | [S15-02 — A viewer can never write](S15-02-read-only-session.md) | M |
| 3 | [S15-03 — The viewer's Schedule and Records](S15-03-viewer-screens.md) | M |
| 4 | [S15-04 — Docs and smoke](S15-04-docs-and-smoke.md) | XS |
| 5 | [S15-05 — Tester pass](S15-05-tester-pass.md) | S |
