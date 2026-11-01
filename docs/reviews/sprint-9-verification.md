# Sprint 9 verification (Schedule and Records: navigation, log setup, typed entries, totals, export)

Tester verification of S9-01 to S9-09 and S9-11 in `docs/tickets/sprint-9-schedule-and-records/`, branch `claude/test-coverage-analysis-6dehbu`, commits 432011d..59d0506. This is S9-10. Date: 2026-11-01. No product or test code was changed; the only files added are this report and 10 screenshots in `docs/reviews/sprint-9/`.

> **Independence note:** This pass was run by a separate tester agent briefed by the coordinating session that wrote the tickets and directed the build. It is not an independent review by a different person.

## Verdict: READY for Will to try, with three things to fix before a family keeps real records. 9 tickets meet "Done when", 1 is partial, none fail; all nine of Will's rules hold; the gate is ALL GREEN

Records does what Will asked. I logged a week for two children by typing it into the app, and the totals match my hand count to the minute. Logging changed nothing in the plan: assignments, check-ins, week overrides, events, days off and the whole-year `/api/plan` output were identical before and after create, edit, delete and undo. The CSV has only the ticked columns, drops empty ones, uses the chosen dates and escapes formulas; the print summary is one page per child; the exact wording is on Records, on the CSV's first line and on every printed page. Nothing scrolls sideways at 320, 360, 390 or 1280 px in light or dark, and axe is clean on every Sprint 9 screen except one small button label. No High findings. The Medium ones are about the attendance number and one silent loss of typed text:

- **N1 (Medium):** two entries for the same child on the same day each count as a school day (Frank shows 6 school days for a 5-day week). Nothing warns.
- **N2 (Medium):** under All children, school days are "the most any one child logged". That is fine when the children learn together, wrong when they log different days, and nothing on screen says which it is.
- **N3 (Medium):** a book title typed in the log form but not added with "Add" is dropped when you press Save, with no message.

Numbers:
- `bash scripts/check.sh` (run once, with `CHECK_LOG` as asked): **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate). Counts from the gate's log: **1043 api** (71 files), **1106 web** (85 files), **140 db** (21 files), **420 engine** (29 files), and 420 engine in each of the 7 `test:tz` zones.
- Tickets: **9 meet** (S9-01, 02, 03, 04, 06, 07, 08, 09, 11), **1 partial** (S9-05), **0 fail**.
- Will's rules: **9 of 9 hold** (table below).
- New findings: **17** (N1 to N17): 0 High, 5 Medium, 12 Low.
- Tap targets at 320, 360, 390 and 1280 px, light and dark: only the 11 known Year badges (24 px wide) are undersized. New: the 30 calendar day cells are 39 px wide at 320 px (N9).
- axe (`flow.mjs axe`, `axe-2a`, and my own run on every Records state): clean except one serious "label-content-name-mismatch" (N10).
- Smoke scenarios: 16 of 20 exit 0; 4 fail because S9-04 removed the native date boxes they type into (N5).
- The flaky `timeline-add.test` was **not seen**: it passed in the gate (10 tests, 4.0 s) and in three more runs on its own (3.3 to 3.6 s). It is slow for 10 tests; that is the most I can say.

## Setup

- Scratch database `hh_s9_dev` (Postgres 16, role hh), API on 127.0.0.1:3000 and Vite on 127.0.0.1:5173 only; no tunnels, nothing exposed, nobody contacted. Chromium through Playwright, plus the repo's Puppeteer scripts pointed at the same Chromium. The database is dropped and the servers are stopped.
- Families: the demo family (`demo@example.com`) and a second copy made with `scripts/smoke/seed-second-family.ts` (`smoke@example.com`: Frank, Margaret, 6 subjects, 20 assignments), which I used for everything that writes, plus the empty family (`empty@example.com`). "Today" was the real Sunday 1 November 2026, so "this week" is Mon 26 Oct to Sun 1 Nov. Year, as Records works it out from the assignments, is Aug 31, 2026 to May 21, 2027.
- Screenshots: 10 in `docs/reviews/sprint-9/` (named in the text). The rest (all widths, both themes, every Records state) are in `/tmp/claude-0/-home-user-Homeschool-Hub/7a240ed6-3fb3-5430-b251-2b10ddef71fc/scratchpad/s9/shots/`, with the CSVs, the print PDF, the before/after plan snapshots and the scripts beside them in `.../scratchpad/s9/`.

## Findings

| # | Severity | Ticket | Finding |
|---|---|---|---|
| N1 | Medium | S9-07 / S9-08 | A second entry for the same child and day counts that day again: Frank shows 6 school days in a 5-day week |
| N2 | Medium | S9-08 | All children: school days are the most any one child logged; understated when children log different days, and unexplained next to summed hours |
| N3 | Medium | S9-07 | A book typed but not added with "Add" is silently dropped on Save |
| N4 | Medium | S9-05 | Home says "on track to finish May 21" on the Schedule card right under "Math 5 will finish about 3 weeks late" |
| N5 | Medium | S9-04 / S9-09 | Four smoke scenarios no longer run: `s2a-14-assignments`, `s2a-15-days-off`, `s2a-hardening` type into native date boxes that are gone; `plan-debug` looks for "2 Nov" |
| N6 | Low | S9-11 | The CSV adds an unticked "Last day" column when any entry is a run; Totals CSV has no date at all |
| N7 | Low | S9-08 / S9-11 | Never-typed fields show as zero: "0 m hours at home" tiles and "Hours at home 0 m" in the print summary |
| N8 | Low | S9-08 | A range holds an entry by its first day only, so a custom range inside a run shows none of it; not stated on screen |
| N9 | Low | S9-04 / S9-07 | 320 px layout: 39 px calendar cells, "m" wraps in the hours boxes, big numbers wrap ("13 h 30 / m", also at 1280), date placeholder meets the icon |
| N10 | Low | S9-06 | axe serious: "Reset Fall to default" button name does not start with its visible text "Reset to default" |
| N11 | Low | S9-06 | A longer Fall or Spring name squeezes the zoom row: "This mo" at 360, Spring and This month off screen at 320 with no cue |
| N12 | Low | S9-07 | A family with no children can open Log but cannot pick anyone: "Pick who this is for." and no way forward |
| N13 | Low | S9-06 / S9-08 | The Fall and Spring defaults differ: Edit zoom views says Spring ends May 23, Records says May 21 |
| N14 | Low | S9-11 | CSV is UTF-8 without a byte-order mark, so Excel may garble accents in names, notes and books (not tried in Excel) |
| N15 | Low | S9-03 / S9-07 | Native-looking bits: the state-laws link is the browser's blue, and "Count as a school day" looks like a checkbox |
| N16 | Low | S9-07 | An entry that is not a school day does not say so in its summary ("Music 30 m · 3 books"), while a weekend run says "0 school days" |
| N17 | Low | S9-08 | After Undo, Records forgets the range and child you had picked (back to Year, All children) |

### N1 (Medium): the same day counted twice
- **Reproduce:** Records, Log. Frank and Margaret (All children), Oct 26 to Oct 30, Math 3 h 30 m. Save. Log again: Frank, Oct 27 only, Science 1 h 15 m (the switch is on by default). Records, This week, Frank.
- **Actual:** "6 school days". Frank logged Mon to Fri and then Tuesday again; each entry adds its own day count per child. The Year, Fall and CSV (School days, Totals) carry the same 6. Margaret, with one extra entry on Saturday Oct 31, also reads 6.
- **Expected:** 5. A parent who logs per subject or morning and afternoon ("log when they can") will inflate attendance, and attendance is what a state record is for. The default is the problem: every entry counts as a school day unless switched off (Will's rule 4).
- **Suggest:** count distinct school days per child (store the dates or an interval, not only a count), or warn when a new entry overlaps a day already logged for that child ("Frank already has Oct 27 counted. Count it again?").
- Both themes; same in the API (`/api/records/totals` returns 6).

### N2 (Medium): All children and school days
- **Reproduce:** with Nov 9 to 11 set as family days off, log Frank on Mon Nov 2 (1 day) and for the run Nov 9 to Nov 13 (counts 2, Thu and Fri), and Margaret on Tue Nov 3. Records, custom dates Nov 2 to Nov 13.
- **Actual:** Frank 3, Margaret 1, **All children 3**, beside hours that are summed (3 h 20 m = 2 h + 1 h 20 m). The family really had school on 4 different days (Nov 2, 3, 12, 13).
- **My judgement of the developer's choice:** sensible as a default for children who learn together (adding would double a shared day, and the main case, one entry for All children, gives the right number). It fails when children log different days, because entries store only a count, so the union of days cannot be worked out afterwards. And it is not visible: "6 school days" next to "13 h 30 m" reads as one family attendance figure. Per-child numbers and every export row are right, so the risk is in the All children tile only.
- **Suggest:** label it ("most days any one child logged") or compute the union from stored dates (this also fixes N1), and show per-child days under All children.

### N3 (Medium): typed book not added is lost
- **Reproduce:** Records, Log. First day Nov 20, For Frank, type "Typed but not added" in Book title, do not press Add, press Save.
- **Actual:** the sheet closes and the entry is saved with `books: []`. No error, no prompt. (Checked in the API: the row has no books.)
- **Expected:** keep or ask. A parent who types a title and presses Save has every reason to think it was saved; this is the one place a typed value vanishes.
- **Suggest:** treat a non-empty Book title as an add on Save (or block Save with "Add this book or clear the box").

### N4 (Medium): Home contradicts itself
- **Reproduce:** the seeded family has nothing late, so make one: Schedule, Week, a Math 5 bar, Update status, Fell behind, pick any value, Save; then a second week of no progress (I used the app's own API, a Fell-behind check-in for the week of Oct 12 at the week's start position). Open Home.
- **Actual:** the briefing line reads "Math 5 will finish about 3 weeks late at this pace." with Review, and the Schedule card directly below says "This week and your year · on track to finish May 21". Screenshot: `home-briefing-vs-on-track-360.png`. The Week view shows the same Math 5 with "Move end to Jun 10, 2027 / Keep May 21, 2027".
- **Why it matters:** this is the same "All done beside needs a quick check" contradiction S9-01 set out to remove (Sprint 8 N9, UX review). The card's subtitle uses the plan end; the line uses the forecast.
- **Suggest:** drop "on track to finish" from the card when a line is showing, or use the forecast for both.

### N5 (Medium): smoke scenarios broken by S9-04
- **Reproduce:** `cd scripts/smoke`, run each scenario with `CHROME_PATH` set and `SMOKE_EMAIL=smoke@example.com`. `s2a-14-assignments`, `s2a-15-days-off` and `s2a-hardening` set values on `input[type=date]` (there are none now; the DateField is a text box), so the form is submitted with empty dates and the "card appears" wait times out after 5 s. `plan-debug` waits for "2 Nov" in the week dates (now "Nov 2").
- **Actual:** 16 of 20 exit 0 (`auth`, `edge`, `engine-version`, `full-flow`, `kids-add`, `kids-edit`, `kids-list`, `login`, `records`, `s2a-12-hub`, `s2a-13-settings`, `s2a-16-events`, `s2a-17`, `subjects-add`, `subjects-edit`, `subjects-list`); the 4 above exit 1.
- **Not a product bug:** by hand, Add days off accepts "11/9/2026", "Nov 10, 2026" and "2026-11-11" and saved a break with the right card. But three of the scenarios that guard the Add forms cannot run, and the S9-09 note says only that `records.mjs` and the tap run were checked. This is Sprint 8's N6 again for a smaller set.
- **Suggest:** type into the DateField (`fill`, then blur) in those scripts; change the "2 Nov" check.

### N6 (Low): the CSV's extra columns
- The CSV gets a "Last day" column whenever any entry in the range is a run (B and A in my runs), though no tick offers it and the sheet says "Date and child are always included". Will's rule is "only the ticked columns"; this one is derived and harmless but unmentioned.
- Totals mode has no Date column at all, so the file does not say which dates it covers (the file name does: `records-2026-10-26-to-2026-11-01.csv`). The sheet's hint still says date is always included.
- **Suggest:** name "Last day" in the hint or fold it into the Date cell; add the range to the Totals file (a "From" and "To", or a second wording line).

### N7 (Low): zeros that were never typed
- Records shows "0 m hours at home" and "0 m hours away" tiles for a log whose entries never typed home or away, and the print summary lists "Hours at home 0 m" and "Hours away 0 m". The CSV correctly drops those columns. A "0" looks like something the parent entered (Will's "we don't want to be responsible for a misentered log"). Same for "0 books".
- **Suggest:** show a dash, or hide a tile and a print line when nothing was typed in the range, as the CSV does. The caption "hours" under "13 h 30 m" also reads "hours hours".

### N8 (Low): entries are placed by their first day
- A run from Mon Oct 26 to Fri Oct 30 does not appear (nor its 5 days) in a custom range of Oct 27 to Oct 28; the range shows only the single-day entry from Oct 27. It is the developer's recorded decision (an entry's hours cannot be split). Nothing on screen says it.
- **Suggest:** one line under the range ("An entry counts in the range its first day falls in") or a note in Export.

### N9 (Low): 320 px layout
- The Log form's calendar (`.date-cal-day`) cells are **39 x 44 px** at 320 px (30 cells for November; 44 at 360 and wider).
- In the Log form at 320 px each hours row wraps its trailing "m" unit onto a second line; "Choose a date" runs into the calendar icon; the child switch wraps "All children" onto two lines.
- Records' big numbers wrap: "13 h 30 m" breaks as "13 h 30 / m" in the tile at 320 and at 1280 (seven tiles in one row), and "2 h 30 m" does too. Screenshots: `log-calendar-320.png`, `records-320-dark.png`.
- None of it scrolls sideways; it is clumsy rather than broken.

### N10 (Low): the reset button's name
- Edit zoom views: "Reset Fall to default" has an accessible name that does not start with its visible text "Reset to default" (axe `label-content-name-mismatch`, serious; WCAG 2.5.3). Same class as Sprint 8 N7. Both themes, 360 and 1280. Every other Sprint 9 screen, including the Log form, the calendar, Export, Log setup, Home and the Update status sheet, was clean.

### N11 (Low): the zoom row and a long name
- After renaming Fall to "Term 1", the row at 360 px reads "Year, Term 1, Spring, This mo" (This month is clipped). With "Autumn semester one of two" at 320 px only "Year" and the name fit; Spring and This month start past the edge (the row does scroll, `overflow-x: auto`, 460 px wide in 227 px, but nothing hints at it). Screenshot: `zoom-long-name-320.png`. A parent can lose the other chips.
- **Suggest:** cap the chip's label width with an ellipsis, or fade the row's end.

### N12 (Low): no children, no way to log
- The empty family sets up its log (it works: Days attended saved, "Nothing logged yet." and Log), but the Log form shows no "For" at all (children are only listed when there is more than one, and a single child is chosen silently), and Save says "Pick who this is for." with nothing to pick and no link to Set up. Screenshot: `log-no-children-360.png`.
- **Suggest:** when there are no children, say "Add a child in Set up first" with a link.

### N13 (Low): Spring's end date
- Edit zoom views offers Spring as Jan 1, 2027 to **May 23, 2027** (the end of the plan's grid); Records' Spring is Jan 1 to **May 21, 2027** (the last assignment's end). Saving the editor with only a rename stores May 23, so renaming moves Records' end by two days. Harmless today (nothing is logged on a weekend that late) but the two defaults should agree.

### N14 (Low): no byte-order mark
- `exportData.ts` builds a plain UTF-8 `Blob`. Excel opens a UTF-8 CSV without a BOM as the system code page, so "José", "Zoë" or an em dash in a note may show as garbage. I did not open the files in Excel; Numbers and Google Sheets read them as UTF-8. A leading BOM (`﻿`) costs nothing, but then a spreadsheet may show it on the first line of the wording, so check that.

### N15 (Low): native leftovers on the log screens
- The "See your state's homeschool laws" link is the browser's default blue (rgb(158,158,255) in dark), unlike the fern links beside it ("Change log setup"). Sprint 8's N11 listed the same family of defaults.
- "Count as a school day" is `role="switch"` but is drawn as a checkbox with a tick, on the Log form; Will asked for a "visible switch". It is visible and labelled; it just does not look like the other switches in Log setup (same control, same look, so this is consistent, only not a switch shape).

### N16 (Low): a "no" is not shown
- Frank's Saturday entry with the switch off lists as "Music 30 m · 3 books · =HYPERLINK(…)". A weekend-only run shows "0 school days". With the switch off the summary says nothing, so a parent scanning the list cannot tell which entries were turned off. Suggest "not a school day" in the summary.

### N17 (Low): Undo resets Records
- Pick This week and Margaret, delete or change an entry, press Undo: Records comes back on Year and All children. The undo itself is correct (Art 45 m restored, the deleted entry back, the plan unchanged), but the page loses where you were.

## Will's rules

| # | Rule | Result | Evidence |
|---|---|---|---|
| 1 | No log field is ever prefilled | **Holds** | Log form opened at 320 to 1280 px, light and dark, before and after 14 entries: every text, hours and minutes box empty (`filled inputs: []`), no child chip pressed, no first day, no books. Only the school-day switch is on, by rule 4. Subjects are listed with blank boxes. Edit shows the entry's own values only. The plan had work for Math 5 that week and nothing leaked in. (N3 is the reverse: typed text lost.) |
| 2 | Logging never changes the plan | **Holds** | `plan-before` and `plan-after` snapshots, compared as JSON: `/api/assignments`, `/api/check-ins/weeks`, `/api/children`, `/api/events`, `/api/blocked-ranges`, `/api/week-overrides`, `/api/plan` for the whole year, and `/api/plan` for the week: all **IDENTICAL** after 4 creates (two children each in one), and again after an edit, a delete and both undos. Only the undo list differs, as it should. |
| 3 | Hours typed as hours and minutes | **Holds** | Two number boxes per subject ("h", "m"), no slider or stepper. Checked: 25 h gives "Hours can't be more than 24 a day"; minutes 75 gives "Minutes are 0 to 59."; minutes -5 gives "Use whole hours and minutes."; 3 h 30 m is stored as 210. |
| 4 | School day by default, with a visible switch | **Holds** | "Count as a school day" is on at open and on every template (also on Days attended and Detailed log), and in Edit. Off gives 0 days (Frank's Saturday entry); a one-day entry counts 1 even on a Saturday (Margaret Oct 31); a weekend-only run counts 0; Mon to Fri with three family days off counts 2; Oct 28 to Nov 3 counts 5. (N1, N16.) |
| 5 | All children, or one or several; stored per child | **Holds** | Chips: All children, Frank, Margaret (several can be pressed). One save with All children gave two rows (`/api/log-entries`: one per child, each with its own 5 days). A child-only entry stays that child's. |
| 6 | Template styles, never a state | **Holds** | Five styles, each tested: the right switches, and the Log form shows exactly those fields. Core and non-core: Math and Literature core, Art non-core, form shows only Hours by subject (plus the school-day switch). No state name anywhere in `apps/web/src` or on any screen. The only mention is the help line and the HSLDA link. |
| 7 | The exact S9-08 wording on Records and every export | **Holds** | Compared by string with the ticket: the Records page, the first line of all five CSVs (each file `first line == wording`), and both pages of the print PDF (found twice by `pdftotext`) are identical to "Made for your state records. It doesn't guarantee your homeschool meets every state requirement; check your state's rules." |
| 8 | CSV: ticked columns, empty ones dropped, chosen dates, escaped | **Holds** | See "Export" below. |
| 9 | Print summary: one page per child | **Holds** | Print preview emulated and saved to PDF at 1280 px: 2 pages (`pdfinfo`), Frank then Margaret, each with totals for the ticked fields, the entries and the wording. Page 1: `print-summary-page-1.png`. (N7 for the zero lines.) |

## Verified, per ticket

### Gate: ALL GREEN
Run once with `CHECK_LOG` set as asked; it ended "ALL GREEN". Counts are in the verdict.

### S9-01 navigation: Meets
- Tabs read Home, Schedule, Records at 320, 360, 390 and 1280 px, light and dark (icons and labels; the active one highlighted). Home has two equal cards, Schedule and Records, then Set up; there is no Track work card.
- `/track` becomes `/schedule?view=week`; `/track?week=2026-10-19` becomes `/schedule?week=2026-10-19&view=week` (query kept); `/timeline` becomes `/schedule?view=year`; `/timeline?zoom=month` becomes `/schedule?zoom=month&view=year`. No screen (Home, Week, Year, Records) contains "Did everything get done", "Track work" or "checked in".

### S9-02 retire the check-in: Meets
- The card, the page and the nudge are gone. Update status works from a Week bar (bar, then "Update status for Math 5", Fell behind, Save: one `PUT /api/check-ins/2026-10-19`, the sheet closes) and from the Year edit bar (bar, More, Update status, As planned, Save: one PUT), at 360 and 1280 px; at 1280 the edit bar and More are clickable (Sprint 8's N3 is fixed). On a Year bar for work that was not planned last week it says "There is nothing to update yet", which is right.
- Nothing else writes a check-in: the requests while logging, editing and undoing were `POST/PATCH/DELETE /api/log-entries` only.
- Observation, not a finding: "Fell behind" cannot go lower than where last week started (typing 5 shows 30), so a family far behind cannot say so in one step. It matches the sheet's help ("lessons 31-35 last week").

### S9-03 log setup: Meets (N15)
- **Done when:** a family picks "Core and non-core hours", marks Math core and Art non-core, and the log form shows exactly those fields: true (Hours by subject for six subjects, nothing else). `log-setup-core-360.png`, `log-form-empty-360.png`.
- Each template sets the switches in the ticket (Days and hours adds a Total hours switch; recorded by the developer). The marks survive swapping templates. The help line and link are as worded; the link opens in a new tab. The subject form has "Core subject: Records can total core and non-core hours separately."
- A new family sees "Set up your log" first. Changing setup later keeps data (my entries stayed visible when I switched templates and came back).

### S9-04 US date field: Meets (N9)
- A walk of Home, Records, Week, Year, all Set up lists and Family settings at 360 px: no ISO date, no "1 Nov" and no `mm/dd/yyyy` box in any text, value, placeholder or label. Dates read "Nov 1, 2026", "Oct 26 – Nov 1" and "Sunday, Nov 1".
- DateField: "11/9/2026", "Nov 10, 2026" and "2026-11-11" all read; "13/45/2026" and "11/9/26" leave the last good date; empty clears; the calendar opens under the field, 44 px tall (39 px wide at 320, N9).

### S9-05 Home briefing line: Partial (N4)
- **Done when** has two halves. A family with nothing late sees no line: true for the demo family, the second family and the empty family. "The demo family sees one line with a working action": **not true of the seed** (no line at all); true once something is late: "Math 5 will finish about 3 weeks late at this pace." with Review, which opens Schedule, Week where that line has "Move end to Jun 10, 2027" and "Keep May 21, 2027". `home-briefing-vs-on-track-360.png`.
- N4 is the card under it.

### S9-06 rename and re-date Fall and Spring: Meets (N10, N11, N13)
- Renamed Fall to "Term 1", Aug 17, 2026 to Dec 18, 2026, Save: the zoom row reads Year, Term 1, Spring, This month; Records' range chips read This week, Year, Term 1, Spring, Custom dates, and Term 1 shows "Aug 17 – Dec 18, 2026" with the same totals. Reset to default restored Fall and its dates and stored `{"custom":[],"hidden":[]}` (no leftover override).

### S9-07 log entries: Meets (N1, N3, N12, N16)
- **Done when:** Mon to Fri for Frank and Margaret with Math 3 h 30 m and Literature 2 h each (Literature stands in for Reading), through All children: two rows, each "5 school days · Literature 2 h, Math 3 h 30 m"; the plan identical afterwards.
- Edit shows the entry's values and sends only what changed; Edit, Delete and Undo work (Delete has no confirm; the bar's Undo is the way back, as recorded).

### S9-08 Records totals: Meets (N2, N7, N8)
- Hand check below. Range chips: This week, Year, Fall (or the family's name), Spring, Custom dates (two DateFields). Empty states: "Nothing logged yet." with Log (new family, `records-empty` in the scratchpad) and "Nothing logged in these dates." (Spring). Hours by subject uses the subject colours; the entries list is newest first.

### S9-09 docs: Meets (N5)
- DESIGN_DIRECTION, ROADMAP, LOCAL_TESTING and README say Home · Schedule · Records; APP_OVERVIEW and SPEC name Records, the typed, never-prefilled, separate-from-plan rule and the S9-08 wording. Track work remains only in history lines. `records.mjs` runs and finds no problems. See N5 for the scenarios S9-04 broke.

### S9-11 export: Meets (N6, N7, N14)
- See "Export" below. **Done when:** Fall for Frank with only school days and core/non-core hours: the CSV is `Date,Last day,Child,School days,Core hours,Non-core hours`; the note "=HYPERLINK(…)" exports as `'=HYPERLINK(…)`; the print preview is one page per child.

## Hand check: a week for two children against Records

Entries I typed (Log form, 360 px, light; setup: core and non-core hours, school days, home/away, notes, books; core = Literature and Math): 

| Entry | Who | Dates | School day | Typed |
|---|---|---|---|---|
| A | All children | Mon Oct 26 to Fri Oct 30 | on | Math 3 h 30 m, Literature 2 h, note "Week one", book Treasure Island |
| B | Frank | Tue Oct 27 | on | Science 1 h 15 m, books "treasure  island" (spacing differs) and The Hobbit |
| C | Margaret | Sat Oct 31 | on | Art 45 m |
| D | Frank | Sat Oct 31 | **off** | Music 30 m, note `=HYPERLINK("http://evil.example","click")`, books `@SUM(1+1)`, `+cmd`, `-2+3` |

My arithmetic against Records (This week, Oct 26 to Nov 1), then what the page showed:

| | School days | Hours | Core | Non-core | Books |
|---|---|---|---|---|---|
| Frank, by hand | 5 + 1 + 0 = 6 | 5.5 + 1.25 + 0.5 = 7 h 15 m | 5 h 30 m | 1 h 45 m | 5 (Treasure Island once) |
| Frank, Records | **6** | **7 h 15 m** | **5 h 30 m** | **1 h 45 m** | **5** |
| Margaret, by hand | 5 + 1 = 6 | 5.5 + 0.75 = 6 h 15 m | 5 h 30 m | 45 m | 1 |
| Margaret, Records | **6** | **6 h 15 m** | **5 h 30 m** | **45 m** | **1** |
| All, by hand | max(6, 6) = 6 | 13 h 30 m | 11 h | 2 h 30 m | 5 |
| All, Records | **6** | **13 h 30 m** | **11 h** | **2 h 30 m** | **5** |

Math 7 h, Literature 4 h, Science 1 h 15 m, Art 45 m, Music 30 m under All children: also right. Year and Fall show the same figures; Spring shows "Nothing logged in these dates." The numbers add up exactly; the 6 is the double-counted Tuesday (N1). Counting rules checked on a second week: a run Nov 9 to 13 with Nov 9 to 11 off counts 2, a weekend-only run counts 0, a run from Oct 28 to Nov 3 counts 5. `records-all-children-week-360.png`.

## Export

CSVs downloaded through the sheet (files in the scratchpad), dates left as set or typed:

| Run | Result |
|---|---|
| Frank, Fall (Aug 31 to Dec 31), only School days and Core and non-core ticked, Each entry | `Date,Last day,Child,School days,Core hours,Non-core hours` and three rows (5 / 5.5 core; 1 / 1.25 non-core; 0 / 0.5 non-core). Home/away, notes and books were untouched by the ticks and are absent. |
| All children, Oct 26 to Nov 1, everything ticked, Each entry | 5 rows; the subject columns that have data (Literature, Math, Science, Music, Art), Total, Core, Non-core, Notes, Books. **No home or away column**, because nothing was typed (rule: empty columns dropped). |
| Same, Totals | `Child,School days,Literature (hours)…,Books read`; Frank 6 days, 7.25 h, core 5.5, non-core 1.75; Margaret 6, 6.25, 5.5, 0.75. Notes is not offered in Totals. |
| Oct 27 to Oct 27 | one row (Frank's Tuesday); columns shrink to `Date,Child,School days,Science (hours),Total hours,Non-core hours,Books read`. The other children and days are out. |
| Backwards dates (To before From) | the sheet says "Pick the dates and at least one child." and both buttons are disabled. |
| A range with nothing in it | the hint says only the header would be written; the file is the wording and `Date,Child`. |

Escaping: the note cell is `"'=HYPERLINK(""http://evil.example"",""click"")"` (a leading apostrophe, then quoted), the books cell `'@SUM(1+1); +cmd; -2+3`; a cell that starts with `-` or `+` alone gets the same apostrophe (rule in `csvCell`). Numbers are never touched. Stored data is raw: the app shows the note as typed. The first line of every file is the wording. Hours are decimal (3.5), dates ISO (2026-10-26) so a spreadsheet reads them (documented). Print summary: 2 pages for 2 children, in line with the ticket.

## Browser sweep

For each of 320, 360, 390 and 1280 px, in light and dark (4 x 2 = 8 runs), on Home, Records, Records scrolled to the bottom, the Log form, the Log form's calendar, Export, Log setup, Schedule Week and Schedule Year:
- **Sideways scroll:** none anywhere (`scrollWidth - clientWidth` 0 on every one of the 72 screens).
- **Tap targets (44 px):** the repo script `flow.mjs tap-targets` at 360 and 320 (demo family), and at 360, 390, 1280 and 320 with `TAP_EMAIL` set (the second family: Records with data, event form): each ends with only the 11 Year badges. My own run over the Log form, calendar, Export sheet and Log setup (the script does not open those): only the 30 calendar cells at 320 (N9) and the known badges. The "Skip to content" link measures 107 x 23 but is off screen until focused.
- **axe:** `flow.mjs axe` on the demo family: clean on login, Home, Records, Week, Year, Set up, Children and Subjects (and their edit forms). `axe-2a` with the second family: clean (it reports two 401 console messages from the sign-out step). My run over Home, Records, the Log form, the calendar, Export, Log setup, Week, Week sheet, Year and Edit zoom views, at 360 and 1280 px, light and dark: clean except N10.
- **Screen tests (DESIGN_DIRECTION):** Home passes the five-second test (greeting, one line only when something needs you, two cards). Records has one job and one main action (Log), with Export and totals secondary; its words are the family's own (hours and minutes, subject names). Duplicates: Update status exists on a bar and in the sheet's rows (fine). Empty state: a new family sees Set up your log, then "Nothing logged yet." with Log; N12 for a family with no children. Phone first: 360 px works one-handed; N9 at 320.
- **Dark mode:** every Records state reads cleanly (`records-320-dark.png`); the exceptions are the link colour (N15).

## What Will should look at first

1. **Records on a phone, with a week of your own entries** (`records-all-children-week-360.png`). Log Tuesday twice for one child and watch "school days" go up (N1), then compare All children with a day each for the two children (N2). These are the numbers a state would see, so decide how a day should count.
2. **Type a book and press Save** without pressing Add (N3). Nothing warns you.
3. **Home with a late assignment** (`home-briefing-vs-on-track-360.png`): the line and the card disagree (N4).
4. **Export, then print**: open `export-sheet-360.png` and `print-summary-page-1.png`. The CSV is just what you tick; "=HYPERLINK" is safe; the printed page is clean. The zero lines (N7) and the extra "Last day" column (N6) are the only things I would change.
5. **Rename Fall to something long** at 320 px (N11) and open the Log form's calendar at 320 (N9). Small, but you will notice them first.
