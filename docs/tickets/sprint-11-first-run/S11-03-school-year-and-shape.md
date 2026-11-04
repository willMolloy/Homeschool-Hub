# S11-03 — The school year and its shape
**Size:** M
## Goal
The parent gives the year's first and last day and picks its shape, or leaves it for later.
## Steps
1. First and last day (shared DateField, US style).
2. Shape, as cards: **Fall and Spring** (default; two term views split at New Year, renamable later), **Three terms**, **36 weeks**, **6 weeks on, 1 off**, or **I'll set this later**. Reuse the existing calendar templates (S5) and term views (S7-05, S9-06); a preview line says what it adds ("Adds 3 breaks: …").
3. "I'll set this later" saves nothing and leaves a Home checklist reminder "Set your school year".
## Done when
- Choosing Three terms with Aug 17 – May 21 shows three term views on the zoom row and the template's breaks under Days off; "later" adds the reminder.
## Tests
- Web: each shape applies the same data as the existing template screen; later leaves the reminder.
