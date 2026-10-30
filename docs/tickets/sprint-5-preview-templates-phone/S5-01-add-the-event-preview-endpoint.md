# S5-01 — Add the event preview endpoint

**Source:** ROADMAP.md, "Preview before saving an event"; spec "Recurring events and breaks", item 5  
**Depends on:** none  
**Size:** M

## Goal
`POST /api/plan/preview-event` says how a draft event (new or edited) would change each affected assignment's daily amount and end date, without saving anything.

## Context
- `GET /api/plan` loads inputs with `loadPlanInputs` and runs `planAll`; rates are never stored.
- The events create and patch bodies are in `routes/events.ts`.

## Steps
1. Body: `{ event: <the create body>, eventId?: <id of the event being edited> }`, strict. Validate the event exactly as the create route does.
2. Load the plan inputs once. Plan twice: as stored, and with the draft added (or, with `eventId`, replacing that event). Use the family's today as `asOf`.
3. For each assignment and child whose plan changes, return `{ assignmentId, childId, title, childName, unitType, before: { perDay, end }, after: { perDay, end } }`, where `perDay` is the typical amount on a full-capacity school day from today on (the plan's `rate`, rounded to one decimal).
4. Leave out rows whose `perDay` and `end` are unchanged (within 0.05). Sort by the largest relative change first. Return at most 20 and a `more` count.
5. Nothing is written.

## Done when
- A Tuesday co-op set to skip Literature returns Literature's higher per-day amount; an event that changes nothing returns an empty list.
- Editing an event previews the change against the stored version, not on top of it.

## Tests
- API integration: new event skipping one subject; lighter rule; an edit that only changes the label (empty list); an event for one child leaves the other child out; invalid body → 400; another family's `eventId` → 404; nothing is written (event count unchanged).

## Out of scope
- Previewing days off or assignment edits.
