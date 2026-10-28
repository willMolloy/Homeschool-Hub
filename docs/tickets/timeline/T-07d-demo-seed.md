# T-07d — Richer demo seed

**Source:** DeeDee's request (PO message, 2026-10-28): "I also want to see an example where the schedule is more dynamic. Read a book in 3 weeks for example so we get to see the schedule handle more variable scenarios." **Depends on:** T-07c. **Size:** S.

## Goal

The demo family's year shows the variety a real family's schedule has, so the timeline can be judged on more than even bars.

## Context

- `db/seed.ts` seeded the engine's sample family (`packages/engine/test/fixtures/sample-family.ts`). The engine and API tests compare numbers with that fixture, so it stays as it is.
- The preview (`.preview/setup-db.ts`), `npm run demo` (`db/demo.ts`) and `npm run db:seed` all call `seed(url)`.
- The demo's "can't add events" rule (`assertNotDemo`) is keyed on the login `demo@example.com`, not the data.
- `week_override` and `progress_checkin` / `week_review` already exist, so overrides and past check-ins can be seeded as rows.

## Steps

1. `db/seed-data.ts`: a `SeedFamily` shape (calendar, weights, children, subjects, assignments with titles, events, labelled breaks, and optional overrides, check-ins and reviewed weeks). `SAMPLE_FAMILY` is the engine fixture in that shape, with the titles, colours and labels the seed already used.
2. `db/demo-family.ts`: `DEMO_FAMILY`, the 2026–27 year (Mon Aug 31 … Fri May 21):
   - Frank: Aesop's Fables in two weeks, **Treasure Island in three weeks**, then The Hobbit (chapters) straight after, Black Beauty, Robinson Crusoe, The Wind in the Willows.
   - Margaret: The Secret Garden (chapters) with A Child's Garden of Verses (pages) overlapping, **Charlotte's Web in three weeks**, Heidi.
   - Math 5 and Math 3 in lessons all year. Margaret's Times tables overlap Math 3 for October.
   - A shared History spine. Science 5 for Frank, Nature study for Margaret. Frank's **Science fair project is heavy for three weeks (6 lessons a week, by week overrides), then lighter** to the same end.
   - Piano and violin all year. **Drawing basics (Art) starts mid-year**, in January.
   - Events: co-op Tuesdays, Frank's piano lesson, Margaret's violin lesson, and Frank's swim lessons from January to March.
   - Breaks: Labor Day (holiday), Thanksgiving week, Christmas and spring break.
   - Check-ins: week of Oct 5, Frank read 6 chapters of The Hobbit where 3 were planned (push: it ends early). Week of Oct 12, Margaret finished chapter 11 of The Secret Garden where 14 were planned (keep: the rest gets thicker). Both weeks are marked reviewed.
   - Frank carries more than Margaret.
3. `seed(url, email = DEMO_EMAIL, family = DEMO_FAMILY)` writes the overrides, check-ins and reviewed weeks too, in the same transaction. It is still idempotent (the family is deleted by login and recreated).
4. The API test helper and the sample seed test pass `SAMPLE_FAMILY`, so every number those tests pin stays the same.

## Done when

- [ ] The preview's demo shows every scenario above, and its Year, This month and single-child views make sense.
- [ ] `seed` runs twice with the same counts, and the demo login still can't add events.
- [ ] API and engine tests still use the sample family, unchanged.
- [ ] **Only what's essential:** believable names and amounts. No placeholder or "test" titles, and nothing only a developer would understand.

## Tests

- New `db/test/demo-family.test.ts` (pure): every assignment plans with nothing left over. Treasure Island takes three weeks and The Hobbit starts the next Monday. Chapters sit beside pages. Two overlaps in one subject. A mid-year start. Math runs all year in lessons. The fair is 18 lessons in its first three weeks, then 6 over the last three. A holiday, a break week and events. One check-in ahead of plan and one behind (with their end effects). Frank's load is more than 1.2 × Margaret's.
- `db/test/seed.test.ts`: the sample family keeps its counts. The demo is the default, with its counts (overrides, check-ins, reviews), the three-week Treasure Island and both break kinds. Running it twice, beside a sample copy, gives no duplicates.
- `db/test/demo.test.ts`: `prepareDemo` counts are now the demo family's.
- New `apps/api/test/demo-family-plan.test.ts`: the demo family planned through `GET /api/plan`. The check-ins and the fair's heavy weeks are applied.

## Out of scope

- Logs (`log_entry`). Changing the sample fixture. A demo for a one-child family.
