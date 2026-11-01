# UX review of the current screens (Sprint 8b)

Written 2026-11-01 from screenshots only (10 screens, each at 390 px light, 390 px dark and 1280 px light). I compared them with my mockups in `mockups/soft-paper.png` and `mockups/soft-paper-year-badges.png`, and with `../DESIGN_DIRECTION.md`. Will's correction (the two jobs are **Schedule** and **Records**) is taken as given.

## 1. Verdict

The shell is now a calm, modern app. Home, Schedule · Week, Set up and the check-in sheet would sit comfortably next to Things 3 or Headspace: a warm cream page, a confident serif, soft pastel bars, one green accent and a real dark mode. It is not there yet, because three things still read as "2013": the **forms** (native selects, checkboxes and `mm/dd/yyyy` date boxes in Add assignment and the Year edit sheet), the **underlined link** used as a status message on Schedule · Week, and the **Year view**, where thick, uneven blobs and lane badges that don't line up make the best idea in the app the hardest screen to read. Desktop is a stretched phone. Fix those four and the app earns the "highly regarded" bar. The structure needs Sprint 9 either way.

## 2. Drift from the mockups

| Where | Mockup | Built | Better or worse |
|---|---|---|---|
| Home (`01-home-*`) | Greeting by name, a one-line briefing pill ("Latin will finish about 3 weeks late · Review"), Track work / Schedule / Set up cards | Same cards, no name, no briefing pill | **Worse.** The briefing was the "one thing that needs you" from the five-second test. The cards themselves match well. |
| Home Track work card | Progress bars with "5 left" | Both bars full, "All done", next to "Last week needs a quick check" | **Worse.** It reads as a contradiction. Moot after Sprint 9. |
| Schedule · Week (`02-*`) | Title + dates + arrows, then Week/Year, then child switch | An extra "This week" heading row, "All children" first, and an underlined link "Last week isn't checked in yet." | **Worse.** The link is the exact pattern the research called dated (§1, item 6), and three stacked control rows push the bars down. The bars themselves match closely: **good.** |
| Track work (`05-*`) | Question card, then last week's bars with round ticks | Question card alone, with the dates shown twice; the bars only appear after "Not quite" (`06-*`) | Neutral. It is progressive, but the page feels empty. |
| Update status (`06-*`) | Chips, a stepper, and an end-date choice | Chips and a stepper; desktop shows a centred dialog | **Better** on desktop. Check that "As planned" doesn't default to "lesson 29" when the plan was 25–30, because that looks wrong. |
| Year (`03-*`) | Thin, even bars; one badge per lane, aligned; "Term 1 / Term 2"; Today label at the top | Tall, swollen blobs of varying thickness; badges float between rows and drift off their lanes (Science); "Fall / Spring"; a loose "Edit"; Today at the bottom; in All children, two "History spine" lanes with no child cue | **Worse.** This is the biggest drift. Thickness now dominates and breaks "visual truth". |
| Year edit sheet (`04-*`) | Start/End as soft tiles ("19 Oct"), "About 20 pages a day · about 40 min", a clear selected outline | Native date inputs in US format, no pace line, a faint selection | **Worse.** The pace line was what made the sheet useful. |
| Subjects (`08-*`) | Icon badge on its pastel | Colour dot **and** icon badge; Math and Art share the same green; native checkbox | Slightly worse: redundant, with a colour clash. |
| Add assignment (`09-*`) | (not mocked) | Native controls throughout; solid dark day chips. Desktop uses a side panel. | The panel is **good**; the controls are the weakest point in the app. |
| Empty Home (`11-*`) | Getting-started checklist | Built as described | **Good.** Rows need a chevron and the next step highlighted. |

## 3. Best-practice check

**Established principles** (HIG, Material 3, WCAG, NN/g):

- **Hierarchy:** strong on Home and Week. Weak on Year, where pill rows, a segmented control, a link and "Edit" all have similar weight.
- **Spacing rhythm:** mostly on an 8 pt grid. The Math row in Subjects wraps its chip at 390 px and breaks the row height.
- **Typography:** Fraunces with Nunito Sans is good and consistent. Year bar labels are about 11 px and truncate ("The…", "Ti…"), which is too small to read.
- **Colour:** one accent, pastels used for meaning: correct. Duplicate subject colours (Math/Art) break the colour-as-identity rule. The solid green day chips are the loudest thing on the form, for the least important field.
- **Density:** Week is right. Year is too dense at 390 px.
- **Touch targets:** the main buttons and tabs are fine. Year bars as thin as 10 px and the "‹ Set up" back link look under 44 px.
- **Navigation clarity:** Set up and Subjects show no active tab and Set up has no back link, so "where am I?" fails there. The tab names will change in Sprint 9 anyway.
- **Native form controls:** inconsistent across browsers, and US dates for a family that writes "1 November" is a localisation bug.
- **Empty states:** Home is good. Track work with no history and Year with no assignments weren't captured, so check them.
- **Dark mode:** well done. Warm near-black, pastels deepened rather than inverted, AA-looking text. The best-executed part of Sprint 8.
- **Desktop:** a 912 px column with a phone tab bar at the bottom, full-width segmented controls and 430 px-wide buttons. Material 3 and HIG both recommend a navigation rail or sidebar at this width.

**My taste** (arguable): the Home mini-timeline is decorative rather than informative; card titles at about 22 px compete with the page title; "All children" should be the last segment, as in the mockup, not the first.

## 4. Top 10 improvements (impact for effort)

| # | Improvement | Size | Where |
|---|---|---|---|
| 1 | Replace the underlined status link with the check-in card (S9-02 moves it anyway) | S | Sprint 9 |
| 2 | Bring back the Home briefing pill: one line, only when something needs attention ("Latin is about 3 weeks behind · Review") | S | Sprint 9 (S9-01) |
| 3 | Custom date field: show "31 Aug 2026" and open a calendar sheet; fix the locale | M | Sprint 9 (Records needs date ranges too) |
| 4 | Year: cap bar height, keep one even thin bar per lane, pin each badge to its lane, put Today at the top, add a child initial when All children is shown | M | Own sprint (Year polish) |
| 5 | Replace native select and checkboxes with a subject picker sheet (icon + name, plus "New subject…") and child chips | M | Own sprint, with #3 if there's room |
| 6 | Desktop: a left navigation rail at ≥1024 px, cap content width for buttons and segmented controls, and a two-column Home | M | Own sprint |
| 7 | Year edit sheet: date tiles plus the "about 20 pages a day · 40 min" pace line; stronger selected outline | S | Sprint 9 if #3 lands |
| 8 | Schedule · Week: fold "This week" + arrows into the header; one child switch; order Frank · Margaret · Both | S | Sprint 9 (S9-02) |
| 9 | Subjects: drop the colour dot, give every subject a unique colour, use a switch for "Show archived" | S | Sprint 9 |
| 10 | Back links and active state: Set up gets a back link and shows Home as active; a 44 px back target | S | Sprint 9 (S9-01) |

## 5. Schedule + Records layout

**Tabs:** Home · Schedule · Records. Set up stays behind a Home card and the family button.

**Home:** greeting, the briefing pill (only when needed), then two equal cards:

```
Good morning, DeeDee
Sunday 1 Nov · Week 9 of 38
( • Latin is about 3 weeks behind     Review )

[ Schedule                         > ]
  This week: 5 lessons each · on track for 21 May
[ Records                          > ]
  41 school days · about 160 hours this year
[ Set up  (small row)              > ]
```

**Schedule · Week:** the check-in is a quiet card *above* this week's bars, shown only on the first visit of a new week while it's on, and gone once answered. When the setting is off it never appears. It is not a banner or a link, and there's no badge on the tab (that would be nagging).

```
Schedule                 < 26 Oct–1 Nov >
[ Week | Year ]   [ Frank | Margaret | Both ]
┌ Last week · did everything get done? ┐
│ (Yes, all done)   (Not quite)        │
└──────────────────────────────────────┘
FRANK'S WEEK
▌The Hobbit   chapters 13–16
▌Math 5       lessons 35–39 …
```

"Not quite" expands the card in place into last week's bars with ticks. No separate page is needed.

**Records:** calm means summaries first, detail on demand, and export as one obvious button. Avoid the table-of-numbers look on phone.

```
Records                         [Export ↓]
[ Frank | Margaret | Both ]
[ This term ▾ ]  1 Sep – 18 Dec

  41          about 160 h        7
  school days hours (est.)      books

ATTENDANCE
  Sep ●●●●●●●●●●●●●●●●●●○   19 days
  Oct ●●●●●●●●●●●●●●●●●●●○  20 days
  (○ = day off / sick; tap a month for days)

HOURS BY SUBJECT (estimated from the plan)
  ▌Literature  ████████░░  48 h
  ▌Math        ██████░░░░  36 h …

BOOKS
  ✓ Treasure Island · finished 24 Oct
  ◐ The Hobbit · in progress
```

Three big numbers in Fraunces, then three sections in subject colours. "Estimated" is shown once, plainly. Export opens a small sheet (CSV · Print summary) carrying the neutral "check your state's requirements" note. On desktop the three sections sit side by side.

## 6. Questions for Will

1. Do you want the **Home briefing pill** back? It is what makes Home answer "what needs me".
2. **"Fall / Spring" or "Term 1 / Term 2"?** The mockup used terms. Records date ranges should use the same words.
3. Is a **Year polish sprint** (items 4–6) acceptable straight after Sprint 9, ahead of accounts and hosting?
4. **Dates:** "1 Nov 2026" (UK style) everywhere, or follow the device locale?
