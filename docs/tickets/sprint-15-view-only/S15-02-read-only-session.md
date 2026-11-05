# S15-02 — A read-only session that can never write
**Size:** M
## Goal
Opening `/view/<token>` starts a viewer session for that family that the server refuses for every write.
## Steps
1. `/view/<token>` exchanges the token for a viewer session cookie (separate from parent sessions; tied to the link, ends when it's revoked). Bad, revoked or unknown tokens give one plain message ("This link no longer works. Ask the family for a new one."). Throttled.
2. **Enforced on the server:** a viewer session may call only an allow-list of read endpoints (plan, assignments, subjects, children, events, days off, family read fields needed to draw the screens, records totals and entries). Every other route, and every non-GET, returns 403. Default deny: a new route is not readable by viewers unless added to the list.
3. Viewer responses leave out parent names, emails, invites, view links and setup fields.
4. `X-Robots-Tag: noindex` and `Referrer-Policy: no-referrer` on view pages.
## Done when
- With a viewer cookie, every write route returns 403 (a test walks all registered routes); the allowed reads return the family's data and nothing about parents.
## Tests
- API: the route walk; revoke ends the session; no parent data; throttle; another family's data never reachable.
