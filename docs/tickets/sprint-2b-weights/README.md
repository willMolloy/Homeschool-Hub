# Sprint 2b — Weights, learned weights, and plan-assumes-done

Tickets only; there are no product-code changes in this folder's commit. They cover two decisions DeeDee made on Oct 28, 2026:

1. **Weights (S2b-01…17).**
   - Drop minutes-per-unit for pages, chapters and lessons. Each assignment gets an editable relative **weight per unit** (built-ins: page 1, chapter 10, lesson 15). Bar thickness = units/day × weight.
   - Minutes assignments get thickness = minutes ÷ 3, on the same scale.
   - The weights a parent sets are remembered per child and unit type, and a new assignment starts from the child's usual weight, with a hint saying so.
   - Logged hours come only from real logs.
2. **The plan assumes work was done (S2b-18…29).**
   - Unlogged work no longer rolls forward (90, not 135, for the week of Oct 26).
   - Logging is optional and feeds only hours and exports.
   - Progress comes from an explicit weekly **"How did last week go?"** check-in. Untouched rows count as done.
   - When behind, the parent chooses: thicken the remaining weeks or push the end date. When ahead: thin the bars or pull the end date in.

Every ticket follows the sprint-2a format: one component per ticket, Goal / Context / Steps / Done when / Tests / Out of scope.

## Order and dependencies

| # | Ticket | Depends on | Size |
|---|--------|------------|------|
| 1 | [S2b-01 — Add weight constants to the engine](S2b-01-add-weight-constants-to-the-engine.md) | none | XS |
| 2 | [S2b-02 — Plan bar thickness from weight in the engine](S2b-02-plan-bar-thickness-from-weight-in-the-engine.md) | S2b-01 | M |
| 3 | [S2b-03 — Write migration 004: weight_per_unit](S2b-03-write-migration-004-weight-per-unit.md) | none | S |
| 4 | [S2b-04 — Write migration 005: weight_choice history](S2b-04-write-migration-005-weight-choice-history.md) | S2b-03 | S |
| 5 | [S2b-05 — Read weight_per_unit into the plan](S2b-05-read-weight-per-unit-into-the-plan.md) | S2b-02, S2b-03 | XS |
| 6 | [S2b-06 — Accept and return weightPerUnit on the assignment endpoints](S2b-06-accept-and-return-weightperunit-on-the-assignment-endpoints.md) | S2b-01, S2b-03 | S |
| 7 | [S2b-07 — Record weight choices when assignments are saved](S2b-07-record-weight-choices-when-assignments-are-saved.md) | S2b-04, S2b-06 | S |
| 8 | [S2b-08 — Compute a child's usual weight](S2b-08-compute-a-childs-usual-weight.md) | S2b-01, S2b-04 | S |
| 9 | [S2b-09 — Add the weight-suggestion endpoint](S2b-09-add-the-weight-suggestion-endpoint.md) | S2b-07, S2b-08 | S |
| 10 | [S2b-10 — Replace the minutes field with a weight field on the assignment form](S2b-10-replace-the-minutes-field-with-a-weight-field-on-the-assignment-form.md) | S2b-06 | S |
| 11 | [S2b-11 — Prefill the weight from the child's usual and show its source](S2b-11-prefill-the-weight-from-the-childs-usual-and-show-its-source.md) | S2b-09, S2b-10 | S |
| 12 | [S2b-12 — Show thickness in the plan debug view](S2b-12-show-thickness-in-the-plan-debug-view.md) | S2b-02, S2b-05 | XS |
| 13 | [S2b-13 — Retire minutesPerUnit from the API and web](S2b-13-retire-minutesperunit-from-the-api-and-web.md) | S2b-10, S2b-11, S2b-12 | XS |
| 14 | [S2b-14 — Remove minute outputs from the engine](S2b-14-remove-minute-outputs-from-the-engine.md) | S2b-13 | S |
| 15 | [S2b-15 — Write migration 006: drop minutes_per_unit](S2b-15-write-migration-006-drop-minutes-per-unit.md) | S2b-13 | XS |
| 16 | [S2b-16 — Tester pass: weight edge cases](S2b-16-tester-pass-weight-edge-cases.md) | S2b-15 | S |
| 17 | [S2b-17 — Update docs for weights](S2b-17-update-docs-for-weights.md) | S2b-15 | XS |
| 18 | [S2b-18 — Assume scheduled work was done in the engine](S2b-18-assume-scheduled-work-was-done-in-the-engine.md) | S2b-14 | M |
| 19 | [S2b-19 — Stop loading logs into the plan](S2b-19-stop-loading-logs-into-the-plan.md) | S2b-18 | XS |
| 20 | [S2b-20 — Replan from actual-progress check-ins in the engine](S2b-20-replan-from-actual-progress-check-ins-in-the-engine.md) | S2b-18 | M |
| 21 | [S2b-21 — Write migration 007: progress check-ins](S2b-21-write-migration-007-progress-check-ins.md) | none | S |
| 22 | [S2b-22 — Load check-ins into the plan](S2b-22-load-check-ins-into-the-plan.md) | S2b-20, S2b-21 | XS |
| 23 | [S2b-23 — Add the week check-in read endpoint](S2b-23-add-the-week-check-in-read-endpoint.md) | S2b-22 | S |
| 24 | [S2b-24 — Add the save check-in endpoint](S2b-24-add-the-save-check-in-endpoint.md) | S2b-23 | S |
| 25 | [S2b-25 — Show the "How did last week go?" card](S2b-25-show-the-how-did-last-week-go-card.md) | S2b-24 | S |
| 26 | [S2b-26 — Ask how to absorb the difference and save](S2b-26-ask-how-to-absorb-the-difference-and-save.md) | S2b-25 | S |
| 27 | [S2b-27 — Edit a past week's check-in](S2b-27-edit-a-past-weeks-check-in.md) | S2b-26 | S |
| 28 | [S2b-28 — Tester pass: check-in edge cases](S2b-28-tester-pass-check-in-edge-cases.md) | S2b-27 | S |
| 29 | [S2b-29 — Update docs for assumed progress and check-ins](S2b-29-update-docs-for-assumed-progress-and-check-ins.md) | S2b-28 | XS |

## Tracks

| Track | Tickets |
|-------|---------|
| Engine | 01, 02, 08, 14, 18, 20 |
| DB | 03, 04, 15, 21 |
| API | 05, 06, 07, 09, 13, 19, 22, 23, 24 |
| Web | 10, 11, 12, 25, 26, 27 |
| Tester | 16, 28 |
| Docs | 17, 29 |

## Implementation order

The work uses **expand / contract**, so the gate (`bash scripts/check.sh`) is green and the app works after every ticket.

1. **Expand weights:**
   - 01 → 02 (engine adds thickness; minutes kept, marked deprecated)
   - 03 → 04 (DB adds `weight_per_unit` and `weight_choice`)
   - 05 (plan reads the weight)
   - 06 (API accepts `weightPerUnit`; the legacy `minutesPerUnit` is translated)
2. **Learning:** 07 (record choices) → 08 (usual-weight rule) → 09 (suggestion endpoint).
3. **Web:** 10 (weight field) → 11 (prefill + hint) → 12 (debug view).
4. **Contract:** 13 (API and web drop `minutesPerUnit`) → 14 (engine drops minutes; 0.3.0) → 15 (migration 006 drops the column and RF-10's 003 constraint).
5. **Verify weights:** 16 (tester) → 17 (docs).
6. **Decouple from logs:** 18 (engine assumes done; 90 not 135; 0.4.0) → 19 (stop loading logs).
7. **Check-ins:**
   - 20 (engine anchors + replan; 0.5.0) and 21 (migration 007) can run in parallel.
   - Then 22 (loader) → 23 (GET) → 24 (PUT).
8. **Card:** 25 (card) → 26 (behind/ahead question + save) → 27 (edit past weeks).
9. **Verify check-ins:** 28 (tester) → 29 (docs).

Parallel options:
- Track 6 depends on 14 only to avoid conflicting edits to `plan.ts`. If two developers are available, 18–21 can start right after 02, as long as they rebase on 14.
- 21 has no code dependencies.

Never deploy 15 (migration 006) ahead of 13: 006 drops the column that the code before 13 still reads.

## Open decisions (defaults chosen in the tickets; DeeDee to confirm)

| ID | Decision | Default in the tickets | Alternative |
|----|----------|------------------------|-------------|
| D1 | Minutes ↔ weight scale | 3 min = 1 point (a page at 1 ≈ 3 min; a lesson at 15 ≈ 45 min) | 2 min = 1 point (a lesson ≈ 30 min, closer to the old 20-min lesson default) |
| D2 | Weight bounds | 0.01–100, 2 decimals; 0 rejected (use archive to "turn off") | Allow 0 |
| D3 | Existing `minutes_per_unit` data | Converted to round(mpu/3, 2), clamped; 0 or NULL → built-in | Discard and start everyone at the built-ins |
| D4 | Learned-weight store | Its own append-only `weight_choice` table (history, multi-child, unit changes; S2b-04) | Derived from current assignment rows |
| D5 | "Usual weight" rule | Median of the latest weight on each of the 5 most recent assignments per child + unit; archived assignments count; a clear removes that vote; an accepted suggestion counts as a choice | Mean, the last 3, or only typed weights |
| D6 | Multi-child | One weight per assignment; the suggestion is the median of the per-child usuals of children with history (else the built-in); saving records a choice for every child | A weight per child on a shared assignment |
| D7 | Unit change on edit | A new weight (or null) must be sent → 400 otherwise; the form refills from the new unit's suggestion | Silently reset to the default |
| D8 | Archived children in suggestions | Allowed (read-only, history used) | 400 like writes |
| D9 | Past bars in a checked-in week | Scaled to show the actual progress | Keep showing the planned bars |
| D10 | Default absorb choice when behind or ahead | Keep the end date (thicken or thin), preselected | Push or pull the end date; or no default |
| D11 | "On plan" tolerance | Within 0.5 units → no question, nothing stored | Exact match |
| D12 | Preview of each choice ("~2 more pages/day", "ends Dec 12") | Not in v1 | A dry-run plan endpoint |
| D13 | Position meaning | Cumulative units since the assignment's start ("got to page 65" = 65 done); no start-page offset | Add a `start_at` (first page number) field |
| D14 | Skipped card | Counts as done as planned; the card is hidden for that week on every device (`week_review`) | Ask again next visit |
| D15 | Engine versions | 0.2.0 (thickness), 0.3.0 (no minutes), 0.4.0 (assume done), 0.5.0 (check-ins) | One bump per release instead of per ticket |
| D16 | Hours and exports | Only from `log_entry.minutes_spent`; there is no UI for this in this sprint | — |
