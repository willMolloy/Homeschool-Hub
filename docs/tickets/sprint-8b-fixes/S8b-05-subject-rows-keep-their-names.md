# S8b-05 — Subject rows keep their names

**Finding:** S8 tester N5 (Medium): Math's name is lost beside its "about 40 min a lesson" pill ("M…" at 360, blank at 320).  
**Depends on:** none  
**Size:** XS

## Goal
A subject's name is always readable on its row.

## Steps
1. The name keeps at least its natural width (or 8rem); the pill wraps under it when space is short.

## Done when
- At 320 and 360 px every demo subject's name reads in full.

## Tests
- Web: the narrow layout puts the pill on its own line.
