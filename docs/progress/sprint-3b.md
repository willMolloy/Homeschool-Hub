# Sprint 3b progress — fixes from the Sprint 3a verification

Tickets: `docs/tickets/sprint-3b-fixes/`.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S3b-01 Show clean messages for bulk and import save errors | 555eec3 | `bulkSaveError` in `formBits.tsx`, used by Add several and Import |
| S3b-02 A copy leaves out archived subjects and children | (this commit) | `copyOfAssignment(a, lookups)` clears an inactive subject and drops inactive children |

## Decisions (conservative calls on ambiguous points)

- **S3b-01 one helper.** `bulkSaveError(err, label)` runs `saveError`, then swaps "Assignment N: " plus an optional "field: " for the label of the Nth item (the on-screen row for Add several, the title for Import). When there is no label it leaves the server's text as it was. `saveError` itself is unchanged, so single-form messages are the same.
- **S3b-02 lookups argument.** `copyOfAssignment` now takes the family's subjects and children. A subject or child counts as usable only when it is in the list and not archived, so the timeline (whose lists leave archived rows out) behaves like the Assignments screen. A cleared subject is `""`, which shows "Choose a subject…".
- **S3b-02 Add form unchanged.** The form's existing allowance for listing the original's archived subject on an edit form stays; a copy never has one selected, so it does not show.
