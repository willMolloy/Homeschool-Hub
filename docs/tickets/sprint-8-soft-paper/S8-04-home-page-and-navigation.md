# S8-04 — Home page and navigation

**Source:** Was S6b-11. Will: "a home page that gives us a nice logo [and] the options to go to schedule or logging pages. Maybe settings too… a way to easily and clearly return home… maybe direct from schedule to logging and vice versa." `design/ux-research.md` §3 Option B (provisional until DeeDee confirms).  
**Depends on:** S8-03  
**Size:** M

## Goal
The app opens on a Home page with the logo, and a bottom bar with **Home · Track work · Schedule** (icons and labels) gives one tap home and one tap between tracking work and the schedule.

## Steps
1. **Home** (`/`): logo and "Homeschool Hub"; greeting with the date and "Week N of M" when a school year is known; the briefing line when something needs attention (with a link); a **Track work** card (per child: a progress line and "N left", plus "Last week needs a quick check" when relevant); a **Schedule** card (a tiny timeline thumbnail and "On track to finish {date}" when known); a **Set up** row ("Children, subjects, books, breaks").
2. **Schedule** (`/schedule`) has a **Week | Year** switch: Week shows this week's planned bars (S8-05) and Year the timeline (S8-07); the switch is remembered on the device. **Track work** (`/track`) holds the last-week check-in and Update status (S8-06). Old routes (`/`, `/timeline`, the old `/schedule/...` setup routes) redirect sensibly (setup routes move under `/setup`).
3. **Set up** (`/setup`): one list of Children, Subjects, Assignments, Days off and breaks, Events, with a one-line description each.
4. **Settings and Sign out** behind the family avatar button on Home (Family settings, Appearance from S8-02, Sign out).
5. Remove the old five-tab bar. Keep the names and the tab set in one config so DeeDee's choice can change them in one place.
6. Logo: a simple placeholder mark (open book with a rising sun, as in the mockup) and wordmark in SVG.

## Done when
- From any screen, Home is one tap away; Track work and Schedule switch in one tap, and Week and Year in one more; every old link still lands on the right screen; Set up lists every setup screen.

## Tests
- Web: routes and redirects; the tab bar's active state; Home's cards with and without briefing and check-in prompts; the avatar menu. Tester: the five-second test.

## Out of scope
- The first-run checklist (S8-09).
