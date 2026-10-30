# S4-00 — A missed past day carries its work forward

**Source:** review of the Sprint 4 tickets (2026-10-30); see this sprint's README, "Why S4-00 and S4-01b come first"  
**Depends on:** none  
**Size:** M

## Goal
When a past school day is marked missed, the work planned for that day moves forward onto the remaining days, and nothing before it changes.

## Context
- The plan runs from the assignment's start as if every scheduled day before today was done (S2b-18). A day off is just zero capacity, so today a past day off raises the rate over the *whole* range, including days already counted as done.
- Check-ins already re-anchor the plan at a point and replan what's left with a mode (`checkins.ts`, reusing `placeSegment`). A missed day is the same idea at day level: progress stops for that day, and the rest is replanned.
- Planned breaks (vacation, holiday) entered ahead of time are fine as they are and keep today's behaviour.

## Steps
1. Add a day-off kind `missed`: the engine's `BlockedKind`, the DB `blocked_range.kind` CHECK (a migration), and the API's kind enum.
2. Engine rule for a `missed` day `d` for a child: plan as if `d` were not missed, take that plan's position at the end of `d − 1`, keep every day before `d` exactly as that plan placed it, place 0 on `d`, and replan the remaining units from `d + 1` to the end with keepEndDate. Several missed days apply in date order.
3. A check-in in or after the missed day's week still wins over this rule (check-ins are authoritative, S2b-38).
4. `missed` days in the future behave like any other day off.
5. Bump `ENGINE_VERSION`.

## Done when
- The reproduction in the README holds no more: with Oct 28 missed, the position at the end of Oct 27 is still 42.5, Oct 28 has 0 units, and the remaining work spreads from Oct 29 to the end date.
- A `sick` or `vacation` day off behaves exactly as before (existing tests unchanged).

## Tests
- Engine: the README case; two missed days in one week; a missed day on a day with no work for that assignment (no change); a missed day for one child of a shared assignment (the other child unchanged); a missed day followed by a check-in in the same week (the check-in wins); a missed day before the assignment's start (ignored); `test:tz`.
- DB: the migration accepts `missed` and still rejects unknown kinds. API: creating a `missed` day off round-trips.

## Out of scope
- Making the work up this week or pushing the end date back (they need week adjust, C1).
- Changing how planned breaks work.
