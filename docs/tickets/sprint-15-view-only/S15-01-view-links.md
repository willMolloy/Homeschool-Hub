# S15-01 — View-only sign-up links and viewer accounts
**Size:** M
## Goal
A parent sends a sign-up link; the person creates a viewer account for that family; access lasts until a parent removes it.
## Steps
1. Data: viewers are accounts with a role. Reuse the S14 `parent`/login model as a person with a password, plus a membership table `family_member (family_id, person_id, role: parent | viewer, created_at)`, or add a `viewer` table and `family_viewer` link; record the choice in the progress doc. Existing parents become `parent` members.
2. Family settings → "View-only access": **Create a sign-up link** (optional label, e.g. "Co-op"), shown once with Copy / Share; single use, unused links expire after 7 days, tokens hashed (as S14-02). No cap. The list shows open links (Cancel) and current viewers (name, email, joined, **Remove**).
3. `/join/<token>` for a view link: name, email, password (or "I already have an account" → sign in, then join), and the person becomes a viewer of that family. The same plain message for bad links as invites; throttled.
4. One login can belong to more than one account, for example a parent's own family (parent) and their co-op's account (viewer). After sign-in, the last-used account opens; the family menu shows the account's name and "Switch to {other}". Joining a view link while signed in adds that account to the same login.
5. Removing a viewer ends their access to that family at their next request; a viewer can leave a family from their menu.
## Done when
- A co-op account creates three links; three parents (each with their own family login) join and switch between their family and the co-op; a brand-new person can also join with a new login; removing a viewer ends their access.
## Tests
- API: link create/cancel/redeem once/expiry/hashing; join with a new or existing account; multi-family membership; remove and leave; family scoping.
