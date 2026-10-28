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
| S2b-30 migration 006 subject default weight | 643a260 | |
| S2b-31 `defaultWeight` on the subject endpoints | 958f9b4 | |
| S2b-09 weight-suggestion endpoint | e8e6eb3 | |
| S2b-32 subject default weight in the engine (0.2.1) | 2a42df0 | |
| S2b-33 load subject default weights into the plan | b5b9bc4 | |
| S2b-10 weight field on the assignment form | b7f48ec | |
| S2b-34 thickness picker with preview bar | bcded18 | |
| S2b-35 default weight on the subject form | 238ef3a | |
| S2b-11 prefill the weight and show its source | (this commit) | |

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
- **S2b-31 — the roster repo grows table-specific columns.** `rosterRepo(table, extraCols)` lets subject add `default_weight_unit` / `default_weight` without forking the shared child/subject SQL; unknown extra keys throw. `UnitTypeField` moved to `http/scheduleLimits.ts` beside the new `DefaultWeight` schema, so assignments and subjects share one unit validator.
- **S2b-09 — query parser location and repeats.** `SuggestionQuery` lives in `http/scheduleLimits.ts`, not `http/validate.ts`: it needs `IdList` and `UnitTypeField`, and `scheduleLimits` already imports `validate`, so putting it in `validate` would make an import cycle. "De-duplicated. Malformed or repeated → 400" is read as: a repeated id is a 400 (same as every other id list), not silently merged. Empty `childIds=` means no children; a trailing comma is a 400. `MAX_ASSIGNMENT_CHILDREN` moved to `scheduleLimits` so both routes share it. The service reads in one read-only snapshot.

- **S2b-32 — matching entry.** `planChild` uses the `subjectWeights` entry whose subject *and* unit match the assignment; other entries are ignored. A non-positive or non-finite default falls back to the built-in, the same as `weightPerUnitOf`.
- **S2b-33 — where the demo default lives.** The demo family is seeded from `packages/engine/test/fixtures/sample-family.ts` by `db/seed.ts` (`db/demo.ts` only calls `seed`), so Math's lessons-20 default was added to the fixture as `subjectWeights` and written by `seed`. That keeps "API output equals the engine fixture" true: the load-plan comparison now passes the fixture's `subjectWeights` too, and Fractions unit plans at 20 a lesson with source `subject`. `plan-contract` sets the default through `PATCH /api/subjects/:id` and checks the plan says `subject`. Archived subjects' defaults are loaded (harmless: their assignments are still left out by the existing archived-subject rule).

- **S2b-10 — unit change and card text.** Changing the unit in the form clears the weight (blank → null) rather than keeping a number meant for another unit; S2b-11 will put the suggestion there. The PATCH always carries `weightPerUnit` when the unit changes. The card resolves the weight with the engine's `weightPerUnitOf` against the subject's `defaultWeight` from `/api/subjects`, so it says "(subject)" only when the default is for the same unit (D23). `Subject.defaultWeight` was added to the web types now (the API has returned it since S2b-31). `minutesPerUnit` stays on the web type as optional and is never sent; `BODY_KEYS` keeps it until S2b-13 because the API still accepts it.

- **S2b-34 — scale and Custom.** No plan timeline exists yet, so `thicknessToPx` lives in `features/plan/scale.ts`: 2 px per thickness point, clamped to 0–100 px ("clamped at 100" read as the 100 px maximum bar). The preview bar's height is the thickness, next to a faint 20-pages-at-normal reference (40 px). Choosing Custom… starts the field at the current value (or the built-in) and emits it; an invalid custom number shows an error and emits nothing. Custom stays selected while typing even if the number equals a preset, and is tied to the unit so a unit change closes it. The control is in `src/components/` (the ticket's path) with its preset math in `weightPresets.ts`; it doesn't import from the schedule feature.

- **S2b-35 — a SubjectForm, not a bigger RosterForm.** `RosterForm` is shared with kids, so it only gained a `children` slot; `SubjectForm` wraps it and adds `DefaultWeightSection`. `RosterPage` takes an optional `extension` (extra initial values, the form to render, a row badge) and now diffs every value key for its PATCH, so kids behave exactly as before. Creating a subject always sends `defaultWeight` (null for None), as the ticket says. The affected-assignments note counts live assignments in that subject **and the unit currently chosen** with no weight of their own (S2b-32: a default only applies to the same unit). It loads `/api/assignments` only while editing, since the subjects page doesn't otherwise have that list, and says nothing if the list fails to load. A 400 whose message names `defaultWeight` is shown inside the section; other errors still show under Name. The section starts open when the subject has a default. Unit labels moved to `components/unitLabels.ts` so the assignment and subject forms share them.

- **S2b-11 — the wording and states the ticket left open.** The field shows the suggestion until the parent types; only then is the text theirs. Unwritten hint cases follow the given pattern: built-in override "Your weight (2). The default for pages is 1."; several children without history "Ada and Bo have no history yet."; a cleared field shows the S2b-10 "Blank = …" text with the Use button (and sends null). A typed number equal to the suggestion is sent explicitly ("any typed value is sent explicitly") but shows the normal hint. Child ids are sorted in the request so ticking order doesn't refetch the same answer; while a new answer loads the last one for the same unit stays shown. The null-weight placeholder reads "20 from Math" for a subject default and just the number for the built-in. The fake API answers the endpoint with the built-in by default, and the existing add tests now wait for that prefill before typing.

## Deferred

(none yet)
