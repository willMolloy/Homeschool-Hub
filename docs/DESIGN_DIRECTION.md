# Design direction

Where the app is heading, distilled from Will's reviews of 2026-10-31. Read this with [APP_OVERVIEW.md](APP_OVERVIEW.md) before writing or building any ticket that touches a screen. The research and visual options for it are in `design/ux-research.md` (in progress).

## The one-sentence goal

**A parent opens the app and understands it in five seconds: where they are, what this week holds, and the one thing (if any) that needs them.**

The features are largely there. What's missing is the feeling that the app was designed for a parent rather than assembled by builders. The reviews kept pointing at the same gap from different sides: "looks very 2013", "cluttered", "too much going on", "I don't understand what the table is conveying", "the user may not know what the options at the bottom do", "no home base", "the dropdown doesn't populate", "the bar gets enormously thick".

## What the critiques add up to

1. **One home, two jobs.** The app has a home page (with a real logo) and two main places: **Schedule** (plan and steer the year) and **Log** (this week and the check-in). Settings sit to the side. From anywhere there is an obvious way home, and a direct switch between Schedule and Log. A parent never wonders what a tab means.
2. **One way to do each thing.** When two controls do the same job, keep the clearer one and remove the other (the "Missed a day?" button went because the weekly check-in already covers missed work; the week-step buttons go because date pickers and dragging cover them). Redundant options make parents think they *must* use them.
3. **Show the parent's words, never the engine's numbers.** Pages, lessons, chapters, minutes, dates. Internal values (effort points, thickness, rates) never appear on a parent-facing screen. Debug views live behind a developer flag only.
4. **The default is right; changes take one tap.** The plan assumes work happened. Checking in is "Completed" or a small "Update status" pop-up, not a row of chips, sliders and steppers. Rare actions hide behind a quiet "More".
5. **Pictures over tables.** Soft pastel bars in each subject's colour carry the meaning (what, for whom, how heavy). Tables of numbers don't belong in the main flow.
6. **No dead ends for a new family.** Empty states guide: an empty timeline still shows the calendar; a subject dropdown offers common subjects and "New subject…"; Home shows a short getting-started checklist until setup is done.
7. **Visual truth.** The picture must not mislead: bars have a soft maximum so one heavy day doesn't fill the screen; bars sit close (not touching) so thickness differences read; features that could put a wrong number in front of a parent (book lookup with edition-dependent page counts) are dropped.
8. **A modern, calm look.** Calm and airy, with the soft, rounded shapes of a warm and friendly app; pastel colours; very clean and tidy; light and dark mode that follow the device. Not "2013": no heavy borders, dense forms or default-looking controls.

## The test for every screen

Before a screen ships, it should pass these checks (the tester includes them in its report):

- **Five seconds:** could a parent who has never seen it say what it's for and what to do next?
- **One job:** does the screen have one main purpose, with everything else secondary or hidden?
- **No duplicates:** is there more than one way to do the same thing on it?
- **Parent's words:** does any number or label on it come from the engine rather than the family's own terms?
- **Empty state:** what does a brand-new family see here?
- **Phone first:** does it work one-handed at 360 px, with 44 px targets and nothing scrolling sideways?

## How this changes the plan

- **Sprint 6b** splits in two. The behaviour fixes that don't depend on a visual style go ahead now: the effort table off This Week, the simpler edit bar, the soft bar cap, the pace check, subjects from the form, the empty calendar, tighter bar spacing. The parts that *are* the new look (Home and navigation, This Week's pastel bars, the Completed / Update status check-in) wait for Will's feedback on the UX research, so they're built once, in the chosen style.
- **Sprint 8 (UI refinement)** builds on the chosen direction: design tokens, shared components, every screen restyled, light and dark themes.
- **Sprint 7's Charlotte Mason end-to-end run** also checks every screen against the tests above.
