/**
 * Bump on ANY change that can alter a computed number. The web app compares this with
 * the API's value so a stale PWA service worker never computes with old rules.
 * MAJOR: semantics change; MINOR: new outputs; PATCH: bug fix that changes numbers.
 */
// Pre-1.0, a MINOR bump is breaking (0.2.0: thickness from weight, S2b-02).
// 0.2.1: subject default weights (S2b-32); output changes only when the new input is given.
// 0.3.0: minute outputs removed (S2b-14); plans carry only units and thickness.
// 0.4.0: scheduled work assumed done (S2b-18); plans run from the start, asOf only labels days, logs are ignored.
// 0.5.0: actual-progress check-ins (S2b-20); DayLoad.position, checkInWeeks, finishedEarly.
// 0.6.0: the latest check-in is authoritative (S2b-38); a later check-in replans from the original end and pace.
// 0.7.0: a missed day on or before asOf carries its work forward (S4-00); days before it stay as planned.
// 0.8.0: an assignment is planned only on its weekdays (S4-01); ChildPlan.weekdays and weekdaysSource.
// 0.9.0: changing weekdays mid-assignment keeps the plan before the change (S4-01b).
// 0.10.0: ChildPlan.adjustedWeeks, weekdaysFrom and previousWeekdays (S7b-04); the briefing forecast leaves adjusted weeks out and survives a weekday change.
// 0.11.0: a keepEndDate week adjustment only re-spreads the weeks after it; earlier weeks keep their amounts (S7b-09).
// 0.12.0: a keepEndDate adjustment in the last week pulls the rest back only into the days from today, else the end moves later (S7b-18).
// 0.13.0: an assignment the parent said had ended is closed at its endedOn (S12-04): finished keeps its days to the planned end, stopped ends at endedOn; neither forecasts, leaves unplaced work or warns; ChildPlan.endedAs, endedOn.
// 0.14.0: an assignment finished before its planned end ends at endedOn (S13-00): the work after that day is no longer planned. Finished on or after the planned end is unchanged.
export const ENGINE_VERSION = "0.14.0";
