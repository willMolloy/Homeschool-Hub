# S13-01 — "Print sheets" on Schedule · Week
**Size:** S
## Steps
1. A "Print sheets" button in Schedule · Week's header (44 px, printer icon).
2. It opens a sheet: **Week** or **Day** (Segmented); the week (defaults to the week shown) or the day (defaults to today, or Monday of the shown week); children: All children or any mix (the shared ChildSwitch-style chips, multi-select). "Print" opens the browser's print dialog for a print-only page (`/print/week?…` or `/print/day?…`).
3. The print page has no app chrome (no bar, rail or buttons) and a small on-screen "Back" that doesn't print.
## Done when
- The sheet's choices produce the right print page URL; Back returns to Schedule.
## Tests
- Web: defaults, choices, the URL, no chrome in print styles.
