# S2b-27 — Edit a past week's check-in

**Depends on:** S2b-26  
**Size:** S

## Goal
A parent can reopen any finished week's check-in from the plan screen and correct it, including one they already reviewed or skipped.

## Behaviour
- A link "Review a past week" under the plan opens a week picker. It lists finished weeks within the plan range that have planned work, labelled "reviewed", "skipped" or "not reviewed".
- Choosing a week opens the same card UI (reused), loaded from `GET /api/check-ins?weekStart=` with stored `actual` and `mode` values prefilled.
- Saving PUTs the whole week (replace semantics, S2b-24). Clearing a change back to "as planned" removes it.
- A note when later weeks have their own check-ins: "Later check-ins still apply from their weeks on."

## Steps
1. Make `LastWeekCard` take `weekStart` and `mode: "prompt" | "edit"`. Prompt mode is the home-screen card; edit mode is never auto-hidden by status.
2. `PastWeekPicker.tsx`.

## Tests
- Opening a reviewed week shows its stored values.
- Clearing a change sends a PUT without that item.
- Skipped weeks are editable.
- Current and future weeks are not listed.
- The note shows when later check-ins exist.
