# S2b-38 — Make the latest check-in authoritative

**Depends on:** S2b-20, S2b-28  
**Size:** S

## Goal
The most recent check-in decides everything after it (**decision D24**, DeeDee, Oct 28). Editing an earlier week's check-in must not change any bar after a later check-in. A check-in is a snapshot of actual progress, so the future comes from it alone. When no later check-in exists, an edit replans as it does today.

## Context
- Tester finding T5-2 (S2b-28, case 6): week 1 → 65 (keep), week 2 → 140 (push). Editing week 1 to 80 kept week 2's anchor, but the bars after week 2 still shifted a little.
- The cause is in `applyCheckIns` (`packages/engine/src/checkins.ts`). Each check-in's replan read state left behind by the one before it:
  - `pushEndDate` kept `p.baseRate`, the pace the previous check-in set (235/15 vs 220/15 a day on the tester fixture).
  - `keepEndDate` kept `p.endDay`, an end that an earlier push may have moved.

## Steps
1. In `applyCheckIns`, before applying any check-in, snapshot segment 0's `endDay` and `baseRate`. This is the plan without check-ins, including any week overrides.
2. Each check-in's replan uses only:
   - its own position and mode;
   - that snapshot (`pushEndDate`: the original pace; `keepEndDate`: the original end);
   - inputs that no check-in changes (total, calendar, overrides, push limit).
3. **The original end has already passed** (anchor after the original end, possible only after an earlier push): there is no end left to keep, so the rest goes at the original pace (`pushEndDate`). The plan's `mode` reports `pushEndDate`.
4. The week's own bars (D9 scaling) may still change when an earlier week is edited, because "how much happened in week 2" is `position₂ − position₁`. This rule only covers what comes after a check-in.
5. Bump `ENGINE_VERSION` to `0.6.0`, because outputs change for push-after-check-in and keep-after-push.

## Done when
- [ ] Week 2 on push or keep, then week 1 edited (keep or push, behind or ahead): every bar after week 2, the end, the rate and the mode are identical.
- [ ] With no later check-in, editing week 1 replans everything after it.
- [ ] T5-2 is marked resolved in `tester-report.md`, and `REVIEW-GUIDE.md` states the rule.

## Tests
- `packages/engine/test/checkins.test.ts`, under "the latest check-in is authoritative":
  - push and keep at week 2 × three week-1 edits → nothing after week 2 changes;
  - push keeps the original pace;
  - keep keeps the original end after an earlier push;
  - no later check-in → the edit replans;
  - a keep check-in after the original end → original pace.
- `packages/engine/test/tester.checkins.test.ts` case 6 and `apps/api/test/tester3.checkins.test.ts` case 6: the bars after week 2 are identical.
- `apps/web/test/engine-version.test.tsx`: 0.6.0.

## Out of scope
- A later check-in whose week lies past the end only because an earlier push moved the end. If an edit pulls that end back in, the later check-in is reported `checkin-outside-range`, as before. The API only stores check-ins for weeks with planned work, so this can't be created from a fresh week.
- Any API or UI change.
