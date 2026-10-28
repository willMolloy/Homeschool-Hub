# S2a-17 — Serve and canonicalize time zones

**Depends on:** S2a-02, S2a-13  
**Size:** S

## Goal
The server is the only source of truth for time zones: it serves the list the Settings picker shows, and it stores every zone in one canonical spelling.

## Context
Tester round 2 (Sprint 2a):
- **T2-2:** `AMERICA/CHICAGO` passes (ICU is case-insensitive) and is stored exactly as sent, while `america/chicago` is rejected.
- **T2-3:** the Settings picker lists the **browser's** `Intl.supportedValuesOf("timeZone")`, but the API validates with **Node's** ICU. Chrome offers `America/Coyhaique` (tzdata 2025b), Node 20 doesn't know it, so picking it gives a 400.

ICU's own canonical names are partly outdated (`Asia/Kolkata` resolves to `Asia/Calcutta`, `Europe/Kyiv` to `Europe/Kiev`), so the server maps those legacy names to current IANA names.

## Steps
1. `apps/api/src/http/timeZone.ts`:
   - `canonicalTimeZone(s)`: accepts any letter case. The shape is still `UTC` or `Area/Location[/Sub]`, so abbreviations (`EST`, `GMT`, `Zulu`, `CST6CDT`) and offsets stay rejected. Returns ICU's resolved zone, mapped from a legacy name to its current IANA name, or `null` if the zone is unknown.
   - `timeZoneList()`: Node's `Intl.supportedValuesOf("timeZone")` mapped the same way, plus `UTC`, de-duplicated and sorted. Every entry canonicalizes to itself.
   - The zod `TimeZone` schema transforms to the canonical name.
2. `GET /api/timezones` (signed in) → `{ zones: string[] }` from `timeZoneList()`.
3. `PATCH /api/family` stores the canonical name, e.g. `US/Central` → `America/Chicago`, `america/chicago` → `America/Chicago`, `Asia/Calcutta` → `Asia/Kolkata`.
4. Settings (S2a-13) builds its picker from `GET /api/timezones`, keeping the stored zone first if it isn't listed. While the list loads, or if it fails, only the stored zone is offered (with a note), so the browser's list is never used.
5. Fix the wording in S2a-01 and S2a-02 (the list comes from the server; zones are canonicalized). Update the tester's pinned "stored as sent" tests to the new behaviour.

## Done when
- [x] `GET /api/timezones` lists only zones that `PATCH /api/family` accepts, and each one is stored unchanged.
- [x] `PATCH /api/family` with `AMERICA/CHICAGO`, `america/chicago` or `US/Central` stores `America/Chicago` (T2-2).
- [x] The Settings picker shows exactly the server's list, so a browser-only zone such as `America/Coyhaique` can't be picked (T2-3).

## Tests
- `canonicalTimeZone`: case variants, aliases, legacy ICU names → current names; `EST`, `+05:00`, `Mars/Olympus_Mons`, NUL, non-strings → null
- `timeZoneList`: sorted, unique, includes UTC/America/Chicago/Asia/Kolkata/Europe/Kyiv, excludes Asia/Calcutta/Europe/Kiev; every entry round-trips and is accepted by the API
- `GET /api/timezones` → 200 `{ zones }`; signed out → 401
- PATCH aliases/case → canonical in `/api/family` and `/api/me`
- web: the picker shows the server's zones (not the browser's), the stored zone first when unlisted, and only the stored zone + a note when the list fails

## Out of scope
- Rewriting zones already stored in a non-canonical spelling (reads still go through `safeTimeZone`). The demo seed and all writes are canonical.
- Upgrading Node/ICU.
