# S20-06 — Open a log on one day

**Source:** DeeDee, 2026-11-11. **Depends on:** S20-05. **Size:** S

## Goal

A log entry starts as one day, and several days is a choice that opens a form with a first day and a last day.

## Context

The form always shows a first day and an optional last day. She wants one day first, because a school-day entry is usually one day. Several days at once is available, and that path should be obvious about which date is the start and which is the end. The fields she fills still follow her logging style.

Count as a school day stays on unless she turns it off.

## Steps

1. A new entry opens on one date, labeled Day. Count as a school day is on. There is no last-day field yet.
2. She can choose to log more than one day. That reveals First day and Last day, in those words, and the day ticks for which days count.
3. **Default, not a blocker:** the control is a button, "Log more than one day". The hours, notes, and school-day switch stay the ones her logging style already uses. Several days does not add a second set of questions.
4. Last day must be on or after first day. The ticks default to her usual school days inside that span, as they do now.
5. Editing an entry that already covers more than one day opens on First day and Last day. Editing a one-day entry stays on Day.

## Done when

- A new log starts as one day, and saving it counts that day.
- Choosing several days shows First day and Last day, and saving a Monday-to-Wednesday span counts the ticked days.
- Books read is not on either form.

## Tests

- Web: the new form has one date until she asks for more; the multi-day path labels First day and Last day; a one-day save counts one school day; a three-day save counts the ticked days; an existing multi-day entry opens with both dates.

## Out of scope

- Prefilling hours from the schedule.
- Changing which logging style she picked (S20-04).
