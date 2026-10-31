# S6-04 — Remove "Missed a day?" from This Week

**Source:** Will's decision of 2026-10-31: the weekly check-in already covers missed work ("keep the end date or push it back"), and a second way to report it clutters This Week and makes parents feel they must use it.  
**Depends on:** none  
**Size:** XS

## Goal
This Week no longer has a "Missed a day?" button; missed work is reported through the weekly check-in.

## Context
- S4-10 added the button and sheet (`features/plan/MissedDay.tsx`), creating a `missed` day off. S4b-07 made it preselect today.
- The engine rule for `missed` days (S4-00) and the `missed` kind stay: they're harmless, and a past day off still carries its work forward correctly. Existing `missed` days off keep working and stay editable under Days off.

## Steps
1. Remove the button, the sheet and their styles from This Week, and their tests.
2. Leave the API, the engine and the `KIND_LABELS` entry ("Missed day") alone.

## Done when
- This Week shows no "Missed a day?" control; existing missed days still appear under Days off and still shape the plan.

## Tests
- Web: This Week renders without the control; the Days off list still labels a `missed` day "Missed day". Remove the S4-10/S4b-07 sheet tests.

## Out of scope
- Attendance records (the records module will count days off, including missed days).
