# S6b-11 — A home page and clear navigation

> **Held:** waits for Will's feedback on the UX research (`docs/design/ux-research.md`), so it's built once in the chosen style and structure.

**Source:** Will's review (2026-10-31): "The app just doesn't make much sense when you look at it. The user may not know what the options at the bottom of the screen do. And there doesn't appear to be a home base page." And: "a home page that gives us a nice logo [and] the options to go to schedule or logging pages. Maybe settings too? When we are at one of the logging or schedule pages we should have a way to easily and clearly return home… maybe direct from schedule to logging and vice versa." See `docs/DESIGN_DIRECTION.md`, point 1.  
**Depends on:** S6b-02, S6b-03 (held with it)  
**Size:** M

## Goal
The app opens on a home page with the logo and clear ways into **Schedule** and **Log** (and Settings); from Schedule or Log there is an obvious way home and a direct switch between the two.

## Starting proposal (to refine with the UX research)
- **Home** (`/`): the logo, the week ("Week of Oct 26"), the briefing when something needs attention, and two large cards: **Log** (this week and last week's check-in, with a hint like "Last week isn't checked in yet") and **Schedule** (the year at a glance). Settings as a smaller link. A new family sees a short getting-started checklist (children, subjects, assignments, breaks) until setup is done.
- **Log** (today's This Week): this week's pastel bars and last week's check-in.
- **Schedule**: the Year timeline, with the setup lists it depends on (Assignments, Days off and breaks, Events) one tap away.
- **Settings**: Children, Subjects, Family settings (and the theme choice in Sprint 8).
- **Getting around:** a header with the logo (tap = Home) and a Schedule / Log switch on those two areas; the old five-tab bottom bar goes.

## Done when (to confirm after the research)
- A parent who has never used the app can say, from Home, where to plan and where to check in, and can get home from anywhere in one tap.

## Tests
- Web: routes and redirects (old links still work), the header switch, the getting-started checklist for an empty family. Tester: the five-second test in `DESIGN_DIRECTION.md`.

## Out of scope
- The new visual style (Sprint 8); the logo artwork itself (a simple wordmark placeholder until one is chosen).
