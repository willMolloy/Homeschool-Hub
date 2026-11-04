# S11b-01 — Back remembers the year's shape
**Finding:** N1 (Medium) · **Size:** S
## Goal
Going Back to step 4 shows the shape the parent chose, and Continue without changes changes nothing.
## Steps
1. Store the chosen shape with the school year on the family (alongside `school_year_start/end`), or derive it reliably; step 4 pre-selects it on Back and in `?only=year`.
2. Continue with the same shape and dates is a no-op (no views or breaks added or replaced). A different shape replaces the earlier shape's term views; its breaks follow the existing rule (no duplicates).
## Done when
- Three terms → Back → Continue leaves Term 1/2/3 and adds no Fall/Spring views; 36 weeks or 6-on-1-off → Back → Continue adds nothing.
## Tests
- Web/API: pre-selection on Back for each shape; unchanged Continue sends nothing; changed shape replaces views.
