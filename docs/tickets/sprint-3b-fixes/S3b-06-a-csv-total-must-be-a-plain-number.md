# S3b-06 — A CSV total must be a plain number

**Finding:** L7  
**Depends on:** none  
**Size:** XS

## Goal
The CSV `total` accepts only plain decimal numbers such as `300` or `12.5`.

## Context
- `Number()` turns `0x10` into 16 and `1e2` into 100.

## Steps
1. Accept `total` only if it matches a plain decimal (digits, optionally one `.` and digits; surrounding spaces allowed). Otherwise report "Line N: total must be a number, like 300."

## Done when
- `0x10`, `1e2`, `1,000` and `ten` are errors; `300`, ` 12.5 ` pass.

## Tests
- Unit: each value above.

## Out of scope
- Thousands separators.
