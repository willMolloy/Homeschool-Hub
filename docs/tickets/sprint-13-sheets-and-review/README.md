# Sprint 13 — Printable sheets and term in review

> **Status: approved, building** (Will, 2026-11-05). Was: planned, after Sprint 12 (order agreed by Will, 2026-11-05). Decisions: `docs/progress/decisions-2026-11-04.md` and ROADMAP "Order of work after Sprint 10", item 3. One branch for the sprint, PR after its tester passes.

## Decisions (Will, 2026-11-04)
- **Printable work sheets, weekly and daily, are a parent feature.** The parent prints them; children never use the app (no student view, no child logins).
- Pick a week or a single day, and one, several or **All children**; **one page per child**. No family overview page for now.
- Each sheet: subject, assignment and the range for that week or day ("Treasure Island · pages 120–150"), paper checkboxes, and a notes line. **No minutes.**
- **Term in review:** one card image per child for a term or the year: assignments marked finished (Sprint 12), books read, time by subject, school days, each shown only if the family tracks it. **No favourite book, no parent note, no invented numbers.** Saved as an image or printed; no public link.

Build in order, one commit per ticket, gate ALL GREEN, push after each. Progress in `docs/progress/sprint-13.md`.

| # | Ticket | Size |
|---|--------|------|
| 0 | [S13-00 — Sprint 12 follow-ups (one-tap Yes, finished early adjusts the schedule, stopped label at 320 px)](S13-00-sprint-12-follow-ups.md) | S |
| 1 | [S13-01 — "Print sheets" on Schedule · Week](S13-01-print-sheets-entry.md) | S |
| 2 | [S13-02 — The weekly sheet](S13-02-weekly-sheet.md) | M |
| 3 | [S13-03 — The daily sheet](S13-03-daily-sheet.md) | S |
| 4 | [S13-04 — Term in review: the numbers](S13-04-term-review-numbers.md) | S |
| 5 | [S13-05 — Term in review: the card](S13-05-term-review-card.md) | M |
| 6 | [S13-06 — Docs and smoke scenarios](S13-06-docs-and-smoke.md) | XS |
| 7 | [S13-07 — Tester pass](S13-07-tester-pass.md) | S |

Before S13-05, the coordinator asks the UX expert for a one-card mockup (light and dark, phone width), so the card is built once.
