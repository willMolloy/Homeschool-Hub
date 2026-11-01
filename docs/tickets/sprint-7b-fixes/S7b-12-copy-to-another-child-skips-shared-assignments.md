# S7b-12 — Copy to another child skips assignments the child already has

**Finding:** independent review F-07 (Medium): copying Frank's History to Margaret duplicated a History spine they already shared.  
**Depends on:** S7b-11  
**Size:** XS

## Goal
Copy to another child leaves out assignments that already include the target child, or that the target child already has an identical copy of.

## Steps
1. Exclude assignments whose children include the target; exclude ones where the target already has the same subject and title with the same (or shifted) dates; show "{N} already have {child}".

## Done when
- The review's case offers 0 and says the shared History spine is already Margaret's.

## Tests
- Web: shared assignments excluded; identical copies excluded; the message.

## Out of scope
- Merging duplicates that already exist.
