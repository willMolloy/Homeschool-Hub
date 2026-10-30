# Sprint 3a progress — fast setup

Tickets: `docs/tickets/sprint-3a-setup/`.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S3a-01 Copy an assignment from the Assignments screen | (this commit) | `copyOf` on `ScheduleList` adds Copy to the edit form; `initial` prop on `AssignmentForm`; `copyOfAssignment` in `copyAssignment.ts` |

## Decisions (conservative calls on ambiguous points)

- **S3a-01 long titles.** When the title plus " (copy)" would pass 120 characters, the original is cut (trailing space dropped) so the copy still ends " (copy)" and is at most 120, rather than cutting the suffix off.
- **S3a-01 archived originals.** Copy also shows on the edit form of an archived assignment (next to Unarchive); the copy is a normal active assignment. If its subject is archived the form still lists that subject so the copy shows it.
- **S3a-01 where the prefill lives.** `ScheduleList` takes an optional `copyOf` and keeps the draft in state; `FormSlotProps` gained an optional `initial`. Only the Assignments screen passes `copyOf`, so days-off and events are unchanged.
