# S14-04 — 30-day sessions and sign-in tidy-up
**Size:** S
## Steps
1. A session lasts 30 days from its last use (sliding), then the parent signs in again. Signing out ends only that device's session.
2. Expired sessions are cleaned up (on sign-in or a periodic sweep).
3. Sign-in page: "Signed in as {name}" shows in the family menu; the copy for a wrong email or password stays one plain message.
## Done when
- A session older than 30 days of inactivity is refused; one used daily stays valid.
## Tests
- API: expiry, sliding renewal, cleanup, sign-out of one device.
