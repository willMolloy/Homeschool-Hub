# S17-06 — Fixes from the Sprint 17 tester
**Source:** `docs/reviews/sprint-17-verification.md` (N1 High, N2 Medium, N3–N5) · **Size:** S
## Steps
1. **N1 (High):** Schedule · Year at a zoom range that starts after a stopped (or finished-early) assignment ended no longer crashes: guard the placement code against an assignment with no pieces in the range, and add tests (a stopped book that ended before the range, at Year, Spring, a custom view and This month; a finished-early book likewise). Check the other timeline helpers for the same empty-list read.
2. **N2 (Medium):** correct `docs/e2e/cm-term-run-2.md` to match the app in the seven places the tester lists (join page wording, children names only and school days at step 3, the "You're all set" page, no hint until a book exists, Add several's single Unit, the CSV import's columns and lack of preview, and how to check Undo from the Year view), and state what Spring shows for Prima Latina at step 3.2 (N5).
3. **N3 (Low):** a join token of any length gets the plain bad-link message (no framework 414 / "check your connection").
4. **N4 (Low):** `/print/week` and `/print/day` with no week or day show a heading and a plain line ("Choose a week to print") so axe is clean.
## Done when
- The Hartley seed's Spring and All children views render; the script matches the app; N3 and N4 fixed; tests for each.
