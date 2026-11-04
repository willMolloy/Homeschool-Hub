# S9-07 — Log entries: typed by the parent, never prefilled

**Source:** Will, 2026-11-01 ("log when they can"; hours typed; never prefilled; a log implies a school day)  
**Depends on:** S9-03, S9-04  
**Size:** M

## Goal
A parent logs a day or a run of days for one or more children, typing only the fields their setup tracks.

## Steps
1. Records → "Log": a date or a date range (DateField), the children (one, several or All children), then the setup's fields, all empty: hours and minutes per subject, home/away, notes, books read.
2. **Nothing is prefilled** from the plan or from earlier entries. Subjects are listed from the family's subjects with blank hours.
3. "Count as a school day" switch, on by default and visible on every entry; for a date range, each school-calendar day in it counts (days off excluded), and the entry says how many days it counts.
4. Several children: one entry per child is stored (so each child's record stands alone).
5. Edit and delete entries from the Records list; deletes and edits are undoable (existing undo).
6. Logging never changes the schedule.

## Done when
- A parent logs Mon–Fri for Frank and Margaret with Math 3 h 30 m and Reading 2 h each; each child's record shows 5 school days and those hours; the plan is unchanged.

## Tests
- API: create/edit/delete, range day counting with days off, several children stored separately, no write to plan tables. Web: empty fields on open; switch default; validation (hours 0–24 a day).
