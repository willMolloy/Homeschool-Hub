# Sprint 6b verification ("now" tickets: a simple This Week)

Tester verification of S6b-01, S6b-05, S6b-06, S6b-07, S6b-08, S6b-09, S6b-10, S6b-12, S6b-13 and S6b-14 in `docs/tickets/sprint-6b-this-week/` at commit 016e8ae, branch `claude/test-coverage-analysis-6dehbu`. S6b-02, S6b-03 and S6b-11 are held and were not tested.
Date: 2026-10-31. No source or test files were changed for this review.

> **Independence note:** This pass was run by a separate tester agent briefed by the same coordinating session that wrote the tickets and directed the build; it is not an independent review by a different person.

## Result: PASS with seven Low findings and no High or Medium. Every ticket meets its "Done when", with small caveats (F1, F2, F3)

- `bash scripts/check.sh`: **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate).
- Counts, labelled from the gate's log: **923 api** (65 files), **825 web** (66 files), **110 db** (17 files), **390 engine** (27 files), and 390 engine in each of the 7 `test:tz` zones.
- Setup: scratch database `hh_tester_dev` (demo seed, login renamed `tester@example.com`), plus two brand-new families (one child each, no subjects, no assignments, no days off): `fresh@example.com` (empty calendar, subject dropdown) and `fresh2@example.com` (Subjects empty-state chips). API :3000, Vite :5173 in dev, Chromium via Playwright at 320, 360, 390 and 1280 px. For the "before" spacing shots I ran a throwaway git worktree at aff7e1a (S6b-06, before S6b-10) on :5174; it is removed. All servers are stopped, the database is dropped.
- Family "today" was Sat 2026-10-31. Nothing was mocked.
- Screenshots: `docs/progress/screens/sprint-6b/`, prefixed `t-`. Full-page shots show the fixed tab bar mid-page; that is a capture artifact. The login endpoint is rate limited (10 a minute), which cost me one rerun.

## Findings

| # | Severity | Ticket | Finding |
|---|---|---|---|
| F1 | Low | S6b-05 | At 320 px the End date field runs 11 px past the right edge, so its calendar icon is clipped |
| F2 | Low | S6b-06 | Above about 80 pages a day every bar is the same height: 100 and 300 a day both draw 96 px, 60 a day draws 94 |
| F3 | Low | S6b-08 | With "New subject…" open, the Subject select keeps showing the old choice; the form's own Add saves under it and drops the typed name |
| F4 | Low | S6b-13 | The same default effort reads "about 40", "about 41" and "about 32 min a day" on three screens |
| F5 | Low | S6b-13 | The subject form still says "Default bar width", and its chips ("Light 15 min") leave out "a day" |
| F6 | Low (observation) | S6b-01 | With the table gone, This Week shows a child's name and "Make an adjustment" and nothing about the week's work |
| F7 | Low (pre-existing, seen on a new screen) | S6b-09 | On a short range the axis labels "30" and "Dec" touch, and the Today line runs through the first lane's name |

### F1 (Low): edit bar End picker is clipped at 320 px
- **Reproduce:** 320 px, Timeline, tap the Math 5 bar. The bar's `scrollWidth` is 331 against 320. The End label is x 176 to 330 and its input x 206 to 331. The date text shows, but the calendar icon is cut off (`t-editbar-320.png`).
- **Expected:** the ticket says nothing scrolls sideways and nothing is off screen at 320, 360 and 390. **Actual:** 360, 390 and 1280 are clean (right edge 344, 374, and so on). The page itself does not scroll (`scrollWidth` 320).
- Why Low: 320 px is the floor, the field still opens by tapping the text, and nothing else in the bar moves.

### F2 (Low): the soft cap goes flat too early to tell a heavy day from a very heavy one
- **Reproduce:** Geography for Frank, five school days each: 100, 300, 500 and 1,500 pages (20, 60, 100 and 300 a day), plus 300 pages on one day. Measured band heights at 390 and 1280 px: **56, 94, 96, 96, 96 px**.
- **Expected:** "no bar passes 96 px" (met), "20 a day exactly as before" (56, met), "100 a day is taller than 60 a day" (met by 2 px). The briefing also asked for 300 to be taller than 100 a day. **Actual:** equal at 96 px (the formula gives 95.9 against 96.0, and the layout rounds to whole pixels). The goal line says "heavier days still look heavier"; that holds only to about 80 a day.
- This follows from the ticket's own formula and constants (knee 56, max 96, scale 40), so it is a tuning question for Will, not a defect. A larger scale constant would spread 60 to 300 a day out.

### F3 (Low): an open "New subject…" field is easy to ignore
- **Reproduce:** Add assignment, pick Math, then pick "New subject…". The select goes on showing "Math" (with nothing selected it shows "Choose a subject…"). Type "Zebra Studies" in "Subject name", do not press its Add, fill the rest and press the form's Add.
- **Expected:** the typed name is used, or the parent is told it was not added. **Actual:** the assignment saved under Math and no subject "Zebra Studies" was made, with no message (`t-newsubject-unadded-save-360.png`). With no earlier choice the form says "Pick a subject." instead, which is safe but does not mention the typed name.
- Why Low: the card shows the wrong subject plainly and it is one edit to fix; the ticket's "Done when" (pick Math or type Nature Study and it saves under it) passes when the inline Add is pressed. If DeeDee tries it, this is where I expect her to slip. I would show "New subject…" in the select while the field is open.

### F4 (Low): one effort, three numbers
- **Reproduce:** demo family. Subjects list: Math "about 40 min a day" (one lesson a day). Assignments card for Math 5 (150 lessons): "about 41 min a day". After "Use the subject's usual" on Math 5: "That's Math's usual: about 32 min a day."
- Each is right at its own pace (a typical day, the card's pace, the form's 0.81 lessons a day), and none is an engine number, so S6b-13's "Done when" is met. A parent comparing screens will still ask which is true. Wording such as "for one lesson a day" on the subject would help.

### F5 (Low): two leftovers in the subject form
- The section is titled "Default bar width (optional)" and the "Normal 30 min" style chips omit "a day", though the Custom field says "Custom minutes for 1 lesson a day". "Bar width" is the old term; the bars' size is their height. No "weight" or "thickness" appears anywhere (see below).

### F6 (observation, expected until S6b-02): This Week is nearly empty
- 360 px: after the check-in card, each child is a name beside "Make an adjustment" and nothing else. S6b-01 asks for this ("keep whatever per-child entry it carried") and S6b-02 fills it. Recorded because of the five-seconds test below.

### F7 (Low, pre-existing): short-range axis and today line
- A new family's first assignment (Nov 2 to Dec 18) draws "30" and "Dec" touching on the axis, and the red Today line passes through the lane's name ("Nature Study"). Not caused by S6b; seen in `t-first-assignment-in-place-360.png`.

## Verified, per ticket

### S6b-01: effort table off This Week. Meets "Done when"
| Case | Result |
|---|---|
| This Week at 320, 360, 390, 1280 px | 0 tables, no "weight", no sideways scroll |
| `?debug=1` (dev build) at the same widths | 2 tables (one per child) |
| Duplicate adjustment (all children plus Frank, same week) | normal view: no engine text; `?debug=1`: "History: two overrides for the same week override-duplicate-week" |

Before and after: `t-thisweek-debug-360.png` and `-1280.png` (the table, as it was) against `t-thisweek-360.png`, `-390.png`, `-1280.png`. I did not try a production build with `?debug=1`; the flag is documented as dev-only and the tests mock it.

### S6b-05: simpler edit bar. Meets "Done when" (except F1 at 320)
| Width | Controls (x, y, w x h) | Result |
|---|---|---|
| 360 | Close 312,602 44x44; Start 16,646 (44 high); End 183,646 (44); Copy 16,698 79x45; More 103,698 78x45 | nothing past 344; bar 153 px tall |
| 390, 1280 | same layout | clean |
| 320 | as above | End input right edge 331 (F1) |

- The bar is Start, End, Copy, More only; no week-step buttons and no date-only Reset. More opens Heavier, Lighter and Reset to original (180x44 each, fully on screen at every width, opening upward). Heavier moved Math 5's effort 20 to 25, Lighter back to 20, and the menu stayed open for the second tap. Reset to original opens a confirm that now says "Its dates, effort and days go back, and its week adjustments are removed" (no "weight").
- Tap outside the menu (the bar's title) closes the menu and keeps the bar; Esc closes the menu, a second Esc the bar. Typing a new End saved (2027-05-21 to 2027-05-14) with undo "Moved Math 5." Copy opens the Add sheet.
- Dragging a bar was not driven by hand; the unit tests cover it.

### S6b-06: soft cap. Meets "Done when"
Heights measured above (F2): 56 for 20 a day (unchanged), 94 for 60, 96 for 100, 96 for 300, 96 for 300 on one day. Nothing passes 96. The row for a one-day 300-page bar is reserved at 96 px, so Frank's Literature lane has a tall empty band beside it (`t-timeline-year-1280.png`); that is the ticket's "rows size to the capped height".

### S6b-07: pace note. Meets "Done when"
| Unit | At threshold | One above |
|---|---|---|
| pages | 60: no note | 61: "That's about 61 pages a day. Is that right?" |
| chapters | 5: none | 6: note |
| lessons | 5: none | 6: note |
| minutes | 240: none | 241: note |

300 pages on 1 day shows the note; 300 pages Nov 2 to Jan 29 does not; changing End toggles it live. Save stays enabled with the note showing and the assignment saved. The note is a quiet `role="note"` paragraph (`t-pace-note-360.png`).

### S6b-08: subject from the form. Meets "Done when" (F3)
- Fresh family, form's select: "Choose a subject…", group "Add a common subject" (Math, Reading, Literature, Writing, Spelling, Grammar, History, Science, Geography, Art, Music, Foreign Language, Bible, PE), "New subject…". No "No subjects yet" hint.
- Choosing Math created it (colour #2f6fb0) and selected it; Math then moved up out of the group. "New subject…" showed "Subject name" and Add. Typing "math" selected the existing Math without a second row. "Nature Study" plus Enter created it (next palette colour #b0482f), selected it and did not submit the form. The assignment saved under it and appeared in the timeline in place of "Nothing planned yet."
- Add several and the Copy sheet (timeline) show the same select. Subjects empty state: "No subjects yet." and an "Add common subjects" group of 14 chips (45 px high at 320 and 360, right edge 302 and 343); tapping Math, Reading, Science added them in turn, leaving the other 11 chips.
- Not tested live: the archived-subject message ("Math is archived. Unarchive it under Subjects.") and the failure message.

### S6b-09: empty calendar. Meets "Done when"
Fresh family at 320, 360, 390, 1280: the picture draws (months Oct to Aug at 360, Oct to Aug at 1280, today line and pill), "Nothing planned yet." under it, "+ Add assignment" in the header, no sideways scroll. Zoom presets work: Fall (Oct, Nov, Dec), Spring (Jan to Jul), This month (October 2026 with arrows), Year. Adding the first assignment replaced the line with its lane. The calendar strip is short (about 60 px) and bare for a family with no days off; that is what the ticket describes.

### S6b-10: tighter spacing. Meets "Done when"
Demo family plus my Geography test bars, before (aff7e1a) against after, at 390 and 1280 (identical layouts at both widths): the timeline is 1,222 px tall before and 1,174 px after. Nearest-bar-below gaps (distinct values, px) before: 6, 9, 18, 21, 25 to 33, then 65 up; after: 4, 7, 16, 19, 23 to 31, then 59 up. No two bars overlap or touch at either width; the smallest gap is 4 px, so rows are at least 2 px apart. The roughly 20 px between subject lanes (16 to 25 here) is the 16 px name row plus the gap, as the progress file says. Shots: `t-spacing-before-*.png`, `t-spacing-after-*.png`.

### S6b-12: week adjustment sheet. Meets "Done when"
- Current week: "Frank · This week · Oct 26 – Nov 1"; each row "This week", stepper "4 lessons", "90 minutes", "3 chapters" (Sprint 6 showed 4.34, 88.89, 3.17). Coming week: "Frank · Nov 2–8"; rows "That week"; stepper group labelled "Amount that week for ...". The amount appears once per row.
- A 10-lesson book that finishes in the second week showed "3 lessons" (the plan has 2.86); "+" went up to the total and a save worked. The ticket's known edge (a rounded figure above the remainder) did not produce an error.

### S6b-13: effort in the parent's words. Meets "Done when" (F4, F5)
- A text, aria-label, title, placeholder and SVG-title search for "weight" and "thickness" found **nothing** on This Week, the adjustment sheet, Timeline (also with a bar selected and More open), Schedule, Kids, Assignments (list, Add and edit forms) and Subjects (list and edit form). The words "Heavy / Very heavy / Heavier / Lighter" remain, which are the parent's own words.
- Presets "15 / 30 / 45 / 60 min a day"; hint "Usually about 150 min a day." for 300 lessons over Nov 2 to Jan 22; after a pick: "The suggestion is about 150 min a day. Use about 150 min". Cards read "150 lessons · about 41 min a day", "300 pages · about 600 min a day", and so on.
- "Use the subject's usual": on Math 5, picking 60 min a day saved an own weight of 37; reopening showed the link; choosing it showed "That's Math's usual: about 32 min a day." and Save stored `weightPerUnit: null`.

### S6b-14: undo labels and warnings. Meets "Done when"
- "Adjusted Math 5 for Frank, week of Nov 2." after saving a coming week; "Removed the adjustment to Science fair project for Frank, week of Nov 2." after "Back to plan". Duplicate adjustments show no engine text on This Week (see S6b-01).

### Tap targets (scripts/README.md)
`CHROME_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome TAP_EMAIL=tester@example.com TAP_PASSWORD=tester-pass-1 node flow.mjs tap-targets` at 360 px: "No undersized controls on the listed screens." (26 screens and dialogs). The script fixes the viewport at 360 and has no 320 option, so at 320 I ran my own measurement on This Week, the adjustment sheet, Timeline, the edit bar with More open, the Add form with New subject, the empty Timeline and the Subjects chips: nothing under 44 px, and one control off screen (the End date, F1). The only other hit is the hidden "Skip to content" link.

## Screen tests (docs/DESIGN_DIRECTION.md)

| Screen | Five seconds | One job | No duplicates | Parent's words | Empty state | Phone first |
|---|---|---|---|---|---|---|
| This Week | Weak: a name and a button (F6) | Yes, plus the last-week card above | Two "last week" cues ("isn't checked in yet" link and the card) | Yes | n/a | Yes at all four widths |
| Timeline | Yes | Yes | Heavier/Lighter now one place (More) | Yes; no weights | Calendar with months, today and "Nothing planned yet." | Edit bar clean except F1 at 320 |
| Timeline edit bar | Yes: Start, End, Copy, More | Yes | Date picker and dragging overlap by design | "Heavier", "Lighter", "Reset to original" | n/a | 44 px, two rows, F1 |
| Assignment form | Yes | Yes | The inline subject Add and the form's Add can be confused (F3) | "15 min a day"; "Usually about N min a day" | Common subjects and "New subject…" | Fits at 360 |
| Subjects | Yes | Yes | None | "Default bar width" (F5) | One-tap chips, 44 px | Yes |
| Week adjustment sheet | Yes | Yes | One amount per row | "This week" / "That week" | n/a | Yes |

## Sprint 6 findings re-run

| # | Result |
|---|---|
| M1 | **Fixed.** Heavier, Lighter and Reset to original sit behind More, fully on screen at 320 to 1280 px, 44 px high. One new Low at 320 (F1) |
| L1 | **Fixed.** A coming week says "That week" (the title carries the dates) |
| L2 | **Fixed.** Whole lessons, pages and chapters, 5-minute steps, one amount per row |
| L3 | **Fixed.** No engine text on This Week; still in the debug view |
| L4 | **Fixed.** Presets say "a day", the hint has no weight, the cards and the subject form speak in minutes, and "Use the subject's usual" works. Residue: F4, F5 |
| L5 | **Fixed.** Labels name the child and the week |

## Sprint 6b decisions (docs/progress/sprint-6b.md)

Agreed: the debug-only table and warnings; removing the date-only Reset; More staying open for Heavier and Lighter; the soft-cap constants and where they apply; keeping `LABEL_ROW_PX` 16; the S6b-09 range rule (only a family with no plans gets the new range); the S6b-08 archived-subject message and chips kept for the visit; "That week" in place of dates; "Removed the adjustment to..." going past the ticket.

Disagree, mildly:
- **S6b-08 "Add" button named "Add subject" while the form's Add saves the assignment** is fine for screen readers but not for a parent; F3 follows from it.
- **S6b-13's three different "min a day" figures for one default** (F4) were recorded as correct at each pace; I would label the subject's figure "for one lesson a day".
- **S6b-09 and S6b-08 were recorded as "not checked in a browser".** I checked both; they work.

## Not verified
- Dragging a bar to move or stretch it by hand, in a real pointer session.
- The archived-subject and failed-create messages on the form.
- A production build with `?debug=1`.
- Check-in related edge cases from the ticket ("Got ahead" past the planned end, reaching the total, an older week) belong to Sprint 6 and S6b-03; I covered only the sheet's finishing-week case.
- Real touch devices; Chromium at phone widths only.
