# Sprint 3a progress — fast setup

Tickets: `docs/tickets/sprint-3a-setup/`.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S3a-01 Copy an assignment from the Assignments screen | 251fe43 | `copyOf` on `ScheduleList` adds Copy to the edit form; `initial` prop on `AssignmentForm`; `copyOfAssignment` in `copyAssignment.ts` |
| S3a-02 Copy an assignment from the timeline edit bar | (this commit) | `onCopy` on `EditBar`; `initial` on `AddAssignmentSheet`; same `copyOfAssignment` prefill |

## Decisions (conservative calls on ambiguous points)

- **S3a-01 long titles.** When the title plus " (copy)" would pass 120 characters, the original is cut (trailing space dropped) so the copy still ends " (copy)" and is at most 120, rather than cutting the suffix off.
- **S3a-01 archived originals.** Copy also shows on the edit form of an archived assignment (next to Unarchive); the copy is a normal active assignment. If its subject is archived the form still lists that subject so the copy shows it.
- **S3a-01 where the prefill lives.** `ScheduleList` takes an optional `copyOf` and keeps the draft in state; `FormSlotProps` gained an optional `initial`. Only the Assignments screen passes `copyOf`, so days-off and events are unchanged.
- **S3a-02 after saving a copy.** It behaves exactly like "+ Add assignment" (the sheet closes, the plan refreshes, the selection clears and the new bar flashes) rather than selecting the new bar, since the ticket says "exactly like".
- **S3a-02 button placement.** Copy sits with the end-date steps in the edit bar (the row already wraps on 360 px; buttons keep their 44 px height). The header's "+ Add assignment" always opens an empty form, even after a cancelled copy.
- **S3a-02 existing test.** `timeline-edit-bar.test.tsx` lists the edit controls that must not exist until a bar is selected; "Copy" was added to that list.
