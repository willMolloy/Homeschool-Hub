# S1-31 — Show the subjects list screen

**Depends on:** S1-28, S1-17, S1-18, S1-20  
**Size:** S

## Goal
`/subjects` lists the family's subjects (name + color dot) with an empty state, loading state, and error state.

## Context
Read-only list in this ticket. Add/edit come next. This is a settings-style screen, not the timeline, so it doesn't depend on pilot results.

## Steps
1. In `src/routes/SubjectsPage.tsx` (the placeholder from S1-16), call `apiGet('/api/subjects')` on mount (a small `useApi` hook is fine).
2. Render a `<ul>` of subjects: color dot + name. Empty: 'No subjects yet.' plus a placeholder spot for the Add button.
3. Loading: skeleton rows. Error: message + Retry button.
4. Checkbox 'Show archived' re-fetches with `?includeArchived=true`. Archived rows are greyed with an 'Archived' tag.

## Done when
- [ ] Seeded family shows its rows. Empty family shows the empty state.

## Tests
- render tests with mocked api: list, empty, error+retry, show-archived toggle

## Out of scope
- Editing (next tickets).
