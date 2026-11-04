# S9-11 — Records: export with chosen columns and dates

**Source:** Will, 2026-11-01 (pick a date range; tick what to export; no empty columns; printable summary yes)  
**Depends on:** S9-08  
**Size:** M

## Goal
Export gives exactly the data the parent wants, for the dates they pick, as CSV or a printable summary.

## Steps
1. Export sheet: a date range (DateField; defaults to the Records range), children, and checkboxes for the columns (only fields the family tracks; date, child always included). Columns with no data in the range are left out.
2. CSV: one row per entry per child, or a totals view (a choice: "Each entry" / "Totals"). Cells starting with `=`, `+`, `-` or `@` get a leading `'`. The wording is the first line.
3. Printable summary: one page per child (print stylesheet, saves as PDF) with the chosen fields, totals and the wording.

## Done when
- A parent exports Fall for Frank with only school days and core/non-core hours: the CSV has just those columns; "=HYPERLINK(…)" in a note exports safely; print preview shows one tidy page per child.

## Tests
- CSV columns follow the ticks and drop empty ones; escaping; totals view; the print stylesheet exists.
