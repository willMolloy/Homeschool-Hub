# Sprint 15 — View-only access

> **Status: approved, building** (Sprint 14 merged in PR #12). Was: approved, after Sprint 14 (Will, 2026-11-05: "the view only should only be able to view the schedule and records. They can adjust the timeframe and child but just can't edit."). One branch for the sprint; PR after its tester passes.

## Decisions
- **Will:** a viewer sees **Schedule** (Week and Year) and **Records** only. They can change the zoom or week, the Records date range, and the child (All children or one). **Nothing can be edited:** no adds, edits, answers, logs, exports that change data, settings or undo.
- **Will (2026-11-05, later):** access **lasts until revoked**; the parent **sends a sign-up link**; parents can create **as many as they like**; useful for **homeschool co-ops**.
- So viewers are **accounts**, not anonymous links: a parent creates a view-only sign-up link in Family settings and sends it; the person signs up (name, email, password) and becomes a **viewer** of that family. Each link is single use (one per person) and an unused link expires after 7 days; the viewer's access lasts until a parent removes it. No cap on links or viewers.
- **Co-ops (Will, 2026-11-05):** a co-op has **its own account** (set up like a family, with the co-op's classes and events as its schedule) and sends view-only links to member parents, so every parent sees the up-to-date co-op schedule. Parents already have their own family login, so **one login can belong to more than one account**: their own family (as a parent) and the co-op (as a viewer), switched from the family menu. A viewer never edits anything. (Co-op classes appearing inside each family's own plan stays a later idea: ROADMAP "Co-op groups".)
- **Coordinator's defaults (Will can change):** viewers can **print sheets, export CSV and save/print Term in review** (all read-only); hidden from viewers: Home's question card and dot, Family settings, Set up, parents, invites, the setup flow, hints; search engines are told not to index; no referrer is sent. A parent sees each viewer's name and email and can **Remove** them; a viewer can leave a family themselves.

**More decisions (Will, 2026-11-05):** viewers can print sheets, export CSV and save/print Term in review. With one login in several accounts, the app opens the account used last, and the family menu always shows the current account's name ("View only" in a viewed account), with "Switch to {other}".

Build in order, one commit per ticket, gate ALL GREEN, push after each. Progress in `docs/progress/sprint-15.md`.

| # | Ticket | Size |
|---|--------|------|
| 0 | [S15-00 — Sprint 14 leftovers](S15-00-sprint-14-leftovers.md) | XS |
| 1 | [S15-01 — View-only sign-up links and viewer accounts](S15-01-view-links.md) | M |
| 2 | [S15-02 — A viewer can never write](S15-02-read-only-session.md) | M |
| 3 | [S15-03 — The viewer's Schedule and Records](S15-03-viewer-screens.md) | M |
| 4 | [S15-04 — Docs and smoke](S15-04-docs-and-smoke.md) | XS |
| 5 | [S15-06 — Day ranges in whole chapters, lessons and pages](S15-06-whole-unit-ranges.md) (Will, build before the tester) | S |
| 6 | [S15-07 — Month view: day squares, one row per assignment](S15-07-month-view-squares-and-rows.md) (Will, build before the tester) | S |
| 7 | [S15-05 — Tester pass](S15-05-tester-pass.md) | S |
