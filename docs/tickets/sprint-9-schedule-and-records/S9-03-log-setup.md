# S9-03 — Log setup: choose what to track

**Source:** Will, 2026-11-01 (configurable logging; template styles, never state names)  
**Depends on:** S9-01  
**Size:** M

## Goal
A parent chooses once what their records track, starting from a template style, and can change it any time.

## Steps
1. Records → "Set up your log" (shown first for a family with no setup). Template styles, each a starting point the parent can adjust:
   - **Hours by subject**: hours per subject.
   - **Core and non-core hours**: hours per subject, each subject marked core or non-core; totals by both.
   - **Days attended**: school days only.
   - **Days and hours**: school days plus total hours.
   - **Detailed log**: hours by subject, notes and books read.
2. Under the template, the fields as switches: hours by subject; core/non-core; school days; home vs away hours; notes; books read.
3. Core/non-core is set per subject (on the subject form and in Log setup).
4. A help line: "Not sure which fits? Your state's rules decide what to keep." with a link to HSLDA's state laws page. No state names in the app.
5. Stored on the family (migration); changing it never deletes logged data, it only hides fields.

## Done when
- A new family picks "Core and non-core hours", marks Math core and Art non-core, and the log form shows exactly those fields.

## Tests
- API: setup round-trips; subject core flag. Web: templates set the right switches; switches change the log form; no data lost when a field is turned off and on.

## Out of scope
- Work samples and photos (Will: hold off).
