# Sprint 2b — Weights, learned weights, subject defaults, and plan-assumes-done

These tickets have no product-code changes. They cover DeeDee's decisions from Oct 28, 2026, revised the same morning at 8:24 AM CT.

1. **Weights.**
   - Minutes-per-unit is dropped. Every assignment has a relative **weight per unit**, and bar thickness = units/day × weight.
   - Built-ins: page 1, chapter 10, lesson 15, minute 0.5. **2 minutes = 1 point**, so a page at weight 1 ≈ 2 minutes.
   - Logged hours come only from real logs.
2. **Learned weights** (pages, and chapters too).
   - A new assignment starts from the child's usual weight: the latest weight on their 5 most recent assignments of that unit, with the highest and lowest dropped and the middle 3 averaged.
   - A prolific child ends up with thin bars for 20 pages, a slower child with thick ones.
3. **Subject defaults.** For non-objective work (math lessons, practice minutes), the parent sets a bar width on the subject with a simple thickness picker and a preview bar.
   - **Precedence:** explicit assignment value → child's learned weight (pages and chapters) → subject default → built-in.
4. **The plan assumes work was done.**
   - Unlogged work no longer rolls forward (90, not 135, for the week of Oct 26), and logging is optional.
   - An optional, quick **"How did last week go?"** card offers a one-tap **Last week went as planned**, an easy per-assignment adjust, and a skip that counts as done. It never nags.
   - When behind: thicken the remaining weeks or push the end date. When ahead: thin the bars or pull the end date in.

Each ticket is one component and uses the sprint-2a format: Goal / Context / Steps / Done when / Tests / Out of scope. Ticket numbers are IDs, not the order; **build in the order of the table below.**

## Order and dependencies

| Order | Ticket | Depends on | Size |
|-------|--------|------------|------|
| 1 | [S2b-01 — Add weight constants to the engine](S2b-01-add-weight-constants-to-the-engine.md) | none | XS |
| 2 | [S2b-02 — Plan bar thickness from weight in the engine](S2b-02-plan-bar-thickness-from-weight-in-the-engine.md) | S2b-01 | M |
| 3 | [S2b-03 — Write migration 004: weight_per_unit](S2b-03-write-migration-004-weight-per-unit.md) | none | S |
| 4 | [S2b-04 — Write migration 005: weight_choice history](S2b-04-write-migration-005-weight-choice-history.md) | S2b-03 | S |
| 5 | [S2b-05 — Read weight_per_unit into the plan](S2b-05-read-weight-per-unit-into-the-plan.md) | S2b-02, S2b-03 | XS |
| 6 | [S2b-06 — Accept and return weightPerUnit on the assignment endpoints](S2b-06-accept-and-return-weightperunit-on-the-assignment-endpoints.md) | S2b-01, S2b-03 | S |
| 7 | [S2b-07 — Record weight choices when assignments are saved](S2b-07-record-weight-choices-when-assignments-are-saved.md) | S2b-04, S2b-06 | S |
| 8 | [S2b-08 — Compute a child's usual weight](S2b-08-compute-a-childs-usual-weight.md) | S2b-01, S2b-04 | S |
| 9 | [S2b-30 — Write migration 006: subject default weight](S2b-30-write-migration-006-subject-default-weight.md) | S2b-03 | XS |
| 10 | [S2b-31 — Accept and return the subject default weight on the subject endpoints](S2b-31-accept-and-return-subject-default-weight-on-the-subject-endpoints.md) | S2b-30, S2b-01 | S |
| 11 | [S2b-09 — Add the weight-suggestion endpoint](S2b-09-add-the-weight-suggestion-endpoint.md) | S2b-07, S2b-08, S2b-31 | S |
| 12 | [S2b-32 — Use the subject default weight in the engine](S2b-32-use-the-subject-default-weight-in-the-engine.md) | S2b-02, S2b-01 | XS |
| 13 | [S2b-33 — Load subject default weights into the plan](S2b-33-load-subject-default-weights-into-the-plan.md) | S2b-31, S2b-32 | XS |
| 14 | [S2b-10 — Replace the minutes field with a weight field on the assignment form](S2b-10-replace-the-minutes-field-with-a-weight-field-on-the-assignment-form.md) | S2b-06 | S |
| 15 | [S2b-34 — Build the thickness picker with preview bar](S2b-34-build-the-thickness-picker-with-preview-bar.md) | S2b-01 | S |
| 16 | [S2b-35 — Set a default weight on the subject form](S2b-35-set-a-default-weight-on-the-subject-form.md) | S2b-31, S2b-34 | S |
| 17 | [S2b-11 — Prefill the weight and show its source](S2b-11-prefill-the-weight-and-show-its-source.md) | S2b-09, S2b-10 | S |
| 18 | [S2b-12 — Show thickness in the plan debug view](S2b-12-show-thickness-in-the-plan-debug-view.md) | S2b-02, S2b-05 | XS |
| 19 | [S2b-13 — Retire minutesPerUnit from the API and web](S2b-13-retire-minutesperunit-from-the-api-and-web.md) | S2b-10, S2b-11, S2b-12 | XS |
| 20 | [S2b-14 — Remove minute outputs from the engine](S2b-14-remove-minute-outputs-from-the-engine.md) | S2b-13 | S |
| 21 | [S2b-15 — Write migration 007: drop minutes_per_unit](S2b-15-write-migration-007-drop-minutes-per-unit.md) | S2b-13, S2b-30 | XS |
| 22 | [S2b-16 — Tester pass: weight edge cases](S2b-16-tester-pass-weight-edge-cases.md) | S2b-15 | S |
| 23 | [S2b-37 — Tester pass: subject defaults and precedence](S2b-37-tester-pass-subject-defaults-and-precedence.md) | S2b-35, S2b-11, S2b-33 | S |
| 24 | [S2b-17 — Update docs for weights](S2b-17-update-docs-for-weights.md) | S2b-16, S2b-37 | XS |
| 25 | [S2b-18 — Assume scheduled work was done in the engine](S2b-18-assume-scheduled-work-was-done-in-the-engine.md) | S2b-14 | M |
| 26 | [S2b-19 — Stop loading logs into the plan](S2b-19-stop-loading-logs-into-the-plan.md) | S2b-18 | XS |
| 27 | [S2b-20 — Replan from actual-progress check-ins in the engine](S2b-20-replan-from-actual-progress-check-ins-in-the-engine.md) | S2b-18 | M |
| 28 | [S2b-21 — Write migration 008: progress check-ins](S2b-21-write-migration-008-progress-check-ins.md) | none | S |
| 29 | [S2b-22 — Load check-ins into the plan](S2b-22-load-check-ins-into-the-plan.md) | S2b-20, S2b-21 | XS |
| 30 | [S2b-23 — Add the week check-in read endpoint](S2b-23-add-the-week-check-in-read-endpoint.md) | S2b-22 | S |
| 31 | [S2b-24 — Add the save check-in endpoint](S2b-24-add-the-save-check-in-endpoint.md) | S2b-23 | S |
| 32 | [S2b-25 — Show the "How did last week go?" card](S2b-25-show-the-how-did-last-week-go-card.md) | S2b-24 | S |
| 33 | [S2b-36 — Adjust one assignment's progress on the card](S2b-36-adjust-one-assignments-progress-on-the-card.md) | S2b-25 | S |
| 34 | [S2b-26 — Ask how to absorb the difference and save](S2b-26-ask-how-to-absorb-the-difference-and-save.md) | S2b-36 | S |
| 35 | [S2b-27 — Edit a past week's check-in](S2b-27-edit-a-past-weeks-check-in.md) | S2b-26 | S |
| 36 | [S2b-28 — Tester pass: check-in edge cases](S2b-28-tester-pass-check-in-edge-cases.md) | S2b-27 | S |
| 37 | [S2b-29 — Update docs for assumed progress and check-ins](S2b-29-update-docs-for-assumed-progress-and-check-ins.md) | S2b-28 | XS |
| 38 | [S2b-38 — Make the latest check-in authoritative](S2b-38-make-the-latest-check-in-authoritative.md) | S2b-20, S2b-28 | S |

## Tracks

| Track | Tickets |
|-------|---------|
| Engine | 01, 02, 08, 32, 14, 18, 20, 38 |
| DB | 03 (mig 004), 04 (005), 30 (006), 15 (007), 21 (008) |
| API | 05, 06, 07, 31, 09, 33, 13, 19, 22, 23, 24 |
| Web | 10, 34, 35, 11, 12, 25, 36, 26, 27 |
| Tester | 16, 37, 28 |
| Docs | 17, 29 |

## Implementation order (expand / contract; the gate is green and the app works after every ticket)

1. **Expand weights:**
   - 01 → 02 → 03 → 04 → 05 → 06 (the legacy `minutesPerUnit` is translated at ÷2).
   - Then 07 → 08 (trimmed-mean rule).
2. **Subject defaults:** 30 (migration 006) → 31 (subject API) → 32 (engine) → 33 (loader).
3. **Suggestion:** 09 (needs 31 for the subject step).
4. **Web:** 10 (weight field) → 34 (picker) → 35 (subject form) → 11 (prefill + hint) → 12 (debug view).
5. **Contract:** 13 → 14 (engine drops minutes) → 15 (migration 007 drops `minutes_per_unit` and RF-10's 003 constraint). Never deploy 15 before 13.
6. **Verify weights:** 16 → 37 → 17.
7. **Decouple:** 18 (engine assumes done; 90, not 135) → 19 (stop loading logs).
8. **Check-ins:**
   - 20 (engine) and 21 (migration 008) can run in parallel.
   - Then 22 → 23 (GET) → 24 (PUT).
9. **Card:** 25 (card + one-tap confirm + skip) → 36 (per-row adjust control) → 26 (behind/ahead question + save) → 27 (past weeks).
10. **Verify:** 28 → 29.
11. **Follow-up:** 38 (DeeDee's D24, from tester finding T5-2).

## Decisions

**Settled by DeeDee (Oct 28):**
- **D1:** 2 minutes = 1 point; migration 004 converts minutes ÷ 2, capped.
- **D5:** latest weight on the 5 most recent assignments of that unit per child; drop the high and low, then average the middle 3.
- **D6:** multi-child takes the median of the per-child usual weights.
- **D17:** learning applies to pages; chapters are included pending confirmation (see below).
- Precedence: assignment → learned → subject → built-in.
- **D14:** skipping the card counts as done, and the card never nags.
- **D24** (later on Oct 28): the most recent check-in is authoritative for everything after it; editing an earlier week never changes a bar after a later check-in (S2b-38).

**Defaults chosen in the tickets, still open:**

| ID | Decision | Default in the tickets | Alternative |
|----|----------|------------------------|-------------|
| D17 | Chapters learned like pages | Yes | Pages only (chapter lengths vary a lot) |
| D18 | Fewer than 5 assignments | 4 → drop high and low, average the middle 2; 1–3 → plain mean; 0 → fall back | Plain mean below 5 |
| D19 | Subject default vs learned for pages and chapters | Learned wins (DeeDee's order); the subject default only fills in for children without history | Subject wins when set |
| D20 | Subject default: snapshot or live | Live: assignments without their own weight follow subject edits. Learned values are stored on the assignment (snapshot) | Stamp the subject value onto new assignments |
| D21 | Weights on lessons and minutes assignments | Allowed (minute built-in 0.5); explicit values are never learned | Subject-level only |
| D22 | Picker presets | None / Light ×0.5 / Normal ×1 / Heavy ×1.5 / Very heavy ×2 / Custom | Other steps |
| D23 | Subject default bound to one unit type | Yes (20 per lesson ≠ 20 per page) | One default per unit type per subject |
| D2 | Weight bounds | 0.01–100, 2 decimals | Allow 0 |
| D3 | Existing minute values | ÷ 2, capped; 0 or NULL → default | Discard |
| D7 | Unit change on edit | Must resend a weight (400 otherwise) | Silent reset |
| D8 | Archived children and subjects in suggestions | Allowed | 400 |
| D9 | Past bars in a checked-in week | Scaled to actual | Keep the planned bars |
| D10 | Default absorb choice | Keep the end date (thicken or thin) | Push or pull the end date |
| D11 | On-plan tolerance | ±0.5 units | Exact |
| D12 | Preview numbers on the absorb choices | Not in v1 | A dry-run endpoint |
| D13 | Position meaning | Units done since the start; no start page | A `start_at` field |
| D15 | Engine versions | 0.2.0, 0.3.0, 0.4.0, 0.5.0, with a patch bump for S2b-32; 0.6.0 for S2b-38 | One bump per release |
| D16 | Hours and exports | Only from `log_entry.minutes_spent` | — |

D4 (a separate `weight_choice` table) stands as written; see S2b-04.
