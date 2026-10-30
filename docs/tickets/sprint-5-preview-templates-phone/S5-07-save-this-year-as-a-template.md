# S5-07 — Save this year as a template, and reuse it

**Source:** ROADMAP.md, "Calendar templates" ("Save this year as a template")  
**Depends on:** S5-05, S5-06  
**Size:** M

## Goal
A parent saves this year's days off as a named template and applies it to another year, with every break shifted to the new start date.

## Steps
1. On Days off, **Save as a template** asks for a name and the year's first day, and saves every family-wide day off from that day up to one year later as offsets (`kind` and label kept; per-child days off are left out and the panel says how many).
2. In **Use a template** (S5-05), saved templates appear after the built-in shapes, with a delete option. Choosing one asks for the new year's first day and previews the shifted breaks (with the same overlap rule), then adds them in one bulk request.

## Done when
- Saving 2026–27 and applying it from 2027-08-16 creates the same breaks shifted by the difference in start dates.
- Only what's essential; 360 px.

## Tests
- Web (fake API): saving sends the right offsets; per-child days off are left out and counted; applying a saved template previews shifted dates and sends one bulk POST; deleting removes it from the list.

## Out of scope
- Matching weekdays when shifting (breaks shift by days, not by weekday).
