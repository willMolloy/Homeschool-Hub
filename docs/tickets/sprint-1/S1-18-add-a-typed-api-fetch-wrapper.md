# S1-18 — Add a typed API fetch wrapper

**Depends on:** S1-16  
**Size:** XS

## Goal
All web code calls the API through one `api` module that sends cookies, parses JSON, and throws a typed `ApiError` with status and error code.

## Context
One place to handle 401 (go to login), network failures (offline later), and JSON errors. The API's error shape is `{ error, message? }` (S1-05).

## Steps
1. Create `src/api/client.ts`: `apiGet<T>(path)`, `apiPost<T>(path, body)`, `apiPatch<T>(path, body)`, using `fetch` with `credentials: 'include'` and JSON headers.
2. Non-2xx → throw `new ApiError(status, body.error ?? 'unknown', body.message)`. Network failure → `ApiError(0, 'network')`.
3. Export an `onUnauthenticated` callback hook (set by the router in S1-20) that runs on any 401.
4. Put shared response types in `src/api/types.ts` (Child, Subject, Me, PlanResponse). Keep them in sync with the API by hand for now.

## Done when
- [ ] Wrapper used by at least the Me call in S1-20.

## Tests
- Unit tests with a mocked fetch: 200 → parsed body; 404 JSON → ApiError with code; network error → status 0; 401 → onUnauthenticated called

## Out of scope
- Offline queueing (Sprint 2+).
- Code generation from OpenAPI.
