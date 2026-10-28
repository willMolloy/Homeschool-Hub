# T-03b — This Week: "Make an adjustment" and a calmer page

**Source:**
- DeeDee's hand test, which asked for a "Make an adjustment" button for each student on This Week.
- The design principles: simple and calm, only what's essential, progressive disclosure.
- The product owner's This Week cleanup of 2026-10-28.

**Depends on:** T-01b (pastel tokens), S2b-25/27 (check-in card and past weeks)  
**Size:** M

## Goal
The This Week page (the app's "Plan" page, at `/`) shows the week, a small week switcher and the check-in prompt, and nothing a parent doesn't need. Each student has a button that opens their adjustments in a sheet. The sheet is a bottom Drawer on phones and a Dialog on wider screens, and it uses the same controls as the last-week card.

## Context
- The API takes check-ins only for **finished** weeks (`resolveWeek`: 400 for the current or a later week), and a PUT replaces that whole week.
- The page today has:
  - a "Debug view (temporary)" heading and note
  - a "Plan as of" date field and a "today (…)" line
  - weight markers with a legend
  - an engine footer
  - Prev/Next buttons, and a separate "Review a past week" list
- Check-in rows have borders and always show the chips, slider and number field.

## Steps
1. **One week state for the page.** `useShownWeek()` reads and writes `?week=`, defaulting to the family's today. It also says whether the week is finished.
2. **Week switcher** (`WeekSwitcher`), one small control in the page header: ‹, the week range, ›.
   - It replaces Prev/Next and "Review a past week".
   - Going back to a finished week is how a past week is reviewed.
3. **Cleanup of the plan view.** The tables lose their outer border too.
   - `PlanDebugView` takes the week as a prop, and a `debug` flag.
   - These show only with `debug`: the heading and note, "Plan as of", the today line, the weight markers and legend, the warning codes and the engine footer.
   - The page passes `debug` only in a dev build with `?debug=1`.
   - Table row borders are replaced by spacing.
4. **"Make an adjustment" for each student.** The plan view takes a per-child action slot. The page fills it with a button for each active child, shown even for a child with nothing planned.
   - The button opens `ResponsiveSheet`: a Base UI Drawer (bottom) under 640 px, and a Base UI Dialog from 640 px.
   - It adjusts **the shown week when that week is finished, otherwise last week**, the latest week that can take a check-in. The sheet's title names the child and the week.
   - Inside is the last-week card in edit mode, with no frame or header of its own, filtered to that child.
   - Saving sends that child's rows, plus every other child's stored rows unchanged. The PUT replaces the week, so nobody else's check-in is lost.
   - Each row sits on its subject's pastel (`--tl-subject-N-pastel`), with slots dealt as on the timeline.
   - "Later check-ins still apply" shows only when a later week has check-ins.
5. **Collapsed check-in rows.**
   - Each row is one tap target showing the assignment and its state ("✓ Done as planned", or where the child got to).
   - Tapping it reveals what was planned, the chips, the slider and the number field.
   - A row with an error opens by itself.
   - There are no row borders, only spacing.
6. **Quiet Skip.** It is smaller and muted, and still says "Skipping counts as done" on hover.

## Done when
- [x] Each active child has a "Make an adjustment" button. It opens a Drawer under 640 px and a Dialog from 640 px, titled with the child and the week.
- [x] The sheet shows only that child's rows. Saving keeps other children's stored rows, and the PUT goes to the week shown, or to last week when the shown week isn't finished.
- [x] The sheet's rows use the subject's pastel token.
- [x] One week switcher in the header changes the week. There are no Prev/Next buttons and no "Review a past week".
- [x] Without the debug flag, the page shows none of: the debug heading or note, "Plan as of", the today line, the weight markers or legend, warning codes, or the engine footer.
- [x] Check-in rows start collapsed (the assignment and its state), open when tapped, and have no borders.
- [x] Skip is a quiet link.
- [x] **Only what's essential:** no helper text, badges or borders added; each control appears only when it's relevant.
- [x] `bash scripts/check.sh` is green.

## Tests
- `test/this-week.test.tsx` (new) covers:
  - the header: the title and the switcher, with no Prev/Next, no "Review a past week" and no debug text
  - `shownWeek`: the shown week once it's over, otherwise last week
  - one button per active child, with nothing fetched until it's tapped
  - Dialog on wide screens and Drawer on phones (`matchMedia` stubbed), titled "Frank · Oct 19–25"
  - only that child's rows: collapsed, with pastel tints, and no prompt buttons or header
  - the merge on save; a past shown week; a skipped week saving as reviewed
  - the later-check-ins note, and a sheet save refreshing the page's last-week prompt
  - a child with nothing planned still getting the button
  - `forChild` and `withOtherChildren`
- `past-week-review.test.tsx` is removed; its behaviours are ported to the sheet above.
- `last-week-card.test.tsx` and `checkin-absorb.test.tsx` are updated for collapsed rows, through a `helpers/checkin.ts` `openRows()` helper. They also check that rows open from the keyboard and that an added row opens by itself.
- `plan-debug.test.tsx` adds `?debug=1` for the debug items, and has a new parent-view test where they are absent. The switcher replaces Prev/Next.
- `engine-version.test.tsx`: the version shows with the flag, and parents get an empty footer.

## Decisions (conservative calls)
- **"Engine footer" means the app footer's "Engine 0.6.0".** It shows only with the debug flag. The plan's own "Engine …, as of …" note is debug-only too. The engine-mismatch banner (S1-37) stays for everyone, because it tells a parent to reload.
- **The sheet hides the card header**, including the "(reviewed)/(skipped)" status. The sheet title already names the child and the week. In edit mode, Save is enabled from the start, as in S2b-27: re-saving unchanged is allowed.
- **Pastel tint** is set as the custom property `--checkin-row-tint` on the row, and CSS paints it. Assignments the sheet can't map to a subject stay untinted.
- **A save in one card refreshes the other check-in cards on the page,** through the existing `checkInsVersion` signal. After a sheet save, last week's prompt goes away without a reload.
- **The debug flag** (`src/lib/useDebugFlag.ts`) needs a dev build and `?debug=1`, so a production build never shows it. `?asOf=` is read only with the flag.
- **The page keeps its name** ("Plan", at `/`). The tests and the nav rely on it, and renaming is out of scope.

## Out of scope
- The timeline itself (T-04).
- Ending an assignment a week earlier or later from the sheet (T-07).
- Check-ins for the current week, which the API doesn't take.
- Renaming the "Plan" page or nav item.
