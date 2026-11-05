# Sprint 15 — View-only access

> **Status: approved, after Sprint 14** (Will, 2026-11-05: "the view only should only be able to view the schedule and records. They can adjust the timeframe and child but just can't edit."). One branch for the sprint; PR after its tester passes.

## Decisions
- **Will:** a viewer sees **Schedule** (Week and Year) and **Records** only. They can change the zoom or week, the Records date range, and the child (All children or one). **Nothing can be edited:** no adds, edits, answers, logs, exports that change data, settings or undo.
- **Coordinator's defaults (Will can change):**
  - **A secret link, not a login,** made by a parent in Family settings ("Share a view-only link"), for a grandparent, evaluator or co-op leader. Unguessable (hashed like invites), **lasts until revoked**, several can exist (each with a label such as "Grandma"), each revocable.
  - Viewers can **print sheets and save/print Term in review** (they read data only). **CSV export is included** (also read-only).
  - Hidden from viewers: Home's question card and dot, Family settings, Set up, parents, invites, the setup flow, hints.
  - Search engines are told not to index view pages; no referrer is sent.

Build in order, one commit per ticket, gate ALL GREEN, push after each. Progress in `docs/progress/sprint-15.md`.

| # | Ticket | Size |
|---|--------|------|
| 1 | [S15-01 — View-only links: create, list, revoke](S15-01-view-links.md) | S |
| 2 | [S15-02 — A read-only session that can never write](S15-02-read-only-session.md) | M |
| 3 | [S15-03 — The viewer's Schedule and Records](S15-03-viewer-screens.md) | M |
| 4 | [S15-04 — Docs and smoke](S15-04-docs-and-smoke.md) | XS |
| 5 | [S15-05 — Tester pass](S15-05-tester-pass.md) | S |
