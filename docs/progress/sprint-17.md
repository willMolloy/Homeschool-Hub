# Sprint 17 progress: backlog cleanup and end-to-end run prep

Branch: `claude/sprint-17-cleanup`, cut from `main` (after the Sprint 16 merge, PR #14) on 2026-11-05 with Will's permission for per-sprint branches. Tickets: `docs/tickets/sprint-17-cleanup-and-e2e-prep/`. S17-05 (the tester pass) is not part of this build.

| Ticket | Commit | Notes |
|---|---|---|
| S17-01 Low backlog cleanup | (this commit) | One commit, each item testable. **1 Week filter:** `Briefing` takes the Week's child choice (`childId`, null for All children), so one child's view shows only that child's late and plan lines. **2 Checklist:** Family settings has a "Getting started" card with "Show the getting-started checklist again", shown only while the checklist is hidden (it sends `checklistHidden: false`). **3 L5:** Rose is now `#F9C0BE` / `#A8243F` (light) and `#613033` / `#FA9DA6` (dark), 10.3 / 8.4 CIEDE2000 from Lilac (was 7.0 / 5.7), still 9:1 ink on the fill and AA; the swatch row also says in words which subject uses the swatch you are on ("Lilac is also used by Reading."). **4 N6:** `lib/kindNames.ts` is the one set of words (Break, Holiday, Sick day, Day off, Missed day) for the Days off list and its Kind list, the weekly and daily sheets, Days and the week sheet; the parent's label always wins. **5 N4:** a 429 on an invite, a view link or a join reads "Too many tries. Please wait a minute and try again." (`saveError` and the join page). **6 N4 (Sprint 13):** at 900 px wide and up to 960 px high Term in review is two columns (card and pager left, range, child and Print / Save right): at 1280 x 800 the card is 517 x 646 px, was 352 x 440; at 1280 x 720 453 x 566 (was 288 x 360). **7 Sprint 15 Lows:** N1 the viewer guard is an `onRequest` hook, so invalid or empty JSON from a viewer is 403 (a signed-out request is 401, a parent's still 400); N2 at daily detail a row whose blocks can hold no name at all gets the name on a small muted line just above it, left-aligned with its first block (`placeNameAbove`, +14 px for that row only; checked at 320 and 360 px in light and dark on the demo family); N3 already read "Chapter 8 · finish" since S16-11, now pinned by a test; N5 `maxParamLength` raised to 2000 so a long join token gets the plain 404 bad-link answer, not the framework's 414; N6 the join page sends `robots: noindex, nofollow` as well as no-referrer. **8 Smoke:** a scenario that exports `scratchScreens = true` (`sheets`) writes its screenshots to the temp folder, unless `SCREENS_DIR` is set. **9 ROADMAP:** "Open backlog (Low)" now says none are open. Tests: api `s17-01-viewer-json-and-long-token` (3), web `s17-01-low-backlog` (24). **Changed expectations:** `briefing.test.tsx` "unplaced work and no-capacity lines" now picks All children first (the Week briefing follows the child switch); `s14-02-join-page` expects the new throttle sentence |

## Decisions

- **S17-01 N3 wording:** the ticket says "Finish Chapter 8"; the Sprint 16 words are "Chapter 8 · finish" (S16-08, S16-11), and that is what the last day of a 0.4-a-day book reads. Kept that one convention.
- **S17-01 week filter** applies to the Week view's briefing only. Home's one-line briefing is for the whole family and is unchanged.
- **S17-01 N2 rule:** a row needs the line above only when none of its assignments gets any name placed (inside, cut, or to the right); an assignment already named to the right of its last block, or inside its wide post-break block, keeps that. Only daily (This month) detail; Term and Year are untouched. Two thin-row names on one line never overlap (the later one is dropped).
- **S17-01 day-off words:** the Kind list's options changed from "Vacation / Other" to "Break / Day off" so a kind and its label-less title are the same word everywhere.
- **S17-01 Rose only:** Lilac keeps its recorded values (a test pins the first eight light fills); Rose moved toward red-salmon, and stays at least 7 from every other fill (the palette's own rule).
- **S17-01 noindex** is on every join page (new family, parent, viewer), not only the view-link one, because the page is the secret link in all three cases.
- **S17-01 N5:** the framework's parameter limit is raised rather than special-casing the join routes, so any route with a long id param answers with its own 404 or 400, not a 414.

## Gate counts (each ticket's commit, ALL GREEN)

| Ticket | engine | API | web | db |
|--------|--------|-----|-----|----|
| S17-01 | 437 | 1192 | 1678 | 180 |
