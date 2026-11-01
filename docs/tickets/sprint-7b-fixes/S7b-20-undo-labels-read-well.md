# S7b-20 — Undo labels read well on a phone

**Finding:** S7b tester N7 and N8 (Low).  
**Depends on:** none  
**Size:** XS

## Goal
The undo bar is readable at 360 px and its grammar is right.

## Steps
1. N7: shorten the week label to "Adjusted week of {Mon D}" (the count goes); let the label wrap to two lines before cutting.
2. N8: the possessive drops the extra "s" after a final s ("Fractions' end").

## Done when
- At 360 px the week label is fully readable; "Moved Fractions' end to Aug 27".

## Tests
- API: the labels. Web: the bar wraps to two lines.

## Out of scope
- Other labels.
