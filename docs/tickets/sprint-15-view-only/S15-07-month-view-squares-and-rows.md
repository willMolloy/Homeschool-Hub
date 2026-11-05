# S15-07 — Month view: day squares, one row per assignment

**Source:** Will, 2026-11-05: "for monthly or smaller views … little squares for assignments on the day … No connecting string … each assignment gets its own line. It doesn't share lines with another assignment of its own subject."  
**Size:** S

## Goal
At month detail (This month, and any view of about 5 weeks or less that draws daily columns), an assignment shows a block only on the days it has work, with nothing joining the blocks, and every assignment has a row of its own.

## Steps
1. **No connector line** at daily detail: consecutive pieces of an assignment are not joined. A Mon/Wed book shows separate day blocks; a Mon–Fri book stays one solid bar across its school days (weekends and breaks simply have no block). Term and Year zoom keep the connectors as now.
2. **One row per assignment** at daily detail: within a subject lane (per child, and in the Together group), each assignment gets its own row, even when it doesn't overlap another assignment of the same subject. Rows are ordered by start date. Term and Year zoom keep packing non-overlapping assignments into shared rows as now.
3. Blocks keep their effort-based thickness (S10-04) and their names (S10-04b label rules; a name goes on the first block of each run, or outside if it doesn't fit).
4. The badge stays pinned to the lane's first row; lane height grows with the rows.
## Done when
- At This month, a Mon/Wed book shows separate blocks on Mondays and Wednesdays with no line between them; a Mon–Fri book is a steady bar; two History books in sequence sit on two rows; Year and term zoom look as before.
## Tests
- Web: no connectors at daily detail (and still at term/Year); one row per assignment at daily detail (and shared rows at term/Year); labels on runs.
