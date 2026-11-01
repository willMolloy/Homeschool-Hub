# S7-13 — Run a Charlotte Mason term end to end

**Source:** ROADMAP.md core checklist, "End to end"  
**Depends on:** S7-01 to S7-12  
**Size:** M

## Goal
Set up and steer a realistic Charlotte Mason spring term for a made-up family through the app's screens, and write down everything confusing or broken.

## Steps
1. In a browser at 390 px (a phone), on a scratch `_dev` database with a new non-demo family: two children (about 7 and 10); subjects including Literature, History, Math, Nature Study, Picture Study (Friday), Composer Study (Friday), Hymn, Copywork; 15–20 living books and lessons, entered with Add several, CSV import and copy; school days Mon–Fri; a Sabbath-schedule calendar template; a Tuesday co-op event with a preview; custom zoom views for terms.
2. Steer six simulated weeks by moving the plan's "today" (`asOf`) forward a week at a time: weekly check-ins (some behind, one ahead), a week adjustment, a sick day under Days off, a mid-term weekday change, a heavier/lighter nudge, an undo and a reset.
3. After each week, read the briefing and the timeline and note whether they tell the truth in a parent's words.
4. Write `docs/reviews/cm-term-run.md`: what worked, what confused, what broke (with steps), and screenshots in `docs/progress/screens/cm-term-run/`. Change no source or test files.

## Done when
- The report covers setup, all six weeks and a short verdict on whether a co-op friend could do this without help.

## Out of scope
- Fixing what it finds (that becomes fix tickets).
