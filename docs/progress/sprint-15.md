# Sprint 15 progress: view-only access

Tickets: `docs/tickets/sprint-15-view-only/` (the README has Will's decisions). Branch `claude/test-coverage-analysis-6dehbu`, one commit per ticket, each pushed once `bash scripts/check.sh` ends ALL GREEN. **Build order:** S15-00, then S15-01 to S15-04; S15-05 is the tester's.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S15-00 Sprint 14 leftovers | (this commit) | **N1:** `POST /api/family/invites` counts and inserts inside one transaction that first locks the family row (`FOR UPDATE`), so eight requests at once leave exactly five open and three get 409. **N2:** the notes block on a print sheet is a plain `div` with a heading (it was a second labelled `section`, so an empty sheet had two near-identically named landmarks). **N3:** `npm run remove-parent -w @hh/api -- <email>` removes that parent and their sessions in one transaction (family row locked first) and refuses a family's last parent. Tests: API `s15-00-leftovers.test.ts` (2). **Changed expectations:** `s13-sheets` no longer looks for a region named "Notes for Frank"; it expects the heading "Notes" and one region per child sheet |

## Decisions

## Gate counts (each ticket's commit, ALL GREEN)

| Ticket | engine | API | web | db |
|--------|--------|-----|-----|----|
| S15-00 | 437 | 1150 | 1541 | 174 |
