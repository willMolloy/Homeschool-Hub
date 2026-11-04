# S12-09 — Sprint 11 leftovers
**Findings:** Sprint 11 re-test N7, N8, N9 (Low); Grok's PR #8 review (N8 is an API gap) · **Size:** XS
## Steps
1. **N7:** at 320 px the setup header text and Sign out fit on one line each (shorter header, or Sign out as an icon button with an accessible name).
2. **N8:** the API can clear a saved school year (`schoolYear: null`); choosing "I'll set this later" after a year was saved asks "Clear the saved dates?" and, on yes, clears them; the Home reminder shows only when no year is saved.
3. **N9:** the icons hint banner is capped to the content width at 1280 px and names what to tap ("Tap an icon in the left column to see the subject's name").
## Done when
- Each item is fixed with a test.
