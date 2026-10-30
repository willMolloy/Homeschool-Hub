# Homeschool Hub: Product Spec

> **Source of truth.** Since 2026-10-30 this file is the canonical spec; the shared Page it was copied from (bb34c3a6) is historical. The current plan, scope and open decisions are in [../ROADMAP.md](../ROADMAP.md); where the two differ, the roadmap wins and this file should be updated.

_The living spec for DeeDee's homeschool app: what it is, what we've decided, the data model, the hub features to add, state requirements research, pricing, and open questions._

## Changelog

2026-10-30

-   The repo copy became the source of truth; the shared Page is historical.
-   Positioning: a steering tool for the year, with a core plus optional modules that make it a full hub (Vision and positioning).
-   Thickness is effort, stored as a weight per unit (1 point ≈ 2 minutes), not minutes per unit. Updated the timeline, data model and v1 engineering decisions to match Sprint 2b. The proposed way parents enter effort is in ROADMAP.md, "Effort".
-   Logging became an optional module. Records (attendance, estimated hours, book list, CSV) are generated from the plan, with no daily input (Low-friction logging).
-   The validation plan and prototype test script are retired with the parent pilot (dropped 2026-10-28). Kept for history.
-   Open questions moved to ROADMAP.md, "Open decisions for DeeDee".

2026-10-28

-   Added DeeDee's logging rule: hour logging is a record-keeping helper that supports a family's own process, never a compliance solution. Added it to Vision and positioning and to Low-friction logging.
-   Reworded copy that overstated logging: hour totals are no longer compared with a state's requirement. 'Compliance packs' and 'compliance percentages' are now record-keeping helpers and totals. The NY quarterly row and paragraph no longer promise the explanation New York requires. The requirements map no longer flags covered subjects or checks thresholds.
-   Hour totals and exports now carry a neutral note: 'A record of logged hours to support your own records. Check your state's requirements.'
-   Earlier today: added a piano debrief question to the prototype test script.

## Vision and positioning

One homeschool hub where the plan and the record are the same data. Parents plan the year on a visual timeline, steer it when life happens, and get their records from the same data, so they never need a second app or spreadsheet.

-   **A steering tool, not a daily to-do app.** A parent sees the shape of the year in seconds and corrects course; nothing in the core needs daily input or tedious entry.
-   **Core plus optional modules.** The core (map, steering, effort, fast setup) is the differentiator and is always on. Optional modules (records, a daily checklist, later templates and more) make it a full hub; they are off by default, read from the plan, and add nothing to the core screens until switched on (ROADMAP.md).

-   Differentiator: a year timeline where bar thickness shows daily workload per subject lane. No competitor in the research shows this.
-   Second differentiator: recurring events that use up part of a day and ask which subjects give way, with a preview before saving.
-   Hub promise: planning, logging, attendance, records, and reports in one place.
-   Logging rule: hour logging is an easy record-keeping helper that supports a family's own process under their state's rules. It is never a compliance solution, and nothing in the app claims to meet or satisfy a state's requirements.

> **Design against the top complaints.** Reviewers' biggest complaints were painful setup, plans that are hard to change mid-year, and weak mobile apps. Every feature here should be quick to set up, editable anytime, and good on a phone.

## Decided design

Everything DeeDee and I have agreed on so far.

### Year timeline

_(Sketch omitted)_

Rough sketch only: thicker bars mean more work per day, the gray band is a break, ticks are Tuesday co-op, and the line at the bottom is total load.

1.  **One colored lane per subject**: Time runs left to right across the school year. Literature might be dark blue, with math, history, and others in their own lanes.
2.  **Mobile shows a zoomable window**: A smaller slice of the calendar that zooms out to the whole year.
3.  **Bar thickness is daily effort**: Units per day (pages, chapters, lessons, or minutes) times the assignment's effort weight per unit, so subjects compare. One weight point is about 2 minutes. The weight comes from the assignment, else the subject's default, else a built-in default per unit type (Sprint 2b).
4.  **Drag and stretch to rebalance**: Move a bar or pull its ends and watch it thin or thicken live. Pulling Treasure Island's end from Mar 15 to Feb 15 makes it thicker.
5.  **Total-load strip**: A strip along the edge sums every lane so heavy weeks stand out without adding bar widths in your head.
6.  **Assignments belong to one or more children**: One read-aloud can cover several kids.

### Recurring events and breaks

1.  **Events like a 3-hour Tuesday co-op**: Also per-child events such as Frank's Friday piano and Margaret's Thursday violin. They show as markers in their own lane.
2.  **How much of the day it takes**: A quarter, half, or full day, or a slider.
3.  **Per-subject toggle: skip, lighter, or normal**: One tap per subject, plus a 'same for all' shortcut. Most people will hit skip all.
4.  **Displaced work spreads across other days**: Bars thicken slightly on the remaining days so end dates hold.
5.  **Preview before confirming**: For example: Treasure Island goes from 5 to 6 pages a day.
6.  **Vacations and breaks grayed out**: Zero capacity across every lane.
7.  **Reminders**: For recurring events, with an optional night-before reminder.

### This Week tab

1.  **Per-child cards plus a family view**: Each card lists that child's expected work and events; the family view shows co-op and shared subjects.
2.  **Concrete expected work**: For example 90 pages of Treasure Island, or math chapters 4 to 7.
3.  **Adjust just this week**: Change 4 math chapters to 1, then choose: thicken the remaining weeks to keep the end date, or push the end date back.
4.  **Same prompt when falling behind**: So the plan never quietly drifts out of date.
5.  **Chapter titles when known**: Optionally paste a table of contents or pick a curriculum template so the week lists chapter titles; otherwise it falls back to page ranges like pages 120 to 210.

### Low-friction logging

> **Now optional modules** (ROADMAP.md, "Optional modules"). The first is **Records**: attendance days, estimated hours, a book list and CSV export, all generated from the plan with no daily input. One-tap check-off becomes a later optional daily checklist. The items below are the original design for logging; the positioning rule still applies to everything.

1.  **One-tap check-off**: Today's scheduled items with expected time prefilled; tap done, or tap and adjust.
2.  **Quick add for unplanned learning**: Subject, duration, and an optional note or photo for a museum trip or nature walk.
3.  **Log once for several kids**: One check-off covers a shared lesson, with each child's own progress (Frank 5 pages, Margaret 3).
4.  **Progress fills the bars**: Logged work shades each bar, showing ahead or behind.
5.  **Hour and attendance totals**: Logged hours by subject and child for any date range. Plain totals only, never compared with a state's requirement.
6.  **Export**: Clean CSV for spreadsheets and a PDF record, filtered by child, subject, and date range.

Positioning rule: a record-keeping helper, never a compliance solution.

-   Logging supports each family's own process with their state's rules. It is useful for policy adherence because it gives clean hours by subject and child, any date range, and clean CSV and PDF exports.
-   Nothing claims the logs meet or satisfy a state's requirements: no 'compliant' badges, no green checks, and no 'you're on track for your state' language.
-   Every hour total and export carries a short neutral note: 'A record of logged hours to support your own records. Check your state's requirements.'

## Core data model

| Entity | Key fields |
| --- | --- |
| Family | `id`, `state`, `timeZone`, `schoolYearStart/End` (local dates), `schoolDays` (e.g. Mon-Fri), `weekStart` (Mon or Sun; the one definition of a week, used by This Week, WeekOverride, and weekly averaging), `plan` |
| Child | `id`, `familyId`, `name`, `birthdate`, `grade` |
| Subject | `id`, `name`, `color`, `laneOrder`, `defaultWeight?` (unit type and weight per unit), `stateCategory` (an optional label the family picks for grouping totals; never used to judge whether a requirement is met) |
| Assignment | `id` (client UUID), `childIds[]`, `subjectId`, `title`, `unitType` (pages, chapters, lessons, minutes), `totalUnits` (native units), `start`, `end` (local dates), `weightPerUnit?` (effort per unit; empty means the subject default, else the unitType default), `lessons[]?`, `templateId?` |
| Lesson | `assignmentId`, `index`, `title`, `units` (from a table of contents or template) |
| RecurringEvent | `childIds[]`, `rrule` (e.g. weekly Tue), `start`, `durationMin`, `capacityFraction` (0-1), `subjectRules{subjectId: skip, lighter, normal}`, `reminder` |
| BlockedPeriod | `id`, `start`, `end` (local dates), `childIds[]` or all, `kind` (vacation, holiday, sick) |
| LogEntry | `id` (client UUID, also the idempotency key for offline replay), `familyId`, `date` (local date), `assignmentId?` (empty for quick adds), `subjectId`, `note`, `photoIds[]`, `kind` (checkoff, session; quick adds are sessions with no assignment), `createdBy` |
| LogChildProgress | `logEntryId`, `childId`, `kind` (checkoff or session), plus `assignmentId?` and `date` copied from the LogEntry so they can be indexed, `units`, `minutes`; primary key (`logEntryId`, `childId`); partial unique index on (`assignmentId`, `date`, `childId`) WHERE `kind` = 'checkoff'. |
| WeekOverride | `assignmentId`, `weekStart` (local date), `plannedUnits`, `mode` (keepEndDate, pushEndDate) |
| StateProfile | `state`, `daysOrHoursByGrade`, `requiredSubjects[]`, `filingDeadlines[]`, `testGrades[]`, `sourceUrl`, `lastVerified`; reference information shown with its source, never used to score or check a family's records |

Per-day load comes from capacity. A day's base capacity is 0 if it is blocked or not a school day, otherwise 1. Each event that day multiplies an assignment's capacity by its rule for that subject: skip is 0, lighter is 1 minus the event's fraction of the day, and normal is 1.

`rate = (remaining units) / (Σ over remaining days d capacity(d))`

Each day's load is the rate times that day's capacity. Weeks with a WeekOverride are fixed and removed from the sum first, and pushEndDate extends the end until the rate fits the old pace. Example with made-up numbers: 300 pages over 60 school days is 5 a day; skipping Tuesday co-op removes about 10 days, so 300 / 50 = 6.

Bar thickness is units per day times the effort weight per unit. Units stay native in the data and in CSV, and the total-load strip sums thickness. The plan assumes scheduled work was done unless a weekly check-in says otherwise (S2b-18, S2b-20); logs do not move the plan. The rate and daily loads are never stored; they are recomputed from these inputs. Attendance, hours, This Week, auto-shift, the student view, and reports are all views over Assignment, LogEntry, and LogChildProgress. Weeks always start on `Family.weekStart`.

Logging has two behaviors. A check-off ("this lesson is done today") is an idempotent upsert keyed on (assignment, date, child), so a double tap from two devices leaves one row. Extra work is a session: each session adds its own LogChildProgress rows, and a day's progress is the check-off plus all sessions summed, so 10 pages in the morning and 5 at night count as 15. Sessions, including quick adds, dedupe only by their client UUID. Changing a log's date (or assignment) updates its LogChildProgress rows in the same transaction, so the copied fields and the index never go stale.

## v1 engineering decisions

_Agreed Oct 27, 2026. The prototype fakes all of this; revisit once parents confirm they read thickness correctly._

1.  **Thickness is effort** (revised in Sprint 2b): every unitType has a default weight per unit (page 1, chapter 10, lesson 15, minute 0.5; 1 point ≈ 2 minutes), overridden by a subject default or the assignment's own weight. Units stay native in the data and CSV. The engine outputs no minutes; estimated hours are derived from thickness in the records module.
2.  **Semantic zoom** (written when thickness was minutes; read "minutes" below as thickness): Detail follows zoom by default. Full-year zoom shows smooth weekly-averaged bars with no day-level notches. Fall or spring zoom and closer shows daily detail: co-op notches and per-day thickness. Event markers (co-op, violin, piano) are thin dark-gray ticks on a light band, named in the label column, and stop at the year end. On a phone at full-year zoom each event strip collapses to a light tinted band with no ticks; ticks appear once zoomed to fall, spring, or closer. An Auto / Daily / Weekly control overrides it, with Auto as the default. Implementation: the same engine daily output, passed through one aggregation function chosen by a zoom threshold (the prototype switches to daily once a day column is at least 8 px wide), so the two views always agree. A weekly value is the week's minutes divided by the number of that week's days with capacity above 0 for that assignment, not by 5, so a week with a skipped co-op Tuesday or a partial break isn't diluted. It is drawn flat across the week's school days, and weekly value times capacity days equals the week's total. The total strip sums the lanes' weekly values. Because each lane uses its own capacity-day denominator (a lane that skips co-op Tuesday divides by 4, others by 5), the strip means minutes on a typical school day, not the true average of the week's total minutes. That was decided deliberately, and debrief mode labels the strip 'Minutes on a typical school day'; test mode keeps 'All subjects'.
3.  **Shared assignments track progress per child**: One shared read-aloud or lesson is one LogEntry with a LogChildProgress row per child (Frank 5 pages, Margaret 3), so each child's bar and records stay accurate.
4.  **One load engine everywhere**: A single pure, versioned module runs on the client and the server, so PDFs, hour totals, and plan percentages match the screen. The engine version guards against a stale PWA service worker computing with old rules. School days are local dates, not timestamps, so a sick day logged near midnight never shifts a day. The rate is never persisted, only its inputs.
5.  **Offline queue that replays safely**: Each LogEntry's client UUID makes replay idempotent. Check-offs are upserts on (assignment, date, child), so the same lesson tapped on two devices is logged once. Sessions and quick adds dedupe by UUID only, so a second reading session or a second nature walk on the same day both count.
6.  **v1 accounts: one shared family login**: Every parent uses the same family account, so conflicts only come from that account's different devices. Keep UUID-idempotent replay and field-level merge (edits to different fields both survive). The notice UI for clashing plan edits, such as one parent's sick-week BlockedPeriod and the other's WeekOverride for the same week, moves to v1.x with co-teacher and second-parent accounts.
7.  **Scope cut: v1 is web and PWA only**: No native app, full offline-first mode, kid logins, separate parent or co-teacher accounts, conflict notices, curriculum templates, or state record-keeping helpers in v1. The rest of the hub list is backlog.

We dropped the normalized-units fallback (thickness as percent of an assignment's total). Percent of total reflects how long an assignment runs, not how much work it is: a 2-week sprint through a thin book would look heavier than a dense 9-month text, so the strip would stop meaning anything.

### Validation plan

> **Retired.** The parent pilot was dropped on 2026-10-28; validation now runs through DeeDee's own use and a friends beta with agreed go-public signals (ROADMAP.md). The plan and test script below are kept for history.

1.  **Clickable prototype**: Year timeline, recurring events, and This Week with fake data for a made-up family.
2.  **Pilot sessions first: 2 people outside DeeDee's circle**: Run the full script twice before the 12, with people who don't know us. Use them to fix confusing wording, broken steps, and tasks that are too easy or too hard, and to tune timing. Pilot data does not count toward the decision rules.
3.  **Test with 12 homeschool parents, mostly strangers**: Hand them the prototype in its default test mode, which hides the explanation of the bars and all minute numbers. Friends and family are too kind to be useful, so recruit mostly people who don't know us.
4.  **One design for all 12: Weekly + Exaggerated**: Every parent sees the same design: Weekly detail and the Exaggerated scale, which is what the prototype shows participants by default. One design keeps all 12 parents behind one result instead of splitting them into arms of 6.
5.  **8 of 12 on real phones**: Phones are the product's promise and where reviewers complained most: 8 phone sessions and 4 desktop. Report phone and desktop separately; a pass on desktop only counts as a fail.
6.  **Normal scale and Daily detail come later**: Test them only if Weekly + Exaggerated passes, with new parents. The 5-week daily zoom isn't needed for this first round; the control stays in the prototype behind the facilitator controls for that later round.
7.  **Success**: They understand bar thickness as workload over time without being told.
8.  **Observe: full year or fall and spring**: Both stay weekly. Note whether parents read thickness better at full-year zoom or after zooming to fall or spring on their own.

-   [Homeschool Timeline Prototype](https://cursor.com/canvas/store-05807489-4c87-496a-9870-4cee453dadd4/0e87cdcf-fec7-4b35-bb34-a468296ae24b) (Page)

### Prototype test script

_From DeeDee's test plan. Run it in test mode; the facilitator switches on Debrief mode only for the debrief._

#### Setup

-   12 parents, mostly strangers, all on one design (Weekly + Exaggerated): 8 on a real phone and 4 on desktop.
-   Before handing it over: tap Reset example, check that it opens on the Year timeline at Full year, nothing selected and no label showing.
-   Today is deliberately set in a quiet week (Wed Sep 16, 2026; This Week is Sep 14 to 18), well before the Treasure Island sprint and the total strip's late-October peak, so the Today line never sits on the busiest spot and doesn't hint at an answer.
-   Test mode is the default: no 'thicker bar' sentence, no Selected panel numbers, and no minutes anywhere until the debrief.
-   Participants see no Debrief toggle and no Scale or Auto / Daily / Weekly controls. Facilitator controls: triple-tap the small 'Example data · proto-0.6' line at the very bottom of the page (three taps within about 1.5 seconds); triple-tap again to hide them, which also returns to test mode, Weekly and Exaggerated.
-   Remote sessions or a phone the parent is holding: you can't tap it yourself, so at the debrief say, word for word, 'Tap the small text at the very bottom three times.' Then ask them to switch on Debrief mode. Don't use this line before the debrief.
-   The prototype also checks for `?facilitator=1` or `#facilitator` in its address, but the kit documents no way to read the page's address and the page runs inside the host's frame, so that may never reach it. Use the triple-tap, and try it once on the test phone before the first session.
-   Record with permission. One person talks and one takes notes.
-   Never say 'thick', 'load', or 'minutes'.

> **Intro, read word for word.** We're testing the app, not you. This is a made-up family and nothing saves. Think out loud. I won't answer questions about how it works yet, but I'll write them down.

#### Tasks

| # | Say | Notes |
| --- | --- | --- |
| 0 | Look at this for 30 seconds, then tell me what you think you're looking at. | Cold read. Don't interrupt. |
| 1 | Which part of the year looks busiest for this family? How can you tell? | Scored |
| 2 | Point to something that would feel like a lot for Frank. | Scored |
| 2b | Which week would you lighten first? | Scored. Watch whether they pick a week by thickness across lanes or the strip. |
| 3 | Frank won't manage Treasure Island that fast in October. Give him more breathing room. | Ask for their expectation first. Pass or fail. Treasure Island is Frank's October Literature sprint (Oct 19 to Nov 6), after Today, so it isn't in This Week. Expected path: find the Lit F sprint on the timeline, tap it, then drag its end later or use End 1 week later. Time it. |
| 4 | Co-op now takes the whole Tuesday. Set that up. | Then ask: What does this screen say will happen? Pass or fail. |
| 5 | Frank was sick Monday. What do you do? | Pass or fail. |

#### Scoring

| Score | Tasks 0 to 2b |
| --- | --- |
| Strong | Links thickness to work per day over time, in their own words. |
| Partial | Reads the gray strip, the colors, or the lanes but never mentions thickness. |
| Lane read (partial) | Reads thickness as differences between subjects (for example 'math is the biggest subject') rather than changes over time. Counts as partial, not a pass. |
| Wrong | Reads thickness as something other than work per day. Log which: length (duration, how long it runs), difficulty, priority, or importance. |

Tasks 3 to 5 are pass or fail on finishing without help. Note where they hesitate.

#### Debrief

-   Ask this before opening debrief mode, because debrief mode shows minutes and would give the answer away. Point at Frank's piano band in the Music lane (labeled Mus F) and ask, word for word: 'How much time do you think this takes each day compared with reading?' Write down their answer and whether they over-read it (they guess it's close to reading or more). Why: the build plan draws every band at least 2 px thick, so light subjects like piano can look heavier than they are. That's a known distortion, and this question measures it.
-   Then open debrief mode: triple-tap the small text at the very bottom yourself, or on a remote or participant-held phone say 'Tap the small text at the very bottom three times', then switch on Debrief mode.
-   What did thicker mean to you?
-   What would you call this view?
-   What do you use today for planning, and what's annoying about it?
-   Would this replace that or sit next to it?
-   Skip 'would you pay'.

#### Pilot watch list

_For the 2 pilot sessions. Write down where they hesitate before changing anything._

-   Does anyone read the October block as busy without prompting, or only after the question about Frank?
-   Lane read: does the always-thick Math pull answers like 'math is the biggest subject'?
-   Phone Fall zoom: do the event ticks that appear help or distract?
-   Task 3 path and timing: do they find the Lit F sprint, tap it, and use the end-date buttons? How long does finding it take?
-   What do they think the collapsed event bands on the phone full-year view are?
-   Task 0: do answers mention the disabled edit buttons (End 1 week earlier or later)?
-   F and M: ask nothing about them, but log it if anyone asks 'what's F?'.
-   The phone strip sits at the top, so phones may get more Partial (strip) answers. Log it, and don't read a phone vs desktop gap as failure on its own.

| Task | Time | Hesitations (where, how long) | Quotes | Score |
| --- | --- | --- | --- | --- |
| 0 |  |  |  |  |
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 2b |  |  |  |  |
| 3 |  |  |  | Pass / fail |
| 4 |  |  |  | Pass / fail |
| 5 |  |  |  | Pass / fail |
| Debrief: piano vs reading |  |  |  | Over-read / about right / under-read |
| Debrief |  |  |  |  |

#### Decision rules

DeeDee's thresholds for 12 parents, applied to the one design, Weekly + Exaggerated. The 2 pilot sessions are not counted. At n=12 one parent is noise: a result within one parent of a threshold (for example 7 vs 8 Strong, or 5 vs 6 of the phone parents) counts as iterate, not build.

| Strong by Task 2 (of 12) | Decision |
| --- | --- |
| 8 or more | Build it, if the phone rule below also passes. Then test Normal scale and Daily detail with new parents. |
| 4 to 7 | Iterate, then retest with 5 new parents. If Wrong answers are mostly length or importance, the exaggeration overshoots, so tone the scale down. If parents never notice thickness, add a small legend or change the smoothing. |
| Under 4, or Partial (including Lane read) dominant | Thickness isn't the differentiator. Redesign around the total-load strip plus the event preview. |

The design builds only if it also passes on phones: at least 6 of the 8 phone parents Strong. Report phone and desktop separately. A pass on desktop only is a fail. Log every Wrong answer by category, since a cluster in length or importance changes what to iterate.

## Hub features to round it out

_Competitor features come from the research Page or each vendor's own site, checked Oct 27, 2026. 'My suggestion' means I didn't see it in a competitor._

_Filter on the Page: All / MVP / v1.x premium / Later; showing All._

| Feature | Who has it | Basis | Priority |
| --- | --- | --- | --- |
| Attendance (days and hours from the same logs) | Homeschool Manager, Planet, Tracker | Research + vendor sites | MVP |
| Auto-shift after sick or missed days (thicken vs push end) | Panda, Syllabird, Homeschool Scheduler | Research | MVP |
| Student daily view (Today checklist per kid) | Tracker, Manager, Syllabird | Vendor sites | MVP |
| Lesson-level plans (bar split into numbered lessons) | Planet, Tracker | Research + vendor sites | MVP |
| Print daily or weekly plans | Planet, Manager, Syllabird | Vendor sites | MVP |
| Reading log and book list (titles feed reports) | Panda (book tracker with shelves), Manager (book lists) | Vendor sites | MVP |
| Native mobile app with full offline mode (v1 is web/PWA) | Planet and Panda have apps but weak reviews; Tracker has none | My suggestion | Later |
| Spreadsheet paste/CSV import of assignments | Tracker (paste from Excel or Sheets) | Vendor site | MVP |
| Privacy baseline: no ads, no data selling, full export | Panda (no ads, no selling), Tracker (export anytime) | Vendor sites | MVP |
| Grades, report cards, transcripts, GPA, course credits | Planet, Manager, Tracker; Syllabird gradebook | Research + vendor sites | v1.x premium |
| Kid logins for older students | Planet, Syllabird, Panda (Student Portal) | Vendor sites | v1.x premium |
| Co-teacher, second parent, tutor access | Tracker (3 teacher accounts), Panda (Family/Tutor Portal) | Vendor sites | v1.x premium |
| Portfolio: photos, work samples, and a clean export the family can share with an evaluator | Tracker (year-end portfolios), Syllabird (uploads) | Vendor sites | v1.x premium |
| State record-keeping helpers: reference links, summaries, and reminders the family sets (see State requirements) | Tracker (sells state 'compliance packs' for NY, PA, OH, NC and more) | Vendor site | v1.x premium |
| Curriculum template library | Planet (4,000+ plans), Homeschool Scheduler (5,500 curricula), Tracker (1,000+), Panda marketplace | Research + vendor sites | v1.x premium |
| Ambleside, Memoria Press, Saxon templates; Orthodox feast and fast overlay | Planet sells Memoria Press plans; no Orthodox overlay seen | My suggestion | v1.x premium |
| Calendar sync (ICS both ways: Google, Apple, Outlook) | Planet | Vendor site | v1.x premium |
| Daily or weekly email digest to parent and kids | Planet | Vendor site | v1.x premium |
| School-year rollover; reuse a course for a younger sibling | Syllabird (reuse courses for all kids, share with friends) | Vendor site | v1.x premium |
| One-tap 'smooth this month' load balancing | Tasked With (flags overloaded days, suggests calmer plan) | Research | v1.x premium |
| Curriculum inventory and budget; ESA expense report | Panda Pro (budget and expense tracking); Planet accepts ESA funds | Vendor sites | Later |
| Library due dates on borrowed books | None seen | My suggestion | Later |
| Co-op groups: shared class plans, roster, schedule | Planet (co-op licenses), Panda (Groups) | Vendor sites | Later |
| Importers from Planet, Panda, Tracker exports | Tracker offers free migration help | My suggestion | Later |
| Household calendar items (chores, appointments) | Planet | Vendor site | Later |
| Share or sell family-made plan templates | Syllabird (share courses), Planet marketplace | Vendor sites | Later |

Current priorities are in ROADMAP.md; the Priority column below is the original research ranking. After the v1 scope cut, this whole list is backlog: MVP now means first in line after v1, and kid logins, templates, and state record-keeping helpers wait regardless of their label here.

-   MVP adds the everyday basics competitors already have, so families don't need a second app from day one.
-   Lesson-level plans and templates make the This Week chapter list work without typing a table of contents.
-   Kid logins are premium because they matter most for older kids in multi-kid families, the paying audience.
-   An Orthodox feast and fast overlay, plus Ambleside and Memoria Press templates, speaks directly to DeeDee's own communities.

## State requirements

_Summarized from HSLDA and state statutes or education department pages, checked Oct 27, 2026. Not legal advice._

-   **High**: MA, NY, PA, RI
-   **Moderate**: HI, ME, MN, NC, ND, OR, SC, VA, VT, WA, WV
-   **Low (notice only)**: AL, AZ, AR, CA, CO, DE, DC, FL, GA, KS, KY, LA, MD, MS, MT, NE, NV, NM, OH, SD, TN, UT, WI
-   **No notice**: AK, CT, ID, IL, IN, IA, MI, MO, NH, NJ, OK, TX, WY

These groups come from my reading of HSLDA's color-coded legal map. HSLDA defines low as notice only, moderate as notice plus test scores or evaluations, and high as that plus more, such as curriculum approval or home visits. Maryland is listed as low but still has portfolio reviews, so the label alone isn't enough.

**View: Filing and time**

| State | HSLDA level | Notice or approval | Days or hours |
| --- | --- | --- | --- |
| New York | High | Letter of intent, then IHIP each year listing curriculum per required subject | 180 days equivalent; 900 hrs (gr 1-6), 990 hrs (gr 7-12) |
| Pennsylvania | High | Affidavit before starting, then by Aug 1 each year, with objectives by subject | 180 days, or 900 hrs (K-6) / 990 hrs (7-12) |
| Massachusetts | High | Advance district approval of a plan (curriculum, hours per subject, year length) | Set by the approved plan |
| Rhode Island | High | School committee approval of an at-home instruction plan before starting | Substantially equal to public school, now 1,080 hrs a year |
| Vermont | Moderate | Notice of intent 10 business days before starting; annual notice each year | 175 days in the minimum course of study |
| North Dakota | Moderate | Statement of intent 5 days before starting and every year | 4 hrs a day for 175 days |
| Washington | Moderate | Declaration of intent by Sept 15 each year | Not covered in the sources I read |
| Minnesota | Moderate | Letter of intent by Oct 1 each year, naming the planned test | Not covered in the sources I read |
| Maryland | Low (HSLDA) | Notification 15 days before starting; annual verification | Regular, thorough instruction |

**View: Assessment and records**

| State | Testing or evaluation | Records and reports |
| --- | --- | --- |
| New York | Annual norm-referenced test, or narrative in some grades (1-3, every other year 4-8) | 4 quarterly reports: hours, material covered per subject, grade or narrative, explanation if under 80% of plan covered; attendance records |
| Pennsylvania | Tests in grades 3, 5, 8 (reading and math); yearly evaluator letter to district by June 30 | Portfolio: contemporaneous log with reading titles, work samples, test results |
| Massachusetts | District may require periodic testing or other evaluation | Per the approved plan; home visits cannot be required |
| Rhode Island | Method agreed with the school committee | Attendance register like public schools; regular reports to the district |
| Vermont | Yearly assessment kept at home: test, certified-teacher review, or parent report with 4 work samples | Keep assessment records; not submitted since July 2023 |
| North Dakota | Tests in grades 4, 6, 8, 10 (opt-outs exist for some parents) | Annual record of courses and progress assessments |
| Washington | Yearly test or certificated-educator assessment | Keep test, immunization, and instruction records |
| Minnesota | Yearly nationally normed test | Keep schedules, materials, assessment methods, test proof |
| Maryland | Portfolio review up to 3 times a year | Portfolio of materials, reading, and student work |

Required subjects vary. Examples: Vermont lists reading and writing, math, history and citizenship, science, and literature, plus fine arts, PE, and health under age 13. Rhode Island adds Rhode Island history, and Washington lists 11 subjects including occupational education and art or music appreciation.

### Requirements and the record-keeping helpers that support them

| Requirement | States | App feature | Tier |
| --- | --- | --- | --- |
| Notice of intent, affidavit, or plan approval | All four high states; VT, ND, WA, MN, MD | Reminders the family sets for their own filing dates, with a link to the state's source; a prefilled summary of each child's plan for the family to edit | Reminders MVP; prefilled summaries premium |
| Required days or hours | NY, PA, VT, ND, RI | Logged days and hours from the same logs, by child, subject, and date range, with the neutral records note. No comparison with the state's threshold and no on-track status | MVP |
| Required subjects | NY, PA, VT, RI, WA, MN, MD | Optional subject labels the family picks, so totals can group by the subject names they track. No flags or checks saying a subject is covered | Labels MVP; state reference summaries premium |
| Curriculum plan (IHIP, objectives, approval plan) | NY, PA, MA, RI | A prefilled draft from assignments (materials per subject, planned hours, year length) for the family to review, edit, and file themselves | Premium |
| Quarterly reports | NY | A quarterly summary of logged hours, material covered, and percent of plan covered per subject, plus space for the family's own notes, to use when writing their report. No pass or fail and no warnings | Premium |
| Portfolio and evaluation | PA, MD, VT | Portfolio export: dated log, reading titles, tagged work samples, test results; evaluator share link | Premium |
| Standardized testing | NY, PA, ND, MN, WA | Test score records per child, with optional reminders the family sets | Reminders MVP; score records premium |
| Attendance register to district | RI, NY on request | Attendance CSV and PDF export, with the neutral records note | MVP |

The strongest fit is New York's quarterly report. Because the timeline already knows the plan, the app can summarize logged hours, material covered, and the percent of plan covered per subject. A family can use that summary when writing their own report; the app doesn't say whether the report meets New York's rules.

> **Not legal advice (warning).** Laws change, and districts apply them differently. Each StateProfile should show its source link and last-verified date, every screen with state information should say to check the state's requirements, and hour totals and exports carry the neutral records note. The app describes them as a record that supports the family's own records, never as compliant or as meeting a requirement.

## Free vs premium

| Tier | Price | Includes |
| --- | --- | --- |
| Free | $0 | Full timeline for one child, lanes, thickness, recurring events, breaks, This Week, logging, attendance, CSV export |
| Family | $5.99/mo or $49/yr | Unlimited children, shared assignments, family load view, PDF records, portfolio; kid logins and state record-keeping helpers after v1 |
| Founding offer | $39/yr for life (first 500) | Same as Family, for early reviews and word of mouth |
| Later upsells | Priced separately | Transcripts and report cards for high schoolers; curriculum templates such as Ambleside, Memoria Press, Orthodox overlays |

Billing waits until after the friends beta; friends get every Family feature free (ROADMAP.md). Pricing follows the research Page: $49/yr matches Homeschool Manager and undercuts Planet ($84.95) and Panda Pro ($79.99). Keeping CSV export free is my suggestion, because owning your data builds trust.

## Open questions for DeeDee

Moved to [ROADMAP.md](../ROADMAP.md), "Open decisions for DeeDee", on 2026-10-30, and triaged there by phase. The default minutes per unit question is superseded by effort weights.

## Sources

-   [Homeschool laws by state (legal map)](https://hslda.org/legal) (HSLDA)
-   [New York homeschool law at a glance](https://hslda.org/legal/new-york) (HSLDA)
-   [Pennsylvania homeschool law at a glance](https://hslda.org/legal/pennsylvania) (HSLDA)
-   [8 NYCRR 100.10 Home instruction](https://www.law.cornell.edu/regulations/new-york/8-NYCRR-100.10) (Cornell LII)
-   [Home instruction questions and answers](https://www.nysed.gov/nonpublic-schools/home-instruction-questions-and-answers) (NYSED)
-   [Home Education and Private Tutoring Guide](https://www.pa.gov/content/dam/copapwp-pagov/en/education/documents/instruction/home-education-and-private-tutoring/home%20education%20and%20private%20tutoring%20guide.pdf) (PA Dept of Education)
-   [Home schooling](https://www.doe.mass.edu/homeschool/) (Massachusetts DESE)
-   [Massachusetts regulation of private and home schools](https://www.ed.gov/birth-grade-12-education/school-choice/state-regulation-of-private-and-home-schools/massachusetts-state-regulation-of-private-and-home-schools) (ed.gov)
-   [Homeschooling](https://ride.ri.gov/students-families/education-programs/home-schooling) (RI Dept of Education)
-   [16 V.S.A. 166b Home study program](https://legislature.vermont.gov/statutes/section/16/003/00166b) (Vermont Legislature)
-   [End of the Year Assessment](https://education.vermont.gov/end-year-assessment-eoya) (Vermont AOE)
-   [Home education in North Dakota: a parent guide](https://www.nd.gov/dpi/familiescommunity/families/home-education/home-education-north-dakota-parent-guide) (ND DPI)
-   [RCW 28A.200.010 Home-based instruction](https://app.leg.wa.gov/rcw/default.aspx?cite=28A.200.010) (WA Legislature)
-   [Minn. Stat. 120A.24](https://www.revisor.mn.gov/statutes/cite/120a.24) (MN Revisor)
-   [COMAR 13A.10 Home instruction](https://regs.maryland.gov/us/md/exec/comar/13A.10/index.full.html) (Maryland Regulations)
-   [Homeschool Planet FAQ](https://homeschoolplanet.com/help/) (homeschoolplanet.com)
-   [Homeschool Panda plans](https://homeschoolpanda.com/pricing-plans) (homeschoolpanda.com)
-   [Homeschool Tracker](https://www.homeschooltracker.com/) (homeschooltracker.com)
-   [Homeschool Manager](https://homeschoolmanager.com/) (homeschoolmanager.com)
-   [Syllabird](https://www.syllabird.com/) (syllabird.com)
-   [Homeschool Planner: Competitor & Pricing Research](https://cursor.com/canvas/store-05807489-4c87-496a-9870-4cee453dadd4/93025aad-a8f8-42ef-aab9-71942b9f2a14) (Page)
