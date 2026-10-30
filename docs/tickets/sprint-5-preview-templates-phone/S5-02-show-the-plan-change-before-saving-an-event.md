# S5-02 — Show the plan change before saving an event

**Source:** ROADMAP.md, "Preview before saving an event"  
**Depends on:** S5-01  
**Size:** M

## Goal
The event form shows, before Save, what the event will do to the plan: "Treasure Island (Frank): 5 → 6 pages a day".

## Context
- `EventForm` in `features/schedule/EventsPage.tsx`. Unit labels are in `components/unitLabels.ts`.

## Steps
1. Once the form is valid, call the preview endpoint (debounced about 400 ms after the last change to days, children, rules or dates).
2. Show a short "What changes" list under the rules: up to 5 rows, "{title} ({child}): {before} → {after} {unit} a day", plus "Ends {date}" when the end date moves, and "and N more" when there are more.
3. If nothing changes, show "No change to the plan." While loading, keep the previous list (no spinner flash). A preview error shows nothing and never blocks Save.
4. Save works as before.

## Done when
- Changing a rule updates the list; Save still saves; the preview never blocks Save.
- Works at 360 px; only what's essential.

## Tests
- Web (fake API): a valid draft shows rows in the format above; "No change to the plan." when empty; more than 5 rows shows "and N more"; a preview error leaves Save working; the request is sent once after rapid changes (debounced).

## Out of scope
- Previews on the timeline.
