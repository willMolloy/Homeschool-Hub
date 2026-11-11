# S19-06 — Show a title on each break

**Source:** DeeDee, 2026-11-11. **Depends on:** —. **Size:** S

## Goal

Every break on the year view shows a title, a one-weekday off does not need a name, and a break of a week or longer does.

## Context

The year view draws a break as a wash and does not paint its name, so a short block looks empty, almost like a glitch. Days off can already be saved with a blank label. The first-run "Add a break" form requires a name for every break. There is no separate "repeat every Wednesday" tool; a Wednesday off is a day off on that weekday.

## Steps

1. On the year view, each break shows a title. The block is not an empty wash.
2. A break that falls on only one weekday (one Wednesday, or several separate Wednesdays) does not require a name, on Days off or in first-run setup.
3. If she leaves that one-weekday break unnamed, the title is automatic. **Default, not a blocker:** "Wednesdays off" (the weekday, plural), including for a single Wednesday, so a row of them reads the same.
4. A break of a week or longer requires a name before it saves, and that name is the title on the year view. **Default, not a blocker:** "a week or longer" means the first day through the last day is 7 calendar days or more. A shorter break of more than one day may still be unnamed; if it is, keep today's kind name ("Break", "Holiday", "Sick day").
5. **Default, not a blocker:** when the band is too narrow for the words inside it, draw the title just above the band, the way a thin bar puts its name above the bar.
6. An existing long break with no name can still be opened. Saving it asks for a name. Viewing it does not.

## Done when

- An unnamed Wednesday off shows "Wednesdays off" on the year view and does not demand a name.
- A break of seven or more days will not save without a name, and the year view shows that name.
- Only break titles and that name rule change.

## Tests

- Web: an unnamed one-day Wednesday renders "Wednesdays off"; a named two-week break renders its name; saving a 7-day break with a blank name is refused; saving a one-day Wednesday with a blank name works. Light and dark, at 390 and 1280 px.

## Out of scope

- A new control that repeats a weekday for the whole year.
- Changing which days the break takes off the plan (Sprint 21 asks what to do with overlapping assignments).
- Renaming holidays she already named.
