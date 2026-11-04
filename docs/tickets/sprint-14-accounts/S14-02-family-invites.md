# S14-02 — Family invites (command) and the join page
**Size:** M
## Goal
Will or DeeDee create an invite link for a new family; the family joins through it.
## Steps
1. CLI `create-family-invite` prints a link (`/join/<token>`). The token is random; only its SHA-256 is stored (like sessions). Single use, expires in 7 days; the CLI can list and revoke open invites.
2. `/join/<token>`: a calm page asking for the parent's name, email and password (with the existing password rules). Creating it makes the family and its first parent, signs them in, and starts the first-run setup flow (Sprint 11).
3. Expired, used or unknown tokens show one plain message ("This invite link has expired or was already used. Ask the person who sent it for a new one."), never which case it was.
4. The join endpoint is rate-limited with the existing throttle.
## Done when
- A link from the CLI creates a new family that lands in the setup flow; reusing it fails with the plain message.
## Tests
- API: create, redeem once, expiry, revoke, hashed storage, throttle. Web: the join page and its error.
