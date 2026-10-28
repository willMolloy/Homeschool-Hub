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
export const ENGINE_VERSION = "0.6.0";
