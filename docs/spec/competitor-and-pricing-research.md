# Homeschool Planner: Competitor & Pricing Research

> Copied from the shared Page https://cursor.com/canvas/store-05807489-4c87-496a-9870-4cee453dadd4/93025aad-a8f8-42ef-aab9-71942b9f2a14 on 2026-10-30; the repo copy is the working reference until go-live, when docs/spec/ will be removed.

_What existing homeschool planners charge and do, how big the market is and how many kids homeschool families have, and how to price and position your workload timeline app._

## Changelog

2026-10-28

-   Applied DeeDee's logging rule: hour logging is a record-keeping helper that supports a family's own process, never a compliance solution. Reworded the hour-logging feature and the Family tier's reports to match, and added a positioning bullet.
-   Hour totals and exports carry a neutral note: 'A record of logged hours to support your own records. Check your state's requirements.'

## Key findings

-   No planner I found shows workload as bar thickness in subject lanes across a whole year. The closest are Homeschool Scheduler, a year timeline of course end dates, and Tasked With, which flags overloaded days.
-   No competitor charges per child. Every dedicated planner is a flat household price with unlimited or 20+ students, and most offer a trial rather than a free tier.
-   Most paid plans cost $49 to $90 a year: Homeschool Manager $49, Tracker $65, Panda Pro $79.99, Planet $84.95, Syllabird $60 to $90.
-   About 3.4 million US K-12 students were homeschooled in 2024-25 (NHERI estimate). Growth slowed from 6.3% to 1.5% across 22 reporting states in 2025-26.
-   About 81% of homeschooled students live in homes with two or more children, so a paywall at child #2 reaches most paying families. A paywall at child #3 reaches only about 28% of families (my estimate).

> **Bottom line.** A free one-child timeline plus a flat $49/yr family plan with unlimited kids is cheap enough to beat Planet and Panda on price. The thickness timeline and capacity-aware recurring events are features nobody else has.

## Planned features

1.  **Year timeline in subject lanes**: Each subject gets its own colored lane, with time running left to right. Mobile shows a smaller window you can zoom out.
2.  **Assignments as bars whose thickness is daily load**: Example: Treasure Island, 300 pages, Jan 15 to Mar 15. Units per day are calculated automatically or set by hand, and pulling the end date in makes the bar thicker.
3.  **Drag and stretch to rebalance**: Move or resize a bar and its thickness updates live, so a heavy October can be spread to lighter months.
4.  **Units beyond pages**: Lessons, chapters, or minutes, so math and piano practice fit the same math.
5.  **Recurring events that use up capacity**: When you add an event like Tuesday co-op, the app asks whether it takes a quarter, half, or full day. It then asks whether to pause or lighten all subject bars, some, or specific ones that day.
6.  **Keep the end date or let it slip**: An option spreads the missed work across other days so end dates hold. Before you confirm, a preview shows the per-day change, for example Treasure Island going from 5 to 6 pages a day.
7.  **Vacations and breaks grayed out**: Blocked days count as zero capacity across every lane.
8.  **Easy hour logging tied to bars**: Logged time or progress fills in each bar and shows whether you're ahead of or behind your own plan. Hours by subject and child, for any date range, are a record to support your own records, not a compliance tool.
9.  **Freemium by child**: Free gets the scheduler for one child. Premium adds multiple children, with each assignment tied to one or more kids.

## Competitor comparison

_Prices and features as listed on each product's own pages, app store listings, or a cited review site, checked Oct 27, 2026._

**View: Pricing and limits**

| Product | Price | Kids | Platforms | Trial |
| --- | --- | --- | --- | --- |
| Homeschool Planet | $9.95/mo or $84.95/yr | Whole household, no per-child fee | Web, iOS, Android | 30 days, no card |
| Homeschool Panda | Free community tier; Essentials $5/mo or $49.99/yr; Pro $7.99/mo or $79.99/yr | Multiple students | Web, iOS, Android | 30 days |
| Homeschool Tracker | $8/mo, $65/yr, or $119/2 yrs | Up to 20 students | Web; free Windows Basic edition | 7 days |
| Homeschool Manager | $5.99/mo or $49/yr | Unlimited | Web | 30 days |
| Syllabird | $6/mo or $60/yr; Premium $9/mo or $90/yr (more storage) | Unlimited | Mobile-friendly web | 14 days, no card |
| Homeschool Scheduler (app) | Subscription; price shown only in app stores | Multiple students | iOS, Android | Free trial |
| Tasked With | Free access plus paid family license; price not published | Multiple students | Web | Free tier |
| Trello | Free; Timeline view needs Premium at $10/user/mo (annual) | Not homeschool-specific | Web, iOS, Android | Premium trial |
| Notion / Etsy templates | One-time, examples about $5 to $20 | Template-dependent | Notion | None |
| PlanBee (UK) | £9.99/mo (12-mo min) or £84.99/yr | Lesson packs, not a planner | Web downloads | None |

**View: Timeline, capacity, and reviews**

| Product | Year workload view? | Recurring events and capacity | Ratings and sentiment |
| --- | --- | --- | --- |
| Homeschool Planet | No. Day, week, month lists; drag-and-drop rescheduling | Family calendar shows activities, but they don't reduce lesson load | iOS 4.2 (11 ratings); powerful once set up, but steep setup, published plans hard to edit, app logouts |
| Homeschool Panda | No. Calendar plus auto-shift of lesson plans | Events such as co-ops are calendar items only | iOS 3.2 (32), Google Play 2.9 (54); liked for drag-and-drop rescheduling; wrong-date entry bugs, login and access problems |
| Homeschool Tracker | No. Lesson plans and drag-and-drop scheduling | Not documented | Deep records and transcripts; more admin work |
| Homeschool Manager | No. Weekly view per student, grouped by subject | Not documented | Grading, report cards, transcripts, attendance |
| Syllabird | No. Colorful calendar views | Vacations shift the schedule automatically; repeating assignments | Reddit users like that live plans stay editable |
| Homeschool Scheduler (app) | Partly. Whole-year timeline shows when each course ends, but not daily load | Breaks and holidays are skipped; missed days stack or shift | Mobile-first, 5,500-curriculum catalog |
| Tasked With | Partly. Smart Workload Balancing flags overloaded days and suggests a calmer plan | Co-op days and practices sit beside lessons; no partial-day or per-subject prompt | Newer product; price not published |
| Trello | Generic Gantt timeline (paid), no workload math | Manual only | Free and flexible; no grades or hours |
| Notion / Etsy templates | No | Manual only | Cheap and pretty; everything is manual |
| PlanBee (UK) | No (content library) | Not applicable | Not a direct competitor |

On recurring events, none of the products asks what fraction of the day an event takes, which subjects to pause or lighten, or previews the new per-day load before saving. Syllabird and Homeschool Scheduler only skip full vacation days, and Tasked With balances load after the fact.

Others seen in 2026 roundups: HomeTrail (free multi-child plan, Plus $199/yr), Homeschooly (free, Premium $29.99/yr), My Homeschool Helper ($83.40/yr, unlimited students), and ArborSlate ($249/yr).

## What users say

> Once you 'publish' them to the calendar, it's like it takes a snapshot and you can't change them. — r/homeschool, Sept 2026, on Homeschool Planet

> Steep learning curve, complicated set up... once set up incredibly powerful and flexible for rescheduling. — r/homeschool, on Homeschool Planet

On the App Store, a parent homeschooling 3 kids praised Homeschool Panda's drag-and-drop rescheduling for when life happens. Other Panda reviews complain about entries defaulting to the wrong date and trouble getting into accounts.

The common themes are a painful setup, plans that are hard to edit mid-year, and weak mobile apps. Parents also value easy rescheduling when life happens, which is exactly what drag-and-stretch bars offer.

## Market size

There are millions of homeschooled students, and growth is still positive but slowing.

-   **3.408M** — US K-12 homeschoolers, 2024-25 (NHERI estimate, range 3.07M to 3.75M)
-   **6.26%** — Share of school-age kids (NHERI; NCES survey put it at 3.4% in 2022-23)
-   **1.5%** — Growth, 2025-26 (22 reporting states, down from 6.3% (Johns Hopkins))
-   **1.7M** — Homeschool families (My estimate: 3.4M students at about 2 per family)

Estimates vary because the sources count differently: NCES surveys one child per household, while NHERI adjusts state counts upward for underreporting. Either way, the market is at least 1.8 million students.

## How many kids homeschool families have

_Homeschooled students by number of children in the household, NCES 2019 survey (1.457M students)._

-   **3 or more children**: 706K students (48%)
-   **2 children**: 475K students (33%)
-   **1 child**: 276K students (19%)

Homeschooling is most common in big families: 3.9% of kids in homes with 3+ children were homeschooled, against 2.2 to 2.3% in smaller homes.

Converting students to families is my rough estimate. It assumes every child in the home is homeschooled and that 3+ homes average about 3.5 kids. On that basis, about 38% of families have one child, 33% have two, and 28% have three or more. So a paywall at child #2 puts about 62% of families in the paid tier, while a paywall at #3 puts only about 28% there. Your instinct is right.

## Pricing recommendation

| Tier | Price | Includes |
| --- | --- | --- |
| Free | $0 | Full timeline for one child, subject lanes, bar thickness, recurring events, vacations, basic hour log, CSV export |
| Family | $5.99/mo or $49/yr | Unlimited children, assignments shared across kids, family-wide load view, hour and attendance records by subject, child, and date range, PDF export |
| Founding offer | $39/yr for life (first 500) | Same as Family; drives early reviews and word of mouth |

-   $49/yr matches Homeschool Manager, the cheapest serious planner, and is well under Planet's $84.95 and Panda Pro's $79.99.
-   Charge a flat family price with unlimited kids, because every competitor does. Per-child pricing would feel stingy to the large families who dominate the market.
-   Being free for one child is rare. Nearly everyone else offers only a 7- to 30-day trial, so free single-child families become an organic acquisition channel.
-   Offer a 30-day free trial of Family, since parents with multiple kids will evaluate during summer planning.
-   Later upsells, priced separately: transcripts and report cards for high schoolers, and curriculum templates (for example Ambleside, Memoria Press, or Orthodox feast-calendar overlays).

## Positioning and differentiation gaps

-   See your whole year's workload at a glance. No competitor shows daily load as bar thickness across subjects.
-   Capacity-aware recurring events: a partial-day co-op, a choice of which subjects to lighten, and a preview of pages per day before you commit.
-   Unit-based auto pacing (pages, chapters, minutes) suits living-books and classical families better than lesson-by-lesson tools.
-   Editable anytime: just drag or stretch, which answers the snapshot complaint about Planet.
-   Ten-minute setup: enter a book, its pages, and its dates, against Planet's weekend of setup.
-   Honest record-keeping: easy hour logging with clean CSV and PDF exports that support a family's own process with their state's rules. No 'compliant' badges, green checks, or 'on track for your state' claims; totals and exports say to check the state's requirements.
-   A polished native mobile app, where Panda and Planet get their weakest reviews.

> **Watch (warning).** Tasked With already markets workload balancing, and Homeschool Scheduler has a year timeline. Lead your demos with the visual thickness map and the co-op capacity prompt, the two things neither shows.

## Sources

-   [Homeschool Planet FAQ and pricing](https://homeschoolplanet.com/help/) (homeschoolplanet.com)
-   [Homeschool Planet on the App Store](https://apps.apple.com/us/app/homeschool-planet/id6639586865) (apps.apple.com)
-   [Homeschool Panda pricing](https://homeschoolpanda.com/pricing-plans) (homeschoolpanda.com)
-   [Homeschool Panda on the App Store](https://apps.apple.com/us/app/homeschool-panda/id1470263093) (apps.apple.com)
-   [Homeschool Tracker pricing](https://www.homeschooltracker.com/pricing.html) (homeschooltracker.com)
-   [Homeschool Manager pricing](https://homeschoolmanager.com/pricing/) (homeschoolmanager.com)
-   [Syllabird pricing](https://www.syllabird.com/pricing) (syllabird.com)
-   [Homeschool Scheduler](https://homeschoolscheduler.app/) (homeschoolscheduler.app)
-   [Tasked With](https://www.taskedwith.com/) (taskedwith.com)
-   [Trello pricing](https://trello.com/pricing) (trello.com)
-   [PlanBee subscriptions](https://planbee.com/pages/subscribe) (planbee.com)
-   [Etsy homeschool planner templates](https://www.etsy.com/market/homeschool_lesson_planner_multiple_kids) (etsy.com)
-   [Best homeschool software 2026 comparison](https://hometrail.net/best-homeschool-software) (hometrail.net)
-   [r/homeschool thread on Homeschool Planet (Sept 2026)](https://www.reddit.com/r/homeschool/comments/1w8zjm7/) (reddit.com)
-   [r/homeschool thread on planners](https://www.reddit.com/r/homeschool/comments/1e0bmpr/) (reddit.com)
-   [How many homeschool students, 2024-25](https://nheri.org/how-many-homeschool-students-are-there-in-the-united-states/) (NHERI)
-   [Homeschool Growth 2025-2026](https://education.jhu.edu/edpolicy/policy-research-initiatives/homeschool-hub/homeschool-growth-2025-2026/) (Johns Hopkins)
-   [A look at homeschooling in the U.S.](https://www.pewresearch.org/short-reads/2025/02/20/a-look-at-homeschooling-in-the-us/) (Pew Research Center)
-   [Table 206.10: homeschooled students by household](https://nces.ed.gov/programs/digest/d21/tables/dt21_206.10.asp) (NCES)
