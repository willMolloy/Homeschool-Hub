# Handoff (updated 2026-11-05)

## Done: Sprint 11 + 11b, first run (merged in PR #8, `fc8a510`)

- Setup flow for new families at `/welcome`, three one-time Schedule hints, Set up → School year, and Home's checklist hidden per family. Migrations 019–023 (run `db/migrate.ts`).
- Tester: first pass NOT READY (N1, N2 Medium), fixed in 11b; re-test **READY** (`docs/reviews/sprint-11-verification.md`). Open Lows N7–N9 are carried into Sprint 12 (S12-09).
- Progress and decisions: `docs/progress/sprint-11.md`. Tickets: `docs/tickets/sprint-11-first-run/`, `docs/tickets/sprint-11b-fixes/`.

## Build status: Sprint 12 (see `sprint-12.md`)

S12-01 to S12-07 are built and pushed on `claude/test-coverage-analysis-6dehbu` (migration 024, engine 0.13.0). S12-09 and the S12-08 tester pass follow.

## Next: Sprint 12

- Tickets: `docs/tickets/sprint-12-completion/` (the completion question, the needs-you dot, and S12-09 for the Sprint 11 Lows). Claude's developer builds it on `claude/test-coverage-analysis-6dehbu`, committing and pushing after every ticket; the PR to `main` comes after its tester passes.
- **Open Low items:** see ROADMAP, "Open backlog (Low)".
- **Order after it:** Sprint 12 completion question + needs-you dot, Sprint 13 printable sheets + term in review, Sprint 14 accounts and hosting fixes (ROADMAP, "Order of work after Sprint 10"; `docs/progress/decisions-2026-11-04.md`).


Where Homeschool Hub stands, for whoever picks it up next (Product Owner, Developer or Tester).

## State

- **Sprint 10b is merged to `main`:** [PR #6](https://github.com/willMolloy/Homeschool-Hub/pull/6), "Sprint 10b: colours, navigation, wide layout, run-of-days chips", merge commit `f54fb01445791482c4215abb104d10ff64fafa39` (`f54fb01`), 2026-11-04. CI passed on the head, `37d45eb`. The re-test (`docs/reviews/sprint-10b-verification.md`, dcd0152) said READY.
- **Sprint 10a is merged to `main`:** [PR #5](https://github.com/willMolloy/Homeschool-Hub/pull/5), merge commit `60692781bf87f07ed7cb7fe6bed07432404939ff` (`6069278`), 2026-11-04. The re-test (`docs/reviews/sprint-10a-verification.md`) said READY.
- **Sprint 9 and 9b are merged to `main`:** [PR #4](https://github.com/willMolloy/Homeschool-Hub/pull/4), "Sprint 9 + 9b: Schedule & Records, plus fixes", merged on 2026-11-03 with a merge commit (the same method as PR #3).
  - The merge commit is `bd47c550f4c92c3cb0fc4e8ff5baf0447364d5a8`.
  - CI passed on the head, `e8dab0d`.
  - The re-test (`docs/reviews/sprint-9b-verification.md`) said READY: no High or Medium findings, and 7 Low ones (R1–R7).
- **Branches:**
  - No sprint branch is open. The next sprint gets a new branch off `main` (after `f54fb01`).
  - `hh2/sprint-10b`, `hh2/sprint-10` (10a) and `hh2/sprint-9b` are kept, but they are done.
  - The branch rule is in [../HOW_WE_WORK.md](../HOW_WE_WORK.md#branches) (decided by DeeDee, 2026-11-03).
- **Gate:** `bash scripts/check.sh` was ALL GREEN before every Sprint 10b commit.

## Done: Sprint 10b (colours, navigation, the wide layout), merged in PR #6

- **Sprint 10b is done and merged.** Per-ticket rows and Decisions are in [sprint-10b.md](sprint-10b.md). Pushed, one commit per ticket:

| Ticket | Commit |
|--------|--------|
| S10-11 Twelve soft subject colours | e553209 |
| S10-12 Subjects screen cleanup | 3964add |
| S10-13 Week arrows and dates in the Week \| Year row | dc2c891 |
| S10-09 Navigation: a bottom bar or an icon rail | 4a86f38 |
| S10-14 Set up gets a 44 px back link | 3777402 |
| S10-16 Content column, forms, L5, R3 | ed32332 |
| S10-17 Home in two panes | 0c3a95e |
| S10-18 Year edit sheet as a side panel | 1dff685 |
| S10-19 9b re-test carry-overs and 10a Lows (R1, R2, R5, R7, L6, L7, L10, R4) | e398e03 |
| S9b-07 A run of days shows which days count | a4eec20 |
| S10-10b fix M1: date chips' names start with their text (+ `axe-log` smoke) | 5aee8a2 |
| S10-10b fix M2: moving a run's dates keeps the ticks | c179cfb |
| S10-10b fix L3: "Wed 11 is Frank's day off" hint with several children | 29c431d |
| S10-10b fix L4: a clipped row names its in-range days | 141fa17 |
| S10-10b fix L6: back links' "‹" hidden from screen readers | e47d195 |

- **Tester pass:** S10-10b first pass (465ba55) said NOT READY for M1 and M2 (S9b-07); the fixes above closed M1, M2, L3, L4 and L6. The re-test (dcd0152) said **READY**: gate ALL GREEN, one reseeded smoke round 24/24 scenarios (with `axe-log`), 32/32 tap-target runs.
- **Decided (DeeDee, 2026-11-04):** keep 840 px as the breakpoint for Home's two panes and the edit side panel. L1, L2 and questions (a), (b) are won't fix (logged in sprint-10b.md and the Sprint 10 README).
- **Backlog (Low, open):** L5, Rose and Lilac read close at a glance and the swatch "used" cue is subtle (both pass AA). The L6 observations (focus stays on the timeline after picking another bar; a full-page screenshot artefact) are unchanged.
- **Next:** not set; the Product Owner picks the next sprint. Migration `018_record_entry_days` is on `main` (run `db/migrate.ts`).
- **Gate:** before every commit, `DATABASE_URL=postgres://hh:hh@127.0.0.1:5462/hh2dev_test bash scripts/check.sh` must end ALL GREEN (about 2 minutes).
  - That Postgres is the Developer's own embedded one on 127.0.0.1:5462 (data in `/workspace/hh2-s10-pg/data`, binaries under `/workspace/hh2-s10-pg/node_modules/@embedded-postgres/linux-x64/native/bin`, user hh/hh). Start it with `pg_ctl -D /workspace/hh2-s10-pg/data -o "-p 5462 -c listen_addresses=127.0.0.1 -k /workspace/hh2-s10-pg/sock" start` if it is down; any scratch Postgres with an empty test database works too.
- **In progress:** nothing half-done. Each ticket is one commit.

## Done: Sprint 9b (fixes from the S9-10 test)

Details, files and Decisions are in [sprint-9.md](sprint-9.md) under "Sprint 9b". Tickets: `docs/tickets/sprint-9b-fixes/`.

| Ticket | Commit | In short |
|--------|--------|----------|
| S9b-01 School days are real days | 0a31fc7 | An entry's days come from the calendar (school weekdays less days off); ranges count the part inside them. |
| S9b-02 A typed book is never dropped | 426985e | A title typed but not added is added on Save. |
| S9b-03 Home's "on track" is honest | db6bdf0 | The Schedule card says "running late" when any work is forecast late. |
| S9b-04 Smoke scenarios use the DateField | 6e9c58b | Scenarios type US dates. They pass against a private local stack. |
| S9b-05 Small fixes from the Sprint 9 tester | 3a247ae | N6, N7, N9–N17 and the demo's late assignment (S9-05). |
| S9b-06 Independent re-test | e8dab0d | READY. 18 of 18 pass, 23 of 23 smoke scenarios, and 7 Low findings (R1–R7). See `docs/reviews/sprint-9b-verification.md`. |

## Done: Sprint 10a (the Year view) on `hh2/sprint-10`, merged as PR #5 (`6069278`)

- **The split (DeeDee, 2026-11-04).** Sprint 10 is now two sprints; see `docs/tickets/sprint-10-year-polish/README.md#order`.
  - **10a** is the Year view: S10-01 to S10-08, S10-04b, S10-04c and S10-15, then the S10-10a tester pass. It is built on `hh2/sprint-10`, which is the 10a branch.
  - **10b** is colours, navigation and the wide layout: S10-09, S10-11 to S10-14, S10-16 to S10-19 and S9b-07, then the S10-10b tester pass. It gets its own branch off `main` after 10a merges. **Don't start 10b on `hh2/sprint-10`.**
- **Progress:** per-ticket rows and Decisions are in [sprint-10.md](sprint-10.md). Done and pushed so far:

| Ticket | Commit |
|--------|--------|
| S10-01 Sheets above the tab bar | bea44b8 |
| S10-02 Lanes grouped by child | fa80631 |
| S10-15 Year badges 44 px tap zone | e631c61 |
| S10-03 Sticky two-line axis | 51cef65 |
| S10-04 Bar heights follow effort (95th-percentile max) | b5f33d1 |
| S10-04b Bar labels that fit | 9cd926c |
| S10-04c 44 px tap zones on thin bars | dfd1c45 |
| S10-05 Breaks as a wash over the bars | af89c39 |
| S10-06 Edit sheet as mocked | 8a50218, 206353d |
| S10-07 Add sheet as mocked | 6383476 |
| S10-08 Title row: "+" and the pencil | 1693bc7 |
| S10-05 fix (M1 from the 10a test): bars run through a break past a skipped day | fc6f467 |
| S10-19 partial (L3/R6 from the 10a test): date field padding on Set up forms | 9b5bfc7 |
| S10-19 partial (L9 from the re-test): tests ignore the read-only pace POST | 0994cc9 |

- **Result:** the S10-10a pass said NOT READY for M1 (S10-05), which was fixed; the re-test (5a5ce00) said **READY**. L9 was fixed before the merge; L10 and the other Lows went to S10-19 in 10b.

## S9b-07 and Claude's branch

- The ticket `docs/tickets/sprint-9b-fixes/S9b-07-runs-show-day-chips.md` and its README row were copied from `origin/claude/test-coverage-analysis-6dehbu` (commit `0d2e95d`). The rest of that branch was **not merged**.
- That branch's S9b-01 to S9b-04 commits (`d329548`, `400a1d9`, `308339d`, `375d3e0`) are Claude's parallel versions. They are superseded by ours, which are on `main` via PR #4. Don't merge them.
- Future work branches from `main`, per the one-branch-per-sprint rule in [HOW_WE_WORK](../HOW_WE_WORK.md#branches).
- **S9b-07 is built in Sprint 10b** (`a4eec20`), adapted to our S9b-01: an entry stores the days the parent ticked, and NULL (every older entry) still means the calendar's school weekdays less days off. The S10-10b tester checks it.

## What's next, in order

1. **The S10-10b tester pass** on `hh2/sprint-10b`; fix anything it finds as its own commits.
2. **The Sprint 10b PR** to `main` once the pass is READY, as with PR #5.

## Open for DeeDee

- **The [ROADMAP.md](../ROADMAP.md) checklist is stale.** Several items built in earlier sprints are still unticked, for example:
  - the weekly briefing;
  - undo and reset;
  - adjusting a week;
  - custom zoom views.

  It was left alone on purpose, pending DeeDee's decision on how it should be updated.

## Notes for the next session

- The new-session checklist in HOW_WE_WORK now points to [sprint-9.md](sprint-9.md) and this file.
- Shared machine: other agents may run servers on :5173, :3000, :5273 and :3100. Leave them alone, and use other ports for a private stack bound to 127.0.0.1.
- Tester notes for 10a are in S10-10a: All children against one child side by side (the bars rescale, which is expected); a 3-child family with overlapping books at 390 px; a badge's tap zone wins over a bar's at the plot's left edge.
- `test/timeline-add.test.tsx` ("on save, closes, draws the new bar…") failed once in a full gate run during S9b-05 and passed alone and on the rerun. It looks timing-sensitive, so watch for it.
