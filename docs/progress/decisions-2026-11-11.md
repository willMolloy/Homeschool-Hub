# Decisions, 2026-11-11 (DeeDee)

She ran the app locally on current `main` (Sprint 18 already merged) and settled the notes below. Nothing in this file is built. The build order is Sprint 18b, then Sprint 19, then Sprint 20, then Sprint 21. Hosting stays on hold until Will says go.

Sprint 18b is unchanged and stays its own sprint: `docs/tickets/sprint-18b-follow-ups/`. Do not rewrite those tickets or fold them into 19–21.

Full tickets: `docs/tickets/sprint-19-visual-print/`, `docs/tickets/sprint-20-minutes-check-in/`, `docs/tickets/sprint-21-break-overlap/`. Where a tiny label was not chosen, the ticket states a default. Those defaults are not open questions.

## Sprint 19 — visual and print

- The date picker has to stay fully on screen, including in the right-hand panel when she adds or edits an assignment, on a desktop and on a phone.
- Home's Records card should be the same height as the Schedule card.
- Log should look like a button she presses, not like a tab she is already on.
- Bar thickness should show the difference between a light day (about 40 minutes) and a heavy day (about 150 minutes). Bars should be a little more opaque, not solid. Look again at the year view's 95th-percentile clamp if that is why they match. Do not change how minutes are stored in this sprint.
- The weekly print should be grouped by day. The on-screen Bars / Days toggle stays as it is.
- Breaks on the year view need a visible title. A single weekday off, such as Wednesdays, does not need a name; if she leaves it blank, show something like "Wednesdays off". A break of a week or longer needs a name, and that name is shown.

## Sprint 20 — minutes, check-in, and logging

- Minutes ask only how many minutes a day, plus the dates. No total to finish, and not the pages / lessons / chapters pattern. The bar uses that daily amount. Piano can be 30 minutes with nothing to complete.
- If the week was chapters 16–18, "got through" starts at 18, not 19. Switching to ahead or behind does not change the number by itself. Same for working ahead.
- A pending check-in for the previous week should be obvious on Home, with a short line on why it matters, and it stays optional. Use the needs-you pattern.
- Logging styles need a plain explanation, and a live sample that changes as she turns options on or off.
- Books read comes off Records and off logging. Term in review can still show books she marked finished on the schedule.
- A log entry starts as one school day. Several days is a choice, and that path says first day and last day.

## Sprint 21 — a break that overlaps work

Breaks already exist. The new part is the question. When a break covers assignments she already planned (February off is the example), ask about each overlapping assignment:

- Keep the end date, and let the other weeks carry the work.
- Push the end date back by the length of the break.
- Push the end date to a day she picks.

A partial overlap still counts. Finished work is left alone. One undo reverses the break and the moves. The plan does not change quietly.
