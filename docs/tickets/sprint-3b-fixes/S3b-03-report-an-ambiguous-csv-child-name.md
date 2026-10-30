# S3b-03 — Report a CSV child name that matches two children

**Finding:** L3  
**Depends on:** none  
**Size:** XS

## Goal
If a CSV name matches more than one active child (or subject), the import reports it instead of silently picking the first.

## Context
- The API allows two active children with the same name. `parseAssignmentsCsv` matches case-insensitively and trimmed, and takes the first match.

## Steps
1. When a child or subject name matches more than one active row, add an error: "Line N: two children are named Sam. Rename one under Kids first." (or "two subjects are named …", pointing to Subjects).

## Done when
- An ambiguous name blocks the import with that error; unique names import as before.

## Tests
- Unit (`csv-import.test.ts`): two active children named "Sam" (and "sam ") → the error on each line that uses the name; an archived duplicate doesn't count.

## Out of scope
- Stopping duplicate names in the API.
