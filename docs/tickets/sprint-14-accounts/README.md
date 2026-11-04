# Sprint 14 — Accounts, and undo for Add several and CSV import

> **Status: approved** (Will, 2026-11-05: "Let's hold off on hosting but we can do accounts"; "Undo add several can be done here as well"). Starts after Sprint 13's PR merges. One branch for the sprint; PR after its tester passes. The hosting fixes in code (health check, shutdown, migration lock, proxy-aware throttle) are **on hold with hosting**.

## Decisions (coordinator's recommendations, accepted by Will, 2026-11-05)
1. **Who creates family invites:** only Will and DeeDee, with a command (no admin screen yet).
2. **Existing logins:** each family's current login becomes its first parent, so every existing sign-in keeps working.
3. **The second parent:** invited from Family settings ("Invite another parent"), by link.
4. **Sessions:** a sign-in lasts 30 days on that device.
5. **Removing a parent:** not in the app for now; equal rights; Will or DeeDee can do it with a command.
- Invite links are single-use and expire after **7 days**. No email provider: links are shared by hand; password resets stay manual (CLI).

Build in order, one commit per ticket, gate ALL GREEN, push after each. Progress in `docs/progress/sprint-14.md`.

| # | Ticket | Size |
|---|--------|------|
| 1 | [S14-01 — Parents get their own logins](S14-01-parent-logins.md) | M |
| 2 | [S14-02 — Family invites (command) and the join page](S14-02-family-invites.md) | M |
| 3 | [S14-03 — Invite another parent](S14-03-invite-another-parent.md) | S |
| 4 | [S14-04 — 30-day sessions and sign-in tidy-up](S14-04-sessions.md) | S |
| 5 | [S14-05 — Undo for Add several and CSV import](S14-05-undo-add-several-and-import.md) | S |
| 6 | [S14-06 — Docs and smoke scenarios](S14-06-docs-and-smoke.md) | XS |
| 7 | [S14-07 — Tester pass](S14-07-tester-pass.md) | S |
