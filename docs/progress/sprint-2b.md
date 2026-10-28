# Sprint 2b progress: weights, then assumed progress and check-ins

Tickets: `docs/tickets/sprint-2b-weights/`, built in the README's order. One ticket per commit, `scripts/check.sh` green before each.

## Done

| Ticket | Commit | Notes |
|---|---|---|
| S2b-01 weight constants and resolver | 85cd353 | |
| S2b-02 thickness from weight (engine 0.2.0) | 60c1131 | |
| S2b-03 migration 004 `weight_per_unit` | b194b09 | |
| S2b-04 migration 005 `weight_choice` | d648651 | |
| S2b-05 read weights into the plan | 247d62b | |
| S2b-06 `weightPerUnit` on the assignment endpoints | eecac3b | |
| S2b-07 record weight choices on save | b93c01d | |
| S2b-08 a child's usual weight | 97275a2 | |
| S2b-30 migration 006 subject default weight | (this commit) | |

## Decisions (conservative calls on ambiguous points)

- **S2b-02 — the timeline's daily value is thickness.** `aggregate()`'s per-day value moved from minutes to thickness, as the ticket says. Minutes stay on `DayLoad` (deprecated) until S2b-14.
- **S2b-02 — version pins.** API and web tests read `ENGINE_VERSION` instead of a literal, so a version bump doesn't churn them. `apps/web/test/engine-version.test.tsx` still pins the literal on purpose, and gets updated at each bump.
- **S2b-03 — migration tests stay valid as migrations are added.** `db/test/scratch.ts` gained `migrationsThrough("NNN")`, a temp dir holding only the migrations up to NNN. Each migration test upgrades from N-1 to N, so it keeps passing as later migrations land. RF-10's `minutes-unit.test.ts` (db) now uses it too.
- **S2b-05 — seeded weights.** The sample family's fixture weights are `mpu / 2` (math5 chapters 30 → 15, math3 lessons 30 → 15). The seed doesn't write `weight_choice` rows; choices come from saves through the API (S2b-07).
- **S2b-06 — the legacy `minutesPerUnit` column during the transition.** Writes keep the column in step: the alias value when `minutesPerUnit` is sent, weight × 2 when `weightPerUnit` is sent, and always NULL on minutes rows (003's CHECK). The response's `minutesPerUnit` is that column. It equals weight × 2 for anything written through `weightPerUnit`, and keeps the exact legacy value (e.g. 600, which converts to weight 100) for alias writes. That way the RF-10 and S2a tests keep their exact values. Both go in S2b-13/15.
- **S2b-06 — "both fields" means both present.** Both keys present, even as `null`, is a 400 "send weightPerUnit only".
- **S2b-06 — a unit change accepts either field.** Sending the legacy `minutesPerUnit` (or null) with a unit change satisfies D7, because the web still sends only that field until S2b-10. RF-10's old "send minutesPerUnit: null when switching to minutes" message is now the general D7 message. The test is kept, with the new message.
- **S2b-06 — web transition fix.** The assignment form now restates `minutesPerUnit` whenever the unit type changes. Without that, changing the unit on a weighted assignment would get the new D7 400.
- **S2b-07 — what counts as a changed weight.** A PATCH records choices when it sends `weightPerUnit` and the value differs from the stored one, or the unit type changes (lessons 15 → pages 15 is a new pages choice). The legacy alias never records.
- **S2b-08 — suggestion details.** `source` is `child` when exactly one child has history and `children` when two or more do. An even count of children takes the mean of the middle two, then rounds. `choicesFor` drops cleared assignments before ranking, so a clear doesn't take one of the 5 slots (the rule's order: latest per assignment, drop clears, then newest 5). Rounding is `roundWeight`, exported for the endpoint.
- **S2b-30 — named constraints.** The two column CHECKs are named (`subject_default_weight_unit`, `subject_default_weight_range`) next to the ticket's `subject_default_weight_pair`, so errors name what failed. validate section 13 also rejects an unknown unit.

## Deferred

(none yet)
