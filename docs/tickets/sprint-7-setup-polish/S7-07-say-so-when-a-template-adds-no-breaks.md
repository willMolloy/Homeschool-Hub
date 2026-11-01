# S7-07 — Say so when a template adds no breaks

**Finding:** Sprint 5 L2  
**Depends on:** none  
**Size:** XS

## Goal
When a calendar template would add nothing, the panel says so instead of a silent "Add breaks".

## Steps
1. With 0 breaks to add, disable "Add breaks" and show "Nothing new to add: these breaks are already in your days off." (or "No breaks in this range." when the range has none).

## Done when
- Applying the same template twice shows the message the second time, with Add disabled.

## Tests
- Web: both messages; Add disabled; no request.

## Out of scope
- Removing existing breaks.
