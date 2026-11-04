# Sprint 10 — Year view polish

> **Status: tickets ready (updated 2026-11-03), to build after Sprint 9 and 9b.**
> - Will approved a Year polish sprint after Sprint 9 on 2026-11-01 ("Sure"; "See what you can get done on sprint 9 and 10").
> - DeeDee's decisions of 2026-11-03 (below) add to it and replace parts of the mockup.
> - Built from the UX expert's mockup, `docs/design/mockups/year-polish.html` (PNGs beside it), and from `docs/design/year-polish-notes.md` (measurements).
> - Source review: `docs/design/ux-review-current.md` (improvements 4, 5, 6, 8, 9, 10, and the Year drift).
> - Branch: `hh2/sprint-10`, cut from `hh2/sprint-9b`. Merge `main` into it once the Sprint 9 + 9b PR lands (no force-push).

## Decisions

**Earlier decisions, by Will (2026-11-01):**
1. **A "Together" group.**
   - Under All children, an assignment shared by two or more children shows once, in a Together group at the top, with the children's initials on the bar.
   - With one child selected, it appears in that child's lanes.
   - Each child's load ribbon still counts it.
   - No data change.
   - *Status: decided, not built.* Today a shared assignment is drawn once per child, and only the edit sheet's subtitle names every child. S10-02 builds it.
2. Bars run **through** breaks, with the break drawn as a wash over them (S10-05).
3. "All children" stays first in the shared child switch. This was already decided, and UX review improvement 8's "Frank · Margaret · Both" order is not adopted.

**Decided by DeeDee, 2026-11-03:**
1. **Bar height (S10-04).**
   - Always dynamic, so effort shows at every zoom, clamped between a minimum and a maximum.
   - Scaled to the current view: with one child, that child's heaviest load is the maximum; under All children, the heaviest across all children is.
   - The minimum, the maximum and the curve are named, tunable constants, so values can be tried on real data.
   - This replaces the earlier "Flag for Will" about the mockup's 20 px phone / 22 px desktop cap.
2. **Subject colours (S10-11, S10-12).**
   - Every subject gets its own auto-assigned colour, from a palette grown from 8 to 12 soft hues that meet AA in light and dark.
   - A parent can change a subject's colour from a small swatch row in its edit sheet.
   - Colours repeat only beyond 12, and the icon badges tell those apart.
   - Includes Art moving to coral (year-polish-notes decision 9) and UX review improvement 9: drop the subject colour dot, and make "Show archived" a switch.
3. **Desktop layout (S10-09, S10-16, S10-17, S10-18).**
   - Navigation:
     - a bottom bar under 600 px;
     - a compact 80 px icon rail at 600 px and up;
     - no labelled sidebar, and never the bar and the rail together;
     - the same top-level items in both, Set up included.
   - The Year timeline uses the full width.
   - Home, Records, Set up, forms, buttons and segmented controls are capped in a centred column of about 480–640 px.
   - Forms are single-column with labels above. Only short related pairs (start and end date) sit side by side.
   - Home becomes two panes at 840 px and up: the briefing and the Schedule card in the wide pane, Records and the getting-started checklist in the narrow one.
   - The edit sheet becomes a side panel of about 340–412 px that pushes the timeline. It stays open while other bars are tapped, and closes with Esc, × or a click on empty space.
   - No widget dashboard.
   - 24 px margins and gaps on large screens.
   - This replaces year-polish-notes decision 8 (a sidebar at 1024 px and up).
   - References:
     - [M3 navigation rail](https://m3.material.io/components/navigation-rail/guidelines)
     - [M3 canonical layouts](https://m3.material.io/foundations/layout/canonical-layouts)
     - [NN/g web form design](https://www.nngroup.com/articles/web-form-design/)
4. **Week view (S10-13).**
   - The "This week" row's arrows and date range fold into the header row with the Week | Year switch (UX review improvement 8). The arrows keep 44 px targets.
   - Checked on 2026-11-03: S9-02 had not done this.
5. **Untracked gaps, now ticketed.**
   - Set up gets a back link with a 44 px target, and an active item (UX review improvement 10): S10-14.
   - Year badges get a 44 px tap zone: S10-15.
   - The tester (S10-10) must confirm that the 24 px badge finding is closed.

## Conservative calls by the PO

These are defaults made while writing the tickets (2026-11-03). Each can be reversed with a one-line change.

- **S10-04 starting values:**
  - phone 8 → 28 px, desktop 8 → 32 px;
  - curve 1.5;
  - the maximum taken over the whole school year at the current zoom, so scrolling never rescales the bars;
  - a dev-only `?debug=1&bars=min,max,curve` override for trying values.
- **S10-09:** rail items show a small label under each icon, as Material 3 shows. Home's Set up row stays.
- **S10-11:** colours a parent has already stored are not changed. Only new subjects and the demo seed get the new rule.
- **S10-14:** Set up is the active item on Set up screens, because it is now in the bar and the rail. UX review 10 suggested Home.
- **S10-16:** pages are capped at 640 px, and forms, buttons and segmented controls at 480 px.
- **S10-17 and S10-18:** both start at 840 px. The two-pane Home is about 1040 px wide at most, and the side panel is 360 px.

## Carried over from 9b re-test (Low)

The Sprint 9b re-test (`docs/reviews/sprint-9b-verification.md`) passed READY with 7 Low findings. Sprint 9 and 9b were merged to `main` in [PR #4](https://github.com/willMolloy/Homeschool-Hub/pull/4).

| ID | Finding | Where it goes |
|----|---------|---------------|
| R1 | The "Each entry" CSV's School days column adds up to more than the real total, because a day in two entries is in both rows. | S10-19 |
| R2 | A clipped CSV row doesn't say which longer entry it is part of, which the screen does say. | S10-19 |
| R3 | "All children" wraps onto two lines at 320 px on Records and Schedule. | S10-10 checks it. S10-02 and S10-16 may touch the switch. |
| R4 | At 320 px with a long term name, only a weak fade shows that the zoom row scrolls. | S10-10 checks it. |
| R5 | "Your log tracks School days." has a capital S mid-sentence. | S10-19 |
| R6 | At 360 px, the date placeholder ends about 1 px before the calendar icon. | S10-10 checks it. S10-07 restyles the form. |
| R7 | The `s2a-13-settings` smoke scenario is flaky after `axe-2a`. | S10-19 |

## Order

Build in order, one commit per ticket, each with `bash scripts/check.sh` green. Compare against the mockup at 360/390 and 1280 px in light and dark; where they differ, DeeDee's decisions win. Progress goes in `docs/progress/sprint-10.md`. Dragging stays off, and the drag code is kept.

| # | Ticket | Depends on | Size |
|---|--------|------------|------|
| 1 | [S10-01 — Sheets sit above the tab bar](S10-01-sheets-above-the-tab-bar.md) | — | XS |
| 2 | [S10-02 — Lanes grouped by child](S10-02-lanes-grouped-by-child.md) | S10-01 | M |
| 3 | [S10-15 — Year badges get a 44 px tap zone](S10-15-year-badges-44-px-tap-zone.md) | S10-02 | XS |
| 4 | [S10-03 — Today in a sticky two-line axis](S10-03-today-in-the-axis.md) | S10-02 | S |
| 5 | [S10-04 — Bar heights follow effort at every zoom](S10-04-bar-heights-follow-effort.md) | S10-02 | M |
| 6 | [S10-04b — Bar labels that fit](S10-04b-bar-labels-that-fit.md) | S10-04 | S |
| 7 | [S10-04c — 44 px tap zones on thin bars](S10-04c-bar-tap-zones.md) | S10-04 | XS |
| 8 | [S10-05 — Breaks as a wash over the bars](S10-05-breaks-as-a-wash.md) | S10-02 | S |
| 9 | [S10-06 — The Year edit sheet as mocked](S10-06-edit-sheet-as-mocked.md) | S10-01 | S |
| 10 | [S10-07 — Add assignment without browser-default controls](S10-07-add-assignment-without-browser-controls.md) | S10-06 | M |
| 11 | [S10-08 — Title row: "+" and the pencil](S10-08-title-row.md) | — | XS |
| 12 | [S10-11 — Twelve soft subject colours, each subject its own](S10-11-unique-subject-colours.md) | — | S |
| 13 | [S10-12 — Subjects screen cleanup (UX review 9)](S10-12-subjects-screen-cleanup.md) | S10-11 | S |
| 14 | [S10-13 — Week arrows and dates in the Week \| Year row](S10-13-week-header-in-one-row.md) | — | S |
| 15 | [S10-09 — Navigation: a bottom bar or an icon rail](S10-09-navigation-bar-or-rail.md) | S10-01 | S |
| 16 | [S10-14 — Set up gets a 44 px back link](S10-14-set-up-back-link.md) | S10-09 | XS |
| 17 | [S10-16 — A centred content column with single-column forms](S10-16-content-column-and-forms.md) | S10-09 | S |
| 18 | [S10-17 — Home in two panes on wide screens](S10-17-home-two-panes.md) | S10-16 | S |
| 19 | [S10-18 — The Year edit sheet as a side panel on wide screens](S10-18-edit-side-panel.md) | S10-06, S10-16 | S |
| 20 | [S10-19 — Small carry-overs from the 9b re-test](S10-19-carry-overs-from-9b-retest.md) | — | S |
| 21 | [S10-10 — Tester pass](S10-10-tester-pass.md) | all | S |

**Slip rule:**
1. S10-17 and S10-18 slip first. S10-19 can slip with them.
2. Then S10-16.
3. S10-09 and S10-14 stay together; one is not built without the other.

The IDs are kept stable from the 2026-11-01 draft. New tickets are S10-04b, S10-04c and S10-11 to S10-19, so the table order is the build order, not the ID order.
