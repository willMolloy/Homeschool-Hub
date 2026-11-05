# S15-01 — View-only links: create, list, revoke
**Size:** S
## Steps
1. Migration: `view_link` (id, family_id, label, token_hash, created_by parent, created_at, revoked_at, last_used_at). Tokens are 32 random bytes; only the SHA-256 is stored (as invites, S14-02).
2. Family settings → "View-only links": create (with a label, e.g. "Grandma"), shown once with Copy / Share; a list with label, created and last used dates, and **Revoke**. Family-scoped like invites; at most 10 active links.
3. Revoking takes effect immediately (open viewer sessions end on their next request).
## Done when
- A parent creates, copies and revokes a link; another family can't see or revoke it.
## Tests
- API: create, list, revoke, hashing, family scoping, cap.
