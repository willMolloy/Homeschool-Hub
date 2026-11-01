# S6-09 — Ask effort in time on the assignment form

**Source:** decision C3; ROADMAP.md, "Effort"  
**Depends on:** none  
**Size:** M

## Goal
The assignment form asks "About how long will that take?" with presets and stores the answer as weight per unit, so parents never type a weight.

## Context
- Thickness = units per day × weight per unit, and 1 weight point ≈ 2 minutes (`MINUTES_PER_WEIGHT_POINT`). Today the form has a weight field behind "More", with suggestions (S2b-11).
- Units per day follow from the total, the dates and the assignment's school days.

## Steps
1. Add a pure helper (engine `weights.ts`): `weightFromMinutesPerDay(minutesPerDay, unitsPerDay)` = minutes ÷ units ÷ 2, rounded to the allowed decimals and clamped to the weight limits; and the inverse for display.
2. On the form, once total, dates and days are filled, show "About {n} {unit} a day" and "About how long will that take?" with 15, 30, 45, 60 minutes and Custom (minutes). The suggestion (learned, subject or built-in, S2b-11) preselects the nearest preset as "about N min".
3. Saving converts the minutes to `weightPerUnit` (or keeps `null` when the parent took the untouched subject or built-in suggestion, as today).
4. The raw weight field is removed from "More" (coordinator's call: the subject form keeps its default-weight picker for now).

## Done when
- 300 pages over 60 school days with 30 minutes stores weight 3 (30 ÷ 5 ÷ 2).
- An untouched suggestion saves as today.

## Tests
- Engine: conversion and inverse, rounding and clamping. Web: the presets, custom minutes, the computed pace line, the untouched-suggestion path, and editing an existing assignment shows its minutes.

## Out of scope
- Asking pages a day instead of an end date; changing the subject form.
