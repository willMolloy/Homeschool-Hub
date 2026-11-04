# S12-02 — Which assignments are waiting for an answer
**Size:** S
## Goal
One rule decides when to ask: an assignment that is not archived, has no `ended_as`, and whose stored end date is before today (in the family's time zone).
## Steps
1. A shared helper (web, from the assignments list) returns the waiting assignments, oldest end first.
2. One question per assignment, naming every child on it ("Did Frank and Margaret finish History spine?"). Children's names are joined in plain English ("Frank, Margaret and Leo").
3. Assignments whose end is moved later stop waiting until the new end passes.
## Done when
- The demo family (with a past end date seeded) has exactly the expected waiting list.
## Tests
- Web: the rule (today, yesterday, archived, already answered, moved end, time zone).
