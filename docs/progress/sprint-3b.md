# Sprint 3b progress — fixes from the Sprint 3a verification

Tickets: `docs/tickets/sprint-3b-fixes/`.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S3b-01 Show clean messages for bulk and import save errors | (this commit) | `bulkSaveError` in `formBits.tsx`, used by Add several and Import |

## Decisions (conservative calls on ambiguous points)

- **S3b-01 one helper.** `bulkSaveError(err, label)` runs `saveError`, then swaps "Assignment N: " plus an optional "field: " for the label of the Nth item (the on-screen row for Add several, the title for Import). When there is no label it leaves the server's text as it was. `saveError` itself is unchanged, so single-form messages are the same.
