# S16-09 — Fixes from the Sprint 16 tester
**Source:** `docs/reviews/sprint-16-verification.md` (N1–N5) · **Size:** S
## Steps
1. **N1 (Medium):** the `term-review` smoke scenario expects the S16-05 wording ("BOOKS FINISHED"), so the full smoke round passes.
2. **N2 (Medium):** on phones a Days line never cuts the range: the title truncates first, and the range ("Ch. 19 · finish", "Lesson 32") always shows in full, wrapping under the title if needed.
3. **N3 (Low):** a single child with nothing logged in the range shows "—" for school days, never "0".
4. **N4 (Low, coordinator default pending Will):** Term in review shows one list, **Finished** (every finished assignment), and "Books finished" only as a big number, so no title appears twice.
5. **N5 (Low):** the print summary shows "Books finished" whenever it has data (not only with Totals), and leaves out "Books read" when the child has no typed books (never "None").
## Done when
- Each item is fixed with a test; the full smoke round passes.
