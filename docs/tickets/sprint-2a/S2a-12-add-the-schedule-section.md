# S2a-12 — Add the Schedule section

**Depends on:** Sprint 1  
**Size:** XS

## Goal
A fourth main-nav item, **Schedule**, leads to a simple hub with links to Assignments, Days off, Events and Family settings.

## Context
The phone bottom bar has room for four items at 360 px. The screens behind it are plain lists and forms; the timeline stays out until the pilots decide its shape.

## Steps
1. Routes `/schedule`, `/schedule/assignments`, `/schedule/days-off`, `/schedule/events`, `/schedule/settings` (placeholders until their tickets).
2. Nav item marked current on any `/schedule/*` route.
3. Add `apiDelete` to the API client.

## Done when
- [ ] The nav shows Plan, Kids, Subjects, Schedule at 360 and 1280 px without overflow.

## Tests
- nav links and aria-current on a nested route
- hub lists four links

## Out of scope
- The timeline itself.
