# S20-05 — Take books read off the log

**Source:** DeeDee, 2026-11-11. **Depends on:** —. **Size:** S

## Goal

Books read is gone from logging and from Records, and term in review shows finished books from the schedule.

## Context

The log has a books-read field, Records lists those titles, and the detailed style turns the field on. That reads as if the schedule and the log were tied together, and typing the titles again does not help the log. Records already counts books she marked finished on the schedule. Term in review should use that list, not a separate books-read log.

## Steps

1. Remove books read from log setup (the switch and the detailed style), from the log form, from suggestions, and from Records (the "books mentioned" list and any books-read total).
2. Export no longer offers a books-read column. A print summary does not list typed book titles.
3. Term in review shows finished books by borrowing the schedule: assignments she marked finished, the same books as Records' Books finished card, for that child and that range. It does not read a books-read log field.
4. Records keeps Books finished. That card is the schedule, not the log.
5. **Default, not a blocker:** titles already stored on old log entries stay in the database and are not shown or edited. Do not drop the column in this ticket.
6. **Default, not a blocker:** Home's Records line changes from "Attendance, hours and books" to "Attendance and hours".

## Done when

- A new log entry has nowhere to type a book.
- Records no longer shows books read. Books finished still lists a book she marked finished.
- Term in review shows that finished book even when the log never had a books field.

## Tests

- API or web: setup cannot turn books on; a log save has no books; Records has no books-read list; term in review includes a pages or chapters assignment marked finished in the range, and ignores any old typed titles. Books finished on Records still matches that assignment.

## Out of scope

- Deleting old book strings.
- Guessing a favourite book, or inventing a finish she did not mark.
