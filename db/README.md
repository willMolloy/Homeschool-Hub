# db/

Plain SQL migrations, applied in file-name order (`001_init.sql`, `002_...`). Each migration
records itself in `schema_migration`. There is no migration runner yet — that's ticket S1-08.

## Tables (001_init.sql)

| Table | What it is |
|---|---|
| `family` | The household. `week_start` (`mon`/`sun`) is the one definition of a week; `school_days` (0=Sun..6=Sat) |
| `child` | A kid in the family |
| `subject` | Literature, Math, ... (name unique per family, case-insensitive) |
| `assignment` | A book/course with total units, start/end DATE, optional minutes per unit (NULL = estimated default) |
| `assignment_child` | Which kids do an assignment (several rows = shared) |
| `event` | Weekly recurring event (co-op, piano): weekdays, capacity fraction, default rule |
| `event_child` | Kids the event takes time from (no rows = whole family) |
| `event_subject_rule` | Per-subject `skip` / `lighter` / `normal` |
| `blocked_range` + `blocked_range_child` | Vacation/holiday/sick days (no child rows = whole family) |
| `week_override` | "This week do N units", `keepEndDate` / `pushEndDate`. **Added beyond the original table list** so overrides persist |
| `log_entry` | One recorded thing, `kind` = `checkoff` or `session`. `id` is the **client-generated UUID** (no default) |
| `log_child_progress` | Units per child for a log entry. Partial unique index: one `checkoff` per (assignment, date, child) |

Design notes
- Dates are `DATE` (local calendar days). The engine's rate and per-day loads are never stored.
- Every child table carries `family_id` with composite foreign keys, so cross-family references are impossible.
- `log_child_progress` copies `assignment_id`, `log_date`, `kind` from its `log_entry` so the partial unique index can live on it;
  a composite FK with `ON UPDATE CASCADE` keeps the copies in sync.
- `units >= 0` in the DB: a mistake is fixed by editing or deleting the entry, not by a negative row.
  (The engine tolerates negatives anyway.)

## Validate

```bash
# against any EMPTY database you own
DATABASE_URL=postgres://user:pass@localhost:5432/hh_scratch node db/test/validate.cjs
# or with a throwaway embedded Postgres (no install needed)
npm i --prefix /tmp/pgtest embedded-postgres pg
NODE_PATH=/tmp/pgtest/node_modules node db/test/validate.cjs
```

Last validated: PostgreSQL 18.4 (embedded-postgres), 25 behavioural checks, all passed.
Not tested on older versions; it uses only features available since PostgreSQL 13 (`gen_random_uuid()` in core).
