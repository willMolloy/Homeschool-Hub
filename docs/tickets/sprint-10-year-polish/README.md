# Sprint 10 — Year view polish

> **Status: approved to build after Sprint 9** (Will, 2026-11-01: "Sure" to a Year polish sprint after Sprint 9; "See what you can get done on sprint 9 and 10"). Built from the UX expert's mockup: `docs/design/mockups/year-polish.html` (PNGs beside it) and `docs/design/year-polish-notes.md` (measurements). Source review: `docs/design/ux-review-current.md` (improvements 4 and 5, Year drift).

**Coordinator defaults on the UX expert's questions (Will can overrule):**
1. An assignment shared by two children shows under **each** child's group (no "Together" group; no data change).
2. Bars run **through** breaks with the break drawn as a wash over them.
3. "All children" stays first in the shared switch (already decided).

**Flag for Will:** the mockup caps bars at **20 px on a phone (22 desktop)**, down from today's 112 px soft cap, so the difference between light and heavy days becomes gentle (12 → 20 px). It reads much calmer but shows effort less strongly. It is built behind one set of constants (`hMin`, `hCap`, the curve factor) so it can be tuned after Will looks.

Build in order, one commit per ticket, each with `bash scripts/check.sh` green, comparing against the mockup at 360/390 and 1280 px in light and dark. Progress in `docs/progress/sprint-10.md`. Dragging stays off; drag code kept.

| Order | Ticket | Size |
|-------|--------|------|
| 1 | [S10-01 — Sheets sit above the tab bar](S10-01-sheets-above-the-tab-bar.md) | XS |
| 2 | [S10-02 — Lanes grouped by child, badges pinned to lanes](S10-02-lanes-grouped-by-child.md) | M |
| 3 | [S10-03 — Today in a sticky two-line axis](S10-03-today-in-the-axis.md) | S |
| 4 | [S10-04 — Calm bar heights and labels](S10-04-calm-bar-heights-and-labels.md) | M |
| 5 | [S10-05 — Breaks as a wash over the bars](S10-05-breaks-as-a-wash.md) | S |
| 6 | [S10-06 — The edit sheet: date tiles and the pace line](S10-06-edit-sheet.md) | S |
| 7 | [S10-07 — Add assignment: subject picker, child chips, soft day chips](S10-07-add-assignment-pickers.md) | M |
| 8 | [S10-08 — Title row: "+" and the pencil](S10-08-title-row.md) | XS |
| 9 | [S10-09 — Desktop: sidebar, icon rail and side panel](S10-09-desktop-layout.md) | M |
| 10 | [S10-10 — Tester pass](S10-10-tester-pass.md) | S |

Slip rule: S10-09 (desktop) slips first.
