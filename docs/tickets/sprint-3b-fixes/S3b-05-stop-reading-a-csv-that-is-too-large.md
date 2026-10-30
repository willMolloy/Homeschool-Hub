# S3b-05 — Stop reading a CSV that is too large

**Finding:** L6  
**Depends on:** none  
**Size:** XS

## Goal
A very large file is rejected at once instead of freezing the form.

## Context
- An 8 MB, 150k-row file freezes the form for about 10 s, because the 50-row cap is checked after a full parse.

## Steps
1. Before reading a chosen file, reject one over 1 MB: "This file is too large. Import at most 50 assignments at a time."
2. In the parser, stop as soon as the 51st data row is reached and report the existing row-cap error.

## Done when
- A large file shows the message immediately; a 50-row file still imports.

## Tests
- Web: a `File` over 1 MB shows the message without parsing. Unit: 10,000 rows returns the row-cap error (and doesn't parse every row).

## Out of scope
- Streaming or chunked imports.
