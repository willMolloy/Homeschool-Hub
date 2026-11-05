# S15-02 — A viewer can never write
**Size:** M
## Goal
The server refuses every write for a viewer, in every family they view.
## Steps
1. The session carries the person and the current family; the role comes from the membership.
2. **Enforced on the server:** a viewer may call only an allow-list of read endpoints (plan, assignments, subjects, children, events, days off, the family read fields needed to draw the screens, records totals and entries). Every other route, and every non-GET, returns 403. Default deny: a new route is not readable by viewers unless added to the list.
3. Viewer responses leave out parents' emails, invites, view links, other viewers and setup fields.
4. `X-Robots-Tag: noindex` and `Referrer-Policy: no-referrer` on viewer pages.
## Done when
- With a viewer session, every write route returns 403 (a test walks all registered routes); allowed reads return that family's data only.
## Tests
- API: the route walk; removal ends access; no parent or viewer data leaks; switching family re-checks membership; families the viewer doesn't belong to are unreachable.
