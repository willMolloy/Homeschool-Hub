# S17-02 — Small security tidy-ups
**Source:** Sprint 14 N5 (note) · **Size:** XS
## Steps
1. `GET /api/records/totals` and `POST /api/plan/pace` answer 404 (not 200 with empty data) when given a child or subject id that isn't the session's account's, matching the other routes.
2. Add a test that walks every route taking an id and checks another account's id gives 404 (parents) or 403 (viewers).
## Done when
- No route answers 200 for another account's ids.
