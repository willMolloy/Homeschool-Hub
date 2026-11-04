# New decisions, 2026-11-04 and 2026-11-05 (Will)

> **Order of work (2026-11-05):** Sprint 11 first run (setup flow + one-time Schedule hints), Sprint 12 completion question + needs-you dot, Sprint 13 printable sheets + term in review, Sprint 14 accounts and hosting fixes (discuss with Will first; Will moved it after the features on 2026-11-05), then the end-to-end run and hosting; the calendar feed after hosting. Details: ROADMAP.md, "Order of work after Sprint 10".
>
> **First run (2026-11-05):** a six-step setup flow on a new family's first login (family, children (required), school days, school year and terms, breaks with Add / I'll get back to you / Skip, subjects). No first-assignment step or prompt. Logging setup stays in Records. Three one-time hints on Schedule instead of a tour.

For every agent picking up work: read this with `HANDOFF.md`. Full detail is in [../ROADMAP.md](../ROADMAP.md), sections "Order of work after Sprint 10", "Optional modules → Later" and "Not planned now". Dates are in Will's time zone (US Central).

## The features (order: see the note at the top)
1. **Completion question.** When an assignment's end date passes, Home shows "Did Frank finish Treasure Island?" with **Yes, finished / Not yet / We stopped**. Not yet opens a date picker to move the end; the question returns at the new end. Only the parent's answer marks an assignment finished.
2. **The "needs you" dot.** A small fern-accent dot on the Home tab (and rail) while something needs the parent's *answer* (for now, completion questions only). Passive warnings stay in the briefing line without the dot.
3. **Printable work sheets, weekly and daily, a parent feature.** "Print sheets" on Schedule · Week; pick a week or a day and one, several or **All children** (one page per child). Work only: subject, assignment, range; paper checkboxes and a notes line. No minutes. No family overview page for now.
4. **Term in review.** One card image per child for a term or year: assignments marked finished, books read, time by subject, school days (each only if tracked). No favourite book, no parent note. Save as image or print; no public link.
5. **Calendar feed (after hosting).** One-way subscription link (Google, Apple, Outlook): events, breaks, optionally assignment start and finish. Children's names in titles; optional per-child feeds.

## Later
- **Curriculum import**, after friends beta feedback: start with paste/CSV of a book's table of contents.

## Not planned
- Portfolio, work samples and photos.
- Two-way calendar sync.
- A student view, child logins or a per-child app link (the parent prints sheets instead).
- Daily checkbox grids as the main screen, gamification, AI tutors, built-in lessons, community messaging, compliance claims.

## Done since
- **S9b-07** (day chips on a multi-day log entry) shipped in Sprint 10b (PR #6).
