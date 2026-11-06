# S18b-02 — A shared book keeps one set of school days

**Source:** M2 (Medium) in `docs/reviews/sprint-18-verification.md` (the same report is in `docs/reviews/pr17-verification.md`). **Depends on:** DeeDee's decision of 2026-11-06, recorded here. **Size:** the rule is a decision. The usability follow-up is S when a later sprint builds it. This file does not build it.

## Goal

Record that an assignment uses the same school days for every child on it, and that a child with different days gets a separate workbook with its own schedule, plus a usability follow-up for making and updating those copies.

## Context

The product stores school days on the assignment. Children on one assignment share that set of days. Sprint 18 met E11 in the Hartley seed by giving Wren her own copies of the shared read-alouds on Tuesday to Friday (`seed-cm-family.ts`). The app did not grow a per-child school-days planner.

DeeDee decided on 2026-11-06:

- Assignments assume the same school days for everyone on them.
- When children need different days, each uses their own assignment.
- They have different schedules and daily flows.
- Readings need not be kept aligned day to day.
- That own assignment is a separate workbook with a different schedule.
- Per-child school days on one shared assignment stay out of the planner. She chose the separate workbook.

The copy workaround in the seed is the rule in practice.

### Repro (tester, Hartley family)

E11 passed through the seed only. Wren's Days on Monday say "Nothing planned", her week sheet has 0 "Mon ·" lines, and her Monday day sheet says "Nothing planned for Monday". The product still has one set of days per assignment.

The copies are awkward, which is what the usability follow-up is for:

- **Four duplicated books.** Set up › Assignments lists Gospel of Luke ×2, The Hobbit (read aloud) ×2, Our Island Story ×2, and Poetry and Psalm 23 recitation ×2, told apart only by "· Wren" against "· Elias, Clara". On the Year view, Wren's lane repeats the books that also sit in the Together lane (`shared-03-year-all-360.png`). This fails the "no duplicates" screen test, and under this rule those duplicates are real separate workbooks.
- **The same read-aloud shows up in more than one place in one session.** On Tue Nov 10, Days shows The Hobbit at pages 229–233 for Elias, 225–229 for Clara and 222–227 for Wren. Gospel of Luke is "chapter 18 · start" for the Together group and "chapter 17 · finish" for Wren (`shared-02-all-days-nov9-360.png`). Some of the Elias/Clara gap is already in the seed on a shared assignment (Mon Nov 2: Elias 201–205, Clara 199–203), because each child's progress is tracked separately. DeeDee's rule: readings on separate workbooks need not stay aligned day to day. The follow-up does not pull those pages back together.
- **Each copy is updated on its own.** Update status, a week adjustment, or "Did Wren finish…?" is done once for the shared copy and again for Wren's copy, and the two drift apart. Finding the other copy is the hard part. Forcing them back onto the same page is not the aim.
- **One shared schedule applies to every child on it.** The tester added a shared book for all three children on Mon–Thu (through the API, then archived it). Wren immediately got Monday lines ("MON, NOV 9 · Shared test read-aloud · chapter 1", `shared-01-wren-monday-line-360.png`). Her Monday in Days said "Nothing planned" rather than "Not a school day for Wren". Under this rule that shared book is doing what an assignment does: the same days for everyone on it. Wren's Tuesday-to-Friday reading belongs on her own workbook, with its own days.

Logging and Records were unaffected. Severity was Medium for a family like the Hartleys.

## The rule

1. An assignment has one set of school days. Every child on it follows those days.
2. A child whose week is different gets their own assignment of that book: a separate workbook, with its own days and its own daily flow.
3. Those workbooks do not have to stay on the same page, chapter or lesson from day to day.
4. The planner does not grow school days per child, and a shared assignment does not start skipping a day for one of its children.

## Usability follow-up

Specified here, not built. Copying a book onto another schedule, and updating the other copies later, should be clearer and easier than the seed's hand-split list. The evidence is the four duplicated books, the child-name suffixes, the Year view repeating a book in a child's lane and in Together, and the second round of Update status, week adjustment and finish questions.

A later build, using the copy the app already has (Copy on the assignment, and Copy to another child):

1. Making the separate workbook can set that copy's own days at the time it is made, so a Tuesday-to-Friday child is not left on the shared Monday-to-Thursday days.
2. The two workbooks are distinguishable in Set up › Assignments and on the Year view by more than a trailing "· Wren".
3. From one copy, the parent can see the other copies of that book and open the same kind of update on a chosen copy (this week's amount, Update status, or the finish question) without searching the list for the twin.
4. Updating one copy leaves the other copies' progress where it is. Nothing in the follow-up realigns the readings.

## Done when

- This file, HANDOFF and ROADMAP state the rule as decided, with no open choice between a shared schedule and per-child school days.
- The repro is preserved, and the usability follow-up is specified and unbuilt.
- The app still has one set of days per assignment. The Hartley seed's separate Tuesday-to-Friday copies stay as they are.

## Tests

None in this docs pass. The existing seed check, that a Tuesday-to-Friday child has no Monday lines, stays. A later usability build covers telling the two workbooks apart and opening an update on the other copy without changing its page or chapter. No test should expect one assignment to keep different school days per child.

## Out of scope

- Implementing the usability follow-up in this pass.
- Per-child school days, or "this child joins the shared book on her days", as a planner change.
- Keeping the separate workbooks on the same page, chapter or lesson.
- A warning on the Add sheet when a shared assignment includes a day one child does not school. The tester suggested one. DeeDee's answer is the separate workbook, and this follow-up makes that copy easier to make and to update.
- L1, L2 and L3 from the same report.
- The past-date confirmation (S18b-01).
