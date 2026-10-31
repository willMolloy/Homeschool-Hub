# S6-08 — Undo after a change, and reset from the edit bar

**Source:** decision C2  
**Depends on:** S6-06, S6-07  
**Size:** M

## Goal
After a plan change, a small "Undo" appears; and an assignment can be reset from the timeline edit bar.

## Steps
1. After any undoable change in the app (timeline drag or edit, assignment form, missed day, week adjustment, reset), show a quiet bar at the bottom: "{label}. Undo". It stays until the next change or navigation, and is reachable by keyboard.
2. Undo calls `POST /api/undo` and refreshes the plan; a 409 shows "That change can't be undone any more."
3. The edit bar's "More" (or the assignment form) has **Reset to original**, with a confirm ("Put {title} back to how you created it?"). After reset, the undo bar offers to undo the reset.

## Done when
- Drag a bar → Undo → it's back. Reset → confirm → original dates and weight; Undo → as before the reset.
- Only what's essential; 360 px; 44 px.

## Tests
- Web: the undo bar after a drag, a form save and a missed day; Undo sends the request and refreshes; 409 message; reset confirm and request; undo of a reset.

## Out of scope
- An undo history list.
