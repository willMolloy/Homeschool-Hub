# S18-02 — Update status lets the parent pick the end date
**Finding:** E2 (Medium): Update status only offers an end date it computes ("Move to Dec 21/22"), which disagrees with the late line's "Move end to Feb 1"; the parent can't choose their own.  
**Size:** S
## Steps
1. Update status offers: **Keep the end date**, **Move the end to {suggested}**, and **Pick a date** (the shared DateField).
2. The suggested date is computed by the **same** function as the briefing's late line, so both say the same date for the same assignment.
## Done when
- After a "fell behind" status, the suggested date equals the late line's; a parent can pick any later date instead.
## Tests
- Web/engine: one shared suggestion function used by both; picking a custom date saves it.
