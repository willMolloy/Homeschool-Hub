# S3b-04 — Clearer CSV errors for the wrong separator, an open quote or no rows

**Finding:** L4  
**Depends on:** none  
**Size:** S

## Goal
A CSV in the wrong shape gets one plain message that says how to fix it.

## Context
- Only commas separate fields (S3a-05 decision). Today a semicolon or tab file, an unterminated quote, or a header-only file give confusing messages or "0 assignments".

## Steps
1. If the header has no commas but contains `;` or a tab, report one error: "This file uses semicolons (or tabs) between columns. Save it as CSV with commas." and stop.
2. An unterminated quote reports "Line N: a quote is never closed." and stops.
3. A file with a valid header and no data rows reports "No assignments found under the header."
4. Unquoted commas that produce extra columns on a row report "Line N: too many columns. Put quotes around text that contains commas."

## Done when
- Each case shows its message and Import stays disabled.

## Tests
- Unit: semicolon file, tab file, unterminated quote, header only, a row with an unquoted comma in the title.

## Out of scope
- Supporting other separators.
