# T-10 — Add assignment from the timeline

**Source:** DeeDee (2026-10-29): the add button belongs on the schedule page, a new assignment shows up there as soon as it's created, and every bar must have a title. **Depends on:** T-08c, T-09. **Size:** M.

## Goal

Add an assignment without leaving the timeline, see its bar at once, and never see a bar without its title.

## Steps

1. Timeline header: one quiet "+ Add assignment" button beside the title.
2. It opens the existing `AssignmentForm` (exported and reused, not rebuilt) in `ResponsiveSheet`: a bottom sheet on phones and, with the new `wide="side"`, a panel along the right edge on wider screens.
3. Form order (on both screens, since it's one form): Subject, Title, Children, Start/End, Unit/Total. The weight sits behind a "More" disclosure, which opens itself on a weight error.
4. On save: close, add the assignment, refetch the plan, briefly highlight the new bar (`tl-flash`, none with reduced motion). If the child filter would hide it, switch to All; at This month, move to its first month if the shown month misses it (`afterAdd.ts`, pure).
5. Titles: required in the client (as before). The API rejects empty or whitespace-only titles with a 400 on POST and PATCH (already so since S2a-03; now tested). The DB has had `CHECK (length(btrim(title)) > 0)` since 001_init, so no migration or backfill is needed.
6. Every bar names itself where it can: an inside name (T-06), or now a plain label just past the end of a bar too short for one, up to the next bar in its row. A selected bar shows its full title in the edit bar (T-07e).
7. Demo: the demo family can add assignments; events stay blocked.

## Done when

- [ ] The header shows "+ Add assignment"; it opens the form as a bottom sheet (< 640px) or a right side panel (≥ 640px).
- [ ] Essentials first; the weight only under More.
- [ ] Saving draws the new bar immediately and highlights it briefly; a filter that would hide it switches to All.
- [ ] A blank or whitespace-only title is refused in the client and with a 400 by the API.
- [ ] Bars too short for an inside name get a label past their end when the row is tall enough; a selected bar shows its full title.
- [ ] The demo can POST /api/assignments; POST /api/events stays 403.
- [ ] **Only what's essential:** one header button; the panel holds just its title, ×, and the form; no helper text, badges or borders added.

## Tests

- `apps/web/test/timeline-add.test.tsx` (new): the panel, field order and More, phone sheet, title required, save + flash, filter → All, Cancel, `afterAdd`, `makeLookups`.
- `apps/web/test/timeline-names.test.tsx`: outside labels (`placeOutsideName`) and their place in the layout.
- `apps/web/test/timeline-view.test.tsx`: the essentials check includes the new button.
- `apps/api/test/assignments-create.test.ts`, `assignments-update.test.ts`: empty, whitespace-only and missing titles → 400.
- `apps/api/test/demo-read-only.test.ts`: the demo adds an assignment (201) while events stay 403.

Decisions: [docs/progress/timeline.md](../../progress/timeline.md).
