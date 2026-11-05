# Roadmap

DeeDee and Will co-own the product. DeeDee approves what gets built. This plan was agreed on 2026-10-30 and replaces the earlier MVP plan of the same day. Anything outside it still needs approval before it starts.

## What we're building

Design direction: [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) (from Will's reviews of 2026-10-31).


**A steering tool for the homeschool year.** A parent sees the shape of the whole year in seconds, corrects course when life happens, and gets their records with no extra work. It is a planning tool parents steer with, not a daily to-do app they have to feed. Nothing in the core needs daily input or tedious data entry.

**Core plus optional modules.**
- **The core is the differentiator.** It's always on, and it must be excellent before anyone else uses the app: the year map, steering, effort, fast setup.
- **Optional modules make it a full homeschool hub.** They're off by default and switched on in settings. Every module follows three rules:
  1. It reads from the plan and needs no daily input, so it works from day one.
  2. It adds nothing to the core screens until it is switched on.
  3. It lives behind its own boundary (its own feature folder and API routes), so it can be cut or redesigned without touching the engine.

**The bar for friends:** a polished, complete core, not a rough demo. Friends' feedback should be about the margins, not about missing basics.

## The plan, in order

**Core decisions C1–C3 were decided on 2026-10-30** (see "Open decisions for DeeDee"), so nothing in the core is blocked on a decision now.

| # | Phase | Target | Done when |
|---|---|---|---|
| 1 | **Build the core** (checklist below), plus the code-only hosting fixes | Mid-December 2026 | Every core box is checked, locally, and the hardening fixes are in |
| 2 | **Private hosting** for DeeDee only (section below) | December 2026 | DeeDee can use it on her phone; one backup restore tested |
| 3 | **DeeDee's real spring term** | From January 2027 | DeeDee runs real weeks from it; Will and DeeDee hold a 15-minute review each week and fix what blocks her |
| 4 | **Friends beta** | From about March 2027 | The tester has verified the timeline sprint and the read-only share link is in; then 3–6 invited families, ideally the Charlotte Mason friends; the go-public signals are measured at week 6 |
| 5 | **Decide on going public** | After the friends beta | The go-public signals below are met, or we decide what to change |

**The dates are targets, not promises.** At 6–8 hours a week the core is doable by mid-December, but it holds assignment weekdays, the weekly briefing, the effort rework, undo, week adjust, the event preview and fast setup. The additions of 2026-10-30 (assignment weekdays, the briefing and forecasts, "Missed a day?", book lookup, calendar templates, rollover and separate parent logins) add about 8–10 days of work. If it slips, defer the Sprint 7 polish fixes (S7-06 to S7-12) first; after that, phase 3 moves rather than cutting the rest of the core.

**Beta demos before January.** From the end of November, show finished core pieces to DeeDee and, if she chooses, a friend or two. These are short guided demos on the demo family, not real use, run locally or over screen share until phase 2. They catch confusion early without asking anyone to rely on the app.

**Budget:** a few hours a week and low running costs (under about $20 a month) until the app shows promise.

**Agents contact no one** (HOW_WE_WORK.md, "Rules"). DeeDee invites friends herself.

### Go-public signals

Agreed now, so they don't drift later. We consider going public only if:
- DeeDee uses it for the whole spring term and wants it for next year;
- at least half the friend families still open it weekly at week 6, without reminders;
- at least one friend asks to bring someone else;
- most friends say yes to "Would you pay $49 for next school year?"

## 1. Core checklist

Status as of 2026-11-05 (updated from the merged sprints on `main`, through Sprint 10b, PR #6). "Built" means a sprint delivered it and its tester passed; the end-to-end pass in the last row confirms it.

**What's left, in order:** see "Order of work after Sprint 10" below (Will, 2026-11-05): first run, the completion question, printable sheets and term in review, accounts and hosting fixes, the end-to-end run, then hosting.

### Assignment weekdays
- [x] **Which weekdays an assignment runs on** (built in Sprint 4: tappable day chips, a subject default that assignments follow until customised). Today the engine spreads every assignment over all school days, so a once-a-week subject (picture study, composer, nature study) shows as a fifth of a lesson every day, and math can't be Monday to Thursday only. An assignment gets optional weekdays (default: every school day); the plan places its work only on those days, and the bars, This Week and check-ins follow. Events already have weekdays; assignments don't.

### The map
- [x] Year timeline: lanes per subject and child, thickness, All subjects bar, zoom presets, child filter (timeline T-01 to T-11e).
- [x] Tap a bar to edit it, add an assignment from the timeline (T-07e, T-10). Dragging is switched off behind `BAR_DRAG_ENABLED` since Sprint 7 (Will; code kept).
- [x] **Phone finishing pass** (Sprint 5, and every sprint since checks 360 px and 44 px): a compact edit bar and 44 px tap targets on every core screen.

### Steering
- [x] Schedule · Week (formerly This Week). The weekly "How did last week go?" card was retired in Sprint 9; **Update status** on a bar corrects the plan's pace instead.
- [x] Days off for the whole family or one child (for example a sick day). Bars reflow and keep their end dates (S2a).
- [x] **Adjust the current or a coming week** (Sprint 6; whole-week undo and past weeks never change, Sprint 7b): change this week's amount, then keep the end date or push it back. The `week_override` table exists; C1 is decided (the most recent edit wins).
- [x] **Undo, and reset an assignment to how it was** (Sprint 6). C2 decided: the last change, plus reset to how it was created.
- [x] **Weekly briefing with finish-date forecasts** (Sprints 4 and 6; a late line offers Move end / Keep, Sprint 7b; one line on Home, Sprint 9). A short status line per child above the week's work: "On track", or "Latin will finish 2 weeks late at this pace. Keep the end date or push it back?", or "This is your heaviest week." It appears only when there's something to act on. It is part of This Week, not a new screen. The engine already produces the warnings (work past the end date, no capacity, unplaced work); forecasts move once check-ins show a slower or faster pace. Its keep-or-push buttons use week adjust (C1).
- [x] ~~**"Missed a day?" on This Week.**~~ Built in Sprint 4, then **removed by Will's decision of 2026-10-31** (Sprint 6, S6-04): the weekly check-in already covers missed work ("keep the end date or push it back"), and a second way to report it clutters This Week. Sick days can still be added under Days off; attendance totals come with the records module.
- [x] **Preview before saving an event** (Sprint 5): for example "Treasure Island goes from 5 to 6 pages a day". Events already have skip, lighter and normal rules per subject (S2a); the preview is missing.

### Effort (decision C3: approved)
Thickness shows effort: how much work a day of this takes. Today the parent picks a weight per unit (Light, Normal, Heavy or Very heavy). Parents can't easily say how heavy one page is, but they can say how long a day takes. The proposal:
- [x] **Ask in time, store as effort** (Sprint 6). When adding an assignment: "How many pages a day?" and "About how long will that take?" (15, 30, 45 or 60 minutes, or custom). The app stores the effort per unit (minutes per day ÷ units per day ÷ 2, since 1 point = 2 minutes). From then on the bar behaves as now: pull the end date in and it gets thicker.
- [x] **Correcting a guess** (Sprint 7b): "Feels heavier / lighter" was replaced by **Update time estimate** (15, 30, 45, 60 minutes a day or custom), Will 2026-10-31. Original idea: One tap nudges the effort by about 25% and the bar redraws. This is the main way to correct a bad first guess, and it is steering in itself.
- [x] **Corrections carry forward** (Sprints 6 and 7b). A corrected effort becomes the default for that child's next assignment in that subject (building on the subject default and learned usual weight, S2b-08 and S2b-32).
- Optional extra, not required: one dismissible prompt about two weeks into an assignment ("Is Treasure Island still about 30 minutes a day?").

Why not correct effort from the check-in: the check-in records how far a child got (pace), not how long it took, so it can't fix effort. It stays an optional way to steer the pace.

### Fast setup
Sprint 3a (`tickets/sprint-3a-setup/`) builds the first three.
- [x] **Bulk-add** (Sprint 3a; optional dates per row, Sprint 7b) several assignments in one go.
- [x] **Copy an assignment** (Sprint 3a), including to another child (for example a younger sibling).
- [x] **CSV import** of assignments (Sprint 3a).
- [x] ~~**Book lookup by title.**~~ **Dropped by Will on 2026-10-31:** editions differ in page count, and a wrong prefilled total would quietly mislead parents.
- [x] **Calendar templates for the year's shape** (Sprint 5; holidays keep their real dates, Sprint 7b) (terms and breaks; the weekly shape is the weekday chips). Set up in one step, with a preview of the breaks it adds; everything stays editable under Days off.
  - **Built in:** 36 weeks, a Sabbath schedule (6 weeks on, 1 off), three terms of 12 weeks, plus US holidays offered as days off.
  - **Build your own:** a simple pattern ("__ weeks on, __ weeks off", start and end dates, which holidays to skip), or "Save this year as a template" from breaks set up by hand, reused at rollover.
  - Sharing a template with friends or a co-op comes later.
- [x] **Custom zoom views** (Sprint 7; Fall and Spring renamable and re-datable, Sprint 9). A quiet Edit at the end of the zoom row: hide Fall, Spring or This month, and add, rename, delete and reorder the family's own views (for example terms), up to 6 including Year.
- [x] **Year rollover and sibling reuse** (Sprint 7: copy to a new year, copy to another child; both skip duplicates and can be undone, Sprint 7b). Start next year from this one, or copy a plan to a younger child, with the dates shifted.

### UI refinement and dark mode (Sprint 8, after Sprint 7): Soft Paper chosen
**Built in Sprints 8 and 8b** (PR #3). Added by Will on 2026-10-31: the UI isn't up to modern standards yet. Done once the core features stop changing, so nothing is restyled twice; accounts and hosting hardening follow it.
- **Chosen 2026-10-31:** Soft Paper (`design/ux-research.md`), with slightly stronger assignment colours; tickets in `tickets/sprint-8-soft-paper/`. Navigation: Home · Schedule · Records (Schedule has Week | Year), decided by Will on 2026-10-31 and corrected on 2026-11-01 (Sprint 9).
- **Design brief:** calm and airy, with the soft, rounded shapes of a warm and friendly app; pastel colours; very clean and tidy.
- [x] **Audit and direction first:** screenshot every screen at phone and desktop widths, critique against a modern standard, and show 2–3 visual directions on one page for Will and DeeDee to choose from before code changes.
- [x] **One design system:** tokens for type, spacing, radius, elevation and colour (light and dark), and shared components (buttons, fields, chips, cards, sheets, lists) in place of per-screen CSS.
- [x] **Screen-by-screen refinement:** the shell and navigation, This Week, the timeline, the schedule screens, forms and sheets, empty and loading states.
- [x] **Light, dark and system themes:** follows the device by default; Settings offers Light / Dark / System, remembered on that device. Pastel bars get dark-tuned versions; contrast tests run in both themes. (Built in Sprint 8.)
- [x] **Checks:** the tap-target script and contrast in both themes, and a tester pass with before-and-after screenshots.

### Schedule and Records (Sprint 9, approved 2026-11-01)
Will, 2026-11-01: Home's two main options are **Schedule** and **Records**; the weekly check-in card was retired (Update status on a bar corrects the plan's pace). Records therefore moved from "Optional modules" into the core, and the Track work tab went. Built in Sprint 9: log setup (template styles, never a state), log entries the parent types (hours and minutes, one entry per child, never prefilled, never moving the plan), totals for a range, and an export with chosen columns and dates (CSV and a printable page per child). Tickets: `tickets/sprint-9-schedule-and-records/README.md`; progress: `progress/sprint-9.md`.
- [x] Navigation Home · Schedule · Records; Home's two cards and one briefing line (S9-01, S9-05).
- [x] One US-style date field everywhere; Fall and Spring renamed and re-dated (S9-04, S9-06).
- [x] The weekly check-in card and Track work page retired; Update status from a Week bar and the Year edit bar (S9-02).
- [x] Records: log setup, log entries, totals for a range, export with chosen columns and dates (S9-03, S9-07, S9-08, S9-11).
- [x] Tester pass (S9-10), fixes in Sprint 9b (school days are real days, a typed book is never dropped, an honest "on track", and small fixes), re-test READY (`reviews/sprint-9b-verification.md`). Merged in PR #4.
- [x] **Runs of days show which days count (S9b-07, built in Sprint 10b):** day chips on a multi-day log entry, pre-set to the family's usual days, so a Saturday catch-up or a non-Mon–Fri week counts exactly (Will, 2026-11-01).

### Year view polish (Sprint 10, split into 10a and 10b by DeeDee, 2026-11-04)
Built by a second agent and merged in PRs #5 and #6; tickets and decisions in `tickets/sprint-10-year-polish/README.md`, progress in `progress/sprint-10.md` and `progress/sprint-10b.md`. DeeDee's decisions of 2026-11-03 and 2026-11-04 are recorded there.
- [x] **10a, the Year view** (PR #5): sheets above the tab bar; lanes grouped by child with a **Together** group for shared work (Will); 44 px badge tap zones; Today in a sticky axis; bar heights that follow effort at every zoom, scaled to about the 95th percentile of the view so one heavy week can't flatten the rest; labels that fit; 44 px tap zones on thin bars; breaks as a wash over the bars; the edit sheet as mocked; Add assignment without browser controls; the title row.
- [x] **10b, colours, navigation and layout** (PR #6): 12 soft colours with each subject its own; the Subjects screen cleanup; the Week header in one row; a bottom bar under 600 px and an icon rail above; a Set up back link; a centred content column and single-column forms; Home in two panes and the edit sheet as a side panel on wide screens; the 9b carry-overs; and S9b-07.

### Order of work after Sprint 10 (agreed with Will, 2026-11-05)
Sprint 10a and 10b are merged (PRs #5 and #6). Each sprint gets its own branch off `main` and a PR after its tester passes (HOW_WE_WORK, "Branches"). Tickets are written when each sprint starts.

1. [x] **Sprint 11: First run** (built with Sprint 11b fixes; tester READY; merged in PR #8, `fc8a510`; progress in `progress/sprint-11.md`).
   - **Setup flow on a new family's first login,** one question per screen with a progress bar and Back: (1) family name and week start; (2) children, the only required step; (3) school days, Mon–Fri pre-selected, any of the seven; (4) the school year's first and last day and its shape (Fall / Spring by default, renamable; three terms; 36 weeks; 6 on 1 off; or "I'll set this later"); (5) breaks and time off, with US holidays to tick and **Add breaks / I'll get back to you on this / Skip**; (6) subjects from the starter list. "I'll get back to you" leaves a reminder on Home's checklist; Skip leaves none. Leaving halfway resumes at the same step next time. Existing families never see it. **It does not ask for a first assignment and does not prompt for one afterwards** (Will: parents may want to poke around first). **Logging setup is not in it:** Records already asks the first time it is opened (S9-03).
   - **Three one-time hints on Schedule** instead of a tour: the first time Year has bars ("Thicker bars mean more work each day. Tap one to change it."), the first time a bar is opened, and the first time the subject icons show. One at a time, each with "Got it", never repeated; "Show tips again" in Family settings; nothing blocks the screen.
   - Carries Home's fix (baf21b7): on wide screens the briefing spans both panes so Schedule and Records start level.
2. [ ] **Sprint 12: "Did Frank finish…?" and the needs-you dot** (built: S12-01 to S12-07 and S12-09 are done and pushed; the S12-08 tester pass is next; progress in `progress/sprint-12.md`).
   - When an assignment's end date passes, Home shows a clear card asking **Yes, finished / Not yet / We stopped**. Yes marks it done with that date (it feeds Completed on the Year view and the term summary); Not yet opens a date picker to move the end, and the question returns at the new end; We stopped marks it dropped, never counted as finished. Several at once read "3 assignments ended" and open one list. Only the parent's answer marks an assignment finished. It is a schedule fact, not a log entry. On wide screens the card spans both Home panes.
   - **The needs-you dot:** a small fern-accent dot (never alarm red) on the Home tab and rail while something needs the parent's **answer**, for now only completion questions. It stays until answered; screen readers hear "Home, 1 thing needs you". Passive warnings stay in the briefing line without the dot.
3. [ ] **Sprint 13: Printable sheets and term in review** (built: S13-00 to S13-06 are done and pushed; the S13-07 tester pass is next; progress in `progress/sprint-13.md`).
   - **Printable work sheets, weekly and daily (a parent feature).** The parent prints them; children never use the app. "Print sheets" on Schedule · Week: a week or a single day, and one, several or All children, one page per child. Each subject, the assignment and that week's or day's range ("Treasure Island · pages 120–150"), split by day on the weekly sheet; the daily sheet shows only what's scheduled that weekday. Paper checkboxes and a notes line. No minutes, no family overview page (Will).
   - **Term in review.** One card image per child for a term or the year, from Records: the assignments marked finished (Sprint 12), books read, time by subject and school days, each only if the family tracks it. No invented numbers, no favourite-book guess, no parent note. Saved as an image or printed; no public link.
4. [ ] **Sprint 14: Accounts, and undo for Add several and CSV import** (Will, 2026-11-05: accounts now, hosting on hold). Built: S14-00 to S14-06 are done and pushed; the S14-07 tester pass is next; progress in `progress/sprint-14.md`. The hosting fixes in code (below) stay on hold with hosting.
5. [ ] **The end-to-end run** on a realistic Charlotte Mason term (below), then **phase 2, private hosting** for DeeDee (H1–H3 decided first).
6. [ ] **After hosting: the calendar feed.** One-way: a private subscription link a parent adds to Google, Apple or Outlook Calendar, holding events, breaks and optionally assignment start and finish dates (never daily work), with children's names in the titles and an optional feed per child. We never sign in to or read their calendar; Google refreshes within about a day, which the app says. Two-way sync is not planned.
### Sprint 14: accounts and the hosting fixes in code
Discuss with Will before it starts (Will, 2026-11-01). The items are in "Accounts" and "Hosting fixes in code" below.

### Accounts
- [x] **Invite-only accounts, with separate parent logins** (built in Sprint 14, tester next). A `parent` table holds each parent's own login; every family's old login became its first parent. Will and DeeDee make a new family's invite link with `create-family-invite`; a family invites its second parent from Family settings. Links are single use, last 7 days and are stored only as a hash. Sessions last 30 days from last use. Password resets are by hand with `set-parent-login`. Self-serve signup and emailed resets wait until going public, so no email provider is needed yet.
- [x] **Undo for Add several and CSV import** (Sprint 14): one undo for the lot, like the copy panels; CSV import takes up to 200 rows.
- [ ] **Read-only share link** (before the friends beta, phase 4). A secret, revocable link to one family's timeline and This Week, for a grandparent, evaluator or co-op leader. Links are unguessable and hidden from search engines, since they show children's names.

### Hosting fixes in code
Done during the core work, since none needs a host. Details are in "Private hosting".
- [ ] Health check split into liveness and readiness.
- [ ] Graceful shutdown.
- [ ] A lock on migrations.
- [ ] Login throttle that trusts the proxy.

### End to end
- [ ] **The whole loop works on a real family's term:** set up a term, see it on the timeline, adjust a week, update a status, log a week and export it, undo a mistake. Run on a realistic Charlotte Mason-style term, not only the demo family, before phase 2.

## 2. Private hosting

For DeeDee only; nobody else gets the link until phase 4. No public tunnels or hosting without DeeDee's approval (HOW_WE_WORK.md, "Rules"). The deployment gaps from the 2026-10-30 review are listed here. The first four are code-only and are built in phase 1 (core checklist, "Hosting fixes in code"); the production start and backups need the host and are done in phase 2.

- **Health check.** `/api/health` always returns 200, even when the database is down. Split it into liveness (the process is up) and readiness (the database answers), so a load balancer stops sending traffic to a broken instance.
- **Login throttle behind a proxy.** The throttle (10 tries a minute) is per IP and the proxy isn't trusted (`reviews/developer-review.md` L12). Behind a load balancer every user shares one IP, so one person's failed logins would block everyone.
- **Migration race.** The runner has no lock (L16). Two instances starting together can both run migrations. Take a Postgres advisory lock, or run migrations as a separate one-off step.
- **Graceful shutdown.** There is none (L19). On SIGTERM, stop taking requests, finish the ones in flight, then close the pool.
- **A production start.** The API runs through `tsx` and the repo has no container or deploy config. Add a production build and start, secrets from the host (never committed), HTTPS, and the `secure` cookie flag on (it is already on when `NODE_ENV=production`).
- **Backups:** automated, with one restore tested from start to finish.

## 3. Optional modules

Each follows the module rules above. In order:

1. **Records**: **moved into the core in Sprint 9** (see "Schedule and Records" in the core checklist). It is logging the parent types, not something generated from the plan: log setup, entries (hours and minutes, never prefilled, never moving the plan), totals for a range, CSV and a printable summary. Still to come inside it: the term summary (Sprint 13, "Order of work after Sprint 10" above) and a **Charlotte Mason term-exam list** (at the end of a term, each child's books and subjects covered, to draw exam questions from). **CSV safety (built in S9-11):** titles, notes and subject names can start with `=`, `+`, `-` or `@` (for example `=HYPERLINK(...)`); they are stored as typed, so every CSV export escapes such cells (prefix a `'`) so a spreadsheet never runs them as formulas. Every total and export carries the wording: "Made for your state records. It doesn't guarantee your homeschool meets every state requirement; check your state's rules." Nothing claims to meet a state's requirements (APP_OVERVIEW.md, "Product rules").
2. **Daily checklist**, for families who want it: a Today list per child with one-tap done. A tick confirms what the plan already assumes. Never required.
3. **Later, as the hub grows:**
   - **"Smooth this month":** the app suggests moving a bar out of an overloaded week, accepted with one tap. It waits until the briefing shows where overload actually happens.
   - **Co-op groups:** a co-op shares class schedules that appear in each member family's plan. Wait until a co-op asks; the share link and separate parent logins cover the first needs.
   - **Curriculum import** (after the friends beta, if feedback supports it; Will, 2026-11-04). First step: the parent pastes or imports a book's table of contents (CSV import already exists). Publisher data needs partnerships; free schedules such as AmblesideOnline need permission to redistribute. Photo reading of a contents page is risky (mis-entered data).
   - Library due dates, a curriculum budget with ESA receipts, and transcripts, GPA and credits for high schoolers (entry-heavy and legally sensitive; a separate module, much later).
   - Curriculum templates (tied to curriculum partnerships) and the rest of the hub list in `spec/SPEC.md` ("Hub features"). Competitor research of 2026-11-04 informed this list.

## Not planned now

- Lesson or chapter titles on assignments. They need tedious entry; revisit with templates.
- Curriculum templates and partnerships. A later-stage idea, tied to partnering with particular curricula.
- ~~Weekly print.~~ Reversed by Will on 2026-11-04: the parent prints weekly and daily work sheets (Sprint 13, "Order of work after Sprint 10").
- **Portfolio, work samples and photos** (Will, 2026-11-04): a phone or computer folder does this well; storing children's photos adds cost and privacy responsibility for little advantage.
- **A student view, child logins or a per-child app link** (Will, 2026-11-04): children don't need to be in the app; the parent prints daily or weekly sheets instead.
- **Two-way calendar sync** (reading a family's Google Calendar into the app): which child an event belongs to can't be known, and edits would clash. The one-way feed covers the need.
- Daily checkbox grids as the main screen, gamification, AI tutors or built-in lessons, community messaging, and anything that claims state compliance.
- Payments and billing. The friends beta is free, with every Family feature.
- Self-serve signup and password-reset email (before going public).
- AA contrast for inside names on dimmed bars (45 of 240 safe-palette combinations fail, T-11d).
- An even drag preview.
- T-07b manual zoom: pinch, ctrl+wheel and pan (`tickets/timeline/README.md`).
- More label and layout polish.
- (Moved, not dropped: the tester verification of the timeline sprint, like `reviews/sprint-2b-verification.md`, is now required before the friends beta, phase 4.)
- Native app and full offline mode. v1 is web and PWA only.

## Open backlog (Low)

- **N8: a saved school year can't be cleared.** The PATCH in `apps/api/src/routes/family.ts` (~127–131) uses `COALESCE`, so sending null keeps the old value. "I'll set this later" after saving keeps the year and still shows the reminder.
- **Flaky web test:** `timeline-add.test.tsx` fails under load.
- **Week filter:** with Week filtered to Frank, Margaret's late card still shows.
- **N2:** no control to show Home's checklist again once it's hidden.
- **N7 and N9:** cosmetic (see the Sprint 11 review in `docs/reviews/`).

## Done

Commit hashes and notes are in each progress doc.

| Work | Last commit | Where |
|---|---|---|
| Sprint 1: monorepo, engine, schema, login, kids and subjects, plan endpoint (S1-01 to S1-37) | e499c5f | `progress/overnight.md`, `tickets/sprint-1/` |
| Sprint 2a: schedule data (family settings, assignments, days off, recurring events, forms, `npm run demo`) | 1e27062 | `tickets/sprint-2a/` |
| Review fixes RF-01 to RF-12 | 24172fc | `tickets/review-fixes/`, `reviews/review-fixes-verification.md` |
| Sprint 2b: effort weights, assumed progress, weekly check-ins (S2b-01 to S2b-38) | e9d9aad | `progress/sprint-2b.md` |
| Sprint 2c: fixes from the Sprint 2b verification (S2c-01 to S2c-06) | 6346256 | `progress/sprint-2c.md` |
| Sprints 3a and 3b: fast setup (bulk add, copy, CSV import) and fixes · PR #1 | 87b8389 | `progress/sprint-3a.md`, `progress/sprint-3b.md` |
| Sprints 4 and 4b: assignment weekdays, briefing and forecasts, fixes · PR #2 | 49477c8 | `progress/sprint-4.md`, `progress/sprint-4b.md` |
| Sprints 5 to 8b: preview and templates, steering (week adjust, undo, effort in minutes), setup and polish, the CM end-to-end run, the Soft Paper redesign · PR #3 | 5d24ab9 | `progress/sprint-5.md` to `progress/sprint-8.md`, `reviews/` |
| Sprints 9 and 9b: Home · Schedule · Records, logging and export · PR #4 | bd47c55 | `progress/sprint-9.md`, `progress/HANDOFF.md` |
| Sprint 10a: the Year view polish · PR #5 | 6069278 | `progress/sprint-10.md` |
| Sprint 10b: colours, navigation, wide layout, run-of-days chips · PR #6 | f54fb01 | `progress/sprint-10b.md` |
| Sprints 11 and 11b: first run (setup flow, Schedule hints, School year in Set up) · PR #8 | fc8a510 | `progress/sprint-11.md` |

The timeline tickets, in `progress/timeline.md`:

| Ticket | Commit |
|---|---|
| T-01 design tokens · T-01b colour-blind-safe palette | 9df15da · a58731e |
| T-02 view model · T-02b hand-test fixes | 13209a6 · 2282106 |
| T-03 layout · T-03b This Week "Make an adjustment" | a0a1a77 · a8a43a0, f04a4f5 |
| T-04 static SVG timeline | ed51f34 |
| T-05 zoom presets · T-05b All subjects bar · T-05c calm detail and This month | db0db98 · 8891fb4 · 7ecc308 |
| T-06 names inside bars | aa34054 |
| T-07 adjust sheet · T-07c child filter · T-07d demo seed · T-07e edit bar · T-07f month rows | 21158b1 · b24ba30 · 4bb9262 · e998596 · 9dad6cc |
| T-08 drag a bar · T-08b polish · T-08c bar opacity | 7283bf4 · d9777f1 · 31e6a0b |
| T-09 "How did last week go?" redesign | ea9ed8c |
| T-10 add assignment from the timeline · T-10b label overlap | ae916f3 · cd8f104 |
| T-11 gaps, connectors, a name in every piece · T-11b · T-11c names on the bar | 7927305 · 448dc73 · 328cd1d |
| T-11d names above thin bars (+ fix) | d19dd73, e03fd0c |
| T-11e outside names closer to their bars (+ fix) | 3faeab8, c601581 |

## Open decisions for DeeDee

Triaged on 2026-10-30. The older numbered items are in `progress/overnight.md` ("Decisions for DeeDee"); each is listed below by its number there (O1 to O12).

### Decided for the core (phase 1)

Decided by Will on 2026-10-30; DeeDee can still revisit them before the work is merged.

- **C1. Week-adjust mode rule** (overnight O3): **decided: the most recent edit wins**, as the engine does today (`packages/engine/src/placement.ts`). Unblocks "Adjust the current or a coming week".
- **C2. How far undo goes:** **decided: undo the last change, plus reset an assignment to how it was created.** Removal (O4) stays as built: days off are hard-deleted, assignments and events archive-only.
- **C3. Effort input:** **decided: approved as written** in "Effort" above (ask in time, store as effort, carry corrections forward); the heavier/lighter nudge became Update time estimate (Will, 2026-10-31).

### Needed for hosting (phase 2)

- **H1. Where to host,** within about $20 a month.
- **H2. Sessions** (O10): sign the cookie or drop `SESSION_SECRET`, and add expired-session cleanup (the cleanup is built, S14-04: at sign-in and hourly; the cookie is still unsigned-random, hosting decides the rest). The login throttle exists; making it work behind a proxy is in "Private hosting".
- **H3. Time-zone fallback** (O6): a bad stored zone falls back to America/Chicago. Keep that, or ask the family?

### Before going public (phase 5)

- **P1. Working name** for the app.
- **P2. Pricing:** whether the founding offer ($39/yr for life, first 500) is worth it, and whether transcripts belong in Family or are a separate upsell.
- **P3. Signup and password reset:** how reset emails are sent (an email provider).
- **P4. Kid logins under 13 (COPPA):** parent-managed profiles only at first?
- **P5. School year shape:** families set their own start and end dates today. Do we also need year-round or family-defined terms?
- **P6. Which states get record-keeping helpers first**, and the Orthodox overlay (New or Old Calendar, and whether fasts affect anything). Both wait for templates and helpers.

### Accepted as built unless DeeDee objects

These were open, but the current behaviour is a sensible default and nothing in the plan depends on changing it.

- O5. Archived subjects and children in events: the API rejects re-saving them; the events form drops them once the rules are edited, and says so.
- O7. Strict input: every route rejects unknown body fields (RF-09).
- O8. Field and range limits: title 120, total ≤ 100,000, assignments ≤ 1,096 days, days off ≤ 366; lighter-day capacity 0–100% with one decimal. (The minutes-per-unit limit went with S2b-15.)
- O9. Plan inputs: an event or day off whose listed children are all archived is dropped; warnings name the subject.
- O11. Names: the 60-character limit counts UTF-16 units; control characters other than NUL are allowed.
- O12. The earlier stack deviations (Node 22 / cookie@2, the vitest and vite upgrade, zod 4, ESLint 9, React Router 7 and the rest listed in `progress/overnight.md`).

### Settled or superseded

- O1, O2: superseded by S2b-18 (the plan assumes scheduled work was done).
- Default minutes per unit for chapters: superseded by effort weights (S2b-01, S2b-02).
- Password-reset email for the MVP: superseded by invite-only accounts.
