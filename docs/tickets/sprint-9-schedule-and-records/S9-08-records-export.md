# S9-08 — Records: export CSV and a printable summary

**Source:** ROADMAP "Records" (CSV safety, neutral note)  
**Depends on:** S9-07  
**Size:** S

## Goal
One Export button gives a CSV of the page's range, or a print-friendly summary that saves as PDF.

## Steps
1. CSV: attendance, hours by subject, and books per child for the chosen range. Cells starting with `=`, `+`, `-` or `@` get a leading `'`. The neutral note is the first line.
2. Print summary: a print stylesheet of the Records page (one child per page), no new screens. If it runs long, the print summary slips to the next sprint first.

## Done when
- A title "=HYPERLINK(…)" exports safely; the CSV opens cleanly in a spreadsheet; print preview shows one tidy page per child.

## Tests
- API or web: CSV contents and escaping; the print stylesheet exists.
