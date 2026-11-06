# S18-03 — Bars, Days and sheets name the same work
**Finding:** E3 (Medium): for the same week, Week Bars say "chapter 16" / "lessons 24–25" while Days and the printed sheet also show "Chapter 17 · start" / "Lesson 26 · start".  
**Size:** S
## Steps
1. A Week bar's range text covers the same units as that week's Days lines: the first unit worked on that week through the last (e.g. "chapters 16–17 (starts 17)" or "Ch. 16 · finish – Ch. 17 · start"); pick one short, consistent wording and use the shared span helper.
2. Update status's "this week" wording follows the same rule.
## Done when
- For every assignment in a sample of weeks, the Bars range and the union of Days lines name the same units.
## Tests
- Web: Bars range equals the Days/sheet units for a week (uneven paces, a week that starts a chapter).
