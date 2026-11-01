# S9-05 — Home's briefing line, only when something needs you

**Source:** UX review fix 2; Will, 2026-11-01 ("Let's try it for now")  
**Depends on:** S9-01  
**Size:** S

## Goal
Home shows one short line when something needs the parent ("Latin is about 3 weeks behind · Review"), and nothing when all is well.

## Steps
1. Use the existing briefing (late lines, heavy week, unanswered check-in when it's on). Show the single most important item, with one action that opens the right place.
2. When nothing needs attention, show no line (no "All good" filler).

## Done when
- The demo family sees one line with a working action; a family with nothing late sees none.

## Tests
- Web: priority order; the action's destination; empty when nothing is due.
