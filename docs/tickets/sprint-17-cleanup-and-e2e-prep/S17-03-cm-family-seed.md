# S17-03 — A realistic Charlotte Mason family for the end-to-end run
**Size:** M
## Goal
A seed script that builds a believable Charlotte Mason family for one full term, so the end-to-end run tests real use, not the demo.
## Steps
1. `scripts/e2e/seed-cm-family.ts` (dev databases only, refuses names not ending `_dev`): a family with three children (about 13, 10 and 7), a co-op account, and a second parent.
2. A Fall term (Aug 17 – Dec 18) and Spring (Jan 4 – May 21) with Thanksgiving week and a Christmas break; a Tue–Fri school week for the youngest via assignment days; Friday co-op events.
3. About 30 assignments in Charlotte Mason style: living books in pages and chapters (some shared as Together work), math in lessons, picture study and composer study once a week, nature study in minutes, copywork, recitation; a few finished early, one stopped, one running late.
4. Six weeks of typed log entries (core/non-core hours, school days, books), some run-of-days entries with a Saturday catch-up.
5. A viewer (a grandparent) on the family, and the parents as viewers of the co-op.
6. Prints the logins at the end (local passwords only).
## Done when
- One command builds the family on a fresh dev database, and every screen has realistic content.
## Tests
- A db test that the script runs on a scratch `_dev` database and refuses a non-dev name.
