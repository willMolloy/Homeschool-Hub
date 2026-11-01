# Sprint 9 progress: Schedule and Records

Tickets: `docs/tickets/sprint-9-schedule-and-records/`. S9-10 (tester pass) is the tester's.

**Build order (README):** S9-01, S9-04, S9-05 (no check-in item), S9-06, S9-02, S9-03, S9-07, S9-08, S9-11, S9-09. Screens are in `screens/sprint-9/`.

**Will's latest decisions (2026-11-01):** logging picks All children, or one or several children, per entry; hours are typed as hours and minutes; an entry for several children is stored as one entry per child; old check-ins keep steering the plan but never count as log entries; logs are never prefilled; logging never changes the plan; each entry counts as a school day by default with a visible switch; Log setup offers template styles and never names a state; the S9-08 wording is used exactly.

| Ticket | Commit | Notes |
|--------|--------|-------|
| S9-01 Navigation: Home, Schedule, Records | (this commit) | `layout/nav.tsx` (tabs, `/track` redirect), `router.tsx`, `features/records/RecordsPage.tsx` (placeholder), `features/home/HomePage.tsx`, `home.css`, `plan/Briefing.tsx`. Reviewed an unfinished earlier attempt: kept it, removed the dead per-child progress CSS |

## Decisions

- **S9-01 Records is a placeholder** ("Records — coming soon") until the later Records tickets.
- **S9-01 Track work code stays, unlinked.** `routes/TrackPage.tsx`, `features/track/` and the check-in hooks are untouched but nothing routes to them: `/track` (with its query) redirects to `/schedule?view=week`. A finished week can still be checked in from Schedule · Week by stepping back a week (that board is the same component). Its tests render the page directly (`renderTrack` in `test/render.tsx`).
- **S9-01 the unanswered-check-in nudge** on Schedule · Week ("Last week isn't checked in yet.") stays for now and links to `/schedule?view=week` (it used to link to `/track`). Home never showed it (Briefing `showNudge={false}`) and still does not.
- **S9-01 Home** has two equal cards, Schedule (unchanged content) and Records ("Attendance, hours and books"; no totals until Records exists). The Track work card, and with it its "All done" beside "needs a quick check" contradiction, is gone.
- **S9-01 changed test expectations.** `css-contrast.test.ts`: the `.home-track i` and `.home-dot` selectors are dropped from its non-text list because the per-child progress bar and the check-in dot they styled are gone (the test insists every listed selector exists). `app-shell.test.tsx`: the tabs are Home, Schedule, Records (was Home, Track work, Schedule), the active-tab and one-tap tests use Records. `router.test.tsx`: `/records` shows "Records" (was `/track` showing "Track work"); new cases that `/track` and `/track?week=...` land on `/schedule` with `view=week` and the query kept. `home.test.tsx`: the two Track work card tests (per-child "N left", "Last week needs a quick check") are replaced by one test that Home has exactly the Schedule and Records cards; the new-family test looks for Records; the tab-names and 44 px card-link tests say Schedule and Records; the briefing test waits for the Records link instead of the child's name (no per-child rows now). `s8b-fixes.test.tsx` N9 ("Nothing planned, not All done" on Home) now checks Home shows neither line, since the per-child progress rows no longer exist; the N10 test renders the Track page directly. `briefing.test.tsx`: the nudge link goes to `/schedule?view=week`, and the test that followed it to Track work and confirmed there is removed (that page has no route; S9-02 retires the card and page for good). `undo-bar.test.tsx` leaves the page by the Records tab. `track.test.tsx`: renders the page directly (`renderTrack`) instead of at `/track`; assertions unchanged.
