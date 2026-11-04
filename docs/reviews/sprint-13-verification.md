# Sprint 13 verification (print sheets and term in review)

This is the tester pass for Sprint 13, ticket S13-07. It covers S13-00 to S13-06 (commits 7fe8ea5..68674c8) on branch `claude/test-coverage-analysis-6dehbu` at 68674c8. Date: 2026-11-04 (the machine's date, which is the app's "today").

I changed no product code, test code or scripts. This report and the ten small screenshots in `docs/reviews/sprint-13/` are the only files I added.

> **Independence note:** I am a separate tester agent and did not write the Sprint 13 code. The same coordinating agent briefed me and wrote the tickets, so this is not a review by a different person or team.

## Verdict: READY for the PR to main (no High or Medium findings; three Lows and two notes)

Every item on the S13-07 list works in a real browser and in print preview. One-tap Yes saves at once and Undo reverses it. A book finished early ends its bar that day and the weeks after it carry less work. On-time and late finishes keep the planned bar. The sheets print one page per child on Letter and A4, with the ranges matching the Week bars and Update status, no minutes or effort words anywhere, and a white page whatever the device theme. The review card matches the mockup (full, roomy, long list, dark preview). The saved PNGs are 1080 x 1350, opaque, square-cornered and light even on a dark device. Nothing but GETs leaves the page while saving. The gate is ALL GREEN and all 28 smoke scenarios pass, `sheets`, `term-review` and `completion` included.

The findings are cosmetic: two "Stopped" labels can print on top of each other (N1), the review page is cramped on a 320 x 568 phone (N2), and the Records action row got a taller "Term in review" button (N3).

## Numbers

- **Gate:** `bash scripts/check.sh` ended **ALL GREEN** (lint, typecheck, build, db:reset, test, test:tz, db:validate), run once on a clean tree, before anything else was running.

  | Package | Tests |
  |---|---|
  | engine | 437 (and 437 in each of the 7 `test:tz` zones) |
  | api | 1103 |
  | web | 1514 |
  | db | 163 |

  These match the developer's S13-06 counts exactly.
- **Tickets:** 7 of 7 built tickets pass their "Done when" (S13-00 to S13-06). S13-07 is this report.
- **Smoke:** one full round, **all 28 scenarios exit 0** (`auth axe-2a axe-log axe completion edge engine-version full-flow kids-add kids-edit kids-list login new-family plan-debug records s2a-12-hub s2a-13-settings s2a-14-assignments s2a-15-days-off s2a-16-events s2a-17 s2a-hardening sheets subjects-add subjects-edit subjects-list tap-targets term-review`). `sheets` ends "sheets scenario: ok" (week and day, Letter and A4: 2 pages for the 2 demo children), `term-review` ends "term-review scenario: ok", `completion` ends "completion scenario: ok", `new-family` ends "PROBLEMS: none", `tap-targets` ends "No undersized controls on the listed screens". No scenario printed a page error.
  **Disclosure:** my first pass failed `axe-2a`, `s2a-16-events`, `s2a-hardening` (and `kids-edit`) because I did not set `SMOKE_EMAIL=smoke@example.com` (the demo cannot add events, as `scripts/README.md` says) and I reset the database before every scenario, which wipes the "Keyboard Kid" that `kids-add` makes for `kids-edit`. Run with `SMOKE_EMAIL` set, and `kids-edit` straight after `kids-add`, all pass. Not product problems.
- **My own sweeps** (Playwright, Chromium, scripts in the tester's scratchpad, not committed):
  - print dialog and print page: 8 combinations (320, 360, 390, 1280 px, light and dark): no sideways scroll, no control under 44 px, axe 0 violations, white page, no app chrome, `.no-print` hidden in print media, Back returns to the week. **0 problems.**
  - review page: the same 8 combinations: no sideways scroll, no control under 44 px, axe 0 violations, preview dark on a dark device and light on a light one, arrows and Back work. **0 problems** (N2 and N3 are layout points those checks do not measure).
  - page errors across everything: 0.
- **Findings:** 0 High, 0 Medium, 3 Low (N1, N2, N3), 2 notes (N4, N5).

## Setup

- Postgres 16 (role hh/hh) on 127.0.0.1:5432, scratch database `hh13_dev` (migrated, seeded with `db/demo.ts --no-serve` and `scripts/smoke/seed-second-family.ts`). **The database is dropped at the end** (only `hh_dev` remains).
- API on 127.0.0.1:3000 and Vite on 127.0.0.1:5173, both on loopback only; both stopped afterwards. Nothing was exposed and nobody was contacted.
- Browser: Playwright's Chromium (`/opt/pw-browsers`); the smoke scripts ran with `CHROME_PATH` set to the same binary and `SCREENS_DIR` outside the repo. Axe-core from `scripts/smoke/node_modules`. `pdftoppm` turned `page.pdf()` output into the black-and-white page images. Nothing installed.
- Test data went through the app's own API on `smoke@example.com` (the demo data under another login): a third child (Theo) with two assignments, a Frank-only day off (Nov 5, "Dentist") and one with no label (Nov 6), nine extra assignments to make a busy week, a log set-up with 20 days for Frank (9 books) and 30 days for Margaret (27 books), 18 finished assignments for Margaret, three for Theo, and a fourth child (Zed) with nothing, archived later.

## Ticket results

| Ticket | Result | Evidence |
|---|---|---|
| S13-00 One-tap Yes, finished early, stopped at 320 | **Pass** (N1 beside it) | Details below |
| S13-01 Print sheets entry | **Pass** | 44 x 44 px printer button; dialog defaults and URLs right; no chrome on the print page; Back works |
| S13-02 Weekly sheet | **Pass** | One page per child on Letter and A4; ranges equal the Week bars and Update status; breaks labelled once; no minutes |
| S13-03 Daily sheet | **Pass** | Only that weekday's work; "Nothing planned for ..." on days off and weekends |
| S13-04 Term in review: the numbers | **Pass** | Card numbers equal the Records page and `/api/records/totals`; finished list equals the assignments; untracked parts absent |
| S13-05 Term in review: the card | **Pass** (N2, N3, N4) | Matches the mockup; PNGs 1080 x 1350, light on a dark device; print light; nothing uploaded |
| S13-06 Docs and smoke | **Pass** | `sheets` and `term-review` scenarios pass; LOCAL_TESTING checklist matches what I saw |

## S13-00: one-tap Yes, finished early, stopped label

- **One tap:** on Home, the card "Did Margaret finish A Child's Garden of Verses? Ended Oct 30" with **Yes, finished** opens no dialog. The assignment is saved at once (`endedAs` finished, `endedOn` 2026-10-30, the stored end date), the card leaves, and the undo bar reads "Marked A Child's Garden of Verses finished. Undo" (`00-after-yes` check, no screenshot kept). **Undo** puts `endedAs` and `endedOn` back to null and the question returns. The several-waiting list path passes in the `completion` scenario (Yes needs no Save).
- **Finished two weeks early (engine 0.14.0):** `/api/health` reports 0.14.0. For Frank I made three 300-page books starting Oct 26 and finished them through the API:

  | Book | Planned end | Finished on | Plan after | Units placed |
  |---|---|---|---|---|
  | Early | Nov 20 | Nov 4 | last work day **Nov 4**, `end` Nov 4 | 300 before, 112.5 after |
  | On time | Nov 12 | Nov 12 | last work day Nov 12, unchanged | 300, 11 days, same |
  | Late | Nov 10 | Nov 17 | last work day Nov 9, `end` Nov 10, unchanged | 300, 9 days, same |

  Frank's weekly total of planned units went 428 / 298 / 242 (weeks of Nov 2, 9, 16) before to 390 / 223 / 167 after the early finish (the on-time and late ones changed nothing). So the following weeks are lighter. Schedule Year at 390 px draws "Early book" ending on the Today line with its check, while "Ontime book" and "Late book" keep their planned bars (`s13-00-year-finished-early-390.png`).
- **"Stopped" at 320 px:** Margaret's stopped "A Child's Garden of Verses" shows the word "Stopped" at 320 (and "A Child's Garden of Verses · Stopped" at 360 and wider), never a bare dashed stub. A stopped bar with a short title shows "Tiny · Stopped". No sideways scroll at 320 or 360. One case goes wrong when two stopped bars sit close together: see N1.

## Print sheets

- **Entry (S13-01):** the "Print sheets" button is 44 x 44 px at the end of the Week title row. The dialog offers Week | Day; Week defaults to the shown week ("Week of Nov 2", "Week of Nov 9" for the second week I tried); Day defaults to today (Nov 4) when the shown week holds it, else the first day of the shown week (Nov 9). Children: "All children" plus one chip each (shown only with two or more children). A tap from All children picks just that child, chips then add and remove, and picking every child or none goes back to All children. Print goes to `/print/week?week=2026-11-02&children=all&print=1`, or `/print/day?date=2026-11-04&children=<id>,<id>&print=1`. Nothing in the dialog is under 44 px at 320, 360, 390 or 1280, in light or dark (`s13-01-print-sheets-dialog-390.png`).
- **No app chrome:** the print page has no bar, rail or tabs, only a "‹ Back" (to `/schedule?view=week&week=...`) and a "Print" button, both hidden in print media. The page is white on a dark device (`useLightPage`). `window.print` was replaced, so the print dialog was never opened; I called it once from the `print=1` URL and from the Print button.
- **One page per child, Letter and A4** (`page.pdf()`):

  | Case | Children | Letter pages | A4 pages |
  |---|---|---|---|
  | Week, All children | 3 | 3 | 3 |
  | Week, Frank only | 1 | 1 | 1 |
  | Week, Frank and Theo | 2 | 2 | 2 |
  | Week, Thanksgiving week, All | 3 | 3 | 3 |
  | Day (Tue Nov 3), All | 3 | 3 | 3 |
  | Day, Frank only, Thanksgiving Thursday | 1 | 1 | 1 |
  | Day, Margaret and Theo | 2 | 2 | 2 |
  | Day, Saturday, All | 3 | 3 | 3 |
  | Busy week (Frank has 9 extra assignments) | 3 | 4 (Frank flows to 2) | 4 |

  Page sizes are 612 x 792 pt and 595.9 x 842.9 pt. Body type is 11 pt (14.67 px) and nothing is set below 10.5 pt, including in the busy week.
- **Ranges match the app.** For Frank, week of Nov 2: the sheet says Mon chapters 16-17, Wed 17-18, Thu 18, Fri 18-19 for The Hobbit, and the Week bar says "The Hobbit chapters 16-19". Math 5 sheet 39-44, bar 39-44; History spine 34-38 and 34-38; Science 5 30-34 and 30-34; Science fair project 1-6 and 1-6. Update status on The Hobbit says "chapters 13-16 last week", so this week's Monday starts at 16. Day sheet ranges agree with the week sheet's rows (Theo's Math 2 Unit 3: Tue lessons 9-10 on both).
- **Days off and breaks:** Thanksgiving week prints "Thanksgiving break" once under the heading and "Nothing planned this week." for every child. A Frank-only day off ("Dentist", Thu Nov 5) and an unlabelled one (Fri Nov 6) print as "Dentist" and "Day off" once each on Frank's week; his Thursday and Friday rows are gone and Margaret's and Theo's sheets are unchanged (see N5 for a wording note). On the day sheet, Thursday for Frank reads "Dentist" and "Nothing planned for Thursday".
- **No minutes or effort words:** I searched every page's text for min, minute(s), hr, hour(s), easy, hard, light(er), heavy, effort, difficult: **0 hits** on all 8 cases. Piano practice (counted in minutes) shows its days with a box and no number.
- **Paper bits:** each day or assignment row has a checkbox (13 px week, 16 px day) and every page ends with a NOTES area (six ruled lines for a week, seven for a day).
- **Black and white:** I rendered pages in grayscale (`s13-02-week-sheet-letter-bw.png`, `s13-03-day-sheet-a4-bw.png`). Subject colour is only a 3 px left rule; headings, days and ranges are black, so everything reads. The child's colour is a thin rule under the name.
- **Nothing planned:** a Saturday for all three children prints "Nothing planned for Saturday" with the date as the heading ("Saturday, Nov 7").

## Term in review

- **Full-screen page:** the Records "Term in review" link opens `/records/review?range=year&child=all` (the range and child chosen in Records carry over). It is its own page with "‹ Records" (44 px) at the top left and the title, range chips (Year, Fall, Spring), the child switch, the card, "Made on this device. Nothing is uploaded." and **Print 3 pages** / **Save 3 images** in a sticky footer. Back returns to Records.
- **Against the mockup:** the three kinds of card match the mockup closely.
  - Full (Frank: 20 school days, 2 finished, 9 books read, time by subject in four bars with exact times and "63 h in all", Finished and Books read lists): same tiles, bars, badges and lists as `term-review-card-full.png`.
  - Long (Margaret: 30, 19, 27; 9 finished rows then "and 10 more"; 11 book rows then "and 16 more"): same as the long mockup, ends in muted "and N more" and does not shrink or spill (`s13-05-saved-png-margaret-540.png`).
  - Roomy (Theo: three finished, nothing logged): large "3", rows with "Literature · finished Sep 10", and the closing sprig, as in the sparse mockup.
  - Dark: on a dark device the preview is dark (`#1C1A17`), as in the mockup (`s13-05-review-page-dark-1280.png`).
- **Only what the family tracks, never a zero:** I changed the log set-up and re-read the card for Frank:
  - detailed (hours by subject, days, books): tiles, bars, both lists.
  - books only: finished and books read; no school days or time.
  - school days only: the roomy card with the line "across 20 school days"; no time or books.
  - total hours only (no total entered): the roomy card with finished work only.
  - A range with nothing (Spring): the page says "Nothing to show for Frank yet..." and Print and Save image are disabled. With All children, a child with nothing (Zed) gets no card, and a line "Nothing yet for Zed."
- **Numbers match Records:** Frank, Year: Records page "20 school days", "63 h in total", "9 books", bars Science 23 h 15 m, History 18 h 15 m, Math 13 h 15 m, Literature 8 h 15 m. The card shows exactly the same. `/api/records/totals` gives schoolDays 20, totalMinutes 3780 (63 h) and the same nine books. Finished: Frank's list is the two assignments with `endedAs` finished; Margaret's 19 equals the 18 I added plus the demo's "Times tables" (finished Oct 30).
- **Saved PNGs:** the app on a dark device and Chromium's download path: `Frank-2026-27-year-in-review.png`, `Margaret-...` and `Theo-...`: each **1080 x 1350**, RGBA with alpha 255 everywhere I sampled, corners at (0,0), (1079,0), (0,1349), (1079,1349) are the tinted band or the paper colour (square), body pixels `#FAF6EE` (the light card), although the page preview was `#1C1A17`. Print: the printed copy's fill is `#FAF6EE` too.
- **Print:** Letter and A4 give 3 pages for 3 cards, one card per page, light, with no app chrome (`s13-05-print-letter-3-cards.png`).
- **Mark:** "Homeschool Hub" with a leaf, small and muted, at the top right of every card.
- **Child and subject colours:** the bands are Frank blue, Margaret coral and Theo green, and the bars use Science blue, History tan, Math mint and Literature orchid, which are the stored colours. I then changed Margaret's colour and History's colour through the API and the card followed (band tint `#f6e1d4` to `#f1e1e5`, History bar `#F0D6A8` to `#C1D0EA`), and restored them.
- **All children:** one card per child (Zed excluded), "Previous card" and "Next card" buttons, three dots and a swipe (touch, tested through the browser's touch events): left, left, right gave Margaret, Theo, Margaret.
- **Nothing is uploaded:** with the network watched, **Save 3 images** made only two same-origin GETs for the app's own two font files and three `blob:` GETs; no POST, no request to another host. On a touch device the Web Share path handed over three PNGs (`image/png`, 133 to 261 KB) and showed "Shared from this device."; cancelling the share sheet left no download, no request and no message.

## On-screen parts

- **320 / 360 / 390 / 1280 px, light and dark** (sweeps above): the Print sheets dialog, the print page and the review page have no sideways scroll, no control under 44 px and no axe violation. Smoke `axe`, `axe-log`, `axe-2a` and `tap-targets` agree.
- **Tap targets:** the printer button 44 x 44; "‹ Records" 44; the Print and Save image buttons 52 px; arrows 44 x 44; the review dots are not controls.
- **Cosmetic layout points** are N2 and N3.

## Regressions

- **Records, logging, completion question and setup flow:** the `records`, `axe-log`, `full-flow`, `completion`, `new-family` and `s2a-*` scenarios pass. Records totals, Records page numbers and log entries I created through the API match each other and the review card. The completion question's Not yet and We stopped paths still open their date sheets (the `completion` scenario, which passes, answers each way).
- **One visible change in Records:** the action row (see N3).

## Findings

### N1 (Low): two "Stopped" labels can print on top of each other

When two stopped bars sit close together in one lane, the new "Stopped" word for a bar whose name does not fit is drawn outside to the right, straight over the next stopped bar's own label, so the row reads "StTinyr·Stopped". It happens at 320, 360, 390 and (by 6 px) 1280 px. The bars are still dashed and each opens its own edit sheet, so a parent loses only the words, and only when two stopped bars are near each other in the same lane.

Steps to reproduce:
1. Sign in as the demo data under another login (`smoke@example.com`).
2. Add, for Frank, "The Adventures of Tom Sawyer extended edition" (Oct 12 to Nov 27) and stop it on Oct 20, and "Tiny" (Oct 26 to Nov 20) stopped on Oct 28. Use the Home question or `PATCH /api/assignments/<id>` with `endedAs: "stopped"` and `endedOn`.
3. Open Schedule > Year at 320 px (default zoom, All children). Look at Frank's Literature lane: the two labels overlap (`n1-stopped-labels-overlap-320.png`). The text rectangles are x 99-145 ("Stopped") and 108-187 ("Tiny · Stopped") at 320.

Suggested fix: in `placeStoppedWord`, skip the outside-right slot if it would overlap a later label in the same row, and fall back to the left or to no outside word.

### N2 (Low): the review page is cramped on a 320 x 568 phone, and the empty-child line costs room at 390 x 844

At 320 x 568 the sticky footer (note, Print, Save) is 114 px tall and the card is scaled to 200 x 250, so the lower half of the card and the pager arrows sit behind the footer until you scroll the page (`n2-review-320x568.png`). Separately, at 390 x 844 with All children when one child has nothing, the line "Nothing yet for Zed. ..." takes about 60 px and pushes the arrows 29 px under the footer (the page height is 873 against a 844 viewport). Without that line the card and arrows fit at 390 x 844, 360 x 740 and 390 x 664. The ticket says "the card preview as large as fits", and at these two sizes it does not quite. Nothing is lost: scrolling reveals everything, and Print and Save still work.

Steps to reproduce: add a child with no finished work and no log entries; open `/records/review?range=year&child=all` at 390 x 844 and look at the arrows under the card; or open it at 320 x 568 with any family.

### N3 (Low): the "Term in review" button is taller than Log and Export and stretches them

On Records the new link measures 153 x 66 px, while Log and Export are 73 x 45 and 95 x 45 at 320 and 360. At 390 px and wider the three share a row and Log and Export stretch to 66 px high to match, so the row looks heavier than in Sprint 12. At 320 and 360 the link also wraps to a second line alone (`n3-records-actions-320.png`). Nothing is under 44 px and nothing overflows. It looks like the link has more vertical padding than the buttons do.

Steps to reproduce: open Records (log set up) at 390 px and compare the heights of Log, Export and Term in review.

### N4 (note): on a short desktop window the card preview is small

At 1280 x 800 the preview card is 352 x 440 px (a third of the window width), because the height between the chips and the footer sets its size. The card text is about 9 to 13 px on screen. The saved image and the print are full size and unaffected, and a taller window gives a larger preview. Mentioned because "as large as fits" there still leaves a lot of empty space at both sides.

### N5 (note): a one-child day off prints only its name, not which day

Frank's week page shows "Dentist" and "Day off" as two italic lines under the heading, and his Thursday and Friday rows are simply absent. A parent can work it out, but the sheet does not say which day each one is. The ticket asks for the break to be labelled once, which it is; "Thanksgiving break" for a whole week reads fine. Whether to add the day ("Dentist · Thu") is a design call for Will.

### Observed and fine

- **Fall range:** the card says "Fall 2026, Aug 31 - Dec 31, 2026". The mockup said Dec 18 because it used the example family's own term; these come from the family's term views, as the notes say.

## What Will should look at first

1. **Schedule > Week, tap the printer, pick All children, Print** (`s13-01-print-sheets-dialog-390.png`, `s13-02-week-sheet-letter-bw.png`): then Ctrl/Cmd+P and look at the black-and-white preview. Say whether the three-column rows read well on paper and whether you want the day shown for a one-child day off (N5).
2. **Records > Term in review for each child** (`s13-05-saved-png-margaret-540.png`, `s13-05-review-page-dark-1280.png`): flip your device to dark, save an image, and open it. It should be the light card. Compare Margaret's long card with the mockup.
3. **Home with a waiting question:** tap **Yes, finished** once and then **Undo**. Then finish a book that runs later and look at Year (`s13-00-year-finished-early-390.png`): it should end on today's line and the next weeks should have less work.
4. **Schedule > Year at 320 px with two stopped bars near each other** (`n1-stopped-labels-overlap-320.png`): the overlapping words (N1).
5. **Term in review on your smallest phone** (`n2-review-320x568.png`) and **Records' action row** (`n3-records-actions-320.png`): the two cosmetic Lows.

## What I did not check

- A real phone or Safari or Firefox. The saved PNG is drawn from an SVG with embedded fonts onto a canvas, which the developer flagged as Chromium-only checked; I checked Chromium only too. The share sheet was a stand-in object, not a real iOS or Android sheet.
- A real printer and the browser's own print dialog (`window.print` was replaced); I used `page.pdf()` for Letter and A4 and `pdftoppm` for the page pictures.
- Pages of the sheets with very long titles or more than nine assignments in a week (the busy week had nine extras and flowed to a second page for that child, as designed, with every page at 11 pt).
- A family with a term view of its own; the Fall and Spring chips used the defaults.
- One smoke round, with the database reset before each scenario.
